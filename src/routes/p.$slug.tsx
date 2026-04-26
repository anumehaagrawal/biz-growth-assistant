import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Heart, MessageCircle, Send, Bookmark, Sparkles } from "lucide-react";
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

async function fetchPost(slug: string): Promise<Post | null> {
  const { data } = await supabase
    .from("posts")
    .select("id,slug,media_url,media_type,caption,org_name,created_at")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return (data as Post) ?? null;
}

export const Route = createFileRoute("/p/$slug")({
  loader: ({ params }) => fetchPost(params.slug),
  head: ({ loaderData, params }) => {
    const post = loaderData as Post | null;
    if (!post) {
      return { meta: [{ title: "Post not found" }] };
    }
    const firstLine = post.caption.split("\n")[0].slice(0, 90);
    const description = post.caption.replace(/\n+/g, " ").slice(0, 200);
    const title = `${post.org_name ? post.org_name + " — " : ""}${firstLine}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (post.media_type === "image") {
      meta.push({ property: "og:image", content: post.media_url });
      meta.push({ name: "twitter:image", content: post.media_url });
    }
    return { meta };
  },
  component: PostPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="font-display text-3xl text-ink">Post not found</h1>
      <p className="mt-2 text-muted-foreground">This post may have been removed.</p>
      <Link to="/posts" className="mt-4 text-sm underline">Browse all posts</Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="font-display text-2xl text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <Button className="mt-4" onClick={() => { router.invalidate(); reset(); }}>Retry</Button>
      </div>
    );
  },
});

function PostPage() {
  const post = Route.useLoaderData() as Post | null;

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
        <h1 className="font-display text-3xl text-ink">Post not found</h1>
        <p className="mt-2 text-muted-foreground">This post may have been removed.</p>
        <Link to="/posts" className="mt-4 text-sm underline">Browse all posts</Link>
      </div>
    );
  }

  const date = new Date(post.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-hero py-10">
      <div className="mx-auto max-w-xl px-4">
        <Link to="/posts" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink">
          ← All posts
        </Link>
        <article className="overflow-hidden rounded-3xl border border-border bg-card shadow-warm">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-clay text-sm font-semibold text-primary-foreground">
              {(post.org_name || "B").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-ink">{post.org_name || "Anonymous"}</div>
              <div className="text-xs text-muted-foreground">{date}</div>
            </div>
          </div>
          <div className="aspect-square w-full bg-muted">
            {post.media_type === "image" ? (
              <img src={post.media_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={post.media_url} className="h-full w-full object-cover" controls autoPlay loop muted playsInline />
            )}
          </div>
          <div className="flex items-center gap-4 px-5 py-3 text-ink">
            <Heart className="h-6 w-6" />
            <MessageCircle className="h-6 w-6" />
            <Send className="h-6 w-6" />
            <Bookmark className="ml-auto h-6 w-6" />
          </div>
          <div className="whitespace-pre-wrap px-5 pb-6 text-[15px] leading-relaxed text-ink">
            <span className="font-semibold">{post.org_name || "post"}</span>{" "}
            {post.caption}
          </div>
        </article>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Made with Bloom
        </div>
      </div>
    </div>
  );
}
