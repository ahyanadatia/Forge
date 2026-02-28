import type { ProjectCategory, ProjectStage } from "@/types";

export const PROJECT_CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: "saas", label: "SaaS" },
  { value: "marketplace", label: "Marketplace" },
  { value: "developer_tool", label: "Developer Tool" },
  { value: "ai_ml", label: "AI / ML" },
  { value: "fintech", label: "Fintech" },
  { value: "healthtech", label: "Healthtech" },
  { value: "edtech", label: "Edtech" },
  { value: "social", label: "Social" },
  { value: "ecommerce", label: "E-Commerce" },
  { value: "data_analytics", label: "Data & Analytics" },
  { value: "devops_infra", label: "DevOps / Infra" },
  { value: "mobile_app", label: "Mobile App" },
  { value: "web_app", label: "Web App" },
  { value: "api_service", label: "API / Service" },
  { value: "open_source", label: "Open Source" },
  { value: "other", label: "Other" },
];

export const PROJECT_STAGES: { value: ProjectStage; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "prototype", label: "Prototype" },
  { value: "mvp", label: "MVP" },
  { value: "beta", label: "Beta" },
  { value: "launched", label: "Launched" },
  { value: "scaling", label: "Scaling" },
];

export const COMMON_ROLES = [
  "Backend Engineer",
  "Frontend Engineer",
  "Full-Stack Engineer",
  "ML Engineer",
  "Designer",
  "Product Manager",
  "DevOps Engineer",
  "Mobile Developer",
  "Data Engineer",
  "QA Engineer",
];

export function getCategoryLabel(value: string): string {
  return PROJECT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function getStageLabel(value: string): string {
  return PROJECT_STAGES.find((s) => s.value === value)?.label ?? value;
}
