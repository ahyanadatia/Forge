/**
 * Score display formatting — strict null/placeholder rules.
 * All UI components use these instead of raw values.
 */

export function formatScore(score: number | null | undefined): string {
  if (score == null || score <= 0) return "—";
  return String(score);
}

export function formatScoreCompact(score: number | null | undefined): { display: string; hasValue: boolean } {
  if (score == null || score <= 0) return { display: "—", hasValue: false };
  return { display: String(score), hasValue: true };
}

export function formatBarValue(value: number | null | undefined): string {
  if (value == null || value <= 0) return "—";
  return String(value);
}

export function formatConfidence(confidence: number | null | undefined): string {
  if (confidence == null || confidence <= 0) return "—";
  if (confidence >= 65) return "High";
  if (confidence >= 35) return "Medium";
  return "Low";
}

export function formatBand(score: number | null | undefined): string | null {
  if (score == null || score <= 0) return null;
  if (score >= 800) return "Elite";
  if (score >= 600) return "Strong";
  if (score >= 400) return "Proven";
  if (score >= 200) return "Developing";
  return null;
}

export function isScoreComputed(score: number | null | undefined): boolean {
  return score != null && score > 0;
}

export function formatStatValue(value: number | null | undefined, suffix?: string): string {
  if (value == null) return "—";
  return suffix ? `${value}${suffix}` : String(value);
}

export function safeSkillValue(raw: number | null | undefined): number {
  if (raw == null || raw <= 0) return 0;
  return raw;
}
