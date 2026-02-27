-- ============================================================================
-- FORGE: Complete Database Schema
-- Execution identity platform for builders
-- ============================================================================

-- ─── CLEAN SLATE ─────────────────────────────────────────────────────────────
-- Drop functions first (CASCADE removes their triggers automatically)

DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_message() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.forge_scores CASCADE;
DROP TABLE IF EXISTS public.activity_events CASCADE;
DROP TABLE IF EXISTS public.team_tasks CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.verifications CASCADE;
DROP TABLE IF EXISTS public.evidence CASCADE;
DROP TABLE IF EXISTS public.deliveries CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.builders CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: CREATE ALL TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── BUILDERS ────────────────────────────────────────────────────────────────

CREATE TABLE public.builders (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 120),
  avatar_url text,
  github_username text,
  role_descriptor text CHECK (role_descriptor IS NULL OR char_length(role_descriptor) <= 120),
  location text,
  bio text CHECK (bio IS NULL OR char_length(bio) <= 2000),
  availability text NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available', 'open_to_opportunities', 'busy', 'unavailable')),
  skills jsonb NOT NULL DEFAULT '{"backend":0,"frontend":0,"ml":0,"systems_design":0,"devops":0}',
  website_url text,
  linkedin_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── PROJECTS ────────────────────────────────────────────────────────────────

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  goals text[] NOT NULL DEFAULT '{}',
  timeline text NOT NULL,
  hours_per_week integer NOT NULL CHECK (hours_per_week BETWEEN 1 AND 80),
  required_skills text[] NOT NULL DEFAULT '{}',
  team_size integer NOT NULL DEFAULT 4 CHECK (team_size BETWEEN 1 AND 20),
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── DELIVERIES ──────────────────────────────────────────────────────────────

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 5000),
  role text NOT NULL CHECK (char_length(role) BETWEEN 1 AND 120),
  stack text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'verified', 'dropped')),
  deployment_url text,
  repo_url text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── EVIDENCE ────────────────────────────────────────────────────────────────

CREATE TABLE public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  evidence_type text NOT NULL
    CHECK (evidence_type IN ('deployment_url', 'repo_url', 'screenshot', 'collaborator_attestation', 'timeline_proof', 'custom')),
  value text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── VERIFICATIONS ───────────────────────────────────────────────────────────

CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL UNIQUE REFERENCES public.deliveries(id) ON DELETE CASCADE,
  deployment_reachable boolean,
  repo_exists boolean,
  timeline_verified boolean,
  collaborator_confirmed boolean,
  overall_status text NOT NULL DEFAULT 'pending'
    CHECK (overall_status IN ('pending', 'verified', 'partial', 'failed')),
  last_checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── APPLICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, builder_id)
);

-- ─── TEAMS ───────────────────────────────────────────────────────────────────

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── TEAM MEMBERS ────────────────────────────────────────────────────────────

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, builder_id)
);

-- ─── TEAM TASKS ──────────────────────────────────────────────────────────────

CREATE TABLE public.team_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'in_progress', 'done')),
  owner_id uuid REFERENCES public.builders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── ACTIVITY EVENTS ─────────────────────────────────────────────────────────

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'application_received', 'member_joined', 'member_left',
      'task_created', 'task_completed', 'delivery_submitted',
      'delivery_verified', 'invitation_sent'
    )),
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── FORGE SCORES ────────────────────────────────────────────────────────────

CREATE TABLE public.forge_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL UNIQUE REFERENCES public.builders(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 1000),
  verified_deliveries_component integer NOT NULL DEFAULT 0,
  reliability_component integer NOT NULL DEFAULT 0,
  collaboration_component integer NOT NULL DEFAULT 0,
  consistency_component integer NOT NULL DEFAULT 0,
  confidence integer NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  effective_score integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- ─── CONVERSATIONS ───────────────────────────────────────────────────────────

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  participant_2_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_1_id, participant_2_id),
  CHECK (participant_1_id < participant_2_id)
);

-- ─── MESSAGES ────────────────────────────────────────────────────────────────

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX idx_builders_availability ON public.builders(availability);
CREATE INDEX idx_builders_github ON public.builders(github_username);
CREATE INDEX idx_builders_skills ON public.builders USING gin(skills);

CREATE INDEX idx_projects_owner ON public.projects(owner_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_skills ON public.projects USING gin(required_skills);
CREATE INDEX idx_projects_created ON public.projects(created_at DESC);

CREATE INDEX idx_deliveries_builder ON public.deliveries(builder_id);
CREATE INDEX idx_deliveries_project ON public.deliveries(project_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_created ON public.deliveries(created_at DESC);
CREATE INDEX idx_deliveries_stack ON public.deliveries USING gin(stack);

CREATE INDEX idx_evidence_delivery ON public.evidence(delivery_id);
CREATE INDEX idx_evidence_type ON public.evidence(evidence_type);

CREATE INDEX idx_verifications_delivery ON public.verifications(delivery_id);
CREATE INDEX idx_verifications_status ON public.verifications(overall_status);

CREATE INDEX idx_applications_project ON public.applications(project_id);
CREATE INDEX idx_applications_builder ON public.applications(builder_id);
CREATE INDEX idx_applications_status ON public.applications(status);

CREATE INDEX idx_teams_project ON public.teams(project_id);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_builder ON public.team_members(builder_id);

CREATE INDEX idx_team_tasks_team ON public.team_tasks(team_id);
CREATE INDEX idx_team_tasks_owner ON public.team_tasks(owner_id);
CREATE INDEX idx_team_tasks_status ON public.team_tasks(status);

CREATE INDEX idx_activity_team ON public.activity_events(team_id);
CREATE INDEX idx_activity_created ON public.activity_events(created_at DESC);

CREATE INDEX idx_forge_scores_builder ON public.forge_scores(builder_id);
CREATE INDEX idx_forge_scores_score ON public.forge_scores(score DESC);
CREATE INDEX idx_forge_scores_effective ON public.forge_scores(effective_score DESC);

CREATE INDEX idx_conversations_p1 ON public.conversations(participant_1_id);
CREATE INDEX idx_conversations_p2 ON public.conversations(participant_2_id);
CREATE INDEX idx_conversations_last_msg ON public.conversations(last_message_at DESC NULLS LAST);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_unread ON public.messages(conversation_id) WHERE read_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: ENABLE ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.builders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 4: ROW LEVEL SECURITY POLICIES
-- (all tables exist at this point, so cross-table references are safe)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Builders ────────────────────────────────────────────────────────────────

CREATE POLICY "Builders are publicly readable"
  ON public.builders FOR SELECT USING (true);

CREATE POLICY "Users can insert own builder profile"
  ON public.builders FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own builder profile"
  ON public.builders FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── Projects ────────────────────────────────────────────────────────────────

CREATE POLICY "Open projects are publicly readable"
  ON public.projects FOR SELECT
  USING (status IN ('open', 'in_progress', 'completed') OR auth.uid() = owner_id);

CREATE POLICY "Users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = owner_id);

-- ─── Deliveries ──────────────────────────────────────────────────────────────

CREATE POLICY "Deliveries are publicly readable"
  ON public.deliveries FOR SELECT USING (true);

CREATE POLICY "Builders can create own deliveries"
  ON public.deliveries FOR INSERT
  WITH CHECK (auth.uid() = builder_id);

CREATE POLICY "Builders can update own deliveries"
  ON public.deliveries FOR UPDATE
  USING (auth.uid() = builder_id)
  WITH CHECK (auth.uid() = builder_id);

-- ─── Evidence (immutable) ────────────────────────────────────────────────────

CREATE POLICY "Evidence is publicly readable"
  ON public.evidence FOR SELECT USING (true);

CREATE POLICY "Delivery owners can add evidence"
  ON public.evidence FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT builder_id FROM public.deliveries WHERE id = delivery_id)
  );

-- ─── Verifications (read-only) ───────────────────────────────────────────────

CREATE POLICY "Verifications are publicly readable"
  ON public.verifications FOR SELECT USING (true);

-- ─── Applications ────────────────────────────────────────────────────────────

CREATE POLICY "Applicants see own applications"
  ON public.applications FOR SELECT
  USING (
    auth.uid() = builder_id
    OR auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Builders can apply to projects"
  ON public.applications FOR INSERT
  WITH CHECK (
    auth.uid() = builder_id
    AND auth.uid() != (SELECT owner_id FROM public.projects WHERE id = project_id)
    AND (SELECT status FROM public.projects WHERE id = project_id) = 'open'
  );

CREATE POLICY "Applicants can withdraw own applications"
  ON public.applications FOR UPDATE
  USING (auth.uid() = builder_id)
  WITH CHECK (auth.uid() = builder_id AND status = 'withdrawn');

CREATE POLICY "Project owners can update application status"
  ON public.applications FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id))
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id));

-- ─── Teams ───────────────────────────────────────────────────────────────────

CREATE POLICY "Teams are readable by members and project owners"
  ON public.teams FOR SELECT
  USING (
    auth.uid() = (SELECT owner_id FROM public.projects WHERE id = teams.project_id)
    OR auth.uid() IN (SELECT builder_id FROM public.team_members WHERE team_members.team_id = teams.id)
  );

CREATE POLICY "Project owners can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = (SELECT owner_id FROM public.projects WHERE id = teams.project_id));

CREATE POLICY "Project owners can update teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = (SELECT owner_id FROM public.projects WHERE id = teams.project_id));

-- ─── Team Members ────────────────────────────────────────────────────────────

CREATE POLICY "Team members are readable by team participants"
  ON public.team_members FOR SELECT
  USING (
    auth.uid() IN (SELECT tm.builder_id FROM public.team_members tm WHERE tm.team_id = team_members.team_id)
    OR auth.uid() = (
      SELECT p.owner_id FROM public.projects p
      INNER JOIN public.teams t ON t.project_id = p.id
      WHERE t.id = team_members.team_id
    )
  );

-- ─── Team Tasks ──────────────────────────────────────────────────────────────

CREATE POLICY "Tasks readable by team members"
  ON public.team_tasks FOR SELECT
  USING (
    auth.uid() IN (SELECT tm.builder_id FROM public.team_members tm WHERE tm.team_id = team_tasks.team_id)
    OR auth.uid() = (
      SELECT p.owner_id FROM public.projects p
      INNER JOIN public.teams t ON t.project_id = p.id
      WHERE t.id = team_tasks.team_id
    )
  );

CREATE POLICY "Team members can create tasks"
  ON public.team_tasks FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT tm.builder_id FROM public.team_members tm WHERE tm.team_id = team_tasks.team_id)
  );

CREATE POLICY "Team members can update tasks"
  ON public.team_tasks FOR UPDATE
  USING (
    auth.uid() IN (SELECT tm.builder_id FROM public.team_members tm WHERE tm.team_id = team_tasks.team_id)
  );

-- ─── Activity Events ─────────────────────────────────────────────────────────

CREATE POLICY "Activity readable by team members"
  ON public.activity_events FOR SELECT
  USING (
    auth.uid() IN (SELECT tm.builder_id FROM public.team_members tm WHERE tm.team_id = activity_events.team_id)
    OR auth.uid() = (
      SELECT p.owner_id FROM public.projects p
      INNER JOIN public.teams t ON t.project_id = p.id
      WHERE t.id = activity_events.team_id
    )
  );

-- ─── Forge Scores (read-only) ────────────────────────────────────────────────

CREATE POLICY "Scores are publicly readable"
  ON public.forge_scores FOR SELECT USING (true);

-- ─── Conversations ───────────────────────────────────────────────────────────

CREATE POLICY "Participants can read own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() IN (participant_1_id, participant_2_id));

CREATE POLICY "Authenticated users can start conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() IN (participant_1_id, participant_2_id));

-- ─── Messages ────────────────────────────────────────────────────────────────

CREATE POLICY "Conversation participants can read messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT participant_1_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT participant_2_id FROM public.conversations WHERE id = conversation_id
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() IN (
      SELECT participant_1_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT participant_2_id FROM public.conversations WHERE id = conversation_id
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() != sender_id
    AND auth.uid() IN (
      SELECT participant_1_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT participant_2_id FROM public.conversations WHERE id = conversation_id
    )
  )
  WITH CHECK (read_at IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 5: FUNCTIONS AND TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_builders_updated_at
  BEFORE UPDATE ON public.builders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_team_tasks_updated_at
  BEFORE UPDATE ON public.team_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_message_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- Auto-create builder profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.builders (id, email, full_name, avatar_url, github_username)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, 'Builder'),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
