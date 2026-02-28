-- Forge Score V3: Production-grade scoring architecture
-- Evidence Ledger, Score History, Model Versioning, Recompute Queue

-- 1. Evidence Ledger — single source of truth for all scoring inputs
create table if not exists public.score_evidence (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid not null references public.builders(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  delivery_id uuid references public.deliveries(id) on delete set null,
  type text not null check (type in (
    'DEPLOYMENT_HTTP_PROBE_OK',
    'DEPLOYMENT_HTTP_PROBE_FAIL',
    'GITHUB_CONTRIBUTOR_VERIFIED',
    'GITHUB_CONTRIBUTOR_FAIL',
    'REPO_STACK_INFERRED',
    'PR_REVIEW_ACTIVITY',
    'DELIVERY_VERIFIED',
    'DELIVERY_SUSTAINED',
    'DELIVERY_DROPPED',
    'TEAM_ATTESTATION',
    'TEAM_JOINED',
    'TEAM_DEPARTED',
    'PROJECT_COMPLETED',
    'PROJECT_ABANDONED',
    'NO_SHOW_FLAG',
    'LIVE_CHALLENGE_RESULT',
    'ANOMALY_BURST_ACTIVITY',
    'ANOMALY_TEMPLATE_CLONE',
    'ANOMALY_ATTESTATION_RING',
    'ARCH_DECISION_LOG',
    'OWNERSHIP_VERIFIED_STRONG',
    'OWNERSHIP_VERIFIED_WEAK',
    'CONSISTENCY_ACTIVE_WEEK',
    'SKILL_EVIDENCE_INFERRED'
  )),
  source text not null check (source in (
    'probe_http', 'probe_github', 'probe_stack', 'platform_event',
    'user_action', 'anomaly_detector', 'attestation', 'system'
  )),
  payload jsonb not null default '{}',
  confidence real not null default 0.5 check (confidence >= 0 and confidence <= 1),
  hash text not null,
  superseded_by uuid references public.score_evidence(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_score_evidence_builder on public.score_evidence (builder_id, created_at desc);
create index if not exists idx_score_evidence_type on public.score_evidence (type);
create index if not exists idx_score_evidence_hash on public.score_evidence (hash);
create unique index if not exists idx_score_evidence_dedup on public.score_evidence (builder_id, hash);

alter table public.score_evidence enable row level security;
create policy "Evidence is append-only by system" on public.score_evidence
  for select using (true);

-- 2. Scoring Model Versions
create table if not exists public.scoring_model_versions (
  version text primary key,
  weights jsonb not null,
  caps jsonb not null,
  tier_config jsonb not null default '{}',
  effective_from timestamptz not null default now(),
  deprecated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Seed V3 model
insert into public.scoring_model_versions (version, weights, caps, tier_config, effective_from) values (
  'v3.0',
  '{
    "ec_weight": 0.30,
    "aoi_weight": 0.20,
    "rc_weight": 0.30,
    "lpi_weight": 0.20,
    "self_report_max_weight": 0.20,
    "self_report_evidence_threshold": 3
  }',
  '{
    "normal_delta_max": 35,
    "milestone_delta_max": 70,
    "tier_800_min_months": 4,
    "tier_900_min_months": 9,
    "inactivity_decay_start_days": 60,
    "inactivity_decay_rate_per_day": 0.15,
    "bcm_min": 0.60,
    "bcm_max": 1.05
  }',
  '{
    "floors": {"100": 0, "200": 15, "400": 30, "600": 50, "800": 70, "900": 85},
    "score_min": 100,
    "score_max": 999
  }',
  now()
) on conflict (version) do nothing;

-- 3. Score History (audit trail)
create table if not exists public.score_history (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid not null references public.builders(id) on delete cascade,
  score_v3 integer not null check (score_v3 between 100 and 999),
  previous_score integer,
  delta integer,
  breakdown jsonb not null,
  anomaly_flags jsonb not null default '[]',
  evidence_snapshot_ids uuid[] not null default '{}',
  model_version text not null references public.scoring_model_versions(version),
  reason text not null,
  computed_at timestamptz not null default now()
);

create index if not exists idx_score_history_builder on public.score_history (builder_id, computed_at desc);

alter table public.score_history enable row level security;
create policy "Users read own score history" on public.score_history
  for select using (auth.uid() = builder_id);

-- 4. Recompute Queue
create table if not exists public.score_recompute_queue (
  id uuid primary key default gen_random_uuid(),
  builder_id uuid not null references public.builders(id) on delete cascade,
  trigger_type text not null check (trigger_type in (
    'delivery_verified', 'probe_result', 'attestation_added',
    'project_status_change', 'team_departure', 'anomaly_flagged',
    'manual', 'scheduled'
  )),
  trigger_evidence_id uuid references public.score_evidence(id),
  priority integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text
);

create index if not exists idx_recompute_queue_pending on public.score_recompute_queue (status, priority desc, created_at)
  where status = 'pending';

alter table public.score_recompute_queue enable row level security;
create policy "Queue is system-managed" on public.score_recompute_queue
  for select using (auth.uid() = builder_id);

-- 5. Add V3 score column to builders
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'builders' and column_name = 'score_v3') then
    alter table public.builders add column score_v3 integer check (score_v3 is null or (score_v3 between 100 and 999));
    alter table public.builders add column score_v3_model text;
    alter table public.builders add column score_v3_computed_at timestamptz;
    alter table public.builders add column tenure_start timestamptz;
  end if;
end $$;

-- 6. Rate limiting table for score computation
create table if not exists public.score_rate_limits (
  builder_id uuid primary key references public.builders(id) on delete cascade,
  last_computed_at timestamptz not null default now()
);
