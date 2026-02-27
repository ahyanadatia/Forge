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

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {builder.first_name ?? getDisplayName(builder).split(" ")[0]}
          </h1>
          <p className="text-muted-foreground">
            Your execution record at a glance.
          </p>
        </div>
        <div className="flex gap-2">
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
        <MetricCard
          label="Forge Score"
          value={forgeScore?.score ?? "—"}
          sublabel={
            forgeScore
              ? `Confidence: ${forgeScore.confidence}%`
              : "Not yet computed"
          }
          icon={ShieldCheck}
        />
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
