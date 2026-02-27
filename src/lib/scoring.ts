import { clamp } from "@/lib/utils";

/**
 * Forge Score: 0–1000
 *
 * Components:
 *   Verified Deliveries  45%
 *   Reliability           30%
 *   Collaboration         15%
 *   Consistency           10%
 *
 * Confidence: 0–100 (based on data completeness)
 * Effective Score: ForgeScore * (0.6 + 0.4 * Confidence/100)
 */

interface ScoringInput {
  verifiedDeliveries: number;
  totalDeliveries: number;
  completedDeliveries: number;
  droppedDeliveries: number;
  projectsJoined: number;
  projectsCompleted: number;
  teamDeliveries: number;
  totalTeams: number;
  activeMonths: number;
  consecutiveActiveMonths: number;
}

interface ScoringOutput {
  score: number;
  verified_deliveries_component: number;
  reliability_component: number;
  collaboration_component: number;
  consistency_component: number;
  confidence: number;
  effective_score: number;
}

export function computeForgeScore(input: ScoringInput): ScoringOutput {
  const vd = computeVerifiedDeliveriesScore(input);
  const reliability = computeReliabilityScore(input);
  const collaboration = computeCollaborationScore(input);
  const consistency = computeConsistencyScore(input);

  const score = Math.round(
    vd * 0.45 + reliability * 0.30 + collaboration * 0.15 + consistency * 0.10
  );

  const confidence = computeConfidence(input);
  const effective_score = Math.round(score * (0.6 + 0.4 * confidence / 100));

  return {
    score: clamp(score, 0, 1000),
    verified_deliveries_component: Math.round(vd),
    reliability_component: Math.round(reliability),
    collaboration_component: Math.round(collaboration),
    consistency_component: Math.round(consistency),
    confidence,
    effective_score: clamp(effective_score, 0, 1000),
  };
}

function computeVerifiedDeliveriesScore(input: ScoringInput): number {
  const { verifiedDeliveries } = input;
  if (verifiedDeliveries === 0) return 0;

  // Logarithmic scaling: each delivery has diminishing returns
  // 1 verified = ~200, 5 = ~500, 10 = ~700, 20+ = ~900+
  const base = Math.log2(verifiedDeliveries + 1) * 200;
  return clamp(base, 0, 1000);
}

function computeReliabilityScore(input: ScoringInput): number {
  const { totalDeliveries, completedDeliveries, droppedDeliveries } = input;
  if (totalDeliveries === 0) return 0;

  const completionRate = completedDeliveries / totalDeliveries;
  const dropPenalty = droppedDeliveries * 50;

  const base = completionRate * 1000 - dropPenalty;
  return clamp(base, 0, 1000);
}

function computeCollaborationScore(input: ScoringInput): number {
  const { teamDeliveries, totalTeams } = input;
  if (totalTeams === 0) return 0;

  const teamCompletionRate = totalTeams > 0 ? teamDeliveries / totalTeams : 0;
  const teamScale = Math.min(totalTeams / 5, 1);

  const base = teamCompletionRate * 700 + teamScale * 300;
  return clamp(base, 0, 1000);
}

function computeConsistencyScore(input: ScoringInput): number {
  const { activeMonths, consecutiveActiveMonths } = input;
  if (activeMonths === 0) return 0;

  const monthScale = Math.min(activeMonths / 12, 1) * 600;
  const streakBonus = Math.min(consecutiveActiveMonths / 6, 1) * 400;

  return clamp(monthScale + streakBonus, 0, 1000);
}

function computeConfidence(input: ScoringInput): number {
  const { totalDeliveries, totalTeams, activeMonths } = input;

  let confidence = 0;

  // Enough deliveries to be meaningful
  if (totalDeliveries >= 1) confidence += 20;
  if (totalDeliveries >= 3) confidence += 15;
  if (totalDeliveries >= 5) confidence += 10;
  if (totalDeliveries >= 10) confidence += 10;

  // Team participation
  if (totalTeams >= 1) confidence += 15;
  if (totalTeams >= 3) confidence += 10;

  // Tenure / consistency
  if (activeMonths >= 1) confidence += 5;
  if (activeMonths >= 3) confidence += 5;
  if (activeMonths >= 6) confidence += 5;
  if (activeMonths >= 12) confidence += 5;

  return clamp(confidence, 0, 100);
}
