"""
MPEDA Marine Products Export Development Authority Engine
Statutory Authority: MPEDA Act, 1972 (Ministry of Commerce & Industry, GoI)
Regulation: EU IUU Catch Documentation (EC 1005/2008), US NOAA SIMP, US Section 609 TED Form DS-2031
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional

_MPEDA_DATA = None

def _load_mpeda_master() -> Dict[str, Any]:
    global _MPEDA_DATA
    if _MPEDA_DATA is None:
        p = Path(__file__).resolve().parent.parent / "data" / "mpeda_master.json"
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                _MPEDA_DATA = json.load(f)
        else:
            _MPEDA_DATA = {"metadata": {}, "species_catalog": {}, "statutory_schemes": {}}
    return _MPEDA_DATA

def get_mpeda_overview() -> Dict[str, Any]:
    master = _load_mpeda_master()
    species_list = []
    for code, info in master.get("species_catalog", {}).items():
        species_list.append({
            "hs_code": code,
            "name": info.get("name"),
            "scientific_name": info.get("scientific_name"),
            "harvest_type": info.get("harvest_type"),
            "share_pct": info.get("share_pct"),
            "primary_landing_regions": info.get("primary_landing_regions", []),
            "ted_exemption_required": info.get("ted_exemption_ds2031_required", False),
            "eu_50pct_testing": info.get("eu_50pct_testing_regime", False),
            "simp_priority": info.get("simp_priority_species", False)
        })
    return {
        "status": "success",
        "metadata": master.get("metadata", {}),
        "rcmc_guidelines": master.get("metadata", {}).get("rcmc_guidelines", {}),
        "species_catalog": species_list,
        "statutory_schemes": master.get("statutory_schemes", {})
    }

def audit_marine_compliance(
    species_code: str,
    target_market: str = "EU",
    lab_test_results: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    master = _load_mpeda_master()
    species = master.get("species_catalog", {}).get(species_code)
    if not species:
        # Fallback to default Vannamei Shrimp
        species_code = "03061720"
        species = master.get("species_catalog", {}).get(species_code, {})

    target_market = (target_market or "EU").upper()
    market_info = species.get("market_mrls", {}).get(target_market)
    if not market_info:
        target_market = "EU"
        market_info = species.get("market_mrls", {}).get("EU", {})

    limits = market_info.get("limits", {})
    default_lab_vals = species.get("standard_lab_residues", {})

    user_tests = lab_test_results or {}
    chemical_ledger = []
    fail_count = 0
    pass_count = 0

    chem_display_names = {
        "chloramphenicol": "Chloramphenicol (Banned Antibiotic)",
        "nitrofuran_aoz": "Nitrofuran Metabolite (AOZ / Furazolidone)",
        "cadmium": "Cadmium (Cd Heavy Metal)",
        "histamine": "Histamine (Scombrotoxin)"
    }

    for chem_key, limit_meta in limits.items():
        mrl_val = limit_meta.get("mrl", 0.0)
        unit = limit_meta.get("unit", "ppb")
        limit_type = limit_meta.get("type", "Statutory MRL")

        # Determine tested value: from user override, or standard lab default
        if chem_key in user_tests:
            tested_val = float(user_tests[chem_key])
        else:
            tested_val = float(default_lab_vals.get(chem_key, 0.0))

        is_compliant = tested_val <= mrl_val
        if is_compliant:
            pass_count += 1
            status = "PASS"
            guidance = f"Compliant with {target_market} food safety tolerances. Below statutory action threshold."
        else:
            fail_count += 1
            status = "FAIL"
            exceed_pct = ((tested_val - mrl_val) / mrl_val) * 100 if mrl_val > 0 else 100.0
            if "chloramphenicol" in chem_key or "nitrofuran" in chem_key:
                guidance = (
                    f"CRITICAL VIOLATION: Exceeds {limit_type} by +{exceed_pct:.1f}%. "
                    f"Zero-tolerance pharmacologically active substance. Consignment subject to mandatory seizure/destruction at destination port."
                )
            else:
                guidance = (
                    f"Exceeds statutory {limit_type} by +{exceed_pct:.1f}%. "
                    f"Cold chain or processing defect. Batch cannot receive EIC Export Health Certificate."
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
        "USA": "United States (US FDA / NOAA)",
        "CHN": "China (GACC)",
        "JPN": "Japan (MHLW)"
    }
    mkt_full_name = market_names.get(target_market, target_market)

    if is_overall_pass:
        verdict_status = "PASS"
        verdict_title = "COMPLIANT - READY FOR MPEDA & EIC CERTIFICATION"
        verdict_color = "#10B981"
        verdict_summary = f"All tested residues are within {mkt_full_name} statutory limits. Eligible for official Export Health Certificate."
    else:
        verdict_status = "FAIL"
        verdict_title = "REJECTED - STATUTORY CONTAMINANT / ANTIBIOTIC DETECTED"
        verdict_color = "#EF4444"
        verdict_summary = f"{fail_count} compound(s) exceed maximum statutory tolerances for {mkt_full_name}. Consignment cannot be exported."

    # Documentation Protocol Logic
    doc_requirements = []
    harvest_type = species.get("harvest_type", "Aquaculture")

    if harvest_type == "Aquaculture":
        doc_requirements.append({
            "title": "EIC Aquaculture Health Certificate",
            "statutory_basis": "Export of Fresh, Frozen and Processed Fish and Fishery Products (QCI & M) Rules 1995",
            "detail": "Mandatory pre-shipment laboratory analysis from EIC / EIA approved lab for Nitrofurans and Chloramphenicol.",
            "status": "MANDATORY"
        })
        doc_requirements.append({
            "title": "NaCSA / CAA Farm Registration ID",
            "statutory_basis": "Coastal Aquaculture Authority Act, 2005 & MPEDA Guidelines",
            "detail": "Proof of seed sourcing from registered hatchery, antibiotic-free farm management logs.",
            "status": "MANDATORY"
        })
        if target_market == "USA":
            doc_requirements.append({
                "title": "US Form DS-2031 (TED Exemption Box 7B)",
                "statutory_basis": "Section 609 Public Law 101-162 / US State Dept",
                "detail": "Certifies shrimp was harvested in aquaculture facilities, legally bypassing the US wild-harvest turtle excluder embargo.",
                "status": "CRITICAL MANDATORY FOR US ENTRY"
            })
            doc_requirements.append({
                "title": "NOAA SIMP Traceability Records",
                "statutory_basis": "Magnuson-Stevens Act / 50 CFR Part 300 Subpart Q",
                "detail": "Farm pond harvest date, hatchery source, feed log, processor handling, and bill of lading audit trail.",
                "status": "MANDATORY"
            })
        elif target_market == "EU":
            doc_requirements.append({
                "title": "EU 50% Random BIP Testing Protocol",
                "statutory_basis": "Commission Implementing Decision (EU) 2016/1774",
                "detail": "Strict border testing regime. Exporter bears cost of demurrage & lab detention during 72-96h EU BIP clearance.",
                "status": "BORDER SCRUTINY NOTICE"
            })
    else:
        # Marine Wild-Caught Fisheries
        if target_market == "EU":
            doc_requirements.append({
                "title": "EU Catch Certificate (IUU Regulation)",
                "statutory_basis": "Council Regulation (EC) No 1005/2008 / MPEDA e-Catch",
                "detail": "Validated by MPEDA Assistant Director. Includes fishing vessel registration number, gear type, landing port, and log sheet.",
                "status": "MANDATORY PRE-SHIPMENT"
            })
        doc_requirements.append({
            "title": "Vessel Marine Products Registration Certificate (MPRC)",
            "statutory_basis": "MPEDA Act 1972 Section 9",
            "detail": "Valid fishing vessel license issued by State Fisheries Department & MPEDA enrollment.",
            "status": "MANDATORY"
        })
        doc_requirements.append({
            "title": "Cold Chain & Histamine Time-Temperature Log",
            "statutory_basis": "FSSAI Food Safety Standards & EIC HACCP Schedule",
            "detail": "Core fish temperature maintained below -18°C from harvest vessel icing to blast freezing.",
            "status": "MANDATORY"
        })

    return {
        "status": "success",
        "species": {
            "hs_code": species_code,
            "name": species.get("name"),
            "scientific_name": species.get("scientific_name"),
            "harvest_type": species.get("harvest_type"),
            "share_pct": species.get("share_pct"),
            "primary_landing_regions": species.get("primary_landing_regions", [])
        },
        "target_market": {
            "code": target_market,
            "name": mkt_full_name,
            "stance": market_info.get("stance"),
            "testing_intensity": market_info.get("testing_intensity"),
            "catch_doc_required": market_info.get("catch_doc_required")
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

def get_catch_documentation_guide(species_code: str, target_market: str = "EU", harvest_type: str = "Aquaculture") -> Dict[str, Any]:
    master = _load_mpeda_master()
    schemes = master.get("statutory_schemes", {})
    return {
        "status": "success",
        "species_code": species_code,
        "target_market": target_market,
        "schemes": schemes
    }
