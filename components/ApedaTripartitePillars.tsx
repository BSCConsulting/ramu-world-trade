import React from 'react';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Scale,
  FlaskConical,
  Bug,
  ShieldCheck,
  Building2,
  ArrowRight
} from 'lucide-react';

export interface TripartitePillarsProps {
  engineName: string;
  hsCode: string;
  scope: string;
  selectedMarket: string;
  mandatoryTreatment: string;
  treatmentAuthority: string;
}

export const ApedaTripartitePillars: React.FC<TripartitePillarsProps> = ({
  engineName,
  hsCode,
  scope,
  selectedMarket,
  mandatoryTreatment,
  treatmentAuthority
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 my-3.5 text-xs font-sans">
      {/* CARD 1: ORIGIN PROVENANCE & GI INTEGRITY */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-slate-700 transition-all">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
              ● Cryptographic Provenance
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              HS {hsCode}
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
            {engineName} (HS {hsCode})
          </h4>

          <div className="text-[11px] text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-200">Territory Scope:</span> {scope}
          </div>

          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 space-y-1">
            <div className="font-bold text-slate-300">🛡️ What It Prevents:</div>
            <div className="leading-relaxed">
              Prevents illicit adulteration (e.g. blending non-notified grain into GI Basmati) and protects against export license suspension under the APEDA Act.
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Farmer Field / Plot Code Mapped
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Mandi Form 9 Linked
          </span>
        </div>
      </div>

      {/* CARD 2: DESTINATION STANCE & SAMPLING AUDIT */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-slate-700 transition-all">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold uppercase">
              ● Statutory Sampling Protocol
            </span>
            <span className="text-[10px] font-mono text-amber-400 font-bold">
              High Scrutiny
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
            {selectedMarket} Stance &amp; Verification
          </h4>

          <div className="text-[11px] text-slate-300">
            Direct server handshake with importing border quarantine authority (TRACES NT / US CBP / SFDA).
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Mandatory Sampling SOP Checklist:
            </div>
            <div className="grid grid-cols-1 gap-1 text-[10px] font-mono">
              <span className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="text-blue-400">●</span> Pull: Min 10% stratified bags per export lot
              </span>
              <span className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="text-blue-400">●</span> Split: 3 Samples (Testing / 6-Mo Dispute Counter / Control)
              </span>
              <span className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                <span className="text-blue-400">●</span> Data: Raw chromatogram uploaded directly to TraceNet
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 leading-tight">
          <strong className="text-slate-300">🛡️ Defense:</strong> Prevents sample tampering flags and provides an unalterable legal defense counter-sample if the buyer disputes discharge quality.
        </div>
      </div>

      {/* CARD 3: DUAL STATUTORY RELEASE GATE (BIO VS. CHEMICAL) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md hover:border-slate-700 transition-all">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-bold uppercase">
              ● Dual-Agency Clearance (LEO Gate)
            </span>
            <span className="text-[10px] font-mono text-purple-400 font-bold">
              Customs Sec 50
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
            Pre-Shipment Treatment &amp; Release Gate
          </h4>

          <div className="space-y-2 pt-1 text-[10px]">
            {/* 1. Biological Pest Clearance */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-0.5">
              <div className="font-bold text-emerald-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Bug className="w-3 h-3" /> 1. Biological Pest Gate (DPPQ&S)
                </span>
                <span className="font-mono text-[9px] text-slate-400">Phytosanitary Cert (PSC)</span>
              </div>
              <div className="text-slate-300">
                <strong>Quarantine Treatment:</strong> {mandatoryTreatment}
              </div>
            </div>

            {/* 2. Chemical Residue Clearance */}
            <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 space-y-0.5">
              <div className="font-bold text-cyan-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FlaskConical className="w-3 h-3" /> 2. Chemical Residue Gate (APEDA)
                </span>
                <span className="font-mono text-[9px] text-slate-400">Certificate of Insp (CoI)</span>
              </div>
              <div className="text-slate-300">
                <strong>Oversight:</strong> {treatmentAuthority} (<span className="text-cyan-300">&lt; 0.01 ppm LOQ</span>)
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-amber-300/90 leading-tight bg-amber-950/20 p-2 rounded-lg border border-amber-900/30">
          ⚠️ <strong>ICEGATE Section 50 Rule:</strong> Customs will NOT grant Let Export Order (LEO) without BOTH the DPPQ&S PSC and the TraceNet CoI.
        </div>
      </div>
    </div>
  );
};

export default ApedaTripartitePillars;
