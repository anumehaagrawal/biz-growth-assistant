
-- Storage bucket for uploaded club media (public reads, authenticated writes)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('club-media', 'club-media', true)
  ON CONFLICT DO NOTHING;

CREATE POLICY "Public read club media" ON storage.objects
  FOR SELECT USING (bucket_id = 'club-media');

CREATE POLICY "Auth upload club media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'club-media');

CREATE POLICY "Auth delete own club media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'club-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Media posts: photo/video uploads with AI-generated captions
CREATE TABLE public.media_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url    TEXT NOT NULL,
  media_type   TEXT NOT NULL DEFAULT 'image',
  caption      TEXT,
  platform     TEXT DEFAULT 'instagram',
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own media posts" ON public.media_posts
  FOR ALL USING (auth.uid() = user_id);

-- Public SELECT allows the share page (/post/:id) to load without auth
CREATE POLICY "Public view published posts" ON public.media_posts
  FOR SELECT USING (is_published = true);
