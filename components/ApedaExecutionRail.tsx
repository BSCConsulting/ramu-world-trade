import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  Activity,
  FileCheck2,
  TrendingUp,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Scale,
  FlaskConical,
  Compass,
  ArrowRight
} from 'lucide-react';

export interface ApedaTelemetryState {
  dgftStatus: 'VALIDATED' | 'OFFLINE' | 'DEGRADED';
  packhouseId: string;
  packhouseStatus: 'Verified' | 'Pending' | 'Expired';
  nablLabId: string;
  nablStatus: 'Direct API Ingestion Active' | 'Manual Certificate';
  targetMarket: string;
  targetMarketStance: string;
  stanceScrutinyLevel: 'HIGH' | 'REGULATED' | 'STANDARD';
}

export interface ApedaAuditLedgerItem {
  chemical: string;
  chemical_key: string;
  tested_value: number;
  statutory_mrl: number;
  unit: string;
  status: 'PASS' | 'FAIL';
  statutory_note?: string;
  action_guidance?: string;
}

export interface ApedaExecutionRailProps {
  telemetry?: ApedaTelemetryState;
  auditPassed: boolean;
  activeChemicalLedger?: ApedaAuditLedgerItem[];
  currentMarket: string;
  onMarketChange: (marketCode: string) => void;
  onResetLabValues: () => void;
}

export const ApedaTelemetryRibbon: React.FC<{ telemetry: ApedaTelemetryState }> = ({ telemetry }) => {
  const getStanceBadgeStyle = (level: 'HIGH' | 'REGULATED' | 'STANDARD') => {
    switch (level) {
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'REGULATED':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'STANDARD':
      default:
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono shadow-inner">
      <div className="flex flex-wrap items-center gap-4">
        {/* DGFT Handshake */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-400 font-sans font-medium">DGFT e-RCMC:</span>
          <span className="font-bold text-emerald-400">
            {telemetry.dgftStatus === 'VALIDATED' ? '● VALIDATED (API Handshake: Active)' : telemetry.dgftStatus}
          </span>
        </div>

        {/* APEDA Packhouse */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400 font-sans font-medium">Packhouse:</span>
          <span className="font-bold text-cyan-300">
            ID: {telemetry.packhouseId} ({telemetry.packhouseStatus})
          </span>
        </div>

        {/* NABL Lab Protocol */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-400 font-sans font-medium">NABL Protocol:</span>
          <span className="font-bold text-purple-300">
            Lab #{telemetry.nablLabId} ({telemetry.nablStatus})
          </span>
        </div>
      </div>

      {/* Destination Stance Badge */}
      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-sans text-[10px] uppercase font-bold tracking-wider">
          Destination Stance:
        </span>
        <span
          className={}
        >
          {telemetry.stanceScrutinyLevel === 'HIGH' && <span>▲</span>}
          {telemetry.stanceScrutinyLevel === 'REGULATED' && <span>●</span>}
          {telemetry.targetMarketStance}
        </span>
      </div>
    </div>
  );
};

export const ApedaExecutionRail: React.FC<ApedaExecutionRailProps> = ({
  telemetry = {
    dgftStatus: 'VALIDATED',
    packhouseId: 'APEDA-HYD-042',
    packhouseStatus: 'Verified',
    nablLabId: '1042',
    nablStatus: 'Direct API Ingestion Active',
    targetMarket: 'EU',
    targetMarketStance: 'HIGH SCRUTINY: EU LOQ (0.01 PPM Default Threshold)',
    stanceScrutinyLevel: 'HIGH',
  },
  auditPassed,
  currentMarket,
  onMarketChange,
  onResetLabValues,
}) => {
  return (
    <div className="w-full space-y-3.5">
      {/* Component A: Live Diagnostic Telemetry Ribbon */}
      <ApedaTelemetryRibbon telemetry={telemetry} />

      {/* Component B: 4-Stage Sequential Execution Rail */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Stage 01: Legal Gate-In Prerequisite */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-extrabold uppercase">
                Stage 01
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Scale className="w-3 h-3 text-emerald-400" />
                Customs Sec 50
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
                Legal Gate-In Prerequisite
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                APEDA Act 1985 Schedule 1 physical packhouse aggregation &amp; DPPQ&S inspector pre-clearance.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[10px]">
            {/* Failure Mode */}
            <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300">
              <div className="font-bold flex items-center gap-1 text-[10px]">
                <AlertOctagon className="w-3 h-3 text-rose-400" />
                Failure Mode: Gate-In Rejection
              </div>
              <div className="text-[9.5px] text-rose-400/80 mt-0.5">
                Physical refusal at Port CFS / ICD gate due to missing inspector gatepass.
              </div>
            </div>

            {/* Practical Impact */}
            <div className="flex items-center justify-between font-mono px-1 text-slate-400">
              <span>Financial Impact:</span>
              <span className="text-amber-400 font-bold">₹8,500/day Truck Detention</span>
            </div>

            {/* SOP Protocol */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-[10px]">
              <span className="font-bold text-slate-200">Statutory SOP:</span> Mandate physical stuffing only in
              APEDA-accredited packhouse with DPPQ&S counter-signature.
            </div>
          </div>
        </div>

        {/* Stage 02: ICEGATE Automated Handshake */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-extrabold uppercase">
                Stage 02
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-400" />
                FTP 2023 / SWIFT
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
                ICEGATE Automated Handshake
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Single Window (SWIFT) server-to-server query validating e-RCMC status against DGFT portal.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[10px]">
            {/* Failure Mode */}
            <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300">
              <div className="font-bold flex items-center gap-1 text-[10px]">
                <AlertOctagon className="w-3 h-3 text-rose-400" />
                Failure: SB-ERR-RCMC-INVALID
              </div>
              <div className="text-[9.5px] text-rose-400/80 mt-0.5">
                Automated ICEGATE lock preventing Shipping Bill (SB) number allocation.
              </div>
            </div>

            {/* Practical Impact */}
            <div className="flex items-center justify-between font-mono px-1 text-slate-400">
              <span>Financial Impact:</span>
              <span className="text-amber-400 font-bold">₹28k Rollover + ₹15k Demurrage</span>
            </div>

            {/* SOP Protocol */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-[10px]">
              <span className="font-bold text-slate-200">Statutory SOP:</span> Auto-query DGFT API for 8-digit
              HS code schedule mapping before CHA shipping bill sign-off.
            </div>
          </div>
        </div>

        {/* Stage 03: TraceNet Closed-Loop Telemetry */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-all shadow-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono font-extrabold uppercase">
                Stage 03
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <FileCheck2 className="w-3 h-3 text-purple-400" />
                TraceNet / CoI
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
                TraceNet Closed-Loop Telemetry
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                QR-coded sovereign traceability link matching farm plot GPS, farmer ledger &amp; packhouse lot.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[10px]">
            {/* Failure Mode */}
            <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300">
              <div className="font-bold flex items-center gap-1 text-[10px]">
                <AlertOctagon className="w-3 h-3 text-rose-400" />
                Failure: Cryptographic CoI Denial
              </div>
              <div className="text-[9.5px] text-rose-400/80 mt-0.5">
                Hash mismatch or unaccredited farmer lot blocks Certificate of Inspection.
              </div>
            </div>

            {/* Practical Impact */}
            <div className="flex items-center justify-between font-mono px-1 text-slate-400">
              <span>Financial Impact:</span>
              <span className="text-rose-400 font-bold">100% Export Ban of Batch</span>
            </div>

            {/* SOP Protocol */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-[10px]">
              <span className="font-bold text-slate-200">Statutory SOP:</span> Reconcile packhouse barcode against
              testing agency memo prior to container stuffing.
            </div>
          </div>
        </div>

        {/* Stage 04: Quality Ledger & Diversion SOP (Dynamic Failure State) */}
        <div
          id="apeda-stage-4-card"
          className={}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className={}
              >
                Stage 04
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <FlaskConical className="w-3 h-3 text-cyan-400" />
                WTO SPS Art. 5
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">
                Quality Ledger &amp; Diversion SOP
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                Chemical residue audit against destination MRL limits &amp; pre-shipment treatment gates.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-[10px]">
            {/* Failure Mode */}
            <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300">
              <div className="font-bold flex items-center gap-1 text-[10px]">
                <AlertOctagon className="w-3 h-3 text-rose-400" />
                Failure: Destination MRL Breach
              </div>
              <div className="text-[9.5px] text-rose-400/80 mt-0.5">
                EU LOQ breach (e.g. Tricyclazole &gt; 0.01 PPM) triggers destination customs seizure.
              </div>
            </div>

            {/* Practical Impact */}
            <div className="flex items-center justify-between font-mono px-1 text-slate-400">
              <span>Financial Impact:</span>
              <span className="text-rose-400 font-bold">₹18.5L - ₹42L Re-export Loss</span>
            </div>

            {/* SOP Protocol & 1-Tap Diversion */}
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-[10px]">
              <span className="font-bold text-slate-200">Statutory SOP:</span> Perform multi-residue NABL screening.
              If LOQ breached, execute immediate statutory diversion to GCC (SFDA GSO 382).
            </div>

            {/* 1-Click Diversion Trigger */}
            {!auditPassed && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onMarketChange('GCC')}
                  className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  ⚡ Divert Consignment to GCC / SFDA
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApedaExecutionRail;
