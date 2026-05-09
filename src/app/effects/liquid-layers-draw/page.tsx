import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import { LiquidLayersDraw } from "./liquid-layers-draw";

export const metadata: Metadata = {
  title: "Liquid Layers | Nicenonecb",
  description: "A full-screen PVFS liquid particle canvas inspired by grantkot.com/ll.",
};

export default function LiquidLayersDrawPage() {
  return (
    <>
      <EffectBackLink />
      <LiquidLayersDraw />
    </>
  );
}
