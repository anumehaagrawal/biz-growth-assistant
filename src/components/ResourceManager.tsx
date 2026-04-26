import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useServerFn } from "@tanstack/react-start";
import { uploadResource, fetchWebsiteResource, deleteResource } from "@/utils/resources.functions";
import { toast } from "sonner";
import { Upload, Globe, FileText, Trash2, Loader2, CheckCircle2, AlertCircle, Link as LinkIcon, RefreshCw } from "lucide-react";

type Resource = {
  id: string;
  kind: "file" | "website";
  name: string;
  status: "processing" | "ready" | "failed";
  char_count: number;
  error: string | null;
  created_at: string;
  source_url: string | null;
  metadata: { pagesCrawled?: number; urls?: string[]; hostname?: string } | null;
};

const ACCEPTED = ".pdf,.docx,.txt,.md";
const MAX_FILES = 10;

export function ResourceManager() {
  const { user } = useAuth();
  const uploadFn = useServerFn(uploadResource);
  const fetchFn = useServerFn(fetchWebsiteResource);
  const deleteFn = useServerFn(deleteResource);

  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("org_resources")
      .select("id,kind,name,status,char_count,error,created_at,source_url,metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setResources((data ?? []) as Resource[]);
    setLoading(false);
  };

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (resources.length + list.length > MAX_FILES) {
      toast.error(`You can have at most ${MAX_FILES} resources.`);
      return;
    }
    setUploading(true);
    for (const file of list) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const result = await uploadFn({ data: fd });
        if (result.status === "ready") {
          toast.success(`Added "${result.name}"`);
        } else {
          toast.error(`"${result.name}": ${result.error || "Couldn't read this file"}`);
        }
      } catch (e: any) {
        toast.error(e.message || `Upload failed for ${file.name}`);
      }
      await refresh();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFetchWebsite = async (overrideUrl?: string) => {
    const url = (overrideUrl ?? websiteUrl).trim();
    if (!url) return;
    if (!overrideUrl && resources.length >= MAX_FILES) {
      toast.error(`You can have at most ${MAX_FILES} resources.`);
      return;
    }
    setFetchingUrl(true);
    try {
      const result: any = await fetchFn({ data: { url } });
      if (result.status === "ready") {
        const pages = result.pagesCrawled ?? 1;
        toast.success(
          pages > 1
            ? `Crawled ${pages} pages from ${result.name.split(" — ")[0]}`
            : `Fetched "${result.name}"`
        );
        if (!overrideUrl) setWebsiteUrl("");
      } else {
        toast.error(result.error || "Couldn't fetch that page");
      }
      await refresh();
    } catch (e: any) {
      toast.error(e.message || "Couldn't fetch that page");
    } finally {
      setFetchingUrl(false);
    }
  };

  const handleRecrawl = (resource: Resource) => {
    if (!resource.source_url) return;
    handleFetchWebsite(resource.source_url);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFn({ data: { id } });
      setResources((prev) => prev.filter((r) => r.id !== id));
      toast.success("Removed");
    } catch (e: any) {
      toast.error(e.message || "Couldn't remove");
    }
  };

  return (
    <div className="space-y-5">
      {/* Website fetch */}
      <div>
        <Label className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5" /> Fetch your website
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Pull text from your homepage or a page like /about. Bloom will use it as context.
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            type="url"
            placeholder="https://yourorg.org/about"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            disabled={fetchingUrl}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleFetchWebsite();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleFetchWebsite}
            disabled={fetchingUrl || !websiteUrl.trim()}
            className="rounded-full"
          >
            {fetchingUrl ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LinkIcon className="mr-1.5 h-4 w-4" /> Fetch
              </>
            )}
          </Button>
        </div>
      </div>

      {/* File upload dropzone */}
      <div>
        <Label className="flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Upload resource files
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          PDFs, Word docs, or text files (max 10 MB each). Annual reports, mission docs, brochures, program one-pagers — anything that helps Bloom write in your voice.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
          className={`mt-2 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-sm transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50"
          } ${uploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          {uploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium text-ink">Uploading & extracting…</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium text-ink">Click to upload, or drag files here</span>
              <span className="text-xs text-muted-foreground">PDF · DOCX · TXT · MD</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          }}
        />
      </div>

      {/* List */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Your resources</Label>
          <span className="text-xs text-muted-foreground">{resources.length}/{MAX_FILES}</span>
        </div>
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
        ) : resources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
            No resources yet. Add some so Bloom can write from your real materials.
          </div>
        ) : (
          <ul className="space-y-2">
            {resources.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-secondary">
                  {r.kind === "website" ? (
                    <Globe className="h-4 w-4 text-primary" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{r.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {r.status === "processing" && (
                      <span className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Processing
                      </span>
                    )}
                    {r.status === "ready" && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> Ready · {r.char_count.toLocaleString()} chars
                      </span>
                    )}
                    {r.status === "failed" && (
                      <span className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3 w-3" /> {r.error || "Failed"}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(r.id)}
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
