import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BuilderSkills } from "@/types";

interface Props {
  skills: BuilderSkills;
}

const skillLabels: Record<keyof BuilderSkills, string> = {
  backend: "Backend",
  frontend: "Frontend",
  ml: "ML / AI",
  systems_design: "Systems Design",
  devops: "DevOps",
};

export function SkillsHeatmap({ skills }: Props) {
  const entries = Object.entries(skillLabels) as [keyof BuilderSkills, string][];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">
          Skills Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {entries.map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium tabular-nums">
                {skills[key]}
              </span>
            </div>
            <Progress value={skills[key]} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
