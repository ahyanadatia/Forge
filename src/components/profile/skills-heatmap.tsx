import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { computeFinalSkills, getConfidenceLevel, hasAiSkills } from "@/lib/skills";
import type { Builder, SkillEvidence } from "@/types";

interface Props {
  builder: Builder;
}

const SKILL_LABELS: { key: keyof ReturnType<typeof computeFinalSkills>; label: string }[] = [
  { key: "backend", label: "Backend" },
  { key: "frontend", label: "Frontend" },
  { key: "ml", label: "ML / AI" },
  { key: "systems", label: "Systems Design" },
  { key: "devops", label: "DevOps" },
];

const EVIDENCE_KEYS: { key: keyof Omit<SkillEvidence, "github_repos_analyzed" | "deliveries_analyzed">; label: string }[] = [
  { key: "backend", label: "Backend" },
  { key: "frontend", label: "Frontend" },
  { key: "ml", label: "ML / AI" },
  { key: "systems", label: "Systems Design" },
  { key: "devops", label: "DevOps" },
];

export function SkillsHeatmap({ builder }: Props) {
  const final = computeFinalSkills(builder);
  const aiAnalyzed = hasAiSkills(builder);
  const confidenceLevel = getConfidenceLevel(builder.skill_confidence);
  const evidence = builder.skill_evidence;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              Skills Profile
            </CardTitle>
            <div className="flex items-center gap-2">
              {aiAnalyzed && confidenceLevel !== "none" && (
                <Badge variant="outline" className="text-xs capitalize">
                  {confidenceLevel} confidence
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {aiAnalyzed ? "Self + AI Analysis" : "Self-Assessment"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {SKILL_LABELS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-medium tabular-nums">
                  {final[key]}
                </span>
              </div>
              <Progress value={final[key]} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Evidence Transparency Panel */}
      {evidence && aiAnalyzed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              Skill Evidence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{evidence.github_repos_analyzed} repos analyzed</span>
              <span>{evidence.deliveries_analyzed} deliveries analyzed</span>
            </div>
            {EVIDENCE_KEYS.map(({ key, label }) => {
              const items = evidence[key];
              if (!items || items.length === 0) return null;
              return (
                <div key={key} className="space-y-1">
                  <p className="text-sm font-medium">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
