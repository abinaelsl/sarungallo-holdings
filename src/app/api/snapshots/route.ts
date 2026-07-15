import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Cap history payload so client mount stays fast as snapshots accumulate. */
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(raw)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(raw)))
    : DEFAULT_LIMIT;

  // Take the newest N, then return ascending for charts.
  const { data, error } = await supabase
    .from("sh_snapshots")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: "Failed to load snapshots" }, { status: 500 });

  const snapshots = (data ?? []).slice().reverse();
  return NextResponse.json({ snapshots });
}
