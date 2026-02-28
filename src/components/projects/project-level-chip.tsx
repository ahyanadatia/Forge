import { Badge } from "@/components/ui/badge";
import type { ProjectLevel } from "@/lib/matching/project-level";

const LEVEL_STYLES: Record<ProjectLevel, string> = {
  0: "bg-zinc-100 text-zinc-600 border-zinc-200",
  1: "bg-blue-50 text-blue-700 border-blue-200",
  2: "bg-violet-50 text-violet-700 border-violet-200",
  3: "bg-emerald-50 text-emerald-700 border-emerald-200",
  4: "bg-amber-50 text-amber-700 border-amber-200",
};

const LEVEL_LABELS: Record<ProjectLevel, string> = {
  0: "L0 Draft",
  1: "L1 Defined",
  2: "L2 Validated",
  3: "L3 Team Formed",
  4: "L4 Shipping",
};

interface Props {
  level: ProjectLevel;
  className?: string;
}

export function ProjectLevelChip({ level, className }: Props) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${LEVEL_STYLES[level]} ${className ?? ""}`}
    >
      {LEVEL_LABELS[level]}
    </Badge>
  );
}
