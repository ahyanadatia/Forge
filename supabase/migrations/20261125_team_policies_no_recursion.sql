-- The team_members SELECT policy queried team_members itself, so Postgres
-- raised "infinite recursion detected in policy for relation team_members"
-- on every read of teams, team members, tasks or activity. Project pages
-- showed an empty team as a result.
--
-- Standard fix: do the membership lookups in SECURITY DEFINER helpers (which
-- bypass RLS) and call those from the policies.

create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from team_members
    where team_id = p_team_id and builder_id = auth.uid()
  );
$$;

create or replace function public.is_team_project_owner(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from teams t join projects p on p.id = t.project_id
    where t.id = p_team_id and p.owner_id = auth.uid()
  );
$$;

-- anon needs execute too, so signed-out reads return no rows instead of a
-- permission error (auth.uid() is null, so both helpers return false).
revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_project_owner(uuid) from public;
grant execute on function public.is_team_member(uuid) to anon, authenticated;
grant execute on function public.is_team_project_owner(uuid) to anon, authenticated;

drop policy if exists "Team members are readable by team participants" on public.team_members;
create policy "Team members are readable by team participants" on public.team_members
  for select using (public.is_team_member(team_id) or public.is_team_project_owner(team_id));

drop policy if exists "Teams are readable by members and project owners" on public.teams;
create policy "Teams are readable by members and project owners" on public.teams
  for select using (
    auth.uid() = (select owner_id from projects where projects.id = teams.project_id)
    or public.is_team_member(id)
  );

drop policy if exists "Tasks readable by team members" on public.team_tasks;
create policy "Tasks readable by team members" on public.team_tasks
  for select using (public.is_team_member(team_id) or public.is_team_project_owner(team_id));

drop policy if exists "Team members can create tasks" on public.team_tasks;
create policy "Team members can create tasks" on public.team_tasks
  for insert with check (public.is_team_member(team_id));

drop policy if exists "Team members can update tasks" on public.team_tasks;
create policy "Team members can update tasks" on public.team_tasks
  for update using (public.is_team_member(team_id));

drop policy if exists "Activity readable by team members" on public.activity_events;
create policy "Activity readable by team members" on public.activity_events
  for select using (public.is_team_member(team_id) or public.is_team_project_owner(team_id));
