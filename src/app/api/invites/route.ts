import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await (supabase as any)
    .from("invitations")
    .select(
      `*,
       project:projects(id, title, description, status, category, stage,
         timeline, hours_per_week, team_size, team_size_target, roles_needed, owner_id),
       sender:builders!invitations_sender_id_fkey(
         id, full_name, first_name, last_name, display_name, avatar_url, username, forge_score
       )`
    )
    .eq("builder_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invites: data ?? [] });
}
