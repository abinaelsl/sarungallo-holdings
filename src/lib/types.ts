export type AssetClass = "real_estate" | "equity" | "gold" | "crypto";

export const ASSET_CLASSES: { value: AssetClass; label: string }[] = [
  { value: "real_estate", label: "Real Estate" },
  { value: "equity", label: "Equities" },
  { value: "gold", label: "Gold" },
  { value: "crypto", label: "Crypto" },
];

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  real_estate: "Real Estate",
  equity: "Equities",
  gold: "Gold",
  crypto: "Crypto",
};

export interface Holding {
  id: string;
  asset_class: AssetClass;
  name: string;
  ticker: string | null;
  sector: string | null;
  quantity: number | null;
  unit: string | null;
  currency: string;
  cost_basis_usd: number;
  /** Weighted-average cost per share/unit in the trading (native) currency. */
  avg_cost_native: number | null;
  /** Projected annual dividend per share, in the trading (native) currency. */
  annual_dividend_per_share: number | null;
  current_price_native: number | null;
  current_price_usd: number | null;
  current_value_usd: number | null;
  manual_value_usd: number | null;
  exchange: string | null;
  location: string | null;
  acquisition_date: string | null;
  notes: string | null;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TxnType = "buy" | "sell";

export interface Transaction {
  id: string;
  holding_id: string;
  type: TxnType;
  trade_date: string;
  shares: number;
  price_native: number;
  fees_native: number;
  currency: string;
  /** Native currency units per 1 USD at trade time. */
  fx_rate: number;
  notes: string | null;
  created_at: string;
}

export interface Dividend {
  id: string;
  holding_id: string;
  pay_date: string;
  amount_per_share: number;
  shares: number;
  currency: string;
  fx_rate: number;
  total_usd: number;
  notes: string | null;
  created_at: string;
}

export interface HoldingSnapshot {
  id: string;
  holding_id: string;
  captured_at: string;
  value_usd: number;
  cost_usd: number;
  price_native: number | null;
  created_at: string;
}

export type HoldingInput = Omit<
  Holding,
  | "id"
  | "avg_cost_native"
  | "current_price_native"
  | "current_price_usd"
  | "current_value_usd"
  | "price_updated_at"
  | "created_at"
  | "updated_at"
>;

export interface Snapshot {
  id: string;
  captured_at: string;
  total_value_usd: number;
  total_cost_usd: number;
  total_value_idr: number;
  fx_usd_idr: number | null;
  breakdown: Record<string, number> | null;
  created_at: string;
}

/** Whether a holding's value is driven by a live market price (vs. manual). */
export function isMarketAsset(assetClass: AssetClass): boolean {
  return assetClass !== "real_estate";
}
