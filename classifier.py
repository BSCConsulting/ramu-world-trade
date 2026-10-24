"""Intelligent Query Classifier & Semantic Router for World of Trade.
Automatically maps plain conversational English into official trade domains,
industry sectors, 8-digit ITC-HS lines, and 765 ODOP districts without requiring
the user to know any technical codes or categories.
"""
import re
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from config import DATA_DIR

ODOP_FILE = DATA_DIR / "odop_districts.json"
ITC_HS_FILE = DATA_DIR / "itc_hs_master.json"

# Load ODOP Districts database
ODOP_DATA = []
if ODOP_FILE.exists():
    with open(ODOP_FILE, "r", encoding="utf-8") as f:
        ODOP_DATA = json.load(f).get("districts", [])

# Load ITC-HS Master lines
ITC_HS_LINES = []
if ITC_HS_FILE.exists():
    with open(ITC_HS_FILE, "r", encoding="utf-8") as f:
        ITC_HS_LINES = json.load(f).get("tariff_lines", [])

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
        "keywords": ["domestic", "inland", "mandi", "apmc", "state", "inter-state", "eway", "e-way", "truck", "highway", "internal", "local market", "modal price", "district", "odop"]
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
        "keywords": ["machine", "machinery", "engineering", "car", "auto", "automobile", "steel", "iron", "tools", "equipment", "motor", "fastener", "fasteners", "screw", "bolt"]
    },
    "electronics": {
        "id": "Sector 3",
        "name": "Electronics & High-Tech",
        "hs_chapters": "85",
        "keywords": ["electronic", "electronics", "phone", "smartphone", "mobile", "apple", "iphone", "samsung", "chip", "semiconductor", "circuit", "computer", "laptop", "hardware", "display", "solar"]
    },
    "agriculture": {
        "id": "Sector 4",
        "name": "Agriculture, Marine & Food",
        "hs_chapters": "01-24",
        "keywords": ["agri", "agriculture", "rice", "basmati", "wheat", "food", "spice", "spices", "chili", "chillies", "chilli", "onion", "tea", "coffee", "shrimp", "fish", "marine", "octopus", "edible oil", "palm oil", "crop", "grape", "mango", "cashew", "saffron", "jaggery"]
    },
    "pharma": {
        "id": "Sector 5",
        "name": "Pharmaceuticals & Life Sciences",
        "hs_chapters": "30",
        "keywords": ["pharma", "pharmaceutical", "drug", "drugs", "medicine", "medicines", "vaccine", "vaccines", "api", "formulation", "biotech", "antibiotic"]
    },
    "chemicals": {
        "id": "Sector 6",
        "name": "Chemicals & Petrochemicals",
        "hs_chapters": "28, 29, 31, 38, 39",
        "keywords": ["chemical", "chemicals", "fertilizer", "fertilizers", "plastic", "plastics", "organic", "polymer", "dye", "perfume", "attar"]
    },
    "gems": {
        "id": "Sector 7",
        "name": "Gems, Jewellery & Precious Metals",
        "hs_chapters": "71",
        "keywords": ["gem", "gems", "jewellery", "jewelry", "gold", "diamond", "diamonds", "silver", "precious", "bullion", "ornament", "filigree"]
    },
    "textiles": {
        "id": "Sector 8",
        "name": "Textiles, Apparel & Footwear",
        "hs_chapters": "50-64",
        "keywords": ["textile", "textiles", "garment", "garments", "apparel", "cotton", "cloth", "clothes", "fabric", "yarn", "shoe", "footwear", "leather", "carpet", "rug", "knitwear", "saree", "silk", "shawl", "pashmina"]
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
        "keywords": ["mineral", "minerals", "iron ore", "bauxite", "copper", "aluminum", "mining", "stone", "tile", "tiles", "ceramic", "brass", "brassware"]
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
    "Switzerland": ["switzerland", "swiss", "zurich"],
    "Japan": ["japan", "japanese", "tokyo"]
}

class QueryClassifier:
    def classify(self, question: str) -> Dict[str, Any]:
        """Automatically classify user question into ODOP districts, domains, sectors, countries, and flow."""
        q_clean = question.lower()
        words = set(re.findall(r"\b[a-zA-Z0-9_\-]+\b", q_clean))

        # 1. Detect ODOP District
        matched_odop = None
        for d in ODOP_DATA:
            d_name = d["district"].lower()
            if re.search(r"\b" + re.escape(d_name) + r"\b", q_clean):
                matched_odop = d
                break

        # 2. Detect Specific 8-digit ITC-HS Line
        matched_hs_line = None
        for line in ITC_HS_LINES:
            # Check by HS code or description keywords
            hs_code_clean = line["hs_code"].replace(" ", "").lower()
            if hs_code_clean in q_clean.replace(" ", ""):
                matched_hs_line = line
                break
            desc_words = [w.lower() for w in line["description"].split() if len(w) > 4]
            if any(re.search(r"\b" + re.escape(w) + r"\b", q_clean) for w in desc_words[:3]):
                matched_hs_line = line

        # 3. Detect Country (exact word boundary)
        matched_country = None
        for standard_name, aliases in COUNTRIES.items():
            if any(re.search(r"\b" + re.escape(alias) + r"\b", q_clean) for alias in aliases):
                matched_country = standard_name
                break

        # 4. Detect Sectors (exact word boundary)
        detected_sectors = []
        for sec_key, sec_data in SECTORS.items():
            if any(re.search(r"\b" + re.escape(kw) + r"\b", q_clean) for kw in sec_data["keywords"]):
                detected_sectors.append(sec_data)

        # 5. Detect Domains (exact word boundary)
        detected_domains = []
        for dom_key, dom_data in DOMAINS.items():
            if any(re.search(r"\b" + re.escape(kw) + r"\b", q_clean) for kw in dom_data["keywords"]):
                detected_domains.append(dom_data)

        # Defaults if ambiguous
        if not detected_domains:
            if matched_odop:
                detected_domains.append(DOMAINS["domestic"])
            else:
                detected_domains.append(DOMAINS["merchandise"])

        # Determine flow
        flow = "General Trade Overview"
        if matched_odop:
            flow = f"ODOP District Profile: {matched_odop['district']} ({matched_odop['state']})"
        elif any(w in words for w in ["export", "exports", "selling", "trade out"]):
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
            "detected_odop": matched_odop,
            "detected_hs_line": matched_hs_line,
            "detected_country": matched_country,
            "detected_domains": detected_domains,
            "detected_sectors": detected_sectors,
            "primary_sector": primary_sector,
            "trade_flow": flow
        }

    def format_classification_banner(self, c: Dict[str, Any]) -> str:
        """Format an auto-classification banner with ODOP district, sector, and domain."""
        domain_str = ", ".join([d["name"] for d in c["detected_domains"][:2]])
        
        if c.get("detected_odop"):
            d = c["detected_odop"]
            sector_str = f"ODOP: {d['odop_product']} (HS {d['hs_code']})"
        elif c.get("detected_hs_line"):
            line = c["detected_hs_line"]
            sector_str = f"{line['description'][:30]}... (HS {line['hs_code']})"
        elif c.get("primary_sector"):
            sector_str = f"{c['primary_sector']['name']} (HS {c['primary_sector']['hs_chapters']})"
        else:
            sector_str = "All Industry Sectors / Macro Totals"

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
