import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/post/$postId")({
  head: () => ({ meta: [{ title: "Post — Bloom" }] }),
  component: PublicPostPage,
});

type MediaPost = {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  platform: string | null;
  user_id: string;
};

type OrgInfo = {
  name: string;
  website: string | null;
};

function PublicPostPage() {
  const { postId } = Route.useParams();
  const [post, setPost] = useState<MediaPost | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: postData, error } = await supabase
        .from("media_posts")
        .select("id, media_url, media_type, caption, platform, user_id")
        .eq("id", postId)
        .eq("is_published", true)
        .maybeSingle();

      if (error || !postData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setPost(postData);

      const { data: bizData } = await supabase
        .from("businesses")
        .select("name, website")
        .eq("user_id", postData.user_id)
        .maybeSingle();

      if (bizData) setOrg(bizData);
      setLoading(false);
    };

    load();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Sparkles className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="font-display text-2xl text-ink">Post not found</h1>
        <p className="text-muted-foreground">This post may have been removed or isn't published yet.</p>
        <Link to="/">
          <Button variant="outline" className="rounded-full">Go home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-clay shadow-warm">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-xl font-semibold text-ink">
              {org?.name ?? "Bloom"}
            </span>
          </div>
          {org?.website && (
            <a href={org.website} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-1.5 rounded-full text-xs">
                <ExternalLink className="h-3.5 w-3.5" />
                Visit us
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Post card */}
      <main className="mx-auto max-w-lg px-6 py-8">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          {/* Media */}
          <div className="relative aspect-square w-full overflow-hidden bg-secondary">
            {post.media_type === "image" ? (
              <img
                src={post.media_url}
                alt="Club moment"
                className="h-full w-full object-cover"
              />
            ) : (
              <video
                src={post.media_url}
                controls
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Caption */}
          {post.caption && (
            <div className="p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-clay">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-ink">{org?.name ?? "Our Organization"}</span>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink">
                {post.caption}
              </pre>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 rounded-3xl bg-card border border-border p-6 text-center shadow-soft">
          <h2 className="font-display text-2xl text-ink">Want to join us?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {org?.name ? `${org.name} is open to everyone.` : "We'd love to have you."}{" "}
            Stop by for a free visit — no commitment needed.
          </p>
          {org?.website ? (
            <a href={org.website} target="_blank" rel="noopener noreferrer" className="mt-4 block">
              <Button size="lg" className="w-full rounded-full shadow-warm">
                Learn more & sign up
              </Button>
            </a>
          ) : (
            <Button size="lg" className="mt-4 w-full rounded-full shadow-warm" disabled>
              Learn more & sign up
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
