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

  // Resolve the trading currency (fall back to the holding's currency).
  let currency = (body.currency as string) || "";
  if (!currency) {
    const { data: h } = await supabase
      .from("sh_holdings")
      .select("currency")
      .eq("id", id)
      .single();
    currency = (h?.currency as string) || "USD";
  }
  currency = currency.toUpperCase();

  // Native units per 1 USD at trade time (1 for USD).
  let fxRate = 1;
  if (currency !== "USD") {
    const rates = await getFxRates();
    fxRate = rates[currency] && rates[currency] > 0 ? rates[currency] : 1;
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const position = await recomputeHolding(supabase, id);
  const { data: holding } = await supabase
    .from("sh_holdings")
    .select("*")
    .eq("id", id)
    .single();

  return NextResponse.json({ transaction: txn, position, holding }, { status: 201 });
}
