-- ============================================================================
-- Invite → Accept → Join flow: complete data model
-- ============================================================================

-- 1. project_roles — first-class role slots with compensation
CREATE TABLE IF NOT EXISTS public.project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  seats_total integer NOT NULL DEFAULT 1 CHECK (seats_total >= 1),
  comp_type text NOT NULL DEFAULT 'tbd'
    CHECK (comp_type IN ('unpaid','hourly','fixed','equity','prize_split','tbd')),
  comp_currency text,
  comp_amount_min numeric,
  comp_amount_max numeric,
  comp_equity_range text,
  comp_terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, role_name)
);

ALTER TABLE public.project_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read project roles"
  ON public.project_roles FOR SELECT USING (true);

CREATE POLICY "Project owners manage roles"
  ON public.project_roles FOR ALL USING (
    EXISTS (SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid())
  );

-- 2. Extend team_members with source tracking
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    CHECK (source IS NULL OR source IN ('invite','application','owner','manual'));

-- 3. Extend invitations: revoked status + compensation snapshot + accepted_at
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_status_check;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_status_check
  CHECK (status IN ('pending','accepted','declined','expired','withdrawn','revoked'));

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS comp_type text,
  ADD COLUMN IF NOT EXISTS comp_currency text,
  ADD COLUMN IF NOT EXISTS comp_amount_min numeric,
  ADD COLUMN IF NOT EXISTS comp_amount_max numeric,
  ADD COLUMN IF NOT EXISTS comp_equity_range text,
  ADD COLUMN IF NOT EXISTS comp_terms text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- 4. Transactional invite acceptance (atomic: validate → create member → mark accepted)
CREATE OR REPLACE FUNCTION public.accept_invite(
  p_invite_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_team record;
  v_active_count integer;
  v_team_target integer;
  v_existing_member uuid;
  v_member_id uuid;
BEGIN
  SELECT * INTO v_invite FROM invitations WHERE id = p_invite_id FOR UPDATE;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('error', 'Invite not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_invite.builder_id != p_user_id THEN
    RETURN jsonb_build_object('error', 'Not your invite', 'code', 'FORBIDDEN');
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN jsonb_build_object('status', 'already_accepted', 'invite_id', p_invite_id);
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Invite is ' || v_invite.status, 'code', 'INVALID_STATUS');
  END IF;

  IF v_invite.expires_at < now() THEN
    UPDATE invitations SET status = 'expired', updated_at = now() WHERE id = p_invite_id;
    RETURN jsonb_build_object('error', 'Invite has expired', 'code', 'EXPIRED');
  END IF;

  -- Get or create team for project
  SELECT * INTO v_team FROM teams WHERE project_id = v_invite.project_id;

  IF v_team IS NULL THEN
    INSERT INTO teams (project_id, name)
      SELECT v_invite.project_id, p.title FROM projects p WHERE p.id = v_invite.project_id
      RETURNING * INTO v_team;
  END IF;

  -- Capacity check
  SELECT count(*) INTO v_active_count
    FROM team_members WHERE team_id = v_team.id AND left_at IS NULL;

  SELECT COALESCE(p.team_size_target, p.team_size) INTO v_team_target
    FROM projects p WHERE p.id = v_invite.project_id;

  IF v_active_count >= v_team_target THEN
    RETURN jsonb_build_object(
      'error', 'Team is at capacity',
      'code', 'CAPACITY_FULL',
      'current', v_active_count,
      'max', v_team_target
    );
  END IF;

  -- Idempotent: check for existing active membership
  SELECT id INTO v_existing_member
    FROM team_members WHERE team_id = v_team.id AND builder_id = p_user_id AND left_at IS NULL;

  IF v_existing_member IS NOT NULL THEN
    UPDATE invitations SET status = 'accepted', accepted_at = now(), updated_at = now()
      WHERE id = p_invite_id;
    RETURN jsonb_build_object('status', 'already_member', 'invite_id', p_invite_id, 'team_id', v_team.id);
  END IF;

  -- Insert membership (upsert handles re-joining after leave)
  INSERT INTO team_members (team_id, builder_id, role, source)
    VALUES (v_team.id, p_user_id, COALESCE(v_invite.role, 'member'), 'invite')
    ON CONFLICT (team_id, builder_id) DO UPDATE
      SET left_at = NULL, leave_reason = NULL,
          role = COALESCE(v_invite.role, 'member'), source = 'invite'
    RETURNING id INTO v_member_id;

  -- Mark accepted
  UPDATE invitations SET status = 'accepted', accepted_at = now(), updated_at = now()
    WHERE id = p_invite_id;

  -- Activity log
  INSERT INTO activity_events (team_id, actor_id, event_type, description, metadata)
    VALUES (
      v_team.id, p_user_id, 'member_joined',
      'Joined via invitation',
      jsonb_build_object('invite_id', p_invite_id, 'role', COALESCE(v_invite.role, 'member'))
    );

  -- Auto-mark project as full if at capacity
  IF v_active_count + 1 >= v_team_target THEN
    UPDATE projects SET status = 'full' WHERE id = v_invite.project_id AND status = 'open';
  END IF;

  RETURN jsonb_build_object(
    'status', 'accepted',
    'invite_id', p_invite_id,
    'team_id', v_team.id,
    'team_member_id', v_member_id,
    'project_id', v_invite.project_id
  );
END;
$$;

-- 5. Owner auto-join function
CREATE OR REPLACE FUNCTION public.join_project_as_owner(
  p_project_id uuid,
  p_owner_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_team record;
  v_member_id uuid;
BEGIN
  SELECT * INTO v_team FROM teams WHERE project_id = p_project_id;

  IF v_team IS NULL THEN
    INSERT INTO teams (project_id, name)
      SELECT p_project_id, p.title FROM projects p WHERE p.id = p_project_id
      RETURNING * INTO v_team;
  END IF;

  INSERT INTO team_members (team_id, builder_id, role, source)
    VALUES (v_team.id, p_owner_id, 'owner', 'owner')
    ON CONFLICT (team_id, builder_id) DO NOTHING
    RETURNING id INTO v_member_id;

  IF v_member_id IS NULL THEN
    SELECT id INTO v_member_id FROM team_members
      WHERE team_id = v_team.id AND builder_id = p_owner_id;
  END IF;

  INSERT INTO activity_events (team_id, actor_id, event_type, description, metadata)
    VALUES (v_team.id, p_owner_id, 'member_joined', 'Joined as project owner',
      jsonb_build_object('role', 'owner', 'source', 'owner'));

  RETURN jsonb_build_object('team_id', v_team.id, 'member_id', v_member_id);
END;
$$;

-- 6. Decline invite function (simpler, but consistent)
CREATE OR REPLACE FUNCTION public.decline_invite(
  p_invite_id uuid,
  p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT * INTO v_invite FROM invitations WHERE id = p_invite_id FOR UPDATE;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('error', 'Invite not found', 'code', 'NOT_FOUND');
  END IF;

  IF v_invite.builder_id != p_user_id THEN
    RETURN jsonb_build_object('error', 'Not your invite', 'code', 'FORBIDDEN');
  END IF;

  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Invite is ' || v_invite.status, 'code', 'INVALID_STATUS');
  END IF;

  UPDATE invitations SET status = 'declined', updated_at = now() WHERE id = p_invite_id;

  RETURN jsonb_build_object('status', 'declined', 'invite_id', p_invite_id);
END;
$$;

-- 7. Accept application function (parallel fix for applications)
CREATE OR REPLACE FUNCTION public.accept_application(
  p_application_id uuid,
  p_owner_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_app record;
  v_project record;
  v_team record;
  v_active_count integer;
  v_team_target integer;
  v_member_id uuid;
BEGIN
  SELECT * INTO v_app FROM applications WHERE id = p_application_id FOR UPDATE;

  IF v_app IS NULL THEN
    RETURN jsonb_build_object('error', 'Application not found', 'code', 'NOT_FOUND');
  END IF;

  SELECT * INTO v_project FROM projects WHERE id = v_app.project_id;

  IF v_project.owner_id != p_owner_id THEN
    RETURN jsonb_build_object('error', 'Not project owner', 'code', 'FORBIDDEN');
  END IF;

  IF v_app.status = 'accepted' THEN
    RETURN jsonb_build_object('status', 'already_accepted');
  END IF;

  IF v_app.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Application is ' || v_app.status, 'code', 'INVALID_STATUS');
  END IF;

  SELECT * INTO v_team FROM teams WHERE project_id = v_app.project_id;

  IF v_team IS NULL THEN
    INSERT INTO teams (project_id, name) VALUES (v_app.project_id, v_project.title)
      RETURNING * INTO v_team;
  END IF;

  SELECT count(*) INTO v_active_count
    FROM team_members WHERE team_id = v_team.id AND left_at IS NULL;

  v_team_target := COALESCE(v_project.team_size_target, v_project.team_size);

  IF v_active_count >= v_team_target THEN
    RETURN jsonb_build_object('error', 'Team is at capacity', 'code', 'CAPACITY_FULL');
  END IF;

  INSERT INTO team_members (team_id, builder_id, role, source)
    VALUES (v_team.id, v_app.builder_id, 'member', 'application')
    ON CONFLICT (team_id, builder_id) DO UPDATE
      SET left_at = NULL, leave_reason = NULL, source = 'application'
    RETURNING id INTO v_member_id;

  UPDATE applications SET status = 'accepted', updated_at = now() WHERE id = p_application_id;

  INSERT INTO activity_events (team_id, actor_id, event_type, description, metadata)
    VALUES (v_team.id, v_app.builder_id, 'member_joined', 'Joined via application',
      jsonb_build_object('application_id', p_application_id));

  IF v_active_count + 1 >= v_team_target THEN
    UPDATE projects SET status = 'full' WHERE id = v_app.project_id AND status = 'open';
  END IF;

  RETURN jsonb_build_object(
    'status', 'accepted',
    'team_id', v_team.id,
    'member_id', v_member_id,
    'project_id', v_app.project_id
  );
END;
$$;
