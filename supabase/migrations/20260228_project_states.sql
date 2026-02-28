-- ============================================================================
-- Expand project statuses: draft, open, full, active, completed, archived
-- ============================================================================

-- Drop the old constraint and create a broader one
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'open', 'full', 'active', 'completed', 'archived'));

-- Migrate legacy 'in_progress' rows to 'active', 'cancelled' to 'archived'
UPDATE public.projects SET status = 'active' WHERE status = 'in_progress';
UPDATE public.projects SET status = 'archived' WHERE status = 'cancelled';

-- Update RLS policy to include new statuses for public read
DROP POLICY IF EXISTS "Projects are publicly readable when open or in progress" ON public.projects;
CREATE POLICY "Projects are publicly readable"
  ON public.projects FOR SELECT
  USING (status IN ('open', 'full', 'active', 'completed') OR auth.uid() = owner_id);

-- Add a leave_reason column to team_members for tracking departures
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS left_at timestamptz,
  ADD COLUMN IF NOT EXISTS leave_reason text
    CHECK (leave_reason IS NULL OR leave_reason IN (
      'time_constraints', 'project_mismatch', 'personal_reasons', 'found_other_project', 'other'
    ));
