import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle, Calendar, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloom — Your warm marketing assistant" },
      { name: "description", content: "AI-powered content and weekly outreach plans for small businesses and organizations." },
      { property: "og:title", content: "Bloom — Your warm marketing assistant" },
      { property: "og:description", content: "AI-powered content and weekly outreach plans for small businesses." },
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
          <span className="font-display text-2xl font-semibold text-ink">Bloom</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-12 md:grid-cols-2 md:items-center md:pt-20">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-clay animate-pulse" />
            For small businesses & organizations
          </div>
          <h1 className="mt-5 font-display text-5xl leading-[1.05] tracking-tight text-ink text-balance md:text-6xl">
            Marketing that feels like it has{" "}
            <span className="italic text-primary">a heart.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground text-balance">
            Bloom is your AI marketing partner. Generate on-brand content in seconds and get a fresh weekly outreach plan tailored to your business.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg" className="rounded-full shadow-warm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start growing — it's free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">No credit card required</span>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-warm blur-2xl opacity-60" />
          <img
            src={heroImg}
            alt="Small business owner creating marketing content with Bloom"
            width={1280}
            height={960}
            className="relative rounded-[2rem] shadow-warm"
          />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: MessageCircle,
              title: "Content that sounds like you",
              body: "Social posts, emails, and blog articles written in your brand voice. Ready to publish.",
            },
            {
              icon: Calendar,
              title: "A new plan every week",
              body: "Five concrete outreach moves tailored to your business — partnerships, community, referrals.",
            },
            {
              icon: Sparkles,
              title: "Onboard once, grow forever",
              body: "Tell us about your business once. Bloom remembers and keeps everything on-brand.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="group rounded-3xl border border-border bg-card/70 p-7 backdrop-blur transition-all hover:shadow-soft hover:-translate-y-1"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-xl text-ink">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        Made with care · Bloom Marketing
      </footer>
    </div>
  );
}
