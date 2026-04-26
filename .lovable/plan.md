## Goal

Let an org enrich its profile with **a website link** and **uploaded resource files** (PDFs, docs, text). Bloom extracts text from each, stores it as searchable context, and feeds it into every Content and Outreach generation so the AI writes from the org's actual materials (annual reports, mission docs, brochures, etc.).

## What the user will see

**Onboarding & Settings → Organization page:**
- A "Website link" field (already present in onboarding, will also be added to Settings).
- A new **"Resources"** section with:
  - A **drag-and-drop / "Upload files"** button (PDF, DOCX, TXT, MD — up to 10MB each, max 10 files).
  - A list of uploaded files showing name, size, status (Processing / Ready / Failed), and a delete button.
  - A **"Fetch website"** button next to the URL field — pulls the page text once and stores it as a resource called "Website: yoursite.org".

**Content & Outreach tabs:**
- Small banner: *"Using 4 resources as context · manage in Settings"* so users know their materials are being used.
- AI output noticeably reflects the org's own language, programs, and stats from uploaded docs.

## How it works

```text
Settings page
   │
   ├── Upload file ──► server fn: uploadResource
   │                     • saves file to Storage bucket
   │                     • extracts text (PDF/DOCX/TXT)
   │                     • stores text in org_resources table
   │
   ├── Fetch website ─► server fn: fetchWebsiteResource
   │                     • fetches URL, strips HTML to text
   │                     • stores as org_resources row
   │
   └── Delete ────────► removes Storage file + DB row

Content / Outreach generation
   │
   └── pulls business profile + all org_resources rows
       ──► sends combined context to Lovable AI
```

## Database & storage changes

**New table `org_resources`** (with RLS — user can only see their own):
- `id`, `user_id`, `business_id`
- `kind` (`'file'` or `'website'`)
- `name` (filename or page title)
- `source_url` (storage path or website URL)
- `extracted_text` (the parsed content used as AI context)
- `char_count`, `status` (`'processing' | 'ready' | 'failed'`), `error`
- `created_at`

**New Storage bucket `org-resources`** (private), with RLS so users only access files under their own `user_id/` prefix.

**Settings table update**: add `website` to the editable fields (already in DB schema, just not in the Settings UI today).

## Server functions (in `src/utils/ai.functions.ts` + new `src/utils/resources.functions.ts`)

1. **`uploadResource`** — accepts file (FormData), uploads to Storage, extracts text:
   - PDF → `pdfjs-dist` (legacy build, works in Worker runtime).
   - DOCX → `mammoth`.
   - TXT/MD → read as string.
   - Truncates to ~30k chars per file to stay under AI context limits.
2. **`fetchWebsiteResource`** — fetches URL server-side, strips HTML tags, takes first ~30k chars.
3. **`deleteResource`** — removes Storage object + DB row.
4. **`generateContent` & `generateOutreachPlan`** — extended to accept a `resources: { name, text }[]` array. The system prompt gains a new section:
   > *"REFERENCE MATERIALS from the organization (use facts, language, and tone from these — do not invent statistics):"*
   > followed by each resource truncated to a fair share of a ~60k-char total budget.

## Frontend changes

- **New component** `src/components/ResourceManager.tsx` — handles file dropzone, upload progress, list, delete, and "Fetch website" button. Reused in Onboarding (optional, skippable) and Settings (primary location).
- **`dashboard.settings.tsx`** — add Website field + `<ResourceManager />` section.
- **`dashboard.onboarding.tsx`** — after the existing form, add an optional "Add resources now (or later in Settings)" step with `<ResourceManager />`.
- **`dashboard.content.tsx`** & **`dashboard.outreach.tsx`** — fetch `org_resources` (status='ready') alongside the business profile and pass them to the server function. Show the "Using N resources" indicator.

## Notes & tradeoffs

- **PDF parsing in the Worker runtime**: `pdfjs-dist` legacy build is Worker-compatible. If a particular PDF fails (scanned/image-only), we mark it `failed` with a clear message — we will not run OCR.
- **Context size**: total resource text injected per AI call capped at ~60k chars; oldest/largest resources get trimmed first. Keeps responses fast and within model limits.
- **Privacy**: bucket is private; only the owning user can read their files via signed URLs (not exposed to anyone else).
- **No extra cost setup**: uses existing Lovable Cloud storage + Lovable AI — no new API keys.

## Out of scope (can do later if you want)

- OCR for scanned PDFs.
- Per-resource toggle ("use this for content but not outreach").
- Re-fetching the website on a schedule.
- Embeddings / RAG retrieval (current approach injects all resource text directly — simpler and works well up to ~10 documents).
