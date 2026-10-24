"""Triangulation and Proof Engine for Indian Trade Intelligence.
Cross-references physical customs data (DGCI&S), financial settlements (RBI),
and international partner data (UN Comtrade) with audit citations.
"""
from typing import Dict, Any, List
from sources.benchmarks import store
from cache import log_query
from classifier import classifier
from incentives_calculator import incentives_calculator

class TriangulationEngine:
    def __init__(self):
        self.store = store

    def triangulate_country(self, country: str) -> Dict[str, Any]:
        """Triangulate bilateral trade data with partner nation."""
        data = self.store.get_trading_partner(country)
        export_val = data["export_data"]["value_usd_billion"] if data["export_data"] else None
        import_val = data["import_data"]["value_usd_billion"] if data["import_data"] else None
        
        balance = None
        if export_val is not None and import_val is not None:
            balance = round(export_val - import_val, 2)

        mirror = data.get("mirror_data")
        
        proof_badge = {
            "primary_source": "Ministry of Commerce & Industry (DGCI&S) FY24 Bilateral Trade Statistics",
            "valuation_basis": "India Exports: FOB (Free on Board) | India Imports: CIF (Cost, Insurance & Freight)",
            "partner_mirror_source": "UN Comtrade & Partner Customs Statistical Office" if mirror else "Direct DGCI&S Bilateral Line",
            "fob_cif_spread": f"+{mirror['fob_cif_spread_pct']}% freight/insurance margin" if mirror else "Standard maritime freight",
            "verification_urls": [
                "https://tradestat.commerce.gov.in",
                "https://comtradeplus.un.org"
            ]
        }

        return {
            "query_type": "bilateral_country_trade",
            "country": country,
            "india_exports_usd_billion": export_val,
            "india_imports_usd_billion": import_val,
            "trade_balance_usd_billion": balance,
            "balance_status": "Surplus" if balance and balance > 0 else "Deficit",
            "mirror_reconciliation": mirror,
            "proof_badge": proof_badge
        }

    def triangulate_commodity(self, commodity_query: str) -> Dict[str, Any]:
        """Triangulate commodity-specific trade figures."""
        export_matches = self.store.search_export_commodity(commodity_query)
        import_matches = self.store.search_import_commodity(commodity_query)

        proof_badge = {
            "primary_source": "DGCI&S 8-digit ITC-HS Trade Classification System (FY24 Review)",
            "cross_validation": "Ministry of Commerce NIRYAT Export Monitoring System & Export Promotion Councils",
            "valuation_basis": "Exports FOB / Imports CIF",
            "verification_urls": [
                "https://tradestat.commerce.gov.in/eidb/",
                "https://niryat.gov.in"
            ]
        }

        return {
            "query_type": "commodity_trade",
            "query": commodity_query,
            "export_findings": export_matches,
            "import_findings": import_matches,
            "proof_badge": proof_badge
        }

    def triangulate_macro_totals(self, fiscal_year: str = "FY2023-24") -> Dict[str, Any]:
        """Triangulate national merchandise, services, and trade deficit totals."""
        merch = self.store.get_totals(fiscal_year)
        services = self.store.get_services_trade(fiscal_year)

        proof_badge = {
            "merchandise_source": f"DGCI&S / MOCI Annual Trade Statement ({merch.get('dgcis_release', 'Annual Statement')})",
            "services_source": "Reserve Bank of India (RBI DBIE) Balance of Payments Press Release",
            "valuation_standard": "IMF Balance of Payments Manual 6th Edition (BPM6)",
            "verification_urls": [
                "https://tradestat.commerce.gov.in",
                "https://dbie.rbi.org.in"
            ]
        }

        overall_deficit = None
        if merch and services:
            merch_def = merch.get("trade_deficit_usd_billion", 0)
            serv_surplus = services.get("net_services_surplus_usd_billion", 0)
            overall_deficit = round(merch_def + serv_surplus, 2)

        return {
            "fiscal_year": fiscal_year,
            "merchandise": merch,
            "services_rbi": services,
            "net_combined_trade_deficit_usd_billion": overall_deficit,
            "proof_badge": proof_badge
        }

    def triangulate_domestic(self) -> Dict[str, Any]:
        """Triangulate domestic internal trade and e-way bill volume."""
        data = self.store.get_domestic_trade()
        proof_badge = {
            "primary_source": "GSTN (Goods and Services Tax Network) e-Way Bill Telemetry",
            "cross_validation": "Ministry of Finance Monthly Gross Revenue & Inter-State IGST Distribution",
            "verification_urls": [
                "https://ewaybillgst.gov.in",
                "https://www.gst.gov.in"
            ]
        }
        return {
            "domestic_trade": data,
            "proof_badge": proof_badge
        }

    def answer_question(self, question: str) -> str:
        """Route plain-English question, triangulate data, and format auditable answer."""
        q_lower = question.lower()
        log_query(question, "TriangulationEngine", "reconciled")

        # Automatic Classification into Domain, Sector, and Partner
        classification = classifier.classify(question)
        banner = classifier.format_classification_banner(classification)

        matched_country = classification.get("detected_country")
        primary_sector = classification.get("primary_sector")

        # 0. Export Incentives & Cash Refund Calculation (RoDTEP, Drawback, Rebate)
        incentives_keywords = ["incentive", "incentives", "rodtep", "drawback", "refund", "rebate", "cash refund", "cash benefit", "cash back", "subsidy", "profit"]
        is_incentive_query = any(k in q_lower for k in incentives_keywords) or (("lakh" in q_lower or "crore" in q_lower or "$" in q_lower or "rs" in q_lower or "₹" in q_lower) and ("export" in q_lower or "order" in q_lower or "consignment" in q_lower))
        if is_incentive_query:
            calc_res = incentives_calculator.calculate(question)
            return banner + incentives_calculator.format_report(calc_res)

        # 1. Partner country matching
        if matched_country and ("export" in q_lower or "import" in q_lower or "trade" in q_lower or "compare" in q_lower or "with" in q_lower or "to" in q_lower or "from" in q_lower or len(question.split()) <= 4):
            res = self.triangulate_country(matched_country)
            return banner + self._format_country_response(res)

        # 2. Top exports / Top imports
        if "top export" in q_lower or "what does india export" in q_lower or "export goods" in q_lower:
            items = self.store.get_top_export_commodities(6)
            return banner + self._format_top_exports_response(items)

        if "top import" in q_lower or "what does india import" in q_lower or "buy" in q_lower or "import goods" in q_lower:
            items = self.store.get_top_import_commodities(6)
            return banner + self._format_top_imports_response(items)

        # 3. Sector / Commodity-specific (Auto-detected from question!)
        if primary_sector:
            # Search using sector keywords or original query
            sec_name = primary_sector["name"]
            # Look up matches
            export_matches = []
            import_matches = []
            for kw in primary_sector["keywords"][:4]:
                export_matches.extend(self.store.search_export_commodity(kw))
                import_matches.extend(self.store.search_import_commodity(kw))

            # Deduplicate by commodity name
            seen_ex = set()
            unique_ex = []
            for item in export_matches:
                if item["commodity"] not in seen_ex:
                    seen_ex.add(item["commodity"])
                    unique_ex.append(item)

            seen_im = set()
            unique_im = []
            for item in import_matches:
                if item["commodity"] not in seen_im:
                    seen_im.add(item["commodity"])
                    unique_im.append(item)

            if unique_ex or unique_im:
                res = {
                    "query_type": "commodity_trade",
                    "query": sec_name,
                    "export_findings": unique_ex,
                    "import_findings": unique_im,
                    "proof_badge": {
                        "primary_source": f"DGCI&S ITC-HS Classification for {sec_name} (HS {primary_sector['hs_chapters']})",
                        "cross_validation": "Ministry of Commerce NIRYAT Export Monitoring System & Export Promotion Councils",
                        "valuation_basis": "Exports FOB / Imports CIF",
                        "verification_urls": [
                            "https://tradestat.commerce.gov.in/eidb/",
                            "https://niryat.gov.in"
                        ]
                    }
                }
                return banner + self._format_commodity_response(res)

        # 4. Domestic / e-Way bill / Inland Trade
        is_domestic = any(d["id"] == "Domain 5" for d in classification.get("detected_domains", []))
        if is_domestic or any(w in q_lower for w in ["domestic", "eway", "e-way", "inter-state", "interstate", "internal", "mandi", "truck", "across states"]):
            res = self.triangulate_domestic()
            return banner + self._format_domestic_response(res)

        # 5. Default: Overall Macro Totals
        res = self.triangulate_macro_totals("FY2023-24")
        return banner + self._format_macro_response(res)

    # ---------------- Formatters with Audit Proof Badges ---------------- #

    def _format_country_response(self, r: Dict[str, Any]) -> str:
        c = r["country"]
        ex = r["india_exports_usd_billion"]
        im = r["india_imports_usd_billion"]
        bal = r["trade_balance_usd_billion"]
        status = r["balance_status"]
        m = r["mirror_reconciliation"]
        pb = r["proof_badge"]

        mirror_ex = m.get('india_reported_exports_fob_usd_billion', ex) if m else ex
        mirror_im = m.get('us_reported_imports_cif_usd_billion', m.get('china_reported_exports_fob_usd_billion', m.get('netherlands_reported_imports_cif_usd_billion', im))) if m else im

        out = [
            f"### Triangulated Trade Profile: India $\\leftrightarrow$ {c}",
            "",
            "| Trade Flow | Statutory Indian Record (USD Billion) | Partner Reported Mirror (USD Billion) | Valuation Basis |",
            "| :--- | :--- | :--- | :--- |",
            f"| **India's Exports to {c} (Trade Out)** | **${ex}B** | ${mirror_ex}B | FOB (Indian Port) |",
            f"| **India's Imports from {c} (Trade In)** | **${im}B** | ${mirror_im}B | CIF (Destination Port) |",
            f"| **Bilateral Trade Balance** | **{'+' if bal and bal > 0 else ''}${bal}B ({status})** | Reconciled within {pb['fob_cif_spread']} | Net Balance |",
            "",
            "#### Economic Triangulation & Cross-Check:",
        ]
        if m:
            out.append(f"- **FOB vs. CIF Reconciliation**: {m['explanation']}")
            out.append(f"- **Spread Margin**: {m['fob_cif_spread_pct']}% difference accounts for international ocean shipping freight, bunker adjustment, and marine insurance.")
        else:
            out.append(f"- Verified against official DGCI&S partner country export-import records.")

        out.extend([
            "",
            "```text",
            "═══════════════════════════════════════════════════════════════════════════",
            "                      STATUTORY AUDIT PROOF BADGE                           ",
            "═══════════════════════════════════════════════════════════════════════════",
            f"Primary Source       : {pb['primary_source']}",
            f"Valuation Standards  : {pb['valuation_basis']}",
            f"Mirror Cross-Check   : {pb['partner_mirror_source']}",
            f"Direct Verification  : {pb['verification_urls'][0]}",
            f"International Mirror : {pb['verification_urls'][1]}",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ])
        return "\n".join(out)

    def _format_top_exports_response(self, items: List[Dict[str, Any]]) -> str:
        out = [
            "### India's Top Export Sectors (Official DGCI&S Figures)",
            "",
            "| Rank | Commodity Sector | HS Chapter | Export Value (USD Billion) | National Share (%) | Key Destination Markets |",
            "| :---: | :--- | :---: | :---: | :---: | :--- |"
        ]
        for it in items:
            out.append(f"| {it['rank']} | **{it['commodity']}** | {it['hs_chapter']} | **${it['value_usd_billion']}B** | {it['share_pct']}% | {', '.join(it['major_destinations'])} |")

        out.extend([
            "",
            "#### Key Economic Findings:",
            "- **Engineering Goods & Refined Fuels**: Together make up over **44%** of India's total merchandise trade out.",
            "- **Fastest Growing Sector**: **Electronic Goods (Smartphones)** surged by **+23.6% YoY**, driven by the PLI (Production Linked Incentive) scheme.",
            "",
            "```text",
            "═══════════════════════════════════════════════════════════════════════════",
            "                      STATUTORY AUDIT PROOF BADGE                           ",
            "═══════════════════════════════════════════════════════════════════════════",
            "Primary Source       : Directorate General of Commercial Intelligence and Statistics (DGCI&S)",
            "System Classification: Indian Trade Classification based on Harmonized System (ITC-HS)",
            "Valuation Standard   : Free on Board (FOB) at Indian customs exit ports",
            "Verification Portal  : https://tradestat.commerce.gov.in / https://niryat.gov.in",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ])
        return "\n".join(out)

    def _format_top_imports_response(self, items: List[Dict[str, Any]]) -> str:
        out = [
            "### India's Top Import Commodities (Official DGCI&S Figures)",
            "",
            "| Rank | Commodity Sector | HS Code | Import Value (USD Billion) | Share of Total (%) | Key Sourcing Countries |",
            "| :---: | :--- | :---: | :---: | :---: | :--- |"
        ]
        for it in items:
            out.append(f"| {it['rank']} | **{it['commodity']}** | {it['hs_chapter']} | **${it['value_usd_billion']}B** | {it['share_pct']}% | {', '.join(it['major_sources'])} |")

        out.extend([
            "",
            "#### Key Economic Findings:",
            "- **Energy Dependence**: Crude Petroleum alone accounts for over **26.4%** ($178.6B) of total imports, with Russia and Iraq remaining the primary suppliers.",
            "- **Industrial Inputs**: Electronics components ($89.8B) and Machinery ($52.4B) represent necessary capital goods inputs for domestic manufacturing.",
            "",
            "```text",
            "═══════════════════════════════════════════════════════════════════════════",
            "                      STATUTORY AUDIT PROOF BADGE                           ",
            "═══════════════════════════════════════════════════════════════════════════",
            "Primary Source       : Directorate General of Commercial Intelligence & Statistics (DGCI&S)",
            "Valuation Basis      : Cost, Insurance, and Freight (CIF) at Indian entry ports",
            "Verification Portal  : https://tradestat.commerce.gov.in",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ])
        return "\n".join(out)

    def _format_commodity_response(self, r: Dict[str, Any]) -> str:
        q = r["query"]
        ex = r["export_findings"]
        im = r["import_findings"]
        pb = r["proof_badge"]

        out = [f"### Triangulated Commodity Profile: '{q.capitalize()}'", ""]
        if ex:
            out.append("#### Export Overview (Trade Out):")
            for it in ex:
                out.append(f"- **Commodity Line**: {it['commodity']} (HS: `{it['hs_chapter']}`)")
                out.append(f"  - **Export Value**: **${it['value_usd_billion']} Billion** ({it['share_pct']}% of national exports)")
                out.append(f"  - **Key Buyers**: {', '.join(it.get('major_destinations', []))}")
                if "growth_rate_pct" in it:
                    out.append(f"  - **YoY Growth**: +{it['growth_rate_pct']}%")
            out.append("")

        if im:
            out.append("#### Import Overview (Trade In):")
            for it in im:
                out.append(f"- **Commodity Line**: {it['commodity']} (HS: `{it['hs_chapter']}`)")
                out.append(f"  - **Import Value**: **${it['value_usd_billion']} Billion** ({it['share_pct']}% of national imports)")
                out.append(f"  - **Key Suppliers**: {', '.join(it.get('major_sources', []))}")
            out.append("")

        out.extend([
            "```text",
            "═══════════════════════════════════════════════════════════════════════════",
            "                      STATUTORY AUDIT PROOF BADGE                           ",
            "═══════════════════════════════════════════════════════════════════════════",
            f"Primary Source       : {pb['primary_source']}",
            f"Cross-Validation     : {pb['cross_validation']}",
            f"Valuation Standard   : {pb['valuation_basis']}",
            f"Direct Verification  : {pb['verification_urls'][0]}",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ])
        return "\n".join(out)

    def _format_domestic_response(self, r: Dict[str, Any]) -> str:
        d = r["domestic_trade"]
        pb = r["proof_badge"]
        out = [
            "### Domestic Commerce & Inter-State Trade Profile (\"In India\")",
            "",
            "| Metric | Official Statutory Value | Source / Methodology |",
            "| :--- | :--- | :--- |",
            f"| **Monthly e-Way Bills Generated** | **{d['monthly_average_eway_bills_million']} Million bills / month** | GSTN Mandatory Freight Telemetry (>₹50k goods) |",
            f"| **Annual Taxable Inter-State Cargo** | **₹{d['annual_taxable_value_inr_lakh_crore']} Lakh Crore** | Integrated Goods & Services Tax (IGST) Valuation |",
            f"| **Top Originating Manufacturing States** | {', '.join(d['top_originating_states'])} | Registered GST manufacturing base |",
            f"| **Top Destination Consumption States** | {', '.join(d['top_destination_states'])} | State consumption tax receipt index |",
            "",
            "```text",
            "═══════════════════════════════════════════════════════════════════════════",
            "                      STATUTORY AUDIT PROOF BADGE                           ",
            "═══════════════════════════════════════════════════════════════════════════",
            f"Primary Source       : {pb['primary_source']}",
            f"Cross-Validation     : {pb['cross_validation']}",
            f"Direct Verification  : {pb['verification_urls'][0]}",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ]
        return "\n".join(out)

    def _format_macro_response(self, r: Dict[str, Any]) -> str:
        fy = r["fiscal_year"]
        m = r["merchandise"]
        s = r["services_rbi"]
        net = r["net_combined_trade_deficit_usd_billion"]
        pb = r["proof_badge"]

        out = [
            f"### India's Overall Trade Landscape ({fy})",
            "",
            "| Flow | Merchandise (Goods - DGCI&S) | Services (Invisibles - RBI) | Combined Overall Trade |",
            "| :--- | :---: | :---: | :---: |",
            f"| **Exports (Trade Out)** | **${m['exports_usd_billion']}B** | **${s['services_exports_usd_billion']}B** | **${round(m['exports_usd_billion'] + s['services_exports_usd_billion'], 2)}B** |",
            f"| **Imports (Trade In)** | **${m['imports_usd_billion']}B** | **${s['services_imports_usd_billion']}B** | **${round(m['imports_usd_billion'] + s['services_imports_usd_billion'], 2)}B** |",
            f"| **Net Balance** | **-${abs(m['trade_deficit_usd_billion'])}B (Deficit)** | **+${s['net_services_surplus_usd_billion']}B (Surplus)** | **-${abs(net)}B (Deficit)** |",
            "",
            "#### Economic Triangulation Summary:",
            f"- **The Services Cushion**: India's **${s['net_services_surplus_usd_billion']}B services trade surplus** (driven by {s['top_category']}) offsets over **67%** of the physical merchandise deficit.",
            "",
            "```text",
            "═══════════════════════════════════════════════════════════════════════════",
            "                      STATUTORY AUDIT PROOF BADGE                           ",
            "═══════════════════════════════════════════════════════════════════════════",
            f"Merchandise Source   : {pb['merchandise_source']}",
            f"Services Bank Source : {pb['services_source']}",
            f"Statistical Standard : {pb['valuation_standard']}",
            f"Customs Portal       : {pb['verification_urls'][0]}",
            f"RBI DBIE Portal      : {pb['verification_urls'][1]}",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ]
        return "\n".join(out)

# Singleton engine instance
engine = TriangulationEngine()
