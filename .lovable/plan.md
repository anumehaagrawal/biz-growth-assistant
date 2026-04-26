## Goal

When the user enters their website URL, Bloom automatically discovers all pages on the same domain, extracts text from each, and stores everything as a single combined resource for use as AI context.

## What changes for the user

- The "Fetch your website" field stays the same — just paste your homepage URL.
- After clicking Fetch, we crawl the whole site (up to ~25 pages) and show progress: "Crawling… 8 / 25 pages".
- The result appears as one resource: e.g. `yourorg.org — 18 pages crawled · 47,213 chars`.
- Re-fetching the same domain replaces the previous crawl (no duplicates).
- A small "Re-crawl" button on the resource lets users refresh anytime.

## How the crawl works (technical)

Crawler logic in `src/utils/resources.functions.ts`, replacing the current `fetchWebsiteResource`:

1. **Seed discovery** — given `https://example.org`:
   - Try `/sitemap.xml` and `/sitemap_index.xml` first; parse out `<loc>` URLs (handles nested sitemap indexes).
   - Fallback: fetch the homepage and extract same-origin `<a href>` links.
2. **BFS crawl** with strict limits:
   - Same registrable domain only (no external links).
   - Max **25 pages**, max depth **2** from seed.
   - Skip non-HTML extensions (`.pdf`, `.jpg`, `.zip`, etc.) and obvious noise paths (`/wp-admin`, `/cart`, `/login`, `?` query-only URLs, anchors).
   - Concurrency of **5** parallel fetches with `Promise.all` batches.
   - 8-second timeout per page via `AbortController`.
   - Polite `User-Agent: BloomBot/1.0`.
3. **Per-page extraction** — reuse existing `stripHtml` + `extractTitle`. Store a small structured chunk per page:
   ```
   ## About Us  (https://example.org/about)
   <cleaned text>
   ```
4. **Combine + clamp** — concatenate all pages, then apply existing `clamp()` (30k char cap). If we hit the cap, prioritize homepage + `/about` + `/mission` + `/programs` first.
5. **Store** in `org_resources` as a single row:
   - `kind: "website"`
   - `name: "example.org — 18 pages crawled"`
   - `source_url: <homepage URL>`
   - `extracted_text: <combined>`
   - Add new field `metadata jsonb` to store `{ pagesCrawled, pagesAttempted, urls: [...] }` so we can show details later.
6. **De-duplication** — before insert, delete any existing `kind='website'` row for the same hostname + same user.

## Database change

Add a `metadata jsonb` column to `org_resources` (nullable, default `{}`) via migration. Stores crawl details without bloating the main schema.

## UI changes

`src/components/ResourceManager.tsx`:
- Rename helper text under the URL field: "Paste your homepage — Bloom will read every page on your site."
- During fetch, replace the spinner-only state with a live counter sourced from a new lightweight progress mechanism: since the server function is one round-trip, we'll show a determinate-looking progress message ("Crawling your site… this can take 20–40s") plus the spinner. (Real streaming progress would require SSE — out of scope for this iteration.)
- After success: show toast `Crawled 18 pages from yourorg.org`.
- On the resource row, show `kind: website` items with a subtitle like `18 pages · 47k chars` and a small **Re-crawl** icon button that re-runs the same URL.

## Failure handling

- If sitemap and homepage both fail → mark `failed` with `"Couldn't reach that site"`.
- If homepage works but no sub-pages found → store homepage only with note `Only 1 page found`.
- Per-page failures are silently skipped; only count successes.
- Hard cap total crawl time at **45 seconds** — return what we have so far if exceeded.

## Files touched

- `src/utils/resources.functions.ts` — rewrite `fetchWebsiteResource`, add internal helpers `discoverSeedUrls`, `crawlSite`, `parseSitemap`.
- `src/components/ResourceManager.tsx` — copy update, page-count display, re-crawl button.
- New migration: `add_metadata_to_org_resources`.

## Out of scope (noted for later)

- Live streaming progress (would need SSE / Server-Sent Events).
- JavaScript-rendered sites (would need Firecrawl/headless browser).
- Per-page resource storage (user chose combined).
- Scheduled re-crawls.
