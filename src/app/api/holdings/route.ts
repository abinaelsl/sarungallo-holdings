import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getFxRates } from "@/lib/prices";
import { recomputeHolding } from "@/lib/positions";

export const dynamic = "force-dynamic";

const ALLOWED_FIELDS = [
  "asset_class",
  "name",
  "ticker",
  "sector",
  "quantity",
  "unit",
  "currency",
  "cost_basis_usd",
  "annual_dividend_per_share",
  "manual_value_usd",
  "exchange",
  "location",
  "acquisition_date",
  "notes",
] as const;

function sanitize(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of ALLOWED_FIELDS) {
    if (f in body) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
}

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sh_holdings")
    .select("*")
    .order("asset_class", { ascending: true })
    .order("current_value_usd", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holdings: data });
}

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const row = sanitize(body);

  if (!row.asset_class || !row.name) {
    return NextResponse.json(
      { error: "asset_class and name are required" },
      { status: 400 },
    );
  }

  const ASSET_CLASSES = new Set(["real_estate", "equity", "gold", "crypto"]);
  if (!ASSET_CLASSES.has(String(row.asset_class))) {
    return NextResponse.json({ error: "Invalid asset_class" }, { status: 400 });
  }

  // For real estate, seed current value from the manual value immediately.
  if (row.asset_class === "real_estate") {
    row.current_value_usd = row.manual_value_usd ?? row.cost_basis_usd ?? 0;
  }

  // Equity/crypto with quantity must have an opening price (or USD cost) so
  // we never leave a position with an empty ledger.
  const createQty = Number(row.quantity);
  const cls0 = String(row.asset_class);
  if ((cls0 === "equity" || cls0 === "crypto") && Number.isFinite(createQty) && createQty > 0) {
    const openNative = Number(body.open_price_native);
    const costUsd = Number(row.cost_basis_usd);
    const hasOpen =
      (Number.isFinite(openNative) && openNative > 0) ||
      (Number.isFinite(costUsd) && costUsd > 0);
    if (!hasOpen) {
      return NextResponse.json(
        {
          error:
            cls0 === "equity"
              ? "Opening price is required when quantity is set"
              : "Cost basis is required when quantity is set",
        },
        { status: 400 },
      );
    }
  }

  const { data, error } = await supabase
    .from("sh_holdings")
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create holding" }, { status: 500 });

  // For tradable assets created with an initial position, seed an opening
  // "buy" so the transaction ledger is the source of truth and the native
  // average cost is computed correctly.
  const cls = data.asset_class as string;
  const qty = Number(data.quantity);
  if ((cls === "equity" || cls === "crypto") && qty > 0) {
    const cur = (data.currency as string)?.toUpperCase() || "USD";
    let fxRate = 1;
    if (cur !== "USD") {
      const rates = await getFxRates();
      if (!rates[cur] || rates[cur] <= 0) {
        await supabase.from("sh_holdings").delete().eq("id", data.id);
        return NextResponse.json(
          { error: `Missing FX rate for ${cur}` },
          { status: 502 },
        );
      }
      fxRate = rates[cur];
    }
    // Prefer an explicit native opening price; otherwise derive from USD cost.
    let priceNative = Number(body.open_price_native);
    if (!Number.isFinite(priceNative) || priceNative <= 0) {
      const costUsd = Number(data.cost_basis_usd);
      priceNative = costUsd > 0 ? (costUsd * fxRate) / qty : NaN;
    }
    if (!Number.isFinite(priceNative) || priceNative <= 0) {
      await supabase.from("sh_holdings").delete().eq("id", data.id);
      return NextResponse.json(
        { error: "Could not determine opening price" },
        { status: 400 },
      );
    }
    const { error: txnErr } = await supabase.from("sh_transactions").insert({
      holding_id: data.id,
      type: "buy",
      trade_date: (data.acquisition_date as string) || new Date().toISOString().slice(0, 10),
      shares: qty,
      price_native: priceNative,
      fees_native: 0,
      currency: cur,
      fx_rate: fxRate,
      notes: "Opening balance",
    });
    if (txnErr) {
      await supabase.from("sh_holdings").delete().eq("id", data.id);
      return NextResponse.json({ error: "Failed to seed opening trade" }, { status: 500 });
    }
    try {
      await recomputeHolding(supabase, data.id);
    } catch {
      await supabase.from("sh_holdings").delete().eq("id", data.id);
      return NextResponse.json({ error: "Failed to recompute position" }, { status: 500 });
    }
    const { data: fresh } = await supabase
      .from("sh_holdings")
      .select("*")
      .eq("id", data.id)
      .single();
    return NextResponse.json({ holding: fresh ?? data }, { status: 201 });
  }

  return NextResponse.json({ holding: data }, { status: 201 });
}
