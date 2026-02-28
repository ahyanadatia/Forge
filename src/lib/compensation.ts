import type { CompType } from "@/types";

const COMP_LABELS: Record<CompType, string> = {
  unpaid: "Unpaid / Volunteer",
  hourly: "Hourly Rate",
  fixed: "Fixed Payment",
  equity: "Equity",
  prize_split: "Prize / Revenue Split",
  tbd: "To Be Discussed",
};

export function getCompLabel(type: CompType): string {
  return COMP_LABELS[type] ?? type;
}

export function formatCompRange(
  type: CompType | null | undefined,
  currency: string | null | undefined,
  min: number | null | undefined,
  max: number | null | undefined,
  equityRange: string | null | undefined
): string {
  if (!type || type === "tbd") return "TBD";
  if (type === "unpaid") return "Unpaid";

  if (type === "equity" && equityRange) {
    return `Equity: ${equityRange}`;
  }

  const curr = currency || "USD";
  if (min != null && max != null && min !== max) {
    return `${curr} ${min.toLocaleString()}–${max.toLocaleString()}${type === "hourly" ? "/hr" : ""}`;
  }
  if (min != null) {
    return `${curr} ${min.toLocaleString()}${type === "hourly" ? "/hr" : ""}`;
  }
  if (max != null) {
    return `Up to ${curr} ${max.toLocaleString()}${type === "hourly" ? "/hr" : ""}`;
  }

  return getCompLabel(type);
}
