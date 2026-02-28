/**
 * Project Maturity Level — computed server-side from project state.
 *
 * L0 Draft         — Missing roles or timeline or hours
 * L1 Defined       — Roles + timeline + hours + skills defined
 * L2 Validated     — Milestones/tasks exist
 * L3 Team Formed   — 2+ accepted members
 * L4 Shipping      — Delivery activity exists
 */

export type ProjectLevel = 0 | 1 | 2 | 3 | 4;

export interface ProjectLevelInput {
  roles_needed: string[];
  timeline: string | null;
  timeline_weeks: number | null;
  hours_per_week: number | null;
  required_skills: string[];
  has_tasks: boolean;
  accepted_member_count: number;
  has_delivery_activity: boolean;
}

export interface ProjectLevelOutput {
  level: ProjectLevel;
  label: string;
  shortLabel: string;
  hint: string | null;
}

const LEVEL_CONFIG: Record<ProjectLevel, { label: string; shortLabel: string }> = {
  0: { label: "Draft", shortLabel: "L0" },
  1: { label: "Defined", shortLabel: "L1" },
  2: { label: "Validated Plan", shortLabel: "L2" },
  3: { label: "Team Formed", shortLabel: "L3" },
  4: { label: "Shipping", shortLabel: "L4" },
};

export function computeProjectLevel(input: ProjectLevelInput): ProjectLevelOutput {
  let level: ProjectLevel = 0;
  let hint: string | null = null;

  const hasRoles = input.roles_needed.length > 0;
  const hasTimeline = !!input.timeline || input.timeline_weeks != null;
  const hasHours = input.hours_per_week != null && input.hours_per_week > 0;
  const hasSkills = input.required_skills.length > 0;

  if (hasRoles && hasTimeline && hasHours && hasSkills) {
    level = 1;
  } else {
    const missing: string[] = [];
    if (!hasRoles) missing.push("roles");
    if (!hasTimeline) missing.push("timeline");
    if (!hasHours) missing.push("hours/week");
    if (!hasSkills) missing.push("skills");
    hint = `Add ${missing.join(" and ")} to increase project visibility.`;
  }

  if (level >= 1 && input.has_tasks) {
    level = 2;
  }

  if (level >= 1 && input.accepted_member_count >= 2) {
    level = 3;
  }

  if (level >= 1 && input.has_delivery_activity) {
    level = 4;
  }

  if (level === 1) {
    hint = "Add milestones or tasks to reach Validated Plan status.";
  }

  const config = LEVEL_CONFIG[level];
  return {
    level,
    label: config.label,
    shortLabel: config.shortLabel,
    hint,
  };
}

export function getProjectLevelLabel(level: ProjectLevel): string {
  return `${LEVEL_CONFIG[level].shortLabel} ${LEVEL_CONFIG[level].label}`;
}
