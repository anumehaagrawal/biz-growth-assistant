import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

export const Route = createFileRoute("/dashboard/onboarding")({
  head: () => ({ meta: [{ title: "Set up Rainier Valley Club — Club Connect" }] }),
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
    name: "Rainier Valley Boys & Girls Club",
    industry: "Youth & families",
    description:
      "A safe second home after school for K-12 kids and teens in Rainier Valley, with homework help, sports, cooking, robotics, career training, mentorship, and caring staff.",
    target_audience:
      "Rainier Valley parents and guardians, K-12 students, school staff, teachers, coaches, libraries, churches, food banks, community center staff, current parents, and teen members.",
    brand_voice: "warm",
    location: "Rainier Valley, Seattle, WA",
    website: "https://positiveplace.org/clubs/smilow-rainier-vista/",
    goals:
      "Help families discover the Club, picture their child here, visit before committing, and get supported through signup.",
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
    toast.success("Club Connect is ready.");
    navigate({ to: "/dashboard/content" });
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-clay shadow-warm">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="mt-5 font-display text-4xl text-ink">Set up Rainier Valley Club Connect</h1>
        <p className="mt-2 text-muted-foreground">
          These defaults keep outreach focused on families, visits, and supported signup.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-8 shadow-soft"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="name">Organization name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="mt-1.5"
              placeholder="Rainier Valley Boys & Girls Club"
            />
          </div>
          <div>
            <Label htmlFor="org_type">Organization type</Label>
            <Select value={form.org_type} onValueChange={(v) => update("org_type", v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORG_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="industry">Cause area</Label>
            <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose your focus" />
              </SelectTrigger>
              <SelectContent>
                {CAUSE_AREAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
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
        </div>

        <div>
          <Label htmlFor="description">Club context</Label>
          <Textarea
            id="description"
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1.5"
            rows={3}
            placeholder="What happens after school, who staff serve, and what makes the Club feel safe and welcoming."
          />
        </div>

        <div>
          <Label htmlFor="target_audience">Who should outreach reach?</Label>
          <Textarea
            id="target_audience"
            required
            value={form.target_audience}
            onChange={(e) => update("target_audience", e.target.value)}
            className="mt-1.5"
            rows={2}
            placeholder="Parents, guardians, students, school staff, teachers, coaches, and trusted community partners."
          />
        </div>

        <div>
          <Label htmlFor="brand_voice">Brand voice</Label>
          <Select value={form.brand_voice} onValueChange={(v) => update("brand_voice", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
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
          <Label htmlFor="goals">Enrollment and outreach goals</Label>
          <Textarea
            id="goals"
            value={form.goals}
            onChange={(e) => update("goals", e.target.value)}
            className="mt-1.5"
            rows={2}
            placeholder="Increase visits, follow up after first activities, and help families complete signup."
          />
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full shadow-warm"
          disabled={submitting}
        >
          {submitting ? "Setting up..." : "Continue to Club Connect"}
        </Button>
      </form>
    </div>
  );
}
