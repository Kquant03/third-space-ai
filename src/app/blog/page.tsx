import Link from "next/link";
import { getAllPosts } from "@/content/posts";

export const metadata = {
  title: "Research & Writing · Rukha",
  description: "Papers, projects, and technical writing from the Teármann Research Ecosystem.",
};

export default function BlogPage() {
  const posts = getAllPosts();
  return (
    <section className="max-w-[800px] mx-auto px-5 pt-32 pb-20">
      <div className="text-center mb-16">
        <h1 className="font-serif text-4xl font-light text-ink tracking-[0.08em] mb-3">Research & Writing</h1>
        <p className="text-sm text-ink-muted font-light">Papers, projects, and technical writing from the Teármann Research Ecosystem.</p>
      </div>
      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`}
            className="glass rounded-xl p-6 no-underline transition-all duration-500 hover:border-white/10 hover:-translate-y-1 group">
            <div className="flex items-start gap-4">
              <span className="text-2xl mt-0.5 transition-all duration-400 group-hover:drop-shadow-[0_0_8px_var(--glow)]"
                style={{ color: post.color, "--glow": post.color } as React.CSSProperties}>
                {post.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-[15px] font-semibold font-mono tracking-[0.04em] text-ink group-hover:text-lantern-gold transition-colors">{post.title}</h2>
                  <span className="text-[8px] font-mono text-ink-muted tracking-wider">{post.date}</span>
                </div>
                <p className="text-[11px] font-serif italic text-ink-muted/70 mb-2">{post.subtitle}</p>
                <p className="text-[12px] text-ink-muted font-light leading-[1.7] line-clamp-2">{post.excerpt}</p>
                <div className="flex gap-2 mt-3">
                  {post.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[8px] font-mono tracking-wider px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-ink-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
