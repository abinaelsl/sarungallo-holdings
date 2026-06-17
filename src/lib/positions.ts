/* eslint-disable @typescript-eslint/no-explicit-any */
import { SupabaseClient } from "@supabase/supabase-js";
import { Transaction } from "./types";

export interface Position {
  quantity: number;
  cost_basis_usd: number;
  avg_cost_native: number | null;
  realized_pnl_usd: number;
}

/**
 * Average-cost position from an ordered transaction ledger.
 * Buys add shares + cost; sells remove shares at the running average cost and
 * realize P/L against it. Costs are tracked in both USD and native currency so
 * we can show USD value and native yield-on-cost.
 */
export function computePosition(txns: Transaction[]): Position {
  let shares = 0;
  let costUsd = 0;
  let costNative = 0;
  let realized = 0;

  const ordered = [...txns].sort((a, b) => {
    const d = a.trade_date.localeCompare(b.trade_date);
    return d !== 0 ? d : a.created_at.localeCompare(b.created_at);
  });

  for (const t of ordered) {
    const fx = t.fx_rate && t.fx_rate > 0 ? t.fx_rate : 1;
    if (t.type === "buy") {
      const grossNative = t.shares * t.price_native + (t.fees_native ?? 0);
      shares += t.shares;
      costNative += grossNative;
      costUsd += grossNative / fx;
    } else {
      const sellShares = Math.min(t.shares, shares);
      const avgUsd = shares > 0 ? costUsd / shares : 0;
      const avgNative = shares > 0 ? costNative / shares : 0;
      const proceedsUsd = (t.shares * t.price_native - (t.fees_native ?? 0)) / fx;
      realized += proceedsUsd - avgUsd * sellShares;
      costUsd -= avgUsd * sellShares;
      costNative -= avgNative * sellShares;
      shares -= sellShares;
    }
  }

  // Guard against tiny negative residue from float math.
  if (shares < 1e-9) {
    shares = 0;
    costUsd = 0;
    costNative = 0;
  }

  return {
    quantity: shares,
    cost_basis_usd: Math.max(0, costUsd),
    avg_cost_native: shares > 0 ? costNative / shares : null,
    realized_pnl_usd: realized,
  };
}

/**
 * Recompute a holding's quantity / cost basis / average native cost from its
 * transaction ledger and persist the result. Also refreshes current_value_usd
 * from the latest known unit price so the new quantity is reflected at once.
 */
export async function recomputeHolding(
  supabase: SupabaseClient<any, "public", any>,
  holdingId: string,
): Promise<Position> {
  const { data: txns } = await supabase
    .from("sh_transactions")
    .select("*")
    .eq("holding_id", holdingId);

  const pos = computePosition((txns ?? []) as unknown as Transaction[]);

  const { data: holding } = await supabase
    .from("sh_holdings")
    .select("current_price_usd")
    .eq("id", holdingId)
    .single();

  const unitUsd = holding?.current_price_usd as number | null | undefined;
  const update: Record<string, unknown> = {
    quantity: pos.quantity,
    cost_basis_usd: pos.cost_basis_usd,
    avg_cost_native: pos.avg_cost_native,
  };
  if (typeof unitUsd === "number") {
    update.current_value_usd = pos.quantity * unitUsd;
  }

  await supabase.from("sh_holdings").update(update).eq("id", holdingId);
  return pos;
}
