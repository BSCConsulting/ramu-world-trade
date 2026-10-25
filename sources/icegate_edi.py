"""ICEGATE EDI Systems & Customs Document Tracking Engine.
Statutory Basis: Customs Act, 1962 (Section 46 Bill of Entry, Section 50 Shipping Bill,
Section 51 Let Export Order, Section 47 Out of Charge) & ICEGATE 2.0 Advisory Framework.
100% Free Tier, zero external pip dependencies.
"""
import json
import re
import datetime
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "icegate_master.json"

def _load_master() -> Dict[str, Any]:
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master file: {MASTER_FILE}")
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_icegate_overview() -> Dict[str, Any]:
    """Returns ICEGATE system summary, error catalog stats, and major customs ports."""
    data = _load_master()
    return {
        "metadata": data.get("metadata"),
        "error_codes_count": len(data.get("error_codes", {})),
        "customs_ports_count": len(data.get("customs_ports", [])),
        "error_codes": data.get("error_codes", {}),
        "customs_ports": data.get("customs_ports", []),
        "lifecycles": data.get("document_lifecycles", {})
    }

def lookup_error_code(code: str) -> Optional[Dict[str, Any]]:
    """Looks up a specific ICEGATE error code (e.g., SB001, SB002, ERR-301)."""
    data = _load_master()
    code_clean = code.strip().upper()
    return data.get("error_codes", {}).get(code_clean)

def search_ports(query: str = "") -> List[Dict[str, Any]]:
    """Searches customs port directory by code, name, or state."""
    data = _load_master()
    ports = data.get("customs_ports", [])
    if not query:
        return ports
    q = query.strip().lower()
    return [
        p for p in ports
        if q in p.get("port_code", "").lower()
        or q in p.get("port_name", "").lower()
        or q in p.get("state", "").lower()
        or q in p.get("specialization", "").lower()
    ]

def track_customs_document(doc_type: str, doc_number: str, port_code: str) -> Dict[str, Any]:
    """
    Validates and simulates live EDI status tracking for a Shipping Bill or Bill of Entry.
    Deterministic based on hash of doc_number and port_code for testing consistency.
    """
    data = _load_master()
    clean_type = "shipping_bill" if "ship" in doc_type.lower() or "sb" in doc_type.lower() else "bill_of_entry"
    clean_num = re.sub(r"[^0-9A-Za-z]", "", doc_number.strip().upper())
    clean_port = port_code.strip().upper()
    
    # Port validation
    all_ports = {p["port_code"]: p for p in data.get("customs_ports", [])}
    port_meta = all_ports.get(clean_port, {
        "port_code": clean_port,
        "port_name": f"Customs Port {clean_port}",
        "type": "Customs Location",
        "state": "India",
        "edi_enabled": True
    })
    
    lifecycles = data.get("document_lifecycles", {}).get(clean_type, [])
    if not clean_num:
        clean_num = "7492104"
        
    # Deterministic simulation seed based on doc_number
    h = int(hashlib.md5(f"{clean_type}:{clean_num}:{clean_port}".encode('utf-8')).hexdigest(), 16)
    stage_idx = (h % len(lifecycles))  # Deterministic step between 0 and last step
    
    timeline = []
    base_date = datetime.date.today() - datetime.timedelta(days=len(lifecycles) - stage_idx)
    
    for i, step in enumerate(lifecycles):
        is_completed = i <= stage_idx
        is_current = i == stage_idx
        step_date = base_date + datetime.timedelta(days=i)
        
        timeline.append({
            "step": step["step"],
            "code": step["code"],
            "name": step["name"],
            "description": step["description"],
            "status": "CURRENT" if is_current else ("COMPLETED" if is_completed else "PENDING"),
            "timestamp": f"{step_date.strftime('%Y-%m-%d')} 11:30:00 IST" if is_completed else None
        })
        
    current_step = lifecycles[stage_idx]
    
    # Check if there is an error flag simulated (e.g. 20% probability for demo)
    has_error = (h % 5 == 0) and stage_idx < len(lifecycles) - 1
    error_detail = None
    if has_error:
        err_keys = list(data.get("error_codes", {}).keys())
        chosen_err = err_keys[(h % (len(err_keys) - 1)) + 1] # exclude SB000
        error_detail = data["error_codes"][chosen_err]

    return {
        "query": {
            "doc_type": "Shipping Bill (Export)" if clean_type == "shipping_bill" else "Bill of Entry (Import)",
            "doc_number": clean_num,
            "port_code": clean_port,
            "port_name": port_meta.get("port_name")
        },
        "status": "ON_HOLD" if has_error else ("CLEARED" if stage_idx == len(lifecycles) - 1 else "PROCESSING"),
        "current_milestone": current_step["name"],
        "current_milestone_code": current_step["code"],
        "current_description": current_step["description"],
        "has_edi_error": has_error,
        "active_error": error_detail,
        "port_details": port_meta,
        "lifecycle_timeline": timeline,
        "last_updated": f"{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')} IST"
    }
