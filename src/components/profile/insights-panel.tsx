import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { generateBuilderInsights } from "@/lib/insights";
import type { Builder, Delivery } from "@/types";

interface Props {
  builder: Builder;
  deliveries: Delivery[];
  stats: {
    totalDeliveries: number;
    verifiedDeliveries: number;
    completedDeliveries: number;
    droppedDeliveries: number;
    completionRate: number;
    totalTeams: number;
  };
}

const trendIcons = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
};

const trendLabels = {
  improving: "Improving",
  stable: "Stable",
  declining: "Declining",
};

export function InsightsPanel({ builder, deliveries, stats }: Props) {
  const insights = generateBuilderInsights({ builder, deliveries, stats });
  const TrendIcon = trendIcons[insights.reliability_trend];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Strengths
            </p>
            <ul className="space-y-1">
              {insights.strengths.map((s, i) => (
                <li key={i} className="text-sm">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          {insights.typical_project_duration && (
            <div>
              <p className="text-xs text-muted-foreground">Typical Duration</p>
              <p className="font-medium">{insights.typical_project_duration}</p>
            </div>
          )}
          {insights.typical_team_size && (
            <div>
              <p className="text-xs text-muted-foreground">Typical Team Size</p>
              <p className="font-medium">
                {insights.typical_team_size} members
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Reliability Trend</p>
            <p className="flex items-center gap-1 font-medium">
              <TrendIcon className="h-3.5 w-3.5" />
              {trendLabels[insights.reliability_trend]}
            </p>
          </div>
        </div>

        {insights.best_collaborator_patterns.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Collaboration Patterns
            </p>
            <ul className="space-y-1">
              {insights.best_collaborator_patterns.map((p, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
