import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const articlesDirectory = path.join(process.cwd(), "src", "content", "articles");
const outputFile = path.join(articlesDirectory, "markdown.ts");

const entries = readdirSync(articlesDirectory)
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) => {
    const markdown = readFileSync(path.join(articlesDirectory, file), "utf8");

    return `  ${JSON.stringify(file)}: ${JSON.stringify(markdown)},`;
  })
  .join("\n");

// Markdown 内容需要直接打进 Worker bundle，避免 Cloudflare 运行时读取本地文件系统。
writeFileSync(
  outputFile,
  `// 此文件由 scripts/generate-article-markdown.mjs 生成，请不要手动编辑。\nexport const articleMarkdownByFile = {\n${entries}\n} as const;\n`,
);
