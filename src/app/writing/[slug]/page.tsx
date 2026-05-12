import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, getArticle } from "../../../lib/articles";
import { MarkdownArticle } from "./markdown-article";

export function generateStaticParams() {
  return articles.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return {};
  }

  return {
    description: article.description,
    title: `${article.title} | Nicenonecb`,
  };
}

export default async function WritingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="site-grid min-h-screen text-zinc-100">
      <article className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-8 lg:px-10">
        <header className="mb-10 border-b border-white/10 pb-8">
          <Link
            className="font-mono text-xs uppercase tracking-[0.22em] text-emerald-300 transition hover:text-emerald-100"
            href="/#writing"
          >
            返回文章
          </Link>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">
            Technical writing
          </p>
        </header>
        <MarkdownArticle markdown={article.markdown} />
      </article>
    </main>
  );
}
