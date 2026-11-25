-- Demo data for local development and screenshots. Every row is labelled as
-- seeded. Requires the migrations to be applied first.
--   psql "$DATABASE_URL" -v demo_password="'choose-a-password'" -f supabase/seed.sql
-- Sign in with demo@forge.local and that password (email provider enabled).
-- Remove with supabase/seed-cleanup.sql.

\set demo_id '\'de300000-0000-4000-8000-000000000001\''

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', :demo_id, 'authenticated', 'authenticated',
  'demo@forge.local', crypt(:demo_password, gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"full_name":"Demo Builder (seeded)"}',
  now() - interval '7 months', now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
values (gen_random_uuid(), :demo_id, :demo_id,
  json_build_object('sub', 'de300000-0000-4000-8000-000000000001', 'email', 'demo@forge.local')::jsonb,
  'email', now(), now(), now())
on conflict do nothing;

-- The on_auth_user_created trigger may already have made the builder row.
insert into public.builders (id, email, full_name, first_name, last_name)
values (:demo_id, 'demo@forge.local', 'Demo Builder (seeded)', 'Demo', 'Builder')
on conflict (id) do nothing;

update public.builders set
  full_name = 'Demo Builder (seeded)', first_name = 'Demo', last_name = 'Builder',
  display_name = 'Demo Builder (seeded)', username = 'demo_builder',
  role_descriptor = 'Full-stack engineer · seeded demo account',
  bio = 'Seeded demo profile used for local development and screenshots. Not a real person.',
  location = 'London, UK', university_or_company = 'Demo University',
  primary_stack = 'TypeScript, Next.js, Postgres', github_username = null,
  self_backend = 70, self_frontend = 65, self_ml = 35, self_systems = 50, self_devops = 55,
  ai_backend = 68, ai_frontend = 62, ai_ml = 30, ai_systems = 48, ai_devops = 57,
  skill_confidence = 60, score_v3 = 612, score_v3_model = 'v3.0',
  score_v3_computed_at = now() - interval '2 hours', tenure_start = now() - interval '7 months'
where id = :demo_id;

insert into public.user_onboarding_state (user_id, first_login_completed, tour_completed, checklist_dismissed)
values (:demo_id, true, true, true)
on conflict (user_id) do update set first_login_completed = true, tour_completed = true, checklist_dismissed = true;

insert into public.deliveries (builder_id, title, description, role, stack, status, deployment_url, repo_url, started_at, completed_at)
values
  (:demo_id, 'Invoice reconciliation service (seeded)', 'Seeded example delivery: a queue-backed service that matches bank lines to invoices.', 'Backend lead', '{TypeScript,Postgres,Redis}', 'verified', 'https://example.com', 'https://github.com/vercel/next.js', now() - interval '5 months', now() - interval '4 months'),
  (:demo_id, 'Team analytics dashboard (seeded)', 'Seeded example delivery: a dashboard for weekly delivery metrics.', 'Frontend', '{Next.js,Tailwind}', 'completed', 'https://example.com', null, now() - interval '3 months', now() - interval '2 months'),
  (:demo_id, 'CLI for deployment checks (seeded)', 'Seeded example delivery, still in progress.', 'Solo', '{Go}', 'in_progress', null, null, now() - interval '3 weeks', null);

insert into public.score_history (builder_id, score_v3, previous_score, delta, breakdown, anomaly_flags, model_version, reason, computed_at)
select :demo_id, s.score, s.prev, s.score - coalesce(s.prev, s.score),
  jsonb_build_object(
    'dimensions', jsonb_build_object('ec', s.ec, 'rc', s.rc, 'aoi', s.aoi, 'lpi', s.lpi),
    'confidence', s.conf, 'tenure_months', s.tenure,
    'bcm', jsonb_build_object('multiplier', s.bcm, 'flags', s.flags, 'details', '{}'::jsonb)),
  s.flags, 'v3.0', 'seeded demo history', now() - (s.ago || ' days')::interval
from (values
  (480, null, 52, 60, 40, 70, 38, 1, 1.0,  '[]'::jsonb, 180),
  (505, 480, 55, 63, 42, 72, 42, 2, 1.0,  '[]'::jsonb, 150),
  (523, 505, 58, 66, 44, 75, 47, 3, 1.0,  '[]'::jsonb, 120),
  (549, 523, 61, 68, 46, 78, 51, 4, 0.97, '["MODERATE_BURSTINESS"]'::jsonb, 90),
  (570, 549, 63, 70, 48, 80, 55, 5, 1.0,  '[]'::jsonb, 60),
  (591, 570, 66, 72, 50, 81, 58, 6, 1.0,  '[]'::jsonb, 30),
  (612, 591, 68, 74, 51, 83, 61, 7, 1.0,  '[]'::jsonb, 0)
) as s(score, prev, ec, rc, aoi, lpi, conf, tenure, bcm, flags, ago);
