import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sh_dividends")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) return NextResponse.json({ error: "Failed to delete dividend" }, { status: 500 });
  if (!data?.length) {
    return NextResponse.json({ error: "Dividend not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
