import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBuilderTeams } from "@/services/teams";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function TeamsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let teams: any[] = [];
  try {
    teams = await getBuilderTeams(supabase, user.id);
  } catch {
    // No teams
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Teams</h1>
        <p className="text-muted-foreground">
          Teams you're part of across projects.
        </p>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              You're not part of any teams yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <Link
                href="/projects"
                className="text-foreground hover:underline"
              >
                Browse projects
              </Link>{" "}
              to join a team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {teams.map((membership: any) => {
            const team = membership.teams;
            const project = team?.projects;
            return (
              <Link key={membership.id} href={`/teams/${team?.id}`}>
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">
                        {team?.name ?? "Unnamed Team"}
                      </p>
                      {project && (
                        <p className="text-sm text-muted-foreground">
                          {project.title}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary">{membership.role}</Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
