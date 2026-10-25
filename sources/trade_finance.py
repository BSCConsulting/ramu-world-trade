"""Trade Finance, Letter of Credit (LC) Discounting & Export Factoring Engine.
Statutory Frameworks:
1. RBI Interest Equalisation Scheme (IES) on Pre/Post-Shipment Rupee Export Credit (DGFT & RBI).
2. ICC Uniform Customs and Practice for Documentary Credits (UCP 600).
3. IFSCA (GIFT City ITFS) & TReDS Cross-Border Factoring Framework.
100% Free Tier, zero external pip dependencies.
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
MASTER_FILE = BASE_DIR / "data" / "trade_finance_master.json"

def _load_master() -> Dict[str, Any]:
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Missing master file: {MASTER_FILE}")
    with open(MASTER_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def get_finance_overview() -> Dict[str, Any]:
    """Returns statutory trade finance benchmarks, IES subvention schedules, and factoring parameters."""
    data = _load_master()
    return {
        "status": "success",
        "metadata": data.get("metadata", {}),
        "benchmarks": data.get("benchmarks", {}),
        "interest_equalisation_scheme": data.get("interest_equalisation_scheme", {}),
        "lc_discounting_rules": data.get("lc_discounting_rules", {}),
        "export_factoring_rules": data.get("export_factoring_rules", {}),
        "presets": data.get("presets", [])
    }

def calculate_lc_discounting(
    invoice_val: float,
    currency: str = "USD",
    usance_days: int = 90,
    exporter_category: str = "msme_manufacturer",
    is_without_recourse: bool = True
) -> Dict[str, Any]:
    """Computes statutory LC usance discounting under UCP 600 with RBI IES subvention."""
    data = _load_master()
    cur = currency.upper().strip()
    benchmarks = data.get("benchmarks", {})
    if cur not in benchmarks:
        cur = "USD"
    
    fx_rate = data.get("metadata", {}).get("currency_rates_inr", {}).get(cur, 84.55)
    bench_data = benchmarks[cur]
    base_rate = bench_data.get("base_rate_pct", 5.30)
    bank_spread = bench_data.get("typical_spread_pct", 1.75)
    
    lc_rules = data.get("lc_discounting_rules", {})
    forfaiting_spread = lc_rules.get("without_recourse_forfaiting_addon_pct", 0.75) if is_without_recourse else 0.0
    gross_rate_pct = round(base_rate + bank_spread + forfaiting_spread, 2)
    
    ies_data = data.get("interest_equalisation_scheme", {})
    ies_cats = ies_data.get("eligibility_categories", {})
    cat_key = exporter_category.lower().strip()
    if cat_key not in ies_cats:
        cat_key = "msme_manufacturer"
    
    cat_info = ies_cats[cat_key]
    subvention_rate_pct = cat_info.get("subvention_rate_pct", 0.0)
    
    # Net interest rate cannot fall below 0.50% operational floor
    net_rate_pct = round(max(0.50, gross_rate_pct - subvention_rate_pct), 2)
    
    # Financial computations
    days = max(15, min(360, usance_days))
    val = max(100.0, float(invoice_val))
    
    gross_interest = round(val * (gross_rate_pct / 100.0) * (days / 365.0), 2)
    subvention_savings = round(val * (subvention_rate_pct / 100.0) * (days / 365.0), 2)
    net_interest = round(gross_interest - subvention_savings, 2)
    
    handling_fee_pct = lc_rules.get("handling_fee_pct", 0.15)
    min_fee_inr = lc_rules.get("min_handling_fee_inr", 2500.0)
    handling_fee = round(max(min_fee_inr / fx_rate, val * (handling_fee_pct / 100.0)), 2)
    
    day1_liquidity = round(val - net_interest - handling_fee, 2)
    
    return {
        "status": "success",
        "mode": "lc_discounting",
        "framework": "ICC UCP 600 & RBI Interest Equalisation Scheme",
        "currency": cur,
        "symbol": bench_data.get("symbol", "$"),
        "fx_rate_to_inr": fx_rate,
        "inputs": {
            "invoice_value": val,
            "invoice_value_inr": round(val * fx_rate, 2),
            "usance_days": days,
            "exporter_category": cat_info.get("title"),
            "is_without_recourse": is_without_recourse
        },
        "rates_breakdown": {
            "benchmark_index": bench_data.get("name"),
            "benchmark_rate_pct": base_rate,
            "bank_spread_pct": bank_spread,
            "without_recourse_premium_pct": forfaiting_spread,
            "gross_interest_rate_pct": gross_rate_pct,
            "rbi_ies_subvention_pct": subvention_rate_pct,
            "net_effective_rate_pct": net_rate_pct
        },
        "waterfall": {
            "gross_invoice_value": val,
            "day1_cash_liquidity": day1_liquidity,
            "gross_bank_discounting_interest": gross_interest,
            "rbi_ies_subvention_savings": subvention_savings,
            "net_interest_cost": net_interest,
            "bank_handling_fee": handling_fee
        },
        "waterfall_inr": {
            "gross_invoice_value_inr": round(val * fx_rate, 2),
            "day1_cash_liquidity_inr": round(day1_liquidity * fx_rate, 2),
            "gross_bank_discounting_interest_inr": round(gross_interest * fx_rate, 2),
            "rbi_ies_subvention_savings_inr": round(subvention_savings * fx_rate, 2),
            "net_interest_cost_inr": round(net_interest * fx_rate, 2),
            "bank_handling_fee_inr": round(handling_fee * fx_rate, 2)
        },
        "recourse_protection": "100% Forfaiting (Without Recourse to Exporter upon Buyer Default)" if is_without_recourse else "With Recourse (Exporter remains contingent guarantor)",
        "discrepancy_risk_factors": lc_rules.get("discrepancy_risk_factors", [])
    }

def calculate_export_factoring(
    invoice_val: float,
    currency: str = "EUR",
    credit_period_days: int = 60,
    advance_pct: float = 85.0,
    factor_commission_pct: float = 0.45
) -> Dict[str, Any]:
    """Computes cross-border export receivables factoring advance under IFSCA ITFS / TReDS."""
    data = _load_master()
    cur = currency.upper().strip()
    benchmarks = data.get("benchmarks", {})
    if cur not in benchmarks:
        cur = "EUR"
        
    fx_rate = data.get("metadata", {}).get("currency_rates_inr", {}).get(cur, 92.10)
    bench_data = benchmarks[cur]
    base_rate = bench_data.get("base_rate_pct", 3.65)
    spread = bench_data.get("typical_spread_pct", 1.60)
    financing_rate_pct = round(base_rate + spread, 2)
    
    val = max(100.0, float(invoice_val))
    days = max(15, min(180, credit_period_days))
    adv_ratio = max(70.0, min(90.0, float(advance_pct)))
    comm_pct = max(0.20, min(1.50, float(factor_commission_pct)))
    
    day1_advance_gross = round(val * (adv_ratio / 100.0), 2)
    retention_buffer = round(val - day1_advance_gross, 2)
    
    factoring_fee = round(val * (comm_pct / 100.0), 2)
    advance_interest = round(day1_advance_gross * (financing_rate_pct / 100.0) * (days / 365.0), 2)
    
    net_day1_cash = round(day1_advance_gross - factoring_fee - advance_interest, 2)
    total_net_realization = round(net_day1_cash + retention_buffer, 2)
    
    factoring_rules = data.get("export_factoring_rules", {})
    
    return {
        "status": "success",
        "mode": "export_factoring",
        "framework": "IFSCA (GIFT City ITFS) & TReDS Cross-Border Factoring",
        "currency": cur,
        "symbol": bench_data.get("symbol", "€"),
        "fx_rate_to_inr": fx_rate,
        "inputs": {
            "invoice_value": val,
            "invoice_value_inr": round(val * fx_rate, 2),
            "credit_period_days": days,
            "advance_pct": adv_ratio,
            "factor_commission_pct": comm_pct
        },
        "rates_breakdown": {
            "benchmark_index": bench_data.get("name"),
            "benchmark_rate_pct": base_rate,
            "factor_spread_pct": spread,
            "annualized_financing_rate_pct": financing_rate_pct,
            "factoring_commission_pct": comm_pct
        },
        "waterfall": {
            "gross_invoice_value": val,
            "day1_advance_gross": day1_advance_gross,
            "day1_cash_net_credited": net_day1_cash,
            "factoring_service_commission": factoring_fee,
            "advance_discount_interest": advance_interest,
            "retention_buffer_on_maturity": retention_buffer,
            "total_net_realized_funds": total_net_realization
        },
        "waterfall_inr": {
            "gross_invoice_value_inr": round(val * fx_rate, 2),
            "day1_advance_gross_inr": round(day1_advance_gross * fx_rate, 2),
            "day1_cash_net_credited_inr": round(net_day1_cash * fx_rate, 2),
            "factoring_service_commission_inr": round(factoring_fee * fx_rate, 2),
            "advance_discount_interest_inr": round(advance_interest * fx_rate, 2),
            "retention_buffer_on_maturity_inr": round(retention_buffer * fx_rate, 2),
            "total_net_realized_funds_inr": round(total_net_realization * fx_rate, 2)
        },
        "settlement_protocol": factoring_rules.get("settlement_timeline")
    }
