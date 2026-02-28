import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBuilder, getBuilderStats } from "@/services/builders";
import { getBuilderDeliveries } from "@/services/deliveries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ExecutionSummary } from "@/components/profile/execution-summary";
import { Card, CardContent } from "@/components/ui/card";
import { ForgeScoreBreakdown } from "@/components/score/forge-score-breakdown";
import { ForgeScoreExplainer } from "@/components/score/forge-score-explainer";
import { ForgeScoreImprove } from "@/components/score/forge-score-improve";
import { DeliveriesList } from "@/components/profile/deliveries-list";
import { ReliabilityPanel } from "@/components/profile/reliability-panel";
import { InsightsPanel } from "@/components/profile/insights-panel";

import { StrengthHeatmap } from "@/components/profile/strength-heatmap";

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

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <ProfileHeader
        builder={builder}
        forgeScore={forgeScore}
        stats={stats}
        isOwner={isOwner}
      />

      <ExecutionSummary stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <ForgeScoreBreakdown
          forgeScore={hasBuilderScore ? b.forge_score : (forgeScore?.score ?? 0)}
          confidence={hasBuilderScore ? b.confidence_score : (forgeScore?.confidence ?? 0)}
          deliverySuccess={hasBuilderScore ? b.delivery_success_score : (forgeScore?.verified_deliveries_component ?? 0)}
          reliability={hasBuilderScore ? b.reliability_score : (forgeScore?.reliability_component ?? 0)}
          deliveryQuality={hasBuilderScore ? b.delivery_quality_score : (forgeScore?.collaboration_component ?? 0)}
          consistency={hasBuilderScore ? b.consistency_score : (forgeScore?.consistency_component ?? 0)}
          lastScoredAt={b.last_scored_at ?? forgeScore?.computed_at}
        />
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <StrengthHeatmap
                forgeScore={hasBuilderScore ? b.forge_score : (forgeScore?.score ?? 0)}
                confidence={hasBuilderScore ? b.confidence_score : (forgeScore?.confidence ?? 0)}
                dimensions={{
                  backend: b.ai_backend ?? b.self_backend ?? 0,
                  frontend: b.ai_frontend ?? b.self_frontend ?? 0,
                  ml: b.ai_ml ?? b.self_ml ?? 0,
                  systems: b.ai_systems ?? b.self_systems ?? 0,
                  devops: b.ai_devops ?? b.self_devops ?? 0,
                }}
              />
            </CardContent>
          </Card>
          <ForgeScoreExplainer />
        </div>
      </div>

      <DeliveriesList deliveries={deliveries} />

      <div className="grid gap-6 md:grid-cols-2">
        <ReliabilityPanel stats={stats} />
        <div className="space-y-4">
          <ForgeScoreImprove
            scores={{
              forge_score: hasBuilderScore ? b.forge_score : (forgeScore?.score ?? 0),
              confidence_score: hasBuilderScore ? b.confidence_score : (forgeScore?.confidence ?? 0),
              delivery_success_score: hasBuilderScore ? b.delivery_success_score : 0,
              reliability_score: hasBuilderScore ? b.reliability_score : 0,
              delivery_quality_score: hasBuilderScore ? b.delivery_quality_score : 0,
              consistency_score: hasBuilderScore ? b.consistency_score : 0,
            }}
          />
          <InsightsPanel builder={builder} deliveries={deliveries} stats={stats} />
        </div>
      </div>
    </div>
  );
}
