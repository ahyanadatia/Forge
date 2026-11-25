import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client for server-side writes that row level security
 * deliberately does not allow from a user session: the V3 evidence ledger,
 * score history and the recompute queue are append-only "by system".
 *
 * Only call this from route handlers, after the caller has been
 * authenticated and authorised with the user-session client. Returns null
 * when SUPABASE_SERVICE_ROLE_KEY is not configured, so callers can answer
 * 503 instead of failing silently on RLS.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient must never run in the browser");
  }
  if (!url || !key) return null;
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const ADMIN_NOT_CONFIGURED = {
  error: "Scoring is not configured on this deployment (SUPABASE_SERVICE_ROLE_KEY is missing).",
} as const;
