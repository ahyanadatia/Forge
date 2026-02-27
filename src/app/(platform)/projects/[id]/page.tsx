import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProject } from "@/services/projects";
import { getProjectApplications } from "@/services/applications";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Users as UsersIcon, Target, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { ApplyButton } from "@/components/projects/apply-button";

export const dynamic = 'force-dynamic';

interface Props {
  params: { id: string };
}

export default async function ProjectPage({ params }: Props) {
  const supabase = await createClient();

  let project;
  try {
    project = await getProject(supabase, params.id);
  } catch {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === project.owner_id;
  const owner = project.builders;

  let applications: any[] = [];
  if (isOwner) {
    try {
      applications = await getProjectApplications(supabase, params.id);
    } catch {
      // May not have access
    }
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {project.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {project.description}
            </p>
          </div>
          <Badge variant="secondary">{project.status}</Badge>
        </div>

        {/* Owner */}
        {owner && (
          <Link
            href={`/profile/${project.owner_id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={owner.avatar_url} />
              <AvatarFallback className="text-xs">
                {owner.display_name?.[0] ?? owner.first_name?.[0] ?? owner.full_name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            {owner.display_name || [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.full_name}
          </Link>
        )}
      </div>

      {/* Overview */}
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Timeline</p>
              <p className="text-sm font-medium">{project.timeline}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Team Size</p>
              <p className="text-sm font-medium">{project.team_size} people</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Target className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Commitment</p>
              <p className="text-sm font-medium">
                {project.hours_per_week}h / week
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Posted</p>
              <p className="text-sm font-medium">
                {formatDate(project.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      {project.goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {project.goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-muted-foreground">
                    {i + 1}.
                  </span>
                  {goal}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {project.required_skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Required Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {project.required_skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Apply */}
      {user && !isOwner && project.status === "open" && (
        <ApplyButton projectId={params.id} userId={user.id} />
      )}

      {/* Applicants (owner only) */}
      {isOwner && applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Applicants ({applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.map((app: any) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <Link
                  href={`/profile/${app.builder_id}`}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={app.builders?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {app.builders?.display_name?.[0] ?? app.builders?.first_name?.[0] ?? app.builders?.full_name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  {app.builders?.display_name || [app.builders?.first_name, app.builders?.last_name].filter(Boolean).join(" ") || app.builders?.full_name}
                </Link>
                <Badge
                  variant={
                    app.status === "accepted"
                      ? "success"
                      : app.status === "rejected"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {app.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
