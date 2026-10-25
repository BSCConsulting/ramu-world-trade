"""
Spices Board & Tea Board Quality Gateway Engine
Statutory Authority: Spices Board Act, 1986 & Tea Act, 1953 (Ministry of Commerce & Industry, GoI)
Regulation: Mandatory Pre-Shipment Testing (MPST), EU RASFF EtO Alerts, Tea Board CQC & Darjeeling GI
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

_SPICES_TEA_DATA = None

def _load_spices_tea_master() -> Dict[str, Any]:
    global _SPICES_TEA_DATA
    if _SPICES_TEA_DATA is None:
        p = Path(__file__).resolve().parent.parent / "data" / "spices_tea_master.json"
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                _SPICES_TEA_DATA = json.load(f)
        else:
            _SPICES_TEA_DATA = {"metadata": {}, "commodity_catalog": {}}
    return _SPICES_TEA_DATA

def get_spices_tea_overview() -> Dict[str, Any]:
    master = _load_spices_tea_master()
    commodities = []
    for code, info in master.get("commodity_catalog", {}).items():
        commodities.append({
            "hs_code": code,
            "name": info.get("name"),
            "botanical_name": info.get("botanical_name"),
            "category": info.get("category"),
            "share_pct": info.get("share_pct"),
            "primary_growing_clusters": info.get("primary_growing_clusters", []),
            "mpst_mandatory": info.get("mpst_mandatory", True)
        })
    return {
        "status": "success",
        "metadata": master.get("metadata", {}),
        "spices_board": master.get("metadata", {}).get("spices_board", {}),
        "tea_board": master.get("metadata", {}).get("tea_board", {}),
        "commodity_catalog": commodities
    }

def audit_spices_tea_compliance(
    commodity_code: str,
    target_market: str = "EU",
    lab_test_results: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    master = _load_spices_tea_master()
    catalog = master.get("commodity_catalog", {})
    item = catalog.get(commodity_code)
    if not item:
        commodity_code = "09042110"
        item = catalog.get(commodity_code, {})

    target_market = (target_market or "EU").upper()
    market_info = item.get("market_mrls", {}).get(target_market)
    if not market_info:
        target_market = "EU"
        market_info = item.get("market_mrls", {}).get("EU", {})

    limits = market_info.get("limits", {})
    default_lab_vals = item.get("standard_lab_residues", {})
    user_tests = lab_test_results or {}

    chemical_ledger = []
    fail_count = 0
    pass_count = 0

    chem_display_names = {
        "aflatoxin_total": "Total Aflatoxins (B1 + B2 + G1 + G2)",
        "aflatoxin_b1": "Aflatoxin B1 (Carcinogenic Mycotoxin)",
        "sudan_dyes": "Sudan Dyes (Sudan I, II, III, IV / Para Red)",
        "ethylene_oxide": "Ethylene Oxide (EtO Sterilization Residue)",
        "lead_chromate": "Lead Chromate (PbCrO4 Toxic Dye Adulterant)",
        "mineral_oil": "Mineral Oil Glaze (Hydrocarbon Glaze Adulterant)",
        "curcumin_content": "Curcumin Active Potency (% Bioactive Marker)",
        "piperine_content": "Piperine Active Pungency (% Bioactive Marker)",
        "anthraquinone": "Anthraquinone (Thermal Drying Combustion Residue)",
        "clothianidin": "Clothianidin (Neonicotinoid Insecticide)",
        "iron_filings": "Iron Filings (Machinery Wear Contaminant)",
        "copper": "Copper (Cu Heavy Metal Residue)",
        "acetamiprid": "Acetamiprid (Neonicotinoid Residue)",
        "profenofos": "Profenofos (Organophosphate Insecticide)",
        "triazophos": "Triazophos (Organophosphate Insecticide)",
        "chlorpyrifos": "Chlorpyrifos (Organophosphate Pesticide)"
    }

    # Minimum threshold keys where higher value is desirable (quality metrics)
    min_threshold_keys = {"curcumin_content", "piperine_content"}

    for chem_key, limit_meta in limits.items():
        mrl_val = limit_meta.get("mrl", 0.0)
        unit = limit_meta.get("unit", "ppb")
        limit_type = limit_meta.get("type", "Statutory Threshold")

        if chem_key in user_tests:
            tested_val = float(user_tests[chem_key])
        else:
            tested_val = float(default_lab_vals.get(chem_key, 0.0))

        if chem_key in min_threshold_keys:
            # Quality parameter: tested must be >= mrl_val
            is_compliant = tested_val >= mrl_val
            if is_compliant:
                pass_count += 1
                status = "PASS"
                guidance = f"Exceeds minimum export grade threshold ({mrl_val}{unit}). High bioactive potency."
            else:
                fail_count += 1
                status = "FAIL"
                guidance = f"Sub-standard quality! Tested {tested_val}{unit} is below mandatory minimum of {mrl_val}{unit}. Downgraded batch."
        else:
            # Contaminant / Residue: tested must be <= mrl_val
            is_compliant = tested_val <= mrl_val
            if is_compliant:
                pass_count += 1
                status = "PASS"
                guidance = f"Compliant with {target_market} food safety statutory limits. Below maximum threshold."
            else:
                fail_count += 1
                status = "FAIL"
                exceed_pct = ((tested_val - mrl_val) / mrl_val) * 100 if mrl_val > 0 else 100.0
                if "sudan" in chem_key or "lead_chromate" in chem_key or "mineral_oil" in chem_key:
                    guidance = (
                        f"CRITICAL ADULTERATION: Tested {tested_val} {unit} violates strict zero-tolerance. "
                        f"Consignment prohibited from export; liable for statutory confiscation under Spices Board Act."
                    )
                elif "aflatoxin" in chem_key:
                    guidance = (
                        f"Mycotoxin contamination exceeds statutory {limit_type} by +{exceed_pct:.1f}%. "
                        f"Pre-shipment batch re-conditioning or sorting required. Cannot receive QEL Export Certificate."
                    )
                else:
                    guidance = (
                        f"Exceeds statutory {limit_type} by +{exceed_pct:.1f}%. "
                        f"Non-compliant chemical residue level. RASFF alert trigger."
                    )

        chemical_ledger.append({
            "chemical": chem_display_names.get(chem_key, chem_key.title()),
            "chemical_key": chem_key,
            "tested_value": tested_val,
            "statutory_mrl": mrl_val,
            "unit": unit,
            "limit_type": limit_type,
            "status": status,
            "action_guidance": guidance
        })

    is_overall_pass = fail_count == 0
    market_names = {
        "EU": "European Union (EU)",
        "USA": "United States (US FDA / ASTA)",
        "UK": "United Kingdom (UK FSA / HSE)",
        "JPN": "Japan (MHLW Positive List)"
    }
    mkt_full_name = market_names.get(target_market, target_market)

    if is_overall_pass:
        verdict_status = "PASS"
        verdict_title = "COMPLIANT - READY FOR STATUTORY BOARD CERTIFICATION"
        verdict_color = "#10B981"
        verdict_summary = f"All tested residues and quality markers comply with {mkt_full_name} statutory tolerances. Eligible for Export Certificate."
    else:
        verdict_status = "FAIL"
        verdict_title = "REJECTED - STATUTORY CONTAMINANT / ADULTERANT DETECTED"
        verdict_color = "#EF4444"
        verdict_summary = f"{fail_count} analyte(s) fail {mkt_full_name} statutory specifications. Export clearance withheld."

    # Documentation Requirements
    doc_requirements = []
    category = item.get("category", "Spices")

    if category == "Spices":
        doc_requirements.append({
            "title": "Spices Board CRES Registration",
            "statutory_basis": "Section 11, Spices Board Act 1986",
            "detail": "Mandatory Certificate of Registration as Exporter of Spices. Valid for 3 years.",
            "status": "MANDATORY STATUTORY REGISTRATION"
        })
        doc_requirements.append({
            "title": "Spices Board QEL Analytical Health Certificate",
            "statutory_basis": "Mandatory Pre-Shipment Testing (MPST) Notification",
            "detail": "Batch analysis report from accredited Quality Evaluation Laboratory for Aflatoxin, Sudan Dye, and EtO.",
            "status": "MANDATORY PRE-SHIPMENT"
        })
        if "09042110" in commodity_code: # Chilli
            doc_requirements.append({
                "title": "Sudan Dye I-IV Non-Detection Certificate",
                "statutory_basis": "Commission Decision 2005/402/EC on Sudan Red Adulteration",
                "detail": "HPLC / LC-MS/MS verification proving 100% absence of synthetic azo dyes.",
                "status": "CRITICAL ZERO-TOLERANCE"
            })
    else: # Tea
        doc_requirements.append({
            "title": "Tea Board Exporter License & Warehouse Registration",
            "statutory_basis": "Tea (Distribution & Export) Control Order, 2005",
            "detail": "Permanent exporter registration issued by Tea Board India, Kolkata.",
            "status": "MANDATORY STATUTORY REGISTRATION"
        })
        doc_requirements.append({
            "title": "Tea Board Comprehensive Quality Certificate (CQC)",
            "statutory_basis": "Tea Board Export Quality Notification",
            "detail": "Verifies maximum iron filings < 250 mg/kg, pesticide MRLs, and authentic moisture profile.",
            "status": "MANDATORY PRE-SHIPMENT"
        })
        if "09024020" in commodity_code: # Darjeeling Tea
            doc_requirements.append({
                "title": "100% Darjeeling GI Authentication License",
                "statutory_basis": "Geographical Indications Act, 1999 & Tea Board GI Regulations",
                "detail": "Mandatory verification confirming 100% orthodox tea plucked from 87 certified Darjeeling gardens. Forbids blending.",
                "status": "GI INTELLECTUAL PROPERTY SHIELD"
            })

    return {
        "status": "success",
        "commodity": {
            "hs_code": commodity_code,
            "name": item.get("name"),
            "botanical_name": item.get("botanical_name"),
            "category": item.get("category"),
            "share_pct": item.get("share_pct"),
            "primary_growing_clusters": item.get("primary_growing_clusters", [])
        },
        "target_market": {
            "code": target_market,
            "name": mkt_full_name,
            "stance": market_info.get("stance"),
            "testing_intensity": market_info.get("testing_intensity"),
            "mandatory_clearance": market_info.get("mandatory_clearance")
        },
        "overall_verdict": {
            "status": verdict_status,
            "verdict_title": verdict_title,
            "color": verdict_color,
            "summary": verdict_summary,
            "fail_count": fail_count,
            "pass_count": pass_count
        },
        "chemical_audit_ledger": chemical_ledger,
        "documentation_requirements": doc_requirements
    }

def get_qel_lab_routing(commodity_code: str, exporter_state: str = "Andhra Pradesh") -> Dict[str, Any]:
    master = _load_spices_tea_master()
    labs = master.get("metadata", {}).get("spices_board", {}).get("qel_laboratories", [])
    
    state_to_lab = {
        "andhra pradesh": "Guntur",
        "telangana": "Guntur",
        "kerala": "Kochi",
        "karnataka": "Kochi",
        "tamil nadu": "Tuticorin",
        "maharashtra": "Mumbai",
        "gujarat": "Kandla",
        "rajasthan": "Kandla",
        "delhi": "Narela (Delhi)",
        "punjab": "Narela (Delhi)",
        "haryana": "Narela (Delhi)",
        "west bengal": "Kolkata"
    }
    
    assigned_city = state_to_lab.get(exporter_state.lower().strip(), "Kochi")
    assigned_lab = next((lab for lab in labs if lab.get("city") == assigned_city), labs[0] if labs else {})
    
    return {
        "status": "success",
        "exporter_state": exporter_state,
        "assigned_laboratory": assigned_lab,
        "all_qel_labs": labs
    }
