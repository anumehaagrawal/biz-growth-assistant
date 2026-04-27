import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateOutreachKit, type OutreachKit } from "@/utils/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Clipboard,
  Copy,
  FileText,
  Loader2,
  MessageSquare,
  Newspaper,
  QrCode,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/dashboard/content")({
  head: () => ({ meta: [{ title: "Staff outreach generator — Club Connect" }] }),
  component: ContentPage,
});

type ContentPiece = {
  id: string;
  content_type: string;
  prompt: string;
  output: string;
  metadata: Partial<ActivityForm> | null;
  created_at: string;
};

type ActivityForm = {
  program: string;
  audience: string;
  schedule: string;
  callToAction: string;
  photoNote: string;
};

const defaultForm: ActivityForm = {
  program: "",
  audience: "Middle school students",
  schedule: "",
  callToAction: "Visit the Club this week",
  photoNote: "",
};

const kitSections: Array<{ key: keyof OutreachKit; label: string; icon: LucideIcon }> = [
  { key: "social_caption", label: "Instagram / Facebook", icon: MessageSquare },
  { key: "flyer_copy", label: "Printable Flyer Copy", icon: FileText },
  { key: "newsletter_blurb", label: "School Newsletter Blurb", icon: Newspaper },
  { key: "parent_message", label: "Parent SMS / WhatsApp", icon: Clipboard },
  { key: "qr_card_text", label: "Community QR Card", icon: QrCode },
  { key: "short_description", label: "Short Event Description", icon: Sparkles },
];

function ContentPage() {
  const { user } = useAuth();
  const generateFn = useServerFn(generateOutreachKit);
  const [form, setForm] = useState<ActivityForm>(defaultForm);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<ContentPiece[]>([]);
  const [latest, setLatest] = useState<OutreachKit | null>(null);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("content_pieces")
      .select("*")
      .eq("user_id", user.id)
      .eq("content_type", "outreach_kit")
      .order("created_at", { ascending: false })
      .limit(12);
    setHistory(data ?? []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshHistory();
  }, [user, refreshHistory]);

  const update = (key: keyof ActivityForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const generate = async () => {
    if (!user || !form.program.trim() || !form.schedule.trim()) return;
    setGenerating(true);
    setLatest(null);
    try {
      const { data: business } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (!business) throw new Error("Organization profile not found");

      const { kit } = await generateFn({
        data: {
          business: {
            name: business.name,
            industry: business.industry,
            description: business.description,
            target_audience: business.target_audience,
            brand_voice: business.brand_voice,
            goals: business.goals,
            location: business.location,
          },
          activity: form,
        },
      });

      setLatest(kit);
      await supabase.from("content_pieces").insert({
        user_id: user.id,
        content_type: "outreach_kit",
        prompt: `${form.program} for ${form.audience} - ${form.schedule}`,
        output: JSON.stringify(kit),
        metadata: form,
      });
      await refreshHistory();
      toast.success("Outreach kit is ready");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Couldn't generate outreach kit");
    } finally {
      setGenerating(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const remove = async (id: string) => {
    await supabase.from("content_pieces").delete().eq("id", id);
    await refreshHistory();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr]">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          Staff Outreach Generator
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink">
          Turn a Club moment into shareable outreach
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Add what is happening this week. Club Connect creates ready-to-share copy for social,
          flyers, newsletters, parent messages, QR cards, and short descriptions.
        </p>

        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="program">What is happening?</Label>
              <Input
                id="program"
                value={form.program}
                onChange={(event) => update("program", event.target.value)}
                className="mt-1.5"
                placeholder="Robotics build night"
                maxLength={160}
              />
            </div>
            <div>
              <Label>Who is it for?</Label>
              <Select value={form.audience} onValueChange={(value) => update("audience", value)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Elementary students">Elementary students</SelectItem>
                  <SelectItem value="Middle school students">Middle school students</SelectItem>
                  <SelectItem value="High school teens">High school teens</SelectItem>
                  <SelectItem value="K-12 families">K-12 families</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="schedule">When is it?</Label>
              <Input
                id="schedule"
                value={form.schedule}
                onChange={(event) => update("schedule", event.target.value)}
                className="mt-1.5"
                placeholder="Wednesday at 4:30pm"
                maxLength={200}
              />
            </div>
            <div>
              <Label>What should families do next?</Label>
              <Select
                value={form.callToAction}
                onValueChange={(value) => update("callToAction", value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Visit the Club this week">Visit the Club this week</SelectItem>
                  <SelectItem value="Stop by from 4-6pm">Stop by from 4-6pm</SelectItem>
                  <SelectItem value="Ask us for signup help">Ask us for signup help</SelectItem>
                  <SelectItem value="Bring your child for a first visit">
                    Bring your child for a first visit
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="photoNote">Photo or context note</Label>
              <Input
                id="photoNote"
                value={form.photoNote}
                onChange={(event) => update("photoNote", event.target.value)}
                className="mt-1.5"
                placeholder="Optional: kids building robots, staff demo table"
                maxLength={500}
              />
            </div>
          </div>

          <Button
            onClick={generate}
            disabled={generating || !form.program.trim() || !form.schedule.trim()}
            size="lg"
            className="mt-5 w-full rounded-full shadow-warm"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Building kit...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate outreach kit
              </>
            )}
          </Button>
        </div>

        {latest && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {kitSections.map(({ key, label, icon: Icon }) => (
              <article
                key={key}
                className="rounded-2xl border border-border bg-card p-5 shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <h2 className="font-sans text-sm font-semibold text-ink">{label}</h2>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copy(latest[key])}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {latest[key]}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <aside>
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl text-ink">Recent kits</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved outreach kits from staff activity briefs.
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to="/club">Family page</Link>
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {history.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border bg-background/60 p-8 text-center text-sm text-muted-foreground">
                Generated kits will appear here.
              </div>
            )}
            {history.map((item) => (
              <HistoryItem key={item.id} item={item} onCopy={copy} onRemove={remove} />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function HistoryItem({
  item,
  onCopy,
  onRemove,
}: {
  item: ContentPiece;
  onCopy: (text: string) => void;
  onRemove: (id: string) => void;
}) {
  const kit = parseKit(item.output);
  const preview = kit?.social_caption ?? item.output;

  return (
    <div className="group rounded-2xl border border-border bg-background/70 p-4 transition-all hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{item.metadata?.program ?? item.prompt}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.metadata?.audience} · {item.metadata?.schedule}
          </p>
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="sm" onClick={() => onCopy(preview)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{preview}</p>
    </div>
  );
}

function parseKit(output: string): OutreachKit | null {
  try {
    return JSON.parse(output) as OutreachKit;
  } catch {
    return null;
  }
}
