import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getScoreBand, getConfidenceLabel } from "@/lib/forge-score";

interface Props {
  forgeScore: number;
  confidence: number;
  deliverySuccess: number;
  reliability: number;
  deliveryQuality: number;
  consistency: number;
  lastScoredAt?: string | null;
}

const DIMENSIONS = [
  { key: "deliverySuccess", label: "Delivery Success", weight: "45%" },
  { key: "reliability", label: "Reliability", weight: "30%" },
  { key: "deliveryQuality", label: "Delivery Quality", weight: "15%" },
  { key: "consistency", label: "Consistency", weight: "10%" },
] as const;

export function ForgeScoreBreakdown({
  forgeScore,
  confidence,
  deliverySuccess,
  reliability,
  deliveryQuality,
  consistency,
  lastScoredAt,
}: Props) {
  const band = getScoreBand(forgeScore);
  const confLabel = getConfidenceLabel(confidence);

  const scores: Record<string, number> = {
    deliverySuccess,
    reliability,
    deliveryQuality,
    consistency,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Forge Score</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {confLabel} confidence
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Score display */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums tracking-tight">
            {forgeScore}
          </span>
          <span className="text-sm text-muted-foreground">/1000</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {band}
          </Badge>
        </div>

        {/* Dimensions */}
        <div className="space-y-3">
          {DIMENSIONS.map(({ key, label, weight }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {label}
                  <span className="ml-1 text-xs opacity-60">({weight})</span>
                </span>
                <span className="font-medium tabular-nums">{scores[key]}</span>
              </div>
              <Progress value={scores[key]} className="h-1.5" />
            </div>
          ))}
        </div>

        {lastScoredAt && (
          <p className="text-xs text-muted-foreground pt-1">
            Last calculated{" "}
            {new Date(lastScoredAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
