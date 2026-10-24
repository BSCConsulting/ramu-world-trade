"""Loads, indexes, and searches statutory trade datasets for India.
Provides verified figures from DGCI&S, RBI DBIE, UN Comtrade, and GSTN.
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from config import DATA_DIR

BENCHMARKS_FILE = DATA_DIR / "official_benchmarks.json"

class TradeBenchmarkStore:
    def __init__(self, file_path: Path = BENCHMARKS_FILE):
        with open(file_path, "r", encoding="utf-8") as f:
            self.data: Dict[str, Any] = json.load(f)

    def get_totals(self, fiscal_year: Optional[str] = None) -> Dict[str, Any]:
        totals = self.data.get("merchandise_trade_totals", {})
        if fiscal_year:
            return totals.get(fiscal_year, {})
        return totals

    def get_services_trade(self, fiscal_year: Optional[str] = None) -> Dict[str, Any]:
        services = self.data.get("services_trade_rbi", {})
        if fiscal_year:
            return services.get(fiscal_year, {})
        return services

    def search_export_commodity(self, query: str) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        results = []
        for item in self.data.get("top_export_commodities_fy24", []):
            if query_lower in item["commodity"].lower() or any(query_lower in d.lower() for d in item.get("major_destinations", [])):
                results.append(item)
        return results

    def search_import_commodity(self, query: str) -> List[Dict[str, Any]]:
        query_lower = query.lower()
        results = []
        for item in self.data.get("top_import_commodities_fy24", []):
            if query_lower in item["commodity"].lower() or any(query_lower in s.lower() for s in item.get("major_sources", [])):
                results.append(item)
        return results

    def get_trading_partner(self, country: str) -> Dict[str, Any]:
        country_lower = country.lower()
        partners = self.data.get("top_trading_partners_fy24", {})
        
        export_match = None
        for item in partners.get("exports", []):
            if country_lower in item["country"].lower():
                export_match = item
                break
                
        import_match = None
        for item in partners.get("imports", []):
            if country_lower in item["country"].lower():
                import_match = item
                break

        mirror_info = None
        for c_name, m_data in self.data.get("triangulation_mirror_benchmarks", {}).items():
            if country_lower in c_name.lower():
                mirror_info = m_data
                break

        return {
            "country": country,
            "export_data": export_match,
            "import_data": import_match,
            "mirror_data": mirror_info
        }

    def get_top_export_commodities(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.data.get("top_export_commodities_fy24", [])[:limit]

    def get_top_import_commodities(self, limit: int = 10) -> List[Dict[str, Any]]:
        return self.data.get("top_import_commodities_fy24", [])[:limit]

    def get_domestic_trade(self) -> Dict[str, Any]:
        return self.data.get("domestic_trade_gst_eway", {})

# Singleton instance
store = TradeBenchmarkStore()
