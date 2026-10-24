"""Intelligent Query Classifier & Semantic Router for World of Trade.
Automatically maps plain conversational English into official trade domains,
industry sectors, HS chapters, and trading partners without requiring the user
to know any technical codes or categories.
"""
import re
from typing import Dict, Any, List

# The 6 Strategic Domains
DOMAINS = {
    "merchandise": {
        "id": "Domain 1",
        "name": "Physical Merchandise Trade",
        "keywords": ["export", "exports", "import", "imports", "goods", "commodities", "trade out", "trade in", "shipment", "selling", "buying"]
    },
    "services": {
        "id": "Domain 2",
        "name": "Services & Invisible Trade",
        "keywords": ["service", "services", "software", "it", "ites", "consulting", "gcc", "bop", "remittance", "invisibles", "cloud"]
    },
    "customs": {
        "id": "Domain 3",
        "name": "Customs, Tariffs & Trade Policy",
        "keywords": ["tariff", "duty", "customs", "tax", "gst", "icegate", "fta", "cepa", "restriction", "ban", "rodtep", "drawback", "rules of origin"]
    },
    "logistics": {
        "id": "Domain 4",
        "name": "Maritime, Aviation & Port Logistics",
        "keywords": ["port", "ports", "shipping", "freight", "container", "teu", "cif", "fob", "cargo", "vessel", "air cargo", "jnpa", "mundra"]
    },
    "domestic": {
        "id": "Domain 5",
        "name": "Domestic Inland Trade & Supply Chain",
        "keywords": ["domestic", "inland", "mandi", "apmc", "state", "inter-state", "eway", "e-way", "truck", "highway", "internal", "local market", "modal price"]
    },
    "finance": {
        "id": "Domain 6",
        "name": "Macro & Bilateral Trade Finance",
        "keywords": ["deficit", "surplus", "balance", "forex", "rupee", "dollar", "currency", "bop", "reserves", "depreciation", "current account"]
    }
}

# The 10 Primary Industry & Commodity Sectors
SECTORS = {
    "energy": {
        "id": "Sector 1",
        "name": "Energy & Hydrocarbons",
        "hs_chapters": "27",
        "keywords": ["oil", "crude", "petroleum", "diesel", "petrol", "fuel", "gas", "lng", "coal", "coke", "energy", "refinery"]
    },
    "engineering": {
        "id": "Sector 2",
        "name": "Engineering & Capital Goods",
        "hs_chapters": "84, 87, 72, 73",
        "keywords": ["machine", "machinery", "engineering", "car", "auto", "automobile", "steel", "iron", "tools", "equipment", "motor"]
    },
    "electronics": {
        "id": "Sector 3",
        "name": "Electronics & High-Tech",
        "hs_chapters": "85",
        "keywords": ["electronic", "electronics", "phone", "smartphone", "mobile", "apple", "iphone", "samsung", "chip", "semiconductor", "circuit", "computer", "hardware", "display"]
    },
    "agriculture": {
        "id": "Sector 4",
        "name": "Agriculture, Marine & Food",
        "hs_chapters": "01-24",
        "keywords": ["agri", "agriculture", "rice", "basmati", "wheat", "food", "spice", "spices", "chili", "onion", "tea", "coffee", "shrimp", "fish", "marine", "edible oil", "palm oil", "crop"]
    },
    "pharma": {
        "id": "Sector 5",
        "name": "Pharmaceuticals & Life Sciences",
        "hs_chapters": "30",
        "keywords": ["pharma", "pharmaceutical", "drug", "drugs", "medicine", "medicines", "vaccine", "vaccines", "api", "formulation", "biotech"]
    },
    "chemicals": {
        "id": "Sector 6",
        "name": "Chemicals & Petrochemicals",
        "hs_chapters": "28, 29, 31, 38, 39",
        "keywords": ["chemical", "chemicals", "fertilizer", "fertilizers", "plastic", "plastics", "organic", "polymer", "dye"]
    },
    "gems": {
        "id": "Sector 7",
        "name": "Gems, Jewellery & Precious Metals",
        "hs_chapters": "71",
        "keywords": ["gem", "gems", "jewellery", "jewelry", "gold", "diamond", "diamonds", "silver", "precious", "bullion", "ornament"]
    },
    "textiles": {
        "id": "Sector 8",
        "name": "Textiles, Apparel & Footwear",
        "hs_chapters": "50-64",
        "keywords": ["textile", "textiles", "garment", "garments", "apparel", "cotton", "cloth", "clothes", "fabric", "yarn", "shoe", "footwear", "leather"]
    },
    "services": {
        "id": "Sector 9",
        "name": "Digital, IT & Knowledge Services",
        "hs_chapters": "SAC 9983, 9984",
        "keywords": ["software", "it service", "tech service", "consulting", "gcc", "coding", "saas", "bpo", "call center"]
    },
    "minerals": {
        "id": "Sector 10",
        "name": "Strategic Raw Materials & Minerals",
        "hs_chapters": "25, 26, 74, 76",
        "keywords": ["mineral", "minerals", "iron ore", "bauxite", "copper", "aluminum", "mining", "stone"]
    }
}

# Country aliases
COUNTRIES = {
    "USA": ["usa", "us", "america", "united states", "american"],
    "UAE": ["uae", "dubai", "emirates", "abu dhabi"],
    "China": ["china", "chinese", "beijing", "shanghai"],
    "Netherlands": ["netherlands", "holland", "dutch", "rotterdam"],
    "Russia": ["russia", "russian", "moscow"],
    "Saudi Arabia": ["saudi", "riyadh", "saudi arabia"],
    "United Kingdom": ["uk", "britain", "england", "london", "british"],
    "Singapore": ["singapore"],
    "Germany": ["germany", "german", "berlin"],
    "Indonesia": ["indonesia", "jakarta"],
    "Iraq": ["iraq", "baghdad"],
    "South Korea": ["korea", "south korea", "seoul"],
    "Switzerland": ["switzerland", "swiss", "zurich"]
}

class QueryClassifier:
    def classify(self, question: str) -> Dict[str, Any]:
        """Automatically classify user question into domains, sectors, countries, and flow."""
        q_clean = question.lower()
        words = set(re.findall(r"\b[a-zA-Z0-9_\-]+\b", q_clean))

        # 1. Detect Country (exact word boundary)
        matched_country = None
        for standard_name, aliases in COUNTRIES.items():
            if any(re.search(r"\b" + re.escape(alias) + r"\b", q_clean) for alias in aliases):
                matched_country = standard_name
                break

        # 2. Detect Sectors (exact word boundary)
        detected_sectors = []
        for sec_key, sec_data in SECTORS.items():
            if any(re.search(r"\b" + re.escape(kw) + r"\b", q_clean) for kw in sec_data["keywords"]):
                detected_sectors.append(sec_data)

        # 3. Detect Domains (exact word boundary)
        detected_domains = []
        for dom_key, dom_data in DOMAINS.items():
            if any(re.search(r"\b" + re.escape(kw) + r"\b", q_clean) for kw in dom_data["keywords"]):
                detected_domains.append(dom_data)

        # Defaults if ambiguous
        if not detected_domains:
            detected_domains.append(DOMAINS["merchandise"])

        # Determine flow (export / import / bilateral / domestic / macro)
        flow = "General Trade Overview"
        if any(w in words for w in ["export", "exports", "selling", "trade out"]):
            flow = "Exports (Trade Out)"
        elif any(w in words for w in ["import", "imports", "buying", "sourcing", "trade in"]):
            flow = "Imports (Trade In)"
        elif matched_country:
            flow = f"Bilateral Trade with {matched_country}"
        elif any(w in words for w in ["domestic", "mandi", "eway", "e-way", "inter-state"]):
            flow = "Domestic / Internal Commerce"
        elif any(w in words for w in ["deficit", "surplus", "balance", "total", "macro"]):
            flow = "Macro Balance & Deficit"

        primary_sector = detected_sectors[0] if detected_sectors else None

        return {
            "original_query": question,
            "detected_country": matched_country,
            "detected_domains": detected_domains,
            "detected_sectors": detected_sectors,
            "primary_sector": primary_sector,
            "trade_flow": flow
        }

    def format_classification_banner(self, c: Dict[str, Any]) -> str:
        """Format an auto-classification banner to show the user how the system understood their query."""
        domain_str = ", ".join([d["name"] for d in c["detected_domains"][:2]])
        sector_str = f"{c['primary_sector']['name']} (HS {c['primary_sector']['hs_chapters']})" if c["primary_sector"] else "All Industry Sectors / Macro Totals"
        partner_str = f" • Partner: {c['detected_country']}" if c["detected_country"] else ""

        banner = [
            "```text",
            "┌────────────────────────────────────────────────────────────────────────┐",
            "│ 🎯 AUTO-CLASSIFIED QUERY INTENT:                                       │",
            f"│ • Flow   : {c['trade_flow']}{partner_str}".ljust(73) + "│",
            f"│ • Sector : {sector_str}".ljust(73) + "│",
            f"│ • Domain : {domain_str}".ljust(73) + "│",
            "└────────────────────────────────────────────────────────────────────────┘",
            "```",
            ""
        ]
        return "\n".join(banner)

# Singleton classifier
classifier = QueryClassifier()
