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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sh_holdings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    const status = error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { error: status === 404 ? "Holding not found" : "Failed to load holding" },
      { status },
    );
  }
  return NextResponse.json({ holding: data });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const row = sanitize(body);

  if (row.asset_class === "real_estate") {
    row.current_value_usd = row.manual_value_usd ?? row.cost_basis_usd ?? 0;
  }

  const { data, error } = await supabase
    .from("sh_holdings")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: "Failed to update holding" }, { status: 500 });

  // Manual position correction: rewrite the ledger to a single opening lot so
  // the corrected quantity / average becomes the source of truth.
  const cls = data.asset_class as string;
  if (body.reset_position === true && (cls === "equity" || cls === "crypto")) {
    const shares = Number(data.quantity);
    const cur = (data.currency as string)?.toUpperCase() || "USD";
    let fxRate = 1;
    if (cur !== "USD") {
      const rates = await getFxRates();
      if (!rates[cur] || rates[cur] <= 0) {
        return NextResponse.json(
          { error: `Missing FX rate for ${cur}` },
          { status: 502 },
        );
      }
      fxRate = rates[cur];
    }
    let priceNative = Number(body.open_price_native);
    if (!Number.isFinite(priceNative) || priceNative <= 0) {
      const costUsd = Number(data.cost_basis_usd);
      priceNative = shares > 0 && costUsd > 0 ? (costUsd * fxRate) / shares : NaN;
    }

    await supabase.from("sh_transactions").delete().eq("holding_id", id);
    if (shares > 0 && Number.isFinite(priceNative) && priceNative > 0) {
      await supabase.from("sh_transactions").insert({
        holding_id: id,
        type: "buy",
        trade_date: (data.acquisition_date as string) || new Date().toISOString().slice(0, 10),
        shares,
        price_native: priceNative,
        fees_native: 0,
        currency: cur,
        fx_rate: fxRate,
        notes: "Opening balance (corrected)",
      });
    }
    try {
      await recomputeHolding(supabase, id);
    } catch {
      return NextResponse.json({ error: "Failed to recompute position" }, { status: 500 });
    }
    const { data: fresh } = await supabase
      .from("sh_holdings")
      .select("*")
      .eq("id", id)
      .single();
    return NextResponse.json({ holding: fresh ?? data });
  }

  return NextResponse.json({ holding: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sh_holdings").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
