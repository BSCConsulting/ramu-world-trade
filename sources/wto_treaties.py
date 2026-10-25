"""
WTO Bound vs Applied Tariffs & DGTR Trade Defense Engine
Statutory Authority: WTO GATT 1994, WTO Anti-Dumping Agreement (ADA Art 9.1), Customs Tariff Act 1975 (Sec 9, 9A, 9B)
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

_WTO_DATA = None

def _load_wto_master() -> Dict[str, Any]:
    global _WTO_DATA
    if _WTO_DATA is None:
        p = Path(__file__).resolve().parent.parent / "data" / "wto_master.json"
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                _WTO_DATA = json.load(f)
        else:
            _WTO_DATA = {"metadata": {}, "tariff_overhang_catalog": {}, "wto_disputes_tracker": []}
    return _WTO_DATA

def get_wto_overview() -> Dict[str, Any]:
    master = _load_wto_master()
    lines_summary = []
    for code, info in master.get("tariff_overhang_catalog", {}).items():
        lines_summary.append({
            "hs_code": code,
            "name": info.get("name"),
            "sector": info.get("sector"),
            "wto_bound_rate_pct": info.get("wto_bound_rate_pct"),
            "applied_mfn_rate_pct": info.get("applied_mfn_rate_pct"),
            "tariff_overhang_pct": info.get("tariff_overhang_pct"),
            "overhang_status": info.get("overhang_status"),
            "affected_countries": info.get("benchmark_trade_defense", {}).get("affected_countries", [])
        })
    return {
        "status": "success",
        "metadata": master.get("metadata", {}),
        "catalog_summary": lines_summary,
        "disputes_tracker": master.get("wto_disputes_tracker", [])
    }

def calculate_trade_defense_remedy(
    hs_code: str = "854143",
    export_price: Optional[float] = None,
    normal_value: Optional[float] = None,
    non_injurious_price: Optional[float] = None,
    landed_value: Optional[float] = None
) -> Dict[str, Any]:
    master = _load_wto_master()
    catalog = master.get("tariff_overhang_catalog", {})
    item = catalog.get(hs_code)
    if not item:
        hs_code = "854143"
        item = catalog.get(hs_code, {})

    td = item.get("benchmark_trade_defense", {})

    # Default fallback values from benchmark
    exp_p = float(export_price if export_price is not None else td.get("export_price_usd_per_watt", td.get("export_price_usd_per_tonne", 100.0)))
    norm_v = float(normal_value if normal_value is not None else td.get("normal_value_usd_per_watt", td.get("normal_value_usd_per_tonne", 150.0)))
    nip = float(non_injurious_price if non_injurious_price is not None else td.get("non_injurious_price_usd_per_watt", td.get("non_injurious_price_usd_per_tonne", 130.0)))
    landed_v = float(landed_value if landed_value is not None else td.get("landed_value_usd_per_watt", td.get("landed_value_usd_per_tonne", 110.0)))

    # Dumping Margin: Normal Value - Export Price
    dumping_margin = max(0.0, norm_v - exp_p)
    dumping_margin_pct = (dumping_margin / exp_p) * 100.0 if exp_p > 0 else 0.0

    # Injury Margin: Non-Injurious Price (NIP) - Landed Value
    injury_margin = max(0.0, nip - landed_v)
    injury_margin_pct = (injury_margin / landed_v) * 100.0 if landed_v > 0 else 0.0

    # Lesser Duty Rule (WTO ADA Article 9.1 & Indian Customs Tariff Act Sec 9A)
    applicable_add = min(dumping_margin, injury_margin)
    is_injury_capped = injury_margin < dumping_margin

    if applicable_add <= 0:
        duty_verdict = "NO_ANTI_DUMPING_DUTY"
        rule_explanation = "Export price is at or above normal value, or landed cost exceeds NIP. No material injury demonstrated under WTO ADA."
    elif is_injury_capped:
        duty_verdict = "INJURY_MARGIN_APPLIED"
        rule_explanation = (
            f"Lesser Duty Rule Applied: Anti-Dumping Duty is capped at the lower Injury Margin ({applicable_add:.2f}), "
            f"which is less than the full Dumping Margin ({dumping_margin:.2f}). Offsets domestic industry injury without excessive protection."
        )
    else:
        duty_verdict = "DUMPING_MARGIN_APPLIED"
        rule_explanation = (
            f"Lesser Duty Rule Applied: Anti-Dumping Duty is capped at the lower Dumping Margin ({applicable_add:.2f}), "
            f"neutralizing price distortion up to fair normal value."
        )

    # Tariff Overhang Formulation
    bound_rate = float(item.get("wto_bound_rate_pct", 0.0))
    applied_rate = float(item.get("applied_mfn_rate_pct", 0.0))
    overhang = bound_rate - applied_rate

    if overhang < 0:
        overhang_status = "NEGATIVE_OVERHANG_DISPUTED"
        overhang_label = "Negative Overhang / WTO Dispute Exposure"
        overhang_color = "#EF4444"
        policy_note = (
            f"Applied duty ({applied_rate}%) exceeds WTO bound rate ({bound_rate}%). "
            f"Subject to multilateral scrutiny (e.g. DS584 ICT Goods Panel). India defends on grounds of technological evolution beyond 1996 ITA-1 scope."
        )
    elif overhang >= 50.0:
        overhang_status = "EXTREME_POLICY_WATER"
        overhang_label = "Massive Sovereign Protection Cushion"
        overhang_color = "#10B981"
        policy_note = (
            f"Extremely high tariff water (+{overhang:.1f}%). India can raise import duties unilaterally up to {bound_rate}% "
            f"under WTO law to protect domestic farmers or manufacturing clusters without international retaliation."
        )
    else:
        overhang_status = "POSITIVE_WATER_MODERATE"
        overhang_label = "Standard Sovereign Policy Cushion"
        overhang_color = "#3B82F6"
        policy_note = (
            f"Comfortable tariff overhang (+{overhang:.1f}%). Applied rate ({applied_rate}%) is safely below WTO bound commitment ({bound_rate}%)."
        )

    return {
        "status": "success",
        "commodity": {
            "hs_code": hs_code,
            "name": item.get("name"),
            "sector": item.get("sector"),
            "wto_bound_rate_pct": bound_rate,
            "applied_mfn_rate_pct": applied_rate,
            "effective_customs_duty_pct": item.get("effective_customs_duty_pct", applied_rate * 1.1),
            "tariff_overhang_pct": round(overhang, 2),
            "overhang_status": overhang_status,
            "overhang_label": overhang_label,
            "overhang_color": overhang_color,
            "wto_concession_note": item.get("wto_concession_note", ""),
            "policy_implication": policy_note
        },
        "trade_defense_remedy": {
            "normal_value": round(norm_v, 2),
            "export_price": round(exp_p, 2),
            "dumping_margin": round(dumping_margin, 2),
            "dumping_margin_pct": round(dumping_margin_pct, 2),
            "non_injurious_price_nip": round(nip, 2),
            "landed_value": round(landed_v, 2),
            "injury_margin": round(injury_margin, 2),
            "injury_margin_pct": round(injury_margin_pct, 2),
            "applicable_anti_dumping_duty": round(applicable_add, 2),
            "duty_verdict": duty_verdict,
            "rule_applied": rule_explanation,
            "investigating_authority": td.get("investigating_authority", "DGTR, Department of Commerce"),
            "affected_countries": td.get("affected_countries", [])
        }
    }

def get_wto_disputes_tracker() -> Dict[str, Any]:
    master = _load_wto_master()
    return {
        "status": "success",
        "disputes": master.get("wto_disputes_tracker", [])
    }
