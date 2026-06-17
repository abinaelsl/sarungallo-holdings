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

/** Average cost per share/unit in USD. */
export function avgCostUsd(h: Holding): number | null {
  if (!h.quantity || h.quantity <= 0) return null;
  return h.cost_basis_usd / h.quantity;
}

/** Indonesian exchange equities trade in lots of 100 shares. */
export function isIdx(h: Holding): boolean {
  return (
    h.ticker?.toUpperCase().endsWith(".JK") === true ||
    h.exchange?.toUpperCase() === "IDX" ||
    (h.asset_class === "equity" && (h.currency || "").toUpperCase() === "IDR")
  );
}

/** Shares per tradable lot — 100 for IDX, 1 everywhere else. */
export function lotSize(h: Holding): number {
  return isIdx(h) ? 100 : 1;
}

/** Native currency units per 1 USD for this holding (inverse of usdPerNative). */
export function nativePerUsd(h: Holding): number {
  const r = usdPerNative(h);
  return r > 0 ? 1 / r : 1;
}

/**
 * USD value of one native-currency unit for this holding, derived from the
 * live price pair when available, otherwise from cost basis, else 1:1.
 */
export function usdPerNative(h: Holding): number {
  if (
    h.current_price_native != null &&
    h.current_price_native > 0 &&
    h.current_price_usd != null
  ) {
    return h.current_price_usd / h.current_price_native;
  }
  if (h.avg_cost_native != null && h.avg_cost_native > 0) {
    const acUsd = avgCostUsd(h);
    if (acUsd != null) return acUsd / h.avg_cost_native;
  }
  return 1;
}

/** Total projected annual dividend in native currency (per-share × shares). */
export function annualDividendNative(h: Holding): number {
  const per = h.annual_dividend_per_share ?? 0;
  if (per <= 0 || !h.quantity || h.quantity <= 0) return 0;
  return per * h.quantity;
}

/** Total projected annual dividend converted to USD. */
export function annualDividendUsd(h: Holding): number {
  return annualDividendNative(h) * usdPerNative(h);
}

/** Dividend yield on cost: annual dividend ÷ your average purchase price. */
export function dividendYieldOnCost(h: Holding): number | null {
  const per = h.annual_dividend_per_share ?? 0;
  if (per <= 0) return null;
  if (h.avg_cost_native != null && h.avg_cost_native > 0) {
    return (per / h.avg_cost_native) * 100;
  }
  const acUsd = avgCostUsd(h);
  const perUsd = per * usdPerNative(h);
  if (acUsd != null && acUsd > 0) return (perUsd / acUsd) * 100;
  return null;
}

/** Current dividend yield: annual dividend ÷ current market price. */
export function dividendYieldCurrent(h: Holding): number | null {
  const per = h.annual_dividend_per_share ?? 0;
  if (per <= 0) return null;
  if (h.current_price_native != null && h.current_price_native > 0) {
    return (per / h.current_price_native) * 100;
  }
  return null;
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
