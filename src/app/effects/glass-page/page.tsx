import type { Metadata } from "next";
import { GlassPage } from "./glass-page";

export const metadata: Metadata = {
  title: "GLASS PAGE Effect | Nicenonecb",
  description:
    "A Three.js fragmented glass experiment with CanvasTexture panels and chromatic edges.",
};

export default function GlassPageEffectPage() {
  return <GlassPage />;
}
