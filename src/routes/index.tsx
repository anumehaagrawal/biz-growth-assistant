import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ArrowRight, Wand2, FileText, Instagram, QrCode, Users, HeartHandshake,
  CheckCircle2, Clock, Megaphone,
} from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Outreach.AI — AI marketing partner for nonprofits" },
      { name: "description", content: "Outreach.AI is the AI marketing partner for nonprofits. Turn one event into social posts, printable flyers, parent texts, school blurbs, and a sign-up QR — in under a minute." },
      { property: "og:title", content: "Outreach.AI — AI marketing partner for nonprofits" },
      { property: "og:description", content: "One event in. Social posts, flyers, parent messages, and a sign-up QR out. Built for nonprofit teams of one." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-clay shadow-warm">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-semibold text-ink">Outreach.AI</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/posts" className="hidden text-sm text-muted-foreground hover:text-ink sm:inline">
            Community gallery
          </Link>
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-12 md:grid-cols-2 md:items-center md:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-clay animate-pulse" />
            The AI marketing partner for nonprofits
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-ink text-balance md:text-6xl">
            One event in. <span className="italic text-primary">A whole outreach kit out.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-balance">
            Outreach.AI is built for nonprofit teams of one. Tell us what's happening this week — we'll write the social post, printable flyer, school newsletter blurb, parent text, and a sign-up QR code your families can scan at the door.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full shadow-warm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/posts">See a live example</Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No marketing experience needed</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Writes in your voice</span>
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Free to start</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-warm blur-2xl opacity-60" />
          <img
            src={heroImg}
            alt="Nonprofit staff with kids and families"
            width={1280}
            height={960}
            className="relative rounded-[2rem] shadow-warm"
          />
        </div>
      </section>

      {/* What you get — the "kit" */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">What Outreach.AI makes for you</p>
          <h2 className="mt-2 font-display text-4xl text-ink">Everything one event needs — generated together</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Type one program once. Get six on-brand pieces of outreach, ready to send.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Instagram, title: "Social caption", body: "Copy & post to Instagram or Facebook in two clicks." },
            { icon: FileText, title: "Printable PDF flyer", body: "Your event image + AI copy + sign-up QR — print and post on the wall." },
            { icon: Megaphone, title: "School newsletter blurb", body: "The 4-sentence version a teacher can paste into the Friday email." },
            { icon: Users, title: "Parent SMS / WhatsApp", body: "A short, warm message families actually read on their phone." },
            { icon: QrCode, title: "Live sign-up QR code", body: "Scans to a quick form — child + parent name — and gives them a check-in QR." },
            { icon: Sparkles, title: "Short event description", body: "The one-paragraph version for partners, donors, and your website." },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-border bg-card/70 p-6 backdrop-blur transition-all hover:shadow-soft hover:-translate-y-1"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-[2rem] border border-border bg-card/60 p-8 backdrop-blur md:p-12">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">How it works</p>
            <h2 className="mt-2 font-display text-4xl text-ink">From event to outreach in under a minute</h2>
          </div>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { step: "1", icon: Wand2, title: "Tell us what's happening", body: "What's the program? Who's it for? When is it? That's it." },
              { step: "2", icon: Sparkles, title: "We write the whole kit", body: "Six pieces of on-brand copy generated together — in your nonprofit's voice." },
              { step: "3", icon: HeartHandshake, title: "Send it & track sign-ups", body: "Copy to socials, print the flyer, share the QR. We track every family who signs up." },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="absolute -left-2 -top-3 font-display text-6xl text-primary/15">{s.step}</div>
                <div className="relative">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-clay text-primary-foreground shadow-warm">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl text-ink">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for nonprofits */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">Built for nonprofits</p>
            <h2 className="mt-2 font-display text-4xl text-ink text-balance">
              You shouldn't need a marketing team to fill the room.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Most nonprofits don't have a comms director. They have one person doing program, fundraising, social, family follow-up, and the printer that's out of toner. Outreach.AI is the AI marketing partner that does the writing, designing, and tracking — so that one person can stay focused on families.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-ink">
              {[
                "Knows your mission — upload your website, annual report, or one-pagers and we write from your real materials.",
                "Writes in plain, warm language for the families you actually serve.",
                "Generates a weekly recommendations with five concrete moves — partnerships, schools, community visits.",
                "Tracks first-time visitors and reminds you who needs a 48-hour follow-up.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-border bg-card p-7 shadow-soft">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Clock className="h-3.5 w-3.5" /> A typical Tuesday
            </div>
            <div className="mt-4 space-y-4">
              {[
                { time: "2:14pm", body: "Staff types: \"Robotics build night, middle schoolers, Wed at 4:30pm.\"" },
                { time: "2:14pm", body: "Outreach.AI writes the Instagram caption, flyer copy, parent text, and QR card." },
                { time: "2:15pm", body: "Staff downloads the PDF flyer with the kids-building-robots photo." },
                { time: "2:16pm", body: "Caption posted to IG. Flyer printed. Parent text sent to last week's visitors." },
                { time: "Wed 5:02pm", body: "Three families scan the QR at the door. All show up in the dashboard." },
              ].map((row, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="w-16 flex-shrink-0 font-mono text-xs text-muted-foreground">{row.time}</span>
                  <span className="text-ink">{row.body}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-[2rem] bg-gradient-clay p-10 text-center shadow-warm md:p-14">
          <h2 className="font-display text-4xl text-primary-foreground text-balance">
            Spend the morning with families. Let Outreach.AI handle the marketing.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
            Free to start. No credit card. Set up your nonprofit in under five minutes.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="rounded-full">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get started — it's free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link to="/posts">See what nonprofits are posting</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        Outreach.AI — the AI marketing partner for nonprofits.
      </footer>
    </div>
  );
}
