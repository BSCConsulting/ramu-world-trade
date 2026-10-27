import { AnomalyStatus } from '@/types/statutory';

export function computeFobCifSpread(fob: number, cif: number): number {
  if (fob <= 0) return 0;
  return Number((((cif - fob) / fob) * 100).toFixed(2));
}

export function evaluateAnomaly(spreadPct: number): AnomalyStatus {
  if (spreadPct < 4.0) return 'UNDER_INVOICED_RISK';
  if (spreadPct > 15.0) return 'OVER_INVOICED_RISK';
  return 'NORMAL';
}

export function calculateArbitrageDutySaved(cbuPct: number, ckdPct: number, costUsd: number, fxRate: number = 86.40): number {
  const unitCostInr = costUsd * fxRate;
  const dutyCbu = unitCostInr * (cbuPct / 100);
  const dutyCkd = unitCostInr * (ckdPct / 100);
  return Math.round(dutyCbu - dutyCkd);
}
