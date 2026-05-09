import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import { TearableUi } from "./tearable-ui";

export const metadata: Metadata = {
  title: "Tearable UI | Nicenonecb",
  description:
    "A cloth-simulated canvas texture UI demo with real triangle-index tearing and layered pages.",
};

export default function TearableUiPage() {
  return (
    <>
      <EffectBackLink />
      <TearableUi />
    </>
  );
}
