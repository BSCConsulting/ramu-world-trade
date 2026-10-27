import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Ship, 
  Globe, 
  Truck, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  RotateCcw,
  Scale
} from 'lucide-react';

export type StageId = 1 | 2 | 3 | 4;

export interface CorridorState {
  activeStage: StageId;
  // Stage 1: Mandi
  mandiBasePrice: number; // ₹/Quintal
  mandiCessPct: number;   // 1.0% to 2.0%
  shrinkagePct: number;   // 4% to 8%
  isPrePackagedBrand: boolean; // false = 0%, true = 5% GST
  
  // Stage 2: e-Way
  corridorDistanceKm: number;
  ewbCreatedHoursAgo: number;
  isTransshipmentChanged: boolean;
  
  // Stage 3: Port FOB
  sbType: 'RODTEP' | 'LUT';
  invoiceFobUsd: number;
  portNode: 'JNPT' | 'MUNDRA' | 'CHENNAI';
  dwellHours: number;
  leoPhytoPassed: boolean;
  leoBlConfirmed: boolean;
  leoEgmFiled: boolean;
  
  // Stage 4: UN Comtrade
  fobUsdPerMt: number;
  freightInsuranceUsdPerMt: number;
  cifUsdPerMt: number;
}

const DEFAULT_STATE: CorridorState = {
  activeStage: 1,
  mandiBasePrice: 7500,
  mandiCessPct: 1.5,
  shrinkagePct: 5.0,
  isPrePackagedBrand: false,
  
  corridorDistanceKm: 78,
  ewbCreatedHoursAgo: 4,
  isTransshipmentChanged: false,
  
  sbType: 'RODTEP',
  invoiceFobUsd: 85000,
  portNode: 'JNPT',
  dwellHours: 24,
  leoPhytoPassed: true,
  leoBlConfirmed: true,
  leoEgmFiled: true,
  
  fobUsdPerMt: 1120,
  freightInsuranceUsdPerMt: 95,
  cifUsdPerMt: 1215,
};

const STORAGE_KEY = 'wot_corridor_engine_state_v1';

export const StatutoryTradeCorridorEngine: React.FC = () => {
  const [state, setState] = useState<CorridorState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* fallback */ }
      }
    }
    return DEFAULT_STATE;
  });

  const [copiedToast, setCopiedToast] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state]);

  // ==================== CALCULATIONS ====================

  // Stage 1: Mandi Calculations
  const cessAmount = (state.mandiBasePrice * state.mandiCessPct) / 100;
  const netWeightFactor = (100 - state.shrinkagePct) / 100;
  const effectiveBaseCost = (state.mandiBasePrice + cessAmount) / netWeightFactor;
  const gstRatePct = state.isPrePackagedBrand ? 5.0 : 0.0;
  const landedCostQuintal = effectiveBaseCost * (1 + gstRatePct / 100);
  const landedCostPerKg = landedCostQuintal / 100;

  // Stage 2: e-Way Transit Calculations
  // Rule 138: 1 day per 200 km (or part thereof), minimum 1 day (24h)
  const validityDays = Math.max(1, Math.ceil(state.corridorDistanceKm / 200));
  const totalValidityHours = validityDays * 24;
  const remainingHours = Math.max(0, totalValidityHours - state.ewbCreatedHoursAgo);
  const isEwbExpired = remainingHours === 0;
  // Section 129 CGST Penalty: 200% of applicable tax if Part-B unmapped or expired
  const assumedConsignmentTaxInr = (state.mandiBasePrice * 100 * (gstRatePct || 5)) / 100;
  const sec129PenaltyInr = (isEwbExpired || state.isTransshipmentChanged) ? assumedConsignmentTaxInr * 2.0 : 0;

  // Stage 3: Port FOB Calculations
  const rodtepRatePct = state.sbType === 'RODTEP' ? 2.5 : 0.0;
  const cbicUsdInr = 86.40;
  const fobInr = state.invoiceFobUsd * cbicUsdInr;
  const expectedScrollInr = (fobInr * rodtepRatePct) / 100;
  const portMedianDwell = state.portNode === 'MUNDRA' ? 36 : 48;
  const isDwellRisk = state.dwellHours > portMedianDwell;
  const isLeoReady = state.leoPhytoPassed && state.leoBlConfirmed && state.leoEgmFiled;

  // Stage 4: UN Comtrade Forensic Mirror
  const actualSpreadPct = state.fobUsdPerMt > 0 
    ? ((state.cifUsdPerMt - state.fobUsdPerMt) / state.fobUsdPerMt) * 100 
    : 0;

  let forensicVerdict: 'NORMAL' | 'UNDER_INVOICED' | 'TRANSFER_PRICING';
  if (actualSpreadPct < 4.0) {
    forensicVerdict = 'UNDER_INVOICED';
  } else if (actualSpreadPct > 18.0) {
    forensicVerdict = 'TRANSFER_PRICING';
  } else {
    forensicVerdict = 'NORMAL';
  }

  // Compound Risk Score (0 to 100)
  let riskDeductions = 0;
  if (state.isPrePackagedBrand) riskDeductions += 10;
  if (isEwbExpired) riskDeductions += 35;
  if (state.isTransshipmentChanged) riskDeductions += 15;
  if (isDwellRisk) riskDeductions += 15;
  if (!isLeoReady) riskDeductions += 15;
  if (forensicVerdict !== 'NORMAL') riskDeductions += 25;
  const compoundScore = Math.max(0, 100 - riskDeductions);

  // Actions
  const handleReset = () => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleCopySummary = () => {
    const summary = `
==================================================
WORLD OF TRADE — 360° CORRIDOR AUDIT SUMMARY
==================================================
Corridor: ${state.portNode} Gateway ➔ Destination CIF
Audit Timestamp: ${new Date().toISOString()}
Compound Risk Rating: ${compoundScore}/100 (${compoundScore >= 80 ? 'LOW RISK' : compoundScore >= 50 ? 'MEDIUM RISK' : 'HIGH SCRUTINY'})

1. DOMESTIC MANDI (Notification 2/2017 & APMC)
- Base Price: ₹${state.mandiBasePrice.toLocaleString('en-IN')}/Qtl | APMC Cess: ${state.mandiCessPct}%
- Moisture Shrinkage: ${state.shrinkagePct}% | Status: ${state.isPrePackagedBrand ? 'Pre-Packaged (5% GST)' : 'Whole Grain (0% GST)'}
- Landed Cost: ₹${landedCostQuintal.toFixed(2)}/Qtl (₹${landedCostPerKg.toFixed(2)}/kg)

2. e-WAY LOGISTICS (Rule 138 CGST)
- Distance: ${state.corridorDistanceKm} KM | Validity Window: ${totalValidityHours}h
- Remaining Hours: ${remainingHours}h (${isEwbExpired ? 'EXPIRED - SEC 129 DETENTION RISK' : 'VALID'})
- Transshipment Alert: ${state.isTransshipmentChanged ? 'VEHICLE MISMATCH (Sec 129 Penalty Active)' : 'CLEARED'}
- Potential Sec 129 Penalty: ₹${sec129PenaltyInr.toLocaleString('en-IN')}

3. PORT FOB & CUSTOMS SCROLL (ICEGATE 2.0)
- Declared FOB: $${state.invoiceFobUsd.toLocaleString()} (₹${Math.round(fobInr).toLocaleString('en-IN')})
- Scheme: ${state.sbType} (${rodtepRatePct}% Remission) | Expected Scroll: ₹${Math.round(expectedScrollInr).toLocaleString('en-IN')}
- CFS Dwell: ${state.dwellHours}h / Median ${portMedianDwell}h (${isDwellRisk ? 'DEMURRAGE RISK' : 'NORMAL'})
- LEO Clearance Checklist: ${isLeoReady ? 'ALL 3 NODES PASS' : 'ACTION REQUIRED'}

4. UN COMTRADE FORENSIC MIRROR
- Declared FOB: $${state.fobUsdPerMt}/MT | Destination CIF: $${state.cifUsdPerMt}/MT
- Maritime Spread: +${actualSpreadPct.toFixed(2)}% | Verdict: ${forensicVerdict}
- Statutory Standard: 6.0% to 14.0% Standard Maritime Spread
==================================================
`.trim();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary).then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2500);
      });
    }
  };

  return (
    <div className="rounded-3xl border p-4 sm:p-5 shadow-2xl space-y-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-emerald-900/10 dark:border-emerald-500/20 text-zinc-900 dark:text-zinc-100 font-sans">
      
      {/* ==================== TERMINAL HEADER ==================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-emerald-600 text-white shadow-md">
            <Scale className="w-5 h-5 font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase">
                Statutory Trade Corridor (Flow 360°)
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Live Execution Deck
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-zinc-500 dark:text-zinc-400">
              Mandi Form 9 &bull; GST Rule 138 &bull; ICEGATE Section 50 &bull; UN Comtrade Mirror Forensic
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopySummary}
            className="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold active:scale-95 transition-all flex items-center gap-1 shadow-sm bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-emerald-500"
          >
            <Copy className="w-3.5 h-3.5 text-emerald-600" />
            <span>{copiedToast ? 'Copied!' : 'Copy Summary'}</span>
          </button>
          <button
            onClick={handleReset}
            title="Reset Corridor Parameters"
            className="p-1.5 rounded-xl border text-[11px] font-bold active:scale-95 transition-all bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-red-500"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ==================== 4-STAGE STEPPER BAR ==================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Stage 1 Pill */}
        <button
          onClick={() => setState(s => ({ ...s, activeStage: 1 }))}
          className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-95 ${
            state.activeStage === 1
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-zinc-400">STAGE 1</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600">
              ₹{landedCostPerKg.toFixed(1)}/kg
            </span>
          </div>
          <div className="font-extrabold text-xs truncate">Domestic Mandi</div>
          <div className="text-[9px] text-zinc-500 truncate">Harvest &bull; APMC Cess</div>
        </button>

        {/* Stage 2 Pill */}
        <button
          onClick={() => setState(s => ({ ...s, activeStage: 2 }))}
          className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-95 ${
            state.activeStage === 2
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-zinc-400">STAGE 2</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
              isEwbExpired ? 'bg-red-500/15 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
            }`}>
              {remainingHours}h Left
            </span>
          </div>
          <div className="font-extrabold text-xs truncate">e-Way Transit</div>
          <div className="text-[9px] text-zinc-500 truncate">Rule 138 &bull; 78 KM Lock</div>
        </button>

        {/* Stage 3 Pill */}
        <button
          onClick={() => setState(s => ({ ...s, activeStage: 3 }))}
          className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-95 ${
            state.activeStage === 3
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-zinc-400">STAGE 3</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
              isLeoReady ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
            }`}>
              {isLeoReady ? 'LEO READY' : 'HOLD'}
            </span>
          </div>
          <div className="font-extrabold text-xs truncate">Port FOB Exit</div>
          <div className="text-[9px] text-zinc-500 truncate">{state.portNode} &bull; ICEGATE</div>
        </button>

        {/* Stage 4 Pill */}
        <button
          onClick={() => setState(s => ({ ...s, activeStage: 4 }))}
          className={`p-2.5 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-95 ${
            state.activeStage === 4
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono font-bold text-zinc-400">STAGE 4</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
              forensicVerdict === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/15 text-red-600'
            }`}>
              +{actualSpreadPct.toFixed(1)}%
            </span>
          </div>
          <div className="font-extrabold text-xs truncate">UN Comtrade CIF</div>
          <div className="text-[9px] text-zinc-500 truncate">Mirror Audit Spread</div>
        </button>
      </div>

      {/* ==================== ACTIVE WORKSPACE SUB-DECKS ==================== */}

      {/* STAGE 1: MANDI & FARMGATE */}
      {state.activeStage === 1 && (
        <div className="p-4 rounded-2xl border space-y-3 bg-zinc-50/70 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-700">
            <div>
              <h3 className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400">
                Stage 1: Domestic Mandi &amp; Farmgate Procurement
              </h3>
              <p className="text-[10px] text-zinc-500">APMC Form 9 &bull; Notification 2/2017-CT(R) &bull; Shrinkage Audit</p>
            </div>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
              Taxable: {state.isPrePackagedBrand ? '5% GST' : '0% Nil Exempt'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Inputs */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  Base Purchase Price (₹/Quintal)
                </label>
                <input
                  type="number"
                  value={state.mandiBasePrice}
                  onChange={e => setState({ ...state, mandiBasePrice: Number(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                    APMC Cess ({state.mandiCessPct}%)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.1"
                    value={state.mandiCessPct}
                    onChange={e => setState({ ...state, mandiCessPct: Number(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                  <span className="text-[9px] font-mono text-zinc-400">₹{cessAmount.toFixed(1)}/Qtl</span>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                    Transit Shrinkage ({state.shrinkagePct}%)
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={state.shrinkagePct}
                    onChange={e => setState({ ...state, shrinkagePct: Number(e.target.value) })}
                    className="w-full accent-emerald-600"
                  />
                  <span className="text-[9px] font-mono text-zinc-400">Loss: {state.shrinkagePct}% Weight</span>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={state.isPrePackagedBrand}
                    onChange={e => setState({ ...state, isPrePackagedBrand: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span className="text-[11px] font-semibold">
                    Pre-packaged / Registered Brand Name Packaging (Notification 31/2022-CT)
                  </span>
                </label>
              </div>
            </div>

            {/* Live Waterfall & Statutory Warning */}
            <div className="p-3 rounded-xl border space-y-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-wider">
                Audited Landed Cost Waterfall
              </span>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Mandi Procurement:</span>
                  <span className="font-mono font-bold">₹{state.mandiBasePrice.toLocaleString('en-IN')}/Qtl</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">APMC Mandi Cess:</span>
                  <span className="font-mono text-amber-600">+₹{cessAmount.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Shrinkage Net True Weight:</span>
                  <span className="font-mono text-zinc-400">{netWeightFactor * 100} kg Net</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Net Landed Quintal:</span>
                  <span className="font-mono text-emerald-600">₹{landedCostQuintal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-emerald-600 pt-0.5">
                  <span>Effective Ground Cost:</span>
                  <span className="font-mono text-sm">₹{landedCostPerKg.toFixed(2)} / kg</span>
                </div>
              </div>

              {state.isPrePackagedBrand ? (
                <div className="p-2 rounded-lg text-[10px] leading-tight bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                  ⚠️ <strong>Statutory Alert:</strong> Pre-packaging under a registered trade brand revokes Notification 2/2017 exemption. Ensure 5% GST is remitted via GSTR-3B to prevent Section 74 penal scrutiny.
                </div>
              ) : (
                <div className="p-2 rounded-lg text-[10px] leading-tight bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  ✓ <strong>100% Nil-Rated:</strong> Whole grain bulk commodity qualifies for zero-GST exemption under Notification 2/2017-Central Tax. Keep Mandi Form 9 receipt in truck for border clearance.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: e-WAY LOGISTICS */}
      {state.activeStage === 2 && (
        <div className="p-4 rounded-2xl border space-y-3 bg-zinc-50/70 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-700">
            <div>
              <h3 className="text-xs font-black uppercase text-blue-700 dark:text-blue-400">
                Stage 2: e-Way Transit &amp; Roadside Seizure Lock
              </h3>
              <p className="text-[10px] text-zinc-500">Rule 138 CGST Rules &bull; Section 129 Detention Shield &bull; Part-B Telematics</p>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
              isEwbExpired ? 'bg-red-500/15 text-red-600' : 'bg-emerald-500/10 text-emerald-600'
            }`}>
              {isEwbExpired ? 'STATUS: EXPIRED' : 'STATUS: TRANSIT ACTIVE'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-2.5">
              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  Corridor Distance (in KM)
                </label>
                <input
                  type="number"
                  value={state.corridorDistanceKm}
                  onChange={e => setState({ ...state, corridorDistanceKm: Number(e.target.value) || 1 })}
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                />
                <span className="text-[9px] text-zinc-400 font-mono">
                  Statutory Rule 138(10): 1 Day per 200 KM = {validityDays} Day ({totalValidityHours}h Window)
                </span>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  Elapsed Transit Time (Hours Ago)
                </label>
                <input
                  type="range"
                  min="0"
                  max={totalValidityHours + 12}
                  step="1"
                  value={state.ewbCreatedHoursAgo}
                  onChange={e => setState({ ...state, ewbCreatedHoursAgo: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                  <span>Dispatched: {state.ewbCreatedHoursAgo}h ago</span>
                  <span className={remainingHours < 4 ? 'text-red-500 font-bold' : ''}>Remaining: {remainingHours}h</span>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={state.isTransshipmentChanged}
                    onChange={e => setState({ ...state, isTransshipmentChanged: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-0"
                  />
                  <span className="text-[11px] font-semibold">
                    Vehicle Breakdown / Transshipment (Plate changed without updating Part-B)
                  </span>
                </label>
              </div>
            </div>

            {/* Section 129 Penalty Simulator */}
            <div className="p-3 rounded-xl border space-y-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-wider">
                Section 129 CGST Detention Simulator
              </span>
              
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Applicable Invoice Tax:</span>
                  <span className="font-mono font-bold">₹{assumedConsignmentTaxInr.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Section 129(1)(a) Penalty (200%):</span>
                  <span className={`font-mono font-bold ${sec129PenaltyInr > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ₹{sec129PenaltyInr.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {sec129PenaltyInr > 0 ? (
                <div className="p-2.5 rounded-lg text-[10px] leading-tight bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>HIGH DETENTION RISK AT ROADSIDE CHECKPOST:</span>
                  </div>
                  <p>
                    Vehicle is vulnerable to interception under Section 68. Officers will issue Form GST MOV-06 (Detention). 
                    <strong>Immediate Mitigation:</strong> File online extension under Rule 138(10) within 8 hours of expiry or update Part-B transshipment before the truck passes the toll plaza.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg text-[10px] leading-tight bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  ✓ <strong>Transit Lock Secure:</strong> Vehicle number matches Part-B on GSTN portal and validity window has {remainingHours} hours remaining. Zero Section 129 penalty exposure.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: PORT FOB & CUSTOMS SCROLL */}
      {state.activeStage === 3 && (
        <div className="p-4 rounded-2xl border space-y-3 bg-zinc-50/70 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-700">
            <div>
              <h3 className="text-xs font-black uppercase text-amber-700 dark:text-amber-400">
                Stage 3: Port FOB &amp; ICEGATE Customs Scroll
              </h3>
              <p className="text-[10px] text-zinc-500">Section 50 Shipping Bill &bull; LEO Verification &bull; RoDTEP Monetization</p>
            </div>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              Gateway: {state.portNode}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                    Shipping Bill Type
                  </label>
                  <select
                    value={state.sbType}
                    onChange={e => setState({ ...state, sbType: e.target.value as any })}
                    className="w-full p-2 rounded-xl border text-xs font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                  >
                    <option value="RODTEP">Drawback &amp; RoDTEP (2.5%)</option>
                    <option value="LUT">LUT Export (Sec 16 IGST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                    Port / CFS Node
                  </label>
                  <select
                    value={state.portNode}
                    onChange={e => setState({ ...state, portNode: e.target.value as any })}
                    className="w-full p-2 rounded-xl border text-xs font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                  >
                    <option value="JNPT">JNPT Nhava Sheva (Median 48h)</option>
                    <option value="MUNDRA">Mundra Port (Median 36h)</option>
                    <option value="CHENNAI">Chennai Port (Median 40h)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  Declared Invoice FOB Value ($ USD)
                </label>
                <input
                  type="number"
                  value={state.invoiceFobUsd}
                  onChange={e => setState({ ...state, invoiceFobUsd: Number(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  CFS Carting Dwell Time: {state.dwellHours} Hours
                </label>
                <input
                  type="range"
                  min="12"
                  max="96"
                  step="6"
                  value={state.dwellHours}
                  onChange={e => setState({ ...state, dwellHours: Number(e.target.value) })}
                  className="w-full accent-amber-600"
                />
                <span className={`text-[9px] font-mono ${isDwellRisk ? 'text-red-500 font-bold' : 'text-zinc-400'}`}>
                  {isDwellRisk ? `⚠️ Demurrage Alert: Exceeds ${portMedianDwell}h median dwell!` : `Normal Dwell (<${portMedianDwell}h)`}
                </span>
              </div>
            </div>

            {/* LEO Checklist & RoDTEP Remission Yield */}
            <div className="p-3 rounded-xl border space-y-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-wider">
                LEO Clearance &amp; RoDTEP Yield Ledger
              </span>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Converted FOB Value:</span>
                  <span className="font-mono font-bold">₹{Math.round(fobInr).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Expected Scroll Inflow:</span>
                  <span className="font-mono font-extrabold text-emerald-600">₹{Math.round(expectedScrollInr).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="border-t pt-2 space-y-1.5">
                <span className="text-[9px] font-bold uppercase text-zinc-400 block">
                  Mandatory Let Export Order (LEO) Milestones:
                </span>
                <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.leoPhytoPassed}
                    onChange={e => setState({ ...state, leoPhytoPassed: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Phytosanitary / FSSAI Laboratory Release Order</span>
                </label>
                <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.leoBlConfirmed}
                    onChange={e => setState({ ...state, leoBlConfirmed: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Shipping Line Container Gate-In &amp; MBL Release</span>
                </label>
                <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.leoEgmFiled}
                    onChange={e => setState({ ...state, leoEgmFiled: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-0"
                  />
                  <span>Export General Manifest (EGM) Final Vessel Filing</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 4: UN COMTRADE FORENSIC MIRROR */}
      {state.activeStage === 4 && (
        <div className="p-4 rounded-2xl border space-y-3 bg-zinc-50/70 dark:bg-zinc-800/30 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b pb-2 border-zinc-200 dark:border-zinc-700">
            <div>
              <h3 className="text-xs font-black uppercase text-purple-700 dark:text-purple-400">
                Stage 4: International CIF &amp; UN Comtrade Forensic Mirror
              </h3>
              <p className="text-[10px] text-zinc-500">Cross-Border Valuation &bull; Transfer Pricing Defense &bull; Mirror Reconciler</p>
            </div>
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600">
              UN Comtrade v3 Audit
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-2.5">
              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  India Export Invoice Rate (FOB USD/MT)
                </label>
                <input
                  type="number"
                  value={state.fobUsdPerMt}
                  onChange={e => setState({ ...state, fobUsdPerMt: Number(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  Maritime Freight &amp; Insurance ($ USD/MT)
                </label>
                <input
                  type="number"
                  value={state.freightInsuranceUsdPerMt}
                  onChange={e => setState({ ...state, freightInsuranceUsdPerMt: Number(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold uppercase text-zinc-500 mb-0.5">
                  Destination Country CIF Declaration ($ USD/MT)
                </label>
                <input
                  type="number"
                  value={state.cifUsdPerMt}
                  onChange={e => setState({ ...state, cifUsdPerMt: Number(e.target.value) || 0 })}
                  className="w-full p-2 rounded-xl border text-xs font-mono font-bold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                />
              </div>
            </div>

            {/* Spread Auditor Verdict Card */}
            <div className="p-3 rounded-xl border space-y-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
              <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-wider">
                Forensic CIF/FOB Spread Calculation
              </span>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Declared FOB:</span>
                  <span className="font-mono font-bold">${state.fobUsdPerMt}/MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Destination CIF:</span>
                  <span className="font-mono font-bold">${state.cifUsdPerMt}/MT</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-bold">
                  <span>Computed Spread:</span>
                  <span className="font-mono text-sm text-emerald-600">+{actualSpreadPct.toFixed(2)}%</span>
                </div>
              </div>

              {forensicVerdict === 'NORMAL' && (
                <div className="p-2.5 rounded-lg text-[10px] leading-tight bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  ✓ <strong>NORMAL MARITIME SPREAD:</strong> The +{actualSpreadPct.toFixed(2)}% margin matches empirical ocean transit + marine cover benchmarks (6%–14%). Passable in bilateral customs mirror cross-checks.
                </div>
              )}
              {forensicVerdict === 'UNDER_INVOICED' && (
                <div className="p-2.5 rounded-lg text-[10px] leading-tight bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                  ⚠️ <strong>LOW SPREAD RISK (&lt;4%):</strong> Freight margin appears under-reported. Risk of special valuation audit under Section 14 Customs Valuation Rules for suspected transfer mispricing.
                </div>
              )}
              {forensicVerdict === 'TRANSFER_PRICING' && (
                <div className="p-2.5 rounded-lg text-[10px] leading-tight bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400">
                  🚨 <strong>CRIMSON ALERT (&gt;18%):</strong> Discrepancy exceeds standard maritime thresholds. Flagged for potential invoice over-invoicing or hawala round-tripping scrutiny by regulatory intelligence agencies.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== UNIVERSAL CONSIGNMENT RISK RADAR ==================== */}
      <div className="p-3.5 rounded-2xl border space-y-2.5 bg-zinc-900 text-white dark:bg-black border-zinc-800">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs font-black">● TELEMETRY RADAR</span>
            <span className="text-[10px] text-zinc-400">Compound Cross-Corridor Risk Assessment</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs font-black">
            <span>Score:</span>
            <span className={compoundScore >= 80 ? 'text-emerald-400' : compoundScore >= 50 ? 'text-amber-400' : 'text-red-400'}>
              {compoundScore}/100 {compoundScore >= 80 ? 'COMPLIANT' : 'SCRUTINY'}
            </span>
          </div>
        </div>

        {/* 4 Summary Telemetry Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
            <span className="text-[8px] font-mono text-zinc-400 uppercase block">1. Mandi Landed</span>
            <span className="font-mono font-bold text-emerald-400">₹{landedCostPerKg.toFixed(2)} / kg</span>
          </div>
          <div className="p-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
            <span className="text-[8px] font-mono text-zinc-400 uppercase block">2. e-Way Lock</span>
            <span className={`font-mono font-bold ${isEwbExpired ? 'text-red-400' : 'text-emerald-400'}`}>
              {remainingHours}h ({isEwbExpired ? 'EXPIRED' : 'ACTIVE'})
            </span>
          </div>
          <div className="p-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
            <span className="text-[8px] font-mono text-zinc-400 uppercase block">3. RoDTEP Inflow</span>
            <span className="font-mono font-bold text-amber-400">₹{Math.round(expectedScrollInr).toLocaleString('en-IN')}</span>
          </div>
          <div className="p-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
            <span className="text-[8px] font-mono text-zinc-400 uppercase block">4. Comtrade Spread</span>
            <span className={`font-mono font-bold ${forensicVerdict === 'NORMAL' ? 'text-emerald-400' : 'text-red-400'}`}>
              +{actualSpreadPct.toFixed(1)}% {forensicVerdict === 'NORMAL' ? 'OK' : 'RISK'}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
