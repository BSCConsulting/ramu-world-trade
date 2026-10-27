export type CorridorId = 'IN-USA' | 'IN-UAE' | 'IN-EU' | 'IN-UK';
export type AnomalyStatus = 'NORMAL' | 'UNDER_INVOICED_RISK' | 'OVER_INVOICED_RISK';

export interface TripartiteRecord {
  corridor: CorridorId;
  partnerCountry: string;
  hsCode: string;
  commodityName: string;
  indiaFobBillionUsd: number;      // DGCI&S Physical Port FOB
  rbiSettlementBillionUsd: number;  // RBI DBIE Inward Forex Series
  partnerCifBillionUsd: number;    // UN Comtrade Partner Mirror CIF
  computedSpreadPct: number;       // [(CIF - FOB) / FOB] * 100
  status: AnomalyStatus;
  lastUpdated: string;
  citations: {
    dgcisRelease: string;
    rbiBpm6Table: string;
    unComtradeVersion: string;
  };
}

export interface PesticideMRLOverride {
  chemicalName: string;            // e.g. Tricyclazole, Chlorpyrifos
  statutoryLimitPpm: number;       // Official APEDA / EU importing regulation limit
  labDetectedPpm: number;          // Active lab test result from certificate of analysis
  compliant: boolean;
}

export interface ArbitrageOverride {
  productTitle: string;
  cbuCustomsDutyPct: number;       // Completely Built Unit import tariff
  ckdPartsDutyPct: number;         // Completely Knocked Down component tariff
  unitCostUsd: number;
  domesticAssemblyCostInr: number;
  marketRetailPriceInr: number;
  monthlyVolumeUnits: number;
}

export interface SandboxOverrides {
  corridorOverrides: Record<CorridorId, { customFreightPct?: number; customInsuranceBps?: number }>;
  pesticideLabTests: PesticideMRLOverride[];
  arbitrage: ArbitrageOverride;
}

export interface CryptographicSeal {
  sha256BuildHash: string;
  payloadDigest: string;
  sealTimestamp: string;
  verifiedGateways: string[];
}

export interface ConsolidatedDossier {
  metadata: {
    terminalVersion: string;
    tagline: string;
    generatedAt: string;
    dossierReferenceId: string;
  };
  statutoryBaseline: TripartiteRecord[];
  activeOverrides: SandboxOverrides;
  cryptographicSeal: CryptographicSeal;
}
