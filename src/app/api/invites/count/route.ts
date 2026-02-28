import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const { count, error } = await (supabase as any)
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("builder_id", user.id)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ count: 0 });
  }

  return NextResponse.json({ count: count ?? 0 });
}
