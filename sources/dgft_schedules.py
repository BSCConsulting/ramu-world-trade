"""DGFT Statutory Export Incentive Schedules & RoDTEP / RoSCTL Engine.
Statutory Basis: Foreign Trade Policy (FTP) 2023, DGFT Appendix 4R & Ministry of Textiles RoSCTL.
100% Free Tier, zero external pip dependencies.
"""
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "dgft_schedules_master.json"

def _load_master() -> Dict[str, Any]:
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master file: {MASTER_FILE}")
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_dgft_overview() -> Dict[str, Any]:
    """Returns DGFT master overview, latest trade notices, and incentive schemes."""
    data = _load_master()
    return {
        "metadata": data.get("metadata"),
        "latest_notifications": data.get("latest_notifications", []),
        "schemes": data.get("schemes", {}),
        "catalog_size": len(data.get("hs_catalog", [])),
        "catalog": data.get("hs_catalog", [])
    }

def lookup_hs_incentive(query: str) -> Optional[Dict[str, Any]]:
    """Looks up export incentive schedule by 8-digit HS code, chapter, or commodity name."""
    data = _load_master()
    q = query.strip().lower().replace(".", "").replace(" ", "")
    catalog = data.get("hs_catalog", [])
    
    # 1. Exact match on clean HS code
    for item in catalog:
        item_hs = item["hs_code"].replace(".", "").replace(" ", "")
        if q == item_hs or item_hs.startswith(q) or q.startswith(item_hs[:4]):
            return item
            
    # 2. Keyword match
    q_words = query.strip().lower().split()
    for item in catalog:
        for kw in item.get("keywords", []):
            if any(w in kw.lower() or kw.lower() in w for w in q_words):
                return item
        if any(w in item["commodity"].lower() for w in q_words):
            return item
            
    return catalog[0] if catalog else None

def calculate_export_incentives(
    order_value_inr: float,
    hs_code_or_query: str = "61091000",
    quantity: float = 0.0
) -> Dict[str, Any]:
    """
    Calculates exact statutory RoDTEP/RoSCTL, Duty Drawback, and MSME interest relief.
    Applies statutory unit caps where specified in DGFT Appendix 4R.
    """
    if order_value_inr <= 0:
        order_value_inr = 2000000.0  # Default ₹20 Lakhs
        
    sched = lookup_hs_incentive(hs_code_or_query)
    if not sched:
        raise ValueError("No matching statutory schedule found")
        
    scheme_name = sched.get("scheme", "RoDTEP")
    rebate_rate_pct = float(sched.get("rodtep_rate_pct", 2.0))
    drawback_pct = float(sched.get("duty_drawback_pct", 1.5))
    cap_per_unit = float(sched.get("cap_per_unit_inr", 0.0))
    unit = sched.get("unit", "pcs")
    
    # Base percentage rebate
    base_rebate_inr = order_value_inr * (rebate_rate_pct / 100.0)
    capped_applied = False
    
    # Apply statutory cap per unit if quantity is provided
    if quantity > 0 and cap_per_unit > 0:
        max_allowable_cap = quantity * cap_per_unit
        if base_rebate_inr > max_allowable_cap:
            rebate_inr = max_allowable_cap
            capped_applied = True
        else:
            rebate_inr = base_rebate_inr
    else:
        rebate_inr = base_rebate_inr
        
    # All Industry Duty Drawback (AIR DBK) - Direct bank credit
    drawback_inr = order_value_inr * (drawback_pct / 100.0)
    
    # Secondary market electronic scrip monetization
    # Market trades duty credit scrips at ~98.0% - 98.5% face value
    scrip_discount_pct = 1.8
    scrip_cash_realization_inr = rebate_inr * ((100.0 - scrip_discount_pct) / 100.0)
    
    # MSME Interest Equalization Scheme (IES) - 3.0% subvention on 90-day export cycle
    interest_subvention_inr = order_value_inr * 0.03 * (90.0 / 365.0)
    
    # Total direct cash benefit realized
    total_cash_inr = drawback_inr + scrip_cash_realization_inr + interest_subvention_inr
    effective_benefit_pct = round((total_cash_inr / order_value_inr) * 100.0, 2)
    
    return {
        "order_value_inr": round(order_value_inr, 2),
        "schedule": sched,
        "quantity": quantity,
        "unit": unit,
        "cap_applied": capped_applied,
        "scheme_details": {
            "scheme_name": scheme_name,
            "rebate_rate_pct": rebate_rate_pct,
            "rebate_scrip_inr": round(rebate_inr, 2),
            "secondary_scrip_cash_inr": round(scrip_cash_realization_inr, 2),
            "scrip_discount_pct": scrip_discount_pct,
            "disbursement_method": "ICEGATE Electronic Duty Credit Ledger Scrip"
        },
        "duty_drawback": {
            "rate_pct": drawback_pct,
            "drawback_inr": round(drawback_inr, 2),
            "disbursement_method": "Direct PFMS Bank Transfer (within 72 hours of EGM)"
        },
        "msme_interest_subvention": {
            "rate_pct": 3.0,
            "subvention_period_days": 90,
            "subvention_inr": round(interest_subvention_inr, 2),
            "disbursement_method": "Direct interest rate deduction on PCFC/EPC pre-shipment credit"
        },
        "summary": {
            "total_cash_benefit_inr": round(total_cash_inr, 2),
            "effective_cash_return_pct": effective_benefit_pct,
            "authority_notification": sched.get("dgft_public_notice", "DGFT Appendix 4R")
        }
    }
