"""Client & Parser for CBIC Customs Valuation Exchange Rates.
Statutory Basis: Section 14 of the Customs Act, 1962 (52 of 1962).
Provides Schedule I and Schedule II exchange rates, fortnight calendar countdown,
and customs assessable valuation impact calculations.
100% Free Tier, zero external pip dependencies.
"""
import json
import datetime
from pathlib import Path
from typing import Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "cbic_gazette_master.json"

def get_next_cbic_gazette_date(today: Optional[datetime.date] = None):
    """Calculates the next CBIC fortnightly exchange rate notification date (1st & 3rd Thursday)."""
    if today is None:
        today = datetime.date.today()
        
    def find_thursdays(y, m):
        d = datetime.date(y, m, 1)
        thursdays = []
        while d.month == m:
            if d.weekday() == 3:  # Thursday
                thursdays.append(d)
            d += datetime.timedelta(days=1)
        return thursdays

    current_thursdays = find_thursdays(today.year, today.month)
    first_thu = current_thursdays[0]
    third_thu = current_thursdays[2]

    if today < first_thu:
        next_date = first_thu
        revision_cycle = "1st Fortnight Revision"
    elif today < third_thu:
        next_date = third_thu
        revision_cycle = "2nd Fortnight Revision"
    else:
        next_m = today.month + 1 if today.month < 12 else 1
        next_y = today.year if today.month < 12 else today.year + 1
        next_date = find_thursdays(next_y, next_m)[0]
        revision_cycle = "1st Fortnight Revision"

    days_left = (next_date - today).days
    return next_date, revision_cycle, days_left

def get_cbic_gazette_data() -> Dict[str, Any]:
    """Retrieves the latest CBIC Customs Gazette valuation rates with calendar metadata."""
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master data: {MASTER_FILE}")
        
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    next_date, cycle_name, days_left = get_next_cbic_gazette_date()
    
    data["calendar_metadata"] = {
        "current_date": datetime.date.today().isoformat(),
        "next_revision_date": next_date.isoformat(),
        "next_revision_cycle": cycle_name,
        "days_until_next_revision": days_left,
        "status": f"Active Fortnight ({days_left} days left until {cycle_name})"
    }
    
    return data

def calculate_valuation_impact(
    currency: str,
    amount: float,
    trade_flow: str = "import",
    live_rate: Optional[float] = None
) -> Dict[str, Any]:
    """
    Calculates the statutory customs assessable value in INR under Section 14
    and computes the arbitrage/differential against commercial bank rates.
    """
    data = get_cbic_gazette_data()
    currency_upper = currency.upper().strip()
    flow_lower = trade_flow.lower().strip()
    
    target_curr = None
    for item in data.get("schedule_1", []):
        if item["currency"] == currency_upper:
            target_curr = item
            break
            
    if not target_curr:
        for item in data.get("schedule_2", []):
            if item["currency"] == currency_upper:
                target_curr = item
                break
                
    if not target_curr:
        raise ValueError(f"Currency {currency} not found in CBIC Schedules I or II")
        
    units = target_curr.get("units", 1)
    notified_rate = target_curr["import_rate"] if flow_lower == "import" else target_curr["export_rate"]
    
    # Statutory Assessable Value = (amount / units) * notified_rate
    assessable_value_inr = round((amount / units) * notified_rate, 2)
    
    res = {
        "currency": currency_upper,
        "amount_foreign": amount,
        "units": units,
        "trade_flow": flow_lower,
        "cbic_notified_rate": notified_rate,
        "statutory_assessable_value_inr": assessable_value_inr,
        "notification_ref": data.get("notification_number"),
        "statutory_act": data.get("statutory_act")
    }
    
    if live_rate and live_rate > 0:
        commercial_value_inr = round((amount / units) * live_rate, 2)
        diff_inr = round(commercial_value_inr - assessable_value_inr, 2)
        spread_bps = round(((live_rate - notified_rate) / notified_rate) * 10000, 1)
        
        # Effective Customs Duty & IGST ~ 29.8% (10% BCD + 18% IGST compounded)
        duty_impact_inr = round(abs(diff_inr) * 0.298, 2) if flow_lower == "import" else 0.0
        
        res.update({
            "live_commercial_rate": live_rate,
            "commercial_value_inr": commercial_value_inr,
            "valuation_differential_inr": diff_inr,
            "spread_bps": spread_bps,
            "duty_impact_estimate_inr": duty_impact_inr,
            "advice": (
                f"Statutory Gazette rate (₹{notified_rate}) is LOWER than live market rate (₹{live_rate}). "
                f"Importers save ~₹{duty_impact_inr:,.2f} in customs duty by filing Bill of Entry under this gazette."
                if diff_inr > 0 and flow_lower == "import" else
                f"Statutory Gazette rate is aligned with commercial rates within {abs(spread_bps)} bps."
            )
        })
        
    return res
