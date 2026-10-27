"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Ship,
  Search,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Percent,
  Sliders,
  DollarSign,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Download,
  BookOpen,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Eye,
  Scale,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";

// ============================================================================
// DOMAIN TYPES & INTERFACES
// ============================================================================

export interface PortStatusFeed {
  id: string;
  name: string;
  code: string;
  medianDwellHours: number;
  status: "normal" | "fast" | "congested";
  statusText: string;
  throughput: string;
  dwellAlertThreshold: number;
}

export interface CommodityData {
  hsnCode: string;
  name: string;
  plainName: string;
  category: string;
  chapter: string;
  bcdRate: number; // Percentage
  swsRate: number; // 10% of BCD
  aidcRate: number; // Percentage on Assessable Value
  igstRate: number; // Percentage
  council: string;
  standardCifUsd: number;
  cepaBcdRate: number;
  aiftaBcdRate: number;
  cepaMinVaPct: number;
  almmMandate?: boolean;
  notes: string;
  deepLinkTradestat: string;
  deepLinkIcegate: string;
}

export interface PracticeSessionFixture {
  countId: number;
  title: string;
  commodityName: string;
  hsnCode: string;
  lotVolume: string;
  declaredFobInr: number;
  freightCostInr: number;
  step1Options: {
    label: string;
    description: string;
    gstRatePct: number;
    statutoryNote: string;
    isRecommended: boolean;
  }[];
  step2Options: {
    destination: string;
    jurisdiction: string;
    mrlThreshold: string;
    portMedianHours: number;
    freightMultiplier: number;
  }[];
  step3Metrics: {
    name: string;
    description: string;
    unit: string;
    safeThreshold: number;
    defaultReading: number;
    riskReading: number;
  };
  forensicChecklist: string[];
}

// ============================================================================
// GROUND TRUTH FIXTURES & DATASETS
// ============================================================================

export const PORT_STATUS_FEEDS: PortStatusFeed[] = [
  {
    id: "jnpt",
    name: "JNPT (Nhava Sheva)",
    code: "INNSA1",
    medianDwellHours: 36.4,
    status: "normal",
    statusText: "Normal Gate Clearance • Rule 138 Part-B Synced",
    throughput: "5.2M TEU",
    dwellAlertThreshold: 48,
  },
  {
    id: "mundra",
    name: "Mundra Port (Adani)",
    code: "INMUN1",
    medianDwellHours: 28.1,
    status: "fast",
    statusText: "Fast Track Flow • Direct Port Entry Active",
    throughput: "6.8M TEU",
    dwellAlertThreshold: 36,
  },
  {
    id: "chennai",
    name: "Chennai Seaport",
    code: "INMAA1",
    medianDwellHours: 49.2,
    status: "congested",
    statusText: "⚠️ Congestion Alert (+12h CFS Demurrage Exposure)",
    throughput: "1.6M TEU",
    dwellAlertThreshold: 42,
  },
  {
    id: "vizag",
    name: "Vizag Port",
    code: "INVTZ1",
    medianDwellHours: 33.0,
    status: "normal",
    statusText: "Normal Inflow • Coastal Corridor Transit Steady",
    throughput: "1.1M TEU",
    dwellAlertThreshold: 40,
  },
];

export const COMMODITY_DATABASE: Record<string, CommodityData> = {
  "09042110": {
    hsnCode: "09042110",
    name: "Guntur S4 / Teja Sun-Dried Red Chilli",
    plainName: "Dry Red Chilli (Whole)",
    category: "Agriculture & Spices",
    chapter: "Chapter 09 (Coffee, Tea, Mate and Spices)",
    bcdRate: 30.0,
    swsRate: 10.0,
    aidcRate: 0.0,
    igstRate: 5.0,
    council: "Spices Board of India (Cochin)",
    standardCifUsd: 3200,
    cepaBcdRate: 0.0,
    aiftaBcdRate: 5.0,
    cepaMinVaPct: 35.0,
    notes: "Requires mandatory Spices Board Quality Certificate and EU TRACES phytosanitary filing.",
    deepLinkTradestat: "https://tradestat.commerce.gov.in/eidb/commodity_wise_import",
    deepLinkIcegate: "https://www.icegate.gov.in/cdc",
  },
  "87116010": {
    hsnCode: "87116010",
    name: "Electric Two-Wheeler Motor & Drive Unit Assembly",
    plainName: "EV Scooter Components (Kit Form)",
    category: "Automotive & Electric Mobility",
    chapter: "Chapter 87 (Vehicles other than railway or tramway)",
    bcdRate: 15.0, // CKD kit rate
    swsRate: 10.0,
    aidcRate: 0.0,
    igstRate: 18.0,
    council: "EEPC India (Engineering Export Promotion Council)",
    standardCifUsd: 450,
    cepaBcdRate: 0.0,
    aiftaBcdRate: 0.0,
    cepaMinVaPct: 35.0,
    notes: "Customs General Rule 2(a) caution: complete assemblies shipped in single container may attract CBU duty (50%).",
    deepLinkTradestat: "https://tradestat.commerce.gov.in/eidb/commodity_wise_import",
    deepLinkIcegate: "https://www.icegate.gov.in/cdc",
  },
  "85414300": {
    hsnCode: "85414300",
    name: "Photovoltaic Solar Cells Assembled in Modules / Panels",
    plainName: "Solar PV Panels / Cells",
    category: "Renewable Energy & CleanTech",
    chapter: "Chapter 85 (Electrical machinery and equipment)",
    bcdRate: 25.0,
    swsRate: 10.0,
    aidcRate: 0.0,
    igstRate: 12.0,
    council: "IREDA & Ministry of New and Renewable Energy (MNRE)",
    standardCifUsd: 18500,
    cepaBcdRate: 0.0,
    aiftaBcdRate: 0.0,
    cepaMinVaPct: 40.0,
    almmMandate: true,
    notes: "Non-Tariff Barrier: Must be listed under ALMM (Approved List of Models and Manufacturers) to grid connect in India.",
    deepLinkTradestat: "https://tradestat.commerce.gov.in/eidb/commodity_wise_import",
    deepLinkIcegate: "https://www.icegate.gov.in/cdc",
  },
  "03061720": {
    hsnCode: "03061720",
    name: "Litopenaeus Vannamei Frozen Marine Shrimp (Tail-on)",
    plainName: "Frozen Cultured Shrimp",
    category: "Marine & Aquaculture",
    chapter: "Chapter 03 (Fish and crustaceans)",
    bcdRate: 30.0,
    swsRate: 10.0,
    aidcRate: 0.0,
    igstRate: 5.0,
    council: "MPEDA (Marine Products Export Development Authority)",
    standardCifUsd: 7800,
    cepaBcdRate: 0.0,
    aiftaBcdRate: 0.0,
    cepaMinVaPct: 35.0,
    notes: "Requires US FDA Chloramphenicol testing and EIA EU Catch Certificate.",
    deepLinkTradestat: "https://tradestat.commerce.gov.in/eidb/commodity_wise_import",
    deepLinkIcegate: "https://www.icegate.gov.in/cdc",
  },
  "71131910": {
    hsnCode: "71131910",
    name: "Plain Gold Jewelry (22 Karat / 916 Hallmarked)",
    plainName: "Plain Gold Jewelry",
    category: "Gems & Jewelry",
    chapter: "Chapter 71 (Natural or cultured pearls, precious metals)",
    bcdRate: 12.5, // Union Budget 2024 revised rate
    swsRate: 10.0,
    aidcRate: 5.0,
    igstRate: 3.0,
    council: "GJEPC (Gem & Jewellery Export Promotion Council)",
    standardCifUsd: 74000,
    cepaBcdRate: 0.0,
    aiftaBcdRate: 12.5,
    cepaMinVaPct: 3.0, // Special CEPA Annexure for Gold Jewelry
    notes: "Under India-UAE CEPA Tariff Rate Quota (TRQ), preferential 0% tariff applies with GJEPC Proof of Origin.",
    deepLinkTradestat: "https://tradestat.commerce.gov.in/eidb/commodity_wise_import",
    deepLinkIcegate: "https://www.icegate.gov.in/cdc",
  },
};

export const PRACTICE_SESSIONS: PracticeSessionFixture[] = [
  {
    countId: 1,
    title: "Count 1: Agri Consignment - Guntur Chilli & EU MRL Audit",
    commodityName: "Guntur S4 / Teja Sun-Dried Red Chilli",
    hsnCode: "09042110",
    lotVolume: "14 Metric Tonnes (1 x 40ft FCL Reefer)",
    declaredFobInr: 4480000,
    freightCostInr: 320000,
    step1Options: [
      {
        label: "Bulk Unbranded Jute / Gunny Bags (Mandi Lot)",
        description: "Zero GST under Notif 2/2017-CT(R). Standard Mandi Form 9 issued at farmgate.",
        gstRatePct: 0.0,
        statutoryNote: "Exempt from GST. Valid APMC Form 9 required in transit cabin for border tax shield.",
        isRecommended: true,
      },
      {
        label: "Pre-packaged & Branded Pouches (< 25kg)",
        description: "Notification 31/2022-CT statutory threshold. Tax invoice mandatory.",
        gstRatePct: 5.0,
        statutoryNote: "Requires 5% GST invoicing and E-Way Bill Part-A tax matching. Input Tax Credit claimable.",
        isRecommended: false,
      },
    ],
    step2Options: [
      {
        destination: "Rotterdam Seaport (EU Market)",
        jurisdiction: "European Commission DG SANTE (Strict 0.01 ppm LOQ)",
        mrlThreshold: "0.010 ppm (Aflatoxin B1: 5.0 ppb)",
        portMedianHours: 36,
        freightMultiplier: 1.0,
      },
      {
        destination: "Houston Terminal (USA Market)",
        jurisdiction: "US FDA Import Tolerance / ASTA Standard",
        mrlThreshold: "0.020 ppm (Aflatoxin: 20.0 ppb)",
        portMedianHours: 42,
        freightMultiplier: 1.15,
      },
      {
        destination: "Domestic Inter-State Transfer (Delhi Mandi)",
        jurisdiction: "FSSAI Food Safety & Standards Regulations 2011",
        mrlThreshold: "0.050 ppm (Domestic Limits)",
        portMedianHours: 12,
        freightMultiplier: 0.25,
      },
    ],
    step3Metrics: {
      name: "Triazophos / Chlorpyrifos Chemical Residue",
      description: "Gas Chromatography Mass Spectrometry (GC-MS) laboratory reading",
      unit: "ppm (parts per million)",
      safeThreshold: 0.01,
      defaultReading: 0.007,
      riskReading: 0.018,
    },
    forensicChecklist: [
      "Rule 138(10) CGST e-Way Bill generated with truck registration plate locked in Part-B.",
      "Spices Board of India Certificate of Inspection (CoI) attached with official batch seals.",
      "EIC (Export Inspection Council) accredited lab analysis certificate verifying aflatoxin < 5 ppb.",
      "Single-Window ICEGATE Shipping Bill filed under Section 50 with RoDTEP 2.5% declaration.",
    ],
  },
  {
    countId: 2,
    title: "Count 2: CleanTech Sourcing - Solar PV Cell & ALMM Barrier",
    commodityName: "Photovoltaic Solar Cells in Modules",
    hsnCode: "85414300",
    lotVolume: "2 MegaWatts (5 x 40ft High-Cube Containers)",
    declaredFobInr: 18500000,
    freightCostInr: 950000,
    step1Options: [
      {
        label: "Industrial Project Direct Sourcing (ALMM Certified Tier-1)",
        description: "Direct procurement from MNRE approved manufacturers list.",
        gstRatePct: 12.0,
        statutoryNote: "Eligible for grid connectivity and central financial assistance (CFA).",
        isRecommended: true,
      },
      {
        label: "Spot Market Unlisted Solar Cells",
        description: "Non-ALMM overseas manufacturer offering 15% discount.",
        gstRatePct: 12.0,
        statutoryNote: "🚨 Non-Tariff Seizure: Grid connection denied in India without ALMM certification.",
        isRecommended: false,
      },
    ],
    step2Options: [
      {
        destination: "Mundra Port (Gujarat SEZ Inflow)",
        jurisdiction: "CBIC Customs Notification 24/2022-Customs",
        mrlThreshold: "ALMM Order 2019 List-1 Verified",
        portMedianHours: 28,
        freightMultiplier: 1.0,
      },
      {
        destination: "JNPT Nhava Sheva (Maharashtra Industrial Corridor)",
        jurisdiction: "CBIC Special Economic Zone Gateway",
        mrlThreshold: "ALMM List-1 + BIS IS 14286 Certification",
        portMedianHours: 36,
        freightMultiplier: 1.05,
      },
    ],
    step3Metrics: {
      name: "Photovoltaic Conversion Efficiency Rating",
      description: "MNRE standard laboratory verified module efficiency percentage",
      unit: "% Efficiency",
      safeThreshold: 21.0,
      defaultReading: 22.4,
      riskReading: 19.2,
    },
    forensicChecklist: [
      "Verification of manufacturer entry on active MNRE ALMM List-1 gazette.",
      "Bureau of Indian Standards (BIS) CRS registration number verified on packaging.",
      "Declaration of 25% BCD + 10% SWS with zero concessional diversion.",
      "ICEGATE Bill of Entry reconciliation with DGFT Project Import regulations.",
    ],
  },
  {
    countId: 3,
    title: "Count 3: Micro-Assembly - EV Scooter CKD Arbitrage (Rule 2a)",
    commodityName: "Electric Two-Wheeler Motor & Drive Unit Assembly",
    hsnCode: "87116010",
    lotVolume: "100 Complete Knocked Down (CKD) Kits",
    declaredFobInr: 4500000,
    freightCostInr: 280000,
    step1Options: [
      {
        label: "True Disassembled Component Kits (Split Invoices & Bills of Lading)",
        description: "Motors, batteries, and chassis packed separately in compliance with Rule 2(a).",
        gstRatePct: 18.0,
        statutoryNote: "Legitimate CKD rate of 15% BCD applied. No pre-assembled drive units.",
        isRecommended: true,
      },
      {
        label: "Near-Complete Single Container Shipment",
        description: "All parts packed together into one shipment for ease of assembly.",
        gstRatePct: 18.0,
        statutoryNote: "🚨 Customs Rule 2(a) Hazard: Risk of reclassification into CBU (50% BCD + DRI audit).",
        isRecommended: false,
      },
    ],
    step2Options: [
      {
        destination: "Chennai Seaport (Southern Auto Corridor)",
        jurisdiction: "Chennai Customs Commissionerate II",
        mrlThreshold: "Rule 2(a) Interpretation Manual 2023",
        portMedianHours: 49,
        freightMultiplier: 1.0,
      },
      {
        destination: "JNPT Nhava Sheva (Western Automotive Cluster)",
        jurisdiction: "JNPT Customs Special Valuation Branch (SVB)",
        mrlThreshold: "Standard Component Verification",
        portMedianHours: 36,
        freightMultiplier: 1.1,
      },
    ],
    step3Metrics: {
      name: "Domestic Value Addition (Phased Manufacturing Program)",
      description: "Percentage of local Indian assembly and component sourcing",
      unit: "% Local Value Addition",
      safeThreshold: 50.0,
      defaultReading: 55.0,
      riskReading: 28.0,
    },
    forensicChecklist: [
      "Physical packing lists demonstrate separation of batteries from electric motor hubs.",
      "FAME-II / EMPS 2024 localization documentation signed by chartered engineer.",
      "Clear exclusion of complete vehicle assembly under Customs Tariff General Rules.",
      "SVB (Special Valuation Branch) relationship questionnaire filed if buying from overseas parent.",
    ],
  },
  {
    countId: 4,
    title: "Count 4: Bilateral Corridor - Plain Gold Jewelry under CEPA",
    commodityName: "Plain Gold Jewelry (22 Karat / 916)",
    hsnCode: "71131910",
    lotVolume: "10 Kilograms Fine Hallmarked Gold",
    declaredFobInr: 74000000,
    freightCostInr: 120000,
    step1Options: [
      {
        label: "916 BIS Hallmarked Cast Jewelry with GJEPC Verification",
        description: "Certified plain gold bangles and chains manufactured in SEEPZ / Domestic SEZ.",
        gstRatePct: 3.0,
        statutoryNote: "Qualifies for India-UAE CEPA Preferential 0% customs entry into Dubai.",
        isRecommended: true,
      },
      {
        label: "Unverified Crude Gold Castings",
        description: "High weight crude castings without individual hallmark laser seals.",
        gstRatePct: 3.0,
        statutoryNote: "🚨 Round-Tripping Flag: DRI & Customs scrutiny for bullion disguised as jewelry.",
        isRecommended: false,
      },
    ],
    step2Options: [
      {
        destination: "Dubai International Airport (Air Cargo Hub)",
        jurisdiction: "UAE Federal Customs Authority & CEPA TRQ Desk",
        mrlThreshold: "CEPA Annexure 2-B Origin Criteria (3% VA)",
        portMedianHours: 8,
        freightMultiplier: 1.0,
      },
      {
        destination: "Jebel Ali Free Zone (Sea Cargo Container)",
        jurisdiction: "Dubai Ports World Logistics Terminal",
        mrlThreshold: "CEPA Commercial Proof of Origin",
        portMedianHours: 18,
        freightMultiplier: 0.6,
      },
    ],
    step3Metrics: {
      name: "Domestic Value Addition (CEPA Annexure Rule)",
      description: "Calculation of making charges and domestic fabrication margin",
      unit: "% Value Addition",
      safeThreshold: 3.0,
      defaultReading: 4.8,
      riskReading: 1.4,
    },
    forensicChecklist: [
      "GJEPC-issued Certificate of Origin (Preferential) with active QR validation.",
      "Air Waybill (AWB) consigned to authorized Dubai DMCC bullion dealer.",
      "Real-time e-BRC realization linked to RBI EDPMS monitoring within 9 months.",
      "Gold assay report signed by government-recognized refinery / assayer.",
    ],
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EximOperationalWorkbench() {
  // Global View Controls
  const [isPlainEnglish, setIsPlainEnglish] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"radar" | "practice" | "feeds">("radar");

  // Module B: Reverse HSN & Tariff Radar States
  const [selectedHsn, setSelectedHsn] = useState<string>("09042110");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [cifBaseUsd, setCifBaseUsd] = useState<number>(3200);
  const [exchangeRateInr, setExchangeRateInr] = useState<number>(86.4);
  const [ftaMode, setFtaMode] = useState<"MFN" | "CEPA" | "AIFTA">("MFN");
  const [domesticVaPct, setDomesticVaPct] = useState<number>(40);

  // Module C: Weekly Practice Simulator States
  const [selectedCountId, setSelectedCountId] = useState<number>(1);
  const [practiceStep1Idx, setPracticeStep1Idx] = useState<number>(0);
  const [practiceStep2Idx, setPracticeStep2Idx] = useState<number>(0);
  const [practiceStep3Reading, setPracticeStep3Reading] = useState<number>(0.007);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Active Commodity
  const commodity = useMemo(() => {
    return COMMODITY_DATABASE[selectedHsn] || COMMODITY_DATABASE["09042110"];
  }, [selectedHsn]);

  // Update base CIF when commodity changes
  useEffect(() => {
    if (COMMODITY_DATABASE[selectedHsn]) {
      setCifBaseUsd(COMMODITY_DATABASE[selectedHsn].standardCifUsd);
    }
  }, [selectedHsn]);

  // Active Practice Session
  const practiceSession = useMemo(() => {
    return (
      PRACTICE_SESSIONS.find((s) => s.countId === selectedCountId) ||
      PRACTICE_SESSIONS[0]
    );
  }, [selectedCountId]);

  // Reset practice step inputs when count changes
  useEffect(() => {
    setPracticeStep1Idx(0);
    setPracticeStep2Idx(0);
    setPracticeStep3Reading(practiceSession.step3Metrics.defaultReading);
  }, [practiceSession]);

  // Filtered Commodity Chips based on search query
  const filteredCommodities = useMemo(() => {
    if (!searchQuery.trim()) return Object.values(COMMODITY_DATABASE);
    const q = searchQuery.toLowerCase();
    return Object.values(COMMODITY_DATABASE).filter(
      (c) =>
        c.hsnCode.includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.plainName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // --------------------------------------------------------------------------
  // TARIFF STACKING CALCULATIONS (CBIC STATUTORY FORMULA)
  // --------------------------------------------------------------------------
  const tariffCalc = useMemo(() => {
    const assessableCifInr = cifBaseUsd * exchangeRateInr;

    // Determine Applicable BCD based on FTA and Domestic VA
    let effectiveBcdPct = commodity.bcdRate;
    let rooQualified = false;
    let rooMessage = "";

    if (ftaMode === "CEPA") {
      if (domesticVaPct >= commodity.cepaMinVaPct) {
        effectiveBcdPct = commodity.cepaBcdRate;
        rooQualified = true;
        rooMessage = `✓ QUALIFIES FOR ${commodity.cepaBcdRate}% PREFERENTIAL BCD: Met ${commodity.cepaMinVaPct}% Value Addition threshold under India-UAE CEPA.`;
      } else {
        effectiveBcdPct = commodity.bcdRate;
        rooQualified = false;
        rooMessage = `✕ INELIGIBLE FOR CEPA: Requires minimum ${commodity.cepaMinVaPct}% domestic value addition (current: ${domesticVaPct}%). Standard MFN rate applied.`;
      }
    } else if (ftaMode === "AIFTA") {
      effectiveBcdPct = commodity.aiftaBcdRate;
      rooQualified = true;
      rooMessage = `✓ AIFTA Preferential Rate Applied: Origin verified under India-ASEAN Free Trade Agreement.`;
    }

    // 1. Basic Customs Duty (BCD)
    const bcdAmount = assessableCifInr * (effectiveBcdPct / 100);

    // 2. Social Welfare Surcharge (SWS): 10% of BCD
    const swsAmount = bcdAmount * (commodity.swsRate / 100);

    // 3. Agriculture Infrastructure Development Cess (AIDC): on Assessable Value
    const aidcAmount = assessableCifInr * (commodity.aidcRate / 100);

    // 4. Integrated Goods & Services Tax (IGST): on (CIF + BCD + SWS + AIDC)
    const subtotalBeforeIgst = assessableCifInr + bcdAmount + swsAmount + aidcAmount;
    const igstAmount = subtotalBeforeIgst * (commodity.igstRate / 100);

    // Total Landed Duty & Total Landed Cost
    const totalDutyInr = bcdAmount + swsAmount + aidcAmount + igstAmount;
    const totalLandedCostInr = assessableCifInr + totalDutyInr;
    const effectiveDutyPct = (totalDutyInr / assessableCifInr) * 100;

    return {
      assessableCifInr,
      effectiveBcdPct,
      bcdAmount,
      swsAmount,
      aidcAmount,
      igstAmount,
      totalDutyInr,
      totalLandedCostInr,
      effectiveDutyPct,
      rooQualified,
      rooMessage,
    };
  }, [cifBaseUsd, exchangeRateInr, commodity, ftaMode, domesticVaPct]);

  // --------------------------------------------------------------------------
  // PRACTICE SIMULATOR SCORING & CLEARANCE STATUS
  // --------------------------------------------------------------------------
  const practiceStatus = useMemo(() => {
    const step1 = practiceSession.step1Options[practiceStep1Idx];
    const step2 = practiceSession.step2Options[practiceStep2Idx];
    const metric = practiceSession.step3Metrics;

    let isSafeMetric = false;
    if (metric.name.includes("Residue")) {
      isSafeMetric = practiceStep3Reading <= metric.safeThreshold;
    } else {
      isSafeMetric = practiceStep3Reading >= metric.safeThreshold;
    }

    const isStep1Safe = step1.isRecommended;

    let clearanceVerdict: "GRANTED" | "SCRUTINY" | "SEIZURE" = "GRANTED";
    let verdictTitle = "✓ STATUTORY CLEARANCE GRANTED";
    let verdictColor = "emerald";
    let verdictNote = "Shipment cleared without penalty risk. LEO criteria satisfied.";

    if (!isStep1Safe || !isSafeMetric) {
      if (!isSafeMetric && metric.name.includes("Residue")) {
        clearanceVerdict = "SEIZURE";
        verdictTitle = "🚨 BORDER REJECTION & STATUTORY SEIZURE";
        verdictColor = "rose";
        verdictNote = `Chemical residue (${practiceStep3Reading} ${metric.unit}) exceeds ${step2.destination} threshold (${metric.safeThreshold} ${metric.unit}). Cargo will be confiscated or destroyed.`;
      } else if (!isStep1Safe && step1.statutoryNote.includes("Hazard")) {
        clearanceVerdict = "SEIZURE";
        verdictTitle = "🚨 CUSTOMS RECLASSIFICATION & DRI SEIZURE RISK";
        verdictColor = "rose";
        verdictNote = "Split assembly rule violated under Customs Rule 2(a). Subject to 50% CBU duty + 200% penalty.";
      } else {
        clearanceVerdict = "SCRUTINY";
        verdictTitle = "⚠️ SECONDARY AUDIT & BUFFER SCRUTINY RISK";
        verdictColor = "amber";
        verdictNote = "Consignment flagged for laboratory secondary audit. Expect 48h to 72h CFS port detention.";
      }
    }

    // Financial Calculation for Practice Lot
    const grossRevenueInr = practiceSession.declaredFobInr;
    const gstPaidInr = grossRevenueInr * (step1.gstRatePct / 100);
    const freightInr = practiceSession.freightCostInr * step2.freightMultiplier;
    const mandiCessInr = grossRevenueInr * 0.015; // 1.5% APMC cess
    const rodtepIncentiveInr = grossRevenueInr * 0.025; // 2.5% export incentive
    const netProfitInr =
      clearanceVerdict === "SEIZURE"
        ? -grossRevenueInr * 0.35 // Loss of margin + detention
        : grossRevenueInr * 0.12 + rodtepIncentiveInr - mandiCessInr;

    return {
      clearanceVerdict,
      verdictTitle,
      verdictColor,
      verdictNote,
      grossRevenueInr,
      gstPaidInr,
      freightInr,
      mandiCessInr,
      rodtepIncentiveInr,
      netProfitInr,
    };
  }, [practiceSession, practiceStep1Idx, practiceStep2Idx, practiceStep3Reading]);

  // --------------------------------------------------------------------------
  // CLIENT-SIDE PDF GENERATION (JSPDF + JSPDF-AUTOTABLE)
  // --------------------------------------------------------------------------
  const generatePracticePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      // Dynamic imports for Next.js SSR safety
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const timestamp = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
      const docHash = `WOT-EXIM-${practiceSession.countId}-${Date.now().toString(36).toUpperCase()}`;

      // PAGE 1: EXECUTIVE SHIPMENT & STATUTORY AUDIT
      // Dark Header Banner
      doc.setFillColor(15, 23, 42); // Slate 900
      doc.rect(0, 0, 210, 26, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("WORLD OF TRADE • SOVEREIGN EXIM PRACTICE LAB", 14, 11);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(
        `OFFICIAL STATUTORY PRACTICE DOSSIER • SESSION COUNT ${practiceSession.countId} | ${docHash}`,
        14,
        18
      );
      doc.text(`Generated: ${timestamp} IST | CBIC Customs Rate ₹${exchangeRateInr.toFixed(2)}`, 14, 22);

      // Section 1: Executive Shipment Profile
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("1. EXECUTIVE SHIPMENT & SOURCING PROFILE", 14, 34);

      const profileData = [
        ["Declared Consignment", practiceSession.title],
        ["ITC-HS Classification", `${practiceSession.hsnCode} (Audited National Tariff)`],
        ["Standard Trade Volume", practiceSession.lotVolume],
        ["Target Destination", practiceSession.step2Options[practiceStep2Idx].destination],
        ["Regulatory Authority", practiceSession.step2Options[practiceStep2Idx].jurisdiction],
        ["Packaging & Legal Form", practiceSession.step1Options[practiceStep1Idx].label],
      ];

      (autoTable as any)(doc, {
        startY: 37,
        head: [["Attribute", "Audited Operational Declaration"]],
        body: profileData,
        theme: "striped",
        headStyles: { fillColor: [45, 106, 79], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" }, 1: { cellWidth: 132 } },
      });

      // Section 2: Statutory Compliance & Border Clearance Scorecard
      const afterProfileY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("2. STATUTORY RISK & BORDER CLEARANCE MATRIX", 14, afterProfileY);

      const step1 = practiceSession.step1Options[practiceStep1Idx];
      const step2 = practiceSession.step2Options[practiceStep2Idx];
      const metric = practiceSession.step3Metrics;

      const complianceData = [
        [
          "Domestic Tax Status",
          step1.gstRatePct === 0 ? "0% Nil-Rated (Notif 2/2017)" : `${step1.gstRatePct}% Pre-packaged GST`,
          step1.statutoryNote,
        ],
        [
          "e-Way Logistics",
          "Rule 138 CGST Verified",
          `Median Port Dwell: ${step2.portMedianHours}h. Part-B vehicle registration plate active.`,
        ],
        [
          `${metric.name}`,
          `${practiceStep3Reading} ${metric.unit}`,
          `Statutory Threshold: ${metric.safeThreshold} ${metric.unit}. Status: ${
            practiceStatus.clearanceVerdict === "GRANTED"
              ? "COMPLIANT"
              : practiceStatus.clearanceVerdict === "SCRUTINY"
              ? "BUFFER RISK"
              : "BREACHED"
          }`,
        ],
        [
          "Clearance Verdict",
          practiceStatus.verdictTitle,
          practiceStatus.verdictNote,
        ],
      ];

      (autoTable as any)(doc, {
        startY: afterProfileY + 3,
        head: [["Regulatory Touchpoint", "Observed Reading", "Statutory Directive & Consequence"]],
        body: complianceData,
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: "bold" },
          1: { cellWidth: 42, fontStyle: "bold" },
          2: { cellWidth: 98 },
        },
      });

      // Section 3: Financial Realization Ledger
      const afterCompY = (doc as any).lastAutoTable.finalY + 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("3. CONSIGNMENT FINANCIAL REALIZATION LEDGER", 14, afterCompY);

      const financialData = [
        ["Declared Gross FOB Realization", `₹${practiceStatus.grossRevenueInr.toLocaleString("en-IN")}`],
        ["Domestic Mandi Cess Outflow (1.5%)", `- ₹${Math.round(practiceStatus.mandiCessInr).toLocaleString("en-IN")}`],
        ["International Ocean / Air Freight", `- ₹${Math.round(practiceStatus.freightInr).toLocaleString("en-IN")}`],
        ["RoDTEP Export Incentive Inflow (2.5%)", `+ ₹${Math.round(practiceStatus.rodtepIncentiveInr).toLocaleString("en-IN")}`],
        [
          "Estimated Net Consignment Margin",
          `₹${Math.round(practiceStatus.netProfitInr).toLocaleString("en-IN")} (${
            practiceStatus.clearanceVerdict === "SEIZURE" ? "CRITICAL LOSS" : "NET POSITIVE"
          })`,
        ],
      ];

      (autoTable as any)(doc, {
        startY: afterCompY + 3,
        head: [["Ledger Account", "Value in Indian Rupees (INR)"]],
        body: financialData,
        theme: "striped",
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 2.2 },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 82, fontStyle: "bold", halign: "right" } },
      });

      // PAGE 2: FORENSIC AUDIT DEFENSE & DRI CHECKLIST
      doc.addPage();

      // Page 2 Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("WORLD OF TRADE • FORENSIC DEFENSE & STATUTORY CHECKLIST", 14, 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Reference Docket: ${docHash} | Page 2 of 2`, 14, 16);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("4. FORENSIC AUDIT DEFENSE & PENALTY MITIGATION CHECKLIST", 14, 30);

      const checklistRows = practiceSession.forensicChecklist.map((item, idx) => [
        `[ ✓ ${idx + 1} ]`,
        item,
        "VERIFIED & SEALED",
      ]);

      (autoTable as any)(doc, {
        startY: 34,
        head: [["Node", "Statutory Compliance Protocol (CGST / Customs Act)", "Audit Verification"]],
        body: checklistRows,
        theme: "grid",
        headStyles: { fillColor: [45, 106, 79], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: "bold", halign: "center" },
          1: { cellWidth: 124 },
          2: { cellWidth: 40, fontStyle: "bold", halign: "center", textColor: [16, 185, 129] },
        },
      });

      // Section 5: Statutory Portals & Verification URLs
      const afterCheckY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("5. OFFICIAL STATUTORY VERIFICATION DIRECTORY", 14, afterCheckY);

      const portalRows = [
        ["DGCI&S TRADESTAT", "https://tradestat.commerce.gov.in/eidb/commodity_wise_import", "Bilateral Merchandise Validation"],
        ["ICEGATE Customs EDI", "https://www.icegate.gov.in/cdc", "Live Customs Tariff Calculator"],
        ["Logistics Data Bank", "https://www.ldb.co.in/", "RFID Container Seaport Dwell Tracking"],
        ["Indian Trade Portal", "https://www.indiatradeportal.in/", "Bilateral FTA & CEPA Origin Rules"],
      ];

      (autoTable as any)(doc, {
        startY: afterCheckY + 3,
        head: [["Statutory Gateway", "Direct Endpoint URL", "Operational Purpose"]],
        body: portalRows,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: "bold" },
          1: { cellWidth: 80, fontStyle: "italic", textColor: [37, 99, 235] },
          2: { cellWidth: 60 },
        },
      });

      // Legal Disclaimer Footer
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(
        "Notice: This report is generated by World of Trade Sovereign Terminal for academic and practical EXIM training purposes.",
        14,
        275
      );
      doc.text(
        "All customs valuations, GST classifications, and MRL tolerances reflect official Government of India gazetted standards.",
        14,
        279
      );

      // Save Document
      doc.save(`WOT_EXIM_PRACTICE_${practiceSession.countId}_${Date.now()}.pdf`);
    } catch (err) {
      console.error("Error generating PDF dossier:", err);
      alert("Failed to generate PDF. Check browser console for details.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Helper text translator for ELI5 mode
  const t = (termKey: string, plainFallback: string) => {
    return isPlainEnglish ? plainFallback : termKey;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 text-slate-800 dark:text-slate-100 transition-colors">
      
      {/* ===================================================================== */}
      {/* MODULE A: TELEMETRY BAR & GLOBAL ELI5 TRANSLATOR                     */}
      {/* ===================================================================== */}
      <div className="glass-panel rounded-3xl p-3 sm:p-4 border shadow-xl bg-slate-900 text-white border-slate-700/60 space-y-3">
        
        {/* Top Header & Plain-English Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xl border border-emerald-500/30">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                  Dual Sovereign Execution Terminal
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE BENCH • v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sovereign Reverse HSN Radar &bull; Dynamic Duty Ledger &bull; Weekly Practice Lab
              </p>
            </div>
          </div>

          {/* Global Mode Toggle Switch */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">
              Mode:
            </span>
            <button
              type="button"
              onClick={() => setIsPlainEnglish(!isPlainEnglish)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 active:scale-95 ${
                isPlainEnglish
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isPlainEnglish ? "Plain-English (ELI5 Active)" : "Sovereign Pro (Statutory)"}</span>
            </button>
          </div>
        </div>

        {/* Live Port Dwell Marquee / Ticker */}
        <div className="overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] font-mono whitespace-nowrap min-w-max">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
              <Ship className="w-3 h-3" />
              <span>GATE TELEMETRY:</span>
            </span>
            {PORT_STATUS_FEEDS.map((port) => (
              <div
                key={port.id}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-1.5"
              >
                <span className="font-bold text-slate-200">{port.name}:</span>
                <span className="text-slate-400">Dwell {port.medianDwellHours}h</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    port.status === "congested"
                      ? "bg-rose-500/20 text-rose-400"
                      : port.status === "fast"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {port.status === "congested" ? "DEMURRAGE RISK" : "STEADY"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "radar"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Reverse HSN &amp; Tariff Radar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("practice")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "practice"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Weekly EXIM Practice Lab</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODULE B: NATURAL-LANGUAGE REVERSE HSN & IMPORT TARIFF RADAR          */}
      {/* ===================================================================== */}
      {activeTab === "radar" && (
        <div className="space-y-4">
          
          {/* Search & Commodity Selector Deck */}
          <div className="p-4 rounded-3xl border shadow-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  <span>Natural-Language Reverse HSN &amp; Sourcing Intelligence</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Type any commodity name or click audited sample chips for instant 8-digit tariff mapping.
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border border-slate-300 dark:border-slate-700">
                CBIC Tariff 2024-25
              </span>
            </div>

            {/* Plain-English Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commodity in plain English (e.g. Chilli, EV Scooter, Solar Inverter, Shrimp, Gold)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Quick-Access Commodity Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {filteredCommodities.map((item) => (
                <button
                  key={item.hsnCode}
                  type="button"
                  onClick={() => setSelectedHsn(item.hsnCode)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold active:scale-95 transition-all flex items-center gap-1.5 ${
                    selectedHsn === item.hsnCode
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                  }`}
                >
                  <span className="font-mono font-bold text-[10px] opacity-75">
                    {item.hsnCode}
                  </span>
                  <span>{item.plainName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Live Duty Stacking Ledger & Calculation Engine */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left 7 Columns: Interactive Valuations & Controls */}
            <div className="lg:col-span-7 p-4 rounded-3xl border shadow-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {t("Assessable CIF Valuation & Rules of Origin", "Cost at Port & Trade Agreement Deals")}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {commodity.name} &bull; {commodity.chapter}
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  {commodity.council}
                </span>
              </div>

              {/* Invoice Value & Exchange Rate Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    {t("Invoice CIF Value ($ USD)", "Landed Cost Abroad with Freight ($ USD)")}
                  </label>
                  <input
                    type="number"
                    value={cifBaseUsd}
                    onChange={(e) => setCifBaseUsd(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">
                    Equivalent: ₹{Math.round(cifBaseUsd * exchangeRateInr).toLocaleString("en-IN")} INR
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    CBIC Customs Exchange Rate (₹/USD)
                  </label>
                  <input
                    type="number"
                    value={exchangeRateInr}
                    onChange={(e) => setExchangeRateInr(parseFloat(e.target.value) || 1)}
                    step="0.05"
                    className="w-full p-2.5 rounded-xl border font-mono font-bold text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                  <span className="text-[9px] font-mono text-emerald-600 mt-0.5 block font-semibold">
                    Notified Gazette Section 14 Customs Act
                  </span>
                </div>
              </div>

              {/* FTA Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  {t("Free Trade Agreement (FTA) Tariff Mode", "Special Duty Discount Deal")}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFtaMode("MFN")}
                    className={`p-2 rounded-xl border text-xs font-bold active:scale-95 transition-all text-center ${
                      ftaMode === "MFN"
                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    MFN Standard Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setFtaMode("CEPA")}
                    className={`p-2 rounded-xl border text-xs font-bold active:scale-95 transition-all text-center ${
                      ftaMode === "CEPA"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    India-UAE CEPA (0%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFtaMode("AIFTA")}
                    className={`p-2 rounded-xl border text-xs font-bold active:scale-95 transition-all text-center ${
                      ftaMode === "AIFTA"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    India-ASEAN AIFTA
                  </button>
                </div>
              </div>

              {/* Domestic Value Addition Slider (For CEPA) */}
              {ftaMode === "CEPA" && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      Domestic Value Addition (VA Rule of Origin):
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {domesticVaPct}% (Min {commodity.cepaMinVaPct}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={domesticVaPct}
                    onChange={(e) => setDomesticVaPct(parseInt(e.target.value) || 0)}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold leading-relaxed">
                    {tariffCalc.rooMessage}
                  </p>
                </div>
              )}

              {/* Ground Truth Links */}
              <div className="flex flex-wrap gap-2 pt-2 text-[11px]">
                <a
                  href={commodity.deepLinkTradestat}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg border text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>DGCI&amp;S TRADESTAT Official Flow</span>
                </a>
                <a
                  href={commodity.deepLinkIcegate}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg border text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>ICEGATE Live Duty Calculator</span>
                </a>
              </div>
            </div>

            {/* Right 5 Columns: Dynamic Duty Stacking Ledger Card */}
            <div className="lg:col-span-5 p-4 rounded-3xl border shadow-xl bg-slate-900 text-white border-slate-800 space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                    {t("Statutory Duty Stacking Ledger", "Detailed Tax Breakdown Ledger")}
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                    Effective: {tariffCalc.effectiveDutyPct.toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">
                      {t("1. Basic Customs Duty (BCD):", "1. Basic Import Tax (BCD):")}
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      ₹{Math.round(tariffCalc.bcdAmount).toLocaleString("en-IN")} ({tariffCalc.effectiveBcdPct}%)
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">
                      {t("2. Social Welfare Surcharge (SWS):", "2. 10% Surcharge on Import Tax:")}
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      ₹{Math.round(tariffCalc.swsAmount).toLocaleString("en-IN")} (10% of BCD)
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">
                      {t("3. Agriculture Infra Cess (AIDC):", "3. Farm Infrastructure Cess:")}
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      ₹{Math.round(tariffCalc.aidcAmount).toLocaleString("en-IN")} ({commodity.aidcRate}%)
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">
                      {t("4. Integrated GST (IGST):", "4. Integrated GST on Landed Cost:")}
                    </span>
                    <span className="font-mono font-bold text-slate-100">
                      ₹{Math.round(tariffCalc.igstAmount).toLocaleString("en-IN")} ({commodity.igstRate}%)
                    </span>
                  </div>

                  <div className="border-t border-slate-700/80 pt-2 flex justify-between items-center text-sm font-black">
                    <span className="text-emerald-400">
                      {t("Total Landed Duty Payable:", "Total Tax Outflow Before Release:")}
                    </span>
                    <span className="font-mono text-emerald-400 text-base">
                      ₹{Math.round(tariffCalc.totalDutyInr).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total Landed Inflow Badge */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Total Landed Consignment Cost (CIF + All Taxes):
                </span>
                <span className="text-xl font-mono font-black text-white block">
                  ₹{Math.round(tariffCalc.totalLandedCostInr).toLocaleString("en-IN")}
                </span>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Must be deposited via ICEGATE ICEPAY gateway prior to customs Out of Charge (OOC) order.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODULE C: WEEKLY EXIM PRACTICE LAB (SIMULATOR + PDF GENERATOR)        */}
      {/* ===================================================================== */}
      {activeTab === "practice" && (
        <div className="space-y-4">
          
          {/* Practice Session Selector */}
          <div className="p-4 rounded-3xl border shadow-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Weekly EXIM Practice Lab &bull; Real-World Trade Simulations</span>
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select a practice case count, configure the 3-step statutory wizard, and export an executive PDF audit report.
                </p>
              </div>

              {/* 1-Click Client-Side PDF Export Button */}
              <button
                type="button"
                onClick={generatePracticePDF}
                disabled={isGeneratingPdf}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {isGeneratingPdf ? "Synthesizing Docket..." : "Export Official Practice Report (PDF)"}
                </span>
              </button>
            </div>

            {/* Count Selector Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRACTICE_SESSIONS.map((session) => (
                <button
                  key={session.countId}
                  type="button"
                  onClick={() => setSelectedCountId(session.countId)}
                  className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                    selectedCountId === session.countId
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-emerald-500"
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-mono font-bold opacity-80">
                      COUNT {session.countId}
                    </span>
                    <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded bg-black/20 text-white">
                      {session.hsnCode}
                    </span>
                  </div>
                  <div className="text-xs font-black truncate">{session.title.split("-")[1] || session.title}</div>
                  <div className="text-[10px] opacity-80 truncate">{session.lotVolume}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive 3-Step Guided Execution Wizard */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left 7 Columns: 3-Step Wizard Configuration */}
            <div className="lg:col-span-7 p-4 rounded-3xl border shadow-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4">
              
              {/* Step 1: Packaging & Legal Form */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                    1
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {t("Step 1: Packaging & Legal Form (Notification 31/2022-CT)", "Step 1: How Goods are Packed (Tax Rate)")}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {practiceSession.step1Options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-start gap-2.5 p-3 rounded-2xl border cursor-pointer transition-all ${
                        practiceStep1Idx === idx
                          ? "bg-emerald-500/10 border-emerald-500 text-slate-900 dark:text-white"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="practiceStep1"
                        checked={practiceStep1Idx === idx}
                        onChange={() => setPracticeStep1Idx(idx)}
                        className="mt-0.5 text-emerald-600 focus:ring-0"
                      />
                      <div className="space-y-0.5 text-xs">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>{opt.label}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 font-bold">
                            {opt.gstRatePct}% GST
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.description}</p>
                        <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{opt.statutoryNote}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 2: Destination Port & Regulatory Jurisdiction */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                    2
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {t("Step 2: Destination Port & Jurisdiction", "Step 2: Target Seaport / Country Rules")}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {practiceSession.step2Options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPracticeStep2Idx(idx)}
                      className={`p-3 rounded-2xl border text-left transition-all active:scale-95 ${
                        practiceStep2Idx === idx
                          ? "bg-emerald-500/10 border-emerald-500 text-slate-900 dark:text-white"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      <div className="font-bold text-xs">{opt.destination}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{opt.jurisdiction}</div>
                      <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                        Ceiling: {opt.mrlThreshold}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Critical Lab Test / Compliance Metric */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-[10px] font-black">
                      3
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      {practiceSession.step3Metrics.name}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-black text-emerald-600">
                    {practiceStep3Reading} {practiceSession.step3Metrics.unit}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {practiceSession.step3Metrics.description} (Target Ceiling:{" "}
                  {practiceSession.step3Metrics.safeThreshold} {practiceSession.step3Metrics.unit})
                </p>

                <input
                  type="range"
                  min={practiceSession.step3Metrics.safeThreshold * 0.2}
                  max={practiceSession.step3Metrics.safeThreshold * 2.5}
                  step={practiceSession.step3Metrics.safeThreshold * 0.1}
                  value={practiceStep3Reading}
                  onChange={(e) => setPracticeStep3Reading(parseFloat(e.target.value) || 0)}
                  className="w-full accent-emerald-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Safe Sample: {practiceSession.step3Metrics.defaultReading}</span>
                  <span>Scrutiny Spike: {practiceSession.step3Metrics.riskReading}</span>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Dynamic Risk & Financial Scorecard */}
            <div className="lg:col-span-5 p-4 rounded-3xl border shadow-xl bg-slate-900 text-white border-slate-800 space-y-3.5 flex flex-col justify-between">
              
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                    Consignment Risk &amp; Financial Ledger
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                    COUNT {practiceSession.countId} SIM
                  </span>
                </div>

                {/* Clearance Verdict Box */}
                <div
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    practiceStatus.clearanceVerdict === "GRANTED"
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : practiceStatus.clearanceVerdict === "SCRUTINY"
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  }`}
                >
                  <div className="font-black text-xs sm:text-sm flex items-center gap-1.5">
                    {practiceStatus.clearanceVerdict === "GRANTED" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : practiceStatus.clearanceVerdict === "SCRUTINY" ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    <span>{practiceStatus.verdictTitle}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">{practiceStatus.verdictNote}</p>
                </div>

                {/* Financial Margin Waterfall */}
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Declared Gross FOB Realization:</span>
                    <span className="font-mono font-bold text-white">
                      ₹{practiceStatus.grossRevenueInr.toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>APMC Mandi Cess (1.5%):</span>
                    <span className="font-mono text-amber-400 font-bold">
                      - ₹{Math.round(practiceStatus.mandiCessInr).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Freight &amp; Handling Cost:</span>
                    <span className="font-mono text-slate-300 font-bold">
                      - ₹{Math.round(practiceStatus.freightInr).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>RoDTEP Scroll Cash Inflow (2.5%):</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      + ₹{Math.round(practiceStatus.rodtepIncentiveInr).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="border-t border-slate-700/80 pt-2 flex justify-between items-center text-sm font-black">
                    <span className="text-white">Estimated Net Consignment Profit:</span>
                    <span
                      className={`font-mono text-base ${
                        practiceStatus.netProfitInr >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      ₹{Math.round(practiceStatus.netProfitInr).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button: Export PDF */}
              <button
                type="button"
                onClick={generatePracticePDF}
                disabled={isGeneratingPdf}
                className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingPdf ? "Synthesizing Docket..." : "Download 2-Page Official PDF Dossier"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
