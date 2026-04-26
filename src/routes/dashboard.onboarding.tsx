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

export const Route = createFileRoute("/dashboard/onboarding")({
  head: () => ({ meta: [{ title: "Set up your business — Bloom" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    industry: "",
    description: "",
    target_audience: "",
    brand_voice: "warm",
    location: "",
    website: "",
    goals: "",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("businesses").insert({ ...form, user_id: user.id });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("All set! Let's create something beautiful.");
    navigate({ to: "/dashboard/content" });
    // hard reload to refresh hasBusiness check cleanly
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-clay shadow-warm">
          <Sparkles className="h-7 w-7 text-primary-foreground" />
        </div>
        <h1 className="mt-5 font-display text-4xl text-ink">Tell us about your business</h1>
        <p className="mt-2 text-muted-foreground">
          The more we know, the more on-brand your content will be.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" required value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1.5" placeholder="Maya's Coffee Roasters" />
          </div>
          <div>
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" required value={form.industry} onChange={(e) => update("industry", e.target.value)} className="mt-1.5" placeholder="Specialty coffee" />
          </div>
          <div>
            <Label htmlFor="location">Location (optional)</Label>
            <Input id="location" value={form.location} onChange={(e) => update("location", e.target.value)} className="mt-1.5" placeholder="Brooklyn, NY" />
          </div>
        </div>

        <div>
          <Label htmlFor="description">What do you do?</Label>
          <Textarea
            id="description"
            required
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1.5"
            rows={3}
            placeholder="We roast small-batch single-origin coffee and run a neighborhood café focused on slow mornings and good conversation."
          />
        </div>

        <div>
          <Label htmlFor="target_audience">Who are your customers?</Label>
          <Textarea
            id="target_audience"
            required
            value={form.target_audience}
            onChange={(e) => update("target_audience", e.target.value)}
            className="mt-1.5"
            rows={2}
            placeholder="Local coffee enthusiasts in their 25-45s, remote workers, and weekend brunchers who care about quality and community."
          />
        </div>

        <div>
          <Label htmlFor="brand_voice">Brand voice</Label>
          <Select value={form.brand_voice} onValueChange={(v) => update("brand_voice", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warm">Warm & personal</SelectItem>
              <SelectItem value="professional">Professional & polished</SelectItem>
              <SelectItem value="playful">Playful & witty</SelectItem>
              <SelectItem value="bold">Bold & confident</SelectItem>
              <SelectItem value="educational">Educational & helpful</SelectItem>
              <SelectItem value="luxurious">Refined & luxurious</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="goals">What are you trying to grow? (optional)</Label>
          <Textarea
            id="goals"
            value={form.goals}
            onChange={(e) => update("goals", e.target.value)}
            className="mt-1.5"
            rows={2}
            placeholder="Build a regular Sunday brunch crowd and grow our online bean subscription."
          />
        </div>

        <Button type="submit" size="lg" className="w-full rounded-full shadow-warm" disabled={submitting}>
          {submitting ? "Setting up..." : "Continue to Bloom"}
        </Button>
      </form>
    </div>
  );
}
