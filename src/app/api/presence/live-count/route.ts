import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

let cachedCount = 0;
let cacheTime = 0;
const CACHE_TTL = 12_000; // 12 seconds

export async function GET() {
  const now = Date.now();

  if (now - cacheTime < CACHE_TTL) {
    return NextResponse.json({ live_count: cachedCount });
  }

  const supabase = await createClient();
  const fiveMinutesAgo = new Date(now - 5 * 60_000).toISOString();

  const { count, error } = await (supabase as any)
    .from("presence")
    .select("user_id", { count: "exact", head: true })
    .gte("last_seen_at", fiveMinutesAgo);

  if (!error && count != null) {
    cachedCount = count;
    cacheTime = now;
  }

  return NextResponse.json({ live_count: cachedCount });
}
