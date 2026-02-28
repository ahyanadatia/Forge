import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await (supabase as any).from("presence").upsert(
    { user_id: user.id, last_seen_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );

  return NextResponse.json({ ok: true });
}
