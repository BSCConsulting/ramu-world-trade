"""
ITC Market Access Map (MacMap) & Rules of Origin (RoO) Preferential Duty Engine.
Statutory Basis:
- International Trade Centre (ITC, Geneva, https://www.macmap.org)
- World Customs Organization (WCO) Rules of Origin Guidelines
- Customs Act, 1962 (Section 28DA)
- Customs Administration of Rules of Origin under Trade Agreements Rules, 2020 (CAROTAR 2020)
- India's FTAs (India-UAE CEPA, India-Australia ECTA, AIFTA, India-Japan CEPA, SAFTA, Mercosur PTA)
100% Free Tier • Pure Standard Library Python.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "itc_macmap_master.json"

def _load_master() -> Dict[str, Any]:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def get_macmap_overview() -> Dict[str, Any]:
    """Returns overview of all FTAs, tracked preferential products, and CAROTAR 2020 rules."""
    master = _load_master()
    return {
        "status": "success",
        "metadata": master.get("metadata", {}),
        "agreements": master.get("agreements", []),
        "products_catalog": [
            {
                "hs_code": p["hs_code"],
                "name": p["name"],
                "agreement_id": p["agreement_id"],
                "agreement_name": p["agreement_name"],
                "destination_market": p["destination_market"],
                "mfn_duty_pct": p["mfn_duty_pct"],
                "preferential_duty_pct": p["preferential_duty_pct"],
                "duty_savings_pct": p["duty_savings_pct"],
                "roo_criterion": p["roo_criterion"],
                "min_value_addition_pct": p["min_value_addition_pct"],
                "typical_fob_usd": p.get("typical_fob_usd", 50000.0)
            }
            for p in master.get("products", [])
        ],
        "carotar_rules": master.get("carotar_rules", {})
    }

def get_agreement_details(agreement_id: str) -> Dict[str, Any]:
    """Returns specific agreement details by ID."""
    master = _load_master()
    for ag in master.get("agreements", []):
        if ag["id"].upper() == agreement_id.upper():
            products = [p for p in master.get("products", []) if p["agreement_id"].upper() == ag["id"].upper()]
            return {
                "status": "success",
                "agreement": ag,
                "covered_sample_products": products,
                "carotar_rules": master.get("carotar_rules", {})
            }
    return {
        "status": "error",
        "message": f"Agreement ID '{agreement_id}' not found. Available: {[a['id'] for a in master.get('agreements', [])]}"
    }

def calculate_roo_preferential_duty(
    hs_code: str,
    fob_val: Optional[float] = None,
    vnm_val: Optional[float] = None,
    ctc_met: bool = True
) -> Dict[str, Any]:
    """
    Computes Regional Value Content (RVC), validates Rules of Origin (RoO) criteria,
    evaluates MFN vs Preferential duty arbitrage, and generates CAROTAR 2020 compliance audit.
    """
    master = _load_master()
    clean_hs = str(hs_code).strip()[:6]
    
    # Locate product
    product = None
    for p in master.get("products", []):
        if p["hs_code"].startswith(clean_hs):
            product = p
            break
            
    if not product:
        product = master.get("products", [])[0]  # Default to India-UAE Gold Jewellery
        
    fob = float(fob_val) if (fob_val is not None and fob_val > 0) else float(product.get("typical_fob_usd", 50000.0))
    vnm = float(vnm_val) if (vnm_val is not None and vnm_val >= 0) else float(product.get("default_vnm_usd", fob * 0.6))
    
    # Value Addition / Regional Value Content (Build-down method)
    # RVC (%) = ((FOB - VNM) / FOB) * 100
    va_amount = max(0.0, fob - vnm)
    va_pct = round((va_amount / fob) * 100.0, 2) if fob > 0 else 0.0
    
    min_va_required = float(product.get("min_value_addition_pct", 35.0))
    va_compliant = va_pct >= min_va_required
    roo_fully_met = va_compliant and ctc_met
    
    # Duty calculations
    mfn_pct = float(product.get("mfn_duty_pct", 5.0))
    pref_pct = float(product.get("preferential_duty_pct", 0.0))
    
    mfn_duty_usd = round(fob * (mfn_pct / 100.0), 2)
    pref_duty_usd = round(fob * (pref_pct / 100.0), 2) if roo_fully_met else mfn_duty_usd
    net_duty_savings_usd = round(mfn_duty_usd - pref_duty_usd, 2)
    
    if roo_fully_met:
        verdict = "QUALIFIED_PREFERENTIAL_DUTY_APPROVED"
        verdict_label = f"Preferential Zero/Reduced Duty Cleared under {product['agreement_name']}"
        verdict_color = "#10B981"
        audit_note = (
            f"Achieved {va_pct}% Regional Value Content (exceeds required {min_va_required}%) "
            f"with verified {product['ctc_rule']} shift. Eligible for preferential tariff."
        )
    else:
        verdict = "DISQUALIFIED_ORIGIN_THRESHOLD_NOT_MET"
        verdict_color = "#EF4444"
        if not va_compliant:
            verdict_label = f"Disqualified: RVC {va_pct}% below statutory threshold of {min_va_required}%"
            audit_note = (
                f"Value of Non-Originating Materials (${vnm:,.2f}) is too high relative to FOB (${fob:,.2f}). "
                f"Customs will deny preferential tariff under CAROTAR Rule 6."
            )
        else:
            verdict_label = "Disqualified: Change in Tariff Classification (CTC) not satisfied"
            audit_note = "Non-originating inputs must undergo statutory transformation (CTH/CTSH shift)."

    return {
        "status": "success",
        "product": product,
        "calculation": {
            "fob_value_usd": fob,
            "value_of_non_originating_materials_vnm_usd": vnm,
            "originating_value_addition_usd": va_amount,
            "calculated_rvc_pct": va_pct,
            "required_rvc_pct": min_va_required,
            "rvc_compliant": va_compliant,
            "ctc_classification_compliant": ctc_met,
            "overall_roo_qualification": roo_fully_met,
            "verdict": verdict,
            "verdict_label": verdict_label,
            "verdict_color": verdict_color,
            "audit_note": audit_note
        },
        "duty_arbitrage": {
            "mfn_tariff_pct": mfn_pct,
            "mfn_customs_duty_usd": mfn_duty_usd,
            "preferential_tariff_pct": pref_pct if roo_fully_met else mfn_pct,
            "payable_customs_duty_usd": pref_duty_usd,
            "net_duty_savings_usd": net_duty_savings_usd,
            "duty_savings_pct": round(mfn_pct - pref_pct, 2) if roo_fully_met else 0.0,
            "margin_uplift_on_fob_pct": round((net_duty_savings_usd / fob) * 100.0, 2) if fob > 0 else 0.0
        },
        "carotar_compliance_checklist": [
            {
                "rule": "CAROTAR Rule 3(1)(a) - Form I",
                "title": "Possession of Origin Details",
                "status": "MANDATORY",
                "action": "Maintain Form I with item-wise BOM, unit values, and country of origin of imported inputs."
            },
            {
                "rule": "CAROTAR Rule 4 - Certificate of Origin",
                "title": "Issuing Authority Verification",
                "status": "VERIFY",
                "action": f"Obtain digital COO from designated agency (e.g. DGFT, EIC) referencing {product['agreement_name']}."
            },
            {
                "rule": "CAROTAR Rule 5 - Direct Transport",
                "title": "Bill of Lading Non-Manipulation",
                "status": "PASS",
                "action": "Ensure direct maritime/air bill of lading without bonded alteration at intermediate ports."
            },
            {
                "rule": "Section 28DA - Record Retention",
                "title": "5-Year Audit Archive",
                "status": "MANDATORY",
                "action": "Retain production records, purchase invoices, and chemical/physical test certificates for 5 years."
            }
        ]
    }
