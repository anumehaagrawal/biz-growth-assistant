import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Loader2, Upload, Sparkles, Send, Trash2, Copy, ExternalLink, X, Heart, MessageCircle, Bookmark, Image as ImageIcon, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generatePostCaption } from "@/utils/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

type Platform = "instagram" | "facebook" | "linkedin";
type MediaType = "image" | "video";

type PostRow = {
  id: string;
  slug: string;
  media_url: string;
  media_type: MediaType;
  caption: string;
  org_name: string | null;
  created_at: string;
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const emailSchema = z.string().trim().email();

function slugify(text: string) {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-")
    .slice(0, 60);
  const suffix = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "").slice(0, 6);
  return `${base || "post"}-${suffix}`;
}

function postPublicUrl(slug: string) {
  if (typeof window === "undefined") return `/p/${slug}`;
  return `${window.location.origin}/p/${slug}`;
}

export function PostComposer() {
  const { user } = useAuth();
  const generateCaptionFn = useServerFn(generatePostCaption);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);
  const [uploading, setUploading] = useState(false);
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [caption, setCaption] = useState("");
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [posts, setPosts] = useState<PostRow[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("businesses")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setOrgName(data?.name ?? ""));
    refreshPosts();
  }, [user]);

  const refreshPosts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("posts")
      .select("id,slug,media_url,media_type,caption,org_name,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);
    setPosts((data ?? []) as PostRow[]);
  };

  const reset = () => {
    setMediaUrl(null);
    setMediaType(null);
    setBrief("");
    setCaption("");
    setPublishedSlug(null);
    setEmails([]);
    setEmailInput("");
  };

  const handleFile = async (file: File) => {
    if (!user) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Please upload an image or video file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is too large (max 20MB)");
      return;
    }

    setUploading(true);
    setPublishedSlug(null);
    try {
      const ext = (file.name.split(".").pop() || (isImage ? "jpg" : "mp4")).toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
      setMediaUrl(pub.publicUrl);
      setMediaType(isImage ? "image" : "video");
      toast.success("Media uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const generate = async () => {
    if (!user || !mediaUrl || !mediaType) return;
    setGenerating(true);
    try {
      const [{ data: business }, { data: resources }] = await Promise.all([
        supabase.from("businesses").select("*").eq("user_id", user.id).single(),
        supabase
          .from("org_resources")
          .select("name,extracted_text")
          .eq("user_id", user.id)
          .eq("status", "ready"),
      ]);
      if (!business) throw new Error("Set up your organization profile first");

      const { caption: out } = await generateCaptionFn({
        data: {
          business: {
            name: business.name,
            industry: business.industry,
            description: business.description,
            target_audience: business.target_audience,
            brand_voice: business.brand_voice,
            goals: business.goals,
            location: business.location,
            website: business.website,
          },
          mediaUrl,
          mediaType,
          brief,
          platform,
          resources: (resources ?? [])
            .filter((r) => r.extracted_text && r.extracted_text.length > 0)
            .map((r) => ({ name: r.name, text: r.extracted_text })),
        },
      });
      setCaption(out);
      toast.success("Caption ready — edit as you like");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't generate caption");
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!user || !mediaUrl || !mediaType || !caption.trim()) return;
    setPublishing(true);
    try {
      const slug = slugify(caption);
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        slug,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption.trim(),
        prompt: brief,
        org_name: orgName || null,
        published: true,
      });
      if (error) throw error;
      setPublishedSlug(slug);
      refreshPosts();
      toast.success("Published! Your post is live.");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't publish");
    } finally {
      setPublishing(false);
    }
  };

  const addEmail = () => {
    const value = emailInput.trim().replace(/,$/, "");
    if (!value) return;
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      toast.error("Not a valid email");
      return;
    }
    if (emails.includes(value)) {
      setEmailInput("");
      return;
    }
    if (emails.length >= 20) {
      toast.error("Max 20 recipients");
      return;
    }
    setEmails([...emails, value]);
    setEmailInput("");
  };

  const onEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
      e.preventDefault();
      addEmail();
    } else if (e.key === "Backspace" && !emailInput && emails.length) {
      setEmails(emails.slice(0, -1));
    }
  };

  const shareViaEmail = () => {
    if (!publishedSlug) return;
    if (emails.length === 0) {
      toast.error("Add at least one recipient");
      return;
    }
    const url = postPublicUrl(publishedSlug);
    const firstLine = caption.split("\n")[0].slice(0, 80);
    const subject = `${orgName ? orgName + ": " : ""}${firstLine}`;
    const body = `${caption}\n\nSee the full post:\n${url}\n`;
    const mailto = `mailto:${encodeURIComponent(emails.join(","))}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const copyLink = () => {
    if (!publishedSlug) return;
    navigator.clipboard.writeText(postPublicUrl(publishedSlug));
    toast.success("Link copied");
  };

  const removePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    refreshPosts();
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Upload */}
      {!mediaUrl ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/40 p-10 text-center transition-colors hover:bg-card/70"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium text-ink">Drop an image or video</p>
          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, MP4, MOV — up to 20MB</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 rounded-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</> : "Choose file"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
          {/* Preview card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-clay text-xs font-semibold text-primary-foreground">
                  {(orgName || "B").slice(0, 1).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-ink">{orgName || "Your organization"}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={reset}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="aspect-square w-full bg-muted">
              {mediaType === "image" ? (
                <img src={mediaUrl} alt="Post media" className="h-full w-full object-cover" />
              ) : (
                <video src={mediaUrl} className="h-full w-full object-cover" controls />
              )}
            </div>
            <div className="flex items-center gap-4 px-4 py-3 text-ink">
              <Heart className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
              <Send className="h-5 w-5" />
              <Bookmark className="ml-auto h-5 w-5" />
            </div>
            {caption && (
              <div className="px-4 pb-4 text-sm leading-relaxed text-ink">
                <span className="font-semibold">{orgName || "you"}</span>{" "}
                <span className="whitespace-pre-wrap">{caption}</span>
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="brief">Brief (optional)</Label>
              <Textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={3}
                placeholder="Anything the AI should know — the moment, the people, the ask."
                className="mt-1.5"
                maxLength={1000}
              />
            </div>

            <div>
              <Label>Platform style</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={generate}
              disabled={generating || !mediaUrl}
              className="w-full rounded-full"
              variant="secondary"
            >
              {generating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{mediaType === "image" ? "Looking at your image..." : "Writing..."}</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />{caption ? "Regenerate caption" : "Generate caption"}</>
              )}
            </Button>

            {caption && (
              <div>
                <Label htmlFor="caption">Caption (edit freely)</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={8}
                  className="mt-1.5 font-sans text-sm"
                  maxLength={4000}
                />
              </div>
            )}

            {!publishedSlug ? (
              <Button
                onClick={publish}
                disabled={publishing || !caption.trim()}
                size="lg"
                className="w-full rounded-full shadow-warm"
              >
                {publishing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Publish post</>
                )}
              </Button>
            ) : (
              <div className="space-y-4 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-primary">Live</div>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md bg-background px-2 py-1.5 text-xs">
                      {postPublicUrl(publishedSlug)}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copyLink}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a href={postPublicUrl(publishedSlug)} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5" /></Button>
                    </a>
                  </div>
                </div>

                <div>
                  <Label>Share via email</Label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring">
                    {emails.map((e) => (
                      <Badge key={e} variant="secondary" className="gap-1">
                        {e}
                        <button
                          type="button"
                          onClick={() => setEmails(emails.filter((x) => x !== e))}
                          className="ml-0.5 text-muted-foreground hover:text-ink"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      onKeyDown={onEmailKeyDown}
                      onBlur={addEmail}
                      placeholder={emails.length ? "" : "name@example.com, ..."}
                      className="min-w-[160px] flex-1 bg-transparent text-sm outline-none"
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Press Enter or comma to add. Opens your mail app.</p>
                </div>

                <Button
                  onClick={shareViaEmail}
                  disabled={emails.length === 0}
                  className="w-full rounded-full"
                >
                  <Send className="mr-2 h-4 w-4" />Send to {emails.length || 0} {emails.length === 1 ? "person" : "people"}
                </Button>

                <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
                  Create another post
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My posts */}
      {posts.length > 0 && (
        <div>
          <div className="mb-3 flex items-end justify-between">
            <h3 className="font-display text-xl text-ink">Your posts</h3>
            <a href="/posts" target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-ink">
              View public gallery →
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {posts.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-border bg-card">
                <div className="aspect-square w-full bg-muted">
                  {p.media_type === "image" ? (
                    <img src={p.media_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Film className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="line-clamp-2 text-xs text-white">{p.caption}</p>
                </div>
                <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <a href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm" className="h-7 w-7 rounded-full p-0">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 w-7 rounded-full p-0"
                    onClick={() => removePost(p.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
