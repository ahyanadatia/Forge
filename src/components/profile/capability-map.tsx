"use client";

import { useState } from "react";
import {
  interpretDimension,
  getEvidenceCoverage,
  getScoreState,
  getTopStrengths,
  getImprovementSuggestions,
  type DimensionStatus,
} from "@/lib/score/interpretation";
import { getScoreBand, getConfidenceLabel } from "@/lib/forge-score";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, ArrowUpRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  forgeScore: number;
  confidence: number;
  dimensions: {
    backend: number;
    frontend: number;
    ml: number;
    systems: number;
    devops: number;
  };
  trust: {
    deliverySuccess: number;
    reliability: number;
    quality: number;
    consistency: number;
  };
  hasDeliveries?: boolean;
  hasGithub?: boolean;
  onGenerateScore?: () => void;
  onOpenExplainer?: () => void;
}

const SKILL_AXES = [
  { key: "backend", label: "Backend", angle: -90 },
  { key: "frontend", label: "Frontend", angle: -18 },
  { key: "devops", label: "DevOps", angle: 54 },
  { key: "systems", label: "Systems", angle: 126 },
  { key: "ml", label: "ML / AI", angle: 198 },
] as const;

const CX = 140;
const CY = 140;
const R_MAX = 100;
const RING_LEVELS = [20, 40, 60, 80, 100];

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

export function CapabilityMap({
  forgeScore,
  confidence,
  dimensions,
  trust,
  hasDeliveries = false,
  hasGithub = false,
  onGenerateScore,
  onOpenExplainer,
}: Props) {
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);

  const scoreState = getScoreState(forgeScore, confidence);
  const band = getScoreBand(forgeScore);
  const confLabel = getConfidenceLabel(confidence);
  const coverage = getEvidenceCoverage(dimensions);

  const skillStatuses: (DimensionStatus & { key: string; angle: number })[] = SKILL_AXES.map((d) => ({
    ...interpretDimension(dimensions[d.key as keyof typeof dimensions], d.label),
    key: d.key,
    angle: d.angle,
  }));

  const topStrengths = getTopStrengths(
    skillStatuses.map((s) => ({ key: s.key, label: s.label, value: s.value }))
  );

  const suggestions = getImprovementSuggestions(
    dimensions,
    trust,
    hasDeliveries,
    hasGithub
  );

  const points = skillStatuses.map((s) => {
    const r = (s.value / 100) * R_MAX;
    return polarToXY(s.angle, r);
  });

  const hasAnyData = skillStatuses.some((s) => s.hasEvidence);
  const polygonPath =
    hasAnyData
      ? points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z"
      : "";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Strength Map</h3>
          <p className="text-xs text-muted-foreground">Skills derived from verified evidence</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                <Info className="h-3 w-3" />
                Coverage: {coverage}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[200px] text-xs">
              Evidence coverage reflects how many skill areas have verified data.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Radar */}
        <div className="flex-shrink-0">
          <svg viewBox="0 0 280 280" className="w-full max-w-[280px] mx-auto">
            {/* Ring levels */}
            {RING_LEVELS.map((pct) => {
              const r = (pct / 100) * R_MAX;
              return (
                <g key={pct}>
                  <circle
                    cx={CX}
                    cy={CY}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    className="text-border/50"
                    strokeWidth={pct === 100 ? 0.75 : 0.5}
                    strokeDasharray={pct < 100 ? "2 4" : undefined}
                  />
                  {pct < 100 && (
                    <text
                      x={CX + r + 2}
                      y={CY - 2}
                      className="fill-muted-foreground/40"
                      fontSize={7}
                    >
                      {pct}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Axis lines */}
            {skillStatuses.map((s) => {
              const [x, y] = polarToXY(s.angle, R_MAX);
              return (
                <line
                  key={s.key}
                  x1={CX}
                  y1={CY}
                  x2={x}
                  y2={y}
                  stroke="currentColor"
                  className="text-border/40"
                  strokeWidth={0.5}
                />
              );
            })}

            {/* Placeholder outline for no-data state */}
            {!hasAnyData && (
              <polygon
                points={SKILL_AXES.map((d) => {
                  const [x, y] = polarToXY(d.angle, R_MAX * 0.15);
                  return `${x},${y}`;
                }).join(" ")}
                fill="currentColor"
                className="text-muted/20"
                stroke="currentColor"
                strokeWidth={1}
                strokeDasharray="3 3"
                style={{ color: "hsl(var(--muted-foreground))" }}
              />
            )}

            {/* Filled polygon */}
            {hasAnyData && (
              <path
                d={polygonPath}
                fill="currentColor"
                className="text-primary/10"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinejoin="round"
                style={{ color: "hsl(var(--primary))" }}
              />
            )}

            {/* Data points */}
            {hasAnyData &&
              points.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={hoveredAxis === skillStatuses[i].key ? 4 : 2.5}
                  fill="currentColor"
                  className="text-primary transition-all"
                />
              ))}

            {/* Axis labels */}
            {skillStatuses.map((s) => {
              const [x, y] = polarToXY(s.angle, R_MAX + 22);
              const isHovered = hoveredAxis === s.key;
              return (
                <g
                  key={s.key}
                  onMouseEnter={() => setHoveredAxis(s.key)}
                  onMouseLeave={() => setHoveredAxis(null)}
                  className="cursor-default"
                >
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={isHovered ? "fill-foreground" : "fill-muted-foreground"}
                    fontSize={9}
                    fontWeight={isHovered ? 600 : 500}
                  >
                    {s.label}
                  </text>
                  {isHovered && s.hasEvidence && (
                    <text
                      x={x}
                      y={y + 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground"
                      fontSize={8}
                      fontWeight={600}
                    >
                      {s.value}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Center score */}
            {scoreState === "none" ? (
              <>
                <text
                  x={CX}
                  y={CY - 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  fontSize={10}
                  fontWeight={500}
                >
                  Not calculated
                </text>
                <text
                  x={CX}
                  y={CY + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground/60"
                  fontSize={8}
                >
                  Execution Credibility
                </text>
              </>
            ) : (
              <>
                <text
                  x={CX}
                  y={CY - 8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-foreground"
                  fontSize={26}
                  fontWeight={700}
                >
                  {forgeScore}
                </text>
                <text
                  x={CX}
                  y={CY + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-muted-foreground"
                  fontSize={8}
                >
                  Execution Credibility
                </text>
              </>
            )}
          </svg>

          {/* Under-radar info */}
          <div className="flex items-center justify-center gap-3 mt-1 text-xs">
            {scoreState !== "none" && (
              <>
                <span className="font-medium">{band}</span>
                <span className="text-muted-foreground">·</span>
              </>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground cursor-help">
                    Confidence: {scoreState === "none" ? "—" : confLabel}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-xs">
                  Confidence rises with more verified evidence — deliveries, collaborators, and completed projects.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {scoreState === "partial" && (
            <p className="text-xs text-muted-foreground text-center mt-2 max-w-[260px] mx-auto">
              Early estimate. Add verified deliveries to increase accuracy.
            </p>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* CTA for new users */}
          {scoreState === "none" && onGenerateScore && (
            <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
              <p className="text-sm font-medium">Generate your Forge Score</p>
              <p className="text-xs text-muted-foreground">
                Get an initial credibility estimate based on your evidence.
              </p>
              <Button size="sm" onClick={onGenerateScore}>
                Generate now
              </Button>
              {onOpenExplainer && (
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={onOpenExplainer}
                >
                  How Forge Score works
                </Button>
              )}
            </div>
          )}

          {/* What this reflects */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              What this reflects
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Derived from verified deliveries, reliability outcomes, and evidence signals.
            </p>
          </div>

          {/* Key Metrics */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Skill Breakdown
            </h4>
            <div className="space-y-1.5">
              {skillStatuses.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between text-xs"
                  onMouseEnter={() => setHoveredAxis(s.key)}
                  onMouseLeave={() => setHoveredAxis(null)}
                >
                  <span className={hoveredAxis === s.key ? "font-medium" : "text-muted-foreground"}>
                    {s.label}
                  </span>
                  <span className={s.hasEvidence ? "font-medium tabular-nums" : "text-muted-foreground"}>
                    {s.displayValue}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top strengths */}
          {topStrengths.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Top Strengths
              </h4>
              <div className="space-y-1">
                {topStrengths.map((s) => (
                  <div key={s.dimension} className="flex items-center gap-1.5 text-xs">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="font-medium">{s.dimension}</span>
                    <span className="text-muted-foreground tabular-nums">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to improve */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Next Improvements
            </h4>
            <ul className="space-y-1">
              {suggestions.map((s, i) => (
                <li key={i} className="flex gap-1.5 text-xs text-muted-foreground">
                  <ArrowUpRight className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
