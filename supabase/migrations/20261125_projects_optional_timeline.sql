-- The create-project form only asks for a title, description, category and
-- roles; timeline and hours are filled in later from the project page. The
-- original schema made both NOT NULL with no default, so every new project
-- insert failed. The app already treats a missing timeline as "draft".
alter table public.projects alter column timeline drop not null;
alter table public.projects alter column hours_per_week set default 10;
