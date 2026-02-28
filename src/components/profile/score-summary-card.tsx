"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatScore,
  formatConfidence,
  formatBand,
  formatBarValue,
  isScoreComputed,
} from "@/lib/score/format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Props {
  forgeScore: number;
  confidence: number;
  deliverySuccess: number;
  reliability: number;
  deliveryQuality: number;
  consistency: number;
  lastScoredAt?: string | null;
  onOpenExplainer?: () => void;
}

const DIMENSIONS = [
  { key: "deliverySuccess", label: "Delivery Success", weight: "45%" },
  { key: "reliability", label: "Reliability", weight: "30%" },
  { key: "deliveryQuality", label: "Delivery Quality", weight: "15%" },
  { key: "consistency", label: "Consistency", weight: "10%" },
] as const;

function barFill(value: number): string {
  if (value >= 70) return "bg-foreground";
  if (value >= 40) return "bg-foreground/60";
  if (value > 0) return "bg-foreground/30";
  return "bg-transparent";
}

export function ScoreSummaryCard({
  forgeScore,
  confidence,
  deliverySuccess,
  reliability,
  deliveryQuality,
  consistency,
  lastScoredAt,
  onOpenExplainer,
}: Props) {
  const computed = isScoreComputed(forgeScore);
  const display = formatScore(forgeScore);
  const band = formatBand(forgeScore);
  const confDisplay = formatConfidence(confidence);
  const scores: Record<string, number> = { deliverySuccess, reliability, deliveryQuality, consistency };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Forge Score</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between space-y-5">
        {/* Big number */}
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold tabular-nums tracking-tight">
              {display}
            </span>
            {computed && (
              <span className="text-sm text-muted-foreground/60">/ 1000</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            {band && (
              <Badge variant="secondary" className="text-[10px] font-medium h-5">
                {band}
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] h-5 cursor-help">
                    Confidence: {confDisplay}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-xs">
                  Confidence increases as you add verified evidence — deliveries, collaborators, and completed projects.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {!computed && (
            <p className="text-xs text-muted-foreground mt-2">
              Not yet calculated
            </p>
          )}
        </div>

        {/* 4 weighted bars */}
        <div className="space-y-2.5">
          {DIMENSIONS.map(({ key, label, weight }) => {
            const value = scores[key] ?? 0;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {label}
                    <span className="ml-1 opacity-40">{weight}</span>
                  </span>
                  <span className="text-[11px] font-medium tabular-nums">
                    {formatBarValue(value)}
                  </span>
                </div>
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barFill(value)}`}
                    style={{ width: `${Math.max(value, 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA or timestamp */}
        <div className="pt-1">
          {!computed ? (
            <div className="space-y-1.5">
              <Button size="sm" className="w-full h-8 text-xs">
                Generate Forge Score
              </Button>
              {onOpenExplainer && (
                <button
                  onClick={onOpenExplainer}
                  className="block w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  How this works
                </button>
              )}
            </div>
          ) : lastScoredAt ? (
            <p className="text-[10px] text-muted-foreground/60">
              Last calculated{" "}
              {new Date(lastScoredAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
