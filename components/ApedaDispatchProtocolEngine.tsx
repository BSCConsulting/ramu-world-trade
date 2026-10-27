import React from 'react';
import {
  FileCheck2,
  AlertOctagon,
  RefreshCw,
  FlaskConical,
  Cpu,
  RotateCw,
  ShieldCheck,
  Building2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';

export interface DispatchProtocolEngineProps {
  isPass: boolean;
  commodityName: string;
  hsCode: string;
  selectedMarket: string;
  onRequestRefereeTest: () => void;
  onSimulateSecondaryPolishing: () => void;
  onDivertMarketGcc: () => void;
  onResetValues: () => void;
}

export const ApedaDispatchProtocolEngine: React.FC<DispatchProtocolEngineProps> = ({
  isPass,
  commodityName,
  hsCode,
  selectedMarket,
  onRequestRefereeTest,
  onSimulateSecondaryPolishing,
  onDivertMarketGcc,
  onResetValues
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-4 text-xs font-sans">
      {/* 1. APEDA Statutory Packhouse & CoI Dispatch Protocol Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">{isPass ? '📋' : '🛑'}</span>
            <h4 className="font-extrabold text-xs uppercase tracking-tight text-slate-100 flex items-center gap-2">
              APEDA Statutory Packhouse &amp; CoI Dispatch Protocol
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  isPass
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isPass ? '✓ Authorized for Stuffing' : '🛑 Dispatch Intercepted'}
              </span>
            </h4>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isPass
              ? 'All chemical and microbiological compounds strictly within destination statutory tolerances. Batch eligible for APEDA digital Certificate of Inspection (CoI) and Export Packhouse stuffing.'
              : 'Non-compliant batch! Re-testing, secondary remediation, or market diversion required. Consignment cannot receive APEDA phytosanitary clearance under active market protocol.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onResetValues}
          className="px-3 py-1.5 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          ↺ Reset Lab Values
        </button>
      </div>

      {/* 2. The Exporter's Commercial Decision Tree (Active on Breach or Review) */}
      {!isPass && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              The Exporter’s Commercial Decision Tree (3-Pronged Remediation Matrix)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Rule 14 APEDA Export Regulations
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Option A: Re-Testing Counter-Sample */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase whitespace-nowrap shrink-0">
                    Option A • Legal Referee
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400 whitespace-nowrap shrink-0">ICAR-NRRI</span>
                </div>
                <h5 className="font-bold text-xs text-slate-100 uppercase tracking-tight">
                  Statutory Referee Re-Testing
                </h5>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  Request a formal statutory re-test of the sealed counter-sample at the National Referral Laboratory (ICAR-NRRI Cuttack or NRC Grapes Pune).
                </p>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                  <strong className="text-blue-400">Legal Recourse:</strong> Tests variance across certified gas chromatography channels to challenge preliminary LOQ flags.
                </div>
              </div>

              <button
                type="button"
                onClick={onRequestRefereeTest}
                className="w-full py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                🧪 Request Referee Lab Re-Test
              </button>
            </div>

            {/* Option B: Secondary Processing & Precision Polishing */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase whitespace-nowrap shrink-0">
                    Option B • Physical Remediation
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold whitespace-nowrap shrink-0">-20% to -30%</span>
                </div>
                <h5 className="font-bold text-xs text-slate-100 uppercase tracking-tight">
                  Secondary Sorting &amp; De-Braning
                </h5>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  Subject the consignment to high-precision Sortex optical sorting and silky de-bran polishing, which physically shaves off 20%–30% of surface systemic residues.
                </p>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                  <strong className="text-cyan-400">Agronomic Science:</strong> Systemic fungicides like Tricyclazole bond primarily to outer pericarp/bran layers.
                </div>
              </div>

              <button
                type="button"
                onClick={onSimulateSecondaryPolishing}
                className="w-full py-2 px-2.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-500/40 font-bold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5" />
                ⚙️ Simulate Secondary Polishing (-25%)
              </button>
            </div>

            {/* Option C: Commercial Market Diversion */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase whitespace-nowrap shrink-0">
                    Option C • Commercial Arbitrage
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold whitespace-nowrap shrink-0">1.0 PPM Limit</span>
                </div>
                <h5 className="font-bold text-xs text-slate-100 uppercase tracking-tight">
                  Immediate High-Seas Rerouting
                </h5>
                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  Immediately re-route the shipment away from the European Union. Divert the goods to countries accepting Codex Alimentarius / GCC standards (Saudi Arabia, UAE, Iraq).
                </p>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                  <strong className="text-amber-400">Capital Protection:</strong> SFDA.FD 382 / Codex allows up to 1.0 mg/kg Tricyclazole, transforming rejection into 100% recovery.
                </div>
              </div>

              <button
                type="button"
                onClick={onDivertMarketGcc}
                className="w-full py-2 px-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-rose-950/40"
              >
                <RotateCw className="w-3.5 h-3.5" />
                ⚡ Divert to GCC / Saudi Arabia (1.0 ppm)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApedaDispatchProtocolEngine;
