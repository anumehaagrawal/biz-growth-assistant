import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { ResourceManager } from "@/components/ResourceManager";

export const Route = createFileRoute("/dashboard/settings")({
  head: () => ({ meta: [{ title: "Organization settings — Bloom" }] }),
  component: SettingsPage,
});

const CAUSE_AREAS = [
  "Education", "Health & wellbeing", "Poverty & food security", "Housing & homelessness",
  "Environment & climate", "Animal welfare", "Arts & culture", "Human rights & advocacy",
  "Youth & families", "Refugees & migration", "Mental health", "Disability & inclusion",
  "Community development", "Faith & spirituality", "Other",
];

function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("businesses").select("*").eq("user_id", user.id).single().then(({ data }) => setForm(data));
  }, [user]);

  const update = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form) return;
    setSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({
        name: form.name,
        industry: form.industry,
        description: form.description,
        target_audience: form.target_audience,
        brand_voice: form.brand_voice,
        location: form.location,
        website: form.website,
        goals: form.goals,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved!");
  };

  if (!form) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl text-ink">Your organization</h1>
      <p className="mt-2 text-muted-foreground">Keep this fresh — Bloom uses it for everything it writes.</p>

      <form onSubmit={save} className="mt-6 space-y-5 rounded-3xl border border-border bg-card p-8 shadow-soft">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Organization name</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Cause area</Label>
            <Select value={form.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAUSE_AREAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Location</Label>
            <LocationAutocomplete
              value={form.location ?? ""}
              onChange={(v) => update("location", v)}
              className="mt-1.5"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Website</Label>
            <Input
              type="url"
              value={form.website ?? ""}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://yourorg.org"
              className="mt-1.5"
            />
          </div>
        </div>

        <div>
          <Label>Your mission</Label>
          <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} className="mt-1.5" />
        </div>
        <div>
          <Label>Who you want to reach (donors, volunteers, beneficiaries...)</Label>
          <Textarea value={form.target_audience} onChange={(e) => update("target_audience", e.target.value)} rows={2} className="mt-1.5" />
        </div>
        <div>
          <Label>Brand voice</Label>
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
          <Label>Mission goals this season</Label>
          <Textarea value={form.goals ?? ""} onChange={(e) => update("goals", e.target.value)} rows={2} className="mt-1.5" />
        </div>

        <Button type="submit" size="lg" className="rounded-full shadow-warm" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
