-- Onboarding state for first-login tour and checklist
create table if not exists public.user_onboarding_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_login_completed boolean not null default false,
  tour_completed boolean not null default false,
  tour_step integer not null default 0,
  checklist_dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding_state enable row level security;

create policy "Users read own onboarding" on public.user_onboarding_state
  for select using (auth.uid() = user_id);

create policy "Users insert own onboarding" on public.user_onboarding_state
  for insert with check (auth.uid() = user_id);

create policy "Users update own onboarding" on public.user_onboarding_state
  for update using (auth.uid() = user_id);
