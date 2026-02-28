"use client";

import { getConfidenceLabel, getScoreBand } from "@/lib/forge-score";

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
}

const DIMENSIONS = [
  { key: "backend", label: "Backend", angle: -90 },
  { key: "frontend", label: "Frontend", angle: -18 },
  { key: "devops", label: "DevOps", angle: 54 },
  { key: "systems", label: "Systems", angle: 126 },
  { key: "ml", label: "ML", angle: 198 },
] as const;

const CX = 120;
const CY = 120;
const R_MAX = 90;
const RINGS = [25, 50, 75, 100];

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
}

export function StrengthHeatmap({ forgeScore, confidence, dimensions }: Props) {
  const band = getScoreBand(forgeScore);
  const confLabel = getConfidenceLabel(confidence);

  // Build polygon points from dimension values
  const points = DIMENSIONS.map((d) => {
    const value = dimensions[d.key as keyof typeof dimensions] ?? 0;
    const r = (value / 100) * R_MAX;
    return polarToXY(d.angle, r);
  });

  const polygonPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ") + "Z";

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 240" className="w-full max-w-[280px]">
        {/* Background rings */}
        {RINGS.map((pct) => {
          const r = (pct / 100) * R_MAX;
          return (
            <circle
              key={pct}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="currentColor"
              className="text-border"
              strokeWidth={pct === 100 ? 1 : 0.5}
              strokeDasharray={pct < 100 ? "2 3" : undefined}
            />
          );
        })}

        {/* Axis lines */}
        {DIMENSIONS.map((d) => {
          const [x, y] = polarToXY(d.angle, R_MAX);
          return (
            <line
              key={d.key}
              x1={CX}
              y1={CY}
              x2={x}
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Filled polygon */}
        <path
          d={polygonPath}
          fill="currentColor"
          className="text-primary/15"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          style={{ color: "hsl(var(--primary))" }}
        />

        {/* Data points */}
        {points.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill="currentColor"
            className="text-primary"
          />
        ))}

        {/* Labels */}
        {DIMENSIONS.map((d) => {
          const [x, y] = polarToXY(d.angle, R_MAX + 16);
          const value = dimensions[d.key as keyof typeof dimensions] ?? 0;
          return (
            <text
              key={d.key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground"
              fontSize={9}
              fontWeight={500}
            >
              {d.label} ({value})
            </text>
          );
        })}

        {/* Center score */}
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground"
          fontSize={28}
          fontWeight={700}
        >
          {forgeScore}
        </text>
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground"
          fontSize={9}
        >
          Execution Credibility
        </text>
      </svg>

      <div className="flex items-center gap-3 mt-1 text-sm">
        <span className="font-medium">{band}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{confLabel} confidence</span>
      </div>
    </div>
  );
}
