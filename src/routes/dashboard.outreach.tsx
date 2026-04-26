import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateOutreachPlan } from "@/utils/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Loader2, Clock, Users, Megaphone, Mail, Calendar as CalIcon, HeartHandshake, MessageSquare, Settings2, ChevronDown, MapPin } from "lucide-react";

export const Route = createFileRoute("/dashboard/outreach")({
  head: () => ({ meta: [{ title: "Weekly outreach plan — Bloom" }] }),
  component: OutreachPage,
});

type Strategy = {
  title: string;
  category: string;
  why: string;
  steps: string[];
  time_estimate: string;
};

type Plan = { intro: string; strategies: Strategy[] };

const categoryIcons: Record<string, any> = {
  partnership: HeartHandshake,
  community: Users,
  content: Megaphone,
  direct: Mail,
  referral: MessageSquare,
  event: CalIcon,
};

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

function OutreachPage() {
  const { user } = useAuth();
  const generateFn = useServerFn(generateOutreachPlan);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planDate, setPlanDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resourceCount, setResourceCount] = useState(0);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [audienceOverride, setAudienceOverride] = useState("");
  const [eventsToPromote, setEventsToPromote] = useState("");
  const [businessLocation, setBusinessLocation] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadCurrentPlan();
    supabase
      .from("org_resources")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "ready")
      .then(({ count }) => setResourceCount(count ?? 0));
    supabase
      .from("businesses")
      .select("location")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setBusinessLocation(data?.location ?? null));
  }, [user]);

  const loadCurrentPlan = async () => {
    if (!user) return;
    setLoading(true);
    const week_start = getWeekStart();
    const { data } = await supabase
      .from("outreach_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", week_start)
      .maybeSingle();
    if (data) {
      setPlan(data.strategies as unknown as Plan);
      setPlanDate(data.week_start);
    }
    setLoading(false);
  };

  const generate = async () => {
    if (!user) return;
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
      if (!business) throw new Error("Business profile not found");

      const { plan: newPlan } = await generateFn({
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
          resources: (resources ?? [])
            .filter((r) => r.extracted_text && r.extracted_text.length > 0)
            .map((r) => ({ name: r.name, text: r.extracted_text })),
          audience_override: audienceOverride.trim() || null,
          events_to_promote: eventsToPromote.trim() || null,
        },
      });

      const week_start = getWeekStart();
      await supabase.from("outreach_plans").upsert(
        { user_id: user.id, week_start, strategies: newPlan as any },
        { onConflict: "user_id,week_start" }
      );
      setPlan(newPlan);
      setPlanDate(week_start);
      toast.success("This week's plan is ready!");
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't generate plan");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const customizePanel = (
    <Collapsible open={customizeOpen} onOpenChange={setCustomizeOpen} className="rounded-2xl border border-border bg-card/60 text-left">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-5 py-3 text-sm font-medium text-ink hover:bg-muted/40 rounded-2xl transition-colors">
        <span className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Customize this plan
          {(audienceOverride.trim() || eventsToPromote.trim()) && (
            <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {[audienceOverride.trim() && "audience", eventsToPromote.trim() && "events"].filter(Boolean).join(" + ")}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${customizeOpen ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 px-5 pb-5 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="audience-override" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Target audience for this plan <span className="normal-case text-muted-foreground/70">(optional — overrides your profile)</span>
          </Label>
          <Input
            id="audience-override"
            placeholder="e.g. local school parents, small business owners, retirees in South Seattle"
            value={audienceOverride}
            onChange={(e) => setAudienceOverride(e.target.value.slice(0, 500))}
            maxLength={500}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="events-promote" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Events or programs to publicize <span className="normal-case text-muted-foreground/70">(optional)</span>
          </Label>
          <Textarea
            id="events-promote"
            placeholder="e.g. Saturday volunteer day Nov 15 at the Rainier Community Center; weekly youth mentoring program; holiday giving drive ending Dec 20"
            value={eventsToPromote}
            onChange={(e) => setEventsToPromote(e.target.value.slice(0, 2000))}
            maxLength={2000}
            rows={4}
            className="rounded-xl resize-none"
          />
          <p className="text-xs text-muted-foreground">If left blank, Bloom will infer programs from your saved resources.</p>
        </div>
        {businessLocation && (
          <p className="flex items-start gap-1.5 rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
            <span>Plans will recommend outreach at local schools, parks, libraries, community centers, and faith groups in <strong className="text-ink">{businessLocation}</strong>.</span>
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-clay shadow-warm">
            <CalIcon className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-5 font-display text-4xl text-ink">Your weekly outreach plan</h1>
          <p className="mt-3 text-muted-foreground">
            Five concrete moves to grow donors, volunteers, and partnerships — grounded in your locality and programs. A fresh plan every week.
          </p>
        </div>
        <div className="mt-6">{customizePanel}</div>
        <div className="text-center">
          <Button onClick={generate} size="lg" disabled={generating} className="mt-6 rounded-full shadow-warm">
            {generating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Crafting your plan...</>
            ) : (
              <><Sparkles className="mr-2 h-4 w-4" />Generate this week's plan</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  const weekLabel = planDate
    ? new Date(planDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "";

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Week of {weekLabel}</p>
          <h1 className="mt-1 font-display text-4xl text-ink">Your outreach plan</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">{plan.intro}</p>
          {resourceCount > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Built from {resourceCount} resource{resourceCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={generate} disabled={generating} className="rounded-full">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      <div className="mt-6">{customizePanel}</div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {plan.strategies.map((s, i) => {
          const Icon = categoryIcons[s.category] ?? Megaphone;
          return (
            <article key={i} className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-warm">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-warm">
                  <Icon className="h-5 w-5 text-clay" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Strategy {i + 1} · {s.category}
                  </span>
                  <h3 className="mt-1 font-display text-xl text-ink">{s.title}</h3>
                </div>
              </div>
              <p className="mt-4 text-sm italic text-muted-foreground">{s.why}</p>
              <ul className="mt-4 space-y-2">
                {s.steps.map((step, j) => (
                  <li key={j} className="flex gap-2.5 text-sm text-ink">
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-primary">
                      {j + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {s.time_estimate}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
