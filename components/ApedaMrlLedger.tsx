import React, { useState } from 'react';
import {
  FlaskConical,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Info,
  Clock,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';

export interface CompoundAuditItem {
  compound: string;
  chemical_key: string;
  context: string;
  testedValue: number;
  statutoryMRL: number;
  unit: string;
  status: 'PASS' | 'FAIL_STATUTORY' | 'HOLD_MU_PRECAUTION';
  variancePct: number;
  phiStandardDays: number;
  rootCause: string;
  guidance: string;
}

export interface ApedaMrlLedgerProps {
  ledger: CompoundAuditItem[];
  onResidueChange: (key: string, value: string) => void;
  onReset: () => void;
}

export const ApedaMrlLedger: React.FC<ApedaMrlLedgerProps> = ({
  ledger,
  onResidueChange,
  onReset
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (key: string) => {
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl space-y-0 text-xs font-sans">
      {/* Header Bar */}
      <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-cyan-400" />
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-100">
            High-Resolution Analytical Chromatography Matrix
          </h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            GC-MS/MS &amp; LC-MS/MS
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;80% Pass
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 80-100% Precaution Hold
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> &gt;100% Breach
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/70">
              <th className="py-2.5 px-3">Compound / Contaminant</th>
              <th className="py-2.5 px-3 text-center">Tested Lab Value</th>
              <th className="py-2.5 px-3 text-center">Statutory MRL</th>
              <th className="py-2.5 px-3 text-center">Analytical Status</th>
              <th className="py-2.5 px-3 text-right">Agronomic Defense</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((item) => {
              const isExpanded = !!expandedRows[item.chemical_key];
              const isFail = item.status === 'FAIL_STATUTORY';
              const isHold = item.status === 'HOLD_MU_PRECAUTION';

              const statusBadgeBg = isFail
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                : isHold
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

              const statusText = isFail
                ? '✕ FAIL (STATUTORY BREACH)'
                : isHold
                ? '⚠️ HOLD (SANTE 50% MU ZONE)'
                : '✓ PASS (COMPLIANT)';

              return (
                <React.Fragment key={item.chemical_key}>
                  <tr className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span>{item.compound}</span>
                        {isFail && <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />}
                        {isHold && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="text-[9.5px] font-mono font-normal text-slate-400">
                        {item.context}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono">
                      <input
                        type="number"
                        step="0.001"
                        value={item.testedValue}
                        onChange={(e) => onResidueChange(item.chemical_key, e.target.value)}
                        className={`w-20 text-center font-bold font-mono border rounded px-1.5 py-1 text-xs focus:outline-none transition-all ${
                          isFail
                            ? 'bg-rose-950/40 border-rose-500 text-rose-300 ring-1 ring-rose-500/30'
                            : isHold
                            ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                            : 'bg-slate-950 border-slate-700 text-slate-100'
                        }`}
                      />
                    </td>

                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                      {item.statutoryMRL} <span className="text-[9px] font-normal text-slate-400">{item.unit}</span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold font-mono border ${statusBadgeBg}`}>
                        {statusText}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleRow(item.chemical_key)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-semibold inline-flex items-center gap-1 transition-all"
                      >
                        <span>PHI &amp; Root-Cause</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </td>
                  </tr>

                  {/* Expandable Agronomic Root-Cause & Defense Drawer */}
                  {isExpanded && (
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px]">
                      <td colSpan={5} className="p-3 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="text-[10px] font-bold uppercase font-mono text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-cyan-400" /> Pre-Harvest Interval (PHI)
                            </div>
                            <div className="font-bold text-slate-200">
                              Standard PHI: {item.phiStandardDays} Days
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Minimum waiting period between chemical application and harvest to allow natural biochemical degradation.
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="text-[10px] font-bold uppercase font-mono text-slate-400 flex items-center gap-1">
                              <PackageCheck className="w-3 h-3 text-amber-400" /> Packaging / Jute Leaching Risk
                            </div>
                            <div className="font-bold text-amber-300">
                              Food Grade Jute / Liner Mandate
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Raw jute batching oil contains mineral oil saturated hydrocarbons (MOSH). Use only certified hydrocarbon-free bags.
                            </p>
                          </div>

                          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                            <div className="text-[10px] font-bold uppercase font-mono text-slate-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-rose-400" /> Statutory Blending Prohibition
                            </div>
                            <div className="font-bold text-rose-300">
                              Zero-Blending Rule
                            </div>
                            <p className="text-[10px] text-slate-400">
                              Mixing non-compliant grain with compliant export stock is strictly illegal under EU Food Law and APEDA export rules.
                            </p>
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-slate-300 pt-1">
                          <strong className="text-cyan-400">Action Guidance:</strong> {item.guidance}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Reset & Compliance Summary */}
      <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="text-[11px] text-slate-300">
          <span className="font-bold text-slate-100">Measurement Uncertainty (MU) Directive:</span> EU SANTE 11312/2021 mandates a default 50% analytical MU buffer on border enforcement screening.
        </div>
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all active:scale-95"
        >
          ↺ Reset Lab Values
        </button>
      </div>
    </div>
  );
};

export default ApedaMrlLedger;
