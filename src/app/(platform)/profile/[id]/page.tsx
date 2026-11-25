import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBuilder, getBuilderStats } from "@/services/builders";
import { getBuilderDeliveries } from "@/services/deliveries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ExecutionSummary } from "@/components/profile/execution-summary";
import { DeliveriesList } from "@/components/profile/deliveries-list";
import { ReliabilityPanel } from "@/components/profile/reliability-panel";
import { InsightsPanel } from "@/components/profile/insights-panel";
import { ForgeScoreV3Card } from "@/components/score/forge-score-v3-card";
import { getV3Score } from "@/services/score-v3";
import { CapabilityMapCard } from "@/components/profile/capability-map-card";
import { ProfileInsightsCard } from "@/components/profile/profile-insights-card";
import { ScoreExplainerSheet } from "@/components/profile/score-explainer-sheet";
import { safeSkillValue } from "@/lib/score/format";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuilderProfilePage(props: Props) {
  const params = await props.params;
  const supabase = await createClient();

  let builder;
  try {
    builder = await getBuilder(supabase, params.id);
  } catch {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === params.id;

  const [stats, deliveries, v3] = await Promise.all([
    getBuilderStats(supabase, params.id),
    getBuilderDeliveries(supabase, params.id),
    getV3Score(supabase, params.id, isOwner),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = builder as any;
  const score = v3.view?.score ?? 0;
  const conf = v3.view?.confidence ?? 0;
  const dim = (k: string) => v3.view?.dimensions.find((d) => d.key === k)?.value ?? 0;
  const trustData = {
    deliverySuccess: dim("ec"),
    reliability: dim("rc"),
    quality: dim("aoi"),
    consistency: dim("lpi"),
  };

  const skillDims = {
    backend: safeSkillValue(b.ai_backend ?? b.self_backend),
    frontend: safeSkillValue(b.ai_frontend ?? b.self_frontend),
    ml: safeSkillValue(b.ai_ml ?? b.self_ml),
    systems: safeSkillValue(b.ai_systems ?? b.self_systems),
    devops: safeSkillValue(b.ai_devops ?? b.self_devops),
  };

  return (
    <div className="container max-w-5xl space-y-6 py-6 sm:py-8">
      <ProfileHeader
        builder={builder}
        scoreV3={v3.view?.score ?? null}
        stats={stats}
        isOwner={isOwner}
      />

      <ForgeScoreV3Card view={v3.view} history={v3.history} isOwner={isOwner} />

      <ExecutionSummary stats={stats} />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <CapabilityMapCard
          forgeScore={score}
          confidence={conf}
          dimensions={skillDims}
        />
        <ProfileInsightsCard
          forgeScore={score}
          confidence={conf}
          trust={trustData}
          stats={{
            verifiedDeliveries: stats.verifiedDeliveries,
            totalDeliveries: stats.totalDeliveries,
            completionRate: stats.completionRate,
            totalTeams: stats.totalTeams,
          }}
          skills={skillDims}
          hasDeliveries={stats.totalDeliveries > 0}
          hasGithub={!!b.github_username}
        />
      </div>

      <div className="flex justify-center">
        <ScoreExplainerSheet />
      </div>

      <DeliveriesList deliveries={deliveries} />

      <div className="grid gap-6 md:grid-cols-2">
        <ReliabilityPanel stats={stats} />
        <InsightsPanel builder={builder} deliveries={deliveries} stats={stats} />
      </div>
    </div>
  );
}
