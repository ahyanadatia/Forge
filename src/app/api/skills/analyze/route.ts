import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchUserRepos } from "@/lib/github";
import {
  extractGitHubSignals,
  extractDeliverySignals,
  mergeSignals,
  buildEvidenceSummary,
} from "@/lib/skill-signals";
import { analyzeSkillsWithAi } from "@/lib/skill-ai";
import { finalToLegacySkills } from "@/lib/skills";
import type { Delivery, SkillScores } from "@/types";

const RATE_LIMIT_MS = 60 * 60 * 1000; // 1 hour

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch builder
  const { data: builder, error: builderErr } = await (supabase as any)
    .from("builders")
    .select("*")
    .eq("id", user.id)
    .single();

  if (builderErr || !builder) {
    return NextResponse.json(
      { error: "Builder not found" },
      { status: 404 }
    );
  }

  // Rate limit: 1 analysis per hour
  if (builder.skills_last_analyzed) {
    const lastAnalyzed = new Date(builder.skills_last_analyzed).getTime();
    const elapsed = Date.now() - lastAnalyzed;
    if (elapsed < RATE_LIMIT_MS) {
      const minutesLeft = Math.ceil((RATE_LIMIT_MS - elapsed) / 60000);
      return NextResponse.json(
        { error: `Rate limited. Try again in ${minutesLeft} minutes.` },
        { status: 429 }
      );
    }
  }

  // Gather self-assessment scores
  const selfScores: SkillScores = {
    backend: builder.self_backend ?? 0,
    frontend: builder.self_frontend ?? 0,
    ml: builder.self_ml ?? 0,
    systems: builder.self_systems ?? 0,
    devops: builder.self_devops ?? 0,
  };

  // 1. Fetch GitHub repos
  let githubRepos: Awaited<ReturnType<typeof fetchUserRepos>> = [];
  if (builder.github_username) {
    try {
      githubRepos = await fetchUserRepos(builder.github_username);
    } catch (err) {
      console.error("GitHub fetch failed:", err);
    }
  }

  // 2. Fetch deliveries
  const { data: deliveries } = await (supabase as any)
    .from("deliveries")
    .select("*")
    .eq("builder_id", user.id);
  const builderDeliveries: Delivery[] = deliveries ?? [];

  // 3. Extract signals
  const githubSignals = extractGitHubSignals(githubRepos);
  const deliverySignals = extractDeliverySignals(builderDeliveries);
  const merged = mergeSignals(githubSignals, deliverySignals);

  // 4. Run AI analysis
  const aiResult = await analyzeSkillsWithAi(
    merged,
    selfScores,
    githubRepos.length,
    builderDeliveries.length
  );

  // 5. Build evidence
  const evidence = buildEvidenceSummary(
    merged,
    githubRepos.length,
    builderDeliveries.length
  );

  // 6. Compute final skills for the legacy JSONB column
  const finalSkills = {
    backend: Math.round(0.6 * aiResult.scores.backend + 0.4 * selfScores.backend),
    frontend: Math.round(0.6 * aiResult.scores.frontend + 0.4 * selfScores.frontend),
    ml: Math.round(0.6 * aiResult.scores.ml + 0.4 * selfScores.ml),
    systems_design: Math.round(0.6 * aiResult.scores.systems + 0.4 * selfScores.systems),
    devops: Math.round(0.6 * aiResult.scores.devops + 0.4 * selfScores.devops),
  };

  // 7. Store results
  const { error: updateErr } = await (supabase as any)
    .from("builders")
    .update({
      ai_backend: aiResult.scores.backend,
      ai_frontend: aiResult.scores.frontend,
      ai_ml: aiResult.scores.ml,
      ai_systems: aiResult.scores.systems,
      ai_devops: aiResult.scores.devops,
      skill_confidence: aiResult.confidence,
      skills_last_analyzed: new Date().toISOString(),
      skill_evidence: evidence,
      skills: finalSkills,
    })
    .eq("id", user.id);

  if (updateErr) {
    console.error("Failed to store skill analysis:", updateErr);
    return NextResponse.json(
      { error: "Failed to save results" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    scores: aiResult.scores,
    confidence: aiResult.confidence,
    justification: aiResult.justification,
    evidence,
    final_skills: finalSkills,
  });
}
