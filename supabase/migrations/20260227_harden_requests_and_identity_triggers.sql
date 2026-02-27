-- Harden join-request update permissions and enforce identity snapshots via DB triggers

create extension if not exists pgcrypto;

alter table if exists public.community_postings
  add column if not exists creator_name text default '',
  add column if not exists creator_github_username text default '';

alter table if exists public.community_posting_requests
  add column if not exists requester_name text default '';

create or replace function public.set_community_posting_creator_identity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  select
    coalesce(nullif(u.raw_user_meta_data->>'name', ''), u.email, 'User'),
    coalesce(nullif(u.raw_user_meta_data->>'user_name', ''), '')
  into
    new.creator_name,
    new.creator_github_username
  from auth.users u
  where u.id = new.creator_id;

  if new.creator_name is null or new.creator_name = '' then
    new.creator_name := 'User';
  end if;

  if new.creator_github_username is null then
    new.creator_github_username := '';
  end if;

  return new;
end;
$$;

create or replace function public.set_community_requester_identity()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  select
    coalesce(nullif(u.raw_user_meta_data->>'name', ''), u.email, 'User')
  into
    new.requester_name
  from auth.users u
  where u.id = new.requester_id;

  if new.requester_name is null or new.requester_name = '' then
    new.requester_name := 'User';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_community_postings_creator_identity on public.community_postings;
create trigger trg_community_postings_creator_identity
before insert or update of creator_id
on public.community_postings
for each row
execute function public.set_community_posting_creator_identity();

drop trigger if exists trg_community_requests_requester_identity on public.community_posting_requests;
create trigger trg_community_requests_requester_identity
before insert or update of requester_id
on public.community_posting_requests
for each row
execute function public.set_community_requester_identity();

update public.community_postings p
set
  creator_name = coalesce(nullif(p.creator_name, ''), nullif(u.raw_user_meta_data->>'name', ''), u.email, 'User'),
  creator_github_username = coalesce(nullif(p.creator_github_username, ''), nullif(u.raw_user_meta_data->>'user_name', ''), '')
from auth.users u
where p.creator_id = u.id;

update public.community_posting_requests r
set requester_name = coalesce(nullif(r.requester_name, ''), nullif(u.raw_user_meta_data->>'name', ''), u.email, 'User')
from auth.users u
where r.requester_id = u.id;

drop policy if exists "community_requests_update_owner_or_requester" on public.community_posting_requests;
create policy "community_requests_update_owner_only"
on public.community_posting_requests
for update
using (
  exists (
    select 1
    from public.community_postings p
    where p.id = posting_id
      and p.creator_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.community_postings p
    where p.id = posting_id
      and p.creator_id = auth.uid()
  )
);
