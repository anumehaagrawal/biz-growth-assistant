-- Create org_resources table
CREATE TABLE public.org_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('file', 'website')),
  name TEXT NOT NULL,
  source_url TEXT,
  extracted_text TEXT NOT NULL DEFAULT '',
  char_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_resources_user ON public.org_resources(user_id, created_at DESC);

ALTER TABLE public.org_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own resources"
  ON public.org_resources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own resources"
  ON public.org_resources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own resources"
  ON public.org_resources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own resources"
  ON public.org_resources FOR DELETE
  USING (auth.uid() = user_id);

-- Create private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-resources', 'org-resources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can only access their own folder
CREATE POLICY "Users view own resource files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'org-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own resource files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'org-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own resource files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'org-resources' AND auth.uid()::text = (storage.foldername(name))[1]);