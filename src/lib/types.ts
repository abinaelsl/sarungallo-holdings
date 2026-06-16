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

export type HoldingInput = Omit<
  Holding,
  | "id"
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
