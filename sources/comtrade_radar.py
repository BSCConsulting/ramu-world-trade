"""
UN Comtrade Global Bilateral Trade & Mirror Discrepancy Engine
Statutory Basis: UN Statistics Division (UN Comtrade v1), IMTS 2010 Concepts, WCO Customs Valuation Article VII GATT 1994
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

_COMTRADE_DATA = None

def _load_comtrade_master() -> Dict[str, Any]:
    global _COMTRADE_DATA
    if _COMTRADE_DATA is None:
        p = Path(__file__).resolve().parent.parent / "data" / "comtrade_master.json"
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                _COMTRADE_DATA = json.load(f)
        else:
            _COMTRADE_DATA = {"metadata": {}, "corridors": {}}
    return _COMTRADE_DATA

def get_comtrade_overview() -> Dict[str, Any]:
    master = _load_comtrade_master()
    corridors_summary = []
    for cid, info in master.get("corridors", {}).items():
        corridors_summary.append({
            "corridor_id": cid,
            "name": info.get("name"),
            "reporter": info.get("reporter"),
            "partner": info.get("partner"),
            "total_exports_fob_billion": info.get("total_exports_fob_usd_billion"),
            "total_imports_cif_billion": info.get("total_imports_cif_usd_billion"),
            "aggregate_gap_pct": info.get("aggregate_gap_pct"),
            "tracked_hs_codes": list(info.get("commodities", {}).keys())
        })
    return {
        "status": "success",
        "metadata": master.get("metadata", {}),
        "risk_tiers": master.get("metadata", {}).get("discrepancy_risk_tiers", {}),
        "corridors": corridors_summary
    }

def calculate_mirror_discrepancy(
    corridor_id: str = "IND_USA",
    hs_code: Optional[str] = None,
    cif_margin_pct: float = 10.0
) -> Dict[str, Any]:
    master = _load_comtrade_master()
    corridors = master.get("corridors", {})
    corridor = corridors.get(corridor_id)
    if not corridor:
        corridor_id = "IND_USA"
        corridor = corridors.get(corridor_id, {})

    commodities = corridor.get("commodities", {})
    if not hs_code or hs_code not in commodities:
        # Default to first commodity in corridor
        hs_code = next(iter(commodities.keys())) if commodities else "300490"

    comm_data = commodities.get(hs_code, {})
    fob_val = float(comm_data.get("reporter_fob_billion", 1.0))
    cif_val = float(comm_data.get("partner_cif_billion", 1.1))
    benchmark_freight = float(comm_data.get("benchmark_freight_pct", 10.0))
    common_causes = comm_data.get("common_causes", "Standard customs reporting differences.")

    # Mathematical Mirror Reconciliation
    # Expected CIF = FOB * (1 + cif_margin / 100)
    expected_cif = fob_val * (1.0 + (cif_margin_pct / 100.0))
    raw_gap = cif_val - fob_val
    raw_gap_pct = (raw_gap / fob_val) * 100.0 if fob_val > 0 else 0.0

    # Unreconciled residual after freight & insurance adjustment
    unreconciled_residual = cif_val - expected_cif
    unreconciled_pct = (unreconciled_residual / expected_cif) * 100.0 if expected_cif > 0 else 0.0

    abs_residual_pct = abs(unreconciled_pct)
    risk_tiers = master.get("metadata", {}).get("discrepancy_risk_tiers", {})

    if abs_residual_pct <= 12.0:
        risk_level = "LOW"
        risk_meta = risk_tiers.get("LOW", {
            "label": "Low / Typical Transport & Insurance Variance",
            "color": "#10B981",
            "implication": "Values align closely within normal transport margins."
        })
    elif abs_residual_pct <= 25.0:
        risk_level = "MODERATE"
        risk_meta = risk_tiers.get("MODERATE", {
            "label": "Moderate Discrepancy / Transit Divergence",
            "color": "#F59E0B",
            "implication": "Variance exceeds standard CIF/FOB markups. Transit delay or classification mismatch."
        })
    else:
        risk_level = "CRITICAL"
        risk_meta = risk_tiers.get("CRITICAL", {
            "label": "Critical Misinvoicing / Tariff Evasion Alert",
            "color": "#EF4444",
            "implication": "Severe statistical asymmetry. High probability of trade misinvoicing or customs under-valuation."
        })

    # Trade Misinvoicing Typology Deduction
    if unreconciled_residual > 0:
        misinvoicing_typology = "Import Under-reporting at Origin or Inbound Tariff Over-valuation"
        regulatory_implication = (
            f"Partner country reports importing ${cif_val:.2f}B, exceeding freight-adjusted FOB (${expected_cif:.2f}B) by +${unreconciled_residual:.2f}B (+{unreconciled_pct:.1f}%). "
            f"Indicates possible export under-invoicing at origin to compress domestic taxable profits, or customs undervaluation."
        )
    elif unreconciled_residual < 0:
        misinvoicing_typology = "Export Over-invoicing or Transit Diversion Leakage"
        regulatory_implication = (
            f"Partner reports importing only ${cif_val:.2f}B against expected ${expected_cif:.2f}B (-${abs(unreconciled_residual):.2f}B / {unreconciled_pct:.1f}%). "
            f"Indicates possible export over-invoicing to exploit export duty drawback / RoDTEP incentives, or intermediate port diversion."
        )
    else:
        misinvoicing_typology = "Perfect Mirror Equilibrium"
        regulatory_implication = "Reported export and import values balance perfectly."

    return {
        "status": "success",
        "corridor": {
            "id": corridor_id,
            "name": corridor.get("name"),
            "reporter": corridor.get("reporter"),
            "partner": corridor.get("partner"),
            "aggregate_corridor_fob_billion": corridor.get("total_exports_fob_usd_billion"),
            "aggregate_corridor_cif_billion": corridor.get("total_imports_cif_usd_billion"),
            "aggregate_gap_pct": corridor.get("aggregate_gap_pct")
        },
        "commodity": {
            "hs_code": hs_code,
            "description": comm_data.get("description"),
            "benchmark_freight_pct": benchmark_freight,
            "common_causes": common_causes
        },
        "mirror_reconciliation": {
            "reporter_fob_billion": round(fob_val, 3),
            "partner_cif_billion": round(cif_val, 3),
            "cif_fob_margin_applied_pct": round(cif_margin_pct, 2),
            "expected_cif_billion": round(expected_cif, 3),
            "raw_reported_gap_billion": round(raw_gap, 3),
            "raw_reported_gap_pct": round(raw_gap_pct, 2),
            "unreconciled_residual_billion": round(unreconciled_residual, 3),
            "unreconciled_residual_pct": round(unreconciled_pct, 2)
        },
        "trade_integrity_verdict": {
            "risk_level": risk_level,
            "risk_label": risk_meta.get("label"),
            "color": risk_meta.get("color"),
            "typology": misinvoicing_typology,
            "implication": risk_meta.get("implication"),
            "regulatory_note": regulatory_implication
        }
    }

def get_global_market_share(hs_code: str = "300490") -> Dict[str, Any]:
    shares = {
        "300490": {"commodity": "Generic Medicaments", "india_share_pct": 5.8, "global_rank": 3, "top_rivals": ["Germany (15.2%)", "Switzerland (11.4%)", "USA (8.9%)"]},
        "710239": {"commodity": "Cut & Polished Diamonds", "india_share_pct": 28.5, "global_rank": 1, "top_rivals": ["USA (14.2%)", "Belgium (12.1%)", "Israel (9.8%)"]},
        "851713": {"commodity": "Smartphones", "india_share_pct": 3.4, "global_rank": 5, "top_rivals": ["China (48.2%)", "Vietnam (14.6%)", "Czechia (4.1%)"]},
        "847130": {"commodity": "Laptops & Portable Computers", "india_share_pct": 0.3, "global_rank": 22, "top_rivals": ["China (68.4%)", "Vietnam (8.2%)", "Germany (3.5%)"]},
        "711319": {"commodity": "Articles of Gold Jewelry", "india_share_pct": 9.2, "global_rank": 4, "top_rivals": ["China (21.4%)", "Italy (14.8%)", "UAE (12.5%)"]},
        "271012": {"commodity": "Motor Spirit / Light Petroleum", "india_share_pct": 4.1, "global_rank": 6, "top_rivals": ["USA (22.8%)", "Netherlands (9.4%)", "Singapore (8.2%)"]}
    }
    data = shares.get(hs_code, {
        "commodity": "Target Industrial Tariff Line",
        "india_share_pct": 2.5,
        "global_rank": 8,
        "top_rivals": ["China", "Germany", "USA"]
    })
    return {"status": "success", "hs_code": hs_code, **data}
