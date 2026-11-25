-- Pin search_path on the trigger functions flagged by the Supabase security
-- linter (function_search_path_mutable), so they can't be pointed at objects
-- in another schema.
alter function public.handle_updated_at() set search_path = public;
alter function public.handle_new_message() set search_path = public;
alter function public.handle_new_user() set search_path = public;
alter function public.protect_score_fields() set search_path = public;
alter function public.projects_search_vector_update() set search_path = public;
alter function public.set_updated_at() set search_path = public;
alter function public.prevent_score_override() set search_path = public;
