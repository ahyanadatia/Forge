import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTeam, getTeamActivity } from "@/services/teams";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeDate } from "@/lib/utils";
import { TeamTaskList } from "@/components/teams/task-list";

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function TeamPage({ params }: Props) {
  const supabase = await createClient();

  let team: any;
  try {
    team = await getTeam(supabase, params.id);
  } catch {
    notFound();
  }

  let activity: any[] = [];
  try {
    activity = await getTeamActivity(supabase, params.id);
  } catch {
    // May fail if not a member
  }

  const members = team.team_members ?? [];
  const tasks = team.team_tasks ?? [];
  const project = team.projects;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
        {project && (
          <Link
            href={`/projects/${project.id}`}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            {project.title}
          </Link>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m: any) => (
              <Link
                key={m.id}
                href={`/profile/${m.builder_id}`}
                className="flex items-center justify-between rounded-md py-1 transition-colors hover:text-foreground"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={m.builders?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {m.builders?.display_name?.[0] ?? m.builders?.first_name?.[0] ?? m.builders?.full_name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{m.builders?.display_name || [m.builders?.first_name, m.builders?.last_name].filter(Boolean).join(" ") || m.builders?.full_name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {m.role}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Tasks */}
        <TeamTaskList teamId={params.id} initialTasks={tasks} />
      </div>

      {/* Activity Feed */}
      {activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((event: any) => (
              <div
                key={event.id}
                className="flex items-start gap-3 text-sm"
              >
                <div className="h-2 w-2 rounded-full bg-muted-foreground mt-1.5 shrink-0" />
                <div className="min-w-0">
                  <p>{event.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeDate(event.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
