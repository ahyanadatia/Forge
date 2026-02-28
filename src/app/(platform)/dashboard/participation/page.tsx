"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

export default function ParticipationDashboard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [activeTeams, setActiveTeams] = useState<any[]>([]);
  const [completedTeams, setCompletedTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [appsRes, invsRes, teamsRes] = await Promise.all([
        supabase
          .from("applications")
          .select("*, projects(id, title, status, timeline, hours_per_week)")
          .eq("builder_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("invitations")
          .select("*, project:projects(id, title, status, timeline, hours_per_week, team_size, category, stage), sender:builders!invitations_sender_id_fkey(id, full_name, avatar_url, forge_score)")
          .eq("builder_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("team_members")
          .select("*, teams(id, name, project_id, projects(id, title, status))")
          .eq("builder_id", user.id),
      ]);

      setApplications(appsRes.data ?? []);
      setInvites(invsRes.data ?? []);

      const teams = teamsRes.data ?? [];
      setActiveTeams(teams.filter((t: any) => t.teams?.projects?.status !== "completed"));
      setCompletedTeams(teams.filter((t: any) => t.teams?.projects?.status === "completed"));
      setLoading(false);
    }
    load();
  }, [supabase]);

  const respondToInvite = async (invitationId: string, status: "accepted" | "declined") => {
    await fetch("/api/invitations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitation_id: invitationId, status }),
    });
    setInvites((prev) => prev.map((i) => i.id === invitationId ? { ...i, status } : i));
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Participation</h1>
        <p className="text-muted-foreground">Your applications, invites, and teams.</p>
      </div>

      <Tabs defaultValue="invites">
        <TabsList>
          <TabsTrigger value="invites">Invites ({invites.length})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applications.length})</TabsTrigger>
          <TabsTrigger value="active">Active Teams ({activeTeams.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTeams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invites" className="space-y-3 mt-4">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No invitations yet.</p>
          ) : (
            invites.map((inv: any) => (
              <Card key={inv.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Link href={`/invitations/${inv.id}`} className="font-medium text-sm hover:underline">
                        {inv.project?.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {inv.project?.timeline && <span>{inv.project.timeline}</span>}
                        <span>{inv.project?.hours_per_week}h/wk</span>
                        {inv.role && <span>Role: {inv.role}</span>}
                      </div>
                    </div>
                    <Badge variant={inv.status === "accepted" ? "success" : inv.status === "declined" ? "destructive" : "secondary"}>
                      {inv.status}
                    </Badge>
                  </div>

                  {/* Sender info */}
                  {inv.sender && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={inv.sender.avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {inv.sender.full_name?.[0] ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{inv.sender.full_name}</span>
                      {inv.sender.forge_score > 0 && (
                        <span className="font-mono tabular-nums">{inv.sender.forge_score}</span>
                      )}
                    </div>
                  )}

                  {inv.message && (
                    <p className="text-sm text-muted-foreground">{inv.message}</p>
                  )}

                  {inv.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondToInvite(inv.id, "accepted")}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => respondToInvite(inv.id, "declined")}>Decline</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-3 mt-4">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No applications yet.</p>
          ) : (
            applications.map((app: any) => (
              <Card key={app.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <Link href={`/projects/${app.project_id}`} className="text-sm font-medium hover:underline">
                      {app.projects?.title ?? "Project"}
                    </Link>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{app.projects?.status}</span>
                      <span>{app.projects?.timeline}</span>
                    </div>
                  </div>
                  <Badge variant={app.status === "accepted" ? "success" : app.status === "rejected" ? "destructive" : "secondary"}>
                    {app.status}
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3 mt-4">
          {activeTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No active teams.</p>
          ) : (
            activeTeams.map((tm: any) => (
              <Card key={tm.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{tm.teams?.name}</p>
                    <p className="text-xs text-muted-foreground">{tm.teams?.projects?.title}</p>
                  </div>
                  <Link href={`/teams/${tm.team_id}`}>
                    <Button variant="outline" size="sm">View Team</Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completedTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No completed teams.</p>
          ) : (
            completedTeams.map((tm: any) => (
              <Card key={tm.id} className="opacity-70">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm">{tm.teams?.name}</p>
                    <p className="text-xs text-muted-foreground">{tm.teams?.projects?.title}</p>
                  </div>
                  <Badge variant="outline">Completed</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
