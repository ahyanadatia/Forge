// ─── Builder ─────────────────────────────────────────────────────────────────

export interface Builder {
  id: string;
  email: string;
  username: string | null;
  full_name: string;
  first_name: string;
  middle_names: string | null;
  last_name: string;
  display_name: string | null;
  avatar_url: string | null;
  github_username: string | null;
  role_descriptor: string | null;
  location: string | null;
  bio: string | null;
  availability: BuilderAvailability;
  skills: BuilderSkills;
  university_or_company: string | null;
  primary_stack: string | null;
  secondary_stack: string | null;
  commitment_preferences: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  self_backend: number;
  self_frontend: number;
  self_ml: number;
  self_systems: number;
  self_devops: number;
  ai_backend: number | null;
  ai_frontend: number | null;
  ai_ml: number | null;
  ai_systems: number | null;
  ai_devops: number | null;
  skill_confidence: number;
  skills_last_analyzed: string | null;
  skill_evidence: SkillEvidence | null;
  created_at: string;
  updated_at: string;
}

export type BuilderAvailability =
  | "available"
  | "open_to_opportunities"
  | "busy"
  | "unavailable";

export interface BuilderSkills {
  backend: number;
  frontend: number;
  ml: number;
  systems_design: number;
  devops: number;
}

export interface SkillScores {
  backend: number;
  frontend: number;
  ml: number;
  systems: number;
  devops: number;
}

export interface SkillEvidence {
  backend: string[];
  frontend: string[];
  ml: string[];
  systems: string[];
  devops: string[];
  github_repos_analyzed: number;
  deliveries_analyzed: number;
}

export type SkillConfidenceLevel = "high" | "medium" | "low" | "none";

// ─── Delivery ────────────────────────────────────────────────────────────────

export interface Delivery {
  id: string;
  builder_id: string;
  project_id: string | null;
  title: string;
  description: string;
  role: string;
  stack: string[];
  status: DeliveryStatus;
  deployment_url: string | null;
  repo_url: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  builder?: Builder;
  project?: Project;
  evidence?: Evidence[];
  verification?: Verification;
}

export type DeliveryStatus =
  | "in_progress"
  | "completed"
  | "verified"
  | "dropped";

// ─── Evidence ────────────────────────────────────────────────────────────────

export interface Evidence {
  id: string;
  delivery_id: string;
  evidence_type: EvidenceType;
  value: string;
  metadata: Record<string, unknown>;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export type EvidenceType =
  | "deployment_url"
  | "repo_url"
  | "screenshot"
  | "collaborator_attestation"
  | "timeline_proof"
  | "custom";

// ─── Verification ────────────────────────────────────────────────────────────

export interface Verification {
  id: string;
  delivery_id: string;
  deployment_reachable: boolean | null;
  repo_exists: boolean | null;
  timeline_verified: boolean | null;
  collaborator_confirmed: boolean | null;
  overall_status: VerificationStatus;
  last_checked_at: string;
  created_at: string;
}

export type VerificationStatus = "pending" | "verified" | "partial" | "failed";

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  goals: string[];
  timeline: string;
  hours_per_week: number;
  required_skills: string[];
  team_size: number;
  status: ProjectStatus;
  category: ProjectCategory | null;
  stage: ProjectStage | null;
  tags: string[];
  roles_needed: string[];
  timeline_weeks: number | null;
  hours_per_week_min: number | null;
  hours_per_week_max: number | null;
  team_size_target: number | null;
  created_at: string;
  updated_at: string;
  owner?: Builder;
  applications?: Application[];
  team?: Team;
}

export type ProjectStatus = "draft" | "open" | "full" | "active" | "completed" | "archived";

export type ProjectCategory =
  | "saas"
  | "marketplace"
  | "developer_tool"
  | "ai_ml"
  | "fintech"
  | "healthtech"
  | "edtech"
  | "social"
  | "ecommerce"
  | "data_analytics"
  | "devops_infra"
  | "mobile_app"
  | "web_app"
  | "api_service"
  | "open_source"
  | "other";

export type ProjectStage =
  | "idea"
  | "prototype"
  | "mvp"
  | "beta"
  | "launched"
  | "scaling";

// ─── Application ─────────────────────────────────────────────────────────────

export interface Application {
  id: string;
  project_id: string;
  builder_id: string;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  builder?: Builder;
  project?: Project;
}

export type ApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

// ─── Team ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  members?: TeamMember[];
  tasks?: TeamTask[];
  activity?: ActivityEvent[];
}

export interface TeamMember {
  id: string;
  team_id: string;
  builder_id: string;
  role: string;
  joined_at: string;
  left_at: string | null;
  leave_reason: string | null;
  builder?: Builder;
}

export interface TeamTask {
  id: string;
  team_id: string;
  title: string;
  status: TaskStatus;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: Builder;
}

export type TaskStatus = "todo" | "in_progress" | "done";

export interface ActivityEvent {
  id: string;
  team_id: string;
  actor_id: string;
  event_type: ActivityEventType;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Builder;
}

export type ActivityEventType =
  | "application_received"
  | "member_joined"
  | "member_left"
  | "task_created"
  | "task_completed"
  | "delivery_submitted"
  | "delivery_verified"
  | "invitation_sent";

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface ForgeScore {
  id: string;
  builder_id: string;
  score: number;
  verified_deliveries_component: number;
  reliability_component: number;
  collaboration_component: number;
  consistency_component: number;
  confidence: number;
  effective_score: number;
  computed_at: string;
}

// ─── Insights ────────────────────────────────────────────────────────────────

export interface BuilderInsights {
  builder_id: string;
  strengths: string[];
  typical_project_duration: string | null;
  typical_team_size: number | null;
  best_collaborator_patterns: string[];
  reliability_trend: "improving" | "stable" | "declining";
}

export interface ProjectInsight {
  project_id: string;
  risk_level: "low" | "medium" | "high";
  risk_reasons: string[];
  recommended_team_size: number;
}

// ─── Matching ────────────────────────────────────────────────────────────────

export interface MatchResult {
  builder: Builder;
  score: number;
  explanation: string;
  capability_fit: number;
  reliability_fit: number;
  commitment_fit: number;
  delivery_history_fit: number;
}

// ─── Invitation ─────────────────────────────────────────────────────────────

export interface Invitation {
  id: string;
  project_id: string;
  sender_id: string;
  builder_id: string;
  role: string | null;
  message: string | null;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  sender?: Builder;
  builder?: Builder;
}

export type InvitationStatus = "pending" | "accepted" | "declined" | "expired" | "withdrawn";

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string | null;
  created_at: string;
  participant_1?: Builder;
  participant_2?: Builder;
  last_message?: Message;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: Builder;
}
