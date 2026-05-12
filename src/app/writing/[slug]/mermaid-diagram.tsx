"use client";

import { useEffect, useId, useState } from "react";

type RenderState =
  | { html: string; status: "ready" }
  | { message: string; status: "error" }
  | { status: "loading" };

export function MermaidDiagram({ code }: { code: string }) {
  const id = useId().replace(/:/g, "");
  const [state, setState] = useState<RenderState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          securityLevel: "strict",
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            background: "#050505",
            edgeLabelBackground: "#050505",
            fontFamily: "var(--font-geist-sans)",
            lineColor: "#34d399",
            mainBkg: "#0b0f0d",
            nodeBorder: "#34d399",
            primaryColor: "#0b0f0d",
            primaryTextColor: "#f4f4f5",
            secondaryColor: "#111827",
            tertiaryColor: "#020617",
          },
        });

        const { svg } = await mermaid.render(`mermaid-${id}`, code);

        if (!cancelled) {
          setState({ html: svg, status: "ready" });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            message: error instanceof Error ? error.message : "Mermaid render failed",
            status: "error",
          });
        }
      }
    }

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (state.status === "ready") {
    return (
      <figure className="overflow-x-auto border border-white/10 bg-black/40 p-4">
        <div
          className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: state.html }}
        />
        <figcaption className="mt-3 border-t border-white/10 pt-3 font-mono text-xs text-zinc-500">
          {code.split("\n")[0]}
        </figcaption>
      </figure>
    );
  }

  if (state.status === "error") {
    return (
      <pre className="overflow-x-auto border border-red-300/30 bg-red-950/20 p-4 font-mono text-sm leading-7 text-red-100">
        <code>{`${state.message}\n\n${code}`}</code>
      </pre>
    );
  }

  return (
    <div className="border border-white/10 bg-zinc-950/80 p-4 font-mono text-sm text-zinc-500">
      rendering {code.split("\n")[0]}...
    </div>
  );
}
