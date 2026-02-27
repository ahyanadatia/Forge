-- featured_projects schema + RLS for safe cross-user viewing
-- Run this in Supabase SQL Editor (or via Supabase CLI migration apply)

create extension if not exists pgcrypto;

create table if not exists public.featured_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0 and char_length(name) <= 120),
  description text default '',
  url text default '',
  tech_stack text[] not null default '{}',
  screenshots jsonb not null default '[]'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists featured_projects_user_id_idx
  on public.featured_projects (user_id);

create index if not exists featured_projects_public_created_idx
  on public.featured_projects (is_public, created_at desc);

create or replace function public.set_featured_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_featured_projects_updated_at on public.featured_projects;
create trigger trg_featured_projects_updated_at
before update on public.featured_projects
for each row
execute function public.set_featured_projects_updated_at();

alter table public.featured_projects enable row level security;
alter table public.featured_projects force row level security;

-- Public can read only projects marked public.
-- Owners can read all of their own projects (public + private).
drop policy if exists "featured_projects_select_public_or_owner" on public.featured_projects;
create policy "featured_projects_select_public_or_owner"
on public.featured_projects
for select
using (
  is_public = true
  or auth.uid() = user_id
);

-- Only owners can create rows tied to their own auth uid.
drop policy if exists "featured_projects_insert_owner_only" on public.featured_projects;
create policy "featured_projects_insert_owner_only"
on public.featured_projects
for insert
with check (
  auth.uid() = user_id
);

-- Only owners can update their own rows.
drop policy if exists "featured_projects_update_owner_only" on public.featured_projects;
create policy "featured_projects_update_owner_only"
on public.featured_projects
for update
using (
  auth.uid() = user_id
)
with check (
  auth.uid() = user_id
);

-- Only owners can delete their own rows.
drop policy if exists "featured_projects_delete_owner_only" on public.featured_projects;
create policy "featured_projects_delete_owner_only"
on public.featured_projects
for delete
using (
  auth.uid() = user_id
);

-- Optional helper view for future public profile pages.
create or replace view public.public_featured_projects as
select
  id,
  user_id,
  name,
  description,
  url,
  tech_stack,
  screenshots,
  created_at,
  updated_at
from public.featured_projects
where is_public = true;
