import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ForgeScore } from "@/types";

interface Props {
  forgeScore: ForgeScore | null;
  stats: {
    verifiedDeliveries: number;
    completionRate: number;
  };
}

export function TrustHeatmap({ forgeScore, stats }: Props) {
  const bars = [
    {
      label: "Verified Deliveries",
      value: forgeScore
        ? Math.round((forgeScore.verified_deliveries_component / 1000) * 100)
        : Math.min(stats.verifiedDeliveries * 10, 100),
    },
    {
      label: "Reliability",
      value: forgeScore
        ? Math.round((forgeScore.reliability_component / 1000) * 100)
        : stats.completionRate,
    },
    {
      label: "Collaboration",
      value: forgeScore
        ? Math.round((forgeScore.collaboration_component / 1000) * 100)
        : 0,
    },
    {
      label: "Consistency",
      value: forgeScore
        ? Math.round((forgeScore.consistency_component / 1000) * 100)
        : 0,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Trust Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bars.map((bar) => (
          <div key={bar.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {bar.label}
              </span>
              <span className="text-sm font-medium tabular-nums">
                {bar.value}%
              </span>
            </div>
            <Progress value={bar.value} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
