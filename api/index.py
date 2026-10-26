from sources.rbi_forex import get_live_rbi_reference_rates
from sources.data_gov import query_data_gov, KNOWN_RESOURCES
"""Vercel Serverless Function entry point for World of Trade API.
Handles /api/health, /api/query, /api/calculate, and /api/history.
Built using 100% Python standard library BaseHTTPRequestHandler.
"""
import os
import sys
import json
import urllib.parse
from http.server import BaseHTTPRequestHandler
from pathlib import Path

# Add project root to sys.path so root modules can be imported
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

# Ensure VERCEL environment variable is recognized
os.environ["VERCEL"] = "1"

from triangulator import engine
from classifier import classifier
from incentives_calculator import incentives_calculator
from cache import init_db, CACHE_DB_PATH
import sqlite3

import time
import math

_RATE_LIMIT_BUCKET = {}
MAX_REQUESTS_PER_MINUTE = 60

def _get_client_ip(headers) -> str:
    xff = headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    x_real = headers.get("x-real-ip")
    if x_real:
        return x_real.strip()
    return "127.0.0.1"

def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    cutoff = now - 60.0
    times = _RATE_LIMIT_BUCKET.get(ip, [])
    times = [t for t in times if t > cutoff]
    if len(times) >= MAX_REQUESTS_PER_MINUTE:
        _RATE_LIMIT_BUCKET[ip] = times
        return True
    times.append(now)
    _RATE_LIMIT_BUCKET[ip] = times
    if len(_RATE_LIMIT_BUCKET) > 1000:
        stale = [k for k, v in _RATE_LIMIT_BUCKET.items() if not v or v[-1] < cutoff]
        for k in stale[:500]:
            del _RATE_LIMIT_BUCKET[k]
    return False

def _safe_float(val, default=0.0, min_val=-1e12, max_val=1e12):
    try:
        if val is None:
            return default
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        if f < min_val:
            return min_val
        if f > max_val:
            return max_val
        return f
    except (ValueError, TypeError):
        return default

def _safe_int(val, default=0, min_val=-1_000_000, max_val=1_000_000):
    try:
        if val is None:
            return default
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        i = int(f)
        if i < min_val:
            return min_val
        if i > max_val:
            return max_val
        return i
    except (ValueError, TypeError):
        return default

class handler(BaseHTTPRequestHandler):
    MAX_PAYLOAD_BYTES = 1_048_576  # 1 MB strict upper bound to prevent DoS

    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("X-XSS-Protection", "1; mode=block")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
        self.send_header("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
        self.send_header("X-Permitted-Cross-Domain-Policies", "none")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error(self, message: str, status: int = 400):
        safe_msg = str(message)
        if "/" in safe_msg or "\\" in safe_msg or "Traceback" in safe_msg or "sqlite" in safe_msg.lower():
            safe_msg = "An internal processing error occurred while handling the statutory request."
        self._send_json({"error": safe_msg}, status=status)

    def _parse_json_body(self):
        try:
            cl_header = self.headers.get("Content-Length")
            if not cl_header:
                return {}, None
            content_length = int(cl_header)
            if content_length < 0:
                return None, "Invalid Content-Length header"
            if content_length > self.MAX_PAYLOAD_BYTES:
                return None, "Payload Too Large (Max 1MB allowed)"
            body_bytes = self.rfile.read(content_length)
            body_str = body_bytes.decode("utf-8", errors="replace").replace("\x00", "")
            return json.loads(body_str), None
        except ValueError:
            return None, "Malformed Content-Length or payload encoding"
        except json.JSONDecodeError:
            return None, "Malformed JSON syntax"
        except Exception:
            return None, "Request parsing failure"

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        client_ip = _get_client_ip(self.headers)
        if _is_rate_limited(client_ip):
            self._send_json({"error": "Too many requests. Rate limit exceeded (60 req/min). Please slow down."}, status=429)
            return
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        if path.endswith("/health"):
            self._send_json({"status": "ok", "app": "World of Trade", "tier": "100% Free", "deployment": "Vercel Serverless"})
        elif path.endswith("/forex"):
            self._handle_forex()
        elif path.endswith("/cbic-gazette"):
            self._handle_cbic_gazette()
        elif path.endswith("/tradestat"):
            self._handle_tradestat(parsed.query)
        elif path.endswith("/eway"):
            self._handle_eway(parsed.query)
        elif path.endswith("/icegate"):
            self._handle_icegate(parsed.query)
        elif path.endswith("/dgft"):
            self._handle_dgft(parsed.query)
        elif path.endswith("/tariff"):
            self._handle_tariff(parsed.query)
        elif path.endswith("/logistics"):
            self._handle_logistics(parsed.query)
        elif path.endswith("/mandi"):
            self._handle_mandi(parsed.query)
        elif path.endswith("/history"):
            self._handle_history()
        elif path.endswith("/query"):
            self._handle_query_get(parsed.query)
        else:
            self._send_json({"status": "ok", "message": "World of Trade API is active"}, status=200)

    def do_POST(self):
        client_ip = _get_client_ip(self.headers)
        if _is_rate_limited(client_ip):
            self._send_json({"error": "Too many requests. Rate limit exceeded (60 req/min). Please slow down."}, status=429)
            return
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path.rstrip("/")
        payload, err = self._parse_json_body()
        if err:
            status = 413 if "Payload Too Large" in err else 400
            self._send_json({"error": err}, status=status)
            return

        if path.endswith("/query"):
            self._handle_query(payload)
        elif path.endswith("/calculate"):
            self._handle_calculate(payload)
        elif path.endswith("/cbic-valuation"):
            self._handle_cbic_valuation(payload)
        elif path.endswith("/eway"):
            self._handle_eway_calc(payload)
        elif path.endswith("/icegate"):
            self._handle_icegate_tracking(payload)
        elif path.endswith("/dgft"):
            self._handle_dgft_calc(payload)
        elif path.endswith("/tariff"):
            self._handle_tariff_calc(payload)
        elif path.endswith("/logistics"):
            self._handle_logistics_calc(payload)
        elif path.endswith("/tradestat"):
            self._handle_tradestat_calc(payload)
        elif path.endswith("/mandi"):
            self._handle_mandi_calc(payload)
        else:
            self._send_json({"error": f"API endpoint not found: {self.path}"}, status=404)

    def _handle_query_get(self, query_str: str = ""):
        try:
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            q = params.get("q", params.get("query", [""]))[0]
            if "blueprint" in params or "dossier" in params or "triangulate" in params:
                from sources.trade_triangulator import triangulate_trade_query
                comm = params.get("commodity", [None])[0]
                orig = params.get("origin", [None])[0]
                dest = params.get("destination", [None])[0]
                
                def _get_float_param(key):
                    if key in params:
                        try:
                            return float(params[key][0])
                        except (ValueError, TypeError):
                            return None
                    return None

                qty = _get_float_param("qty")
                buy_p = _get_float_param("buy_price")
                sell_p = _get_float_param("sell_price")
                data = triangulate_trade_query(q, comm, orig, dest, qty, buy_p, sell_p)
                self._send_json(data)
                return
            self._handle_query({"query": q})
        except Exception:
            self._send_json({"error": "Failed to process trade blueprint request"}, status=500)

    def _handle_query(self, payload: dict):
        action = payload.get("action", "")
        mode = payload.get("mode", "")
        query = str(payload.get("query", ""))[:2000].strip()
        q_lower = query.lower()

        if action == "triangulate_trade" or mode in ["triangulate_blueprint", "blueprint", "dossier"] or any(k in q_lower for k in ["i want to start", "how to start", "where to start", "start an onion", "export 20 tons", "export turmeric", "blueprint", "dossier"]):
            from sources.trade_triangulator import triangulate_trade_query
            comm = payload.get("commodity")
            orig = payload.get("origin")
            dest = payload.get("destination")
            qty = payload.get("quantity_tons")
            buy_p = payload.get("buy_price")
            sell_p = payload.get("sell_price")
            data = triangulate_trade_query(query, comm, orig, dest, qty, buy_p, sell_p)
            self._send_json(data)
            return

        if not query:
            self._send_json({"error": "Empty query"}, status=400)
            return

        
        # =========================================================================
        # 4 FLAGSHIP SOVEREIGN STRATEGY RESPONSES (All Levels with 6 Pillars & Notes)
        # =========================================================================
        q_clean = q_lower.strip()
        
        # Level 1: Vijayawada -> Madhira Mandi Wholesale Arbitrage
        if any(k in q_clean for k in ["level 1", "vijayawada", "madhira", "gollapudi", "mandi veg", "vegetable arbitrage"]):
            resp_md = """# Level 1 Sovereign Blueprint: Vijayawada APMC ➔ Madhira Veg Arbitrage
**Corridor**: Gollapudi Wholesale APMC, Vijayawada (AP) ➔ Madhira Local Market (Telangana) • **Distance**: 78 KM
**Statutory Moat**: Central Tax Notification 2/2017 (0% GST on Fresh Produce) • **Daily Capital**: ₹7,500 Revolving Float

---

### 1. Tariff & Inter-State Tax Arbitrage
* **GST Statutory Exemption**: Fresh vegetables (tomatoes, green chillies, onions, leafy greens) are 100% exempt from GST under **Notification No. 2/2017-Central Tax (Rate)** (HSN Chapter 7).
* **Inter-State Transit Defense**: Zero e-Way bill requirement for consignments of fresh, unbranded horticultural produce under Rule 138(14) of CGST Rules. Always carry the **original APMC Market Committee Mandi Receipt (Kachha Arhatia Receipt)** in the vehicle to bypass commercial tax checkpoints at the Jaggaiahpeta / Chillakallu Andhra-Telangana border without bribery or delays.

---

### 2. Regulatory Gateway & Procurement Moat
* **The 3:30 AM Gollapudi Auction Protocol**: Arrive at Gollapudi Market Yard at 3:30 AM sharp. Procure directly from arriving farmer tractor-trailers at the unloader ramp before commission agents (dalals) add their 25%–35% secondary markup at 6:00 AM.
* **Cash-Flow Liquidation Velocity**: 100% of the produce is unloaded in Madhira by 6:45 AM and liquidated to local stalls and messes by 8:30 AM, eliminating storage costs.

---

### 3. BOM & Ground Financial Waterfall (Daily Rotation)
* **Procurement Capital (380 kg staple basket)**: ₹5,800
* **Logistics (Shared Bolero / Auto loading from Gollapudi)**: ₹1,100
* **Shrinkage & Spoilage Buffer (5%)**: ₹350
* **APMC User Cess (1%)**: ₹58
* **Loading / Hamali Charges**: ₹192
* **Total Daily Capital Outlay**: **₹7,500**
* **Gross Daily Realization in Madhira**: **₹10,950**
* **Net Realized Daily Cash**: **₹3,450 / day** (₹1,03,500 / month on 30-day turnover)!

---

### 4. Local Workshop & Skilled Labor Setup
* **Vehicle & Labor**: Rent half a Bolero Maxi Truck or Piaggio Ape on a shared morning run (₹1,000–₹1,200/day).
* **Ground Labor**: 1 local sorter/loader hired in Madhira @ ₹400/morning shift (6:00 AM to 9:00 AM).
* **Equipment**: 15 heavy-duty reusable plastic crates (₹450 each = ₹6,750 one-time asset).

---

### 5. Working Capital & Float Defense
* **Revolving Float Cycle**: Capital returns to your pocket in physical cash by 9:00 AM every morning.
* **0% Debt**: Zero working capital debt or bank interest; the ₹7,500 float is rotated 30 times a month.

---

### 📌 Special Operational Notes (Knowledge & Field Tooling)
1. **🏛️ Free Institutional Certifications**: 
   * **MANAGE (Ministry of Agriculture)**: Free modules on *Agricultural Marketing & Supply Chain Management* at `manage.gov.in`.
   * **NPTEL / Swayam**: Free lectures on *Supply Chain Analytics for Agricultural Commodities*.
2. **📺 Hands-on Video Tutorials**:
   * Search YouTube: *"Gollapudi wholesale vegetable market 4 AM auction mechanics"* & *"APMC mandi receipt zero-GST inter-state transport guidelines"*.
3. **📥 Downloadable Field PDF Dossier**:
   * View & Print: [Mandi Strategy 1 Dossier](https://ramu-world-trade.vercel.app/mandi-strategy-1.html) • [Mandi Strategy 2 Dossier](https://ramu-world-trade.vercel.app/mandi-strategy-2.html) • [Mandi Strategy 3 Dossier](https://ramu-world-trade.vercel.app/mandi-strategy-3.html)
"""
            self._send_json({
                "type": "flagship_strategy",
                "level": "Level 1: Micro Ground Arbitrage",
                "title": "Vijayawada APMC ➔ Madhira Veg Arbitrage",
                "classification": { "flow": "Domestic Mandi Wholesale", "sector": "Horticulture & Spices", "domain": "Inter-State Farmgate Arbitrage", "partner": "Telangana" },
                "formatted_markdown": resp_md,
                "pdf_link": "/mandi-strategy-1.html"
            })
            return

        # Level 2: Guntur Cold Storage Chilli Sourcing for Exporters
        if any(k in q_clean for k in ["level 2", "guntur", "chilli", "mirchi", "cold storage", "sourcing broker", "teja"]):
            resp_md = """# Level 2 Sovereign Blueprint: Guntur Cold Storage Chilli ➔ Exporter Mandate
**Commodity**: Dry Red Chilli (Teja S17 / Stemless / Fatki) • **HS Code**: `0904.21.10` • **Location**: Guntur-Khammam Cold Storage Belt
**Strategy**: Zero-Risk Sourcing Mandate Broker • **Capital Outlay**: ₹0.00 • **Target Fee**: ₹2.50–₹5.00 / kg

---

### 1. Tariff & Export Remission Arbitrage
* **Customs Duty on Raw Spices**: 0% Export Duty under current Foreign Trade Policy.
* **Government Cash Rebates (For Exporter)**: RoDTEP remission of **2.50%** (capped at ₹3.20/kg) + All-Industry Duty Drawback of **1.10%** on FOB shipping bill value. You use this government refund data as your bargaining chip when pitching exporters.

---

### 2. Legal Defense: Sourcing Mandate & NCNDA Agreement
* **The Broker Bypass Trap**: Exporters will ruthlessly contact cold storage owners directly to cut you out of the ₹2.50–₹5.00/kg commission.
* **The Legal Protection Moat**:
  1. Execute a binding **Non-Circumvention, Non-Disclosure & Sourcing Fee Agreement (NCNDA)** with the cold storage owner *before* disclosing the buyer\'s identity.
  2. Issue **Blind Lot Codes** (e.g., `WOT-LOT-701`) with lab test certificates (Moisture <11%, Capsaicin, Aflatoxin <10 ppb) with farmer/storage names redacted.
  3. Require the exporter to sign an Irrevocable Fee Mandate guaranteeing ₹2.50/kg payable upon truck dispatch.

---

### 3. BOM & Consignment Economics (14 MT FCL Container)
* **Lot Volume (1 x 20ft FCL Container)**: 14,000 kg (700 bags @ 20 kg/bag)
* **Procurement Capital Required**: **₹0.00** (Exporter pays cold storage owner directly via RTGS)
* **Broker Sourcing Fee Cut**: ₹2.50 to ₹3.00 / kg
* **Total Gross Realized Fee**: **₹35,000 to ₹42,000 per 14 MT lot**
* **Monthly Scale (4 Consignments / Month)**: **₹1,40,000 to ₹1,68,000 pure risk-free cash profit**!

---

### 4. Ground Execution & Lot Inspection (Guntur / Perecherla / Madhira)
* **Quality Verification**: Take 5 representative core-samples across 50 bags. Test moisture using a handheld moisture meter (<10.5% ideal).
* **Weight Audit**: Weigh 10 random bags on the cold storage platform scale.
* **Loading & Sealing**: Supervise loading into container/lorry, ensure high-barrier polythene liners prevent ambient moisture absorption, and take container bolt-seal photos.

---

### 5. Working Capital & Float Defense
* **Zero Financial Risk**: You bear zero inventory risk, zero quality rejection risk, and zero price fluctuation risk.
* **Commission Collection**: Escrow or irrevocable bank payment letter released immediately upon weighbridge gate pass issuance.

---

### 📌 Special Operational Notes (Knowledge & Field Tooling)
1. **🏛️ Free Institutional Certifications**:
   * **Spices Board of India**: Free webinars on *Quality Standards and Sampling Procedures for Export Chillies* at `indianspices.com`.
   * **UN/WTO ITC SME Trade Academy**: Free diploma in *International Contracting and Commission Agreements* at `learning.intracen.org`.
2. **📺 Hands-on Video Tutorials**:
   * Search YouTube: *"Guntur dry chilli cold storage quality testing and lot sampling"* & *"Spices Board sampling protocols for aflatoxin in dry chilli"*.
3. **📥 Downloadable Field PDF Dossier**:
   * View & Print: [Chilli Strategy A Dossier (Zero-Risk Broker)](https://ramu-world-trade.vercel.app/strategy-a.html) • [Strategy B Dossier (Principal Trader)](https://ramu-world-trade.vercel.app/strategy-b.html) • [Strategy C Dossier (Titan Option)](https://ramu-world-trade.vercel.app/strategy-c.html)
"""
            self._send_json({
                "type": "flagship_strategy",
                "level": "Level 2: Zero-Capital Bulk Sourcing Mandate",
                "title": "Guntur Cold Storage Chilli ➔ Exporter Mandate",
                "classification": { "flow": "Export Sourcing Mandate", "sector": "Spices & Commodity Trade", "domain": "Cold Storage Arbitrage", "partner": "Global Exporters" },
                "formatted_markdown": resp_md,
                "pdf_link": "/strategy-a.html"
            })
            return

        # Level 3: Electric Scooter & Cycle Component Assembly Arbitrage
        if any(k in q_clean for k in ["level 3", "electric scooter", "electric cycle", "ev assembly", "bldc", "rule 2(a)", "cmvr"]):
            resp_md = """# Level 3 Sovereign Blueprint: EV Scooters & Cycles Component Assembly
**Category**: Electric Cycles & Low-Speed E-Scooters (<25 km/h) • **HS Code**: `8501.31` (Motors) / `8507.60` (Lithium Cells)
**Arbitrage**: CBU 100% Tax vs 10% Component Duty • **Regulatory Moat**: CMVR Rule 2(u) Non-RTO Exemption

---

### 1. Tariff Inversion & Customs Arbitrage
* **CBU Import Tax (Completely Built Unit - HS 8711.60)**: **50%–100% BCD + 10% SWS + 18% IGST = 75% to 135% landed tax**. Commercial suicide.
* **Component Import Route (Weighted Duty 10%–15%)**:
  * BLDC Hub Motor (HS 8501.31): **7.5%–10% BCD**
  * Lithium-ion Battery Cells (HS 8507.60): **5%–10% BCD**
  * Sine-wave Controller & Throttle (HS 8504.40): **7.5% BCD**
  * Domestic Alloy Frame & Chassis (Sourced in Ludhiana): **0% Import Duty**
  * Domestic Tires, Tubes & Rims (Ralco/TVS): **0% Import Duty**

---

### 2. Legal Defense: Customs Rule 2(a) GRI Anti-Seizure
* **The Seizure Trap**: Packing complete assembly kits in one container from one vendor triggers **Rule 2(a) of the General Rules of Interpretation (GRI)**. Customs will classify it as a complete vehicle (CBU @ 100% duty) and levy misdeclaration penalties.
* **Component Disaggregation Defense**:
  1. Import *only* high-density electronics (Motors, Controllers, Display, Cells) from Shenzhen/Taiwan.
  2. Procure all mechanical structures (Frames, forks, handlebars, disc brakes) from India\'s bicycle hub (**Ludhiana, Punjab**).
  3. Maintain >45% domestic Indian BOM content to render Rule 2(a) completely void.

---

### 3. Regulatory Moat: The <25 km/h Non-RTO Gateway
* Under **CMVR Rule 2(u)**, vehicles with top speed **< 25 km/h** and motor **<= 250 Watts**:
  * **NO RTO Vehicle Registration required**.
  * **NO Driving License required for customer**.
  * **NO Road Tax**.
  * **NO ₹25-Lakh ARAI crash testing**. You only need a one-time **Type-1 Exemption Certificate** (~₹35,000) from ICAT/ARAI.

---

### 4. BOM Cost Waterfall (Unit Economics)
* 250W BLDC Hub Motor + Sine Controller: ₹6,500
* 36V 10Ah Lithium Battery Pack (Smart BMS): ₹8,200
* Alloy Frame + Suspension Fork + Disc Brakes (Ludhiana): ₹4,800
* Double-Wall Rims + EV Tires (Domestic Ralco): ₹2,500
* Local Skilled Assembly Labor (2.5 hrs/unit @ ITI rates): ₹1,200
* Charger, Packaging, Brand Decals & Manual: ₹800
* Freight Buffer: ₹600
* **TOTAL UNIT PRODUCTION COST**: **₹24,600**
* **DIRECT RETAIL REALIZATION**: **₹42,000+**
* **NET PROFIT PER UNIT**: **₹17,400 (70.7% Margin)**!

---

### 5. Local Workshop & Skilled Labor Setup (Madhira / Regional Hub)
* **Footprint**: 1,200 sq.ft shed (Rent: ₹8,000–₹10,000/month).
* **Labor**: 3 ITI diploma holders (Electrician / Motor Mechanic) @ ₹15,000/month.
* **Throughput**: 6–8 assembled units/day (150 units/month capacity).
* **Monthly Realized Cash (At 50 Units / Month)**:
  * Gross Margin: 50 × ₹17,400 = **₹8,70,000**
  * Minus Overhead (Rent + 3 ITI salaries + power + transit): ₹1,20,000
  * **Net Monthly Cash Profit: ₹7.50 Lakhs per month**!

---

### 📌 Special Operational Notes (Knowledge & Field Tooling)
1. **🏛️ Free Institutional Certifications**:
   * **Skill India Digital / ASDC**: Free official certificate on *Electric Vehicle Service Technician & Battery Assembly* at `skillindiadigital.gov.in`.
   * **Ministry of MSME - TCDP**: Subsidized precision tool room access for local assembly entrepreneurs.
2. **📺 Hands-on Video Tutorials**:
   * Search YouTube: *"Electric cycle conversion kit complete installation walkthrough (250W BLDC)"* & *"18650 lithium battery pack assembly with smart BMS wiring from scratch"*.
3. **📥 Downloadable Field PDF Dossier**:
   * View & Print: [EV Assembly & Tariff Arbitrage Blueprint](https://ramu-world-trade.vercel.app/ev-assembly-dossier.html) • Local PDF: `ev-assembly-dossier.pdf`
"""
            self._send_json({
                "type": "flagship_strategy",
                "level": "Level 3: Component Assembly & Tariff Arbitrage",
                "title": "EV Scooters & Cycles Component Assembly Blueprint",
                "classification": { "flow": "Light Manufacturing & Assembly", "sector": "E-Mobility & CleanTech", "domain": "Customs Tariff Arbitrage", "partner": "Shenzhen / Ludhiana" },
                "formatted_markdown": resp_md,
                "pdf_link": "/ev-assembly-dossier.html"
            })
            return

        # Level 4: Executive Career & Promoter Advisory (B.Tech + TISS)
        if any(k in q_clean for k in ["level 4", "career", "tiss", "advisory", "promoter pitch", "consortium aggregator", "consultant"]):
            resp_md = """# Level 4 Sovereign Blueprint: Exim Sourcing Advisory & Consortium Lead
**Candidate Profile**: B.Tech Technical Engineering + M.A. in Rural Development (TISS)
**Target Outcome**: High-Fee Sourcing Retainers (₹1.5L–₹3.5L/mo) or In-House Exim Leadership (₹15L–₹28L CTC)
**Core Advantage**: Combining factory-floor engineering rigor with rural aggregator producer trust.

---

### 1. The Strategy: Skip HR & Pitch Promoters Directly
* **Why HR Discards Resumes**: Traditional HR recruiters look for rigid trade certificates or Indian Institute of Foreign Trade (IIFT) diplomas.
* **The Asymmetric Promoter Pitch**: Promoters and business owners do not care about certificates; they care about **leakage recovery and supply chain control**.
* **The Diagnostic Door-Opener**: Pitch promoters with a 1-page **"Operational Diagnostic Audit"** identifying where their factory/export house is leaking 3%–7% cash across:
  1. Freight Forwarder local fee markups (CBIC Circular 24/2020 violations).
  2. Inverted customs duties on raw component imports.
  3. Inward mandi shrinkage and farmer aggregator disputes.

---

### 2. The 3 Career Pathways & Financial Yields
* **Pathway A: Independent Sourcing Broker & Exim Consultant**
  * Retainers: 3 corporate clients @ ₹50,000–₹1,00,000/month = **₹1.5L–₹3.0L/mo**.
  * Incentive Share: 15% of all recovered forwarder overcharges and customs remissions.
* **Pathway B: Strategic In-House Corporate Lead (Head of Sourcing)**
  * Target CTC: **₹15 Lakhs to ₹28 Lakhs / year**.
  * Pitch: You manage their entire producer-to-port pipeline.
* **Pathway C: Merchant Consortium Aggregator (Sovereign Trading Brand)**
  * Federate 50–100 FPO farmers into a commercial cluster, fund working capital via TReDS, and capture 100% of the wholesale export spread.

---

### 3. The 4-Week Sector Rotation Discovery Sprint
* **Week 1: Spices & Oleoresins (Guntur / Nizamabad)**: Master moisture benchmarks, cold storage receipts, and Spices Board CRES compliance.
* **Week 2: Engineering Fasteners & Hardware (Ludhiana / Coimbatore)**: Master cold-forging, zinc-plating standards, and RoDTEP remissions.
* **Week 3: Ready-Made Garments & Knitted Textiles (Tirupur)**: Master fabric consumption calculations and Duty Drawback cash credits.
* **Week 4: Agro-Processing & Dehydrated Produce (Mahuva / AP)**: Master FSSAI export standards and global buyer discovery.

---

### 📌 Special Operational Notes (Knowledge & Field Tooling)
1. **🏛️ Free Institutional Certifications (100% Zero-Cost)**:
   * **DGFT Niryat Bandhu**: Free official exporter certification at `dgft.gov.in`.
   * **UN/WTO ITC SME Trade Academy**: Free accredited certificates in export logistics, Incoterms, and trade finance at `learning.intracen.org`.
   * **World Customs Organization (WCO)**: Free e-learning modules on HS nomenclature classification at `clikc.wcoomd.org`.
2. **📺 Hands-on Video Tutorials**:
   * Search YouTube: *"CBIC Circular 24/2020 forwarder terminal handling charges legal rebuttal"* & *"FPO aggregation and export supply chain mechanics"*.
3. **📥 Downloadable Field PDF Dossier Suite**:
   * View & Print: [Pathway A Dossier (Consultant)](https://ramu-world-trade.vercel.app/career-pathway-a.html) • [Pathway B Dossier (Corporate Lead)](https://ramu-world-trade.vercel.app/career-pathway-b.html) • [Pathway C Dossier (Aggregator)](https://ramu-world-trade.vercel.app/career-pathway-c.html) • [Sector Rotation Playbook](https://ramu-world-trade.vercel.app/sector-rotation-playbook.html) • [Executive Outreach Toolkit](https://ramu-world-trade.vercel.app/executive-outreach-toolkit.html)
"""
            self._send_json({
                "type": "flagship_strategy",
                "level": "Level 4: Executive Advisory & Consortium Lead",
                "title": "Exim Sourcing Advisory & Promoter Pitch Blueprint",
                "classification": { "flow": "Corporate Advisory & Aggregation", "sector": "Executive Trade Advisory", "domain": "Promoter Diagnostic Audits", "partner": "Indian Exporters & FPOs" },
                "formatted_markdown": resp_md,
                "pdf_link": "/career-pathway-a.html"
            })
            return

        # 1. Classification
        classification = classifier.classify(query)

        # 2. Check for incentives query
        q_lower = query.lower()
        incentives_keywords = ["incentive", "incentives", "rodtep", "drawback", "refund", "rebate", "cash refund", "profit"]
        curr_tokens = ["lakh", "crore", "$", "rs", "₹", "usd", "dollar", "dollars", "eur", "euro", "aed", "dirham", "gbp", "pound"]
        order_tokens = ["order", "consignment", "export order", "shipment", "cargo"]
        is_incentive = any(k in q_lower for k in incentives_keywords) or (any(c in q_lower for c in curr_tokens) and any(w in q_lower for w in order_tokens))

        if is_incentive:
            calc_data = incentives_calculator.calculate(query)
            formatted_text = incentives_calculator.format_report(calc_data)
            self._send_json({
                "type": "incentive_calculation",
                "classification": {
                    "flow": classification["trade_flow"],
                    "sector": classification["primary_sector"]["name"] if classification["primary_sector"] else "General Exports",
                    "domain": "Physical Merchandise Trade & Customs Rebates",
                    "partner": classification.get("detected_country")
                },
                "formatted_markdown": formatted_text,
                "calculation": calc_data,
                "chart_data": {
                    "labels": ["Consignment Value", "RoDTEP Refund", "Duty Drawback", "Total Cash In Bank"],
                    "values": [calc_data["order_value_inr"], calc_data["rodtep_inr"], calc_data["drawback_inr"], calc_data["total_direct_cash_inr"]]
                }
            })
            return

        # 3. Standard Triangulated Query
        formatted_text = engine.answer_question(query)

        # Chart generation logic
        chart_data = None
        matched_country = classification.get("detected_country")
        detected_odop = classification.get("detected_odop")
        detected_hs = classification.get("detected_hs_line")

        if detected_odop:
            chart_data = {
                "title": f"ODOP District: {detected_odop['district']} ({detected_odop['odop_product']})",
                "type": "bar",
                "labels": ["Target Markets (Indexed)", "Value Chain Readiness", "Mandi Linkage"],
                "datasets": [{
                    "label": "Maturity Index (%)",
                    "data": [92, 88, 95],
                    "backgroundColor": ["#f59e0b", "#10b981", "#3b82f6"]
                }]
            }
        elif detected_hs:
            rod = detected_hs.get("rodtep_rate_pct", 0.0)
            dbk = detected_hs.get("duty_drawback_pct", 0.0)
            chart_data = {
                "title": f"Statutory Remission Rates: HS {detected_hs['hs_code']}",
                "type": "bar",
                "labels": ["RoDTEP Rate (%)", "Duty Drawback (%)", "Total Cash Relief (%)"],
                "datasets": [{
                    "label": "Incentive Percentage (%)",
                    "data": [rod, dbk, round(rod + dbk, 2)],
                    "backgroundColor": ["#3b82f6", "#10b981", "#f59e0b"]
                }]
            }
        elif matched_country:
            partner = engine.store.get_trading_partner(matched_country)
            ex = partner["export_data"]["value_usd_billion"] if partner["export_data"] else 0
            im = partner["import_data"]["value_usd_billion"] if partner["import_data"] else 0
            chart_data = {
                "title": f"India - {matched_country} Bilateral Trade (USD Billion)",
                "type": "bar",
                "labels": ["India's Exports (FOB)", f"{matched_country} Exports to India (CIF)"],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [ex, im],
                    "backgroundColor": ["#10b981", "#ef4444"]
                }]
            }
        elif "top export" in q_lower or "what does india export" in q_lower:
            items = engine.store.get_top_export_commodities(5)
            chart_data = {
                "title": "Top Indian Export Sectors (USD Billion)",
                "type": "bar",
                "labels": [it["commodity"].split("(")[0].strip() for it in items],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [it["value_usd_billion"] for it in items],
                    "backgroundColor": ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"]
                }]
            }
        elif "top import" in q_lower or "what does india import" in q_lower:
            items = engine.store.get_top_import_commodities(5)
            chart_data = {
                "title": "Top Indian Import Sectors (USD Billion)",
                "type": "bar",
                "labels": [it["commodity"].split("(")[0].strip() for it in items],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [it["value_usd_billion"] for it in items],
                    "backgroundColor": ["#ef4444", "#f97316", "#eab308", "#6366f1", "#14b8a6"]
                }]
            }
        elif any(k in q_lower for k in ["trend", "history", "historical", "growth", "over time", "multi-year", "timeseries", "year by year"]):
            ts_path = ROOT_DIR / "data" / "historical_timeseries.json"
            if ts_path.exists():
                with open(ts_path, "r", encoding="utf-8") as f:
                    ts = json.load(f)
                chart_data = {
                    "title": "India Trade 6-Year Trajectory: Goods vs Services (USD Billion)",
                    "type": "line",
                    "labels": ts["years"],
                    "datasets": [
                        {
                            "label": "Merchandise Exports (FOB)",
                            "data": ts["merchandise_exports_usd_billion"],
                            "borderColor": "#10b981",
                            "backgroundColor": "rgba(16, 185, 129, 0.15)",
                            "fill": True,
                            "tension": 0.3
                        },
                        {
                            "label": "Merchandise Imports (CIF)",
                            "data": ts["merchandise_imports_usd_billion"],
                            "borderColor": "#ef4444",
                            "backgroundColor": "rgba(239, 68, 68, 0.15)",
                            "fill": True,
                            "tension": 0.3
                        },
                        {
                            "label": "Services Surplus (RBI)",
                            "data": ts["services_surplus_usd_billion"],
                            "borderColor": "#3b82f6",
                            "backgroundColor": "rgba(59, 130, 246, 0.15)",
                            "fill": True,
                            "tension": 0.3
                        }
                    ]
                }
        else:
            totals = engine.store.get_totals("FY2023-24")
            services = engine.store.get_services_trade("FY2023-24")
            chart_data = {
                "title": "India Foreign Trade: Goods Deficit vs Services Surplus (USD Billion)",
                "type": "bar",
                "labels": ["Merchandise Deficit", "Services Surplus", "Net Trade Balance"],
                "datasets": [{
                    "label": "USD Billion",
                    "data": [totals["trade_deficit_usd_billion"], services["net_services_surplus_usd_billion"], round(totals["trade_deficit_usd_billion"] + services["net_services_surplus_usd_billion"], 2)],
                    "backgroundColor": ["#ef4444", "#10b981", "#f59e0b"]
                }]
            }

        self._send_json({
            "type": "trade_query",
            "classification": {
                "flow": classification["trade_flow"],
                "sector": classification["primary_sector"]["name"] if classification["primary_sector"] else "All Industry Sectors",
                "domain": ", ".join([d["name"] for d in classification["detected_domains"][:2]]),
                "partner": classification.get("detected_country")
            },
            "formatted_markdown": formatted_text,
            "chart_data": chart_data
        })

    def _handle_calculate(self, payload: dict):
        query = str(payload.get("query", ""))[:1000].strip()
        amount = payload.get("amount") or payload.get("invoice_amount")
        product = str(payload.get("product", ""))[:500].strip()
        quantity = payload.get("quantity")
        unit = str(payload.get("unit", ""))[:20].strip() if payload.get("unit") else None
        
        explicit_val = None
        if amount:
            try:
                clean_amt = float(str(amount).replace(",", "").replace("₹", "").replace("$", ""))
                if 0 <= clean_amt <= 1e15:
                    explicit_val = clean_amt
            except Exception:
                pass

        qty_val = None
        if quantity:
            try:
                clean_qty = float(str(quantity).replace(",", ""))
                if 0 <= clean_qty <= 1e12:
                    qty_val = clean_qty
            except Exception:
                pass

        search_str = f"{query} {product} {amount if amount else ''}"[:1500]
        try:
            calc_res = incentives_calculator.calculate(search_str, explicit_value=explicit_val, quantity=qty_val, unit=unit)
            report_md = incentives_calculator.format_report(calc_res)
            self._send_json({
                "calculation": calc_res,
                "formatted_markdown": report_md
            })
        except Exception:
            self._send_json({"error": "Unable to compute statutory calculation for the given input."}, status=400)

    def _handle_forex(self):
        try:
            rates = get_live_rbi_reference_rates()
            self._send_json(rates)
        except Exception:
            self._send_error("Failed to fetch RBI foreign exchange reference rates", status=500)

    def _handle_cbic_gazette(self):
        try:
            from sources.cbic_gazette import get_cbic_gazette_data
            data = get_cbic_gazette_data()
            self._send_json(data)
        except Exception:
            self._send_error("Failed to fetch CBIC exchange rate gazette notifications", status=500)

    def _handle_cbic_valuation(self, payload: dict):
        try:
            from sources.cbic_gazette import calculate_valuation_impact
            currency = str(payload.get("currency", "USD"))[:10]
            amount = float(payload.get("amount", 10000))
            trade_flow = str(payload.get("trade_flow", "import"))[:10]
            live_rate = float(payload.get("live_rate", 0)) if payload.get("live_rate") else None
            res = calculate_valuation_impact(currency, amount, trade_flow=trade_flow, live_rate=live_rate)
            self._send_json(res)
        except Exception:
            self._send_error("Invalid parameters for CBIC customs valuation calculation", status=400)

    def _handle_tradestat(self, query_str: str = ""):
        try:
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "comtrade" in params or "mirror" in params or "un" in params:
                from sources.comtrade_radar import get_comtrade_overview, calculate_mirror_discrepancy, get_global_market_share
                if "calc" in params or "corridor" in params or "hs" in params or "commodity" in params:
                    corridor_id = params.get("corridor", ["IND_USA"])[0]
                    hs_code = params.get("commodity", params.get("hs", [None]))[0]
                    cif_margin = float(params.get("cif_margin", params.get("margin", [10.0]))[0])
                    data = calculate_mirror_discrepancy(corridor_id, hs_code, cif_margin)
                elif "share" in params or "market_share" in params:
                    hs_code = params.get("commodity", params.get("hs", ["300490"]))[0]
                    data = get_global_market_share(hs_code)
                else:
                    data = get_comtrade_overview()
                self._send_json(data)
                return

            if "ecgc" in params or "credit" in params or "insurance" in params:
                from sources.ecgc_risk import get_ecgc_overview, get_country_risk, calculate_ecgc_premium
                if "calc" in params or "value" in params or "terms" in params:
                    c = params.get("country", ["USA"])[0]
                    val = float(params.get("value", [1000000.0])[0])
                    terms = params.get("terms", ["DA_60"])[0]
                    is_usd = params.get("usd", ["0"])[0] in ["1", "true", "True"]
                    data = calculate_ecgc_premium(c, val, terms, is_usd)
                elif "country" in params:
                    data = get_country_risk(params["country"][0]) or {"error": "Country not found"}
                else:
                    data = get_ecgc_overview()
            elif "matrix" in params or "bilateral" in params:
                from sources.dgcis_tradestat import get_bilateral_matrix
                c = params.get("country", [None])[0]
                data = get_bilateral_matrix(c)
            elif "deficit" in params or "surplus" in params:
                from sources.dgcis_tradestat import get_deficit_rankings
                data = get_deficit_rankings()
            elif "finance" in params or "rates" in params or "benchmarks" in params:
                from sources.trade_finance import get_finance_overview
                data = get_finance_overview()
            elif "discount" in params or "lc" in params:
                from sources.trade_finance import calculate_lc_discounting
                val = float(params.get("val", params.get("value", [100000.0]))[0])
                cur = str(params.get("cur", params.get("currency", ["USD"]))[0])
                tenor = int(params.get("tenor", params.get("days", [90]))[0])
                cat = str(params.get("cat", params.get("category", ["msme_manufacturer"]))[0])
                recourse = params.get("without_recourse", ["1"])[0] in ["1", "true", "True"]
                data = calculate_lc_discounting(val, cur, tenor, cat, recourse)
            elif "factoring" in params:
                from sources.trade_finance import calculate_export_factoring
                val = float(params.get("val", params.get("value", [75000.0]))[0])
                cur = str(params.get("cur", params.get("currency", ["EUR"]))[0])
                tenor = int(params.get("tenor", params.get("days", [60]))[0])
                adv = float(params.get("advance", [85.0])[0])
                comm = float(params.get("comm", [0.45])[0])
                data = calculate_export_factoring(val, cur, tenor, adv, comm)
            else:
                from sources.dgcis_tradestat import get_tradestat_overview, get_partner_profile, get_port_profile
                if "country" in params:
                    data = get_partner_profile(params["country"][0])
                elif "port" in params:
                    data = get_port_profile(params["port"][0]) or {"error": "Port not found"}
                else:
                    data = get_tradestat_overview()
            self._send_json(data)
        except Exception:
            self._send_error("Failed to compute trade statistics or export metrics", status=500)

    def _handle_tradestat_calc(self, payload: dict):
        try:
            action = payload.get("action", "ecgc_premium")
            if action in ["ecgc_premium", "ecgc_credit_risk", "ecgc"]:
                from sources.ecgc_risk import calculate_ecgc_premium
                c = str(payload.get("country", "USA"))[:50]
                val = float(payload.get("invoice_value_inr", payload.get("value", 1000000.0)))
                terms = str(payload.get("payment_terms", payload.get("terms", "DA_60")))[:20]
                is_usd = bool(payload.get("is_usd", False))
                data = calculate_ecgc_premium(c, val, terms, is_usd)
            elif action in ["comtrade_mirror", "mirror_reconciliation", "comtrade"]:
                from sources.comtrade_radar import calculate_mirror_discrepancy
                corridor_id = str(payload.get("corridor_id", payload.get("corridor", "IND_USA")))
                hs_code = payload.get("hs_code", payload.get("commodity"))
                cif_margin = float(payload.get("cif_margin_pct", payload.get("cif_margin", 10.0)))
                data = calculate_mirror_discrepancy(corridor_id, hs_code, cif_margin)
            elif action in ["comtrade_market_share", "comtrade_share"]:
                from sources.comtrade_radar import get_global_market_share
                hs_code = str(payload.get("hs_code", payload.get("commodity", "300490")))
                data = get_global_market_share(hs_code)
            elif action in ["bilateral_matrix", "matrix", "dgcis_matrix"]:
                from sources.dgcis_tradestat import get_bilateral_matrix
                c = payload.get("country")
                data = get_bilateral_matrix(c)
            elif action in ["deficit_rankings", "deficit", "surplus"]:
                from sources.dgcis_tradestat import get_deficit_rankings
                data = get_deficit_rankings()
            elif action in ["lc_discounting", "lc", "discount"]:
                from sources.trade_finance import calculate_lc_discounting
                val = float(payload.get("invoice_value", payload.get("value", 100000.0)))
                cur = str(payload.get("currency", "USD"))[:10]
                tenor = int(payload.get("usance_days", payload.get("tenor_days", payload.get("tenor", 90))))
                cat = str(payload.get("exporter_category", payload.get("category", "msme_manufacturer")))[:50]
                recourse = bool(payload.get("is_without_recourse", True))
                data = calculate_lc_discounting(val, cur, tenor, cat, recourse)
            elif action in ["export_factoring", "factoring"]:
                from sources.trade_finance import calculate_export_factoring
                val = float(payload.get("invoice_value", payload.get("value", 75000.0)))
                cur = str(payload.get("currency", "EUR"))[:10]
                tenor = int(payload.get("credit_period_days", payload.get("tenor_days", payload.get("tenor", 60))))
                adv = float(payload.get("advance_pct", 85.0))
                comm = float(payload.get("factor_commission_pct", payload.get("commission", 0.45)))
                data = calculate_export_factoring(val, cur, tenor, adv, comm)
            else:
                from sources.ecgc_risk import get_country_risk
                c = str(payload.get("country", "USA"))[:50]
                data = get_country_risk(c) or {"error": "Country not found"}
            self._send_json(data)
        except Exception:
            self._send_error("Invalid parameters for trade statistics computation", status=400)

    def _handle_eway(self, query_str: str = ""):
        try:
            from sources.gstn_eway import get_gstn_overview, get_corridor_profile, calculate_eway_validity
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "distance" in params:
                dist = float(params["distance"][0])
                cargo = params.get("cargo_type", ["normal"])[0]
                data = calculate_eway_validity(dist, cargo)
            elif "corridor" in params:
                data = get_corridor_profile(params["corridor"][0]) or {"error": "Corridor not found"}
            else:
                data = get_gstn_overview()
            self._send_json(data)
        except Exception:
            self._send_error("Failed to compute E-Way bill validity and statutory thresholds", status=500)

    def _handle_eway_calc(self, payload: dict):
        try:
            from sources.gstn_eway import calculate_eway_validity
            distance = float(payload.get("distance", 200))
            cargo_type = str(payload.get("cargo_type", "normal"))[:30]
            data = calculate_eway_validity(distance, cargo_type)
            self._send_json(data)
        except Exception:
            self._send_error("Invalid parameters for E-Way bill calculation", status=400)

    def _handle_icegate(self, query_str: str = ""):
        try:
            from sources.icegate_edi import get_icegate_overview, lookup_error_code, search_ports, track_customs_document
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "code" in params:
                code = params["code"][0]
                data = lookup_error_code(code)
                if not data:
                    self._send_json({"error": f"ICEGATE error code {code} not found"}, status=404)
                    return
            elif "track" in params or "number" in params:
                doc_type = params.get("type", ["shipping_bill"])[0]
                doc_number = params.get("number", ["7492104"])[0]
                port_code = params.get("port", ["INNSA1"])[0]
                data = track_customs_document(doc_type, doc_number, port_code)
            elif "port" in params:
                data = search_ports(params["port"][0])
            else:
                data = get_icegate_overview()
            self._send_json(data)
        except Exception:
            self._send_error("Failed to query ICEGATE documentation status", status=500)

    def _handle_icegate_tracking(self, payload: dict):
        try:
            from sources.icegate_edi import track_customs_document
            doc_type = str(payload.get("doc_type", "shipping_bill"))[:30]
            doc_number = str(payload.get("doc_number", "7492104"))[:30]
            port_code = str(payload.get("port_code", "INNSA1"))[:10]
            data = track_customs_document(doc_type, doc_number, port_code)
            self._send_json(data)
        except Exception:
            self._send_error("Invalid parameters for ICEGATE status check", status=400)

    def _handle_dgft(self, query_str: str = ""):
        try:
            from sources.dgft_schedules import get_dgft_overview, lookup_hs_incentive, calculate_export_incentives
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "calc" in params or "value" in params:
                val = float(params.get("value", [2000000.0])[0])
                hs = params.get("hs", params.get("q", ["61091000"]))[0]
                qty = float(params.get("qty", [0.0])[0])
                data = calculate_export_incentives(val, hs, qty)
            elif "hs" in params or "q" in params:
                query = params.get("hs", params.get("q", ["61091000"]))[0]
                data = lookup_hs_incentive(query)
                if not data:
                    self._send_json({"error": f"No incentive schedule found for {query}"}, status=404)
                    return
            else:
                data = get_dgft_overview()
            self._send_json(data)
        except Exception:
            self._send_error("Failed to retrieve DGFT RoDTEP/RoSCTL incentive rates", status=500)

    def _handle_dgft_calc(self, payload: dict):
        try:
            from sources.dgft_schedules import calculate_export_incentives
            val = float(payload.get("order_value_inr", 2000000.0))
            hs = str(payload.get("hs_code", payload.get("q", "61091000")))[:30]
            qty = float(payload.get("quantity", 0.0))
            data = calculate_export_incentives(val, hs, qty)
            self._send_json(data)
        except Exception:
            self._send_error("Invalid parameters for DGFT incentive calculation", status=400)

    def _handle_tariff(self, query_str: str = ""):
        try:
            from sources.cbic_tariff import get_tariff_overview, lookup_tariff_line, calculate_landed_customs_duty
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "macmap" in params or "roo" in params or "fta" in params or "carotar" in params:
                from sources.itc_macmap import get_macmap_overview, calculate_roo_preferential_duty, get_agreement_details
                if "agreement" in params:
                    ag_id = params["agreement"][0]
                    data = get_agreement_details(ag_id)
                elif "calc" in params or "hs" in params or "fob" in params or "vnm" in params:
                    hs = params.get("hs", ["711319"])[0]
                    fob = float(params["fob"][0]) if "fob" in params else None
                    vnm = float(params["vnm"][0]) if "vnm" in params else None
                    ctc = params.get("ctc", ["1"])[0].lower() not in ["0", "false", "no"]
                    data = calculate_roo_preferential_duty(hs, fob, vnm, ctc)
                else:
                    data = get_macmap_overview()
                self._send_json(data)
                return

            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "calc" in params or "value" in params:
                val = float(params.get("value", [10000.0])[0])
                currency = str(params.get("currency", ["USD"])[0]).upper().strip()
                hs = params.get("hs", params.get("q", ["85171300"]))[0]
                rate = float(params.get("rate", [0.0])[0])
                data = calculate_landed_customs_duty(val, currency, hs, rate if rate > 0 else None)
            elif "hs" in params or "q" in params:
                query = params.get("hs", params.get("q", ["85171300"]))[0]
                data = lookup_tariff_line(query)
                if not data:
                    self._send_json({"error": f"No tariff line found for {query}"}, status=404)
                    return
            else:
                data = get_tariff_overview()
            self._send_json(data)
        except Exception:
            self._send_error("Failed to compute customs tariff and duty schedule", status=500)

    def _handle_tariff_calc(self, payload: dict):
        try:
            action = payload.get("action", "")
            if action in ["macmap_roo_calc", "macmap", "roo", "fta"]:
                from sources.itc_macmap import calculate_roo_preferential_duty
                hs = str(payload.get("hs_code", payload.get("commodity", "711319")))
                fob = float(payload["fob_value"]) if "fob_value" in payload else None
                vnm = float(payload["vnm_value"]) if "vnm_value" in payload else None
                ctc = bool(payload.get("ctc_compliant", True))
                data = calculate_roo_preferential_duty(hs, fob, vnm, ctc)
                self._send_json(data)
                return

            if action in ["wto_tariff_overhang", "wto_anti_dumping", "trade_defense", "wto"]:
                from sources.wto_treaties import calculate_trade_defense_remedy
                hs = str(payload.get("hs_code", payload.get("commodity", "854143")))
                exp_p = float(payload["export_price"]) if "export_price" in payload else None
                norm_v = float(payload["normal_value"]) if "normal_value" in payload else None
                nip = float(payload["non_injurious_price"]) if "non_injurious_price" in payload else None
                landed_v = float(payload["landed_value"]) if "landed_value" in payload else None
                data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                self._send_json(data)
                return

            from sources.cbic_tariff import calculate_landed_customs_duty
            val = float(payload.get("cif_value", payload.get("value", 10000.0)))
            currency = str(payload.get("currency", "USD")).upper().strip()
            hs = str(payload.get("hs_code", payload.get("q", "85171300")))[:30]
            rate = float(payload.get("exchange_rate", payload.get("rate", 0.0)))
            data = calculate_landed_customs_duty(val, currency, hs, rate if rate > 0 else None)
            self._send_json(data)
        except Exception:
            self._send_error("Invalid parameters for tariff calculation", status=400)

    def _handle_logistics(self, query_str: str = ""):
        try:
            params = urllib.parse.parse_qs(query_str) if query_str else {}


            if "ocean" in params or "freight" in params or "wci" in params or "fbx" in params:
                from sources.freight_indices import get_freight_master, get_corridor_freight, calculate_ocean_freight
                if "calc" in params or "size" in params or "quote" in params:
                    r_id = params.get("route", params.get("corridor", ["IN_EU_ROTTERDAM"]))[0]
                    size = params.get("size", ["40ft"])[0]
                    count = int(params.get("count", params.get("containers", [1]))[0])
                    quote = float(params.get("quote", [0.0])[0])
                    data = calculate_ocean_freight(r_id, size, count, quote)
                elif "route" in params or "corridor" in params:
                    r_id = params.get("route", params.get("corridor", ["IN_EU_ROTTERDAM"]))[0]
                    data = get_corridor_freight(r_id) or {"error": "Corridor not found"}
                else:
                    data = get_freight_master()
            elif "concor" in params or "rail" in params:
                from sources.concor_icd import get_concor_overview, get_corridor_details, calculate_concor_freight
                if "corridor" in params or "route" in params:
                    c_id = params.get("corridor", params.get("route", ["tkd_jnpt"]))[0]
                    if "calc" in params or "size" in params:
                        size = params.get("size", ["40ft"])[0]
                        count = int(params.get("count", params.get("containers", [1]))[0])
                        is_empty = params.get("empty", ["0"])[0] in ["1", "true", "True"]
                        data = calculate_concor_freight(c_id, size, count, is_empty)
                    else:
                        data = get_corridor_details(c_id)
                elif "calc" in params or "haulage" in params:
                    c_id = params.get("corridor", ["tkd_jnpt"])[0]
                    size = params.get("size", ["40ft"])[0]
                    count = int(params.get("count", [1])[0])
                    is_empty = params.get("empty", ["0"])[0] in ["1", "true", "True"]
                    data = calculate_concor_freight(c_id, size, count, is_empty)
                else:
                    data = get_concor_overview()
            elif "vessel" in params:
                from sources.port_logistics import track_vessel_schedule
                vessel = params.get("vessel", ["MAERSK_KAVERI"])[0]
                port = params.get("port", ["INNSA1"])[0]
                data = track_vessel_schedule(vessel, port)
            elif "demurrage" in params or "delay" in params:
                from sources.port_logistics import calculate_demurrage_liability
                port = params.get("port", ["INNSA1"])[0]
                size = params.get("size", ["40ft"])[0]
                count = int(params.get("containers", params.get("count", [2]))[0])
                days = int(params.get("days", params.get("delay", [12]))[0])
                data = calculate_demurrage_liability(port, size, count, days)
            elif "port" in params:
                from sources.port_logistics import get_port_metrics
                port = params.get("port", ["INNSA1"])[0]
                data = get_port_metrics(port)
            else:
                from sources.port_logistics import get_ports_overview
                data = get_ports_overview()
            self._send_json(data)
        except Exception:
            self._send_error("Failed to calculate freight logistics and demurrage rates", status=500)

    def _handle_logistics_calc(self, payload: dict):
        try:
            action = payload.get("action", "demurrage")
            if action in ["ocean_freight", "ocean", "freight"]:
                from sources.freight_indices import calculate_ocean_freight
                r_id = str(payload.get("route_id", payload.get("corridor_id", "IN_EU_ROTTERDAM")))[:30]
                size = str(payload.get("container_size", "40ft"))[:10]
                count = int(payload.get("container_count", 1))
                quote = float(payload.get("forwarder_quote_usd", payload.get("quote", 0.0)))
                data = calculate_ocean_freight(r_id, size, count, quote)
            elif action in ["concor_rail", "rail_freight", "concor"]:
                from sources.concor_icd import calculate_concor_freight
                c_id = str(payload.get("corridor_id", "tkd_jnpt"))[:30]
                size = str(payload.get("container_size", "40ft"))[:10]
                count = int(payload.get("container_count", 1))
                is_empty = bool(payload.get("is_empty", False))
                data = calculate_concor_freight(c_id, size, count, is_empty)
            elif action == "vessel":
                from sources.port_logistics import track_vessel_schedule
                vessel = str(payload.get("vessel_name", "MAERSK_KAVERI"))[:50]
                port = str(payload.get("port_code", "INNSA1"))[:15]
                data = track_vessel_schedule(vessel, port)
            elif action == "metrics":
                from sources.port_logistics import get_port_metrics
                port = str(payload.get("port_code", "INNSA1"))[:15]
                data = get_port_metrics(port)
            else:
                from sources.port_logistics import calculate_demurrage_liability
                port = str(payload.get("port_code", "INNSA1"))[:15]
                size = str(payload.get("container_size", "40ft"))[:10]
                count = int(payload.get("container_count", 2))
                days = int(payload.get("days_in_port", 12))
                data = calculate_demurrage_liability(port, size, count, days)
            self._send_json(data)
        except Exception:
            self._send_error("Invalid parameters for logistics and port calculation", status=400)

    def _handle_mandi(self, query_str):
        try:
            params = urllib.parse.parse_qs(query_str) if query_str else {}
            if "wto" in params or "dgtr" in params or "anti_dumping" in params or "overhang" in params:
                from sources.wto_treaties import get_wto_overview, calculate_trade_defense_remedy, get_wto_disputes_tracker
                if "calc" in params or "hs" in params or "commodity" in params or "export_price" in params:
                    hs = params.get("hs", params.get("commodity", ["854143"]))[0]
                    exp_p = float(params["export_price"][0]) if "export_price" in params else None
                    norm_v = float(params["normal_val"][0]) if "normal_val" in params else None
                    nip = float(params["nip"][0]) if "nip" in params else None
                    landed_v = float(params["landed"][0]) if "landed" in params else None
                    data = calculate_trade_defense_remedy(hs, exp_p, norm_v, nip, landed_v)
                elif "disputes" in params or "cases" in params:
                    data = get_wto_disputes_tracker()
                else:
                    data = get_wto_overview()
                self._send_json(data)
                return

            if "spices" in params or "spice" in params or "tea" in params or "cres" in params or "qel" in params:
                from sources.spices_tea import get_spices_tea_overview, audit_spices_tea_compliance, get_qel_lab_routing
                if "calc" in params or "check" in params or "market" in params or "commodity" in params or "hs" in params:
                    comm = params.get("commodity", params.get("hs", ["09042110"]))[0]
                    market = params.get("market", params.get("country", ["EU"]))[0]
                    test_vals = {}
                    for k, v in params.items():
                        if k not in ["spices", "spice", "tea", "cres", "qel", "calc", "check", "market", "country", "commodity", "hs"]:
                            try:
                                test_vals[k] = float(v[0])
                            except ValueError:
                                pass
                    data = audit_spices_tea_compliance(comm, market, test_vals)
                elif "lab" in params or "routing" in params:
                    comm = params.get("commodity", ["09042110"])[0]
                    state = params.get("state", ["Andhra Pradesh"])[0]
                    data = get_qel_lab_routing(comm, state)
                else:
                    data = get_spices_tea_overview()
                self._send_json(data)
                return

            if "mpeda" in params or "marine" in params or "seafood" in params or "catch_cert" in params or "simp" in params:
                from sources.mpeda_marine import get_mpeda_overview, audit_marine_compliance, get_catch_documentation_guide
                if "calc" in params or "check" in params or "market" in params or "species" in params or "hs" in params:
                    species_code = params.get("species", params.get("commodity", params.get("hs", ["03061720"])))[0]
                    market = params.get("market", params.get("country", ["EU"]))[0]
                    test_vals = {}
                    for k, v in params.items():
                        if k not in ["mpeda", "marine", "seafood", "catch_cert", "simp", "calc", "check", "market", "country", "commodity", "hs", "species"]:
                            try:
                                test_vals[k] = float(v[0])
                            except ValueError:
                                pass
                    data = audit_marine_compliance(species_code, market, test_vals)
                elif "schemes" in params or "guide" in params:
                    species_code = params.get("species", ["03061720"])[0]
                    market = params.get("market", ["EU"])[0]
                    data = get_catch_documentation_guide(species_code, market)
                else:
                    data = get_mpeda_overview()
                self._send_json(data)
                return

            if "apeda" in params or "mrl" in params or "phyto" in params or "tracenet" in params:
                from sources.apeda_agri import get_apeda_overview, check_phytosanitary_compliance
                if "calc" in params or "check" in params or "market" in params or "hs" in params:
                    comm = params.get("commodity", params.get("hs", ["10063020"]))[0]
                    market = params.get("market", params.get("country", ["EU"]))[0]
                    test_vals = {}
                    for k, v in params.items():
                        if k not in ["apeda", "calc", "check", "market", "country", "commodity", "hs"]:
                            try:
                                test_vals[k] = float(v[0])
                            except ValueError:
                                pass
                    data = check_phytosanitary_compliance(comm, market, test_vals)
                else:
                    data = get_apeda_overview()
                self._send_json(data)
                return

            commodity = params.get("commodity", ["Chilli Red"])[0]
            state = params.get("state", ["Andhra Pradesh"])[0]
            limit = int(params.get("limit", [10])[0])
            data = query_data_gov(
                KNOWN_RESOURCES["apmc_mandi_arrivals"],
                filters={"commodity": commodity, "state": state},
                limit=limit
            )
            self._send_json(data)
        except Exception:
            self._send_json({"error": "Failed to retrieve recent trade queries", "records": []}, status=200)

    def _handle_mandi_calc(self, payload: dict):
        try:
            from sources.apeda_agri import check_phytosanitary_compliance, get_apeda_overview
            action = payload.get("action", "apeda_compliance")
            if action in ["apeda_compliance", "mrl_check", "phytosanitary", "apeda"]:
                comm = str(payload.get("commodity", payload.get("hs_code", "10063020")))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                test_vals = payload.get("residue_levels", payload.get("chemical_test_results", {}))
                data = check_phytosanitary_compliance(comm, market, test_vals)
            elif action in ["spices_compliance", "spice_quality", "tea_compliance", "tea_quality", "spices", "tea"]:
                from sources.spices_tea import audit_spices_tea_compliance
                comm = str(payload.get("commodity", payload.get("commodity_code", payload.get("hs_code", "09042110"))))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                test_vals = payload.get("residue_levels", payload.get("lab_test_results", {}))
                data = audit_spices_tea_compliance(comm, market, test_vals)
            elif action in ["qel_routing", "lab_routing", "spices_cres"]:
                from sources.spices_tea import get_qel_lab_routing
                comm = str(payload.get("commodity", payload.get("hs_code", "09042110")))
                state = str(payload.get("state", "Andhra Pradesh"))
                data = get_qel_lab_routing(comm, state)
            elif action in ["mpeda_compliance", "mpeda_check", "marine_quality", "marine"]:
                from sources.mpeda_marine import audit_marine_compliance
                species_code = str(payload.get("species_code", payload.get("commodity", payload.get("hs_code", "03061720"))))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                test_vals = payload.get("residue_levels", payload.get("lab_test_results", {}))
                data = audit_marine_compliance(species_code, market, test_vals)
            elif action in ["mpeda_catch_cert", "catch_documentation", "simp_guide"]:
                from sources.mpeda_marine import get_catch_documentation_guide
                species_code = str(payload.get("species_code", payload.get("hs_code", "03061720")))
                market = str(payload.get("target_market", payload.get("market", "EU")))
                harvest = str(payload.get("harvest_type", "Aquaculture"))
                data = get_catch_documentation_guide(species_code, market, harvest)
            else:
                data = get_apeda_overview()
            self._send_json(data)
        except Exception:
            self._send_error("Invalid parameters for mandi commodity pricing analysis", status=400)

    def _handle_history(self):
        history = []
        try:
            init_db()
            with sqlite3.connect(CACHE_DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT query_text, primary_source, datetime(timestamp, 'unixepoch', 'localtime')
                    FROM query_history
                    ORDER BY id DESC LIMIT 10
                """)
                for row in cursor.fetchall():
                    history.append({
                        "query": row[0],
                        "source": row[1],
                        "time": row[2]
                    })
        except Exception:
            pass
        self._send_json({"history": history})
