import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { recomputeHolding } from "@/lib/positions";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: txn } = await supabase
    .from("sh_transactions")
    .select("holding_id")
    .eq("id", id)
    .single();
  if (!txn) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.from("sh_transactions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const holdingId = txn.holding_id as string;
  const position = await recomputeHolding(supabase, holdingId);
  const { data: holding } = await supabase
    .from("sh_holdings")
    .select("*")
    .eq("id", holdingId)
    .single();

  return NextResponse.json({ ok: true, position, holding });
}
