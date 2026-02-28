/**
 * Score interpretation — labels, bands, tooltips, insufficient evidence rules.
 * Used by profile visualizations and explainer components.
 */

export interface DimensionStatus {
  value: number;
  label: string;
  hasEvidence: boolean;
  displayValue: string;
  level: "insufficient" | "low" | "medium" | "high";
}

export function interpretDimension(value: number | null | undefined, label: string): DimensionStatus {
  if (value == null || value <= 0) {
    return { value: 0, label, hasEvidence: false, displayValue: "—", level: "insufficient" };
  }
  return {
    value,
    label,
    hasEvidence: true,
    displayValue: String(value),
    level: value >= 60 ? "high" : value >= 30 ? "medium" : "low",
  };
}

export type EvidenceCoverage = "None" | "Low" | "Medium" | "High";

export function getEvidenceCoverage(dimensions: Record<string, number | null | undefined>): EvidenceCoverage {
  const values = Object.values(dimensions).filter((v) => v != null && v > 0);
  const total = Object.keys(dimensions).length;
  if (values.length === 0) return "None";
  const ratio = values.length / total;
  if (ratio >= 0.8) return "High";
  if (ratio >= 0.4) return "Medium";
  return "Low";
}

export function hasAnyScore(forgeScore: number, confidence: number): boolean {
  return forgeScore > 0 || confidence > 0;
}

export function getScoreState(forgeScore: number, confidence: number): "none" | "partial" | "full" {
  if (forgeScore <= 0 && confidence <= 0) return "none";
  if (confidence < 35) return "partial";
  return "full";
}

export interface TopStrength {
  dimension: string;
  value: number;
}

export function getTopStrengths(
  dimensions: { key: string; label: string; value: number }[]
): TopStrength[] {
  return dimensions
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 2)
    .map((d) => ({ dimension: d.label, value: d.value }));
}

export function getImprovementSuggestions(
  skills: Record<string, number>,
  trust: { deliverySuccess: number; reliability: number; quality: number; consistency: number },
  hasDeliveries: boolean,
  hasGithub: boolean
): string[] {
  const suggestions: string[] = [];

  if (!hasDeliveries) {
    suggestions.push("Verify one delivery to raise confidence.");
  }
  if (!hasGithub) {
    suggestions.push("Connect GitHub to generate skill signals.");
  }

  const trustEntries = [
    { key: "reliability", score: trust.reliability, tip: "Complete a team project to improve reliability." },
    { key: "deliverySuccess", score: trust.deliverySuccess, tip: "Submit and verify more deliveries." },
    { key: "consistency", score: trust.consistency, tip: "Stay active regularly to build consistency." },
    { key: "quality", score: trust.quality, tip: "Add deeper evidence (repos, deployments) for quality." },
  ];

  trustEntries
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .forEach((e) => {
      if (e.score < 60 && suggestions.length < 3) {
        suggestions.push(e.tip);
      }
    });

  const skillEntries = Object.entries(skills).sort(([, a], [, b]) => a - b);
  if (skillEntries.length > 0 && skillEntries[0][1] < 30 && suggestions.length < 3) {
    suggestions.push("Add deliveries in your weakest skill area to broaden your profile.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Your profile is strong. Keep delivering to maintain momentum.");
  }

  return suggestions.slice(0, 3);
}
