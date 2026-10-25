"""Indian Ports Association (IPA) & Port Community System (PCS 1x) Engine.
Statutory Authority: Ministry of Ports, Shipping and Waterways (MoPSW),
Indian Ports Association (IPA), and Major Port Authorities Act 2021.
100% Free Tier, zero external pip dependencies.
"""
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "port_logistics_master.json"

def _load_master() -> Dict[str, Any]:
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master file: {MASTER_FILE}")
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_ports_overview() -> Dict[str, Any]:
    """Returns overview of all major and non-major gateway ports and national benchmarks."""
    data = _load_master()
    return {
        "metadata": data.get("metadata"),
        "total_ports": len(data.get("ports", [])),
        "ports": [
            {
                "port_code": p["port_code"],
                "name": p["name"],
                "state": p["state"],
                "coast": p["coast"],
                "type": p["type"],
                "draft_meters": p["draft_meters"],
                "turnaround_time_hours": p["operational_metrics"]["turnaround_time_hours"],
                "congestion_status": p["operational_metrics"]["congestion_status"]
            }
            for p in data.get("ports", [])
        ],
        "pcs_milestones": data.get("pcs_milestones", [])
    }

def get_port_metrics(port_code: str = "INNSA1") -> Optional[Dict[str, Any]]:
    """Returns comprehensive dwell, TRT, crane productivity, and gate-in rules for a port."""
    data = _load_master()
    p_clean = port_code.upper().strip()
    ports = data.get("ports", [])
    
    match = None
    for p in ports:
        if p["port_code"] == p_clean or p_clean in p["name"].upper() or p["name"].upper().startswith(p_clean):
            match = p
            break
            
    if not match:
        match = ports[0]  # Default to Nhava Sheva (INNSA1)

    return {
        "port": match,
        "pcs_milestones": data.get("pcs_milestones", []),
        "source": "Indian Ports Association (IPA) & Port Community System (PCS 1x) Gateway Feed"
    }

def track_vessel_schedule(vessel_name: str = "MAERSK_KAVERI", port_code: str = "INNSA1") -> Dict[str, Any]:
    """Simulates real-time vessel berthing schedule, pilotage, and export gate-in deadlines."""
    port_data = get_port_metrics(port_code)
    p = port_data["port"]
    v_clean = vessel_name.upper().strip() or "MAERSK_KAVERI"

    # Deterministic simulation based on vessel name hash
    v_hash = sum(ord(c) for c in v_clean)
    eta_offset_hours = 6 + (v_hash % 18)
    now = datetime.now()
    eta = now + timedelta(hours=eta_offset_hours)
    cutoff_hours = p["gate_in_rules"]["dry_container_cutoff_hours"]
    gate_cutoff = eta - timedelta(hours=cutoff_hours)
    berthing = eta + timedelta(hours=p["operational_metrics"]["pre_berthing_detention_hours"])
    etd = berthing + timedelta(hours=p["operational_metrics"]["turnaround_time_hours"])

    return {
        "vessel_query": v_clean,
        "assigned_port": {
            "port_code": p["port_code"],
            "port_name": p["name"],
            "terminal": p["terminals"][v_hash % len(p["terminals"])]
        },
        "berthing_timeline": {
            "vessel_eta": eta.strftime("%Y-%m-%d %H:%M IST"),
            "export_gate_cutoff": gate_cutoff.strftime("%Y-%m-%d %H:%M IST"),
            "pre_berthing_anchorage_wait_hours": p["operational_metrics"]["pre_berthing_detention_hours"],
            "expected_berthing": berthing.strftime("%Y-%m-%d %H:%M IST"),
            "expected_departure_etd": etd.strftime("%Y-%m-%d %H:%M IST"),
            "estimated_crane_moves": 1200 + (v_hash % 800)
        },
        "gate_in_advisory": {
            "cutoff_hours_before_berth": cutoff_hours,
            "mandatory_documentation": p["gate_in_rules"]["mandatory_form"],
            "rfid_vgm_cutoff_status": "OPEN (Submit VGM via PCS 1x before cutoff)"
        }
    }

def calculate_demurrage_liability(
    port_code: str = "INNSA1",
    container_size: str = "40ft",
    container_count: int = 2,
    days_in_port: int = 12
) -> Dict[str, Any]:
    """
    Computes port ground storage detention / demurrage charges under
    the Major Port Authorities Act 2021 statutory tariff schedules.
    """
    port_data = get_port_metrics(port_code)
    p = port_data["port"]
    slabs = p.get("demurrage_slabs_per_day_inr", {})
    free_days = slabs.get("free_period_days", 5)
    
    size_key = "40ft" if "40" in container_size else "20ft"
    count = max(1, container_count)
    days = max(1, days_in_port)
    
    chargeable_days = max(0, days - free_days)
    total_cost_inr = 0.0
    breakdown = []

    if chargeable_days > 0:
        # Tier 1: Day 6 to 10 (Up to 5 days)
        tier1_days = min(chargeable_days, 5)
        rate1 = slabs.get(f"day_6_to_10_{size_key}", 3700 if size_key == "40ft" else 1850)
        cost1 = tier1_days * rate1 * count
        total_cost_inr += cost1
        breakdown.append({
            "slab": f"Day {free_days + 1} to Day {free_days + 5}",
            "days": tier1_days,
            "rate_per_day_inr": rate1,
            "subtotal_inr": cost1
        })

        # Tier 2: Day 11 to 20 (Up to 10 days)
        if chargeable_days > 5:
            tier2_days = min(chargeable_days - 5, 10)
            rate2 = slabs.get(f"day_11_to_20_{size_key}", 7200 if size_key == "40ft" else 3600)
            cost2 = tier2_days * rate2 * count
            total_cost_inr += cost2
            breakdown.append({
                "slab": f"Day {free_days + 6} to Day {free_days + 15}",
                "days": tier2_days,
                "rate_per_day_inr": rate2,
                "subtotal_inr": cost2
            })

        # Tier 3: After Day 20
        if chargeable_days > 15:
            tier3_days = chargeable_days - 15
            rate3 = slabs.get(f"after_day_20_{size_key}", 13000 if size_key == "40ft" else 6500)
            cost3 = tier3_days * rate3 * count
            total_cost_inr += cost3
            breakdown.append({
                "slab": f"Day {free_days + 16} onwards",
                "days": tier3_days,
                "rate_per_day_inr": rate3,
                "subtotal_inr": cost3
            })

    # GST on port storage is 18% under HSN 9967
    gst_inr = round(total_cost_inr * 0.18, 2)
    grand_total_inr = round(total_cost_inr + gst_inr, 2)

    return {
        "port_code": p["port_code"],
        "port_name": p["name"],
        "container_params": {
            "size": size_key,
            "quantity": count,
            "total_days_in_port": days,
            "free_period_days": free_days,
            "chargeable_days": chargeable_days
        },
        "breakdown": breakdown,
        "subtotal_storage_inr": round(total_cost_inr, 2),
        "gst_18_pct_inr": gst_inr,
        "grand_total_liability_inr": grand_total_inr,
        "statutory_reference": "Major Port Authorities Act, 2021 & Port Scale of Rates (SOR)"
    }
