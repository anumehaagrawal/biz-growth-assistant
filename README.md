# Bloom

> AI-powered marketing assistant for non-profits, charities, and mission-driven organizations.

Bloom helps small non-profit teams tell their story with heart — generating donor appeals, volunteer call-outs, newsletters, social posts, and weekly outreach strategies in the organization's own voice, without needing a marketing team.

---

## Features

- **Content Generation** — create social posts (Instagram, LinkedIn), emails (donor appeals, volunteer outreach, newsletters), and blog/impact stories tailored to your organization's brand voice and mission
- **Weekly Outreach Plans** — AI-generated, organization-specific strategies across donor cultivation, volunteer recruitment, community partnerships, storytelling, advocacy, and grassroots tactics
- **Business Profile** — store your org's name, mission, audience, brand voice, location, and goals so every piece of content is mission-aligned
- **Content History** — browse and copy previously generated content
- **Authentication** — email/password sign-in and sign-up via Supabase Auth

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Meta-framework | TanStack Start (file-based routing via TanStack Router) |
| Styling | Tailwind CSS 4 + Shadcn/UI + Radix UI |
| Data fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Database & Auth | Supabase (PostgreSQL + Row-Level Security) |
| AI | Lovable AI Gateway → Google Gemini 3 Flash Preview |
| Runtime | Cloudflare Workers (via Wrangler) |
| Package manager | Bun |
| Build tool | Vite |

---

## Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local development)
- A [Supabase](https://supabase.com) project
- A Lovable AI Gateway API key (`LOVABLE_API_KEY`)

---

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in the values:

```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
LOVABLE_API_KEY=<your-lovable-api-key>
```

### 3. Run Supabase migrations

```bash
supabase db push
```

Or, for local development with the Supabase CLI:

```bash
supabase start
supabase db reset
```

### 4. Start the development server

```bash
bun run dev
```

The app runs at `http://localhost:3000`.

---

## Project Structure

```
src/
├── routes/                   # File-based routing (TanStack Router)
│   ├── __root.tsx            # Root layout
│   ├── index.tsx             # Landing page
│   ├── auth.tsx              # Sign in / sign up
│   ├── dashboard.tsx         # Dashboard shell & nav
│   ├── dashboard.content.tsx # Content generation
│   ├── dashboard.outreach.tsx# Weekly outreach planning
│   ├── dashboard.onboarding.tsx # Business profile setup
│   └── dashboard.settings.tsx# Settings
├── components/
│   ├── ui/                   # Shadcn/UI component library
│   └── LocationAutocomplete.tsx
├── hooks/                    # Custom React hooks
├── utils/
│   └── ai.functions.ts       # Server functions for AI calls (Lovable API)
├── integrations/
│   └── supabase/
│       ├── client.ts         # Browser Supabase client
│       ├── client.server.ts  # Server-side Supabase client
│       ├── auth-middleware.ts# Route auth protection
│       └── types.ts          # Generated DB types
├── lib/                      # Shared utilities (cn, etc.)
└── styles.css                # Tailwind CSS entry point

supabase/
└── migrations/               # SQL migration files
```

---

## Database Schema

| Table | Description |
|---|---|
| `profiles` | One per user; extends `auth.users` |
| `businesses` | Organization profile (one per user) |
| `content_pieces` | History of generated content |
| `outreach_plans` | Weekly outreach strategies (one per user per week) |

All tables use Row-Level Security — users can only access their own data.

---

## Available Scripts

```bash
bun run dev          # Start development server
bun run build        # Production build
bun run preview      # Preview production build locally
bun run lint         # ESLint
bun run format       # Prettier format
```

---

## Deployment

Bloom deploys to **Cloudflare Workers** via Wrangler:

```bash
bun run build
wrangler deploy
```

Ensure all environment variables are set as [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

---

## License

Private — all rights reserved.
