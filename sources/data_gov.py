"""Client for data.gov.in Open Government Data Platform.
Uses standard library urllib and local SQLite caching to stay 100% free-tier compliant.
"""
import urllib.request
import urllib.parse
import json
from typing import Dict, Any, Optional
from config import DATA_GOV_IN_API_KEY, DATA_GOV_IN_BASE_URL
from cache import get_cached_response, set_cached_response

# Catalog of known official trade & agriculture resource IDs on data.gov.in
KNOWN_RESOURCES = {
    "apmc_mandi_arrivals": "9ef84268-d588-465a-a308-a864a43d0070", # Daily APMC Mandi prices & arrivals
    "cochin_port_cargo": "85a114e9-1da5-4201-9a7c-3f95e865f148", # Port traffic & vessel movement
    "marine_fish_landing": "b8a53e6b-0b1a-4286-a4f6-ef417244917a", # Marine products export supply
}

def query_data_gov(
    resource_id: str,
    filters: Optional[Dict[str, str]] = None,
    limit: int = 20,
    offset: int = 0,
    use_cache: bool = True
) -> Dict[str, Any]:
    """Query a data.gov.in resource with automatic caching."""
    if not DATA_GOV_IN_API_KEY:
        raise ValueError("DATA_GOV_IN_API_KEY is not configured in .env")

    # Build query params
    params = {
        "api-key": DATA_GOV_IN_API_KEY,
        "format": "json",
        "limit": limit,
        "offset": offset
    }
    if filters:
        for k, v in filters.items():
            params[f"filters[{k}]"] = v

    query_string = urllib.parse.urlencode(params)
    full_url = f"{DATA_GOV_IN_BASE_URL}/{resource_id}?{query_string}"
    cache_key = f"data_gov_{resource_id}_{hash(query_string)}"

    # Check cache first
    if use_cache:
        cached = get_cached_response(cache_key)
        if cached is not None:
            cached["_from_cache"] = True
            return cached

    req = urllib.request.Request(
        full_url,
        headers={"User-Agent": "WorldOfTrade-Antigravity/1.0"}
    )
    
    with urllib.request.urlopen(req, timeout=15) as response:
        payload = json.loads(response.read().decode("utf-8"))
        # Cache for 12 hours
        set_cached_response(cache_key, resource_id, payload, ttl_seconds=43200)
        payload["_from_cache"] = False
        return payload
