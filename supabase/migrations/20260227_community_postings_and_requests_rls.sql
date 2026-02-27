-- community postings + join requests schema + RLS
-- Run this in Supabase SQL Editor

create extension if not exists pgcrypto;

create table if not exists public.community_postings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  posting_type text not null check (posting_type in ('hackathon', 'project')),
  title text not null check (char_length(trim(title)) > 0 and char_length(title) <= 140),
  description text not null check (char_length(trim(description)) > 0 and char_length(description) <= 4000),
  location text default '',
  team_size integer not null default 4 check (team_size >= 2 and team_size <= 20),
  tags text[] not null default '{}',
  is_open boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists community_postings_open_created_idx
  on public.community_postings (is_open, created_at desc);

create index if not exists community_postings_creator_idx
  on public.community_postings (creator_id);

create table if not exists public.community_posting_requests (
  id uuid primary key default gen_random_uuid(),
  posting_id uuid not null references public.community_postings(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  message text default '',
  created_at timestamptz not null default timezone('utc', now()),
  unique (posting_id, requester_id)
);

create index if not exists community_posting_requests_posting_idx
  on public.community_posting_requests (posting_id, created_at desc);

create index if not exists community_posting_requests_requester_idx
  on public.community_posting_requests (requester_id, created_at desc);

create or replace function public.set_community_postings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_community_postings_updated_at on public.community_postings;
create trigger trg_community_postings_updated_at
before update on public.community_postings
for each row
execute function public.set_community_postings_updated_at();

alter table public.community_postings enable row level security;
alter table public.community_postings force row level security;

alter table public.community_posting_requests enable row level security;
alter table public.community_posting_requests force row level security;

-- Anyone can view open postings; owners can view their own postings.
drop policy if exists "community_postings_select_open_or_owner" on public.community_postings;
create policy "community_postings_select_open_or_owner"
on public.community_postings
for select
using (
  is_open = true
  or auth.uid() = creator_id
);

-- Only signed-in users can create own postings.
drop policy if exists "community_postings_insert_owner_only" on public.community_postings;
create policy "community_postings_insert_owner_only"
on public.community_postings
for insert
with check (
  auth.uid() = creator_id
);

-- Only owners can update/delete their own postings.
drop policy if exists "community_postings_update_owner_only" on public.community_postings;
create policy "community_postings_update_owner_only"
on public.community_postings
for update
using (auth.uid() = creator_id)
with check (auth.uid() = creator_id);

drop policy if exists "community_postings_delete_owner_only" on public.community_postings;
create policy "community_postings_delete_owner_only"
on public.community_postings
for delete
using (auth.uid() = creator_id);

-- Requesters can see their own requests; posting owners can see requests on their postings.
drop policy if exists "community_requests_select_requester_or_post_owner" on public.community_posting_requests;
create policy "community_requests_select_requester_or_post_owner"
on public.community_posting_requests
for select
using (
  auth.uid() = requester_id
  or exists (
    select 1
    from public.community_postings p
    where p.id = posting_id
      and p.creator_id = auth.uid()
  )
);

-- Only authenticated users can request to join (and not their own posting).
drop policy if exists "community_requests_insert_requester_only" on public.community_posting_requests;
create policy "community_requests_insert_requester_only"
on public.community_posting_requests
for insert
with check (
  auth.uid() = requester_id
  and exists (
    select 1
    from public.community_postings p
    where p.id = posting_id
      and p.creator_id <> auth.uid()
      and p.is_open = true
  )
);

-- Requesters can delete their own requests (cancel), posting owners can manage request status.
drop policy if exists "community_requests_update_owner_or_requester" on public.community_posting_requests;
create policy "community_requests_update_owner_or_requester"
on public.community_posting_requests
for update
using (
  auth.uid() = requester_id
  or exists (
    select 1
    from public.community_postings p
    where p.id = posting_id
      and p.creator_id = auth.uid()
  )
)
with check (
  auth.uid() = requester_id
  or exists (
    select 1
    from public.community_postings p
    where p.id = posting_id
      and p.creator_id = auth.uid()
  )
);

drop policy if exists "community_requests_delete_owner_or_requester" on public.community_posting_requests;
create policy "community_requests_delete_owner_or_requester"
on public.community_posting_requests
for delete
using (
  auth.uid() = requester_id
  or exists (
    select 1
    from public.community_postings p
    where p.id = posting_id
      and p.creator_id = auth.uid()
  )
);
