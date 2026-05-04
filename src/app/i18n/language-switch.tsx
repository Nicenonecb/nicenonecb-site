"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Lang } from "./site-copy";

type LanguageSwitchProps = {
  lang: Lang;
  setLang: Dispatch<SetStateAction<Lang>>;
};

const languages: Lang[] = ["en", "zh"];

export function LanguageSwitch({ lang, setLang }: LanguageSwitchProps) {
  return (
    <div className="flex border border-white/10 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-zinc-500">
      {languages.map((item) => (
        <button
          aria-pressed={lang === item}
          className={`px-3 py-2 transition ${
            lang === item
              ? "bg-emerald-300 text-black"
              : "hover:text-emerald-300"
          }`}
          key={item}
          onClick={() => setLang(item)}
          type="button"
        >
          {item === "en" ? "EN" : "中文"}
        </button>
      ))}
    </div>
  );
}
