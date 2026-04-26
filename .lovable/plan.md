## Goal

Add a "Posts" creator under the Content tab where the user uploads an image or video, gets an AI-generated caption based on the media + a short brief, previews it as a social-style post card, publishes it to a public gallery on the site, and shares the published link via their email client.

## What gets built

### 1. Database (one new table + one storage bucket)

**`posts` table**
- `id uuid pk`, `user_id uuid`, `business_id uuid` (nullable)
- `slug text unique` (used in `/p/:slug`)
- `media_url text`, `media_type text` ('image' | 'video')
- `caption text`, `prompt text`
- `published boolean default true`
- `created_at timestamptz default now()`
- RLS: owner can CRUD their rows; **public SELECT allowed where `published = true`** so the gallery/detail pages work for unauthenticated visitors.

**Storage bucket `post-media`** (public read)
- RLS: authenticated users can insert/update/delete only inside their own `user_id/...` prefix; anyone can read.

### 2. AI caption generation (server function)

Add `generatePostCaption` to `src/utils/ai.functions.ts`:
- Input: `mediaUrl`, `mediaType`, `brief`, `platform`, business profile, org resources.
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a multimodal message — for images, send the public storage URL as an `image_url` content part so the model actually looks at it. For videos, fall back to brief-only (Gateway image input only).
- Returns `{ caption }` written in the org's brand voice with hashtags + CTA.

### 3. New UI component: `PostComposer`

Lives in `src/components/PostComposer.tsx`, mounted as a 4th tab inside the existing Tabs in `dashboard.content.tsx` (Social / Email / Blog / **Post**).

Flow:
1. **Upload** — drag/drop or file picker. Validates type (image/* or video/*) and size (≤ 20MB). Uploads to `post-media/{user_id}/{uuid}.{ext}`, stores public URL.
2. **Brief** — short textarea ("What's this post about?") + platform style chooser (Instagram / Facebook / LinkedIn — only changes caption tone).
3. **Generate caption** — calls `generatePostCaption`. User can edit the result inline.
4. **Preview card** — Instagram-style card: org avatar/name, square media, caption, like/comment icons (visual only). Reuses the brand styling already in the app.
5. **Publish** — inserts row into `posts` with a generated slug (`{slugified-first-words}-{shortid}`). Shows the public URL `/p/:slug` with copy button.
6. **Share via email** — opens `mailto:` with:
   - `to=` comma-joined recipients from a tag-input (validates each address with zod)
   - `subject=` first line of caption (truncated)
   - `body=` caption + blank line + public URL

### 4. Public pages (new routes, no auth required)

- **`src/routes/p.$slug.tsx`** — fetches the post by slug (via the public RLS read policy using the anon client), renders the same post card full-width with org name, media, caption, and a small "Made with Bloom" footer. `head()` sets per-route og:title (caption first line), og:description, and **og:image = `media_url`** when the post has an image (omitted for videos).
- **`src/routes/posts.tsx`** — public gallery listing all `published = true` posts (most recent first), grid of post cards each linking to `/p/:slug`. Has its own `head()` metadata.

These routes do NOT live under `/dashboard/*` so they're publicly accessible. They use the regular `supabase` browser client; the public RLS policy lets the read succeed without a session.

### 5. "My posts" panel (in dashboard)

Below the composer, list the user's existing posts (thumbnail + caption snippet + public link + delete button). Replaces nothing — sits alongside the existing "Recent" content history.

## Files to add / change

**New**
- `src/components/PostComposer.tsx` — upload + brief + caption + preview + publish + email share
- `src/routes/p.$slug.tsx` — public single-post page
- `src/routes/posts.tsx` — public gallery
- One migration: create `posts` table, RLS policies, storage bucket + storage policies

**Edited**
- `src/utils/ai.functions.ts` — add `generatePostCaption` server fn (multimodal Gemini call)
- `src/routes/dashboard.content.tsx` — add a 4th "Post" tab that renders `<PostComposer />`

## Technical notes

- Caption generation runs server-side via `createServerFn` (same pattern as the existing `generateContent`) so the API key stays on the server.
- For Gemini multimodal: send `{ type: "image_url", image_url: { url: mediaUrl } }` alongside the text prompt; the public storage URL is fetched by the gateway. Videos skip this step and use brief-only.
- Slugs are generated client-side from the first ~5 words of the caption + a 6-char nanoid suffix to guarantee uniqueness.
- Email recipients validated with `z.string().email()` per address; capped at 20 recipients to keep `mailto:` URLs under browser length limits.
- Public routes set per-page `head()` (title, description, og:title, og:description, og:image for image posts) so shared links get proper previews.
