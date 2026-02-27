import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBuilder, getBuilderStats } from "@/services/builders";
import { getBuilderDeliveries } from "@/services/deliveries";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ExecutionSummary } from "@/components/profile/execution-summary";
import { TrustHeatmap } from "@/components/profile/trust-heatmap";
import { SkillsHeatmap } from "@/components/profile/skills-heatmap";
import { DeliveriesList } from "@/components/profile/deliveries-list";
import { ReliabilityPanel } from "@/components/profile/reliability-panel";
import { InsightsPanel } from "@/components/profile/insights-panel";

export const dynamic = 'force-dynamic';

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
        <TrustHeatmap forgeScore={forgeScore} stats={stats} />
        <SkillsHeatmap skills={builder.skills} />
      </div>

      <DeliveriesList deliveries={deliveries} />

      <div className="grid gap-6 md:grid-cols-2">
        <ReliabilityPanel stats={stats} />
        <InsightsPanel builder={builder} deliveries={deliveries} stats={stats} />
      </div>
    </div>
  );
}
