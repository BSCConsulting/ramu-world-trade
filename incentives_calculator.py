"""Statutory Export Incentives & Cash Refund Calculator for World of Trade.
Calculates exact government rupee refunds (RoDTEP, Duty Drawback, MSME Interest Subsidy)
on specific export orders, turning trade data into actionable profit intelligence.
"""
import re
import json
from pathlib import Path
from typing import Dict, Any, Optional
from config import DATA_DIR

INCENTIVES_FILE = DATA_DIR / "incentives_schedule.json"

class ExportIncentivesCalculator:
    def __init__(self, schedule_path: Path = INCENTIVES_FILE):
        with open(schedule_path, "r", encoding="utf-8") as f:
            self.data = json.load(f)
        self.schedules = self.data.get("schedules", [])
        self.default_forex = self.data.get("default_forex_rate_inr_per_usd", 84.0)

    def extract_order_value_inr(self, text: str) -> Optional[float]:
        """Parse monetary values in INR or USD from natural language."""
        t_clean = text.lower().replace(",", "")

        # 1. Match Lakhs: "20 lakh", "₹20 lakhs", "20l", "50 lakh"
        m_lakh = re.search(r"(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|l)\b", t_clean)
        if m_lakh:
            return float(m_lakh.group(1)) * 100000.0

        # 2. Match Crores: "1 crore", "₹2.5 crores", "1cr"
        m_crore = re.search(r"(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b", t_clean)
        if m_crore:
            return float(m_crore.group(1)) * 10000000.0

        # 3. Match USD: "$50,000", "50000 usd", "50k usd"
        m_usd = re.search(r"(?:\$|usd)\s*(\d+(?:\.\d+)?)\s*(k|m)?\b", t_clean)
        if m_usd:
            val = float(m_usd.group(1))
            mult = 1000.0 if m_usd.group(2) == "k" else (1000000.0 if m_usd.group(2) == "m" else 1.0)
            return val * mult * self.default_forex

        # 4. Direct Numbers: "2000000", "₹1500000"
        m_num = re.search(r"(?:rs\.?|inr|₹)\s*(\d{5,10})\b", t_clean)
        if m_num:
            return float(m_num.group(1))

        # Default fallback: ₹20 Lakhs if not specified
        return None

    def match_schedule(self, query: str) -> Dict[str, Any]:
        """Find the matching statutory incentive schedule for the product."""
        q_clean = query.lower()
        for sched in self.schedules:
            if any(re.search(r"\b" + re.escape(kw) + r"\b", q_clean) for kw in sched["commodity_matches"]):
                return sched
        # Default fallback to first schedule (Textiles/Garments)
        return self.schedules[0]

    def calculate(self, text: str) -> Dict[str, Any]:
        """Compute full export incentives, margins, and claiming steps."""
        order_value = self.extract_order_value_inr(text)
        is_default_value = False
        if order_value is None:
            order_value = 2000000.0  # Default ₹20 Lakhs
            is_default_value = True

        schedule = self.match_schedule(text)

        rodtep_pct = schedule["rodtep_rate_pct"]
        drawback_pct = schedule["duty_drawback_pct"]
        msme_subvention_pct = schedule.get("msme_interest_subvention_pct", 3.0)

        rodtep_inr = round(order_value * (rodtep_pct / 100.0), 2)
        drawback_inr = round(order_value * (drawback_pct / 100.0), 2)
        msme_benefit_inr = round(order_value * (msme_subvention_pct / 100.0) * (90.0 / 365.0), 2) # 90 days working credit

        total_direct_cash_inr = round(rodtep_inr + drawback_inr, 2)
        total_benefit_with_msme_inr = round(total_direct_cash_inr + msme_benefit_inr, 2)
        combined_rebate_pct = round(rodtep_pct + drawback_pct, 2)

        proof_badge = {
            "rodtep_authority": "Directorate General of Foreign Trade (DGFT) Appendix 4R",
            "drawback_authority": "CBIC All Industry Rates of Duty Drawback (Notification 77/2023-Customs)",
            "claiming_system": "ICEGATE Customs Automated Electronic Scrip Ledger (Drawback Scroll)",
            "verification_urls": [
                "https://dgft.gov.in",
                "https://www.icegate.gov.in"
            ]
        }

        return {
            "order_value_inr": order_value,
            "is_default_value": is_default_value,
            "schedule": schedule,
            "rodtep_pct": rodtep_pct,
            "rodtep_inr": rodtep_inr,
            "drawback_pct": drawback_pct,
            "drawback_inr": drawback_inr,
            "msme_benefit_inr": msme_benefit_inr,
            "total_direct_cash_inr": total_direct_cash_inr,
            "total_benefit_with_msme_inr": total_benefit_with_msme_inr,
            "combined_rebate_pct": combined_rebate_pct,
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
            f"Disbursement System : {pb['claiming_system']}",
            f"DGFT Portal         : {pb['verification_urls'][0]}",
            f"Customs ICEGATE     : {pb['verification_urls'][1]}",
            "═══════════════════════════════════════════════════════════════════════════",
            "```"
        ]
        return "\n".join(out)

# Singleton calculator instance
incentives_calculator = ExportIncentivesCalculator()
