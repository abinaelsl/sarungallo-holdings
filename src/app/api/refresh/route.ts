import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { priceHoldings } from "@/lib/prices";
import { Holding, AssetClass } from "@/lib/types";
import { holdingValueUsd } from "@/lib/calc";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const supabase = getSupabaseAdmin();

  const { data: holdings, error } = await supabase.from("sh_holdings").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all = (holdings ?? []) as unknown as Holding[];

  // 1) Fetch all live prices + FX in one orchestrated pass.
  const { priced, usdIdr, failures } = await priceHoldings(all);

  // 2) Persist updated market values.
  const now = new Date().toISOString();
  const updated: Holding[] = [];
  for (const h of all) {
    const p = priced.get(h.id);
    if (!p) continue;
    const { data: row } = await supabase
      .from("sh_holdings")
      .update({
        currency: p.currency,
        current_price_native: p.priceNative,
        current_price_usd: p.pricePerUnitUsd,
        current_value_usd: p.valueUsd,
        price_updated_at: now,
      })
      .eq("id", h.id)
      .select()
      .single();
    if (row) updated.push(row as unknown as Holding);
  }

  // 3) Recompute totals from freshest values.
  const updatedById = new Map(updated.map((u) => [u.id, u]));
  const fresh = all.map((h) => updatedById.get(h.id) ?? h);

  const byClass: Record<AssetClass, number> = {
    real_estate: 0,
    equity: 0,
    gold: 0,
    crypto: 0,
  };
  let totalValueUsd = 0;
  let totalCostUsd = 0;
  for (const h of fresh) {
    const v = holdingValueUsd(h);
    totalValueUsd += v;
    totalCostUsd += h.cost_basis_usd ?? 0;
    byClass[h.asset_class] += v;
  }

  // 4) Save a timestamped snapshot so the value-over-time graph grows.
  const { data: snapshot } = await supabase
    .from("sh_snapshots")
    .insert({
      total_value_usd: totalValueUsd,
      total_cost_usd: totalCostUsd,
      total_value_idr: totalValueUsd * usdIdr,
      fx_usd_idr: usdIdr,
      breakdown: byClass,
    })
    .select()
    .single();

  return NextResponse.json({
    ok: true,
    snapshot,
    fx_usd_idr: usdIdr,
    updated_count: updated.length,
    failures,
    holdings: fresh,
  });
}
