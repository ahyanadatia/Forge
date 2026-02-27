-- ============================================================================
-- Profile Identity Fields + Avatar Storage
-- ============================================================================

-- Add name component columns
ALTER TABLE public.builders
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS middle_names text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS university_or_company text,
  ADD COLUMN IF NOT EXISTS primary_stack text,
  ADD COLUMN IF NOT EXISTS secondary_stack text,
  ADD COLUMN IF NOT EXISTS commitment_preferences text;

-- Migrate existing full_name into first_name / last_name
UPDATE public.builders
SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN array_length(string_to_array(full_name, ' '), 1) > 1
    THEN split_part(full_name, ' ', array_length(string_to_array(full_name, ' '), 1))
    ELSE split_part(full_name, ' ', 1)
  END
WHERE first_name IS NULL;

-- Now make first_name and last_name required
ALTER TABLE public.builders
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- Add default constraints
ALTER TABLE public.builders
  ADD CONSTRAINT builders_first_name_length CHECK (char_length(first_name) BETWEEN 1 AND 60),
  ADD CONSTRAINT builders_last_name_length CHECK (char_length(last_name) BETWEEN 1 AND 60);

-- Indexes for name search
CREATE INDEX IF NOT EXISTS idx_builders_first_name ON public.builders(first_name);
CREATE INDEX IF NOT EXISTS idx_builders_last_name ON public.builders(last_name);

-- Update the auth trigger to split names properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  raw_name text;
  name_parts text[];
BEGIN
  raw_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    'Builder'
  );
  name_parts := string_to_array(raw_name, ' ');

  INSERT INTO public.builders (
    id, email, full_name, first_name, last_name, avatar_url, github_username
  ) VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    raw_name,
    name_parts[1],
    CASE
      WHEN array_length(name_parts, 1) > 1
      THEN name_parts[array_length(name_parts, 1)]
      ELSE name_parts[1]
    END,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'user_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Storage: Avatars Bucket ─────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only write to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
