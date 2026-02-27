-- add requester identity snapshot to community_posting_requests
-- run after the base community_postings/community_posting_requests migration

alter table if exists public.community_posting_requests
  add column if not exists requester_name text default '';

update public.community_posting_requests r
set requester_name = coalesce(nullif(r.requester_name, ''), nullif(u.raw_user_meta_data->>'name', ''), u.email, 'User')
from auth.users u
where r.requester_id = u.id;
