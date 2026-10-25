"""DGCI&S TradeStat & NIRYAT Macro Trade Intelligence Client.
Official Statutory Source: Directorate General of Commercial Intelligence and Statistics (DGCI&S),
Ministry of Commerce & Industry, Government of India.
Provides verified macro merchandise trade flows, partner bilateral matrices,
principal commodities rankings, and seaport/air cargo dwell metrics.
100% Free Tier, zero external pip dependencies.
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "dgcis_tradestat_master.json"

def _load_master() -> Dict[str, Any]:
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master file: {MASTER_FILE}")
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_tradestat_overview() -> Dict[str, Any]:
    """Returns high-level DGCI&S macro merchandise trade summary."""
    data = _load_master()
    latest_fy = "FY2023-24"
    fy_totals = data.get("macro_totals", {}).get(latest_fy, {})
    services_totals = data.get("services_trade", {}).get(latest_fy, {})
    
    return {
        "metadata": data.get("metadata"),
        "reporting_period": latest_fy,
        "merchandise_trade": fy_totals,
        "services_trade": services_totals,
        "top_export_commodities": data.get("top_export_commodities", [])[:5],
        "top_import_commodities": data.get("top_import_commodities", [])[:5],
        "top_export_partners": data.get("top_partners", {}).get("exports", [])[:5],
        "top_import_partners": data.get("top_partners", {}).get("imports", [])[:5],
        "major_ports": data.get("port_cargo_traffic", [])
    }

def get_partner_profile(country_query: str) -> Dict[str, Any]:
    """Fetches bilateral merchandise trade profile with a partner country."""
    data = _load_master()
    q = country_query.lower().strip()
    
    # Normalize aliases
    alias_map = {
        "us": "usa", "united states": "usa", "america": "usa",
        "uae": "uae", "united arab emirates": "uae", "dubai": "uae",
        "uk": "united kingdom", "britain": "united kingdom", "england": "united kingdom",
        "saudi": "saudi arabia", "ksa": "saudi arabia",
        "china": "china", "prc": "china",
        "russia": "russia", "rf": "russia",
        "germany": "germany", "deutschland": "germany",
        "netherlands": "netherlands", "holland": "netherlands"
    }
    target = alias_map.get(q, q)
    
    exports_list = data.get("top_partners", {}).get("exports", [])
    imports_list = data.get("top_partners", {}).get("imports", [])
    
    ex_match = next((c for c in exports_list if target in c["country"].lower()), None)
    im_match = next((c for c in imports_list if target in c["country"].lower()), None)
    
    mirror_bench = data.get("mirror_benchmarks", {})
    mirror_match = next((v for k, v in mirror_bench.items() if target in k.lower()), None)
    
    ex_val = ex_match["value_usd_billion"] if ex_match else 0.0
    im_val = im_match["value_usd_billion"] if im_match else 0.0
    balance = round(ex_val - im_val, 2)
    
    country_display = (ex_match or im_match or {}).get("country", country_query.title())
    
    return {
        "country": country_display,
        "reporting_fy": "FY2023-24",
        "exports_fob_usd_billion": ex_val,
        "export_rank": ex_match.get("rank") if ex_match else None,
        "export_share_pct": ex_match.get("share_pct") if ex_match else None,
        "imports_cif_usd_billion": im_val,
        "import_rank": im_match.get("rank") if im_match else None,
        "import_share_pct": im_match.get("share_pct") if im_match else None,
        "bilateral_trade_volume_usd_billion": round(ex_val + im_val, 2),
        "trade_balance_usd_billion": balance,
        "status": "TRADE SURPLUS" if balance > 0 else "TRADE DEFICIT",
        "mirror_reconciliation": mirror_match,
        "source": "DGCI&S TradeStat / NIRYAT / UN Comtrade"
    }

def get_port_profile(port_query: str) -> Optional[Dict[str, Any]]:
    """Finds port dwell time, TEU volume, and direct port delivery stats."""
    data = _load_master()
    q = port_query.lower().strip()
    
    for port in data.get("port_cargo_traffic", []):
        if q in port["name"].lower() or q in port["port_code"].lower() or q in port["state"].lower():
            return port
    return None

BILATERAL_ALIAS_MAP = {
    "us": "USA", "usa": "USA", "united states": "USA", "america": "USA",
    "uae": "UAE", "united arab emirates": "UAE", "dubai": "UAE",
    "uk": "United Kingdom", "united kingdom": "United Kingdom", "britain": "United Kingdom", "england": "United Kingdom", "gbr": "United Kingdom",
    "saudi": "Saudi Arabia", "ksa": "Saudi Arabia", "saudi arabia": "Saudi Arabia", "sau": "Saudi Arabia",
    "china": "China", "prc": "China", "chn": "China",
    "russia": "Russia", "rf": "Russia", "rus": "Russia",
    "germany": "Germany", "deutschland": "Germany", "deu": "Germany",
    "netherlands": "Netherlands", "holland": "Netherlands", "nld": "Netherlands",
    "singapore": "Singapore", "sgp": "Singapore"
}

def get_deficit_rankings() -> Dict[str, Any]:
    """Returns sorted bilateral trade balances categorised into surplus engines and structural deficit corridors."""
    data = _load_master()
    matrix = data.get("bilateral_matrix", {})
    all_partners = list(matrix.values())
    
    surplus = sorted([p for p in all_partners if p.get("trade_balance_usd_billion", 0) > 0],
                     key=lambda x: x.get("trade_balance_usd_billion", 0), reverse=True)
    deficit = sorted([p for p in all_partners if p.get("trade_balance_usd_billion", 0) <= 0],
                     key=lambda x: x.get("trade_balance_usd_billion", 0))
    
    total_surplus = round(sum(p.get("trade_balance_usd_billion", 0) for p in surplus), 2)
    total_deficit = round(sum(p.get("trade_balance_usd_billion", 0) for p in deficit), 2)
    
    return {
        "status": "success",
        "reporting_period": "FY2023-24",
        "source": "DGCI&S Tradestat / NIRYAT Bilateral Principal Commodity System",
        "total_tracked_surplus_usd_billion": total_surplus,
        "total_tracked_deficit_usd_billion": total_deficit,
        "net_bilateral_balance_usd_billion": round(total_surplus + total_deficit, 2),
        "surplus_corridors": surplus,
        "deficit_corridors": deficit,
        "all_partners": all_partners
    }

def get_bilateral_matrix(country_query: Optional[str] = None) -> Dict[str, Any]:
    """Fetches disaggregated principal commodity bilateral matrix for a specific country or returns deficit overview."""
    data = _load_master()
    matrix = data.get("bilateral_matrix", {})
    if not country_query:
        return get_deficit_rankings()
    
    q = country_query.strip().lower()
    target_key = BILATERAL_ALIAS_MAP.get(q, country_query.strip())
    
    for k, v in matrix.items():
        if (k.lower() == target_key.lower() or 
            v.get("country_code", "").lower() == q or 
            v.get("country_name", "").lower() == q or 
            q in v.get("country_name", "").lower()):
            return {
                "status": "success",
                "reporting_period": "FY2023-24",
                "source": "DGCI&S Tradestat / NIRYAT Bilateral Principal Commodity System",
                "partner": v
            }
            
    return {
        "status": "error",
        "error": f"Partner '{country_query}' not found in DGCI&S Principal Bilateral Matrix",
        "available_partners": [v.get("country_name") for v in matrix.values()]
    }

