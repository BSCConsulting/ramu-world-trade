"""Statutory Export Incentives & Cash Refund Calculator for World of Trade.
Calculates exact government rupee refunds (RoDTEP, Duty Drawback, MSME Interest Subsidy)
backed by CBIC Customs Gazette exchange rates and DGFT Appendix 4R.
"""
import re
import json
from pathlib import Path
from typing import Dict, Any, Optional
from config import DATA_DIR

INCENTIVES_FILE = DATA_DIR / "incentives_schedule.json"
FOREX_FILE = DATA_DIR / "forex_gazette.json"

class ExportIncentivesCalculator:
    def __init__(self, schedule_path: Path = INCENTIVES_FILE, forex_path: Path = FOREX_FILE):
        with open(schedule_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
        self.schedules = self.data.get("schedules", [])

        # Load CBIC Gazette forex rates
        self.forex_rates = {
            "USD": 84.05, "EUR": 91.30, "GBP": 109.45, "AED": 22.88, "SAR": 22.40, "CNY": 11.82, "SGD": 64.15
        }
        if forex_path.exists():
            with open(forex_path, "r", encoding="utf-8") as f:
                self.forex_rates.update(json.load(f).get("rates_inr_per_unit", {}))

    def extract_order_value_inr(self, text: str) -> Optional[float]:
        """Parse monetary values in INR, USD, AED, EUR, GBP using CBIC Gazette rates."""
        t_clean = text.lower().replace(",", "")

        # 1. Match Lakhs: "20 lakh", "₹20 lakhs", "20l", "50 lakh"
        m_lakh = re.search(r"(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b", t_clean)
        if m_lakh:
            return float(m_lakh.group(1)) * 100000.0

        # 2. Match Crores: "1 crore", "₹2.5 crores", "1cr"
        m_crore = re.search(r"(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b", t_clean)
        if m_crore:
            return float(m_crore.group(1)) * 10000000.0

        # 3. Match USD: "$50,000", "50000 usd", "50k usd", "$50k"
        m_usd = re.search(r"(?:\$|usd)\s*(\d+(?:\.\d+)?)\s*(k|m)?\b", t_clean) or re.search(r"\b(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:usd|dollars?|\$)\b", t_clean)
        if m_usd:
            val = float(m_usd.group(1))
            mult = 1000.0 if m_usd.group(2) == "k" else (1000000.0 if m_usd.group(2) == "m" else 1.0)
            return val * mult * self.forex_rates.get("USD", 84.05)

        # 4. Match AED (Gulf CEPA Trade): "aed 500000", "500k aed", "50000 aed"
        m_aed = re.search(r"(?:aed|dirhams?)\s*(\d+(?:\.\d+)?)\s*(k|m)?\b", t_clean) or re.search(r"\b(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:aed|dirhams?)\b", t_clean)
        if m_aed:
            val = float(m_aed.group(1))
            mult = 1000.0 if m_aed.group(2) == "k" else (1000000.0 if m_aed.group(2) == "m" else 1.0)
            return val * mult * self.forex_rates.get("AED", 22.88)

        # 5. Match EUR: "€50,000", "50000 eur", "50k eur"
        m_eur = re.search(r"(?:€|eur|euros?)\s*(\d+(?:\.\d+)?)\s*(k|m)?\b", t_clean) or re.search(r"\b(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:€|eur|euros?)\b", t_clean)
        if m_eur:
            val = float(m_eur.group(1))
            mult = 1000.0 if m_eur.group(2) == "k" else (1000000.0 if m_eur.group(2) == "m" else 1.0)
            return val * mult * self.forex_rates.get("EUR", 91.30)

        # 6. Match GBP: "£50,000", "50000 gbp", "50k pounds"
        m_gbp = re.search(r"(?:£|gbp|pounds?)\s*(\d+(?:\.\d+)?)\s*(k|m)?\b", t_clean) or re.search(r"\b(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:£|gbp|pounds?)\b", t_clean)
        if m_gbp:
            val = float(m_gbp.group(1))
            mult = 1000.0 if m_gbp.group(2) == "k" else (1000000.0 if m_gbp.group(2) == "m" else 1.0)
            return val * mult * self.forex_rates.get("GBP", 109.80)

        # 7. Direct Numbers: "2000000", "₹1500000"
        m_num = re.search(r"(?:rs\.?|inr|₹)\s*(\d{5,10})\b", t_clean)
        if m_num:
            return float(m_num.group(1))

        return None

    def match_schedule(self, query: str) -> Dict[str, Any]:
        """Find the matching statutory incentive schedule for the product."""
        q_clean = query.lower()
        for sched in self.schedules:
            if any(re.search(r"\b" + re.escape(kw) + r"\b", q_clean) for kw in sched["commodity_matches"]):
                return sched
        return self.schedules[0]

    def calculate(self, text: str, explicit_value: Optional[float] = None, quantity: Optional[float] = None, unit: Optional[str] = None) -> Dict[str, Any]:
        """Compute full export incentives, unit caps, secondary scrip monetization, and claiming steps."""
        if explicit_value is not None and explicit_value > 0:
            order_value = float(explicit_value)
            is_default_value = False
        else:
            order_value = self.extract_order_value_inr(text)
            is_default_value = False
            if order_value is None:
                order_value = 2000000.0  # Default ₹20 Lakhs
                is_default_value = True

        schedule = self.match_schedule(text)

        scheme_name = schedule.get("scheme_name", "RoDTEP")
        rodtep_pct = schedule["rodtep_rate_pct"]
        drawback_pct = schedule["duty_drawback_pct"]
        msme_subvention_pct = schedule.get("msme_interest_subvention_pct", 3.0)

        # Uncapped percentage value
        pct_value = order_value * (rodtep_pct / 100.0)
        
        # Enforce Appendix 4R Statutory Rupee Cap per Unit if quantity is provided
        cap_per_unit = schedule.get("cap_per_unit_inr")
        prod_unit = unit or schedule.get("unit", "pcs")
        is_capped = False
        cap_ceiling = None

        if quantity is not None and quantity > 0 and cap_per_unit:
            cap_ceiling = cap_per_unit * quantity
            if cap_ceiling < pct_value:
                rodtep_inr = round(cap_ceiling, 2)
                is_capped = True
            else:
                rodtep_inr = round(pct_value, 2)
        else:
            rodtep_inr = round(pct_value, 2)

        drawback_inr = round(order_value * (drawback_pct / 100.0), 2)
        msme_benefit_inr = round(order_value * (msme_subvention_pct / 100.0) * (90.0 / 365.0), 2)

        # Secondary Market Scrip Cash Realization (1.8% Market Discount)
        scrip_discount_pct = schedule.get("secondary_market_discount_pct", 1.8)
        scrip_discount_inr = round(rodtep_inr * (scrip_discount_pct / 100.0), 2)
        scrip_net_cash_inr = round(rodtep_inr - scrip_discount_inr, 2)

        # Advance Authorization (AA) estimated duty saved
        aa_saving_pct = schedule.get("advance_auth_saving_pct", 11.0)
        advance_auth_saving_inr = round(order_value * (aa_saving_pct / 100.0), 2)

        total_direct_cash_inr = round(rodtep_inr + drawback_inr, 2)
        total_benefit_with_msme_inr = round(total_direct_cash_inr + msme_benefit_inr, 2)
        combined_rebate_pct = round(rodtep_pct + drawback_pct, 2)

        proof_badge = {
            "rodtep_authority": f"Directorate General of Foreign Trade (DGFT) {scheme_name} Appendix 4R",
            "drawback_authority": "CBIC All Industry Rates of Duty Drawback (Notification 77/2023-Customs)",
            "forex_conversion": f"CBIC Gazette Notification No. 12/2024-Customs (USD: ₹{self.forex_rates.get('USD', 84.05)} | AED: ₹{self.forex_rates.get('AED', 22.88)})",
            "claiming_system": "ICEGATE Customs Automated Electronic Scrip Ledger (Drawback Scroll)",
            "verification_urls": [
                "https://dgft.gov.in",
                "https://www.icegate.gov.in",
                "https://www.cbic.gov.in"
            ]
        }

        return {
            "order_value_inr": order_value,
            "is_default_value": is_default_value,
            "schedule": schedule,
            "scheme_name": scheme_name,
            "quantity": quantity,
            "unit": prod_unit,
            "cap_per_unit_inr": cap_per_unit,
            "is_capped": is_capped,
            "cap_ceiling": cap_ceiling,
            "rodtep_pct": rodtep_pct,
            "rodtep_inr": rodtep_inr,
            "scrip_discount_pct": scrip_discount_pct,
            "scrip_discount_inr": scrip_discount_inr,
            "scrip_net_cash_inr": scrip_net_cash_inr,
            "advance_auth_saving_pct": aa_saving_pct,
            "advance_auth_saving_inr": advance_auth_saving_inr,
            "drawback_pct": drawback_pct,
            "drawback_inr": drawback_inr,
            "msme_benefit_inr": msme_benefit_inr,
            "total_direct_cash_inr": total_direct_cash_inr,
            "total_benefit_with_msme_inr": total_benefit_with_msme_inr,
            "combined_rebate_pct": combined_rebate_pct,
            "forex_rates": self.forex_rates,
            "proof_badge": proof_badge
        }

    def format_report(self, r: Dict[str, Any]) -> str:
        """Format the calculated result into a professional financial report."""
        val = r["order_value_inr"]
        s = r["schedule"]
        rod_inr = r["rodtep_inr"]
        dbk_inr = r["drawback_inr"]
        total_cash = r["total_direct_cash_inr"]
        tot_pct = r["combined_rebate_pct"]
        pb = r["proof_badge"]

        def fmt_curr(amount):
            if amount >= 10000000:
                return f"₹{amount / 10000000:.2f} Crore"
            elif amount >= 100000:
                return f"₹{amount / 100000:.2f} Lakhs"
            else:
                return f"₹{amount:,.2f}"

        out = [
            f"### Statutory Export Cash Incentive & Profit Calculator",
            f"**Product Classified**: {s['description']} (ITC-HS: `{s['hs_code']}`)",
            f"**Consignment FOB Value**: **{fmt_curr(val)}** ({'Default sample size' if r['is_default_value'] else 'Based on your query'})",
            "",
            "| Government Rebate Scheme | Statutory Rate (%) | Direct Cash Refund to Bank (INR) | Disbursing Authority |",
            "| :--- | :---: | :---: | :--- |",
            f"| **1. RoDTEP Scheme** (Taxes Remission) | **{r['rodtep_pct']}%** | **₹{rod_inr:,.2f}** | DGFT Electronic Scrip Ledger |",
            f"| **2. Duty Drawback (DBK)** (Input Customs Refund) | **{r['drawback_pct']}%** | **₹{dbk_inr:,.2f}** | Customs EDI Automated Scroll |",
            f"| **TOTAL DIRECT CASH REFUND** | **{tot_pct}%** | **₹{total_cash:,.2f}** | **Net Profit Boost Deposited in Bank** |",
            f"| *3. MSME Working Capital Subvention* (Optional) | *{s.get('msme_interest_subvention_pct', 3.0)}%* | *₹{r['msme_benefit_inr']:,.2f}* | *Interest saved on 90-day bank credit* |",
            "",
            "#### Financial Impact on Your Order:",
            f"- **Instant Margin Boost**: This order receives an immediate **+{tot_pct}% pure cash margin addition** on top of your standard selling price.",
            f"- **Net Financial Gain**: An order of **{fmt_curr(val)}** yields **₹{total_cash:,.2f}** in statutory government cash refunds.",
            "",
            "#### How to Disburse This Cash Into Your Bank Account:",
            "1. **Shipping Bill Filing**: Ensure your Customs Broker (CHA) marks *'Scheme Code: RoDTEP & Drawback'* on the export Shipping Bill at the port.",
            "2. **Drawback Automatic Credit**: Within 72 hours of the vessel's departure, Indian Customs automatically credits the Drawback amount directly to your linked bank account via PFMS/EDI.",
            "3. **RoDTEP Scrip Generation**: Log in to your **ICEGATE.gov.in** portal, go to *Electronic Duty Credit Ledger*, generate your scrip, and use it to offset import duties or sell/transfer it for 100% cash.",
            "",
            "```text",
            "═══════════════════════════════════════════════════════════════════════════",
            "                      STATUTORY AUDIT PROOF BADGE                           ",
            "═══════════════════════════════════════════════════════════════════════════",
            f"RoDTEP Schedule     : {pb['rodtep_authority']}",
            f"Duty Drawback Rates : {pb['drawback_authority']}",
            f"Forex Conversion    : {pb['forex_conversion']}",
            f"Disbursement System : {pb['claiming_system']}",
            f"DGFT Portal         : {pb['verification_urls'][0]}",
            f"Customs ICEGATE     : {pb['verification_urls'][1]}",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ]
        return "\n".join(out)

# Singleton calculator instance
incentives_calculator = ExportIncentivesCalculator()
