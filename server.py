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
        elif parsed.path == "/api/cbic-gazette":
            self._handle_cbic_gazette()
            return
        elif parsed.path == "/api/tradestat":
            self._handle_tradestat(parsed.query)
            return
        elif parsed.path == "/api/eway":
            self._handle_eway(parsed.query)
            return
        elif parsed.path == "/api/icegate":
            self._handle_icegate(parsed.query)
            return
        elif parsed.path == "/api/dgft":
            self._handle_dgft(parsed.query)
            return
        elif parsed.path == "/api/tariff":
            self._handle_tariff(parsed.query)
            return
        elif parsed.path == "/api/logistics":
            self._handle_logistics(parsed.query)
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
        elif parsed.path == "/api/cbic-valuation":
            self._handle_cbic_valuation(payload)
        elif parsed.path == "/api/eway":
            self._handle_eway_calc(payload)
        elif parsed.path == "/api/icegate":
            self._handle_icegate_tracking(payload)
        elif parsed.path == "/api/dgft":
            self._handle_dgft_calc(payload)
        elif parsed.path == "/api/tariff":
            self._handle_tariff_calc(payload)
        elif parsed.path == "/api/logistics":
            self._handle_logistics_calc(payload)
        elif parsed.path == "/api/tradestat":
            self._handle_tradestat_calc(payload)
        elif parsed.path == "/api/mandi":
            self._handle_mandi_calc(payload)
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

    def _handle_cbic_gazette(self):
        try:
            from sources.cbic_gazette import get_cbic_gazette_data
            data = get_cbic_gazette_data()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_cbic_valuation(self, payload: dict):
        try:
            from sources.cbic_gazette import calculate_valuation_impact
            currency = str(payload.get("currency", "USD"))[:10]
            amount = float(payload.get("amount", 10000))
            trade_flow = str(payload.get("trade_flow", "import"))[:10]
            live_rate = float(payload.get("live_rate", 0)) if payload.get("live_rate") else None
            res = calculate_valuation_impact(currency, amount, trade_flow=trade_flow, live_rate=live_rate)
            self._send_json(res)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def _handle_tradestat(self, query_str: str = ""):
        try:
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "comtrade" in params or "mirror" in params or "un" in params:
                from sources.comtrade_radar import get_comtrade_overview, calculate_mirror_discrepancy, get_global_market_share
                if "calc" in params or "corridor" in params or "hs" in params or "commodity" in params:
                    corridor_id = params.get("corridor", ["IND_USA"])[0]
                    hs_code = params.get("commodity", params.get("hs", [None]))[0]
                    cif_margin = float(params.get("cif_margin", params.get("margin", [10.0]))[0])
                    data = calculate_mirror_discrepancy(corridor_id, hs_code, cif_margin)
                elif "share" in params or "market_share" in params:
                    hs_code = params.get("commodity", params.get("hs", ["300490"]))[0]
                    data = get_global_market_share(hs_code)
                else:
                    data = get_comtrade_overview()
                self._send_json(data)
                return

            if "ecgc" in params or "credit" in params or "insurance" in params:
                from sources.ecgc_risk import get_ecgc_overview, get_country_risk, calculate_ecgc_premium
                if "calc" in params or "value" in params or "terms" in params:
                    c = params.get("country", ["USA"])[0]
                    val = float(params.get("value", [1000000.0])[0])
                    terms = params.get("terms", ["DA_60"])[0]
                    is_usd = params.get("usd", ["0"])[0] in ["1", "true", "True"]
                    data = calculate_ecgc_premium(c, val, terms, is_usd)
                elif "country" in params:
                    data = get_country_risk(params["country"][0]) or {"error": "Country not found"}
                else:
                    data = get_ecgc_overview()
            elif "matrix" in params or "bilateral" in params:
                from sources.dgcis_tradestat import get_bilateral_matrix
                c = params.get("country", [None])[0]
                data = get_bilateral_matrix(c)
            elif "deficit" in params or "surplus" in params:
                from sources.dgcis_tradestat import get_deficit_rankings
                data = get_deficit_rankings()
            elif "finance" in params or "rates" in params or "benchmarks" in params:
                from sources.trade_finance import get_finance_overview
                data = get_finance_overview()
            elif "discount" in params or "lc" in params:
                from sources.trade_finance import calculate_lc_discounting
                val = float(params.get("val", params.get("value", [100000.0]))[0])
                cur = str(params.get("cur", params.get("currency", ["USD"]))[0])
                tenor = int(params.get("tenor", params.get("days", [90]))[0])
                cat = str(params.get("cat", params.get("category", ["msme_manufacturer"]))[0])
                recourse = params.get("without_recourse", ["1"])[0] in ["1", "true", "True"]
                data = calculate_lc_discounting(val, cur, tenor, cat, recourse)
            elif "factoring" in params:
                from sources.trade_finance import calculate_export_factoring
                val = float(params.get("val", params.get("value", [75000.0]))[0])
                cur = str(params.get("cur", params.get("currency", ["EUR"]))[0])
                tenor = int(params.get("tenor", params.get("days", [60]))[0])
                adv = float(params.get("advance", [85.0])[0])
                comm = float(params.get("comm", [0.45])[0])
                data = calculate_export_factoring(val, cur, tenor, adv, comm)
            else:
                from sources.dgcis_tradestat import get_tradestat_overview, get_partner_profile, get_port_profile
                if "country" in params:
                    data = get_partner_profile(params["country"][0])
                elif "port" in params:
                    data = get_port_profile(params["port"][0]) or {"error": "Port not found"}
                else:
                    data = get_tradestat_overview()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_tradestat_calc(self, payload: dict):
        try:
            action = payload.get("action", "ecgc_premium")
            if action in ["ecgc_premium", "ecgc_credit_risk", "ecgc"]:
                from sources.ecgc_risk import calculate_ecgc_premium
                c = str(payload.get("country", "USA"))[:50]
                val = float(payload.get("invoice_value_inr", payload.get("value", 1000000.0)))
                terms = str(payload.get("payment_terms", payload.get("terms", "DA_60")))[:20]
                is_usd = bool(payload.get("is_usd", False))
                data = calculate_ecgc_premium(c, val, terms, is_usd)
            elif action in ["comtrade_mirror", "mirror_reconciliation", "comtrade"]:
                from sources.comtrade_radar import calculate_mirror_discrepancy
                corridor_id = str(payload.get("corridor_id", payload.get("corridor", "IND_USA")))
                hs_code = payload.get("hs_code", payload.get("commodity"))
                cif_margin = float(payload.get("cif_margin_pct", payload.get("cif_margin", 10.0)))
                data = calculate_mirror_discrepancy(corridor_id, hs_code, cif_margin)
            elif action in ["comtrade_market_share", "comtrade_share"]:
                from sources.comtrade_radar import get_global_market_share
                hs_code = str(payload.get("hs_code", payload.get("commodity", "300490")))
                data = get_global_market_share(hs_code)
            elif action in ["bilateral_matrix", "matrix", "dgcis_matrix"]:
                from sources.dgcis_tradestat import get_bilateral_matrix
                c = payload.get("country")
                data = get_bilateral_matrix(c)
            elif action in ["deficit_rankings", "deficit", "surplus"]:
                from sources.dgcis_tradestat import get_deficit_rankings
                data = get_deficit_rankings()
            elif action in ["lc_discounting", "lc", "discount"]:
                from sources.trade_finance import calculate_lc_discounting
                val = float(payload.get("invoice_value", payload.get("value", 100000.0)))
                cur = str(payload.get("currency", "USD"))[:10]
                tenor = int(payload.get("usance_days", payload.get("tenor_days", payload.get("tenor", 90))))
                cat = str(payload.get("exporter_category", payload.get("category", "msme_manufacturer")))[:50]
                recourse = bool(payload.get("is_without_recourse", True))
                data = calculate_lc_discounting(val, cur, tenor, cat, recourse)
            elif action in ["export_factoring", "factoring"]:
                from sources.trade_finance import calculate_export_factoring
                val = float(payload.get("invoice_value", payload.get("value", 75000.0)))
                cur = str(payload.get("currency", "EUR"))[:10]
                tenor = int(payload.get("credit_period_days", payload.get("tenor_days", payload.get("tenor", 60))))
                adv = float(payload.get("advance_pct", 85.0))
                comm = float(payload.get("factor_commission_pct", payload.get("commission", 0.45)))
                data = calculate_export_factoring(val, cur, tenor, adv, comm)
            else:
                from sources.ecgc_risk import get_country_risk
                c = str(payload.get("country", "USA"))[:50]
                data = get_country_risk(c) or {"error": "Country not found"}
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def _handle_eway(self, query_str: str = ""):
        try:
            from sources.gstn_eway import get_gstn_overview, get_corridor_profile, calculate_eway_validity
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "distance" in params:
                dist = float(params["distance"][0])
                cargo = params.get("cargo_type", ["normal"])[0]
                data = calculate_eway_validity(dist, cargo)
            elif "corridor" in params:
                data = get_corridor_profile(params["corridor"][0]) or {"error": "Corridor not found"}
            else:
                data = get_gstn_overview()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_eway_calc(self, payload: dict):
        try:
            from sources.gstn_eway import calculate_eway_validity
            distance = float(payload.get("distance", 200))
            cargo_type = str(payload.get("cargo_type", "normal"))[:30]
            data = calculate_eway_validity(distance, cargo_type)
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def _handle_icegate(self, query_str: str = ""):
        try:
            from sources.icegate_edi import get_icegate_overview, lookup_error_code, search_ports, track_customs_document
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "code" in params:
                code = params["code"][0]
                data = lookup_error_code(code)
                if not data:
                    self._send_json({"error": f"ICEGATE error code {code} not found"}, status=404)
                    return
            elif "track" in params or "number" in params:
                doc_type = params.get("type", ["shipping_bill"])[0]
                doc_number = params.get("number", ["7492104"])[0]
                port_code = params.get("port", ["INNSA1"])[0]
                data = track_customs_document(doc_type, doc_number, port_code)
            elif "port" in params:
                data = search_ports(params["port"][0])
            else:
                data = get_icegate_overview()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_icegate_tracking(self, payload: dict):
        try:
            from sources.icegate_edi import track_customs_document
            doc_type = str(payload.get("doc_type", "shipping_bill"))[:30]
            doc_number = str(payload.get("doc_number", "7492104"))[:30]
            port_code = str(payload.get("port_code", "INNSA1"))[:10]
            data = track_customs_document(doc_type, doc_number, port_code)
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def _handle_dgft(self, query_str: str = ""):
        try:
            from sources.dgft_schedules import get_dgft_overview, lookup_hs_incentive, calculate_export_incentives
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "calc" in params or "value" in params:
                val = float(params.get("value", [2000000.0])[0])
                hs = params.get("hs", params.get("q", ["61091000"]))[0]
                qty = float(params.get("qty", [0.0])[0])
                data = calculate_export_incentives(val, hs, qty)
            elif "hs" in params or "q" in params:
                query = params.get("hs", params.get("q", ["61091000"]))[0]
                data = lookup_hs_incentive(query)
                if not data:
                    self._send_json({"error": f"No incentive schedule found for {query}"}, status=404)
                    return
            else:
                data = get_dgft_overview()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_dgft_calc(self, payload: dict):
        try:
            from sources.dgft_schedules import calculate_export_incentives
            val = float(payload.get("order_value_inr", 2000000.0))
            hs = str(payload.get("hs_code", payload.get("q", "61091000")))[:30]
            qty = float(payload.get("quantity", 0.0))
            data = calculate_export_incentives(val, hs, qty)
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def _handle_tariff(self, query_str: str = ""):
        try:
            from sources.cbic_tariff import get_tariff_overview, lookup_tariff_line, calculate_landed_customs_duty
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "macmap" in params or "roo" in params or "fta" in params or "carotar" in params:
                from sources.itc_macmap import get_macmap_overview, calculate_roo_preferential_duty, get_agreement_details
                if "agreement" in params:
                    ag_id = params["agreement"][0]
                    data = get_agreement_details(ag_id)
                elif "calc" in params or "hs" in params or "fob" in params or "vnm" in params:
                    hs = params.get("hs", ["711319"])[0]
                    fob = float(params["fob"][0]) if "fob" in params else None
                    vnm = float(params["vnm"][0]) if "vnm" in params else None
                    ctc = params.get("ctc", ["1"])[0].lower() not in ["0", "false", "no"]
                    data = calculate_roo_preferential_duty(hs, fob, vnm, ctc)
                else:
                    data = get_macmap_overview()
                self._send_json(data)
                return

            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "calc" in params or "value" in params:
                val = float(params.get("value", [10000.0])[0])
                currency = str(params.get("currency", ["USD"])[0]).upper().strip()
                hs = params.get("hs", params.get("q", ["85171300"]))[0]
                rate = float(params.get("rate", [0.0])[0])
                data = calculate_landed_customs_duty(val, currency, hs, rate if rate > 0 else None)
            elif "hs" in params or "q" in params:
                query = params.get("hs", params.get("q", ["85171300"]))[0]
                data = lookup_tariff_line(query)
                if not data:
                    self._send_json({"error": f"No tariff line found for {query}"}, status=404)
                    return
            else:
                data = get_tariff_overview()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_tariff_calc(self, payload: dict):
        try:
            action = payload.get("action", "")
            if action in ["macmap_roo_calc", "macmap", "roo", "fta"]:
                from sources.itc_macmap import calculate_roo_preferential_duty
                hs = str(payload.get("hs_code", payload.get("commodity", "711319")))
                fob = float(payload["fob_value"]) if "fob_value" in payload else None
                vnm = float(payload["vnm_value"]) if "vnm_value" in payload else None
                ctc = bool(payload.get("ctc_compliant", True))
                data = calculate_roo_preferential_duty(hs, fob, vnm, ctc)
                self._send_json(data)
                return

            if action in ["wto_tariff_overhang", "wto_anti_dumping", "trade_defense", "wto"]:
                from sources.wto_treaties import calculate_trade_defense_remedy
                hs = str(payload.get("hs_code", payload.get("commodity", "854143")))
                exp_p = float(payload["export_price"]) if "export_price" in payload else None
                norm_v = float(payload["normal_value"]) if "normal_value" in payload else None
                nip = float(payload["non_injurious_price"]) if "non_injurious_price" in payload else None
                landed_v = float(payload["landed_value"]) if "landed_value" in payload else None
                data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                self._send_json(data)
                return

            from sources.cbic_tariff import calculate_landed_customs_duty
            val = float(payload.get("cif_value", payload.get("value", 10000.0)))
            currency = str(payload.get("currency", "USD")).upper().strip()
            hs = str(payload.get("hs_code", payload.get("q", "85171300")))[:30]
            rate = float(payload.get("exchange_rate", payload.get("rate", 0.0)))
            data = calculate_landed_customs_duty(val, currency, hs, rate if rate > 0 else None)
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def _handle_logistics(self, query_str: str = ""):
        try:
            params = urllib.parse.parse_qs(query_str) if query_str else {}


            if "ocean" in params or "freight" in params or "wci" in params or "fbx" in params:
                from sources.freight_indices import get_freight_master, get_corridor_freight, calculate_ocean_freight
                if "calc" in params or "size" in params or "quote" in params:
                    r_id = params.get("route", params.get("corridor", ["IN_EU_ROTTERDAM"]))[0]
                    size = params.get("size", ["40ft"])[0]
                    count = int(params.get("count", params.get("containers", [1]))[0])
                    quote = float(params.get("quote", [0.0])[0])
                    data = calculate_ocean_freight(r_id, size, count, quote)
                elif "route" in params or "corridor" in params:
                    r_id = params.get("route", params.get("corridor", ["IN_EU_ROTTERDAM"]))[0]
                    data = get_corridor_freight(r_id) or {"error": "Corridor not found"}
                else:
                    data = get_freight_master()
            elif "concor" in params or "rail" in params:
                from sources.concor_icd import get_concor_overview, get_corridor_details, calculate_concor_freight
                if "corridor" in params or "route" in params:
                    c_id = params.get("corridor", params.get("route", ["tkd_jnpt"]))[0]
                    if "calc" in params or "size" in params:
                        size = params.get("size", ["40ft"])[0]
                        count = int(params.get("count", params.get("containers", [1]))[0])
                        is_empty = params.get("empty", ["0"])[0] in ["1", "true", "True"]
                        data = calculate_concor_freight(c_id, size, count, is_empty)
                    else:
                        data = get_corridor_details(c_id)
                elif "calc" in params or "haulage" in params:
                    c_id = params.get("corridor", ["tkd_jnpt"])[0]
                    size = params.get("size", ["40ft"])[0]
                    count = int(params.get("count", [1])[0])
                    is_empty = params.get("empty", ["0"])[0] in ["1", "true", "True"]
                    data = calculate_concor_freight(c_id, size, count, is_empty)
                else:
                    data = get_concor_overview()
            elif "vessel" in params:
                from sources.port_logistics import track_vessel_schedule
                vessel = params.get("vessel", ["MAERSK_KAVERI"])[0]
                port = params.get("port", ["INNSA1"])[0]
                data = track_vessel_schedule(vessel, port)
            elif "demurrage" in params or "delay" in params:
                from sources.port_logistics import calculate_demurrage_liability
                port = params.get("port", ["INNSA1"])[0]
                size = params.get("size", ["40ft"])[0]
                count = int(params.get("containers", params.get("count", [2]))[0])
                days = int(params.get("days", params.get("delay", [12]))[0])
                data = calculate_demurrage_liability(port, size, count, days)
            elif "port" in params:
                from sources.port_logistics import get_port_metrics
                port = params.get("port", ["INNSA1"])[0]
                data = get_port_metrics(port)
            else:
                from sources.port_logistics import get_ports_overview
                data = get_ports_overview()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=500)

    def _handle_logistics_calc(self, payload: dict):
        try:
            action = payload.get("action", "demurrage")
            if action in ["ocean_freight", "ocean", "freight"]:
                from sources.freight_indices import calculate_ocean_freight
                r_id = str(payload.get("route_id", payload.get("corridor_id", "IN_EU_ROTTERDAM")))[:30]
                size = str(payload.get("container_size", "40ft"))[:10]
                count = int(payload.get("container_count", 1))
                quote = float(payload.get("forwarder_quote_usd", payload.get("quote", 0.0)))
                data = calculate_ocean_freight(r_id, size, count, quote)
            elif action in ["concor_rail", "rail_freight", "concor"]:
                from sources.concor_icd import calculate_concor_freight
                c_id = str(payload.get("corridor_id", "tkd_jnpt"))[:30]
                size = str(payload.get("container_size", "40ft"))[:10]
                count = int(payload.get("container_count", 1))
                is_empty = bool(payload.get("is_empty", False))
                data = calculate_concor_freight(c_id, size, count, is_empty)
            elif action == "vessel":
                from sources.port_logistics import track_vessel_schedule
                vessel = str(payload.get("vessel_name", "MAERSK_KAVERI"))[:50]
                port = str(payload.get("port_code", "INNSA1"))[:15]
                data = track_vessel_schedule(vessel, port)
            elif action == "metrics":
                from sources.port_logistics import get_port_metrics
                port = str(payload.get("port_code", "INNSA1"))[:15]
                data = get_port_metrics(port)
            else:
                from sources.port_logistics import calculate_demurrage_liability
                port = str(payload.get("port_code", "INNSA1"))[:15]
                size = str(payload.get("container_size", "40ft"))[:10]
                count = int(payload.get("container_count", 2))
                days = int(payload.get("days_in_port", 12))
                data = calculate_demurrage_liability(port, size, count, days)
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

    def _handle_mandi(self, query_str):
        try:
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "spices" in params or "spice" in params or "tea" in params or "cres" in params or "qel" in params:
                from sources.spices_tea import get_spices_tea_overview, audit_spices_tea_compliance, get_qel_lab_routing
                if "calc" in params or "check" in params or "market" in params or "commodity" in params or "hs" in params:
                    comm = params.get("commodity", params.get("hs", ["09042110"]))[0]
                    market = params.get("market", params.get("country", ["EU"]))[0]
                    test_vals = {}
                    for k, v in params.items():
                        if k not in ["spices", "spice", "tea", "cres", "qel", "calc", "check", "market", "country", "commodity", "hs"]:
                            try:
                                test_vals[k] = float(v[0])
                            except ValueError:
                                pass
                    data = audit_spices_tea_compliance(comm, market, test_vals)
                elif "lab" in params or "routing" in params:
                    comm = params.get("commodity", ["09042110"])[0]
                    state = params.get("state", ["Andhra Pradesh"])[0]
                    data = get_qel_lab_routing(comm, state)
                else:
                    data = get_spices_tea_overview()
                self._send_json(data)
                return

            if "mpeda" in params or "marine" in params or "seafood" in params or "catch_cert" in params or "simp" in params:
                from sources.mpeda_marine import get_mpeda_overview, audit_marine_compliance, get_catch_documentation_guide
                if "calc" in params or "check" in params or "market" in params or "species" in params or "hs" in params:
                    species_code = params.get("species", params.get("commodity", params.get("hs", ["03061720"])))[0]
                    market = params.get("market", params.get("country", ["EU"]))[0]
                    test_vals = {}
                    for k, v in params.items():
                        if k not in ["mpeda", "marine", "seafood", "catch_cert", "simp", "calc", "check", "market", "country", "commodity", "hs", "species"]:
                            try:
                                test_vals[k] = float(v[0])
                            except ValueError:
                                pass
                    data = audit_marine_compliance(species_code, market, test_vals)
                elif "schemes" in params or "guide" in params:
                    species_code = params.get("species", ["03061720"])[0]
                    market = params.get("market", ["EU"])[0]
                    data = get_catch_documentation_guide(species_code, market)
                else:
                    data = get_mpeda_overview()
                self._send_json(data)
                return

            if "apeda" in params or "mrl" in params or "phyto" in params or "tracenet" in params:
                from sources.apeda_agri import get_apeda_overview, check_phytosanitary_compliance
                if "calc" in params or "check" in params or "market" in params or "hs" in params:
                    comm = params.get("commodity", params.get("hs", ["10063020"]))[0]
                    market = params.get("market", params.get("country", ["EU"]))[0]
                    test_vals = {}
                    for k, v in params.items():
                        if k not in ["apeda", "calc", "check", "market", "country", "commodity", "hs"]:
                            try:
                                test_vals[k] = float(v[0])
                            except ValueError:
                                pass
                    data = check_phytosanitary_compliance(comm, market, test_vals)
                else:
                    data = get_apeda_overview()
                self._send_json(data)
                return

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

    def _handle_mandi_calc(self, payload: dict):
        try:
            from sources.apeda_agri import check_phytosanitary_compliance, get_apeda_overview
            action = payload.get("action", "apeda_compliance")
            if action in ["apeda_compliance", "mrl_check", "phytosanitary", "apeda"]:
                comm = str(payload.get("commodity", payload.get("hs_code", "10063020")))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                test_vals = payload.get("residue_levels", payload.get("chemical_test_results", {}))
                data = check_phytosanitary_compliance(comm, market, test_vals)
            elif action in ["spices_compliance", "spice_quality", "tea_compliance", "tea_quality", "spices", "tea"]:
                from sources.spices_tea import audit_spices_tea_compliance
                comm = str(payload.get("commodity", payload.get("commodity_code", payload.get("hs_code", "09042110"))))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                test_vals = payload.get("residue_levels", payload.get("lab_test_results", {}))
                data = audit_spices_tea_compliance(comm, market, test_vals)
            elif action in ["qel_routing", "lab_routing", "spices_cres"]:
                from sources.spices_tea import get_qel_lab_routing
                comm = str(payload.get("commodity", payload.get("hs_code", "09042110")))
                state = str(payload.get("state", "Andhra Pradesh"))
                data = get_qel_lab_routing(comm, state)
            elif action in ["mpeda_compliance", "mpeda_check", "marine_quality", "marine"]:
                from sources.mpeda_marine import audit_marine_compliance
                species_code = str(payload.get("species_code", payload.get("commodity", payload.get("hs_code", "03061720"))))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                test_vals = payload.get("residue_levels", payload.get("lab_test_results", {}))
                data = audit_marine_compliance(species_code, market, test_vals)
            elif action in ["mpeda_catch_cert", "catch_documentation", "simp_guide"]:
                from sources.mpeda_marine import get_catch_documentation_guide
                species_code = str(payload.get("species_code", payload.get("hs_code", "03061720")))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                harvest = str(payload.get("harvest_type", "Aquaculture"))
                data = get_catch_documentation_guide(species_code, market, harvest)
            else:
                data = get_apeda_overview()
            self._send_json(data)
        except Exception as e:
            self._send_json({"error": str(e)}, status=400)

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
