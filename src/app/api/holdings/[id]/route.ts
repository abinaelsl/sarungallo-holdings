import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

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
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
