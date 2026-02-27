import type {
  Builder,
  Delivery,
  BuilderInsights,
  ProjectInsight,
  Project,
} from "@/types";

interface BuilderInsightInput {
  builder: Builder;
  deliveries: Delivery[];
  stats: {
    totalDeliveries: number;
    verifiedDeliveries: number;
    completedDeliveries: number;
    droppedDeliveries: number;
    completionRate: number;
    totalTeams: number;
  };
}

export function generateBuilderInsights(
  input: BuilderInsightInput
): BuilderInsights {
  return {
    builder_id: input.builder.id,
    strengths: identifyStrengths(input),
    typical_project_duration: estimateTypicalDuration(input.deliveries),
    typical_team_size: estimateTypicalTeamSize(input),
    best_collaborator_patterns: identifyCollaboratorPatterns(input),
    reliability_trend: assessReliabilityTrend(input.deliveries),
  };
}

function identifyStrengths(input: BuilderInsightInput): string[] {
  const strengths: string[] = [];
  const { skills } = input.builder;

  const skillEntries = Object.entries(skills) as [string, number][];
  const topSkills = skillEntries
    .filter(([, v]) => v >= 70)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  for (const [skill] of topSkills) {
    const label = skill.replace("_", " ");
    strengths.push(`Strong ${label} capability`);
  }

  if (input.stats.completionRate >= 90) {
    strengths.push("Exceptionally reliable — high completion rate");
  } else if (input.stats.completionRate >= 75) {
    strengths.push("Consistent delivery record");
  }

  if (input.stats.verifiedDeliveries >= 5) {
    strengths.push("Extensive verified delivery history");
  }

  if (input.stats.totalTeams >= 3) {
    strengths.push("Experienced collaborator across multiple teams");
  }

  return strengths.slice(0, 5);
}

function estimateTypicalDuration(deliveries: Delivery[]): string | null {
  const completed = deliveries.filter(
    (d) => d.started_at && d.completed_at && d.status !== "dropped"
  );

  if (completed.length === 0) return null;

  const durations = completed.map((d) => {
    const start = new Date(d.started_at!).getTime();
    const end = new Date(d.completed_at!).getTime();
    return (end - start) / (1000 * 60 * 60 * 24);
  });

  const median = durations.sort((a, b) => a - b)[
    Math.floor(durations.length / 2)
  ];

  if (median < 7) return "Under 1 week";
  if (median < 30) return `~${Math.round(median / 7)} weeks`;
  if (median < 90) return `~${Math.round(median / 30)} months`;
  return `${Math.round(median / 30)}+ months`;
}

function estimateTypicalTeamSize(input: BuilderInsightInput): number | null {
  if (input.stats.totalTeams === 0) return null;
  return input.stats.totalTeams >= 3 ? 4 : 3;
}

function identifyCollaboratorPatterns(
  input: BuilderInsightInput
): string[] {
  const patterns: string[] = [];

  if (input.stats.totalTeams >= 5) {
    patterns.push("Thrives in team settings");
  }

  if (input.stats.completionRate >= 85 && input.stats.totalTeams >= 2) {
    patterns.push("Reliable teammate with high follow-through");
  }

  const soloDeliveries = input.deliveries.filter((d) => !d.project_id);
  if (soloDeliveries.length >= 3) {
    patterns.push("Effective independent contributor");
  }

  return patterns;
}

function assessReliabilityTrend(
  deliveries: Delivery[]
): "improving" | "stable" | "declining" {
  if (deliveries.length < 4) return "stable";

  const sorted = [...deliveries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);

  const firstRate = completionRate(firstHalf);
  const secondRate = completionRate(secondHalf);

  const diff = secondRate - firstRate;
  if (diff > 10) return "improving";
  if (diff < -10) return "declining";
  return "stable";
}

function completionRate(deliveries: Delivery[]): number {
  if (deliveries.length === 0) return 0;
  const completed = deliveries.filter(
    (d) => d.status === "completed" || d.status === "verified"
  ).length;
  return (completed / deliveries.length) * 100;
}

// ─── Project Insights ────────────────────────────────────────────────────────

interface ProjectInsightInput {
  project: Project;
  applicantCount: number;
  teamSize: number;
  currentMembers: number;
}

export function generateProjectInsight(
  input: ProjectInsightInput
): ProjectInsight {
  const reasons: string[] = [];
  let riskScore = 0;

  if (input.project.hours_per_week > 30) {
    riskScore += 2;
    reasons.push("High time commitment may reduce applicant pool");
  }

  if (input.teamSize > 6) {
    riskScore += 1;
    reasons.push("Large teams have higher coordination overhead");
  }

  if (input.applicantCount < input.teamSize * 2) {
    riskScore += 2;
    reasons.push("Low applicant-to-seat ratio");
  }

  if (input.currentMembers < Math.ceil(input.teamSize / 2)) {
    riskScore += 1;
    reasons.push("Team is below minimum viable size");
  }

  const riskLevel: "low" | "medium" | "high" =
    riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";

  return {
    project_id: input.project.id,
    risk_level: riskLevel,
    risk_reasons: reasons,
    recommended_team_size: Math.min(
      Math.max(3, Math.ceil(input.project.required_skills.length * 1.5)),
      input.teamSize
    ),
  };
}
