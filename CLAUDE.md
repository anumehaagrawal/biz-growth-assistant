# Bloom — Claude Code Guide

## Project Overview

Bloom is a full-stack web app that helps non-profits generate mission-aligned marketing content and weekly outreach plans using AI. It's a private, production application (not open-source).

**Key domain facts:**
- Target users are small non-profit teams, often volunteer-run
- AI content must sound human and mission-driven, never generic
- Every AI prompt is organization-specific (name, mission, audience, brand voice, goals, location)

---

## Architecture

### Framework
- **TanStack Start** — full-stack React metaframework built on Vite
- **TanStack Router** — file-based routing; routes live in `src/routes/`
- Server functions use `createServerFn` from `@tanstack/react-start` — these run on Cloudflare Workers, not in the browser

### Routing Conventions
Routes follow TanStack Router file-based conventions:
- `__root.tsx` — root layout (wraps everything)
- `index.tsx` — `/`
- `dashboard.tsx` — `/dashboard` layout shell
- `dashboard.content.tsx` — `/dashboard/content` (dot = nested route)
- Auth is protected via middleware in `src/integrations/supabase/auth-middleware.ts`

### Database — Supabase (PostgreSQL)

Tables (all with Row-Level Security):
- `profiles` — auto-created on signup via trigger; linked to `auth.users`
- `businesses` — org profile; one row per `user_id` (UNIQUE constraint)
- `content_pieces` — generated content history; `content_type` ∈ `{social, email, blog}`
- `outreach_plans` — weekly plans; UNIQUE on `(user_id, week_start)`

Never bypass RLS. Server-side operations use the service role client (`client.server.ts`); browser operations use the anon client (`client.ts`).

Supabase TypeScript types are in `src/integrations/supabase/types.ts`.

### AI Integration

All AI calls go through `src/utils/ai.functions.ts` using `createServerFn` (server-only).

**Gateway:** Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`)
**Model:** `google/gemini-3-flash-preview`
**Auth:** `LOVABLE_API_KEY` env var (server-side only — never expose to the browser)

Two exported server functions:
- `generateContent` — produces social posts, emails, or blog posts
- `generateOutreachPlan` — produces a structured 5-strategy weekly plan using AI tool use (function calling)

To add a new AI feature, create a new `createServerFn` in `ai.functions.ts` following the same pattern: validate input with Zod, call `callAI()`, parse the result.

---

## Code Style

- **TypeScript strict mode** — no `any` unless unavoidable (check `tsconfig.json`)
- **Prettier**: 100 char line width, double quotes, trailing commas (see `.prettierrc`)
- **ESLint**: React Hooks rules enforced; run `bun run lint` before committing
- **Path alias**: `@/` maps to `src/` (configured in `tsconfig.json` and `vite.config.ts`)
- **No comments** unless the WHY is non-obvious

### UI Components

Use Shadcn/UI components from `src/components/ui/` — do not install raw Radix primitives directly. If a component doesn't exist yet, add it via the Shadcn CLI and keep it under `src/components/ui/`.

Icons: Lucide React only.

Toast notifications: `sonner` (`import { toast } from "sonner"`).

### Forms

Use React Hook Form + Zod resolvers. Define the Zod schema first, infer the TypeScript type from it, then pass the schema to `zodResolver`.

---

## Environment Variables

| Variable | Used where | Purpose |
|---|---|---|
| `SUPABASE_URL` | client + server | Supabase project URL |
| `SUPABASE_ANON_KEY` | client (browser) | Public anon key for browser client |
| `LOVABLE_API_KEY` | server only | Lovable AI Gateway authentication |

Server-side env vars must be set as Cloudflare Worker secrets for production.

---

## Common Commands

```bash
bun run dev          # Dev server (http://localhost:3000)
bun run build        # Production build
bun run lint         # ESLint check
bun run format       # Prettier format all files
supabase db push     # Push migrations to remote Supabase project
supabase db reset    # Reset local Supabase DB and re-run all migrations
wrangler deploy      # Deploy to Cloudflare Workers
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/utils/ai.functions.ts` | All AI server functions |
| `src/integrations/supabase/client.ts` | Browser Supabase client |
| `src/integrations/supabase/client.server.ts` | Server Supabase client (service role) |
| `src/integrations/supabase/auth-middleware.ts` | Route-level auth protection |
| `src/integrations/supabase/types.ts` | Auto-generated DB TypeScript types |
| `supabase/migrations/` | All SQL migrations (run in order) |
| `wrangler.jsonc` | Cloudflare Workers config |
| `vite.config.ts` | Vite + TanStack Start config |

---

## What to Avoid

- Do not write AI prompts that could produce generic output — always inject org-specific context (name, mission, audience, brand voice)
- Do not access `process.env` in client-side code — only in `createServerFn` handlers
- Do not skip RLS — all new tables need RLS policies
- Do not use raw Radix primitives directly; use Shadcn/UI wrappers
- Do not add migrations that bypass existing triggers (`set_updated_at`, `handle_new_user`)
