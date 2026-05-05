import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "glass-page Effect | NiceNoneCB",
  description: "Redirects to the updated glass-page effect.",
};

export default function GlassHeroEffectPage() {
  redirect("/effects/glass-page");
}
