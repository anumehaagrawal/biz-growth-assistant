import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_CHARS_PER_RESOURCE = 30_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function clamp(text: string, max = MAX_CHARS_PER_RESOURCE) {
  const cleaned = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned.length > max ? cleaned.slice(0, max) + "\n\n[...truncated]" : cleaned;
}

async function extractFromPdf(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : text;
}

async function extractFromDocx(bytes: Uint8Array): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({
    // mammoth in Node accepts a Buffer; in workers, ArrayBuffer works too
    arrayBuffer: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  });
  return result.value;
}

function stripHtml(html: string): string {
  // Remove scripts/styles entirely, then strip tags
  const noScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, " ");
  const text = noScripts
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

// ============= UPLOAD FILE =============
export const uploadResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    if (!(input instanceof FormData)) throw new Error("Expected FormData");
    const file = input.get("file");
    if (!(file instanceof File)) throw new Error("No file provided");
    if (file.size > MAX_FILE_SIZE) throw new Error("File too large (max 10 MB)");
    return { file };
  })
  .handler(async ({ data, context }) => {
    const { file } = data;
    const { userId } = context;

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    const objectPath = `${userId}/${Date.now()}_${safeName}`;

    // 1. Upload to storage
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from("org-resources")
      .upload(objectPath, bytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // 2. Insert resource row (processing)
    const { data: row, error: insertError } = await supabaseAdmin
      .from("org_resources")
      .insert({
        user_id: userId,
        kind: "file",
        name: file.name,
        source_url: objectPath,
        status: "processing",
      })
      .select()
      .single();
    if (insertError || !row) {
      await supabaseAdmin.storage.from("org-resources").remove([objectPath]);
      throw new Error(insertError?.message || "Failed to create record");
    }

    // 3. Extract text based on type
    try {
      const lower = file.name.toLowerCase();
      let text = "";
      if (lower.endsWith(".pdf") || file.type === "application/pdf") {
        text = await extractFromPdf(bytes);
      } else if (lower.endsWith(".docx") || file.type.includes("wordprocessingml")) {
        text = await extractFromDocx(bytes);
      } else if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type.startsWith("text/")) {
        text = new TextDecoder("utf-8").decode(bytes);
      } else {
        throw new Error("Unsupported file type. Use PDF, DOCX, TXT, or MD.");
      }

      const clean = clamp(text);
      if (!clean || clean.length < 20) throw new Error("No readable text found (is the PDF a scanned image?)");

      await supabaseAdmin
        .from("org_resources")
        .update({ extracted_text: clean, char_count: clean.length, status: "ready", error: null })
        .eq("id", row.id);

      return { id: row.id, name: row.name, charCount: clean.length, status: "ready" as const };
    } catch (e: any) {
      await supabaseAdmin
        .from("org_resources")
        .update({ status: "failed", error: e.message?.slice(0, 500) ?? "Extraction failed" })
        .eq("id", row.id);
      return { id: row.id, name: row.name, charCount: 0, status: "failed" as const, error: e.message };
    }
  });

// ============= CRAWLER HELPERS =============
const MAX_PAGES = 25;
const MAX_DEPTH = 2;
const CONCURRENCY = 5;
const PAGE_TIMEOUT_MS = 8000;
const TOTAL_TIMEOUT_MS = 45_000;
const SKIP_EXTENSIONS = /\.(pdf|jpe?g|png|gif|webp|svg|ico|mp4|mp3|wav|zip|rar|7z|tar|gz|css|js|woff2?|ttf|eot|xml|json|csv|xlsx?|docx?|pptx?)(\?|$)/i;
const SKIP_PATHS = /\/(wp-admin|wp-login|wp-json|cart|checkout|account|login|signin|sign-in|signup|sign-up|register|logout|admin|feed|tag\/|category\/|author\/|search|api\/|cdn-cgi)/i;
const PRIORITY_PATHS = /\/(about|mission|programs?|services?|impact|story|stories|work|what-we-do|who-we-are|contact|team)/i;

const UA = "Mozilla/5.0 (compatible; BloomBot/1.0; +https://lovable.dev)";

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    // drop trailing slash for de-dup, but preserve "/"
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return null;
  }
}

function shouldCrawl(url: string, hostname: string): boolean {
  try {
    const u = new URL(url);
    if (u.hostname !== hostname && !u.hostname.endsWith("." + hostname)) return false;
    if (SKIP_EXTENSIONS.test(u.pathname)) return false;
    if (SKIP_PATHS.test(u.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, ms = PAGE_TIMEOUT_MS): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function parseSitemap(xml: string, hostname: string, deadline: number): Promise<string[]> {
  const urls: string[] = [];
  // Sitemap index — recurse into nested sitemaps
  const sitemapMatches = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi)];
  if (sitemapMatches.length > 0) {
    for (const m of sitemapMatches.slice(0, 5)) {
      if (Date.now() > deadline) break;
      const sub = await fetchWithTimeout(m[1].trim());
      if (sub?.ok) {
        const subXml = await sub.text();
        urls.push(...(await parseSitemap(subXml, hostname, deadline)));
      }
    }
    return urls;
  }
  // Regular sitemap
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    const norm = normalizeUrl(m[1].trim(), `https://${hostname}`);
    if (norm && shouldCrawl(norm, hostname)) urls.push(norm);
  }
  return urls;
}

async function discoverSeedUrls(homepage: string, hostname: string, deadline: number): Promise<string[]> {
  const seeds = new Set<string>([homepage]);
  // Try sitemaps first
  for (const path of ["/sitemap.xml", "/sitemap_index.xml"]) {
    if (Date.now() > deadline) break;
    const res = await fetchWithTimeout(`https://${hostname}${path}`);
    if (res?.ok) {
      const xml = await res.text();
      const found = await parseSitemap(xml, hostname, deadline);
      for (const u of found) seeds.add(u);
      if (seeds.size > 1) break;
    }
  }
  return [...seeds];
}

function extractLinks(html: string, base: string, hostname: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\s+[^>]*href=["']([^"']+)["']/gi)) {
    const norm = normalizeUrl(m[1], base);
    if (norm && shouldCrawl(norm, hostname)) out.push(norm);
  }
  return out;
}

function priorityScore(url: string): number {
  try {
    const p = new URL(url).pathname;
    if (p === "" || p === "/") return 100;
    if (PRIORITY_PATHS.test(p)) return 50;
    return 10 - Math.min(p.split("/").length, 9); // shallower = higher
  } catch {
    return 0;
  }
}

type CrawledPage = { url: string; title: string | null; text: string };

async function crawlSite(homepage: string): Promise<CrawledPage[]> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  const hostname = new URL(homepage).hostname;
  const seeds = await discoverSeedUrls(homepage, hostname, deadline);

  // Sort seeds by priority so important pages get crawled first
  seeds.sort((a, b) => priorityScore(b) - priorityScore(a));

  const visited = new Set<string>();
  const queue: { url: string; depth: number }[] = seeds.slice(0, MAX_PAGES * 2).map((url) => ({ url, depth: 0 }));
  const results: CrawledPage[] = [];

  while (queue.length > 0 && results.length < MAX_PAGES && Date.now() < deadline) {
    // Take a batch of up to CONCURRENCY unvisited URLs
    const batch: { url: string; depth: number }[] = [];
    while (queue.length > 0 && batch.length < CONCURRENCY) {
      const item = queue.shift()!;
      if (visited.has(item.url)) continue;
      visited.add(item.url);
      batch.push(item);
    }
    if (batch.length === 0) break;

    const remaining = MAX_PAGES - results.length;
    const fetched = await Promise.all(
      batch.slice(0, remaining).map(async ({ url, depth }) => {
        const res = await fetchWithTimeout(url);
        if (!res?.ok) return null;
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("html") && !ct.includes("xml")) return null;
        const html = await res.text();
        return { url, depth, html };
      })
    );

    for (const item of fetched) {
      if (!item) continue;
      const { url, depth, html } = item;
      const title = extractTitle(html);
      const text = stripHtml(html);
      if (text && text.length >= 50) {
        results.push({ url, title, text });
      }
      // Discover more links if we haven't hit depth limit and still need pages
      if (depth < MAX_DEPTH && results.length < MAX_PAGES) {
        const links = extractLinks(html, url, hostname);
        // Sort by priority and add unique unvisited ones
        links.sort((a, b) => priorityScore(b) - priorityScore(a));
        for (const link of links.slice(0, 30)) {
          if (!visited.has(link)) queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  return results;
}

function combinePages(pages: CrawledPage[], hostname: string): string {
  // Sort by priority so most important content is at the top (survives clamping)
  const sorted = [...pages].sort((a, b) => priorityScore(b.url) - priorityScore(a.url));
  const sections = sorted.map((p) => {
    const heading = p.title ? `## ${p.title}` : `## ${new URL(p.url).pathname || "/"}`;
    return `${heading}\n(${p.url})\n\n${p.text}`;
  });
  return `# ${hostname} — site content (${pages.length} pages)\n\n${sections.join("\n\n---\n\n")}`;
}

// ============= FETCH WEBSITE (CRAWL) =============
export const fetchWebsiteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      url: z.string().trim().min(1).max(500),
    })
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    let raw = data.url.trim();
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    let homepage: string;
    let hostname: string;
    try {
      const u = new URL(raw);
      hostname = u.hostname;
      homepage = `${u.protocol}//${u.hostname}${u.pathname.endsWith("/") && u.pathname.length > 1 ? u.pathname.slice(0, -1) : u.pathname}`;
    } catch {
      return { id: "", name: raw, charCount: 0, status: "failed" as const, error: "That doesn't look like a valid URL" };
    }

    // De-dup: remove any prior website crawl for this hostname + user
    await supabaseAdmin
      .from("org_resources")
      .delete()
      .eq("user_id", userId)
      .eq("kind", "website")
      .ilike("source_url", `%${hostname}%`);

    // Insert processing row
    const { data: row, error: insertError } = await supabaseAdmin
      .from("org_resources")
      .insert({
        user_id: userId,
        kind: "website",
        name: `Crawling ${hostname}…`,
        source_url: homepage,
        status: "processing",
      })
      .select()
      .single();
    if (insertError || !row) {
      return { id: "", name: hostname, charCount: 0, status: "failed" as const, error: insertError?.message || "Failed to create record" };
    }

    try {
      const pages = await crawlSite(homepage);

      if (pages.length === 0) {
        await supabaseAdmin
          .from("org_resources")
          .update({ status: "failed", error: "Couldn't reach that site or no readable text found" })
          .eq("id", row.id);
        return { id: row.id, name: hostname, charCount: 0, status: "failed" as const, error: "Couldn't reach that site" };
      }

      const combined = combinePages(pages, hostname);
      const clean = clamp(combined);
      const displayName =
        pages.length === 1
          ? `${hostname} — 1 page`
          : `${hostname} — ${pages.length} pages crawled`;

      await supabaseAdmin
        .from("org_resources")
        .update({
          name: displayName,
          extracted_text: clean,
          char_count: clean.length,
          status: "ready",
          error: pages.length === 1 ? "Only 1 page found" : null,
          metadata: {
            pagesCrawled: pages.length,
            urls: pages.map((p) => p.url),
            hostname,
          },
        })
        .eq("id", row.id);

      return {
        id: row.id,
        name: displayName,
        charCount: clean.length,
        status: "ready" as const,
        pagesCrawled: pages.length,
      };
    } catch (e: any) {
      await supabaseAdmin
        .from("org_resources")
        .update({ status: "failed", error: e.message?.slice(0, 500) ?? "Crawl failed" })
        .eq("id", row.id);
      return { id: row.id, name: hostname, charCount: 0, status: "failed" as const, error: e.message };
    }
  });


// ============= DELETE =============
export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("org_resources")
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (!row) throw new Error("Resource not found");

    if (row.kind === "file" && row.source_url) {
      await supabaseAdmin.storage.from("org-resources").remove([row.source_url]);
    }
    await supabaseAdmin.from("org_resources").delete().eq("id", data.id).eq("user_id", userId);
    return { success: true };
  });
