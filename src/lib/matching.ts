import type { Builder, BuilderSkills, Project, MatchResult } from "@/types";
import { computeFinalSkills, finalToLegacySkills } from "./skills";

interface MatchInput {
  builder: Builder;
  builderStats: {
    verifiedDeliveries: number;
    completionRate: number;
    totalTeams: number;
  };
  forgeScore: number;
}

export function matchBuildersToProject(
  project: Project,
  candidates: MatchInput[]
): MatchResult[] {
  return candidates
    .map((candidate) => scoreCandidate(project, candidate))
    .sort((a, b) => b.score - a.score);
}

function scoreCandidate(
  project: Project,
  candidate: MatchInput
): MatchResult {
  const effectiveSkills = finalToLegacySkills(computeFinalSkills(candidate.builder));
  const capabilityFit = computeCapabilityFit(
    project.required_skills,
    effectiveSkills
  );
  const reliabilityFit = computeReliabilityFit(
    candidate.builderStats.completionRate
  );
  const commitmentFit = computeCommitmentFit(project, candidate);
  const deliveryHistoryFit = computeDeliveryHistoryFit(
    candidate.builderStats.verifiedDeliveries
  );

  const score = Math.round(
    capabilityFit * 0.35 +
    reliabilityFit * 0.30 +
    commitmentFit * 0.15 +
    deliveryHistoryFit * 0.20
  );

  return {
    builder: candidate.builder,
    score,
    explanation: generateExplanation(
      candidate,
      capabilityFit,
      reliabilityFit,
      commitmentFit,
      deliveryHistoryFit
    ),
    capability_fit: capabilityFit,
    reliability_fit: reliabilityFit,
    commitment_fit: commitmentFit,
    delivery_history_fit: deliveryHistoryFit,
  };
}

function computeCapabilityFit(
  requiredSkills: string[],
  builderSkills: BuilderSkills
): number {
  if (requiredSkills.length === 0) return 50;

  const skillMap: Record<string, keyof BuilderSkills> = {
    backend: "backend",
    frontend: "frontend",
    ml: "ml",
    "machine learning": "ml",
    "systems design": "systems_design",
    systems: "systems_design",
    devops: "devops",
    infrastructure: "devops",
  };

  let totalScore = 0;
  let matched = 0;

  for (const skill of requiredSkills) {
    const key = skillMap[skill.toLowerCase()];
    if (key && builderSkills[key] > 0) {
      totalScore += builderSkills[key];
      matched++;
    }
  }

  if (matched === 0) return 10;
  return Math.round((totalScore / matched) * (matched / requiredSkills.length));
}

function computeReliabilityFit(completionRate: number): number {
  return completionRate;
}

function computeCommitmentFit(
  project: Project,
  candidate: MatchInput
): number {
  if (candidate.builder.availability === "unavailable") return 0;
  if (candidate.builder.availability === "busy") return 25;
  if (candidate.builder.availability === "open_to_opportunities") return 60;
  return 80;
}

function computeDeliveryHistoryFit(verifiedDeliveries: number): number {
  if (verifiedDeliveries === 0) return 10;
  if (verifiedDeliveries < 3) return 40;
  if (verifiedDeliveries < 5) return 60;
  if (verifiedDeliveries < 10) return 80;
  return 95;
}

function generateExplanation(
  candidate: MatchInput,
  capabilityFit: number,
  reliabilityFit: number,
  commitmentFit: number,
  deliveryHistoryFit: number
): string {
  const parts: string[] = [];

  if (capabilityFit >= 60) {
    parts.push("Strong skill alignment with project requirements");
  } else if (capabilityFit >= 30) {
    parts.push("Partial skill match");
  }

  if (reliabilityFit >= 80) {
    parts.push("excellent completion track record");
  } else if (reliabilityFit >= 60) {
    parts.push("solid reliability history");
  }

  if (deliveryHistoryFit >= 60) {
    parts.push("proven delivery history");
  }

  if (candidate.builderStats.totalTeams >= 3) {
    parts.push("experienced in team environments");
  }

  if (parts.length === 0) {
    return "Limited track record — may be a new builder.";
  }

  const sentence = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  if (parts.length === 1) return sentence + ".";
  return sentence + " and " + parts.slice(1).join(", ") + ".";
}
