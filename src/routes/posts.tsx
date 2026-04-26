import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Sparkles, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Post = {
  id: string;
  slug: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string;
  org_name: string | null;
  created_at: string;
};

async function fetchPosts(): Promise<Post[]> {
  const { data } = await supabase
    .from("posts")
    .select("id,slug,media_url,media_type,caption,org_name,created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []) as Post[];
}

export const Route = createFileRoute("/posts")({
  loader: () => fetchPosts(),
  head: () => ({
    meta: [
      { title: "Community posts — Outreach.AI" },
      { name: "description", content: "Stories, updates, and moments from non-profits using Outreach.AI." },
      { property: "og:title", content: "Community posts — Outreach.AI" },
      { property: "og:description", content: "Stories, updates, and moments from non-profits using Outreach.AI." },
    ],
  }),
  component: PostsGallery,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="font-display text-2xl text-ink">Couldn't load posts</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
      </div>
    );
  },
});

function PostsGallery() {
  const posts = Route.useLoaderData() as Post[];

  return (
    <div className="min-h-screen bg-gradient-hero py-12">
      <div className="mx-auto max-w-6xl px-6">
        <header className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> Community
          </div>
          <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Posts from the field</h1>
          <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
            Real stories, moments, and asks from non-profits. Click any card to read more.
          </p>
        </header>

        {posts.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
            No posts yet — be the first to share.
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <Link
                key={p.id}
                to="/p/$slug"
                params={{ slug: p.slug }}
                className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-warm"
              >
                <div className="aspect-square w-full overflow-hidden bg-muted">
                  {p.media_type === "image" ? (
                    <img src={p.media_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="relative h-full w-full">
                      <video src={p.media_url} className="h-full w-full object-cover" muted playsInline />
                      <div className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5">
                        <Film className="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-xs font-medium text-muted-foreground">{p.org_name || "Anonymous"}</div>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-ink">{p.caption}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
