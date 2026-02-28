"use client";

import { getConfidenceLabel } from "@/lib/forge-score";

interface Props {
  deliverySuccess: number;
  reliability: number;
  quality: number;
  consistency: number;
  confidence: number;
}

const TRUST_DIMS = [
  { key: "deliverySuccess", label: "Delivery Success", weight: "45%" },
  { key: "reliability", label: "Reliability", weight: "30%" },
  { key: "quality", label: "Quality", weight: "15%" },
  { key: "consistency", label: "Consistency", weight: "10%" },
] as const;

function barColor(value: number): string {
  if (value >= 70) return "bg-primary";
  if (value >= 40) return "bg-primary/60";
  if (value > 0) return "bg-primary/30";
  return "bg-muted";
}

function displayVal(value: number): string {
  if (value <= 0) return "—";
  return String(value);
}

export function TrustBars({ deliverySuccess, reliability, quality, consistency, confidence }: Props) {
  const confLabel = getConfidenceLabel(confidence);
  const scores: Record<string, number> = { deliverySuccess, reliability, quality, consistency };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Trust Profile</h3>
          <p className="text-xs text-muted-foreground">Execution reliability signals</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {confLabel} confidence
        </span>
      </div>

      <div className="space-y-3">
        {TRUST_DIMS.map(({ key, label, weight }) => {
          const value = scores[key] ?? 0;
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {label}
                  <span className="ml-1 opacity-50">({weight})</span>
                </span>
                <span className="font-medium tabular-nums">{displayVal(value)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(value)}`}
                  style={{ width: `${Math.max(value, 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
