import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { generateOutreachPlan } from "@/utils/ai.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Loader2, Clock, Users, Megaphone, Mail, Calendar as CalIcon, HeartHandshake, MessageSquare } from "lucide-react";

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

  useEffect(() => {
    if (!user) return;
    loadCurrentPlan();
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
      const { data: business } = await supabase.from("businesses").select("*").eq("user_id", user.id).single();
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
          },
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

  if (!plan) {
    return (
      <div className="mx-auto max-w-xl text-center py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-clay shadow-warm">
          <CalIcon className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="mt-5 font-display text-4xl text-ink">Your weekly outreach plan</h1>
        <p className="mt-3 text-muted-foreground">
          Five concrete moves, hand-picked for your business. A fresh plan every week.
        </p>
        <Button onClick={generate} size="lg" disabled={generating} className="mt-6 rounded-full shadow-warm">
          {generating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Crafting your plan...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" />Generate this week's plan</>
          )}
        </Button>
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
        </div>
        <Button variant="outline" onClick={generate} disabled={generating} className="rounded-full">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Regenerate
        </Button>
      </div>

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
