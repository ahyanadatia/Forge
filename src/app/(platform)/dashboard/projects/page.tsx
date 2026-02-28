import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeProjectLevel } from "@/lib/matching/project-level";
import { ProjectLevelChip } from "@/components/projects/project-level-chip";

export const dynamic = "force-dynamic";

export default async function ProjectsDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [projectsResult, invitesSentResult, applicationsResult] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invitations")
      .select("*, builder:builders!invitations_builder_id_fkey(full_name, username), project:projects(title)")
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("*, builders(*), projects(title)")
      .in("project_id", (await supabase.from("projects").select("id").eq("owner_id", user.id)).data?.map((p: any) => p.id) ?? [])
      .order("created_at", { ascending: false }),
  ]);

  const projects = projectsResult.data ?? [];
  const invitesSent = invitesSentResult.data ?? [];
  const applicationsReceived = applicationsResult.data ?? [];

  const activeProjects = projects.filter((p: any) => !["completed", "archived"].includes(p.status));
  const archived = projects.filter((p: any) => p.status === "archived" || p.status === "completed");

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Projects</h1>
          <p className="text-muted-foreground">Manage your projects, invites, and applicants.</p>
        </div>
        <Link href="/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Posted by Me ({activeProjects.length})</TabsTrigger>
          <TabsTrigger value="invites">Invites Sent ({invitesSent.length})</TabsTrigger>
          <TabsTrigger value="applicants">Applicants ({applicationsReceived.length})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-3 mt-4">
          {activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No projects yet.</p>
          ) : (
            activeProjects.map((project: any) => {
              const level = computeProjectLevel({
                roles_needed: project.roles_needed ?? [],
                timeline: project.timeline,
                timeline_weeks: project.timeline_weeks,
                hours_per_week: project.hours_per_week,
                required_skills: project.required_skills ?? [],
                has_tasks: false,
                accepted_member_count: 0,
                has_delivery_activity: false,
              });
              const pendingApps = applicationsReceived.filter((a: any) => a.project_id === project.id && a.status === "pending").length;
              const pendingInvites = invitesSent.filter((i: any) => i.project_id === project.id && i.status === "pending").length;

              return (
                <Card key={project.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{project.title}</p>
                        <ProjectLevelChip level={level.level} />
                        <Badge variant="outline" className="text-xs">{project.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {pendingApps > 0 && <span>{pendingApps} applicant{pendingApps > 1 ? "s" : ""}</span>}
                        {pendingInvites > 0 && <span>{pendingInvites} pending invite{pendingInvites > 1 ? "s" : ""}</span>}
                        <span>{project.team_size} team size</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="invites" className="space-y-3 mt-4">
          {invitesSent.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No invites sent yet.</p>
          ) : (
            invitesSent.map((inv: any) => (
              <Card key={inv.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{inv.builder?.full_name ?? "Builder"}</p>
                    <p className="text-xs text-muted-foreground">{inv.project?.title}</p>
                  </div>
                  <Badge variant={inv.status === "accepted" ? "success" : inv.status === "declined" ? "destructive" : "secondary"}>
                    {inv.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="applicants" className="space-y-3 mt-4">
          {applicationsReceived.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No applicants yet.</p>
          ) : (
            applicationsReceived.map((app: any) => (
              <Card key={app.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <Link href={`/profile/${app.builder_id}`} className="text-sm font-medium hover:underline">
                      {app.builders?.display_name || app.builders?.full_name || "Builder"}
                    </Link>
                    <p className="text-xs text-muted-foreground">{app.projects?.title}</p>
                  </div>
                  <Badge variant={app.status === "accepted" ? "success" : app.status === "rejected" ? "destructive" : "secondary"}>
                    {app.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="archived" className="space-y-3 mt-4">
          {archived.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No archived projects.</p>
          ) : (
            archived.map((project: any) => (
              <Card key={project.id} className="opacity-60">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="text-sm">{project.title}</p>
                  <Badge variant="outline">{project.status === "archived" ? "Archived" : "Completed"}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
