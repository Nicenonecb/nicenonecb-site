/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { MermaidDiagram } from "./mermaid-diagram";

type Block =
  | { code: string; language: string; type: "code" }
  | { level: number; text: string; type: "heading" }
  | { alt: string; src: string; type: "image" }
  | { rows: string[][]; type: "table" }
  | { items: string[]; ordered: boolean; type: "list" }
  | { text: string; type: "paragraph" };

const articleImageSizes: Record<string, { height: number; width: number }> = {
  "/articles/deepseek-v4-litekv/image1.png": { height: 1152, width: 2160 },
  "/articles/deepseek-v4-litekv/image2.png": { height: 900, width: 1475 },
  "/articles/deepseek-v4-litekv/image3.png": { height: 720, width: 1120 },
  "/articles/deepseek-v4-litekv/image4.png": { height: 720, width: 1120 },
  "/articles/deepseek-v4-litekv/image5.png": { height: 720, width: 1120 },
  "/articles/deepseek-v4-litekv/image6.png": { height: 720, width: 1120 },
  "/articles/deepseek-v4-litekv/image7.png": { height: 672, width: 1600 },
  "/articles/deepseek-v4-litekv/image8.png": { height: 720, width: 1120 },
};

function parseMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({ code: codeLines.join("\n"), language, type: "code" });
      index += 1;
      continue;
    }

    const imageMatch = trimmed.match(/^!\[(.*)]\((.*)\)$/);
    if (imageMatch) {
      blocks.push({ alt: imageMatch[1], src: imageMatch[2], type: "image" });
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        level: headingMatch[1].length,
        text: headingMatch[2],
        type: "heading",
      });
      index += 1;
      continue;
    }

    if (trimmed.includes("|") && lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}/)) {
      const rows: string[][] = [];

      while (index < lines.length && lines[index].trim().includes("|")) {
        const row = lines[index]
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());

        if (!row.every((cell) => /^:?-{3,}:?$/.test(cell))) {
          rows.push(row);
        }

        index += 1;
      }

      blocks.push({ rows, type: "table" });
      continue;
    }

    const listMatch = trimmed.match(/^(-|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const ordered = /\d+\./.test(listMatch[1]);
      const items: string[] = [];

      while (index < lines.length) {
        const itemMatch = lines[index].trim().match(/^(-|\d+\.)\s+(.+)$/);

        if (!itemMatch || /\d+\./.test(itemMatch[1]) !== ordered) {
          break;
        }

        items.push(itemMatch[2]);
        index += 1;
      }

      blocks.push({ items, ordered, type: "list" });
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;

    // 连续普通文本合并为段落，避免 Markdown 源文件里的手动换行破坏阅读节奏。
    while (index < lines.length) {
      const nextLine = lines[index].trim();
      const startsBlock =
        !nextLine ||
        nextLine.startsWith("#") ||
        nextLine.startsWith("```") ||
        nextLine.startsWith("![") ||
        nextLine.match(/^(-|\d+\.)\s+/) ||
        (nextLine.includes("|") && lines[index + 1]?.trim().match(/^\|?\s*:?-{3,}/));

      if (startsBlock) {
        break;
      }

      paragraphLines.push(nextLine);
      index += 1;
    }

    blocks.push({ text: paragraphLines.join(" "), type: "paragraph" });
  }

  return blocks;
}

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const value = match[0];

    if (value.startsWith("**")) {
      nodes.push(
        <strong className="font-semibold text-zinc-100" key={`${value}-${match.index}`}>
          {value.slice(2, -2)}
        </strong>,
      );
    } else if (value.startsWith("`")) {
      nodes.push(
        <code
          className="border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[0.88em] text-emerald-200"
          key={`${value}-${match.index}`}
        >
          {value.slice(1, -1)}
        </code>,
      );
    } else {
      const linkMatch = value.match(/^\[([^\]]+)]\(([^)]+)\)$/);
      nodes.push(
        <a
          className="text-emerald-300 underline decoration-emerald-300/30 underline-offset-4 transition hover:text-emerald-100"
          href={linkMatch?.[2] ?? "#"}
          key={`${value}-${match.index}`}
          rel="noreferrer"
          target={linkMatch?.[2].startsWith("http") ? "_blank" : undefined}
        >
          {linkMatch?.[1] ?? value}
        </a>,
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function MarkdownArticle({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);

  return (
    <div className="space-y-6 text-base leading-8 text-zinc-300">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h1
                className="text-4xl font-semibold leading-tight text-zinc-50 sm:text-5xl"
                key={index}
              >
                {renderInline(block.text)}
              </h1>
            );
          }

          if (block.level === 2) {
            return (
              <h2
                className="border-t border-white/10 pt-10 text-2xl font-semibold text-zinc-50"
                key={index}
              >
                {renderInline(block.text)}
              </h2>
            );
          }

          return (
            <h3 className="text-xl font-semibold text-zinc-100" key={index}>
              {renderInline(block.text)}
            </h3>
          );
        }

        if (block.type === "image") {
          const imageSize = articleImageSizes[block.src] ?? { height: 800, width: 1200 };

          return (
            <figure className="overflow-hidden border border-white/10 bg-black/40" key={index}>
              <img
                alt={block.alt}
                className="h-auto w-full"
                height={imageSize.height}
                loading="eager"
                src={block.src}
                width={imageSize.width}
              />
              <figcaption className="border-t border-white/10 px-4 py-3 font-mono text-xs text-zinc-500">
                {block.alt}
              </figcaption>
            </figure>
          );
        }

        if (block.type === "code") {
          if (block.language === "mermaid") {
            return <MermaidDiagram code={block.code} key={index} />;
          }

          return (
            <pre
              className="overflow-x-auto border border-white/10 bg-zinc-950/80 p-4 font-mono text-sm leading-7 text-zinc-200"
              key={index}
            >
              <code>{block.code}</code>
            </pre>
          );
        }

        if (block.type === "list") {
          const Tag = block.ordered ? "ol" : "ul";

          return (
            <Tag
              className={`space-y-2 pl-6 ${
                block.ordered ? "list-decimal" : "list-disc marker:text-emerald-300"
              }`}
              key={index}
            >
              {block.items.map((item) => (
                <li key={item}>{renderInline(item)}</li>
              ))}
            </Tag>
          );
        }

        if (block.type === "table") {
          const [head, ...body] = block.rows;

          return (
            <div className="overflow-x-auto border border-white/10" key={index}>
              <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                <thead className="bg-white/5 text-zinc-100">
                  <tr>
                    {head.map((cell) => (
                      <th className="border-b border-white/10 px-4 py-3 font-semibold" key={cell}>
                        {renderInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {body.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td className="px-4 py-3 text-zinc-300" key={`${rowIndex}-${cellIndex}`}>
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
