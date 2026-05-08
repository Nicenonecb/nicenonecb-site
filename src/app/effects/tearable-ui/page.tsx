import type { Metadata } from "next";
import { TearableUi } from "./tearable-ui";

export const metadata: Metadata = {
  title: "Tearable UI | NiceNoneCB",
  description:
    "A cloth-simulated canvas texture UI demo with real triangle-index tearing and layered pages.",
};

export default function TearableUiPage() {
  return <TearableUi />;
}
