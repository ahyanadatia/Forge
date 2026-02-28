-- Presence tracking for live user count
create table if not exists public.presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_presence_last_seen on public.presence (last_seen_at);

alter table public.presence enable row level security;

create policy "Users write own presence" on public.presence
  for all using (auth.uid() = user_id);

create policy "Anyone can read presence count" on public.presence
  for select using (true);
