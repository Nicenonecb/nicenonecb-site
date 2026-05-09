import Link from "next/link";
import styles from "./effect-back-link.module.css";

export function EffectBackLink() {
  return (
    <Link className={styles.backLink} href="/effects">
      <span aria-hidden="true">←</span>
      <span>Back</span>
    </Link>
  );
}
