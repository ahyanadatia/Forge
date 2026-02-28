-- ============================================================================
-- Forge Score V2: Deterministic Execution Credibility Metric
-- ============================================================================

-- Score fields directly on builders (server-computed, read-only)
ALTER TABLE public.builders
  ADD COLUMN IF NOT EXISTS forge_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS confidence_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_success_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reliability_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_quality_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consistency_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_scored_at timestamptz;

-- Constraints
ALTER TABLE public.builders
  ADD CONSTRAINT chk_forge_score CHECK (forge_score BETWEEN 0 AND 1000),
  ADD CONSTRAINT chk_confidence_score CHECK (confidence_score BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_delivery_success CHECK (delivery_success_score BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_reliability CHECK (reliability_score BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_delivery_quality CHECK (delivery_quality_score BETWEEN 0 AND 100),
  ADD CONSTRAINT chk_consistency CHECK (consistency_score BETWEEN 0 AND 100);

-- Index for sorting/filtering by score
CREATE INDEX IF NOT EXISTS idx_builders_forge_score ON public.builders(forge_score DESC);
CREATE INDEX IF NOT EXISTS idx_builders_last_scored ON public.builders(last_scored_at);

-- Delivery timestamps for consistency scoring
CREATE INDEX IF NOT EXISTS idx_deliveries_completed_at ON public.deliveries(completed_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_builder_status ON public.deliveries(builder_id, status);

-- Activity events timestamps
CREATE INDEX IF NOT EXISTS idx_activity_events_created ON public.activity_events(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_events_actor ON public.activity_events(actor_id);

-- RLS: score columns are read-only for users (only service role can write)
-- The existing builders RLS allows users to update their own row.
-- We use a trigger to prevent clients from changing score fields.

CREATE OR REPLACE FUNCTION public.protect_score_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Preserve server-computed score fields from client writes
  IF current_setting('role') != 'service_role' THEN
    NEW.forge_score := OLD.forge_score;
    NEW.confidence_score := OLD.confidence_score;
    NEW.delivery_success_score := OLD.delivery_success_score;
    NEW.reliability_score := OLD.reliability_score;
    NEW.delivery_quality_score := OLD.delivery_quality_score;
    NEW.consistency_score := OLD.consistency_score;
    NEW.last_scored_at := OLD.last_scored_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_score_fields ON public.builders;
CREATE TRIGGER trg_protect_score_fields
  BEFORE UPDATE ON public.builders
  FOR EACH ROW EXECUTE FUNCTION public.protect_score_fields();
