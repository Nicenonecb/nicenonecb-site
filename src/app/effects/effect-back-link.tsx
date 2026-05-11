"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import styles from "./effect-back-link.module.css";

type EffectBackLinkProps = {
  href?: string;
  label?: string;
};

function getBackLabel() {
  return document.documentElement.lang.toLowerCase().startsWith("en") ? "Back" : "返回";
}

function subscribeToDocumentLang(onStoreChange: () => void) {
  // 首页语言切换只写入 html lang，详情页按钮跟随这个全局语言标记。
  const observer = new MutationObserver(onStoreChange);

  observer.observe(document.documentElement, {
    attributeFilter: ["lang"],
    attributes: true,
  });

  return () => {
    observer.disconnect();
  };
}

export function EffectBackLink({ href = "/effects", label }: EffectBackLinkProps) {
  const localizedLabel = useSyncExternalStore(subscribeToDocumentLang, getBackLabel, () => "返回");

  return (
    <Link className={styles.backLink} href={href}>
      {label ?? localizedLabel}
    </Link>
  );
}
