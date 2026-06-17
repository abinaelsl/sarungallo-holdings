import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getFxRates } from "@/lib/prices";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sh_dividends")
    .select("*")
    .eq("holding_id", id)
    .order("pay_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dividends: data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const body = await req.json().catch(() => ({}));

  const amountPerShare = Number(body.amount_per_share);
  if (!Number.isFinite(amountPerShare) || amountPerShare < 0) {
    return NextResponse.json(
      { error: "amount per share is required" },
      { status: 400 },
    );
  }

  const { data: h } = await supabase
    .from("sh_holdings")
    .select("currency, quantity")
    .eq("id", id)
    .single();

  const currency = ((body.currency as string) || (h?.currency as string) || "USD").toUpperCase();
  const shares =
    body.shares != null && body.shares !== ""
      ? Number(body.shares)
      : Number(h?.quantity) || 0;

  let fxRate = 1;
  if (currency !== "USD") {
    const rates = await getFxRates();
    fxRate = rates[currency] && rates[currency] > 0 ? rates[currency] : 1;
  }

  const totalUsd = (amountPerShare * shares) / fxRate;

  const { data: dividend, error } = await supabase
    .from("sh_dividends")
    .insert({
      holding_id: id,
      pay_date: body.pay_date || new Date().toISOString().slice(0, 10),
      amount_per_share: amountPerShare,
      shares,
      currency,
      fx_rate: fxRate,
      total_usd: totalUsd,
      notes: (body.notes as string)?.trim() || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dividend }, { status: 201 });
}
