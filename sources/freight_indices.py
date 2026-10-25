"""
Global Container Freight Benchmarking Engine (Drewry WCI / Baltic FBX Mirror)
Statutory & Commercial Data Source for Indian Maritime Trade Corridors.

Mirrors benchmark spot indices (Drewry WCI, Freightos Baltic FBX, SCFI)
specifically mapped to India's major outbound export lanes, itemizing
fuel/routing surcharges and verifying forwarder quotation integrity.
"""

import json
import os
from typing import Dict, Any, Optional

_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "freight_indices_master.json")
_CACHE = None

def _load_master() -> Dict[str, Any]:
    global _CACHE
    if _CACHE is None:
        try:
            with open(_DATA_PATH, "r", encoding="utf-8") as f:
                _CACHE = json.load(f)
        except Exception:
            _CACHE = {"metadata": {}, "corridors": [], "surcharge_glossary": {}}
    return _CACHE

def get_freight_master() -> Dict[str, Any]:
    """Returns the full master catalog with global indices and corridor benchmarks."""
    return _load_master()

def get_corridor_freight(route_id: str) -> Optional[Dict[str, Any]]:
    """Returns details, routing advisory, and benchmark rates for a specific corridor."""
    master = _load_master()
    route_id_clean = (route_id or "").strip().upper()
    for corridor in master.get("corridors", []):
        if corridor.get("route_id") == route_id_clean:
            return corridor
    return None

def calculate_ocean_freight(
    route_id: str,
    container_size: str = "40ft",
    container_count: int = 1,
    forwarder_quote_usd: float = 0.0
) -> Dict[str, Any]:
    """
    Computes landed ocean freight, itemizes surcharges, and audits forwarder quote.
    """
    master = _load_master()
    cbic_rate = float(master.get("metadata", {}).get("cbic_benchmark_usd_inr", 84.55))
    
    corridor = get_corridor_freight(route_id)
    if not corridor:
        # Fallback to Rotterdam if unknown route
        corridors = master.get("corridors", [])
        corridor = corridors[0] if corridors else {}
        route_id = corridor.get("route_id", "IN_EU_ROTTERDAM")
    
    size_key = "20ft" if "20" in str(container_size) else "40ft"
    count = max(1, min(int(container_count or 1), 500))
    rates = corridor.get("rates", {}).get(size_key, {})
    
    base_ocean_usd = float(rates.get("base_ocean_usd", 0.0))
    baf_usd = float(rates.get("baf_fuel_usd", 0.0))
    cape_usd = float(rates.get("cape_surcharge_usd", 0.0))
    war_risk_usd = float(rates.get("war_risk_usd", 0.0))
    low_sulphur_usd = float(rates.get("low_sulphur_usd", 0.0))
    pss_usd = float(rates.get("peak_season_pss_usd", 0.0))
    origin_thc_usd = float(rates.get("origin_thc_usd", 0.0))
    
    per_container_benchmark_usd = (
        base_ocean_usd + baf_usd + cape_usd + war_risk_usd + low_sulphur_usd + pss_usd + origin_thc_usd
    )
    total_benchmark_usd = round(per_container_benchmark_usd * count, 2)
    total_benchmark_inr = round(total_benchmark_usd * cbic_rate, 2)
    
    # Surcharge itemization for the full consignment
    surcharges_itemized = {
        "bunker_adjustment_baf": {
            "rate_per_unit_usd": baf_usd,
            "total_usd": round(baf_usd * count, 2),
            "description": "Floating fuel index adjustment"
        },
        "cape_of_good_hope_transit": {
            "rate_per_unit_usd": cape_usd,
            "total_usd": round(cape_usd * count, 2),
            "description": "Red Sea detour fuel & extended voyage recovery"
        },
        "war_risk_or_low_sulphur": {
            "rate_per_unit_usd": war_risk_usd if war_risk_usd > 0 else low_sulphur_usd,
            "total_usd": round((war_risk_usd if war_risk_usd > 0 else low_sulphur_usd) * count, 2),
            "description": "Regional maritime insurance or IMO 2020 compliance"
        },
        "peak_season_pss": {
            "rate_per_unit_usd": pss_usd,
            "total_usd": round(pss_usd * count, 2),
            "description": "Seasonal space priority surge"
        },
        "origin_terminal_handling_thc": {
            "rate_per_unit_usd": origin_thc_usd,
            "total_usd": round(origin_thc_usd * count, 2),
            "description": "Origin port quay crane and yard stevedoring"
        }
    }
    
    quote_analysis = None
    if forwarder_quote_usd and float(forwarder_quote_usd) > 0:
        quote_val = float(forwarder_quote_usd)
        diff_usd = quote_val - per_container_benchmark_usd
        diff_pct = (diff_usd / per_container_benchmark_usd) * 100.0 if per_container_benchmark_usd else 0.0
        
        if diff_pct <= 3.0:
            status = "COMPETITIVE"
            rating = "Fair Market Rate (Competitive)"
            recommendation = "Rate is within statutory spot index threshold. Safe to book space."
        elif diff_pct <= 12.0:
            status = "ACCEPTABLE"
            rating = "Moderate Premium (Within Tolerance)"
            recommendation = "Slight markup detected (~{:.1f}%). Request forwarder waive PSS or local documentation fee.".format(diff_pct)
        elif diff_pct <= 25.0:
            status = "ELEVATED"
            rating = "Elevated Quote (Counter-Offer Required)"
            recommendation = "Quote is {:.1f}% above Drewry/FBX spot average. Request counter-offer matching benchmark ${:,.0f}/unit.".format(diff_pct, per_container_benchmark_usd)
        else:
            status = "PREDATORY"
            rating = "Inflated / Predatory Quote"
            recommendation = "Severe markup (+{:.1f}%). Quote contains inflated arbitrary surcharges. Solicit alternate quotation immediately.".format(diff_pct)
            
        quote_analysis = {
            "forwarder_quote_per_unit_usd": quote_val,
            "benchmark_per_unit_usd": per_container_benchmark_usd,
            "variance_usd": round(diff_usd, 2),
            "variance_pct": round(diff_pct, 1),
            "status": status,
            "rating": rating,
            "recommendation": recommendation
        }

    return {
        "corridor": {
            "route_id": corridor.get("route_id"),
            "name": corridor.get("name"),
            "region": corridor.get("region"),
            "origin_ports": corridor.get("origin_ports"),
            "destination_port": corridor.get("destination_port"),
            "nautical_miles": corridor.get("nautical_miles"),
            "active_via_cape": corridor.get("active_via_cape"),
            "transit_days": corridor.get("active_transit_days" if corridor.get("active_via_cape") else "normal_transit_days"),
            "routing_advisory": corridor.get("routing_advisory"),
            "trend_30d_pct": corridor.get("trend_30d_pct"),
            "capacity_status": corridor.get("capacity_status")
        },
        "consignment": {
            "container_size": size_key,
            "container_count": count,
            "total_teu": count * (2 if size_key == "40ft" else 1)
        },
        "financial_summary": {
            "base_ocean_freight_usd": round(base_ocean_usd * count, 2),
            "total_surcharges_usd": round((per_container_benchmark_usd - base_ocean_usd) * count, 2),
            "total_ocean_freight_usd": total_benchmark_usd,
            "cbic_exchange_rate": cbic_rate,
            "total_ocean_freight_inr": total_benchmark_inr
        },
        "surcharges_breakdown": surcharges_itemized,
        "forwarder_quote_verification": quote_analysis,
        "benchmark_metadata": {
            "index_reference": "Drewry WCI & Freightos Baltic FBX Mirror",
            "statutory_scope": "Outbound Maritime Container Cargo From India"
        }
    }
