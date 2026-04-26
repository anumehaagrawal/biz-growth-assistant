import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateContent } from "@/utils/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles, Copy, Loader2, Instagram, Mail, FileText, Image as ImageIcon, Upload, X, Send } from "lucide-react";
import { PostComposer } from "@/components/PostComposer";

const emailSchema = z.string().trim().email();

export const Route = createFileRoute("/dashboard/content")({
  head: () => ({ meta: [{ title: "Create content — Bloom" }] }),
  component: ContentPage,
});


function ContentPage() {
  const { user } = useAuth();
  const generateFn = useServerFn(generateContent);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contentType, setContentType] = useState<"social" | "email" | "blog" | "post">("social");
  const [platform, setPlatform] = useState("instagram");
  const [topic, setTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [latest, setLatest] = useState<string | null>(null);
  const [resourceCount, setResourceCount] = useState(0);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("org_resources")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "ready")
      .then(({ count }) => setResourceCount(count ?? 0));
  }, [user]);

  const handleImage = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Image is too large (max 20MB)");
      return;
    }
    setUploadingImage(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("post-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("post-media").getPublicUrl(path);
      setImageUrl(pub.publicUrl);
      toast.success("Image attached");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingImage(false);
    }
  };

  const generate = async () => {
    if (!user || !topic.trim() || contentType === "post") return;
    const ct = contentType;
    setGenerating(true);
    setLatest(null);
    try {
      const [{ data: business }, { data: resources }] = await Promise.all([
        supabase.from("businesses").select("*").eq("user_id", user.id).single(),
        supabase
          .from("org_resources")
          .select("name,extracted_text")
          .eq("user_id", user.id)
          .eq("status", "ready"),
      ]);
      if (!business) throw new Error("Business profile not found");

      const { output } = await generateFn({
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
          contentType: ct,
          topic,
          platform: ct === "social" ? platform : undefined,
          imageUrl: imageUrl ?? undefined,
          resources: (resources ?? [])
            .filter((r) => r.extracted_text && r.extracted_text.length > 0)
            .map((r) => ({ name: r.name, text: r.extracted_text })),
        },
      });

      setLatest(output);
      await supabase.from("content_pieces").insert({
        user_id: user.id,
        content_type: ct,
        prompt: topic,
        output,
        metadata: {
          ...(ct === "social" ? { platform } : {}),
          ...(imageUrl ? { imageUrl } : {}),
        },
      });
      toast.success("Fresh content, ready to go!");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't generate content");
    } finally {
      setGenerating(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const addEmail = () => {
    const value = emailInput.trim().replace(/[,;]$/, "");
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
    if (emails.length >= 50) {
      toast.error("Max 50 recipients");
      return;
    }
    setEmails([...emails, value]);
    setEmailInput("");
  };

  const onEmailKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === ";" || e.key === "Tab") {
      e.preventDefault();
      addEmail();
    } else if (e.key === "Backspace" && !emailInput && emails.length) {
      setEmails(emails.slice(0, -1));
    }
  };

  const parseSubjectAndBody = (text: string): { subject: string; body: string } => {
    // Look for a "Subject: ..." line at the top of the AI output
    const lines = text.split("\n");
    const subjLine = lines.find((l) => /^subject\s*:/i.test(l.trim()));
    if (subjLine) {
      const subject = subjLine.replace(/^subject\s*:\s*/i, "").trim();
      const rest = lines.filter((l) => l !== subjLine).join("\n").trim();
      return { subject, body: rest };
    }
    return { subject: lines[0].slice(0, 100), body: text };
  };

  const sendEmail = () => {
    if (!latest) return;
    if (emails.length === 0) {
      toast.error("Add at least one recipient");
      return;
    }
    const { subject, body } = parseSubjectAndBody(latest);
    const photoLine = imageUrl ? `\n\n📷 Today's photo: ${imageUrl}` : "";
    const fullBody = `${body}${photoLine}\n`;
    const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullBody)}`;
    window.location.href = mailto;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-4xl text-ink">Tell your story</h1>
        <p className="mt-2 text-muted-foreground">Pick a format, share a quick brief, and Bloom writes it in your organization's voice.</p>
        {resourceCount > 0 ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Writing with {resourceCount} resource{resourceCount === 1 ? "" : "s"} as context
          </p>
        ) : (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            Tip: add your website or docs in <a href="/dashboard/settings" className="ml-1 underline">Settings</a> for richer, on-brand writing
          </p>
        )}

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)}>
            <TabsList className="grid w-full grid-cols-4 rounded-full bg-secondary p-1">
              <TabsTrigger value="social" className="rounded-full"><Instagram className="mr-1.5 h-4 w-4" />Social</TabsTrigger>
              <TabsTrigger value="email" className="rounded-full"><Mail className="mr-1.5 h-4 w-4" />Email</TabsTrigger>
              <TabsTrigger value="blog" className="rounded-full"><FileText className="mr-1.5 h-4 w-4" />Blog</TabsTrigger>
              <TabsTrigger value="post" className="rounded-full"><ImageIcon className="mr-1.5 h-4 w-4" />Post</TabsTrigger>
            </TabsList>

            <TabsContent value="post" className="mt-5">
              <PostComposer />
            </TabsContent>

            <TabsContent value="social" className="mt-5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter / X</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </TabsContent>
            <TabsContent value="email" className="mt-5 text-sm text-muted-foreground">
              A warm daily update for parents — what their child did today, learning moments, and sweet details so they feel happy and connected.
            </TabsContent>
            <TabsContent value="blog" className="mt-5 text-sm text-muted-foreground">
              ~500-700 word impact story or update with subheadings and a clear ask.
            </TabsContent>
          </Tabs>

          {contentType !== "post" && (
            <>
              <div className="mt-5">
                <Label>Photo (required for grounded writing)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  We never generate AI photos. Upload a real photo from today and the AI will write only about what it sees.
                </p>
                {imageUrl ? (
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-border bg-card p-2">
                    <img src={imageUrl} alt="Attached" className="h-20 w-20 rounded-lg object-cover" />
                    <div className="flex-1 text-xs text-muted-foreground">
                      The AI will reference this photo while writing.
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setImageUrl(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadingImage ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                      ) : (
                        <><Upload className="mr-2 h-4 w-4" />Upload a photo</>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImage(f);
                        e.target.value = "";
                      }}
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">PNG or JPG, up to 20MB.</p>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <Label htmlFor="topic">A quick brief</Label>
                <Textarea
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1.5"
                  rows={3}
                  placeholder={
                    contentType === "email"
                      ? "Today the toddlers explored the sensory bin, painted with their fingers, and had story time about kindness."
                      : "Spring food drive: we need 200 volunteers and $25k to keep our pantry stocked through May."
                  }
                  maxLength={1000}
                />
              </div>

              <Button onClick={generate} disabled={generating || !topic.trim() || !imageUrl} size="lg" className="mt-5 w-full rounded-full shadow-warm">
                {generating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" />Generate</>
                )}
              </Button>
              {!imageUrl && (
                <p className="mt-2 text-center text-xs text-muted-foreground">Upload a photo to get started.</p>
              )}
            </>
          )}
        </div>

        {contentType !== "post" && latest && (
          <div className="mt-6 rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-warm">
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" /> Just generated
              </span>
              <Button variant="ghost" size="sm" onClick={() => copy(latest)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
              </Button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">{latest}</pre>
          </div>
        )}
      </div>

    </div>
  );
}
