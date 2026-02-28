import { z } from "zod";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const leaveSchema = z.object({
  team_id: z.string().uuid(),
  reason: z.enum(["time_constraints", "project_mismatch", "personal_reasons", "found_other_project", "other"]),
  notify_owner: z.boolean().default(true),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { team_id, reason, notify_owner } = parsed.data;

  // Find the membership
  const { data: membership } = await supabase
    .from("team_members")
    .select("id, team_id, builder_id")
    .eq("team_id", team_id)
    .eq("builder_id", user.id)
    .is("left_at", null)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this team" }, { status: 404 });
  }

  // Mark as left
  const { error: updateError } = await supabase
    .from("team_members")
    .update({ left_at: new Date().toISOString(), leave_reason: reason })
    .eq("id", membership.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log activity event if notify_owner
  if (notify_owner) {
    const { data: team } = await supabase
      .from("teams")
      .select("project_id")
      .eq("id", team_id)
      .single();

    if (team) {
      await supabase.from("activity_events").insert({
        team_id,
        actor_id: user.id,
        event_type: "member_left",
        description: `Left the team (${reason.replace(/_/g, " ")})`,
        metadata: { reason },
      });
    }
  }

  // Check if team size dropped - potentially reopen the project
  const { count: activeMembers } = await supabase
    .from("team_members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", team_id)
    .is("left_at", null);

  const { data: team } = await supabase
    .from("teams")
    .select("project_id, projects(team_size_target, team_size, status)")
    .eq("id", team_id)
    .single() as { data: any; error: any };

  if (team?.projects) {
    const target = team.projects.team_size_target ?? team.projects.team_size;
    if (team.projects.status === "full" && (activeMembers ?? 0) < target) {
      await supabase.from("projects").update({ status: "open" }).eq("id", team.project_id);
    }
  }

  return NextResponse.json({ success: true });
}
