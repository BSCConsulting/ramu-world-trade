import React, { useState } from 'react';
import {
  Search,
  Sliders,
  ShieldCheck,
  FileText,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Globe2,
  DollarSign,
  Compass,
  CheckCircle2,
  Copy,
  Download
} from 'lucide-react';

export type QueryMode = 'tariff' | 'sps' | 'mirror' | 'scn';

export interface GroundPreset {
  id: string;
  badge: string;
  title: string;
  query: string;
  mode: QueryMode;
  hsCode?: string;
}

export const GROUND_PRESETS: GroundPreset[] = [
  {
    id: 'basmati_eu',
    badge: '🌾 SPS & LOQ Gate',
    title: 'Basmati EU: Tricyclazole 0.01 ppm Defense',
    query: 'How to defend Tricyclazole MRL breach in Basmati Rice for EU under SANTE 11312/2021 measurement uncertainty?',
    mode: 'sps',
    hsCode: '1006.30.20'
  },
  {
    id: 'lithium_ev',
    badge: '🔋 Tariff Inversion',
    title: 'Lithium Cell vs Pack: BCD 5% vs 15% & Rule 2(a)',
    query: 'What is the customs duty difference between raw lithium cells (8507.60) and complete battery packs, and how to avoid GRI Rule 2(a) seizure?',
    mode: 'tariff',
    hsCode: '8507.60.00'
  },
  {
    id: 'frozen_shrimp',
    badge: '🍤 US FDA Non-Tariff',
    title: 'Frozen Shrimp US: Chloramphenicol & Anti-Dumping',
    query: 'What are the current US DOC anti-dumping duty rates and FDA antibiotic zero-tolerance testing protocols for Indian frozen vannamei shrimp?',
    mode: 'sps',
    hsCode: '0306.17.20'
  },
  {
    id: 'guntur_chilli',
    badge: '🌶️ China Quarantine',
    title: 'Guntur Chilli: China GACC & Aflatoxin B1 Limits',
    query: 'Explain the protocol for dry chilli exports to China including GACC packhouse registration and Aflatoxin B1 <5 ppb standards.',
    mode: 'sps',
    hsCode: '0904.21.10'
  },
  {
    id: 'tirupur_cepa',
    badge: '👕 CEPA 0% Duty',
    title: 'Tirupur Apparel: UAE CEPA 0% & RoSCTL 3.9%',
    query: 'How to claim 0% import duty in Dubai under India-UAE CEPA with digital CoO for knitted cotton T-shirts while realizing 3.9% RoSCTL cash rebates?',
    mode: 'mirror',
    hsCode: '6109.10.00'
  },
  {
    id: 'customs_scn',
    badge: '⚖️ Legal Defense',
    title: 'Customs Sec 124 SCN: Rebutting Misdeclaration',
    query: 'How to draft a legal rebuttal to a Customs Section 124 Show Cause Notice alleging ITC-HS misclassification using Northern Plastic Supreme Court precedent?',
    mode: 'scn'
  }
];

export interface AskIntelligenceSuiteProps {
  onExecuteQuery: (query: string, mode: QueryMode) => void;
  isLoading?: boolean;
}

export const AskIntelligenceSuite: React.FC<AskIntelligenceSuiteProps> = ({
  onExecuteQuery,
  isLoading = false
}) => {
  const [activeMode, setActiveMode] = useState<QueryMode>('tariff');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectPreset = (preset: GroundPreset) => {
    setActiveMode(preset.mode);
    setSearchQuery(preset.query);
    onExecuteQuery(preset.query, preset.mode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onExecuteQuery(searchQuery, activeMode);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* 1. Real-Time Sovereign Telemetry Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl border bg-slate-900/90 border-slate-800 shadow-sm text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold uppercase tracking-wide text-slate-200">
            Sovereign Telemetry Link: LIVE
          </span>
        </div>
        <div className="flex items-center gap-3 text-slate-400 overflow-x-auto no-scrollbar">
          <span className="flex items-center gap-1 text-emerald-400">
            ● DGCI&amp;S 8-Digit ITC-HS
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            ● CBIC Tariff Gazette
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            ● DGFT Indian Trade Portal
          </span>
          <span className="flex items-center gap-1 text-purple-400">
            ● ICEGATE Scrip Ledger
          </span>
        </div>
      </div>

      {/* 2. Interactive Search Console & 4 Operational Query Modes */}
      <div className="p-4 rounded-3xl border bg-slate-900/90 border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="font-black text-sm text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              Sovereign Intelligence &amp; Statutory Triangulation
            </h3>
            <p className="text-[11px] text-slate-400">
              Query official DGCI&amp;S, CBIC Gazette, WTO SPS, and ICEGATE ledgers with statutory legal defense.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 self-start sm:self-auto">
            4 Query Modes Active
          </span>
        </div>

        {/* 4 Operational Query Mode Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveMode('tariff')}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
              activeMode === 'tariff'
                ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-extrabold shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[9.5px] font-mono uppercase tracking-wider">Mode 01</div>
            <div className="text-xs font-bold mt-0.5">📋 Tariff &amp; Duty Tree</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5">BCD • SWS • IGST • AIDC</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('sps')}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
              activeMode === 'sps'
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-extrabold shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[9.5px] font-mono uppercase tracking-wider">Mode 02</div>
            <div className="text-xs font-bold mt-0.5">🛡️ SPS / Quarantine Gate</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5">APEDA • FSSAI • US FDA</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('mirror')}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
              activeMode === 'mirror'
                ? 'bg-blue-500/15 border-blue-500 text-blue-300 font-extrabold shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[9.5px] font-mono uppercase tracking-wider">Mode 03</div>
            <div className="text-xs font-bold mt-0.5">🌐 Bilateral &amp; Mirror Spread</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5">FOB vs CIF • Trade Deficit</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('scn')}
            className={`p-2.5 rounded-xl border text-left transition-all active:scale-95 ${
              activeMode === 'scn'
                ? 'bg-rose-500/15 border-rose-500 text-rose-300 font-extrabold shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-[9.5px] font-mono uppercase tracking-wider">Mode 04</div>
            <div className="text-xs font-bold mt-0.5">⚖️ SCN Rebuttal &amp; Case Law</div>
            <div className="text-[9.5px] text-slate-500 mt-0.5">Sec 28 • Sec 124 • 110A</div>
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <Search className="w-5 h-5 absolute left-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask any statutory question (e.g. BCD on 8507.60, EU MRL for basmati, or RoDTEP on shrimp)..."
            className="w-full bg-slate-950 border border-slate-700 rounded-2xl pl-12 pr-28 py-3.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              {isLoading ? (
                <span className="font-mono text-[10px] animate-pulse">Running...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Execute</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Ground Operator Prompt Presets */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
              <span>🎯</span> High-Yield Ground Exim Presets (One-Click Ingestion)
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              Field Tested
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {GROUND_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-left transition-all active:scale-95 space-y-1 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                    {p.badge}
                  </span>
                  {p.hsCode && (
                    <span className="text-[9px] font-mono text-cyan-400 font-bold">
                      {p.hsCode}
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-200 text-[11px] leading-tight">
                  {p.title}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AskIntelligenceSuite;
