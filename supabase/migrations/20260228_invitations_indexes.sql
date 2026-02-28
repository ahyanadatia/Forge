-- ============================================================================
-- Invitations + Performance Indexes
-- ============================================================================

-- ─── INVITATIONS TABLE ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  builder_id uuid NOT NULL REFERENCES public.builders(id) ON DELETE CASCADE,
  role text,
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'withdrawn')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, builder_id)
);

CREATE INDEX IF NOT EXISTS idx_invitations_project ON public.invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_invitations_builder ON public.invitations(builder_id);
CREATE INDEX IF NOT EXISTS idx_invitations_sender ON public.invitations(sender_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_project_status ON public.invitations(project_id, status);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builders can see invitations they sent or received"
  ON public.invitations FOR SELECT
  USING (auth.uid() IN (sender_id, builder_id));

CREATE POLICY "Project owners can send invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() = (SELECT owner_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "Participants can update invitations"
  ON public.invitations FOR UPDATE
  USING (auth.uid() IN (sender_id, builder_id));

-- Updated_at trigger
CREATE TRIGGER trg_invitations_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── PERFORMANCE INDEXES ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_builders_forge_score
  ON public.builders(forge_score DESC NULLS LAST)
  WHERE forge_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_builder_id
  ON public.team_members(builder_id);
