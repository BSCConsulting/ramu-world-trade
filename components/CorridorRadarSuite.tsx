import React, { useState } from 'react';
import {
  Globe2,
  TrendingUp,
  DollarSign,
  Ship,
  ShieldCheck,
  FileCheck2,
  Clock,
  ArrowRight,
  Anchor,
  Layers,
  ChevronRight,
  Sparkles,
  Calculator
} from 'lucide-react';

export interface CorridorGap {
  commodity: string;
  hs_code: string;
  target_imports_usd: string;
  india_share_pct: number;
  untapped_headroom_usd: string;
  odop_districts: string;
  opportunity_rationale: string;
  nearest_icd: string;
  standard_mfn_duty: string;
  preferential_fta_duty: string;
  duty_savings_note: string;
  rodtep_rate: string;
  avg_40ft_freight_usd: number;
  transit_days: number;
  origin_port: string;
  dest_port: string;
}

export interface TradeCorridor {
  code: string;
  country: string;
  flag: string;
  bilateral_trade_usd: string;
  india_exports_usd: string;
  trade_agreement: string;
  gaps: CorridorGap[];
}

export const CORRIDORS_DATA: TradeCorridor[] = [
  {
    code: 'US',
    country: 'United States (USA)',
    flag: '🇺🇸',
    bilateral_trade_usd: '$118.3B',
    india_exports_usd: '$77.5B',
    trade_agreement: 'Trade Policy Forum (TPF) & Generalized System of Preferences (GSP Review)',
    gaps: [
      {
        commodity: 'Technical Textiles & Geo-Textiles',
        hs_code: '5911.90.00',
        target_imports_usd: '$4,200M',
        india_share_pct: 3.8,
        untapped_headroom_usd: '$850M',
        odop_districts: 'Surat (Gujarat) • Coimbatore (Tamil Nadu)',
        opportunity_rationale: 'US supply chain shifts away from non-compliant synthetic fibers; 0% customs duty on select technical fabric items under Miscellaneous Tariff Bill (MTB).',
        nearest_icd: 'ICD Sachin / ICD Irugur',
        standard_mfn_duty: '6.5%',
        preferential_fta_duty: '0.0% (MTB Active)',
        duty_savings_note: 'Save $5,525 per $85,000 container under MTB exemption',
        rodtep_rate: '2.8%',
        avg_40ft_freight_usd: 3850,
        transit_days: 24,
        origin_port: 'JNPT (Nhava Sheva) / Mundra',
        dest_port: 'New York / Savannah'
      },
      {
        commodity: 'Dehydrated Garlic & Onion Powder',
        hs_code: '0712.20.00',
        target_imports_usd: '$680M',
        india_share_pct: 4.2,
        untapped_headroom_usd: '$160M',
        odop_districts: 'Mahuva & Bhavnagar (Gujarat) • Nashik (Maharashtra)',
        opportunity_rationale: 'India produces 2nd largest global onion harvest; high solids white onion varieties in Mahuva yield superior drying ratio.',
        nearest_icd: 'ICD Pipavav / ICD Nashik',
        standard_mfn_duty: '29.8¢/kg',
        preferential_fta_duty: 'MFN Bound Rate',
        duty_savings_note: 'US FDA registration & Salmonella zero-tolerance compliance required',
        rodtep_rate: '2.5%',
        avg_40ft_freight_usd: 4100,
        transit_days: 26,
        origin_port: 'Pipavav / Mundra Port',
        dest_port: 'Los Angeles / Long Beach'
      },
      {
        commodity: 'Cast Iron Pipe Fittings & Flanges',
        hs_code: '7307.19.00',
        target_imports_usd: '$2,100M',
        india_share_pct: 4.5,
        untapped_headroom_usd: '$420M',
        odop_districts: 'Howrah (West Bengal) • Coimbatore (Tamil Nadu)',
        opportunity_rationale: 'US Infrastructure Act mandates domestic or allied casting procurement; Howrah foundries offer 22% lower cost than European suppliers.',
        nearest_icd: 'Kolkata Port / ICD Irugur',
        standard_mfn_duty: '5.6%',
        preferential_fta_duty: '5.6% (Standard)',
        duty_savings_note: 'Subject to Section 232 Steel Tariffs; verify exclusion list',
        rodtep_rate: '1.4%',
        avg_40ft_freight_usd: 3600,
        transit_days: 28,
        origin_port: 'Kolkata / Haldia Port',
        dest_port: 'Houston / Norfolk'
      }
    ]
  },
  {
    code: 'AE',
    country: 'United Arab Emirates (UAE)',
    flag: '🇦🇪',
    bilateral_trade_usd: '$84.0B',
    india_exports_usd: '$35.6B',
    trade_agreement: 'India-UAE CEPA (Comprehensive Economic Partnership Agreement) — 0% Duty Corridor',
    gaps: [
      {
        commodity: 'Curcumin Extracts & High-Oleoresin Turmeric',
        hs_code: '0910.30.20',
        target_imports_usd: '$340M',
        india_share_pct: 4.8,
        untapped_headroom_usd: '$95M',
        odop_districts: 'Nizamabad (Telangana) • Erode (Tamil Nadu)',
        opportunity_rationale: 'India-UAE CEPA grants immediate 0% customs duty on digital Certificate of Origin; surging demand in Dubai pharmaceutical and nutra packaging hubs.',
        nearest_icd: 'ICD Sanathnagar / ICD Erode',
        standard_mfn_duty: '5.0%',
        preferential_fta_duty: '0.0% (CEPA Tariff Line)',
        duty_savings_note: 'Save ₹3,50,000 duty per $70,000 consignment with digital e-CoO',
        rodtep_rate: '1.5%',
        avg_40ft_freight_usd: 1450,
        transit_days: 4,
        origin_port: 'JNPT (Nhava Sheva)',
        dest_port: 'Jebel Ali Port, Dubai'
      },
      {
        commodity: 'Pre-Cooked Frozen Flatbreads (Parathas/Roti)',
        hs_code: '1905.90.90',
        target_imports_usd: '$480M',
        india_share_pct: 3.9,
        untapped_headroom_usd: '$110M',
        odop_districts: 'Ahmedabad (Gujarat) • Indore (Madhya Pradesh)',
        opportunity_rationale: 'High Indian diaspora & GCC retail food service demand; 100% duty-free under CEPA Annex 2A.',
        nearest_icd: 'ICD Sabarmati / ICD Tihi',
        standard_mfn_duty: '5.0%',
        preferential_fta_duty: '0.0% (CEPA Annex 2A)',
        duty_savings_note: 'Zero customs duty; Dubai Municipality Foodwatch registration required',
        rodtep_rate: '2.0%',
        avg_40ft_freight_usd: 1650,
        transit_days: 4,
        origin_port: 'Mundra Port',
        dest_port: 'Jebel Ali Port, Dubai'
      }
    ]
  },
  {
    code: 'SA',
    country: 'Saudi Arabia',
    flag: '🇸🇦',
    bilateral_trade_usd: '$52.8B',
    india_exports_usd: '$11.5B',
    trade_agreement: 'GCC Common External Tariff & Saudi SFDA Phytosanitary Regulatory Framework',
    gaps: [
      {
        commodity: 'Basmati Rice 1121 Steam & Sella',
        hs_code: '1006.30.20',
        target_imports_usd: '$1,450M',
        india_share_pct: 68.0,
        untapped_headroom_usd: '$280M',
        odop_districts: 'Karnal (Haryana) • Amritsar (Punjab)',
        opportunity_rationale: 'High direct consumption; expanding packaging from bulk 50kg bags to 5kg retail packs doubles net export margin under SFDA.FD 382 standards.',
        nearest_icd: 'ICD Panipat / ICD Amritsar',
        standard_mfn_duty: '0.0% (Essential Staple)',
        preferential_fta_duty: '0.0% (Zero Tariff)',
        duty_savings_note: 'SFDA 1.0 ppm Tricyclazole limit allows 100% consignment clearance',
        rodtep_rate: '0.0%',
        avg_40ft_freight_usd: 1850,
        transit_days: 6,
        origin_port: 'Mundra / Kandla Port',
        dest_port: 'Dammam / Jeddah Islamic Port'
      },
      {
        commodity: 'Ceramic Glazed Floor & Wall Tiles',
        hs_code: '6907.21.00',
        target_imports_usd: '$920M',
        india_share_pct: 4.9,
        untapped_headroom_usd: '$210M',
        odop_districts: 'Morbi (Gujarat)',
        opportunity_rationale: 'Saudi Vision 2030 giga-projects (NEOM, Red Sea Project) driving multi-million sqm ceramic tile procurement.',
        nearest_icd: 'Mundra Port (Direct Sea Corridor)',
        standard_mfn_duty: '12.0%',
        preferential_fta_duty: '12.0% (SASO Standard)',
        duty_savings_note: 'SASO Saber platform certification mandatory prior to stuffing',
        rodtep_rate: '1.2%',
        avg_40ft_freight_usd: 1750,
        transit_days: 7,
        origin_port: 'Mundra Port',
        dest_port: 'Dammam / Jubail Port'
      }
    ]
  }
];

export const CorridorRadarSuite: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string>('US');
  const [selectedGapIndex, setSelectedGapIndex] = useState<number>(0);
  const [consignmentUsd, setConsignmentUsd] = useState<number>(75000);

  const activeCorridor =
    CORRIDORS_DATA.find((c) => c.code === selectedCountry) || CORRIDORS_DATA[0];
  const activeGap = activeCorridor.gaps[selectedGapIndex] || activeCorridor.gaps[0];

  // Simulator Calculations
  const rodtepPct = parseFloat(activeGap.rodtep_rate) || 0;
  const rodtepInr = +(consignmentUsd * 86.5 * (rodtepPct / 100)).toFixed(0);
  const freightUsd = activeGap.avg_40ft_freight_usd;
  const freightInr = +(freightUsd * 86.5).toFixed(0);
  const cifValueUsd = consignmentUsd + freightUsd;
  const ftaSavingUsd = activeGap.preferential_fta_duty.includes('0.0%')
    ? +(consignmentUsd * 0.05).toFixed(0)
    : 0;

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* 1. Header & Corridor Selector */}
      <div className="p-4 rounded-3xl border bg-slate-900/90 border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight flex items-center gap-2">
                Bilateral Opportunity Arbitrage Radar
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Target Corridors
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Identify high-demand commodities where partner country imports billions from the world, but India holds &lt;5% market share.
              </p>
            </div>
          </div>
          <div className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 self-start sm:self-auto">
            ● CEPA / FTA Engines Active
          </div>
        </div>

        {/* Corridor Chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {CORRIDORS_DATA.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setSelectedCountry(c.code);
                setSelectedGapIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 whitespace-nowrap flex items-center gap-1.5 ${
                selectedCountry === c.code
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold'
                  : 'bg-slate-950/70 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.country}</span>
            </button>
          ))}
        </div>

        {/* Bilateral Trade Metrics Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">
              Total Bilateral Trade:
            </span>
            <span className="font-black font-mono text-sm text-amber-400">
              {activeCorridor.bilateral_trade_usd}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">
              India Direct Exports:
            </span>
            <span className="font-black font-mono text-sm text-slate-200">
              {activeCorridor.india_exports_usd}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block uppercase font-mono">
              Active Trade Treaty:
            </span>
            <span className="font-bold text-[11px] text-cyan-400 truncate block">
              {activeCorridor.trade_agreement}
            </span>
          </div>
        </div>

        {/* 2. Interactive Consignment ROI & Margin Waterfall Simulator */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-mono">
              <Calculator className="w-3.5 h-3.5" />
              Consignment Margin &amp; Export Incentive Simulator
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Corridor: {activeCorridor.country}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                FOB Invoice Value (USD):
              </label>
              <input
                type="number"
                value={consignmentUsd}
                onChange={(e) => setConsignmentUsd(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 font-mono text-xs text-slate-100 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Ocean Freight (40ft):
              </span>
              <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs font-bold text-slate-200">
                ${freightUsd} (₹{freightInr.toLocaleString('en-IN')})
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                RoDTEP Cash Refund:
              </span>
              <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs font-bold text-emerald-400">
                ₹{rodtepInr.toLocaleString('en-IN')} ({activeGap.rodtep_rate})
              </div>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                CEPA/FTA Duty Saved:
              </span>
              <div className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs font-bold text-cyan-400">
                {ftaSavingUsd > 0 ? `+$${ftaSavingUsd} (₹${(ftaSavingUsd * 86.5).toLocaleString('en-IN')})` : 'Standard MFN'}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Commodity Opportunity Gap Cards */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-300 font-mono">
              High-Headroom Trade Lines ({activeCorridor.gaps.length} Loaded)
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Tap card to inspect ground corridor SOP
            </span>
          </div>

          <div className="space-y-3">
            {activeCorridor.gaps.map((g, idx) => (
              <div
                key={g.hs_code}
                onClick={() => setSelectedGapIndex(idx)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                  selectedGapIndex === idx
                    ? 'bg-slate-950/90 border-amber-500/60 ring-1 ring-amber-500/30 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9.5px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold">
                        ITC-HS {g.hs_code}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {g.origin_port} ➔ {g.dest_port} ({g.transit_days} Days)
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-100 pt-1">
                      {g.commodity}
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex-shrink-0">
                    Headroom: {g.untapped_headroom_usd}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Target Market Imports:</span>
                    <span className="font-bold font-mono text-slate-200">{g.target_imports_usd}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">India Market Share:</span>
                    <span className="font-extrabold font-mono text-rose-400">
                      {g.india_share_pct}% (Under-penetrated)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Preferential Duty:</span>
                    <span className="font-bold font-mono text-cyan-400">{g.preferential_fta_duty}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase text-[9px] text-amber-400">
                      ODOP Sourcing Clusters:
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Gateway: {g.nearest_icd}
                    </span>
                  </div>
                  <div className="text-slate-300 font-medium">
                    {g.odop_districts}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed italic">
                  {g.opportunity_rationale}
                </p>

                {/* 5-Stage Sovereign Corridor Checklist when expanded */}
                {selectedGapIndex === idx && (
                  <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-amber-400 block">
                      5-Stage Sovereign Corridor Execution SOP:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 text-[10px]">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                        <div className="font-bold text-slate-200">1. Mandi Sourcing</div>
                        <div className="text-slate-400 text-[9px]">Form 9 APMC / e-NAM cluster pull</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                        <div className="font-bold text-slate-200">2. NABL Testing</div>
                        <div className="text-slate-400 text-[9px]">MRL &amp; phytosanitary lab seal</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                        <div className="font-bold text-slate-200">3. ICEGATE LEO</div>
                        <div className="text-slate-400 text-[9px]">Shipping Bill &amp; e-Scrip credit</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                        <div className="font-bold text-slate-200">4. Digital e-CoO</div>
                        <div className="text-slate-400 text-[9px]">DGFT portal CEPA certificate</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                        <div className="font-bold text-slate-200">5. Cash In Bank</div>
                        <div className="text-slate-400 text-[9px]">TReDS / LC realization at sight</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorridorRadarSuite;
