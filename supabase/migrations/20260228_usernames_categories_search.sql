-- ============================================================================
-- Usernames + Project Categorization + Search Indexes
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 1: USERNAMES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.builders
  ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.builders
  ADD CONSTRAINT builders_username_unique UNIQUE (username);

ALTER TABLE public.builders
  ADD CONSTRAINT builders_username_format CHECK (
    username IS NULL OR (
      char_length(username) BETWEEN 3 AND 20
      AND username ~ '^[a-z0-9][a-z0-9_]*[a-z0-9]$'
      AND username !~ '__'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_builders_username ON public.builders(username)
  WHERE username IS NOT NULL;

-- Username history for redirect support
CREATE TABLE IF NOT EXISTS public.username_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  old_username text NOT NULL,
  new_username text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_username_history_old
  ON public.username_history(old_username);
CREATE INDEX IF NOT EXISTS idx_username_history_builder
  ON public.username_history(builder_id);

ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Username history is publicly readable"
  ON public.username_history FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 2: PROJECT CATEGORIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS category text
    CHECK (category IS NULL OR category IN (
      'saas', 'marketplace', 'developer_tool', 'ai_ml',
      'fintech', 'healthtech', 'edtech', 'social',
      'ecommerce', 'data_analytics', 'devops_infra',
      'mobile_app', 'web_app', 'api_service', 'open_source', 'other'
    )),
  ADD COLUMN IF NOT EXISTS stage text
    CHECK (stage IS NULL OR stage IN (
      'idea', 'prototype', 'mvp', 'beta', 'launched', 'scaling'
    )),
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS roles_needed text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS timeline_weeks integer
    CHECK (timeline_weeks IS NULL OR timeline_weeks BETWEEN 1 AND 104),
  ADD COLUMN IF NOT EXISTS hours_per_week_min integer
    CHECK (hours_per_week_min IS NULL OR hours_per_week_min BETWEEN 1 AND 80),
  ADD COLUMN IF NOT EXISTS hours_per_week_max integer
    CHECK (hours_per_week_max IS NULL OR hours_per_week_max BETWEEN 1 AND 80),
  ADD COLUMN IF NOT EXISTS team_size_target integer
    CHECK (team_size_target IS NULL OR team_size_target BETWEEN 1 AND 50);

CREATE INDEX IF NOT EXISTS idx_projects_category ON public.projects(category)
  WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_stage ON public.projects(stage)
  WHERE stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_tags ON public.projects USING gin(tags)
  WHERE tags != '{}';
CREATE INDEX IF NOT EXISTS idx_projects_roles_needed ON public.projects USING gin(roles_needed)
  WHERE roles_needed != '{}';

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART 3: SEARCH INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for builder name search
CREATE INDEX IF NOT EXISTS idx_builders_username_trgm
  ON public.builders USING gin(username gin_trgm_ops)
  WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_builders_first_name_trgm
  ON public.builders USING gin(first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_builders_last_name_trgm
  ON public.builders USING gin(last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_builders_role_trgm
  ON public.builders USING gin(role_descriptor gin_trgm_ops)
  WHERE role_descriptor IS NOT NULL;

-- Full-text search on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.projects_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_search_vector
  BEFORE INSERT OR UPDATE OF title, description, tags ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.projects_search_vector_update();

-- Backfill existing rows
UPDATE public.projects SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C');

CREATE INDEX IF NOT EXISTS idx_projects_search_vector
  ON public.projects USING gin(search_vector);
