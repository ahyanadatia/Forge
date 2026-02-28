import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/services/projects";
import { getProjectApplications } from "@/services/applications";
import { getProjectInvitations } from "@/services/invitations";
import { computeProjectLevel } from "@/lib/matching/project-level";
import { ProjectWorkspace } from "@/components/projects/project-workspace";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function ProjectPage({ params }: Props) {
  const supabase = await createClient();

  let project: any;
  try {
    project = await getProject(supabase, params.id);
  } catch {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === project.owner_id;
  const isMember = false; // Will be set below

  // Fetch team data
  const { data: teamData } = await supabase
    .from("teams")
    .select("*, team_members(*, builder:builders(id, full_name, first_name, last_name, display_name, avatar_url, username, forge_score))")
    .eq("project_id", params.id)
    .single();

  const team = (teamData as any) ?? null;
  const allMembers = ((team?.team_members ?? []) as any[]);
  const activeMembers = allMembers.filter((m: any) => !m.left_at);
  const memberIds = activeMembers.map((m: any) => m.builder_id);
  const userIsMember = user ? memberIds.includes(user.id) : false;

  // Fetch invites and applications (owner only)
  let invitations: any[] = [];
  let applications: any[] = [];
  if (isOwner) {
    try {
      invitations = await getProjectInvitations(supabase, params.id);
    } catch { /* */ }
    try {
      applications = await getProjectApplications(supabase, params.id);
    } catch { /* */ }
  }

  // Fetch tasks + deliveries for level computation
  const { data: tasksData } = await supabase
    .from("team_tasks")
    .select("id")
    .eq("team_id", (team as any)?.id ?? "00000000-0000-0000-0000-000000000000")
    .limit(1);

  const { data: deliveriesData } = await supabase
    .from("deliveries")
    .select("id")
    .eq("project_id", params.id)
    .limit(1);

  const projectLevel = computeProjectLevel({
    roles_needed: project.roles_needed ?? [],
    timeline: project.timeline,
    timeline_weeks: project.timeline_weeks,
    hours_per_week: project.hours_per_week,
    required_skills: project.required_skills ?? [],
    has_tasks: (tasksData?.length ?? 0) > 0,
    accepted_member_count: activeMembers.length,
    has_delivery_activity: (deliveriesData?.length ?? 0) > 0,
  });

  // Activity events
  const { data: activityData } = await supabase
    .from("activity_events")
    .select("*, actor:builders(full_name, avatar_url)")
    .eq("team_id", (team as any)?.id ?? "00000000-0000-0000-0000-000000000000")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <ProjectWorkspace
      project={project}
      owner={project.builders}
      isOwner={isOwner}
      isMember={userIsMember}
      userId={user?.id ?? null}
      team={team}
      activeMembers={activeMembers}
      invitations={invitations}
      applications={applications}
      projectLevel={projectLevel}
      activity={activityData ?? []}
    />
  );
}
