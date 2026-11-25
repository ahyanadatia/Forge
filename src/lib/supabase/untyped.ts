import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Escape hatch for queries against tables that src/types/database.ts does not
 * describe yet (currently `invitations` and its foreign-key embeds).
 *
 * Use it at the call site, never as a client type, so every untyped query is
 * visible in review: `untyped(supabase).from("invitations")`. Remove once the
 * types are generated from the schema with `supabase gen types`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const untyped = (client: SupabaseClient<any, any, any>) => client as unknown as SupabaseClient;
