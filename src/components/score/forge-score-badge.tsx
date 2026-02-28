import { Badge } from "@/components/ui/badge";
import { getScoreBand, getConfidenceLabel } from "@/lib/forge-score";

interface Props {
  score: number;
  confidence: number;
  size?: "sm" | "md" | "lg";
}

const bandColors: Record<string, string> = {
  Elite: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Strong: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Proven: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Developing: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  New: "bg-muted text-muted-foreground border-border",
};

export function ForgeScoreBadge({ score, confidence, size = "md" }: Props) {
  const band = getScoreBand(score);
  const confLabel = getConfidenceLabel(confidence);

  if (size === "sm") {
    return (
      <Badge variant="outline" className={`font-mono tabular-nums text-xs ${bandColors[band]}`}>
        {score}
      </Badge>
    );
  }

  if (size === "lg") {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tabular-nums tracking-tight">
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/1000</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <Badge variant="outline" className={`text-xs ${bandColors[band]}`}>
            {band}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {confLabel} confidence
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-lg font-bold tabular-nums">{score}</span>
      <Badge variant="outline" className={`text-xs ${bandColors[band]}`}>
        {band}
      </Badge>
    </div>
  );
}
