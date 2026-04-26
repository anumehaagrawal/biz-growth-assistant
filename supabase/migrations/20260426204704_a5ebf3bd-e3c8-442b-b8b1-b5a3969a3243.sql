-- Posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT NOT NULL,
  prompt TEXT,
  org_name TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_published_created ON public.posts(published, created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published posts"
  ON public.posts FOR SELECT
  USING (published = true);

CREATE POLICY "Owners can view all own posts"
  ON public.posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert own posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket for post media (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

CREATE POLICY "Users can upload to own folder in post-media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own files in post-media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files in post-media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );