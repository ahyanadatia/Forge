"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Target, GitBranch, ArrowUpRight } from "lucide-react";
import { formatStatValue } from "@/lib/score/format";
import { getImprovementSuggestions } from "@/lib/score/interpretation";

interface Props {
  forgeScore: number;
  confidence: number;
  trust: {
    deliverySuccess: number;
    reliability: number;
    quality: number;
    consistency: number;
  };
  stats: {
    verifiedDeliveries: number;
    totalDeliveries: number;
    completionRate: number;
    totalTeams: number;
  };
  skills: Record<string, number>;
  hasDeliveries: boolean;
  hasGithub: boolean;
}

export function ProfileInsightsCard({
  forgeScore,
  confidence,
  trust,
  stats,
  skills,
  hasDeliveries,
  hasGithub,
}: Props) {
  const computed = forgeScore > 0;
  const suggestions = getImprovementSuggestions(skills, trust, hasDeliveries, hasGithub);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Insights</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-5">
        {/* What this reflects */}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Derived from verified deliveries, reliability outcomes, and evidence signals.
        </p>

        {/* Top signals */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            Top signals
          </h4>
          <div className="space-y-1.5">
            <SignalRow
              icon={CheckCircle2}
              label="Verified deliveries"
              value={formatStatValue(stats.verifiedDeliveries)}
            />
            <SignalRow
              icon={GitBranch}
              label="Team projects"
              value={formatStatValue(stats.totalTeams)}
            />
            <SignalRow
              icon={Target}
              label="Completion rate"
              value={formatStatValue(stats.completionRate, "%")}
            />
          </div>
        </div>

        {/* Next actions */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            {computed ? "Next improvements" : "Get started"}
          </h4>
          <ul className="space-y-1.5">
            {suggestions.slice(0, 2).map((s, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] text-muted-foreground leading-snug">
                <ArrowUpRight className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground/50" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

function SignalRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3 text-muted-foreground/50" />
        {label}
      </div>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
