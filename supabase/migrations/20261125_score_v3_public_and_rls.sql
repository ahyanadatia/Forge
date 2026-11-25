-- Forge Score V3: lock down the system tables that were missing RLS, and
-- expose a safe public summary of each builder's latest score.

-- 1. scoring_model_versions and score_rate_limits had RLS disabled, which let
--    any API caller insert or edit them. Only the service role writes here.
alter table public.scoring_model_versions enable row level security;
drop policy if exists "Anyone reads scoring model versions" on public.scoring_model_versions;
create policy "Anyone reads scoring model versions" on public.scoring_model_versions
  for select using (true);

alter table public.score_rate_limits enable row level security;
drop policy if exists "Users read own rate limit" on public.score_rate_limits;
create policy "Users read own rate limit" on public.score_rate_limits
  for select using (auth.uid() = builder_id);

-- 2. Public summary of the latest V3 score. score_history stays owner-only
--    (it carries anomaly details); this returns only what a profile shows.
create or replace function public.get_public_score_v3(p_builder_id uuid)
returns table (
  score_v3 integer,
  dimensions jsonb,
  confidence numeric,
  model_version text,
  computed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.score_v3,
    h.breakdown -> 'dimensions',
    nullif(h.breakdown ->> 'confidence', '')::numeric,
    h.model_version,
    h.computed_at
  from public.score_history h
  where h.builder_id = p_builder_id
  order by h.computed_at desc
  limit 1;
$$;

revoke all on function public.get_public_score_v3(uuid) from public;
grant execute on function public.get_public_score_v3(uuid) to anon, authenticated;
