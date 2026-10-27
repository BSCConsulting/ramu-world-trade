import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  DollarSign,
  FileX,
  RotateCw,
  Warehouse,
  Lock,
  ArrowRight,
  TrendingDown
} from 'lucide-react';

export interface EmergencyBannerProps {
  isPass: boolean;
  selectedMarket: string;
  failedCompounds: string[];
  cargoValueInr?: string;
  demurrageRateInr?: string;
  onRerouteGcc: () => void;
  onDivertDomestic: () => void;
  onLockQuarantine: () => void;
}

export const ApedaEmergencyBanner: React.FC<EmergencyBannerProps> = ({
  isPass,
  selectedMarket,
  failedCompounds,
  cargoValueInr = '₹28,50,000',
  demurrageRateInr = '₹12,500 – ₹20,000 / Day',
  onRerouteGcc,
  onDivertDomestic,
  onLockQuarantine
}) => {
  if (isPass) {
    return (
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 shadow-lg backdrop-blur-sm transition-all duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-extrabold text-sm text-emerald-400 uppercase tracking-tight flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                ✓ APEDA TRACENET DIGITAL RELEASE READY (e-NOC ISSUABLE)
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              All chemical &amp; microbiological parameters comply with <strong className="text-white">{selectedMarket}</strong> statutory tolerances. Sovereign QR Certificate of Inspection (CoI) cleared for ICEGATE transmission and container stuffing.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] flex-shrink-0 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              ● LEO RISK: 0%
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
              ● ZERO DEMURRAGE
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-400/40">
              ● GREEN CHANNEL
            </span>
          </div>
        </div>
      </div>
    );
  }

  const failedNamesStr = failedCompounds.length > 0 ? failedCompounds.join(', ') : 'Chemical Residue / Toxin';

  return (
    <div className="bg-rose-950/50 border-2 border-rose-600/80 rounded-xl p-4 shadow-2xl shadow-rose-950/50 space-y-3.5 backdrop-blur-sm animate-pulse-subtle">
      {/* 1. Header & Statutory Interception Alert */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <h3 className="font-extrabold text-sm text-rose-300 uppercase tracking-tight">
              🚨 STATUTORY INTERCEPTION: TRACENET DIGITAL COI LOCKED
            </h3>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            <strong className="text-white">Breach Detected:</strong> <span className="underline decoration-rose-500 font-semibold">{failedNamesStr}</span> exceeds statutory limit for <strong className="text-white">{selectedMarket}</strong>. Under APEDA Trade Regulations, accredited laboratories are electronically prohibited from issuing a physical or digital CoI.
          </p>
        </div>

        <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider flex-shrink-0">
          ● ZERO-TOLERANCE SPS RULE: 1 Failure = 100% Lot Rejection
        </span>
      </div>

      {/* 2. Live Capital Exposure Radar (3-Column Metric Strip) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>CFS Demurrage &amp; Detention Risk:</span>
            <Clock className="w-3 h-3 text-amber-400" />
          </div>
          <div className="text-sm font-bold font-mono text-amber-400">
            {demurrageRateInr}
          </div>
          <div className="text-[9.5px] text-slate-400">
            Accrues starting 48h after container gate-in at port CFS/ICD.
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Cargo Capital at Risk:</span>
            <DollarSign className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-sm font-bold font-mono text-rose-400">
            {cargoValueInr}
          </div>
          <div className="text-[9.5px] text-slate-400">
            Total commercial invoice valuation at risk of destination seizure.
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Insurance Defense Status:</span>
            <FileX className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-sm font-bold font-mono text-rose-400">
            0% RECOVERABLE (UNINSURED)
          </div>
          <div className="text-[9.5px] text-slate-400 leading-tight">
            Institute Cargo Clauses (A) Cl. 4.4 excludes SPS sanitary rejections. 100% loss falls on exporter.
          </div>
        </div>
      </div>

      {/* 3. Immediate Remediation Action Buttons */}
      <div className="pt-2 border-t border-rose-900/40 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRerouteGcc}
          className="py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
        >
          <RotateCw className="w-3.5 h-3.5" />
          ⚡ Reroute Consignment to GCC / Saudi Arabia (SFDA)
        </button>

        <button
          type="button"
          onClick={onDivertDomestic}
          className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Warehouse className="w-3.5 h-3.5 text-amber-400" />
          🌾 Divert to Domestic Processing Stock
        </button>

        <button
          type="button"
          onClick={onLockQuarantine}
          className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          🔒 Lock Batch for Quarantine &amp; Lab Re-Check
        </button>
      </div>
    </div>
  );
};

export default ApedaEmergencyBanner;
