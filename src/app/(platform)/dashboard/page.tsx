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
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Activity,
  Target,
  Users,
  ArrowRight,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { getScoreBand } from "@/lib/forge-score";
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

  const [stats, deliveries, applications, scoreResult] = await Promise.all([
    getBuilderStats(supabase, user.id),
    getBuilderDeliveries(supabase, user.id, { limit: 5 }),
    getBuilderApplications(supabase, user.id),
    supabase
      .from("forge_scores")
      .select("*")
      .eq("builder_id", user.id)
      .single()
      .then((r) => r.data as any),
  ]);

  const forgeScore = scoreResult;
  const pendingApps = applications.filter((a) => a.status === "pending");

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
    <div className="container max-w-4xl py-8 space-y-8">
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
      <div className="flex items-center justify-between" data-tour="profile-header">
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

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-tour="forge-score">
          <MetricCard
            label="Forge Score"
            value={b.forge_score || forgeScore?.score || "—"}
            sublabel={
              b.forge_score > 0
                ? `${getScoreBand(b.forge_score)} · ${b.confidence_score ?? 0}% confidence`
                : forgeScore
                  ? `Confidence: ${forgeScore.confidence}%`
                  : "Not yet computed"
            }
            icon={ShieldCheck}
          />
        </div>
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
                      className="text-xs shrink-0"
                    >
                      {d.status}
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
                      className="text-xs shrink-0"
                    >
                      {app.status}
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
