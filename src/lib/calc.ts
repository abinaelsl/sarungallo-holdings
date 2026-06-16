import { AssetClass, Holding } from "./types";

/** The current USD value of a holding (manual value for real estate). */
export function holdingValueUsd(h: Holding): number {
  if (h.asset_class === "real_estate") {
    return h.manual_value_usd ?? h.current_value_usd ?? h.cost_basis_usd ?? 0;
  }
  return h.current_value_usd ?? h.cost_basis_usd ?? 0;
}

export function holdingPnlUsd(h: Holding): number {
  return holdingValueUsd(h) - (h.cost_basis_usd ?? 0);
}

export function holdingPnlPct(h: Holding): number | null {
  const cost = h.cost_basis_usd ?? 0;
  if (!cost) return null;
  return (holdingPnlUsd(h) / cost) * 100;
}

export interface PortfolioTotals {
  totalValueUsd: number;
  totalCostUsd: number;
  pnlUsd: number;
  pnlPct: number | null;
  byClass: Record<AssetClass, number>;
  bySector: Record<string, number>;
}

export function computeTotals(holdings: Holding[]): PortfolioTotals {
  const byClass: Record<AssetClass, number> = {
    real_estate: 0,
    equity: 0,
    gold: 0,
    crypto: 0,
  };
  const bySector: Record<string, number> = {};
  let totalValueUsd = 0;
  let totalCostUsd = 0;

  for (const h of holdings) {
    const v = holdingValueUsd(h);
    totalValueUsd += v;
    totalCostUsd += h.cost_basis_usd ?? 0;
    byClass[h.asset_class] += v;
    const sector = h.sector || "Uncategorized";
    bySector[sector] = (bySector[sector] ?? 0) + v;
  }

  const pnlUsd = totalValueUsd - totalCostUsd;
  return {
    totalValueUsd,
    totalCostUsd,
    pnlUsd,
    pnlPct: totalCostUsd ? (pnlUsd / totalCostUsd) * 100 : null,
    byClass,
    bySector,
  };
}
