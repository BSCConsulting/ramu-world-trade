from sources.rbi_forex import get_live_rbi_reference_rates
from sources.data_gov import query_data_gov, KNOWN_RESOURCES
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

STATIC_DIR = BASE_DIR / "public" if (BASE_DIR / "public").exists() else BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)

class TradeAppRequestHandler(SimpleHTTPRequestHandler):
    MAX_PAYLOAD_BYTES = 1_048_576  # 1 MB strict upper bound to prevent DoS

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def end_headers(self):
        # Inject standard OWASP security headers on all responses
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        super().end_headers()

    def _parse_json_body(self):
        try:
            cl_header = self.headers.get("Content-Length")
            if not cl_header:
                return {}, None
            content_length = int(cl_header)
            if content_length < 0:
                return None, "Invalid Content-Length header"
            if content_length > self.MAX_PAYLOAD_BYTES:
                return None, "Payload Too Large (Max 1MB allowed)"
            body_bytes = self.rfile.read(content_length)
            body_str = body_bytes.decode("utf-8", errors="replace").replace("\x00", "")
            return json.loads(body_str), None
        except ValueError:
            return None, "Malformed Content-Length or payload encoding"
        except json.JSONDecodeError:
            return None, "Malformed JSON syntax"
        except Exception:
            return None, "Request parsing failure"

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json({"status": "ok", "app": "World of Trade", "tier": "100% Free"})
            return
        elif parsed.path == "/api/forex":
            self._handle_forex()
            return
        elif parsed.path == "/api/mandi":
            self._handle_mandi(parsed.query)
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
        payload, err = self._parse_json_body()
        if err:
            status = 413 if "Payload Too Large" in err else 400
            self._send_json({"error": err}, status=status)
            return

        if parsed.path == "/api/query":
            self._handle_query(payload)
        elif parsed.path == "/api/calculate":
            self._handle_calculate(payload)
        else:
            self.send_error(404, "API endpoint not found")

    def _handle_query(self, payload: dict):
        query = str(payload.get("query", ""))[:2000].strip()
        if not query:
            self._send_json({"error": "Empty query"}, status=400)
            return

        # 1. Classification
        classification = classifier.classify(query)

        # 2. Check for incentives query
        q_lower = query.lower()
        incentives_keywords = ["incentive", "incentives", "rodtep", "drawback", "refund", "rebate", "cash refund", "profit"]
        curr_tokens = ["lakh", "crore", "$", "rs", "₹", "usd", "dollar", "dollars", "eur", "euro", "aed", "dirham", "gbp", "pound"]
        order_tokens = ["order", "consignment", "export order", "shipment", "cargo"]
        is_incentive = any(k in q_lower for k in incentives_keywords) or (any(c in q_lower for c in curr_tokens) and any(w in q_lower for w in order_tokens))

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
        detected_odop = classification.get("detected_odop")
        detected_hs = classification.get("detected_hs_line")

        if detected_odop:
            chart_data = {
                "title": f"ODOP District: {detected_odop['district']} ({detected_odop['odop_product']})",
                "type": "bar",
                "labels": ["Target Markets (Indexed)", "Value Chain Readiness", "Mandi Linkage"],
                "datasets": [{
                    "label": "Maturity Index (%)",
                    "data": [92, 88, 95],
                    "backgroundColor": ["#f59e0b", "#10b981", "#3b82f6"]
                }]
            }
        elif detected_hs:
            rod = detected_hs.get("rodtep_rate_pct", 0.0)
            dbk = detected_hs.get("duty_drawback_pct", 0.0)
            chart_data = {
                "title": f"Statutory Remission Rates: HS {detected_hs['hs_code']}",
                "type": "bar",
                "labels": ["RoDTEP Rate (%)", "Duty Drawback (%)", "Total Cash Relief (%)"],
                "datasets": [{
                    "label": "Incentive Percentage (%)",
                    "data": [rod, dbk, round(rod + dbk, 2)],
                    "backgroundColor": ["#3b82f6", "#10b981", "#f59e0b"]
                }]
            }
        elif matched_country:
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
        elif any(k in q_lower for k in ["trend", "history", "historical", "growth", "over time", "multi-year", "timeseries", "year by year"]):
            # Load multi-year timeseries
            ts_path = BASE_DIR / "data" / "historical_timeseries.json"
            if ts_path.exists():
                with open(ts_path, "r", encoding="utf-8") as f:
                    ts = json.load(f)
                chart_data = {
                    "title": "India Trade 6-Year Trajectory: Goods vs Services (USD Billion)",
                    "type": "line",
                    "labels": ts["years"],
                    "datasets": [
                        {
                            "label": "Merchandise Exports (FOB)",
                            "data": ts["merchandise_exports_usd_billion"],
                            "borderColor": "#10b981",
                            "backgroundColor": "rgba(16, 185, 129, 0.15)",
                            "fill": True,
                            "tension": 0.3
                        },
                        {
                            "label": "Merchandise Imports (CIF)",
                            "data": ts["merchandise_imports_usd_billion"],
                            "borderColor": "#ef4444",
                            "backgroundColor": "rgba(239, 68, 68, 0.15)",
                            "fill": True,
                            "tension": 0.3
                        },
                        {
                            "label": "Services Surplus (RBI)",
                            "data": ts["services_surplus_usd_billion"],
                            "borderColor": "#3b82f6",
                            "backgroundColor": "rgba(59, 130, 246, 0.15)",
                            "fill": True,
                            "tension": 0.3
                        }
                    ]
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
        query = str(payload.get("query", ""))[:1000].strip()
        amount = payload.get("amount") or payload.get("invoice_amount")
        product = str(payload.get("product", ""))[:500].strip()
        quantity = payload.get("quantity")
        unit = str(payload.get("unit", ""))[:20].strip() if payload.get("unit") else None
        
        explicit_val = None
        if amount:
            try:
                clean_amt = float(str(amount).replace(",", "").replace("₹", "").replace("$", ""))
                if 0 <= clean_amt <= 1e15:
                    explicit_val = clean_amt
            except Exception:
                pass

        qty_val = None
        if quantity:
            try:
                clean_qty = float(str(quantity).replace(",", ""))
                if 0 <= clean_qty <= 1e12:
                    qty_val = clean_qty
            except Exception:
                pass

        search_str = f"{query} {product} {amount if amount else ''}"[:1500]
        try:
            calc_res = incentives_calculator.calculate(search_str, explicit_value=explicit_val, quantity=qty_val, unit=unit)
            report_md = incentives_calculator.format_report(calc_res)
            self._send_json({
                "calculation": calc_res,
                "formatted_markdown": report_md
            })
        except Exception:
            self._send_json({"error": "Unable to compute statutory calculation for the given input."}, status=400)

    def _handle_forex(self):
        try:
            rates = get_live_rbi_reference_rates()
            self._send_json(rates)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_mandi(self, query_str):
        try:
            params = urllib.parse.parse_qs(query_str)
            commodity = params.get("commodity", ["Chilli Red"])[0]
            state = params.get("state", ["Andhra Pradesh"])[0]
            limit = int(params.get("limit", [10])[0])
            data = query_data_gov(
                KNOWN_RESOURCES["apmc_mandi_arrivals"],
                filters={"commodity": commodity, "state": state},
                limit=limit
            )
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e), "records": []}, status=200)

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
