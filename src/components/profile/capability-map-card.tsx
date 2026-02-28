"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatScore, formatConfidence, formatBand, isScoreComputed, safeSkillValue } from "@/lib/score/format";
import { interpretDimension, getEvidenceCoverage, type DimensionStatus } from "@/lib/score/interpretation";
import { Info } from "lucide-react";

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
  onOpenExplainer?: () => void;
}

const SKILL_AXES = [
  { key: "backend", label: "Backend", angle: -90 },
  { key: "frontend", label: "Frontend", angle: -18 },
  { key: "devops", label: "DevOps", angle: 54 },
  { key: "systems", label: "Systems", angle: 126 },
  { key: "ml", label: "ML / AI", angle: 198 },
] as const;

const CX = 130;
const CY = 130;
const R_MAX = 92;
const RING_LEVELS = [20, 40, 60, 80, 100];

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

export function CapabilityMapCard({ forgeScore, confidence, dimensions, onOpenExplainer }: Props) {
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
  const computed = isScoreComputed(forgeScore);
  const scoreDisplay = formatScore(forgeScore);
  const confDisplay = formatConfidence(confidence);
  const coverage = getEvidenceCoverage(dimensions);

  const skillStatuses: (DimensionStatus & { key: string; angle: number })[] = SKILL_AXES.map((d) => ({
    ...interpretDimension(safeSkillValue(dimensions[d.key as keyof typeof dimensions]), d.label),
    key: d.key,
    angle: d.angle,
  }));

  const hasAnyData = skillStatuses.some((s) => s.hasEvidence);

  const points = skillStatuses.map((s) => {
    const r = (s.value / 100) * R_MAX;
    return polarToXY(s.angle, r);
  });

  const polygonPath = hasAnyData
    ? points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z"
    : "";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capability Map
            </CardTitle>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Skills derived from verified evidence
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 cursor-help">
                  <Info className="h-3 w-3" />
                  {coverage}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px] text-xs">
                Evidence coverage reflects how many skill areas have verified data.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col items-center justify-center px-4 pb-4">
        <svg viewBox="0 0 260 260" className="w-full max-w-[260px]">
          {/* Rings */}
          {RING_LEVELS.map((pct) => {
            const r = (pct / 100) * R_MAX;
            return (
              <circle
                key={pct}
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke="currentColor"
                className="text-border/40"
                strokeWidth={pct === 100 ? 0.75 : 0.4}
                strokeDasharray={pct < 100 ? "1.5 3.5" : undefined}
              />
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
                className="text-border/30"
                strokeWidth={0.4}
              />
            );
          })}

          {/* Empty-state outline */}
          {!hasAnyData && (
            <polygon
              points={SKILL_AXES.map((d) => {
                const [x, y] = polarToXY(d.angle, R_MAX * 0.12);
                return `${x},${y}`;
              }).join(" ")}
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground/20"
              strokeWidth={0.75}
              strokeDasharray="2 3"
            />
          )}

          {/* Data polygon */}
          {hasAnyData && (
            <path
              d={polygonPath}
              fill="currentColor"
              className="text-primary/8"
              stroke="currentColor"
              strokeWidth={1.25}
              strokeLinejoin="round"
              style={{ color: "hsl(var(--primary))" }}
            />
          )}

          {/* Data dots */}
          {hasAnyData &&
            points.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={hoveredAxis === skillStatuses[i].key ? 3.5 : 2}
                fill="currentColor"
                className="text-primary transition-all"
              />
            ))}

          {/* Labels */}
          {skillStatuses.map((s) => {
            const [x, y] = polarToXY(s.angle, R_MAX + 20);
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
                  className={isHovered ? "fill-foreground" : "fill-muted-foreground/70"}
                  fontSize={8.5}
                  fontWeight={isHovered ? 600 : 400}
                >
                  {s.label}
                </text>
                {isHovered && s.hasEvidence && (
                  <text
                    x={x}
                    y={y + 11}
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

          {/* Center */}
          {computed ? (
            <>
              <text
                x={CX}
                y={CY - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                fontSize={24}
                fontWeight={700}
                letterSpacing="-0.02em"
              >
                {scoreDisplay}
              </text>
              <text
                x={CX}
                y={CY + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground/50"
                fontSize={7}
                fontWeight={400}
                letterSpacing="0.05em"
              >
                EXECUTION CREDIBILITY
              </text>
            </>
          ) : (
            <>
              <text
                x={CX}
                y={CY - 3}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground/60"
                fontSize={9}
                fontWeight={500}
              >
                Not calculated
              </text>
              <text
                x={CX}
                y={CY + 10}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground/40"
                fontSize={7}
                letterSpacing="0.05em"
              >
                EXECUTION CREDIBILITY
              </text>
            </>
          )}
        </svg>

        {/* Under radar */}
        <div className="flex items-center justify-center gap-2 mt-1 text-[10px]">
          {computed && formatBand(forgeScore) && (
            <>
              <span className="font-medium text-muted-foreground">{formatBand(forgeScore)}</span>
              <span className="text-muted-foreground/30">·</span>
            </>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground/60 cursor-help">
                  Confidence: {confDisplay}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px] text-xs">
                Confidence increases as you add verified evidence — deliveries, collaborators, and completed projects.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {onOpenExplainer && (
          <button
            onClick={onOpenExplainer}
            className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors mt-1"
          >
            Learn more
          </button>
        )}
      </CardContent>
    </Card>
  );
}
