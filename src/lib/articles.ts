import { readFileSync } from "node:fs";
import path from "node:path";

export type Article = {
  description: string;
  file: string;
  slug: string;
  title: string;
};

const articlesDirectory = path.join(process.cwd(), "src/content/articles");

export const articles: Article[] = [
  {
    slug: "deepseek-v4-litekv",
    title: "DeepSeek-V4 注意力机制与 LiteKV 验证",
    description: "用可运行实验拆解 CSA、HCA 与 NSA-lite 的长上下文成本权衡。",
    file: "deepseek-v4-litekv.md",
  },
  {
    slug: "ai-memory-harness",
    title: "从 AI 记忆到 Harness 工程：AI Coding 与应用市场落地探讨",
    description: "从记忆层、工具层、验证层解释 AI 应用如何从演示走向可交付。",
    file: "ai-memory-harness.md",
  },
];

export function getArticle(slug: string) {
  const article = articles.find((item) => item.slug === slug);

  if (!article) {
    return null;
  }

  const markdown = readFileSync(path.join(articlesDirectory, article.file), "utf8");

  return {
    ...article,
    markdown,
  };
}
