# World of Trade (India Edition)

> **Official Indian Trade Intelligence & Triangulation Engine**  
> *100% Free Tier Guaranteed • Zero Cloud Billing • Statutory Multi-Agency Audit Trail*

---

## Overview

**World of Trade** is an automated trade intelligence engine and iOS Native-Feel Progressive Web Application (PWA) built specifically for Indian trade, exports, imports, and domestic commerce.

It eliminates hallucinated numbers from generic AI by querying and triangulating official statutory databases—**DGCI&S (Customs)**, **Reserve Bank of India (RBI Balance of Payments)**, **UN Comtrade (Partner Mirror Data)**, and **GSTN (Domestic e-Way Bills)**—and attaching a verifiable **Statutory Audit Proof Badge** to every answer.

---

## Key Features

### 1. Multi-Source Statutory Triangulation
- **Physical Merchandise**: Official 8-digit ITC-HS trade values from the Directorate General of Commercial Intelligence and Statistics (DGCI&S).
- **Financial Settlements**: Foreign currency inflows and services surplus (IT/GCCs) from the Reserve Bank of India (RBI DBIE).
- **International Mirror Reconciliation**: Cross-references partner country customs (UN Comtrade / US Census Bureau) to account for **FOB vs. CIF freight and insurance margins** (typically 6%–9%).
- **Domestic Commerce ("In India")**: Real-time freight volume and state-to-state movement from GSTN e-Way bills.

### 2. The 10x Tool: Export Cash & Profit Calculator
- Calculate exact rupee refunds under the **RoDTEP** (DGFT Appendix 4R) and **Duty Drawback** (CBIC Notification) schedules.
- Instantly turns trade queries into actionable profit figures: see exact cash disbursements credited directly into linked exporter bank accounts (+5% to +6% net margin additions).

### 3. Mobile-First iOS Native PWA (iPhone 15 Standards)
- **Ergonomic Thumb-Zone Architecture**: Fixed bottom navigation bar with 5 primary tabs:
  - **Apps**: Search, auto-classification, trade charts, and reconciled records.
  - **Agenda**: APMC mandi auction cycles, RBI rate fixing, and ICEGATE drawback scroll windows.
  - **Scratchpad**: Export cash calculator & consignment notes.
  - **Timer**: Live auction timers and 24-hour e-Way bill countdown clocks.
  - **Profile**: System diagnostics and official directory links.
- **Apple HIG Standards**: 44×44pt tap targets, active scale feedback (`active:scale-95`).
- **Safe Area Insets**: Zero collisions with the iPhone 15 Dynamic Island (`env(safe-area-inset-top)`) or Home Indicator bar (`env(safe-area-inset-bottom)`).
- **Mobile Bottom Sheet**: Swipeable bottom sheet for viewing audit badges and claiming procedures.
- **OLED Performance**: Pure black theme (`#000000`), zero horizontal scroll jitter, and high-contrast typography readable in daylight.

---

## 100% Free Tier Architecture

- **Zero Cloud Costs**: Built on pure Python 3 standard library (`http.server`, `urllib.request`, `sqlite3`). No third-party pip dependencies required.
- **Local SQLite Caching**: All queries and statutory benchmarks are cached locally in `trade_cache.db` for instant 0ms responses.
- **Open Government Data**: Connected to `data.gov.in` public open API.

---

## Quickstart

### 1. Clone the Repository
```bash
git clone https://github.com/BSCConsulting/ramu-world-trade.git
cd ramu-world-trade
```

### 2. Configure Environment Variables
Copy the template and add your free `data.gov.in` API key:
```bash
cp .env.example .env
```
Edit `.env`:
```bash
DATA_GOV_IN_API_KEY="your_free_key_from_data.gov.in"
DATA_GOV_IN_BASE_URL="https://api.data.gov.in/resource"
```

### 3. Run the Web Application
```bash
chmod +x run_app.sh
./run_app.sh
```
Or start the Python server directly:
```bash
python3 server.py 8080
```
Open **[http://localhost:8080](http://localhost:8080)** in your browser.

---

## CLI & Script Usage

You can also query the engine directly from terminal:
```bash
# Bilateral trade reconciliation
python3 ask.py "Compare trade between India and USA"

# Top export commodities
python3 ask.py "What are India's top export commodities?"

# Cash refund calculation
python3 ask.py "I have a ₹20 Lakh export order of cotton shirts to the UK. What is my exact government cash refund?"

# Interactive mode
python3 ask.py --interactive
```

---

## License & Attribution
Data sourced from official statutory publications of the Ministry of Commerce & Industry (DGCI&S), Reserve Bank of India (RBI), United Nations (UN Comtrade), and GSTN.
