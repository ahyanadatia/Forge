/**
 * Acceptance Likelihood — deterministic estimate of whether a builder
 * will accept an invite to a given project.
 */

export interface AcceptanceInput {
  builder: {
    availability: string;
    forge_score: number;
    confidence_score: number;
    reliability_score: number;
  };
  project: {
    owner_forge_score: number;
    stage: string | null;
    hours_per_week: number;
    team_size: number;
    roles_needed: string[];
  };
  history: {
    past_invites_received: number;
    past_invites_accepted: number;
    past_invites_declined: number;
    recent_invites_7d: number;
  };
  compatibilityPercent: number;
}

export interface AcceptanceOutput {
  percent: number;
  confidence: "High" | "Medium" | "Low";
  reasons: string[];
}

export function computeAcceptanceLikelihood(input: AcceptanceInput): AcceptanceOutput {
  const { builder, project, history, compatibilityPercent } = input;
  let base = 50;
  const reasons: string[] = [];

  // Availability fit (major factor)
  if (builder.availability === "available") {
    base += 20;
    reasons.push("Currently available for projects");
  } else if (builder.availability === "open_to_opportunities") {
    base += 10;
    reasons.push("Open to new opportunities");
  } else if (builder.availability === "busy") {
    base -= 15;
    reasons.push("Currently marked as busy");
  } else {
    base -= 30;
  }

  // Project attractiveness
  if (project.owner_forge_score >= 600) {
    base += 8;
    reasons.push("High-credibility project owner");
  } else if (project.owner_forge_score >= 400) {
    base += 4;
  }

  if (project.stage === "mvp" || project.stage === "beta" || project.stage === "launched") {
    base += 5;
  }

  // Skill match bonus
  if (compatibilityPercent >= 70) {
    base += 10;
    if (!reasons.some(r => r.includes("fit"))) {
      reasons.push("Strong project-skill alignment");
    }
  } else if (compatibilityPercent >= 50) {
    base += 5;
  } else {
    base -= 5;
  }

  // Historical behavior
  const totalResponses = history.past_invites_accepted + history.past_invites_declined;
  if (totalResponses > 0) {
    const acceptRate = history.past_invites_accepted / totalResponses;
    base += Math.round((acceptRate - 0.5) * 20);
    if (acceptRate >= 0.7) {
      reasons.push("High historical invite acceptance rate");
    }
  }

  // Penalty: too many recent invites
  if (history.recent_invites_7d > 5) {
    base -= 10;
  } else if (history.recent_invites_7d > 2) {
    base -= 5;
  }

  const percent = Math.max(5, Math.min(95, base));

  // Confidence based on data available
  let confidence: "High" | "Medium" | "Low";
  if (history.past_invites_received >= 5 && totalResponses >= 3) {
    confidence = "High";
  } else if (history.past_invites_received >= 2) {
    confidence = "Medium";
  } else {
    confidence = "Low";
  }

  if (reasons.length === 0) {
    reasons.push("Based on availability and project fit");
  }

  return { percent, confidence, reasons: reasons.slice(0, 3) };
}
