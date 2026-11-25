import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  describeAnomaly,
  focusDimension,
  type V3HistoryPoint,
  type V3ScoreView,
} from "@/lib/score/v3-view";
import { RecomputeV3Button } from "./recompute-v3-button";

const MIN = 100;
const MAX = 999;

function ScoreGauge({ score }: { score: number }) {
  // A 240° arc; the filled part is proportional to where the score sits in 100-999.
  const r = 52;
  const c = 2 * Math.PI * r;
  const arc = c * (240 / 360);
  const filled = arc * ((score - MIN) / (MAX - MIN));
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label={`Forge Score ${score} out of ${MAX}`}>
      <g transform="rotate(150 60 60)">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--brand))" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${filled} ${c}`} />
      </g>
      <text x="60" y="64" textAnchor="middle" className="fill-foreground tabular" style={{ fontSize: 30, fontWeight: 700 }}>
        {score}
      </text>
      <text x="60" y="82" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9, letterSpacing: 1 }}>
        OF {MAX}
      </text>
    </svg>
  );
}

function Sparkline({ points }: { points: V3HistoryPoint[] }) {
  if (points.length < 2) return null;
  const w = 160;
  const h = 36;
  const scores = points.map((p) => p.score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const span = Math.max(1, hi - lo);
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * w).toFixed(1)},${(h - 4 - ((p.score - lo) / span) * (h - 8)).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-40" role="img" aria-label={`Score history: ${scores.join(", ")}`}>
      <path d={d} fill="none" stroke="hsl(var(--brand))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  view: V3ScoreView | null;
  history?: V3HistoryPoint[];
  isOwner: boolean;
  className?: string;
}

export function ForgeScoreV3Card({ view, history = [], isOwner, className }: Props) {
  if (!view) {
    return (
      <Card className={cn("overflow-hidden", className)} data-tour="forge-score">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
            <Sparkles className="h-6 w-6 text-brand" aria-hidden />
          </div>
          <div className="flex-1 space-y-1">
            <h2 className="font-semibold">No Forge Score yet</h2>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "The score is built from evidence: log a delivery with a live URL and a GitHub repo, verify it, then compute."
                : "This builder hasn't built up enough verified evidence for a score yet."}
            </p>
          </div>
          {isOwner && <RecomputeV3Button label="Compute my score" />}
        </CardContent>
      </Card>
    );
  }

  const focus = focusDimension(view);

  return (
    <Card className={cn("overflow-hidden", className)} data-tour="forge-score">
      <CardContent className="grid gap-6 p-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <ScoreGauge score={view.score} />
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-medium text-brand">{view.band}</span>
            {view.delta != null && view.delta !== 0 && (
              <span className={cn("inline-flex items-center tabular", view.delta > 0 ? "text-success" : "text-destructive")}>
                {view.delta > 0 ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />}
                {Math.abs(view.delta)}
                <span className="sr-only">{view.delta > 0 ? "points up" : "points down"} since last compute</span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {view.confidenceLabel} confidence · {view.confidence}%
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Forge Score</h2>
              <p className="text-sm text-muted-foreground">
                {view.nextBand
                  ? `${view.nextBand.pointsAway} points to ${view.nextBand.band}. Biggest lever: ${focus.label.toLowerCase()}.`
                  : `Top band. Keep shipping to hold it: scores decay after 60 days without new evidence.`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Sparkline points={history} />
              {isOwner && <RecomputeV3Button />}
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {view.dimensions.map((d) => (
              <li key={d.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{d.label}</span>
                  <span className="tabular text-muted-foreground">
                    {d.value}
                    <span className="text-xs"> · {Math.round(d.weight * 100)}%</span>
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={d.label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={d.value}
                >
                  <div
                    className={cn("h-full rounded-full", d.key === focus.key ? "bg-brand/60" : "bg-brand")}
                    style={{ width: `${Math.max(2, d.value)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{d.description}</p>
              </li>
            ))}
          </ul>

          {isOwner && view.anomalyFlags.length > 0 && (
            <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <div>
                <p className="font-medium">
                  Integrity check applied{view.multiplier != null ? ` (×${view.multiplier.toFixed(2)})` : ""}
                </p>
                <ul className="text-muted-foreground">
                  {view.anomalyFlags.map((f) => (
                    <li key={f}>{describeAnomaly(f)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {[
              view.computedAt && `Computed ${formatDistanceToNow(new Date(view.computedAt), { addSuffix: true })}`,
              view.modelVersion && `model ${view.modelVersion}`,
              view.tenureMonths != null && `${view.tenureMonths} months of history`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
