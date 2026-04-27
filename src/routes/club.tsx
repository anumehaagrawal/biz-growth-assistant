import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  GraduationCap,
  HeartHandshake,
  HelpCircle,
  MapPin,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/club")({
  head: () => ({
    meta: [
      { title: "Rainier Valley Boys & Girls Club" },
      {
        name: "description",
        content:
          "See what is happening this week at Rainier Valley Boys & Girls Club and plan a first visit.",
      },
    ],
  }),
  component: ClubPage,
});

const weeklyActivities = [
  { day: "Mon", title: "Homework help + open gym", audience: "Elementary and middle school" },
  { day: "Tue", title: "Cooking club", audience: "Grades 4-8" },
  { day: "Wed", title: "Basketball and leadership", audience: "Middle school and teens" },
  { day: "Thu", title: "Robotics build time", audience: "Middle school" },
  { day: "Fri", title: "Teen night and career pathways", audience: "High school teens" },
];

const ageGroups = [
  {
    title: "Elementary",
    body: "Homework support, games, creative activities, movement, and a safe place after school.",
  },
  {
    title: "Middle School",
    body: "Sports, cooking, robotics, leadership, and staff who help students build confidence.",
  },
  {
    title: "Teens",
    body: "Career training, mentorship, leadership opportunities, and a place to belong after school.",
  },
];

const visitFormInitial = {
  childName: "",
  grade: "",
  guardianContact: "",
  interestArea: "Homework help",
  preferredDate: new Date().toISOString().split("T")[0],
  notes: "",
};

const localVisitRequestsKey = "club-connect.visit-requests";

function ClubPage() {
  const [visitForm, setVisitForm] = useState(visitFormInitial);
  const [submitting, setSubmitting] = useState(false);

  const updateVisitForm = (key: keyof typeof visitFormInitial, value: string) =>
    setVisitForm((current) => ({ ...current, [key]: value }));

  const submitVisitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const { error } = await supabase.from("follow_up_contacts").insert({
      user_id: null,
      child_name: visitForm.childName,
      grade: visitForm.grade,
      guardian_contact: visitForm.guardianContact,
      activity_attended: "Family page visit request",
      date_attended: visitForm.preferredDate,
      interest_area: visitForm.interestArea,
      follow_up_status: "Needs 48-hour follow-up",
      notes: visitForm.notes
        ? `Preferred visit date: ${visitForm.preferredDate}. ${visitForm.notes}`
        : `Preferred visit date: ${visitForm.preferredDate}. Submitted from public family page.`,
    });

    setSubmitting(false);

    if (error) {
      if (isMissingFollowUpTable(error.message)) {
        saveLocalVisitRequest({
          id: crypto.randomUUID(),
          child_name: visitForm.childName,
          grade: visitForm.grade,
          guardian_contact: visitForm.guardianContact,
          activity_attended: "Family page visit request",
          date_attended: visitForm.preferredDate,
          interest_area: visitForm.interestArea,
          follow_up_status: "Needs 48-hour follow-up",
          notes: visitForm.notes
            ? `Preferred visit date: ${visitForm.preferredDate}. ${visitForm.notes}`
            : `Preferred visit date: ${visitForm.preferredDate}. Submitted from public family page.`,
          user_id: null,
          created_at: new Date().toISOString(),
        });
        setVisitForm(visitFormInitial);
        toast.success("Visit request saved locally for this prototype.");
        return;
      }

      toast.error(error.message);
      return;
    }

    setVisitForm(visitFormInitial);
    toast.success("Visit request sent. Club staff can follow up with you.");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/club" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-clay shadow-warm">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold text-ink">Rainier Valley Club</span>
          </Link>
          <Button asChild className="rounded-full">
            <a href="https://positiveplace.org/clubs/smilow-rainier-vista/">Get signup help</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <img
            src={heroImg}
            alt="Club staff and students gathered around a creative project"
            className="absolute inset-0 h-full w-full object-cover"
            width={1280}
            height={960}
          />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-primary-foreground md:pb-20 md:pt-28">
            <Badge className="border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">
              K-12 after school in Rainier Valley
            </Badge>
            <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight md:text-6xl">
              A safe second home after school.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/90">
              Kids and teens come to Rainier Valley Boys & Girls Club for homework help, sports,
              cooking, robotics, career training, mentorship, and staff who know them by name.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <a href="#plan-visit">
                  Visit the Club this week
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                Get help signing up
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-6 py-12 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Safe place after school",
              body: "A supervised space with caring staff and consistent routines.",
            },
            {
              icon: Users,
              title: "K-12 community",
              body: "Programs support students from elementary years through graduation.",
            },
            {
              icon: HeartHandshake,
              title: "Visit before deciding",
              body: "Families can stop by, meet staff, and ask for signup help.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <item.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-4 font-display text-2xl text-ink">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>

        <section className="border-y border-border bg-card/60">
          <div className="mx-auto max-w-6xl px-6 py-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-primary">
                  This Week
                </p>
                <h2 className="mt-1 font-display text-4xl text-ink">What kids can try</h2>
              </div>
              <Button variant="outline" className="rounded-full">
                Ask about visit times
              </Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              {weeklyActivities.map((activity) => (
                <article
                  key={activity.day}
                  className="rounded-2xl border border-border bg-background p-5"
                >
                  <p className="text-sm font-semibold text-primary">{activity.day}</p>
                  <h3 className="mt-3 font-sans text-base font-semibold text-ink">
                    {activity.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{activity.audience}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Programs by Age
            </p>
            <h2 className="mt-1 font-display text-4xl text-ink">Your child can grow here</h2>
            <p className="mt-3 text-muted-foreground">
              The Club is more than one activity. It gives students a consistent place to return to
              as their interests, friendships, and goals change.
            </p>
          </div>
          <div className="grid gap-4">
            {ageGroups.map((group) => (
              <article key={group.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-sans text-base font-semibold text-ink">{group.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {group.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-14">
          <div className="grid gap-4 rounded-3xl border border-border bg-card p-6 shadow-soft md:grid-cols-3">
            {[
              { icon: MapPin, label: "Location", value: "Rainier Valley, Seattle" },
              {
                icon: Bus,
                label: "Transportation",
                value: "Ask staff about school pickup and local options",
              },
              {
                icon: HelpCircle,
                label: "Membership",
                value: "$50/year, with signup support available",
              },
            ].map((item) => (
              <div key={item.label} className="flex gap-3">
                <item.icon className="mt-1 h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          id="plan-visit"
          className="mx-auto grid max-w-6xl gap-8 px-6 pb-14 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Plan a Visit
            </p>
            <h2 className="mt-1 font-display text-4xl text-ink">
              Tell us what your child wants to try
            </h2>
            <p className="mt-3 text-muted-foreground">
              Send a quick visit request. Club staff can follow up with a time, answer questions,
              and help with signup if your family is ready.
            </p>
          </div>
          <form
            onSubmit={submitVisitRequest}
            className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-soft"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="visit-child">Child name</Label>
                <Input
                  id="visit-child"
                  required
                  value={visitForm.childName}
                  onChange={(event) => updateVisitForm("childName", event.target.value)}
                  className="mt-1.5"
                  placeholder="Jordan"
                />
              </div>
              <div>
                <Label htmlFor="visit-grade">Grade</Label>
                <Input
                  id="visit-grade"
                  required
                  value={visitForm.grade}
                  onChange={(event) => updateVisitForm("grade", event.target.value)}
                  className="mt-1.5"
                  placeholder="6th"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="visit-contact">Parent or guardian contact</Label>
                <Input
                  id="visit-contact"
                  required
                  value={visitForm.guardianContact}
                  onChange={(event) => updateVisitForm("guardianContact", event.target.value)}
                  className="mt-1.5"
                  placeholder="Phone, WhatsApp, or email"
                />
              </div>
              <div>
                <Label>Interest area</Label>
                <Select
                  value={visitForm.interestArea}
                  onValueChange={(value) => updateVisitForm("interestArea", value)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homework help">Homework help</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Cooking">Cooking</SelectItem>
                    <SelectItem value="Robotics">Robotics</SelectItem>
                    <SelectItem value="Teen programs">Teen programs</SelectItem>
                    <SelectItem value="Not sure yet">Not sure yet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="visit-date">Preferred visit date</Label>
                <Input
                  id="visit-date"
                  type="date"
                  required
                  value={visitForm.preferredDate}
                  onChange={(event) => updateVisitForm("preferredDate", event.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="visit-notes">Questions or notes</Label>
              <Textarea
                id="visit-notes"
                value={visitForm.notes}
                onChange={(event) => updateVisitForm("notes", event.target.value)}
                className="mt-1.5"
                rows={3}
                placeholder="Optional: transportation, schedule, signup help, or anything staff should know."
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full rounded-full shadow-warm">
              {submitting ? "Sending request..." : "Send visit request"}
            </Button>
          </form>
        </section>

        <section className="bg-ink px-6 py-12 text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-4xl">Come visit before you decide.</h2>
              <p className="mt-2 max-w-2xl text-primary-foreground/80">
                Stop by this week, meet the staff, see the space, and ask questions. Staff can also
                walk through signup in person or by phone.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <a href="#plan-visit">Plan a visit</a>
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-primary-foreground/50 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Signup help
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function isMissingFollowUpTable(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("follow_up_contacts") &&
    (normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("not find"))
  );
}

function saveLocalVisitRequest(request: Record<string, string | null>) {
  if (typeof window === "undefined") return;
  const existing = JSON.parse(window.localStorage.getItem(localVisitRequestsKey) ?? "[]") as Array<
    Record<string, string | null>
  >;
  window.localStorage.setItem(localVisitRequestsKey, JSON.stringify([request, ...existing]));
}
