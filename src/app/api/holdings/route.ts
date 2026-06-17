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

  // For real estate, seed current value from the manual value immediately.
  if (row.asset_class === "real_estate") {
    row.current_value_usd = row.manual_value_usd ?? row.cost_basis_usd ?? 0;
  }

  const { data, error } = await supabase
    .from("sh_holdings")
    .insert(row)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // For tradable assets created with an initial position, seed an opening
  // "buy" so the transaction ledger is the source of truth and the native
  // average cost is computed correctly.
  const cls = data.asset_class as string;
  const qty = Number(data.quantity);
  const costUsd = Number(data.cost_basis_usd);
  if ((cls === "equity" || cls === "crypto") && qty > 0 && costUsd > 0) {
    const cur = (data.currency as string)?.toUpperCase() || "USD";
    let fxRate = 1;
    if (cur !== "USD") {
      const rates = await getFxRates();
      fxRate = rates[cur] && rates[cur] > 0 ? rates[cur] : 1;
    }
    const priceNative = (costUsd * fxRate) / qty;
    await supabase.from("sh_transactions").insert({
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
    await recomputeHolding(supabase, data.id);
    const { data: fresh } = await supabase
      .from("sh_holdings")
      .select("*")
      .eq("id", data.id)
      .single();
    return NextResponse.json({ holding: fresh ?? data }, { status: 201 });
  }

  return NextResponse.json({ holding: data }, { status: 201 });
}
