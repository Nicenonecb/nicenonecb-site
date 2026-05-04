import type { Metadata } from "next";
import { GlassHero } from "../glass-hero";

export const metadata: Metadata = {
  title: "glass Effect | NiceNoneCB",
  description:
    "A Three.js fragmented glass experiment for NiceNoneCB effects.",
};

export default function GlassHeroEffectPage() {
  return <GlassHero />;
}
