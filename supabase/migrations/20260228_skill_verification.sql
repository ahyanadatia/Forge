-- ============================================================================
-- AI-Assisted Skill Verification System
-- ============================================================================

-- Self-assessment columns (migrate from JSONB skills)
ALTER TABLE public.builders
  ADD COLUMN IF NOT EXISTS self_backend int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS self_frontend int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS self_ml int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS self_systems int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS self_devops int NOT NULL DEFAULT 0;

-- AI-assessed columns (nullable until first analysis)
ALTER TABLE public.builders
  ADD COLUMN IF NOT EXISTS ai_backend int,
  ADD COLUMN IF NOT EXISTS ai_frontend int,
  ADD COLUMN IF NOT EXISTS ai_ml int,
  ADD COLUMN IF NOT EXISTS ai_systems int,
  ADD COLUMN IF NOT EXISTS ai_devops int;

-- Confidence and timestamp
ALTER TABLE public.builders
  ADD COLUMN IF NOT EXISTS skill_confidence int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS skills_last_analyzed timestamptz;

-- AI analysis evidence summary (stored for transparency panel)
ALTER TABLE public.builders
  ADD COLUMN IF NOT EXISTS skill_evidence jsonb;

-- Migrate existing JSONB skills into self_* columns
UPDATE public.builders
SET
  self_backend   = COALESCE((skills->>'backend')::int, 0),
  self_frontend  = COALESCE((skills->>'frontend')::int, 0),
  self_ml        = COALESCE((skills->>'ml')::int, 0),
  self_systems   = COALESCE((skills->>'systems_design')::int, 0),
  self_devops    = COALESCE((skills->>'devops')::int, 0)
WHERE self_backend = 0 AND self_frontend = 0 AND self_ml = 0
  AND self_systems = 0 AND self_devops = 0;

-- Constraints
ALTER TABLE public.builders
  ADD CONSTRAINT chk_self_backend CHECK (self_backend BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_self_frontend CHECK (self_frontend BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_self_ml CHECK (self_ml BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_self_systems CHECK (self_systems BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_self_devops CHECK (self_devops BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_ai_backend CHECK (ai_backend IS NULL OR ai_backend BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_ai_frontend CHECK (ai_frontend IS NULL OR ai_frontend BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_ai_ml CHECK (ai_ml IS NULL OR ai_ml BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_ai_systems CHECK (ai_systems IS NULL OR ai_systems BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_ai_devops CHECK (ai_devops IS NULL OR ai_devops BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_skill_confidence CHECK (skill_confidence BETWEEN 0 AND 100);
