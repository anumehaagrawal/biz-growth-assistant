# Bloom — AI Content Generator for Non-Profits

## Overview

Bloom is a full-stack web app that helps non-profit staff generate marketing content (social posts, emails, blog posts, and photo posts) using AI. It is currently being built for the BGC (Boys & Girls Clubs) hackathon use case, where club staff upload photos/videos of activities and generate branded social posts, shareable pages, and email content with zero training required.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | TanStack Start (React 19, SSR) |
| Build | Vite 7 + Bun |
| Language | TypeScript 5.8 (strict) |
| UI | shadcn/ui (New York style) + Radix UI |
| Styling | Tailwind CSS 4 (warm oklch palette) |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Lovable AI Gateway → Google Gemini-3-Flash-Preview |
| Routing | TanStack React Router (file-based) |
| State | TanStack React Query |
| Forms | React Hook Form + Zod |
| Toasts | Sonner |

## Running Locally

```bash
bun install
bun dev
```

Environment variables needed (`.env.local`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
LOVABLE_API_KEY=...
```

Apply DB migrations:
```bash
supabase db push
```

## Key Architecture Patterns

### Server Functions (AI, DB writes)
Use `createServerFn` from `@tanstack/react-start` for any server-side logic (AI calls, sensitive operations).
Call them on the client with `useServerFn()`.

```ts
// Define (server-side)
export const myFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ... }))
  .handler(async ({ data }) => { ... });

// Call (client-side)
const fn = useServerFn(myFn);
await fn({ data: { ... } });
```

### AI Calls
All AI calls go through `callAI()` in `src/utils/ai.functions.ts`. It hits the Lovable AI Gateway:
- URL: `https://ai.gateway.lovable.dev/v1/chat/completions`
- Model: `google/gemini-3-flash-preview`
- Auth: `LOVABLE_API_KEY` env var (server-only)
- Vision messages: use `content: [{ type: "image_url", image_url: { url } }, { type: "text", text }]`

### Supabase Client
- Browser client: `src/integrations/supabase/client.ts` (import `supabase`)
- Server client: `src/integrations/supabase/client.server.ts`
- Storage uploads: `supabase.storage.from('club-media').upload(path, file)`

### File-Based Routing
Routes live in `src/routes/`. Dashboard routes follow the pattern `dashboard.{tab}.tsx`.
The dashboard layout is `dashboard.tsx`; child routes render via `<Outlet />`.

### UI Conventions
- Card containers: `rounded-3xl border border-border bg-card p-6 shadow-soft`
- Primary buttons: `size="lg" className="rounded-full shadow-warm"`
- Loading state: `<Loader2 className="animate-spin" />`
- Toast: `toast.success(...)` / `toast.error(...)` from sonner
- Copy to clipboard: `navigator.clipboard.writeText(text)` then `toast.success("Copied")`
- Theme colors: `text-ink` (body), `text-muted-foreground` (secondary), `text-primary` (accent)
- Font: `font-display` for headings (Fraunces), default for body (Plus Jakarta Sans)

## File Map

```
src/
├── routes/
│   ├── __root.tsx               # HTML shell
│   ├── index.tsx                # Landing page
│   ├── auth.tsx                 # Sign in / sign up
│   ├── dashboard.tsx            # Dashboard layout + nav
│   ├── dashboard.content.tsx    # Content generation tab (Social/Email/Blog/Photo)
│   ├── dashboard.outreach.tsx   # Weekly outreach plan tab
│   ├── dashboard.settings.tsx   # Organization settings tab
│   ├── dashboard.onboarding.tsx # First-time setup (required before dashboard)
│   └── post.$postId.tsx         # Public shareable post page (no auth)
├── components/
│   ├── PhotoPostCreator.tsx     # Media upload + AI caption + share component
│   ├── LocationAutocomplete.tsx # Location search (Nominatim)
│   └── ui/                     # 48+ shadcn/ui components
├── hooks/
│   ├── useAuth.ts               # Supabase auth state
│   └── use-mobile.tsx           # Mobile detection
├── utils/
│   └── ai.functions.ts          # All AI server functions (generateContent, generateMediaCaption, etc.)
├── integrations/supabase/
│   ├── client.ts                # Browser Supabase client
│   ├── client.server.ts         # Server Supabase client
│   └── types.ts                 # Auto-generated DB types
└── styles.css                   # Tailwind + custom theme
supabase/migrations/             # SQL migrations (apply with `supabase db push`)
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Auto-created on signup, stores display name |
| `businesses` | One per user, stores org name/mission/voice/goals |
| `content_pieces` | History of AI-generated text content (social/email/blog) |
| `outreach_plans` | Weekly 5-strategy outreach plans (JSONB) |
| `media_posts` | Photo/video posts with AI captions, publishable to public page |

All tables use Row Level Security. Users can only access their own rows.
`media_posts` additionally allows public SELECT when `is_published = true`.

## Supabase Storage

Bucket: `club-media` (public reads, authenticated writes)
Upload path pattern: `{userId}/{uuid}.{ext}`
Get public URL: `supabase.storage.from('club-media').getPublicUrl(path).data.publicUrl`

## What's Currently Built

- Auth (email/password via Supabase)
- Onboarding (org profile setup)
- Content tab: AI text generation for Social/Email/Blog posts
- Outreach tab: AI-generated weekly 5-strategy outreach plan
- Settings tab: Edit org profile
- Photo Post tab: Upload media → AI vision caption → Instagram-style preview → publish + email share

## Conventions

- No comments unless the WHY is non-obvious
- No `any` types — use proper TypeScript
- Prefer editing existing files to creating new ones
- shadcn/ui components only from `@/components/ui/`
- No new dependencies without strong justification
