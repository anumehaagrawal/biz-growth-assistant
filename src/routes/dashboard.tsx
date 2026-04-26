import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sparkles, MessageCircle, Calendar, Settings, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bloom" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const exists = !!data;
        setHasBusiness(exists);
        if (!exists && location.pathname !== "/dashboard/onboarding") {
          navigate({ to: "/dashboard/onboarding" });
        } else if (exists && (location.pathname === "/dashboard" || location.pathname === "/dashboard/")) {
          navigate({ to: "/dashboard/content" });
        }
      });
  }, [user, location.pathname, navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("See you soon!");
    navigate({ to: "/" });
  };

  if (loading || !user || hasBusiness === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const isOnboarding = location.pathname === "/dashboard/onboarding";

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard/content" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-clay shadow-warm">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-semibold text-ink">Bloom</span>
          </Link>

          {hasBusiness && !isOnboarding && (
            <nav className="hidden items-center gap-1 rounded-full border border-border bg-background/60 p-1 md:flex">
              <NavTab to="/dashboard/content" icon={MessageCircle} label="Content" />
              <NavTab to="/dashboard/outreach" icon={Calendar} label="Weekly Plan" />
              <NavTab to="/dashboard/settings" icon={Settings} label="Business" />
            </nav>
          )}

          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Sign out</span>
          </Button>
        </div>
        {hasBusiness && !isOnboarding && (
          <nav className="flex items-center justify-center gap-1 border-t border-border/40 px-4 pb-3 md:hidden">
            <NavTab to="/dashboard/content" icon={MessageCircle} label="Content" />
            <NavTab to="/dashboard/outreach" icon={Calendar} label="Plan" />
            <NavTab to="/dashboard/settings" icon={Settings} label="Business" />
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function NavTab({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
        active ? "bg-primary text-primary-foreground shadow-warm" : "text-muted-foreground hover:text-ink"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
