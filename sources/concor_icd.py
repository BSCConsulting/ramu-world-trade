"""CONCOR ICD Rail Freight & Dedicated Freight Corridor (DFC) Logistics Engine.
Statutory Authority: Container Corporation of India Ltd. (CONCOR), Ministry of Railways,
and Railway Board Goods Tariff Rates Circular.
100% Free Tier, zero external pip dependencies.
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "concor_icd_master.json"

def _load_master() -> Dict[str, Any]:
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master file: {MASTER_FILE}")
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_concor_overview() -> Dict[str, Any]:
    """Returns all active ICD dry ports, DFC freight corridors, and infrastructure parameters."""
    data = _load_master()
    return {
        "metadata": data.get("metadata"),
        "total_icds": len(data.get("icds", [])),
        "total_corridors": len(data.get("corridors", [])),
        "icds": data.get("icds", []),
        "corridors": [
            {
                "corridor_id": c["corridor_id"],
                "origin_name": c["origin_name"],
                "dest_name": c["dest_name"],
                "distance_km": c["distance_km"],
                "dfc_available": c["dfc_available"],
                "wdfc_transit_hours": c["wdfc_transit_hours"],
                "conventional_transit_hours": c["conventional_transit_hours"]
            }
            for c in data.get("corridors", [])
        ]
    }

def get_corridor_details(corridor_id: str = "tkd_jnpt") -> Optional[Dict[str, Any]]:
    """Fetches complete operational and pricing details for an ICD-Port rail link."""
    data = _load_master()
    c_clean = corridor_id.lower().strip()
    corridors = data.get("corridors", [])
    
    match = None
    for c in corridors:
        if c["corridor_id"] == c_clean or c_clean in c["corridor_id"]:
            match = c
            break
            
    if not match:
        match = corridors[0]  # Default to tkd_jnpt

    return {
        "corridor": match,
        "source": "CONCOR Commercial Rail Tariff & DFCCIL Schedule"
    }

def calculate_concor_freight(
    corridor_id: str = "tkd_jnpt",
    container_size: str = "40ft",
    container_count: int = 1,
    is_empty: bool = False
) -> Dict[str, Any]:
    """
    Computes statutory CONCOR rail haulage charges, Terminal Handling Charges (THC Rail),
    5% concessional GST on rail freight, and environmental carbon savings vs road transit.
    """
    data = _load_master()
    c_clean = corridor_id.lower().strip()
    corridors = data.get("corridors", [])
    
    c = None
    for item in corridors:
        if item["corridor_id"] == c_clean or c_clean in item["corridor_id"]:
            c = item
            break
    if not c:
        c = corridors[0]

    size_key = "40ft" if "40" in container_size else "20ft"
    count = max(1, container_count)
    state_key = "empty" if is_empty else "laden"
    
    # 1. Base Haulage Rate
    rate_key = f"haulage_{size_key}_{state_key}"
    base_rate_per_box = float(c["rates_inr"].get(rate_key, 66800 if size_key == "40ft" else 36500))
    total_haulage_inr = round(base_rate_per_box * count, 2)
    
    # 2. Terminal Handling Charges (THC Rail)
    # 1 x 40ft = 2 TEU; 1 x 20ft = 1 TEU
    teu_multiplier = 2 if size_key == "40ft" else 1
    total_teu = count * teu_multiplier
    thc_per_teu = float(c["rates_inr"].get("thc_rail_per_teu", 2850))
    total_thc_inr = round(thc_per_teu * total_teu, 2)
    
    # 3. Subtotal before GST
    subtotal_inr = round(total_haulage_inr + total_thc_inr, 2)
    
    # 4. GST on Rail Freight: Concessional 5% under Notification No. 11/2017-CT(R)
    rail_gst_inr = round(subtotal_inr * 0.05, 2)
    grand_total_freight_inr = round(subtotal_inr + rail_gst_inr, 2)
    
    # 5. Environmental Carbon Savings
    # Baseline: FEU emissions in kg
    feu_ratio = 1.0 if size_key == "40ft" else 0.5
    emissions_rail_kg = round(c["co2_emissions_kg_per_feu"]["rail_wdfc"] * feu_ratio * count, 1)
    emissions_road_kg = round(c["co2_emissions_kg_per_feu"]["road_truck"] * feu_ratio * count, 1)
    co2_saved_kg = round(emissions_road_kg - emissions_rail_kg, 1)
    co2_savings_pct = round((co2_saved_kg / emissions_road_kg) * 100.0, 1) if emissions_road_kg > 0 else 79.2

    # 6. Transit Time Advantage
    time_saved_hours = round(c["conventional_transit_hours"] - c["wdfc_transit_hours"], 1)

    return {
        "corridor": {
            "corridor_id": c["corridor_id"],
            "origin": c["origin_name"],
            "destination": c["dest_name"],
            "distance_km": c["distance_km"],
            "dfc_available": c["dfc_available"]
        },
        "transit_comparison": {
            "wdfc_high_speed_hours": c["wdfc_transit_hours"],
            "conventional_rail_hours": c["conventional_transit_hours"],
            "road_trucking_hours": c["road_transit_hours"],
            "hours_saved_by_wdfc": time_saved_hours
        },
        "consignment": {
            "container_size": size_key,
            "container_count": count,
            "total_teu": total_teu,
            "status": "Empty Repositioning" if is_empty else "Laden Commercial Cargo"
        },
        "financial_breakdown": {
            "base_haulage_per_container_inr": base_rate_per_box,
            "total_haulage_inr": total_haulage_inr,
            "thc_rail_inr": total_thc_inr,
            "subtotal_pre_tax_inr": subtotal_inr,
            "rail_concessional_gst_5_pct_inr": rail_gst_inr,
            "grand_total_rail_freight_inr": grand_total_freight_inr
        },
        "green_logistics_esg": {
            "rail_emissions_co2_kg": emissions_rail_kg,
            "road_emissions_co2_kg": emissions_road_kg,
            "co2_reduction_kg": co2_saved_kg,
            "carbon_reduction_pct": co2_savings_pct,
            "esg_certificate_ready": True
        },
        "statutory_tariff_basis": "CONCOR Commercial Circular & Railway Board Goods Tariff Part-I"
    }
