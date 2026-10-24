"""Local HTTP Server for World of Trade Web Application.
Built using 100% Python standard library (http.server) to guarantee zero-cost,
zero-pip-dependencies, and instant local execution on macOS.
"""
import os
import sys
import json
import urllib.parse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from triangulator import engine
from classifier import classifier
from incentives_calculator import incentives_calculator
from cache import init_db, CACHE_DB_PATH
import sqlite3

STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

class TradeAppRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json({"status": "ok", "app": "World of Trade", "tier": "100% Free"})
            return
        elif parsed.path == "/api/history":
            self._handle_history()
            return
        elif parsed.path == "/" or parsed.path == "":
            self.path = "/index.html"
        
        # Serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
        
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if parsed.path == "/api/query":
            self._handle_query(payload)
        elif parsed.path == "/api/calculate":
            self._handle_calculate(payload)
        else:
            self.send_error(404, "API endpoint not found")

    def _handle_query(self, payload: dict):
        query = payload.get("query", "").strip()
        if not query:
            self._send_json({"error": "Empty query"}, status=400)
            return

        # 1. Classification
        classification = classifier.classify(query)

        # 2. Check for incentives query
        q_lower = query.lower()
        incentives_keywords = ["incentive", "incentives", "rodtep", "drawback", "refund", "rebate", "cash refund", "profit"]
        is_incentive = any(k in q_lower for k in incentives_keywords) or (("lakh" in q_lower or "crore" in q_lower or "$" in q_lower or "rs" in q_lower or "₹" in q_lower) and ("export" in q_lower or "order" in q_lower))

        if is_incentive:
            calc_data = incentives_calculator.calculate(query)
            formatted_text = incentives_calculator.format_report(calc_data)
            self._send_json({
                "type": "incentive_calculation",
                "classification": {
                    "flow": classification["trade_flow"],
                    "sector": classification["primary_sector"]["name"] if classification["primary_sector"] else "General Exports",
                    "domain": "Physical Merchandise Trade & Customs Rebates",
                    "partner": classification.get("detected_country")
                },
                "formatted_markdown": formatted_text,
                "calculation": calc_data,
                "chart_data": {
                    "labels": ["Consignment Value", "RoDTEP Refund", "Duty Drawback", "Total Cash In Bank"],
                    "values": [calc_data["order_value_inr"], calc_data["rodtep_inr"], calc_data["drawback_inr"], calc_data["total_direct_cash_inr"]]
                }
            })
            return

        # 3. Standard Triangulated Query
        formatted_text = engine.answer_question(query)

        # Chart generation logic
        chart_data = None
        matched_country = classification.get("detected_country")
        if matched_country:
            partner = engine.store.get_trading_partner(matched_country)
            ex = partner["export_data"]["value_usd_billion"] if partner["export_data"] else 0
            im = partner["import_data"]["value_usd_billion"] if partner["import_data"] else 0
            chart_data = {
                "title": f"India - {matched_country} Bilateral Trade (USD Billion)",
                "type": "bar",
                "labels": ["India's Exports (FOB)", f"{matched_country} Exports to India (CIF)"],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [ex, im],
                    "backgroundColor": ["#10b981", "#ef4444"]
                }]
            }
        elif "top export" in q_lower or "what does india export" in q_lower:
            items = engine.store.get_top_export_commodities(5)
            chart_data = {
                "title": "Top Indian Export Sectors (USD Billion)",
                "type": "bar",
                "labels": [it["commodity"].split("(")[0].strip() for it in items],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [it["value_usd_billion"] for it in items],
                    "backgroundColor": ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"]
                }]
            }
        elif "top import" in q_lower or "what does india import" in q_lower:
            items = engine.store.get_top_import_commodities(5)
            chart_data = {
                "title": "Top Indian Import Sectors (USD Billion)",
                "type": "bar",
                "labels": [it["commodity"].split("(")[0].strip() for it in items],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [it["value_usd_billion"] for it in items],
                    "backgroundColor": ["#ef4444", "#f97316", "#eab308", "#6366f1", "#14b8a6"]
                }]
            }
        else:
            totals = engine.store.get_totals("FY2023-24")
            services = engine.store.get_services_trade("FY2023-24")
            chart_data = {
                "title": "India Foreign Trade: Goods Deficit vs Services Surplus (USD Billion)",
                "type": "bar",
                "labels": ["Merchandise Deficit", "Services Surplus", "Net Trade Balance"],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [totals["trade_deficit_usd_billion"], services["net_services_surplus_usd_billion"], round(totals["trade_deficit_usd_billion"] + services["net_services_surplus_usd_billion"], 2)],
                    "backgroundColor": ["#ef4444", "#10b981", "#f59e0b"]
                }]
            }

        self._send_json({
            "type": "trade_query",
            "classification": {
                "flow": classification["trade_flow"],
                "sector": classification["primary_sector"]["name"] if classification["primary_sector"] else "All Industry Sectors",
                "domain": ", ".join([d["name"] for d in classification["detected_domains"][:2]]),
                "partner": classification.get("detected_country")
            },
            "formatted_markdown": formatted_text,
            "chart_data": chart_data
        })

    def _handle_calculate(self, payload: dict):
        query = payload.get("query", "")
        amount = payload.get("amount")
        product = payload.get("product", "")
        
        search_str = f"{query} {product} {amount if amount else ''}"
        calc_res = incentives_calculator.calculate(search_str)
        report_md = incentives_calculator.format_report(calc_res)
        
        self._send_json({
            "calculation": calc_res,
            "formatted_markdown": report_md
        })

    def _handle_history(self):
        init_db()
        history = []
        try:
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT query_text, primary_source, datetime(timestamp, 'unixepoch', 'localtime')
                    FROM query_history
                    ORDER BY id DESC LIMIT 10
                """)
                for row in cursor.fetchall():
                    history.append({
                        "query": row[0],
                        "source": row[1],
                        "time": row[2]
                    })
        except Exception:
            pass
        self._send_json({"history": history})

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

def run(port: int = 8080):
    server_address = ("", port)
    httpd = ThreadingHTTPServer(server_address, TradeAppRequestHandler)
    print(f"\n╔═══════════════════════════════════════════════════════════════════════╗")
    print(f"║             WORLD OF TRADE: INTERACTIVE WEB DASHBOARD                 ║")
    print(f"║     100% Free Tier • Running locally on macOS at:                     ║")
    print(f"║     👉  http://localhost:{port}                                        ║")
    print(f"╚═══════════════════════════════════════════════════════════════════════╝\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down World of Trade server.")
        httpd.server_close()

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run(port)
