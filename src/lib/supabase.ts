/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client. Two supported credential modes:
 *
 *  1. SUPABASE_SERVICE_ROLE_KEY  — bypasses RLS (most direct).
 *  2. SUPABASE_ANON_KEY + SH_DB_SECRET — uses the public key but sends a
 *     secret `x-app-secret` header. RLS policies require that header, so the
 *     public key alone (without the server-only secret) can read nothing.
 *
 * Either way the credential stays server-side; the password middleware gates
 * the app, and this module must never be imported into client components.
 *
 * Typed as `SupabaseClient<any>` so dynamic table writes type-check cleanly
 * without a generated Database schema.
 */
let cached: SupabaseClient<any, "public", any> | null = null;

export function getSupabaseAdmin(): SupabaseClient<any, "public", any> {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const dbSecret = process.env.SH_DB_SECRET;

  if (!url) {
    throw new Error("Missing SUPABASE_URL environment variable.");
  }

  if (serviceKey) {
    cached = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else if (anonKey && dbSecret) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-app-secret": dbSecret } },
    });
  } else {
    throw new Error(
      "Missing Supabase credentials: set SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_ANON_KEY together with SH_DB_SECRET.",
    );
  }

  return cached;
}
