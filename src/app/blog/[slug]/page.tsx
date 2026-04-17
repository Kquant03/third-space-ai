import { getPost, getAllPosts } from "@/content/posts";
import { notFound } from "next/navigation";
import Link from "next/link";

export function generateStaticParams() {
  return getAllPosts().map(p => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) return {};
  return { title: `${post.title} · Rukha`, description: post.excerpt };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getPost(params.slug);
  if (!post) notFound();

  // Simple markdown-ish rendering (swap with MDX later)
  const paragraphs = post.body.split("\n\n").map((block, i) => {
    if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
    if (block.startsWith("### ")) return <h3 key={i}>{block.slice(4)}</h3>;
    if (block.startsWith("> ")) return <blockquote key={i}>{block.slice(2)}</blockquote>;
    if (block.startsWith("**") && block.endsWith("**")) return <p key={i}><strong>{block.slice(2, -2)}</strong></p>;
    return <p key={i}>{block}</p>;
  });

  return (
    <article className="max-w-[700px] mx-auto px-5 pt-32 pb-20">
      <Link href="/blog" className="font-mono text-[9px] tracking-[0.12em] text-ink-faint uppercase hover:text-lantern-gold transition-colors no-underline mb-8 block">
        ← Research & Writing
      </Link>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl" style={{ color: post.color }}>{post.icon}</span>
          <div>
            <h1 className="font-serif text-3xl font-light text-ink tracking-[0.04em]">{post.title}</h1>
            <p className="font-serif text-sm italic text-ink-muted/60 mt-1">{post.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="font-mono text-[9px] text-ink-muted tracking-wider">{post.date}</span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[9px] text-ink-muted tracking-wider">Stanley Sebastian</span>
        </div>
        <div className="flex gap-2 mt-4">
          {post.tags.map(t => (
            <span key={t} className="text-[8px] font-mono tracking-wider px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-ink-muted">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="lantern-rule" />
      <div className="prose-lantern mt-8">{paragraphs}</div>
    </article>
  );
}
