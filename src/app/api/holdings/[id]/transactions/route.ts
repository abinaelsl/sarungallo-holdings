import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getFxRates } from "@/lib/prices";
import { recomputeHolding } from "@/lib/positions";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sh_transactions")
    .select("*")
    .eq("holding_id", id)
    .order("trade_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));

  const type = body.type === "sell" ? "sell" : "buy";
  const shares = Number(body.shares);
  const priceNative = Number(body.price_native);
  if (!Number.isFinite(shares) || shares <= 0) {
    return NextResponse.json({ error: "shares must be > 0" }, { status: 400 });
  }
  if (!Number.isFinite(priceNative) || priceNative < 0) {
    return NextResponse.json({ error: "price is required" }, { status: 400 });
  }

  const { data: holdingRow, error: holdingErr } = await supabase
    .from("sh_holdings")
    .select("currency, quantity")
    .eq("id", id)
    .single();
  if (holdingErr || !holdingRow) {
    return NextResponse.json({ error: "Holding not found" }, { status: 404 });
  }

  // Reject oversells so the ledger never stores shares the position didn't have.
  if (type === "sell") {
    const available = Number(holdingRow.quantity) || 0;
    if (shares > available + 1e-9) {
      return NextResponse.json(
        {
          error: `Cannot sell ${shares}: only ${available} shares available`,
        },
        { status: 400 },
      );
    }
  }

  const currency = ((body.currency as string) || (holdingRow.currency as string) || "USD").toUpperCase();

  // Native units per 1 USD at trade time (1 for USD).
  let fxRate = 1;
  if (currency !== "USD") {
    const rates = await getFxRates();
    if (!rates[currency] || rates[currency] <= 0) {
      return NextResponse.json(
        { error: `Missing FX rate for ${currency}` },
        { status: 502 },
      );
    }
    fxRate = rates[currency];
  }

  const { data: txn, error } = await supabase
    .from("sh_transactions")
    .insert({
      holding_id: id,
      type,
      trade_date: body.trade_date || new Date().toISOString().slice(0, 10),
      shares,
      price_native: priceNative,
      fees_native: Number(body.fees_native) || 0,
      currency,
      fx_rate: fxRate,
      notes: (body.notes as string)?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to save transaction" }, { status: 500 });

  let position;
  try {
    position = await recomputeHolding(supabase, id);
  } catch {
    return NextResponse.json(
      { error: "Transaction saved but position recompute failed" },
      { status: 500 },
    );
  }
  const { data: holding } = await supabase
    .from("sh_holdings")
    .select("*")
    .eq("id", id)
    .single();

  return NextResponse.json({ transaction: txn, position, holding }, { status: 201 });
}
