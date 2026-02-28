import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Users as UsersIcon, Target } from "lucide-react";
import { getCategoryLabel, getStageLabel } from "@/lib/project-constants";
import { computeProjectLevel } from "@/lib/matching/project-level";
import { ProjectLevelChip } from "@/components/projects/project-level-chip";
import { InviteResponseButtons } from "@/components/projects/invite-response-buttons";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

function getName(b: any) {
  return b?.display_name || [b?.first_name, b?.last_name].filter(Boolean).join(" ") || b?.full_name || "Unknown";
}

function getInitials(b: any) {
  return ((b?.first_name?.[0] ?? b?.full_name?.[0] ?? "?") + (b?.last_name?.[0] ?? "")).toUpperCase();
}

export default async function InvitePage({ params }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: invitation } = await supabase
    .from("invitations")
    .select(`
      *,
      project:projects(
        id, title, description, status, category, stage,
        timeline, hours_per_week, team_size, team_size_target,
        roles_needed, required_skills, timeline_weeks,
        owner_id
      ),
      sender:builders!invitations_sender_id_fkey(
        id, full_name, first_name, last_name, display_name,
        avatar_url, username, forge_score
      )
    `)
    .eq("id", params.id)
    .eq("builder_id", user.id)
    .single() as { data: any; error: any };

  if (!invitation) notFound();

  const project = invitation.project;
  const sender = invitation.sender;

  // Fetch team members
  const { data: teamData } = await supabase
    .from("teams")
    .select("team_members(*, builder:builders(id, full_name, first_name, last_name, display_name, avatar_url, username, forge_score))")
    .eq("project_id", project.id)
    .single() as { data: any; error: any };

  const activeMembers = (teamData?.team_members ?? []).filter((m: any) => !m.left_at);
  const teamTarget = project.team_size_target ?? project.team_size;

  const projectLevel = computeProjectLevel({
    roles_needed: project.roles_needed ?? [],
    timeline: project.timeline,
    timeline_weeks: project.timeline_weeks,
    hours_per_week: project.hours_per_week,
    required_skills: project.required_skills ?? [],
    has_tasks: false,
    accepted_member_count: activeMembers.length,
    has_delivery_activity: false,
  });

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Project Invitation</h1>
        <p className="text-muted-foreground">
          {getName(sender)} invited you to join their project.
        </p>
      </div>

      {/* Project Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">{project.title}</CardTitle>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
            <ProjectLevelChip level={projectLevel.level} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category/Stage */}
          {(project.category || project.stage) && (
            <div className="flex items-center gap-2">
              {project.category && <Badge variant="secondary">{getCategoryLabel(project.category)}</Badge>}
              {project.stage && <Badge variant="outline">{getStageLabel(project.stage)}</Badge>}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {project.timeline && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Timeline</p>
                  <p className="text-sm font-medium">{project.timeline}</p>
                </div>
              </div>
            )}
            {project.hours_per_week > 0 && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Commitment</p>
                  <p className="text-sm font-medium">{project.hours_per_week}h / week</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Team</p>
                <p className="text-sm font-medium">{activeMembers.length} / {teamTarget}</p>
              </div>
            </div>
          </div>

          {/* Roles needed */}
          {project.roles_needed?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Roles needed</p>
              <div className="flex flex-wrap gap-1.5">
                {project.roles_needed.map((r: string) => (
                  <Badge key={r} variant="default" className="text-xs font-normal">{r}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Owner */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">Project Owner</p>
          <Link
            href={sender.username ? `/u/${sender.username}` : `/profile/${sender.id}`}
            className="flex items-center gap-3 hover:bg-muted/50 rounded-md p-2 -mx-2 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={sender.avatar_url} />
              <AvatarFallback>{getInitials(sender)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{getName(sender)}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {sender.username && <span>@{sender.username}</span>}
                {sender.forge_score > 0 && (
                  <span className="font-mono tabular-nums">Forge Score: {sender.forge_score}</span>
                )}
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Team Members */}
      {activeMembers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Current Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeMembers.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={m.builder?.avatar_url} />
                  <AvatarFallback className="text-xs">{getInitials(m.builder)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{getName(m.builder)}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {m.role && <span>{m.role}</span>}
                    {m.builder?.forge_score > 0 && (
                      <span className="font-mono tabular-nums">{m.builder.forge_score}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite message */}
      {invitation.message && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Message from {getName(sender)}</p>
            <p className="text-sm">{invitation.message}</p>
          </CardContent>
        </Card>
      )}

      {invitation.role && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Invited role</p>
            <Badge variant="default">{invitation.role}</Badge>
          </CardContent>
        </Card>
      )}

      {/* Response Buttons */}
      <InviteResponseButtons
        invitationId={invitation.id}
        status={invitation.status}
        projectId={project.id}
      />
    </div>
  );
}
