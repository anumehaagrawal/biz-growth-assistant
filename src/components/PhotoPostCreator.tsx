import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateMediaCaption } from "@/utils/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Upload,
  Sparkles,
  Copy,
  Globe,
  Mail,
  Loader2,
  ImageIcon,
  Video,
  X,
} from "lucide-react";

type UploadState = "idle" | "uploading" | "ready";
type GenState = "idle" | "generating" | "done";
type PublishState = "idle" | "publishing" | "published";

export function PhotoPostCreator() {
  const { user } = useAuth();
  const generateFn = useServerFn(generateMediaCaption);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  const [platform, setPlatform] = useState("instagram");
  const [context, setContext] = useState("");
  const [genState, setGenState] = useState<GenState>("idle");
  const [caption, setCaption] = useState("");

  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [emails, setEmails] = useState("");

  const [business, setBusiness] = useState<any | null>(null);

  const fetchBusiness = async () => {
    if (!user || business) return business;
    const { data } = await supabase.from("businesses").select("*").eq("user_id", user.id).single();
    setBusiness(data);
    return data;
  };

  const handleFileSelect = async (selected: File) => {
    if (!user) return;
    const type = selected.type.startsWith("video/") ? "video" : "image";
    setFile(selected);
    setMediaType(type);
    setPreviewUrl(URL.createObjectURL(selected));
    setCaption("");
    setShareUrl(null);
    setPublishState("idle");
    setGenState("idle");

    setUploadState("uploading");
    try {
      const ext = selected.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("club-media").upload(path, selected);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("club-media").getPublicUrl(path);
      setMediaUrl(urlData.publicUrl);
      setUploadState("ready");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
      setUploadState("idle");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const clearMedia = () => {
    setFile(null);
    setPreviewUrl(null);
    setMediaUrl(null);
    setUploadState("idle");
    setCaption("");
    setGenState("idle");
    setShareUrl(null);
    setPublishState("idle");
  };

  const generate = async () => {
    if (!user || !mediaUrl) return;
    setGenState("generating");
    setCaption("");
    try {
      const biz = await fetchBusiness();
      if (!biz) throw new Error("Organization profile not found");

      const { caption: generated } = await generateFn({
        data: {
          business: {
            name: biz.name,
            industry: biz.industry,
            description: biz.description,
            target_audience: biz.target_audience,
            brand_voice: biz.brand_voice,
            goals: biz.goals,
            location: biz.location,
          },
          mediaUrl,
          mediaType,
          platform,
          context: context.trim() || undefined,
        },
      });
      setCaption(generated);
      setGenState("done");
    } catch (e: any) {
      toast.error(e.message ?? "Generation failed");
      setGenState("idle");
    }
  };

  const publish = async () => {
    if (!user || !mediaUrl || !caption) return;
    setPublishState("publishing");
    try {
      const { data, error } = await supabase
        .from("media_posts")
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          caption,
          platform,
          is_published: true,
        })
        .select("id")
        .single();
      if (error) throw error;
      const url = `${window.location.origin}/post/${data.id}`;
      setShareUrl(url);
      setPublishState("published");
      toast.success("Post published!");
    } catch (e: any) {
      toast.error(e.message ?? "Publish failed");
      setPublishState("idle");
    }
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(caption);
    toast.success("Caption copied");
  };

  const copyLink = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  };

  const openEmail = () => {
    if (!shareUrl || !caption) return;
    const biz = business;
    const orgName = biz?.name ?? "us";
    const subject = encodeURIComponent(`Check out the latest from ${orgName}!`);
    const body = encodeURIComponent(
      `Hi,\n\n${caption}\n\nSee the full post here:\n${shareUrl}\n\nThanks for your support!`
    );
    const to = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .join(",");
    window.open(`mailto:${to}?subject=${subject}&body=${body}`);
  };

  const canGenerate = uploadState === "ready" && genState !== "generating";
  const canPublish = genState === "done" && !!caption && publishState === "idle";

  return (
    <div className="space-y-6">
      {/* Upload area */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border bg-card/50 p-12 text-center transition-colors hover:border-primary/40 hover:bg-card"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Upload className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-ink">Drop a photo or video here</p>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse — JPG, PNG, MP4, MOV</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <button
            onClick={clearMedia}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 text-white hover:bg-ink/80"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Media preview */}
          <div className="relative aspect-square w-full overflow-hidden bg-secondary">
            {mediaType === "image" && previewUrl && (
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
            )}
            {mediaType === "video" && previewUrl && (
              <video src={previewUrl} controls className="h-full w-full object-cover" />
            )}
            {uploadState === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>

          {/* Post header (org brand) */}
          <div className="flex items-center gap-2.5 border-t border-border p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-clay">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-ink">{business?.name ?? "Your Organization"}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground capitalize">
                {mediaType === "video" ? <Video className="inline h-3 w-3 mr-0.5" /> : <ImageIcon className="inline h-3 w-3 mr-0.5" />}
                {platform}
              </span>
            </div>
          </div>

          {/* Caption area */}
          {caption && (
            <div className="border-t border-border px-4 pb-4 pt-3">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">{caption}</pre>
              <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={copyCaption}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy caption
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      {file && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-soft space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="context">What's happening? (optional)</Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="mt-1.5"
                rows={2}
                placeholder="e.g. Marcus dunked for the first time at basketball club!"
                maxLength={500}
              />
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={!canGenerate}
            size="lg"
            className="w-full rounded-full shadow-warm"
          >
            {genState === "generating" ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing caption...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate post caption</>
            )}
          </Button>
        </div>
      )}

      {/* Publish + Share section */}
      {genState === "done" && caption && (
        <div className="rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-warm space-y-5">
          <h3 className="font-display text-lg text-ink">Publish & Share</h3>

          {publishState !== "published" ? (
            <Button
              onClick={publish}
              disabled={!canPublish}
              size="lg"
              className="w-full rounded-full"
              variant="outline"
            >
              {publishState === "publishing" ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Publishing...</>
              ) : (
                <><Globe className="mr-2 h-4 w-4" />Publish to a shareable page</>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <Label>Shareable link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl ?? ""} readOnly className="flex-1 text-sm" />
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {publishState === "published" && shareUrl && (
            <div className="space-y-2 pt-1 border-t border-border">
              <Label htmlFor="emails">Share via email</Label>
              <p className="text-xs text-muted-foreground">Comma-separated addresses — opens your email client.</p>
              <div className="flex gap-2">
                <Input
                  id="emails"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="parent@example.com, coach@example.com"
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={openEmail} disabled={!emails.trim()}>
                  <Mail className="mr-1.5 h-4 w-4" />
                  Open email
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
