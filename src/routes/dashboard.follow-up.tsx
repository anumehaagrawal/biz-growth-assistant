import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  CheckCircle2,
  Copy,
  Loader2,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard/follow-up")({
  head: () => ({ meta: [{ title: "Warm follow-up tracker — Outreach.AI" }] }),
  component: FollowUpPage,
});

type FollowUpContact = {
  id: string;
  child_name: string;
  grade: string;
  guardian_contact: string;
  activity_attended: string;
  date_attended: string;
  interest_area: string | null;
  follow_up_status: string;
  notes: string | null;
  user_id: string | null;
  created_at?: string;
};

const statuses = [
  "Needs 48-hour follow-up",
  "48-hour message sent",
  "Needs one-week follow-up",
  "One-week message sent",
  "Signup support offered",
  "Visited again",
  "Joined",
];

const initialForm = {
  child_name: "",
  grade: "",
  guardian_contact: "",
  activity_attended: "",
  date_attended: new Date().toISOString().split("T")[0],
  interest_area: "",
  notes: "",
};

function FollowUpPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<FollowUpContact[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("follow_up_contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setContacts(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadContacts();
  }, [user, loadContacts]);

  const update = (key: keyof typeof initialForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const addContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("follow_up_contacts").insert({
      user_id: user.id,
      child_name: form.child_name,
      grade: form.grade,
      guardian_contact: form.guardian_contact,
      activity_attended: form.activity_attended,
      date_attended: form.date_attended,
      interest_area: form.interest_area || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm(initialForm);
    await loadContacts();
    toast.success("Participant added for follow-up");
  };

  const setStatus = async (id: string, follow_up_status: string) => {
    const { error } = await supabase
      .from("follow_up_contacts")
      .update({ follow_up_status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContacts((current) =>
      current.map((contact) =>
        contact.id === id ? { ...contact, follow_up_status } : contact,
      ),
    );
  };

  const remove = async (id: string) => {
    await supabase.from("follow_up_contacts").delete().eq("id", id);
    setContacts((current) => current.filter((c) => c.id !== id));
  };

  const completedCount = useMemo(
    () =>
      contacts.filter((contact) =>
        ["Visited again", "Joined", "Signup support offered"].includes(
          contact.follow_up_status,
        ),
      ).length,
    [contacts],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
      <section>
        <p className="text-sm font-medium uppercase tracking-wider text-primary">
          Warm Follow-Up Tracker
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink">
          Help first visits become relationships
        </h1>
        <p className="mt-2 text-muted-foreground">
          Log kids who tried an activity but have not joined yet. Staff can send friendly follow-ups
          without starting from scratch.
        </p>

        <form
          onSubmit={addContact}
          className="mt-6 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="child_name">Child name</Label>
              <Input
                id="child_name"
                required
                value={form.child_name}
                onChange={(event) => update("child_name", event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                required
                value={form.grade}
                onChange={(event) => update("grade", event.target.value)}
                className="mt-1.5"
                placeholder="6th"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="guardian_contact">Parent or guardian contact</Label>
              <Input
                id="guardian_contact"
                required
                value={form.guardian_contact}
                onChange={(event) => update("guardian_contact", event.target.value)}
                className="mt-1.5"
                placeholder="Phone, WhatsApp, or email"
              />
            </div>
            <div>
              <Label htmlFor="activity_attended">Activity attended</Label>
              <Input
                id="activity_attended"
                required
                value={form.activity_attended}
                onChange={(event) => update("activity_attended", event.target.value)}
                className="mt-1.5"
                placeholder="Robotics open house"
              />
            </div>
            <div>
              <Label htmlFor="date_attended">Date attended</Label>
              <Input
                id="date_attended"
                type="date"
                required
                value={form.date_attended}
                onChange={(event) => update("date_attended", event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="interest_area">Interest area</Label>
              <Input
                id="interest_area"
                value={form.interest_area}
                onChange={(event) => update("interest_area", event.target.value)}
                className="mt-1.5"
                placeholder="Cooking, basketball, robotics, homework help"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              rows={2}
              className="mt-1.5"
              placeholder="Optional context staff should remember."
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full rounded-full shadow-warm">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Add follow-up
          </Button>
        </form>
      </section>

      <section>
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Participants" value={contacts.length.toString()} />
          <Metric label="Supported" value={completedCount.toString()} />
          <Metric
            label="Follow-up rate"
            value={
              contacts.length
                ? `${Math.round((completedCount / contacts.length) * 100)}%`
                : "0%"
            }
          />
        </div>

        <div className="mt-5 space-y-4">
          {contacts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Add a first visit here to start the tracker.
            </div>
          )}
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onStatus={setStatus}
              onRemove={remove}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl text-ink">{value}</p>
    </div>
  );
}

function ContactCard({
  contact,
  onStatus,
  onRemove,
}: {
  contact: FollowUpContact;
  onStatus: (id: string, status: string) => void;
  onRemove: (id: string) => void;
}) {
  const messages = [
    {
      label: "48-hour message",
      text: `Hi, this is Rainier Valley Boys & Girls Club. We loved having ${contact.child_name} at ${contact.activity_attended}. They're welcome to come back this week. Want us to send the next visit time?`,
    },
    {
      label: "One-week message",
      text: `${contact.child_name} might like what is happening this week: cooking on Tuesday, basketball on Wednesday, and robotics on Thursday. Want to stop by?`,
    },
    {
      label: "Signup support",
      text: "Need help with signup? We can walk you through it in person or by phone.",
    },
  ];

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl text-ink">{contact.child_name}</h2>
            <Badge variant="secondary">{contact.grade}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {contact.activity_attended} ·{" "}
            {new Date(`${contact.date_attended}T00:00:00`).toLocaleDateString()}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{contact.guardian_contact}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onRemove(contact.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <Select
          value={contact.follow_up_status}
          onValueChange={(value) => onStatus(contact.id, value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          {contact.interest_area || "Interest not noted"}
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {messages.map((message) => (
          <div
            key={message.label}
            className="rounded-2xl border border-border bg-background/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <MessageSquare className="h-4 w-4 text-primary" />
                {message.label}
              </div>
              <Button variant="ghost" size="sm" onClick={() => copy(message.text)}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message.text}</p>
          </div>
        ))}
      </div>

      {contact.notes && <p className="mt-4 text-sm text-muted-foreground">Note: {contact.notes}</p>}
    </article>
  );
}
