import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  ExternalLink,
  DollarSign,
  Scale,
  Clock,
  Layers,
  ThermometerSnowflake,
  Radiation,
  CheckCircle2,
  FileText,
  Building2,
  ArrowRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';

export interface TraceabilityPreset {
  id: string;
  name: string;
  hsCode: string;
  engineName: string;
  portalUrl: string;
  authority: string;
  scope: string;
  mandatoryTreatment: string;
  treatmentAuthority: string;
  destinationDefault: string;
  failureMode: {
    title: string;
    description: string;
    alertLevel: 'CRITICAL' | 'HIGH' | 'STRICT';
  };
  financialShield: {
    costSaved: string;
    commercialAdvantage: string;
  };
  operationalSop: string[];
  mrlLedger: Array<{
    compound: string;
    context: string;
    testedValue: number;
    statutoryMRL: number;
    unit: string;
    status: 'PASS' | 'FAIL';
    guidance: string;
  }>;
}

export const TRACEABILITY_ECOSYSTEMS: Record<string, TraceabilityPreset> = {
  basmati_rice: {
    id: 'basmati_rice',
    name: '🌾 Basmati Rice (Pusa 1121 / 1509)',
    hsCode: '10063020',
    engineName: 'BasmatiNet',
    portalUrl: 'https://apeda.gov.in/basmatinet/',
    authority: 'APEDA & Export Inspection Council (EIC)',
    scope: 'Mandatory DNA Authenticity (>80% pure) & Chemical Pesticide Residue Verification',
    mandatoryTreatment: 'Multi-Residue Pesticide Screen (Tricyclazole, Chlorpyrifos) & DNA Purity Assay',
    treatmentAuthority: 'EIC / NABL ISO/IEC 17025 Accredited Laboratories',
    destinationDefault: 'EU',
    failureMode: {
      title: 'EU LOQ Rejection & Rapid Alert (RASFF)',
      description: 'Tricyclazole residue >0.01 mg/kg triggers automatic vessel refusal, border seizure, and mandatory re-export or cargo incineration at European ports.',
      alertLevel: 'CRITICAL'
    },
    financialShield: {
      costSaved: '₹22.5 Lakh / 40ft FCL container (Zero port destruction charges, zero high-seas demurrage)',
      commercialAdvantage: 'Direct CIF Rotterdam clearance at zero duty under EU Basmati Import Quotas'
    },
    operationalSop: [
      'Farm Plot Geotagging & Farmer Ledger Registration on BasmatiNet.',
      'Representative composite sampling by EIC-authorized NABL agency at mill gate.',
      'Direct API ingestion of GC-MS/MS & LC-MS/MS residue test memos to APEDA.',
      'Generation of cryptographic digital Certificate of Inspection (CoI) prior to stuffing.'
    ],
    mrlLedger: [
      { compound: 'Tricyclazole', context: 'EU Default LOQ', testedValue: 0.018, statutoryMRL: 0.01, unit: 'mg/kg (ppm)', status: 'FAIL', guidance: 'EU LOQ violation! Re-route consignment to GCC (SFDA tolerance 1.0 mg/kg).' },
      { compound: 'Isoprothiolane', context: 'Fungicide tolerance', testedValue: 0.45, statutoryMRL: 1.0, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Within permissible statutory limits.' },
      { compound: 'Chlorpyrifos', context: 'EU Ban limit', testedValue: 0.005, statutoryMRL: 0.01, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Compliant with strict pesticide prohibition.' },
      { compound: 'Thiamethoxam', context: 'Neonicotinoid LOQ', testedValue: 0.008, statutoryMRL: 0.01, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Within statutory margin.' }
    ]
  },
  fresh_grapes: {
    id: 'fresh_grapes',
    name: '🍇 Fresh Table Grapes (Thompson Seedless)',
    hsCode: '08061000',
    engineName: 'GrapeNet',
    portalUrl: 'https://apeda.gov.in/grapenet/',
    authority: 'APEDA & Maharashtra State Horticulture Dept (MSAMB)',
    scope: 'End-to-End Farm-to-Fork Traceability for 42,000+ Registered Vineyards in Nashik & Sangli',
    mandatoryTreatment: 'Rapid Pre-Cooling to 0–1°C within 6h + SO2 Pad Integration in Carton Boxes',
    treatmentAuthority: 'APEDA Recognized Cold-Chain Packhouse & National Referral Lab (NRC Grapes)',
    destinationDefault: 'EU',
    failureMode: {
      title: 'GrapeNet Lot Disconnect & Chlormequat/Imidacloprid Ban',
      description: 'Unregistered plot harvest or pesticide breach blocks digital Agmark phytosanitary certificate; cargo detained at Rotterdam/Hamburg terminals.',
      alertLevel: 'CRITICAL'
    },
    financialShield: {
      costSaved: '€35,000 / Reefer Container (Eliminates high-seas dumping & reefer plug-in penalty)',
      commercialAdvantage: 'Unlocks tier-1 UK/EU supermarket direct vendor contracts (Tesco, Albert Heijn, Carrefour)'
    },
    operationalSop: [
      'Vineyard plot registration with Mahagrapes / State Agmark Directorate.',
      'NRC Grapes authorized sampling 15 days prior to harvest window.',
      'Pre-cooling chamber pull-down to 0-1°C within 6 hours of harvest to arrest decay.',
      'APEDA QR-coded Agmark Phytosanitary Certificate issued via GrapeNet.'
    ],
    mrlLedger: [
      { compound: 'Imidacloprid', context: 'Strict EU LOQ threshold', testedValue: 0.006, statutoryMRL: 0.01, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Compliant with EU pesticide directive.' },
      { compound: 'Metalaxyl', context: 'EU fungicide MRL', testedValue: 0.35, statutoryMRL: 1.0, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Within legal safety threshold.' },
      { compound: 'Lambda-cyhalothrin', context: 'Insecticide limit', testedValue: 0.04, statutoryMRL: 0.08, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Statutory compliance confirmed.' },
      { compound: 'Chlormequat', context: 'Plant growth regulator LOQ', testedValue: 0.02, statutoryMRL: 0.05, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Within EU acceptable residue limit.' }
    ]
  },
  fresh_mangoes: {
    id: 'fresh_mangoes',
    name: '🥭 Fresh Mangoes (Alphonso / Kesar)',
    hsCode: '08045020',
    engineName: 'HortiNet',
    portalUrl: 'https://apeda.gov.in/hortinet/',
    authority: 'APEDA & DPPQ&S (Joint USDA APHIS / Japan MAFF Protocol)',
    scope: 'Quarantine Pest Disinfestation (Fruit Fly & Stone Weevil Eradication)',
    mandatoryTreatment: 'Gamma Irradiation (Min 400 Gray dose) for USA / VHT (47.5°C) for Japan',
    treatmentAuthority: 'BARC / KRUSHAK (Lasalgaon) or Vashi Irradiation Facility + DPPQ&S Quarantine Officer',
    destinationDefault: 'USA',
    failureMode: {
      title: 'USDA APHIS Port Entry Refusal (Fruit Fly Larvae)',
      description: 'Non-irradiated or improperly treated cartons face immediate CBP emergency action notification; destroyed at JFK/ORD airport cargo terminals.',
      alertLevel: 'CRITICAL'
    },
    financialShield: {
      costSaved: '$18,000 / Air Cargo ULD Pallet (Protects high-value perishable air freight)',
      commercialAdvantage: 'Commands premium $45-$65/box wholesale realization in US diaspora ethnic markets'
    },
    operationalSop: [
      'Orchard registration on HortiNet with fruit fly trap monitoring records.',
      'Packhouse sorting, hot water washing, and USDA/DPPQ&S joint pre-inspection.',
      'Gamma irradiation at BARC Krushak (Lasalgaon/Vashi) with dosimeter verification.',
      'Tamper-evident quarantine security tape sealing prior to airport transfer.'
    ],
    mrlLedger: [
      { compound: 'Carbendazim', context: 'FDA action level', testedValue: 0.08, statutoryMRL: 0.20, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Within US FDA import tolerance.' },
      { compound: 'Cypermethrin', context: 'EPA MRL', testedValue: 0.05, statutoryMRL: 0.20, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Compliant with US EPA requirements.' },
      { compound: 'Deltamethrin', context: 'Insecticide limit', testedValue: 0.02, statutoryMRL: 0.05, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Within statutory tolerance.' }
    ]
  },
  buffalo_meat: {
    id: 'buffalo_meat',
    name: '🥩 Boneless Buffalo Meat (Frozen Carcass)',
    hsCode: '02023000',
    engineName: 'MeatNet',
    portalUrl: 'https://apeda.gov.in/meatnet/',
    authority: 'APEDA & Department of Animal Husbandry and Dairying (DAHD)',
    scope: 'Integrated Mechanized Abattoir Surveillance & Disease-Free Certification',
    mandatoryTreatment: 'Antemortem/Postmortem Veterinary Inspection + Blast Freezing (-40°C) + Halal Protocol',
    treatmentAuthority: 'State Veterinary Officer & SFDA/JAKIM Recognized Halal Certification Body',
    destinationDefault: 'GCC',
    failureMode: {
      title: 'Banned Antibiotic / Microbiological Pathogen Confiscation',
      description: 'Detection of Salmonella, Nitrofuran (AOZ), or Chloramphenicol triggers blacklisting of Indian abattoir and total countrywide import halt.',
      alertLevel: 'CRITICAL'
    },
    financialShield: {
      costSaved: '$65,000 / 40ft Reefer Container (Safeguards against destination port rejection and bilateral ban)',
      commercialAdvantage: 'Uninterrupted green-channel customs clearance at Jeddah, Jebel Ali, and Haiphong'
    },
    operationalSop: [
      'Ante-mortem animal inspection at APEDA-registered integrated meat complex.',
      'Post-mortem sanitary check, carcass deboning, and deglanding.',
      'Blast freezing to core temperature of -18°C within 24 hours of slaughter.',
      'Veterinary Health Certificate generation and digital MeatNet container seal lock.'
    ],
    mrlLedger: [
      { compound: 'Salmonella', context: 'Absence in 25g sample', testedValue: 0.0, statutoryMRL: 0.0, unit: 'Zero Tolerance', status: 'PASS', guidance: 'Zero tolerance verified; pathogen negative.' },
      { compound: 'Nitrofuran AOZ', context: 'Banned veterinary antibiotic', testedValue: 0.0, statutoryMRL: 0.0, unit: 'Zero Tolerance', status: 'PASS', guidance: 'Non-detectable (<0.5 ppb); fully compliant.' },
      { compound: 'Chloramphenicol', context: 'Prohibited antimicrobial drug', testedValue: 0.0, statutoryMRL: 0.0, unit: 'Zero Tolerance', status: 'PASS', guidance: 'Non-detectable (<0.3 ppb); fully compliant.' }
    ]
  },
  peanuts_groundnuts: {
    id: 'peanuts_groundnuts',
    name: '🥜 Groundnuts / Peanuts (Java & Bold)',
    hsCode: '12024200',
    engineName: 'Peanut.Net / TraceNet',
    portalUrl: 'https://apeda.gov.in/tracenet/',
    authority: 'APEDA & Indian Oilseeds and Produce Export Promotion Council (IOPEPC)',
    scope: 'Aflatoxin Management & Electronic Color Sorting Surveillance',
    mandatoryTreatment: 'Electronic Sortex Color Sorting & Pre-Shipment Aflatoxin HPLC Certificate',
    treatmentAuthority: 'APEDA Recognized Peanut Processing Unit & NABL Accredited Laboratory',
    destinationDefault: 'EU',
    failureMode: {
      title: 'Aflatoxin B1 Over-Tolerance Seizure (EU RASFF)',
      description: 'Aflatoxin B1 >2.0 ppb or Total >4.0 ppb triggers immediate RASFF public alert, cargo rejection, and intensified 50% physical border testing.',
      alertLevel: 'STRICT'
    },
    financialShield: {
      costSaved: '₹16.8 Lakh / 20ft Dry Container (Avoids mandatory consignment crushing/destruction at Rotterdam)',
      commercialAdvantage: 'Direct procurement contract eligibility with European confectionery manufacturers'
    },
    operationalSop: [
      'Shelling plant registration and good warehousing practice (GWP) audit.',
      'Moisture control strictly <7.0% during warehousing to prevent Aspergillus flavus.',
      'High-resolution optical Sortex scanning to eject moldy and discolored kernels.',
      'Representative lot sampling under ISO 24333 protocol with HPLC aflatoxin certification.'
    ],
    mrlLedger: [
      { compound: 'Aflatoxin B1', context: 'Max 2.0 ppb statutory fraction', testedValue: 1.50, statutoryMRL: 2.0, unit: 'ppb (parts per billion)', status: 'PASS', guidance: 'Within EU mycotoxin safety threshold.' },
      { compound: 'Aflatoxin Total', context: 'Max 4.0 ppb total (B1+B2+G1+G2)', testedValue: 3.20, statutoryMRL: 4.0, unit: 'ppb (parts per billion)', status: 'PASS', guidance: 'Compliant with EU Regulation 1881/2006.' },
      { compound: 'Chlorpyrifos', context: 'EU LOQ threshold', testedValue: 0.007, statutoryMRL: 0.01, unit: 'mg/kg (ppm)', status: 'PASS', guidance: 'Within statutory tolerance.' }
    ]
  }
};

export interface TraceabilityCommandDeckProps {
  activePresetId: string;
  onSelectPreset: (preset: TraceabilityPreset) => void;
}

export const TraceabilityCommandDeck: React.FC<TraceabilityCommandDeckProps> = ({
  activePresetId = 'basmati_rice',
  onSelectPreset
}) => {
  const activePreset = TRACEABILITY_ECOSYSTEMS[activePresetId] || TRACEABILITY_ECOSYSTEMS.basmati_rice;

  const getAlertBadgeStyle = (level: 'CRITICAL' | 'HIGH' | 'STRICT') => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'STRICT':
      default:
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {/* 1. Interactive Selector Ribbon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sovereign Command Matrix: 5 Traceability Engines
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Select to Deploy State
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
          APEDA Act 1985 / Closed-Loop Telemetry
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {Object.values(TRACEABILITY_ECOSYSTEMS).map((preset) => {
          const isActive = preset.id === activePreset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/50'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              {isActive && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl bg-emerald-500 animate-ping" />
              )}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className={`font-bold ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                    HS {preset.hsCode}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {preset.engineName}
                  </span>
                </div>
                <div className={`text-xs font-bold mt-1.5 line-clamp-1 ${isActive ? 'text-white' : 'text-slate-300'}`}>
                  {preset.name}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9.5px]">
                <span className={isActive ? 'text-slate-300 font-medium' : 'text-slate-500'}>
                  Target: <strong className="text-amber-400 font-mono">{preset.destinationDefault}</strong>
                </span>
                {isActive && (
                  <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                    ● ACTIVE
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Selected Preset Dossier Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3.5">
        {/* Header Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-extrabold uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {activePreset.engineName} Architecture
            </span>
            <span className="text-xs font-bold text-slate-200">
              {activePreset.name} (HS {activePreset.hsCode})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-mono hidden md:inline-block">
              {activePreset.authority}
            </span>
            <a
              href={activePreset.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all"
            >
              <span>{activePreset.portalUrl.replace('https://', '').replace('/', '')}</span>
              <ExternalLink className="w-3 h-3 text-cyan-400" />
            </a>
          </div>
        </div>

        {/* 3-Column Ground Reality Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Column 1: Non-Negotiable Gate & Failure Mode */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  Pre-Shipment Statutory Gate
                </span>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-extrabold border ${getAlertBadgeStyle(activePreset.failureMode.alertLevel)}`}>
                  {activePreset.failureMode.alertLevel} ALERT
                </span>
              </div>
              <div className="font-bold text-slate-200 text-[11.5px] leading-tight">
                {activePreset.failureMode.title}
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                {activePreset.failureMode.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-rose-300/90 font-mono bg-rose-950/20 p-2 rounded-lg border border-rose-900/30">
              <span className="font-bold text-rose-400">Strict Quarantine Mandate:</span> {activePreset.mandatoryTreatment}
            </div>
          </div>

          {/* Column 2: Financial Shield & Commercial Impact */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  Financial Shield &amp; Capital Protection
                </span>
                <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  SHIELD ACTIVE
                </span>
              </div>
              <div className="font-mono font-bold text-emerald-400 text-[11.5px] leading-tight">
                {activePreset.financialShield.costSaved}
              </div>
              <div className="text-[10.5px] text-slate-300 leading-relaxed pt-1">
                <strong className="text-slate-100 font-semibold">Commercial Moat:</strong> {activePreset.financialShield.commercialAdvantage}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <span className="font-bold text-slate-200">Accredited Oversight:</span> {activePreset.treatmentAuthority}
            </div>
          </div>

          {/* Column 3: Mandatory Physical SOP Protocol */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex flex-col justify-between space-y-2.5">
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Physical Packhouse Execution SOP
              </span>
              <ul className="space-y-1.5 text-[10.5px] text-slate-300">
                {activePreset.operationalSop.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 leading-snack">
                    <span className="text-cyan-400 font-mono font-bold text-[10px] flex-shrink-0 mt-0.5">✓</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Default Market: <strong className="text-amber-400">{activePreset.destinationDefault}</strong></span>
              <span className="text-cyan-400 font-bold">100% Traceable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraceabilityCommandDeck;
