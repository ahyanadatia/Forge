"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Users as UsersIcon, Target, Calendar, DollarSign } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getCategoryLabel, getStageLabel } from "@/lib/project-constants";
import { ProjectLevelChip } from "@/components/projects/project-level-chip";
import { TopMatchesPanel } from "@/components/projects/top-matches-panel";
import { InviteModal } from "@/components/projects/invite-modal";
import { EditProjectPanel } from "@/components/projects/edit-project-panel";
import { LeaveProjectModal } from "@/components/projects/leave-project-modal";
import { ApplyButton } from "@/components/projects/apply-button";
import { formatCompRange } from "@/lib/compensation";
import type { ProjectLevelOutput } from "@/lib/matching/project-level";
import type { CompType } from "@/types";

interface RoleSeatCount {
  role: string;
  filled: number;
  total: number;
  comp_type?: CompType;
  comp_currency?: string;
  comp_amount_min?: number;
  comp_amount_max?: number;
  comp_equity_range?: string;
}

interface Props {
  project: any;
  owner: any;
  isOwner: boolean;
  isMember: boolean;
  userId: string | null;
  team: any;
  activeMembers: any[];
  invitations: any[];
  applications: any[];
  projectLevel: ProjectLevelOutput;
  activity: any[];
  roleSeatCounts?: RoleSeatCount[];
}

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  draft: { label: "Draft", variant: "secondary" },
  open: { label: "Open", variant: "default" },
  full: { label: "Full", variant: "outline" },
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  archived: { label: "Archived", variant: "outline" },
};

function getName(b: any) {
  return b?.display_name || [b?.first_name, b?.last_name].filter(Boolean).join(" ") || b?.full_name || "Unknown";
}

function getInitials(b: any) {
  return ((b?.first_name?.[0] ?? b?.full_name?.[0] ?? "?") + (b?.last_name?.[0] ?? "")).toUpperCase();
}

export function ProjectWorkspace({
  project,
  owner,
  isOwner,
  isMember,
  userId,
  team,
  activeMembers,
  invitations,
  applications,
  projectLevel,
  activity,
  roleSeatCounts,
}: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ builderId: string; name: string } | null>(null);
  const [localInvitations, setLocalInvitations] = useState(invitations);
  const [localApplications, setLocalApplications] = useState(applications);

  const teamTarget = project.team_size_target ?? project.team_size;
  const memberCount = activeMembers.length;
  const openSpots = Math.max(0, teamTarget - memberCount);
  const capacityPercent = teamTarget > 0 ? Math.min(100, Math.round((memberCount / teamTarget) * 100)) : 0;
  const pendingInvites = localInvitations.filter((i: any) => i.status === "pending");
  const pendingApplications = localApplications.filter((a: any) => a.status === "pending");

  const publishProject = useCallback(async () => {
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "open" }),
    });
    router.refresh();
  }, [project.id, router]);

  const handleApplicationAction = useCallback(async (appId: string, status: "accepted" | "rejected") => {
    await fetch(`/api/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLocalApplications((prev) => prev.map((a: any) => a.id === appId ? { ...a, status } : a));
    if (status === "accepted") router.refresh();
  }, [router]);

  const cancelInvite = useCallback(async (invId: string) => {
    await fetch("/api/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitation_id: invId, status: "withdrawn" }),
    });
    setLocalInvitations((prev) => prev.map((i: any) => i.id === invId ? { ...i, status: "withdrawn" } : i));
  }, []);

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{project.title}</h1>
            <ProjectLevelChip level={projectLevel.level} />
            <Badge variant={STATUS_LABELS[project.status]?.variant as any ?? "secondary"}>
              {STATUS_LABELS[project.status]?.label ?? project.status}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground max-w-2xl">{project.description}</p>
          )}
          {/* Owner */}
          {owner && (
            <Link
              href={owner.username ? `/u/${owner.username}` : `/profile/${project.owner_id}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={owner.avatar_url} />
                <AvatarFallback className="text-[10px]">{getInitials(owner)}</AvatarFallback>
              </Avatar>
              {getName(owner)}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && project.status === "draft" && (
            <Button onClick={publishProject}>Publish</Button>
          )}
          {isOwner && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>Edit</Button>
          )}
        </div>
      </div>

      {/* Category/Stage */}
      {(project.category || project.stage) && (
        <div className="flex items-center gap-2">
          {project.category && <Badge variant="secondary">{getCategoryLabel(project.category)}</Badge>}
          {project.stage && <Badge variant="outline">{getStageLabel(project.stage)}</Badge>}
        </div>
      )}

      {/* ─── OVERVIEW ─── */}
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {project.timeline && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Timeline</p>
                <p className="text-sm font-medium">{project.timeline}</p>
              </div>
            </div>
          )}
          {project.hours_per_week > 0 && (
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Commitment</p>
                <p className="text-sm font-medium">{project.hours_per_week}h / week</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Posted</p>
              <p className="text-sm font-medium">{formatDate(project.created_at)}</p>
            </div>
          </div>
          {project.roles_needed?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Roles</p>
              <div className="flex flex-wrap gap-1">
                {project.roles_needed.map((r: string) => (
                  <Badge key={r} variant="default" className="text-xs font-normal">{r}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── CAPACITY ─── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Team {memberCount} / {teamTarget}
              </span>
            </div>
            {openSpots > 0 && (
              <span className="text-xs text-muted-foreground">
                {openSpots} open spot{openSpots > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <Progress value={capacityPercent} className="h-2" />

          {/* Role-based seat breakdown */}
          {roleSeatCounts && roleSeatCounts.length > 0 && (
            <div className="grid gap-2 pt-1">
              {roleSeatCounts.map((r) => {
                const pct = r.total > 0 ? Math.round((r.filled / r.total) * 100) : 0;
                const compLabel = formatCompRange(
                  r.comp_type as CompType,
                  r.comp_currency,
                  r.comp_amount_min,
                  r.comp_amount_max,
                  r.comp_equity_range
                );
                return (
                  <div key={r.role} className="flex items-center gap-3">
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <span className="text-xs font-medium truncate">{r.role}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {r.filled}/{r.total}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5 w-20 shrink-0" />
                    {compLabel !== "TBD" && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                        <DollarSign className="h-2.5 w-2.5" />
                        {compLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── IMPROVEMENT HINT ─── */}
      {isOwner && projectLevel.hint && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <p className="text-sm text-muted-foreground">{projectLevel.hint}</p>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>Edit Project</Button>
          </CardContent>
        </Card>
      )}

      {/* ─── TEAM ─── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Current Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No team members yet.</p>
          ) : (
            activeMembers.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.builder?.avatar_url} />
                    <AvatarFallback className="text-xs">{getInitials(m.builder)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={m.builder?.username ? `/u/${m.builder.username}` : `/profile/${m.builder_id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {getName(m.builder)}
                      </Link>
                      {m.builder?.username && (
                        <span className="text-xs text-muted-foreground">@{m.builder.username}</span>
                      )}
                      {m.builder_id === project.owner_id && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Owner</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {m.role && <span>{m.role}</span>}
                      {m.builder?.forge_score > 0 && (
                        <span className="font-mono tabular-nums">{m.builder.forge_score}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Leave button for members */}
          {isMember && !isOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground mt-2"
              onClick={() => setLeaveOpen(true)}
            >
              Leave Project
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ─── INVITES (owner only) ─── */}
      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Pending Invites ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending invites.</p>
            ) : (
              pendingInvites.map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={inv.builder?.avatar_url} />
                      <AvatarFallback className="text-xs">{getInitials(inv.builder)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={inv.builder?.username ? `/u/${inv.builder.username}` : `/profile/${inv.builder_id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {getName(inv.builder)}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {inv.role && <span>{inv.role}</span>}
                        {inv.builder?.forge_score > 0 && (
                          <span className="font-mono tabular-nums">{inv.builder.forge_score}</span>
                        )}
                        <span>{formatDate(inv.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => cancelInvite(inv.id)}>Cancel</Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── APPLICANTS (owner only) ─── */}
      {isOwner && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Applicants ({pendingApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {localApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No applicants yet.</p>
            ) : (
              localApplications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={app.builders?.avatar_url} />
                      <AvatarFallback className="text-xs">{getInitials(app.builders)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link
                        href={`/profile/${app.builder_id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {getName(app.builders)}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {app.builders?.forge_score > 0 && (
                          <span className="font-mono tabular-nums">{app.builders.forge_score}</span>
                        )}
                        <span>{formatDate(app.created_at)}</span>
                      </div>
                      {app.message && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{app.message}</p>
                      )}
                    </div>
                  </div>
                  {app.status === "pending" ? (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleApplicationAction(app.id, "accepted")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => handleApplicationAction(app.id, "rejected")}>Reject</Button>
                    </div>
                  ) : (
                    <Badge variant={app.status === "accepted" ? "success" : app.status === "rejected" ? "destructive" : "secondary"}>
                      {app.status}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── TOP MATCHES (owner, open) ─── */}
      {isOwner && (project.status === "open" || project.status === "draft") && (
        <TopMatchesPanel projectId={project.id} />
      )}

      {/* ─── APPLY (non-owner, non-member, open project) ─── */}
      {userId && !isOwner && !isMember && (project.status === "open" || project.status === "active") && (
        <ApplyButton projectId={project.id} userId={userId} />
      )}

      {/* ─── ACTIVITY ─── */}
      {activity.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.map((ev: any) => (
                <div key={ev.id} className="flex items-start gap-3 text-sm">
                  <Avatar className="h-6 w-6 mt-0.5">
                    <AvatarImage src={ev.actor?.avatar_url} />
                    <AvatarFallback className="text-[10px]">{ev.actor?.full_name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p>
                      <span className="font-medium">{ev.actor?.full_name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">{ev.description}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── EDIT PANEL ─── */}
      {isOwner && (
        <EditProjectPanel
          project={project}
          open={editOpen}
          onClose={() => { setEditOpen(false); router.refresh(); }}
        />
      )}

      {/* ─── LEAVE MODAL ─── */}
      {isMember && !isOwner && team && (
        <LeaveProjectModal
          teamId={team.id}
          projectTitle={project.title}
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          onLeft={() => router.refresh()}
        />
      )}

      {/* ─── INVITE MODAL ─── */}
      {inviteTarget && (
        <InviteModal
          projectId={project.id}
          builderId={inviteTarget.builderId}
          builderName={inviteTarget.name}
          open={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
        />
      )}
    </div>
  );
}
