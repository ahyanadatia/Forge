-- The invite, application and owner-join functions are SECURITY DEFINER and
-- take the acting user's id as an argument. The API routes pass the session
-- user's id, but the functions are also callable straight from the REST API,
-- where a signed-in user could pass someone else's id (for example to accept
-- another builder's invite).
--
-- Fix: keep each original body as a private *_impl function that only the
-- database owner can execute, and put a public wrapper with the same
-- signature in front of it that checks the id against auth.uid().

alter function public.accept_invite(uuid, uuid) rename to accept_invite_impl;
alter function public.accept_invite_impl(uuid, uuid) set search_path = public;
revoke all on function public.accept_invite_impl(uuid, uuid) from public, anon, authenticated;

create function public.accept_invite(p_invite_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    return jsonb_build_object('error', 'Not allowed', 'code', 'FORBIDDEN');
  end if;
  return public.accept_invite_impl(p_invite_id, p_user_id);
end;
$$;

revoke all on function public.accept_invite(uuid, uuid) from public, anon;
grant execute on function public.accept_invite(uuid, uuid) to authenticated;

alter function public.decline_invite(uuid, uuid) rename to decline_invite_impl;
alter function public.decline_invite_impl(uuid, uuid) set search_path = public;
revoke all on function public.decline_invite_impl(uuid, uuid) from public, anon, authenticated;

create function public.decline_invite(p_invite_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    return jsonb_build_object('error', 'Not allowed', 'code', 'FORBIDDEN');
  end if;
  return public.decline_invite_impl(p_invite_id, p_user_id);
end;
$$;

revoke all on function public.decline_invite(uuid, uuid) from public, anon;
grant execute on function public.decline_invite(uuid, uuid) to authenticated;

alter function public.accept_application(uuid, uuid) rename to accept_application_impl;
alter function public.accept_application_impl(uuid, uuid) set search_path = public;
revoke all on function public.accept_application_impl(uuid, uuid) from public, anon, authenticated;

create function public.accept_application(p_application_id uuid, p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_owner_id is distinct from auth.uid() then
    return jsonb_build_object('error', 'Not allowed', 'code', 'FORBIDDEN');
  end if;
  return public.accept_application_impl(p_application_id, p_owner_id);
end;
$$;

revoke all on function public.accept_application(uuid, uuid) from public, anon;
grant execute on function public.accept_application(uuid, uuid) to authenticated;

alter function public.join_project_as_owner(uuid, uuid) rename to join_project_as_owner_impl;
alter function public.join_project_as_owner_impl(uuid, uuid) set search_path = public;
revoke all on function public.join_project_as_owner_impl(uuid, uuid) from public, anon, authenticated;

create function public.join_project_as_owner(p_project_id uuid, p_owner_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_owner_id is distinct from auth.uid() then
    return jsonb_build_object('error', 'Not allowed', 'code', 'FORBIDDEN');
  end if;
  if not exists (select 1 from projects where id = p_project_id and owner_id = auth.uid()) then
    return jsonb_build_object('error', 'Only the project owner can join as owner', 'code', 'FORBIDDEN');
  end if;
  return public.join_project_as_owner_impl(p_project_id, p_owner_id);
end;
$$;

revoke all on function public.join_project_as_owner(uuid, uuid) from public, anon;
grant execute on function public.join_project_as_owner(uuid, uuid) to authenticated;
