-- add creator identity snapshot columns to community_postings
-- run after the base community_postings migration

alter table if exists public.community_postings
  add column if not exists creator_name text default '',
  add column if not exists creator_github_username text default '';

update public.community_postings p
set
  creator_name = coalesce(nullif(p.creator_name, ''), nullif(u.raw_user_meta_data->>'name', ''), u.email, 'User'),
  creator_github_username = coalesce(nullif(p.creator_github_username, ''), nullif(u.raw_user_meta_data->>'user_name', ''), '')
from auth.users u
where p.creator_id = u.id;
