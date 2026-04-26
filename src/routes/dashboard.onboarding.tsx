import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { ResourceManager } from "@/components/ResourceManager";

export const Route = createFileRoute("/dashboard/onboarding")({
  head: () => ({ meta: [{ title: "Set up your organization — Outreach.AI" }] }),
  component: Onboarding,
});

const ORG_TYPES = [
  "Registered charity / 501(c)(3)",
  "Community group",
  "Foundation",
  "Faith-based organization",
  "Social enterprise",
  "Advocacy / activist group",
  "School or educational non-profit",
  "Other non-profit",
];

const CAUSE_AREAS = [
  "Education",
  "Health & wellbeing",
  "Poverty & food security",
  "Housing & homelessness",
  "Environment & climate",
  "Animal welfare",
  "Arts & culture",
  "Human rights & advocacy",
  "Youth & families",
  "Refugees & migration",
  "Mental health",
  "Disability & inclusion",
  "Community development",
  "Faith & spirituality",
  "Other",
];

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "", // cause area
    description: "", // mission
    target_audience: "", // supporters
    brand_voice: "warm",
    location: "",
    website: "",
    goals: "", // mission goals
    org_type: "Registered charity / 501(c)(3)",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    // Persist org_type inside description prefix-free; we store in industry composite would be lossy.
    // Simpler: store org_type inline in description or leverage existing columns. We'll prepend to description.
    const enrichedDescription = `[${form.org_type}] ${form.description}`;
    const { error } = await supabase.from("businesses").insert({
      user_id: user.id,
      name: form.name,
      industry: form.industry,
      description: enrichedDescription,
      target_audience: form.target_audience,
      brand_voice: form.brand_voice,
      location: form.location,
      website: form.website,
      goals: form.goals,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("All set! Let's tell your story.");
    navigate({ to: "/dashboard/content" });
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-clay shadow-warm">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="mt-5 font-display text-4xl text-ink">Tell us about your organization</h1>
        <p className="mt-2 text-muted-foreground">
          The more we know about your mission, the more on-brand your content will be.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1.5" placeholder="Riverside Community Food Bank" />
          </div>
          <div>
            <Label htmlFor="org_type">Organization type</Label>
            <Select value={form.org_type} onValueChange={(v) => update("org_type", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="industry">Cause area</Label>
            <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Choose your focus" /></SelectTrigger>
              <SelectContent>
                {CAUSE_AREAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="location">Location (optional)</Label>
            <LocationAutocomplete
              id="location"
              value={form.location}
              onChange={(v) => update("location", v)}
              placeholder="Brooklyn, NY"
              className="mt-1.5"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input
              id="website"
              type="url"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://yourorg.org"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Your mission — what do you do and why?</Label>
          <Textarea
            id="description"
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1.5"
            rows={3}
            placeholder="We provide free, dignified groceries to families facing food insecurity in Riverside County, while advocating for systemic change."
          />
        </div>

        <div>
          <Label htmlFor="target_audience">Who do you want to reach?</Label>
          <Textarea
            id="target_audience"
            required
            value={form.target_audience}
            onChange={(e) => update("target_audience", e.target.value)}
            className="mt-1.5"
            rows={2}
            placeholder="Local donors aged 30-65, volunteers, faith communities, and small-business sponsors who care about hunger in our county."
          />
        </div>

        <div>
          <Label htmlFor="brand_voice">Brand voice</Label>
          <Select value={form.brand_voice} onValueChange={(v) => update("brand_voice", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warm">Warm & heartfelt</SelectItem>
              <SelectItem value="hopeful">Hopeful & uplifting</SelectItem>
              <SelectItem value="urgent">Urgent & action-oriented</SelectItem>
              <SelectItem value="professional">Professional & credible</SelectItem>
              <SelectItem value="grassroots">Grassroots & community-led</SelectItem>
              <SelectItem value="educational">Educational & informative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="goals">Mission goals this season (optional)</Label>
          <Textarea
            id="goals"
            value={form.goals}
            onChange={(e) => update("goals", e.target.value)}
            className="mt-1.5"
            rows={2}
            placeholder="Recruit 20 new monthly donors, fill 50 volunteer slots for our spring drive, and raise $25k for the new pantry truck."
          />
        </div>

        <Button type="submit" size="lg" className="w-full rounded-full shadow-warm" disabled={submitting}>
          {submitting ? "Setting up..." : "Continue to Outreach.AI"}
        </Button>
      </form>

      <section className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-soft">
        <h2 className="font-display text-2xl text-ink">Add resources (optional)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Drop in your website, annual report, brochures, or mission docs. Outreach.AI will write from your real materials — not generic templates. You can add more anytime in Settings.
        </p>
        <div className="mt-5">
          <ResourceManager />
        </div>
      </section>
    </div>
  );
}
