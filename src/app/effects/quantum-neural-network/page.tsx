import type { Metadata } from "next";
import { EffectBackLink } from "../effect-back-link";
import styles from "../effects-gallery.module.css";
import { QuantumNeuralNetwork } from "./quantum-neural-network";

export const metadata: Metadata = {
  title: "Quantum Neural Network Effect | Nicenonecb",
  description:
    "A Three.js quantum neural network card with glowing nodes, energy pulses, morphing structures, density controls, and glass UI.",
};

export default function QuantumNeuralNetworkEffectPage() {
  return (
    <main className={styles.page}>
      <EffectBackLink />

      <section className={styles.detailShell}>
        <div className={styles.detailStage}>
          <QuantumNeuralNetwork />
        </div>
      </section>
    </main>
  );
}
