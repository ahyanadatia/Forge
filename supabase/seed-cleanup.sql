-- Removes the demo account from supabase/seed.sql and anything it created.
delete from public.activity_events where actor_id = 'de300000-0000-4000-8000-000000000001'
  or team_id in (select t.id from public.teams t join public.projects p on p.id = t.project_id where p.owner_id = 'de300000-0000-4000-8000-000000000001');
delete from public.team_members where builder_id = 'de300000-0000-4000-8000-000000000001';
delete from public.teams where project_id in (select id from public.projects where owner_id = 'de300000-0000-4000-8000-000000000001');
delete from public.project_roles where project_id in (select id from public.projects where owner_id = 'de300000-0000-4000-8000-000000000001');
delete from public.projects where owner_id = 'de300000-0000-4000-8000-000000000001';
delete from public.presence where user_id = 'de300000-0000-4000-8000-000000000001';
delete from public.score_history where builder_id = 'de300000-0000-4000-8000-000000000001';
delete from public.deliveries where builder_id = 'de300000-0000-4000-8000-000000000001';
delete from public.user_onboarding_state where user_id = 'de300000-0000-4000-8000-000000000001';
delete from public.builders where id = 'de300000-0000-4000-8000-000000000001';
delete from auth.identities where user_id = 'de300000-0000-4000-8000-000000000001';
delete from auth.users where id = 'de300000-0000-4000-8000-000000000001';
