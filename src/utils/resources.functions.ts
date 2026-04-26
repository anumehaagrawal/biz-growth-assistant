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

// ============= FETCH WEBSITE =============
export const fetchWebsiteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      url: z.string().trim().min(1).max(500).url("Please enter a valid URL"),
    })
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    let { url } = data;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;

    const { data: row, error: insertError } = await supabaseAdmin
      .from("org_resources")
      .insert({
        user_id: userId,
        kind: "website",
        name: `Website: ${new URL(url).hostname}`,
        source_url: url,
        status: "processing",
      })
      .select()
      .single();
    if (insertError || !row) throw new Error(insertError?.message || "Failed to create record");

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; BloomBot/1.0; +https://lovable.dev)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      if (!res.ok) throw new Error(`Site returned ${res.status}`);
      const html = await res.text();
      const title = extractTitle(html);
      const text = stripHtml(html);
      if (!text || text.length < 50) throw new Error("Couldn't find readable text on that page");
      const clean = clamp(text);

      const displayName = title ? `${title} — ${new URL(url).hostname}` : `Website: ${new URL(url).hostname}`;

      await supabaseAdmin
        .from("org_resources")
        .update({
          name: displayName,
          extracted_text: clean,
          char_count: clean.length,
          status: "ready",
          error: null,
        })
        .eq("id", row.id);

      return { id: row.id, name: displayName, charCount: clean.length, status: "ready" as const };
    } catch (e: any) {
      await supabaseAdmin
        .from("org_resources")
        .update({ status: "failed", error: e.message?.slice(0, 500) ?? "Fetch failed" })
        .eq("id", row.id);
      return { id: row.id, name: row.name, charCount: 0, status: "failed" as const, error: e.message };
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
