"""
ECGC (Export Credit Guarantee Corporation of India) Underwriting & Credit Risk Engine
Statutory & Commercial Data Source for Indian Export Credit Insurance.

Implements the official 7-Tier Country Risk Classification (Grades A1 to D),
statutory credit insurance premium rates under Shipment Comprehensive Risks (SCR),
Discretionary Credit Limit (DCL) underwriting rules, and FEMA Section 8 claims timelines.
"""

import json
import os
from typing import Dict, Any, Optional

_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ecgc_master.json")
_CACHE = None

# Aliases to match common names / codes
_ALIASES = {
    "US": "USA", "UNITED STATES": "USA", "AMERICA": "USA",
    "UK": "GBR", "UNITED KINGDOM": "GBR", "BRITAIN": "GBR", "ENGLAND": "GBR",
    "UAE": "ARE", "DUBAI": "ARE", "UNITED ARAB EMIRATES": "ARE",
    "GERMANY": "DEU", "DE": "DEU",
    "JAPAN": "JPN", "JP": "JPN",
    "SINGAPORE": "SGP", "SG": "SGP",
    "AUSTRALIA": "AUS", "AU": "AUS",
    "FRANCE": "FRA", "FR": "FRA",
    "NETHERLANDS": "NLD", "HOLLAND": "NLD", "NL": "NLD",
    "SAUDI ARABIA": "SAU", "KSA": "SAU", "SA": "SAU",
    "SOUTH KOREA": "KOR", "KOREA": "KOR", "KR": "KOR",
    "MALAYSIA": "MYS", "MY": "MYS",
    "VIETNAM": "VNM", "VN": "VNM",
    "BRAZIL": "BRA", "BR": "BRA",
    "BANGLADESH": "BGD", "BD": "BGD",
    "NIGERIA": "NGA", "NG": "NGA",
    "RUSSIA": "RUS", "RU": "RUS",
    "SRI LANKA": "LKA", "LK": "LKA",
    "EGYPT": "EGY", "EG": "EGY",
    "KENYA": "KEN", "KE": "KEN",
    "SOUTH AFRICA": "ZAF", "ZA": "ZAF",
    "TURKEY": "TUR", "TR": "TUR", "TURKIYE": "TUR",
    "INDONESIA": "IDN", "ID": "IDN",
    "CHINA": "CHN", "CN": "CHN",
    "IRAN": "IRN", "PAKISTAN": "PAK", "PK": "PAK"
}

def _load_master() -> Dict[str, Any]:
    global _CACHE
    if _CACHE is None:
        try:
            with open(_DATA_PATH, "r", encoding="utf-8") as f:
                _CACHE = json.load(f)
        except Exception:
            _CACHE = {"metadata": {}, "risk_tiers": {}, "countries": [], "statutory_premium_rates_pct": {}}
    return _CACHE

def get_ecgc_overview() -> Dict[str, Any]:
    """Returns the full master catalog, risk tiers, and policy parameters."""
    return _load_master()

def get_country_risk(country_query: str) -> Optional[Dict[str, Any]]:
    """Resolves a country by code or name and returns its statutory ECGC risk profile."""
    master = _load_master()
    q = (country_query or "").strip().upper()
    code = _ALIASES.get(q, q)
    
    country_entry = None
    for c in master.get("countries", []):
        if c.get("code") == code or c.get("name", "").upper() == q:
            country_entry = c
            break
            
    if not country_entry:
        # Fallback to USA if not matched
        for c in master.get("countries", []):
            if c.get("code") == "USA":
                country_entry = c
                break
                
    if not country_entry:
        return None
        
    tier_code = country_entry.get("tier", "B1")
    tier_info = master.get("risk_tiers", {}).get(tier_code, {})
    
    return {
        "country_code": country_entry.get("code"),
        "country_name": country_entry.get("name"),
        "risk_tier": tier_code,
        "rating": tier_info.get("rating", "Standard Risk"),
        "description": tier_info.get("description", ""),
        "max_credit_tenor_days": tier_info.get("max_credit_tenor_days", 180),
        "underwriting_stance": tier_info.get("underwriting_stance", "Open Cover"),
        "political_risk": tier_info.get("political_risk", "Moderate"),
        "transfer_risk": tier_info.get("transfer_risk", "Normal")
    }

def calculate_ecgc_premium(
    country: str,
    invoice_value: float,
    payment_terms: str = "DA_60",
    is_usd: bool = False,
    usd_inr_rate: float = 84.55
) -> Dict[str, Any]:
    """
    Computes statutory ECGC credit insurance premium, 90% loss indemnification,
    and Discretionary Credit Limit (DCL) eligibility.
    """
    master = _load_master()
    meta = master.get("metadata", {})
    country_profile = get_country_risk(country) or {}
    tier = country_profile.get("risk_tier", "B1")
    
    # Standardize payment terms
    terms_clean = (payment_terms or "DA_60").strip().upper().replace(" ", "_").replace("-", "_")
    valid_terms = ["CAD_DP", "DA_30", "DA_60", "DA_90", "DA_120", "DA_180", "LC"]
    if terms_clean not in valid_terms:
        # Fuzzy match
        if "CAD" in terms_clean or "DP" in terms_clean or "SIGHT" in terms_clean:
            terms_clean = "CAD_DP"
        elif "30" in terms_clean:
            terms_clean = "DA_30"
        elif "90" in terms_clean:
            terms_clean = "DA_90"
        elif "120" in terms_clean:
            terms_clean = "DA_120"
        elif "180" in terms_clean:
            terms_clean = "DA_180"
        elif "LC" in terms_clean:
            terms_clean = "LC"
        else:
            terms_clean = "DA_60"

    # Valuation in INR
    val = float(invoice_value or 100000.0)
    if is_usd:
        val_inr = round(val * float(usd_inr_rate or 84.55), 2)
        val_usd = val
    else:
        val_inr = val
        val_usd = round(val / float(usd_inr_rate or 84.55), 2)

    tier_rates = master.get("statutory_premium_rates_pct", {}).get(tier, {})
    rate_pct = float(tier_rates.get(terms_clean, 0.35))
    
    is_off_cover = (tier == "D")
    if is_off_cover:
        rate_pct = 0.0
        gross_premium_inr = 0.0
        gst_inr = 0.0
        net_premium_inr = 0.0
        covered_amount_inr = 0.0
        exporter_retention_inr = 0.0
        cover_status = "OFF-COVER"
        advice = "Statutory credit insurance unavailable for Grade D territories. Insist on 100% advance wire transfer or confirmed irrevocable Letter of Credit prior to cargo dispatch."
    else:
        gross_premium_inr = round(val_inr * (rate_pct / 100.0), 2)
        gst_inr = round(gross_premium_inr * 0.18, 2)
        net_premium_inr = round(gross_premium_inr + gst_inr, 2)
        covered_amount_inr = round(val_inr * 0.90, 2)
        exporter_retention_inr = round(val_inr * 0.10, 2)
        cover_status = "INSURABLE"
        advice = "Standard ECGC Shipment Comprehensive Risks (SCR) cover active. Exporter must declare overdue within 30 days if buyer defaults."

    # Discretionary Credit Limit (DCL) Rule
    dcl_threshold = float(meta.get("discretionary_credit_limit_inr", 1000000))
    dcl_eligible = bool(val_inr <= dcl_threshold and tier in ["A1", "A2", "B1", "B2"])
    
    dcl_verdict = {
        "dcl_threshold_inr": dcl_threshold,
        "eligible_for_dcl": dcl_eligible,
        "note": "Exporters can extend open credit up to ₹10 Lakh without prior ECGC buyer approval if 3 clean shipments exist." if dcl_eligible else "Invoice exceeds ₹10 Lakh DCL threshold or country is elevated risk. Specific Buyer Credit Limit (SBL) approval required from ECGC branch."
    }

    # Statutory Claims Timeline
    claims_schedule = {
        "day_0_due_date": "Invoice payment due date under agreed contractual tenor.",
        "day_30_overdue_notice": "Mandatory Form 205 Overdue Declaration filing with ECGC and AD Bank (FEMA Sec 8).",
        "month_4_waiting_period": "Statutory waiting period for commercial default expires; formal claim admissibility opens.",
        "month_12_claim_cutoff": "Hard legal deadline for filing formal insurance claim with certified non-payment evidence."
    }

    return {
        "country": country_profile,
        "consignment": {
            "invoice_value_inr": val_inr,
            "invoice_value_usd": val_usd,
            "payment_terms": terms_clean,
            "usd_inr_exchange_rate": float(usd_inr_rate or 84.55)
        },
        "premium_calculation": {
            "cover_status": cover_status,
            "statutory_premium_rate_pct": rate_pct,
            "gross_premium_inr": gross_premium_inr,
            "gst_18_pct_inr": gst_inr,
            "net_premium_payable_inr": net_premium_inr,
            "net_premium_payable_usd": round(net_premium_inr / float(usd_inr_rate or 84.55), 2),
            "effective_cost_pct": round((net_premium_inr / val_inr) * 100.0, 3) if val_inr > 0 else 0.0
        },
        "indemnification_coverage": {
            "ecgc_covered_amount_inr": covered_amount_inr,
            "ecgc_cover_pct": 90.0 if not is_off_cover else 0.0,
            "exporter_co_insurance_inr": exporter_retention_inr,
            "exporter_retention_pct": 10.0 if not is_off_cover else 100.0
        },
        "underwriting_rules": dcl_verdict,
        "statutory_claims_protocol": claims_schedule,
        "statutory_advisory": advice,
        "metadata": {
            "authority": "Export Credit Guarantee Corporation of India (ECGC Ltd.)",
            "policy": "Shipment (Comprehensive Risks) Policy (SCR)",
            "gst_sac": "997133 (Credit Insurance Services)"
        }
    }
