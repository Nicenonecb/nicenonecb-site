import { articleMarkdownByFile } from "../content/articles/markdown";

type ArticleFile = keyof typeof articleMarkdownByFile;

export type Article = {
  description: string;
  file: ArticleFile;
  slug: string;
  title: string;
};

export const articles: Article[] = [
  {
    slug: "cool-codex-mac-heat",
    title: "别迷信大模型：Codex 也能把 Mac 推到 98°C",
    description: "复盘 Cool Codex 如何用进程分类与安全清理治理 AI Agent 本地副作用。",
    file: "cool-codex-mac-heat.md",
  },
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

  const markdown = articleMarkdownByFile[article.file];

  return {
    ...article,
    markdown,
  };
}
