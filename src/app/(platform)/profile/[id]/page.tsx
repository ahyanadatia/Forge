import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBuilder, getBuilderStats } from "@/services/builders";
import { getBuilderDeliveries } from "@/services/deliveries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ExecutionSummary } from "@/components/profile/execution-summary";
import { DeliveriesList } from "@/components/profile/deliveries-list";
import { ReliabilityPanel } from "@/components/profile/reliability-panel";
import { InsightsPanel } from "@/components/profile/insights-panel";
import { ScoreSummaryCard } from "@/components/profile/score-summary-card";
import { CapabilityMapCard } from "@/components/profile/capability-map-card";
import { ProfileInsightsCard } from "@/components/profile/profile-insights-card";
import { ScoreExplainerSheet } from "@/components/profile/score-explainer-sheet";
import { safeSkillValue } from "@/lib/score/format";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default async function BuilderProfilePage({ params }: Props) {
  const supabase = await createClient();

  let builder;
  try {
    builder = await getBuilder(supabase, params.id);
  } catch {
    notFound();
  }

  const [stats, deliveries, scoreResult] = await Promise.all([
    getBuilderStats(supabase, params.id),
    getBuilderDeliveries(supabase, params.id),
    supabase
      .from("forge_scores")
      .select("*")
      .eq("builder_id", params.id)
      .single()
      .then((r) => r.data as any),
  ]);

  const forgeScore = scoreResult;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === params.id;

  const b = builder as any;
  const hasBuilderScore = b.forge_score > 0 || b.last_scored_at;

  const score = hasBuilderScore ? b.forge_score : (forgeScore?.score ?? 0);
  const conf = hasBuilderScore ? b.confidence_score : (forgeScore?.confidence ?? 0);

  const trustData = {
    deliverySuccess: hasBuilderScore ? b.delivery_success_score : (forgeScore?.verified_deliveries_component ?? 0),
    reliability: hasBuilderScore ? b.reliability_score : (forgeScore?.reliability_component ?? 0),
    quality: hasBuilderScore ? b.delivery_quality_score : (forgeScore?.collaboration_component ?? 0),
    consistency: hasBuilderScore ? b.consistency_score : (forgeScore?.consistency_component ?? 0),
  };

  const skillDims = {
    backend: safeSkillValue(b.ai_backend ?? b.self_backend),
    frontend: safeSkillValue(b.ai_frontend ?? b.self_frontend),
    ml: safeSkillValue(b.ai_ml ?? b.self_ml),
    systems: safeSkillValue(b.ai_systems ?? b.self_systems),
    devops: safeSkillValue(b.ai_devops ?? b.self_devops),
  };

  return (
    <div className="container max-w-5xl py-8 space-y-8">
      <ProfileHeader
        builder={builder}
        forgeScore={forgeScore}
        stats={stats}
        isOwner={isOwner}
      />

      <ExecutionSummary stats={stats} />

      {/* 3-panel score section */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr_1fr]" data-tour="forge-score">
        <ScoreSummaryCard
          forgeScore={score}
          confidence={conf}
          deliverySuccess={trustData.deliverySuccess}
          reliability={trustData.reliability}
          deliveryQuality={trustData.quality}
          consistency={trustData.consistency}
          lastScoredAt={b.last_scored_at ?? forgeScore?.computed_at}
        />
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
