import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getBuilder, getBuilderStats } from "@/services/builders";
import { getBuilderDeliveries } from "@/services/deliveries";
import { getBuilderApplications } from "@/services/applications";
import { getDisplayName } from "@/lib/profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Target,
  Users,
  ArrowRight,
  Plus,
} from "lucide-react";
import { ForgeScoreV3Card } from "@/components/score/forge-score-v3-card";
import { getV3Score } from "@/services/score-v3";
import { OnboardingOrchestrator } from "@/components/onboarding/onboarding-orchestrator";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let builder;
  try {
    builder = await getBuilder(supabase, user.id);
  } catch {
    redirect("/login");
  }

  const [stats, deliveries, applications, v3] = await Promise.all([
    getBuilderStats(supabase, user.id),
    getBuilderDeliveries(supabase, user.id, { limit: 5 }),
    getBuilderApplications(supabase, user.id),
    getV3Score(supabase, user.id, true),
  ]);

  const { count: projectCount } = await (supabase as any)
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const { count: inviteCount } = await (supabase as any)
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", user.id);

  const b = builder as any;

  return (
    <div className="container max-w-4xl space-y-6 py-6 sm:py-8">
      <OnboardingOrchestrator
        userId={user.id}
        builder={{
          username: b.username,
          avatar_url: b.avatar_url,
          github_username: b.github_username,
          forge_score: b.forge_score,
          last_scored_at: b.last_scored_at,
        }}
        hasDeliveries={stats.verifiedDeliveries > 0}
        hasProjects={(projectCount ?? 0) > 0}
        hasInvitesSent={(inviteCount ?? 0) > 0}
      />

      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-tour="profile-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {builder.first_name ?? getDisplayName(builder).split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Your execution record at a glance.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/projects/new" data-tour="create-project">
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create Project
            </Button>
          </Link>
          <Link href={`/profile/${user.id}`}>
            <Button variant="outline" size="sm">
              View Profile
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      <ForgeScoreV3Card view={v3.view} history={v3.history} isOwner />

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard
          label="Verified Deliveries"
          value={stats.verifiedDeliveries}
          sublabel={`${stats.totalDeliveries} total`}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Completion Rate"
          value={`${stats.completionRate}%`}
          sublabel={`${stats.droppedDeliveries} dropped`}
          icon={Target}
        />
        <MetricCard
          label="Teams"
          value={stats.totalTeams}
          sublabel={`${stats.totalProjects} projects`}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Deliveries */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium">
              Recent Deliveries
            </CardTitle>
            <Link href={`/profile/${user.id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {deliveries.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No deliveries yet
                </p>
                <Link href={`/profile/${user.id}`}>
                  <Button variant="outline" size="sm">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Record a Delivery
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {deliveries.map((d) => (
                  <Link
                    key={d.id}
                    href={`/deliveries/${d.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.role}
                      </p>
                    </div>
                    <Badge
                      variant={
                        d.status === "verified"
                          ? "success"
                          : d.status === "completed"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs capitalize shrink-0"
                    >
                      {d.status.replace(/_/g, " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium">
              Your Applications
            </CardTitle>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Browse Projects
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No applications yet
                </p>
                <Link href="/projects">
                  <Button variant="outline" size="sm">
                    Find Projects
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">
                      {(app.project as any)?.title ?? "Project"}
                    </span>
                    <Badge
                      variant={
                        app.status === "accepted"
                          ? "success"
                          : app.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs capitalize shrink-0"
                    >
                      {app.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sublabel: string;
  icon: any;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground/70">{sublabel}</p>
        </div>
      </CardContent>
    </Card>
  );
}
