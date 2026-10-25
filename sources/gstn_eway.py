"""GSTN e-Way Bill Domestic Cargo Movement & Rule 138 Validity Engine.
Statutory Basis: Rule 138 of the Central Goods and Services Tax (CGST) Rules, 2017.
Maintains official transit benchmarks, corridor transit density, and automated
validity calculation & 8-hour legal extension window calculations.
100% Free Tier, zero external pip dependencies.
"""
import json
import math
import datetime
from pathlib import Path
from typing import Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "gstn_eway_master.json"

def _load_master() -> Dict[str, Any]:
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master file: {MASTER_FILE}")
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def calculate_eway_validity(
    distance_km: float,
    cargo_type: str = "normal",
    start_dt: Optional[datetime.datetime] = None
) -> Dict[str, Any]:
    """
    Computes statutory e-Way bill validity under CGST Rule 138(10).
    Normal Cargo: 1 day per 200 km or part thereof.
    Over Dimensional Cargo (ODC): 1 day per 20 km or part thereof.
    Expires at 23:59:59 (midnight) of the concluding day.
    Legal extension window under Rule 138(10): 8 hours before to 8 hours after expiry.
    """
    if distance_km <= 0:
        distance_km = 1.0
        
    is_odc = "odc" in cargo_type.lower() or "over" in cargo_type.lower()
    km_per_day = 20.0 if is_odc else 200.0
    validity_days = max(1, math.ceil(distance_km / km_per_day))
    
    if start_dt is None:
        start_dt = datetime.datetime.now()
        
    # Validity expires at 23:59:59 on the Nth day following generation day
    expiry_date = (start_dt + datetime.timedelta(days=validity_days)).date()
    expiry_dt = datetime.datetime.combine(expiry_date, datetime.time(23, 59, 59))
    
    window_start = expiry_dt - datetime.timedelta(hours=8)
    window_end = expiry_dt + datetime.timedelta(hours=8)
    
    time_left_seconds = max(0, int((expiry_dt - start_dt).total_seconds()))
    hours_left = round(time_left_seconds / 3600.0, 1)
    
    return {
        "distance_km": distance_km,
        "cargo_type": "Over Dimensional Cargo (ODC)" if is_odc else "Normal Commercial Cargo",
        "statutory_rate": f"1 day per {int(km_per_day)} km (Rule 138(10))",
        "validity_days": validity_days,
        "generation_time": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "expiry_time": expiry_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "hours_remaining": hours_left,
        "legal_extension_window": {
            "starts_at": window_start.strftime("%Y-%m-%d %H:%M:%S"),
            "closes_at": window_end.strftime("%Y-%m-%d %H:%M:%S"),
            "rule": "Rule 138(10) allows extension within 8h before or 8h after midnight expiry in case of breakdown or transshipment."
        }
    }

def get_gstn_overview() -> Dict[str, Any]:
    """Returns macro GSTN national movement analytics and corridor list."""
    data = _load_master()
    return {
        "metadata": data.get("metadata"),
        "macro_statistics": data.get("macro_statistics"),
        "corridors": data.get("high_volume_export_corridors", [])
    }

get_eway_overview = get_gstn_overview

def get_corridor_profile(query: str) -> Optional[Dict[str, Any]]:
    """Finds a high-volume corridor and computes live validity."""
    data = _load_master()
    q = query.lower().strip()
    
    for c in data.get("high_volume_export_corridors", []):
        if q in c["id"].lower() or q in c["name"].lower() or q in c["origin_city"].lower() or q in c["dest_city"].lower():
            val_calc = calculate_eway_validity(c["distance_km"], "normal")
            res = dict(c)
            res["live_validity_calculation"] = val_calc
            return res
    return None
