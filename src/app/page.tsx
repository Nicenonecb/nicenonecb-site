"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassPage } from "./effects/glass-page/glass-page";
import { LiquidLayersDraw } from "./effects/liquid-layers-draw/liquid-layers-draw";
import { TearableUi } from "./effects/tearable-ui/tearable-ui";
import { LanguageSwitch } from "./i18n/language-switch";
import { copy, navItems, type Lang } from "./i18n/site-copy";

const navScrambleChars = "特效FX01#%*/<>[]{}";
const defaultEffectHref = "/effects/glass-page";

function getScrambledLabel(target: string, frame: number) {
  return Array.from(target)
    .map((letter, index) => {
      if (frame > index + 3) {
        return letter;
      }

      const charIndex = (frame * 5 + index * 7) % navScrambleChars.length;

      return navScrambleChars[charIndex];
    })
    .join("");
}

function EffectPreview({ href }: { href: string }) {
  switch (href) {
    case "/effects/liquid-layers-draw":
      return <LiquidLayersDraw variant="preview" />;
    case "/effects/tearable-ui":
      return <TearableUi variant="preview" />;
    case "/effects/glass-page":
    default:
      return <GlassPage variant="preview" />;
  }
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("zh");
  const [selectedEffectHref, setSelectedEffectHref] = useState(defaultEffectHref);
  const featuredNavItem = navItems.find((item) => "featured" in item);
  const featuredNavText = featuredNavItem?.[lang] ?? "";
  const [featuredNavLabel, setFeaturedNavLabel] = useState(featuredNavText);
  const t = copy[lang];
  const selectedEffect =
    t.effects.items.find((effect) => effect.href === selectedEffectHref) ?? t.effects.items[0];

  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  }, [lang]);

  useEffect(() => {
    if (!featuredNavText) {
      return;
    }

    let frame = 0;
    let frameTimer: number | undefined;

    // 顶部入口用短促字符扰动吸引点击，结束后恢复真实文案，避免影响可读性。
    const playScramble = () => {
      window.clearInterval(frameTimer);
      frame = 0;
      frameTimer = window.setInterval(() => {
        frame += 1;

        if (frame > featuredNavText.length + 5) {
          window.clearInterval(frameTimer);
          setFeaturedNavLabel(featuredNavText);
          return;
        }

        setFeaturedNavLabel(getScrambledLabel(featuredNavText, frame));
      }, 72);
    };

    playScramble();
    const loopTimer: number = window.setInterval(playScramble, 2400);

    return () => {
      window.clearInterval(frameTimer);
      window.clearInterval(loopTimer);
    };
  }, [featuredNavText]);

  return (
    <main className="site-grid min-h-screen overflow-hidden text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8 lg:px-10 2xl:w-[65vw] 2xl:max-w-none">
        <header className="flex min-h-14 items-center justify-between gap-5 border-b border-white/10 py-3">
          <a
            href="#top"
            className="font-mono text-sm uppercase tracking-[0.28em] text-zinc-200"
          >
            Nicenonecb
          </a>
          <div className="flex items-center gap-5">
            <nav className="hidden items-center gap-7 font-mono text-xs uppercase tracking-[0.22em] text-zinc-500 md:flex">
              {navItems.map((item) => (
                <a
                  className={`transition hover:text-emerald-300 ${
                    "featured" in item ? "nav-effect-link" : ""
                  }`}
                  data-label={"featured" in item ? featuredNavLabel : undefined}
                  href={"href" in item ? item.href : `#${item.id}`}
                  key={`${item.id}-${lang}`}
                >
                  {"featured" in item ? featuredNavLabel : item[lang]}
                </a>
              ))}
            </nav>
            <LanguageSwitch lang={lang} setLang={setLang} />
          </div>
        </header>

        <section
          id="top"
          className="grid flex-1 items-center gap-12 py-16 md:grid-cols-[1.08fr_0.92fr] md:py-20"
        >
          <div>
            {t.eyebrow ? (
              <p className="mb-6 font-mono text-xs uppercase tracking-[0.32em] text-emerald-300">
                {t.eyebrow}
              </p>
            ) : null}
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] text-zinc-50 sm:text-6xl lg:text-7xl">
              {t.headline}
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-zinc-400 sm:text-lg">
              {t.intro}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                className="border border-emerald-300 bg-emerald-300 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-black transition hover:bg-transparent hover:text-emerald-200"
                href="#work"
              >
                {t.primaryCta}
              </a>
              <a
                className="border border-white/15 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-zinc-200 transition hover:border-zinc-100"
                href="mailto:nicenonecb@gmail.com"
              >
                {t.secondaryCta}
              </a>
            </div>
          </div>

          <aside className="border border-white/10 bg-black/45 p-5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4 font-mono text-xs text-zinc-500">
              <span>{t.profileTitle}</span>
              <span className="text-emerald-300">{t.online}</span>
            </div>
            <dl className="space-y-5 font-mono text-sm">
              {Object.entries(t.profile).map(([key, value]) => (
                <div className="flex items-start justify-between gap-8" key={key}>
                  <dt className="text-zinc-500">{key}</dt>
                  <dd className="text-right text-zinc-200">{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </section>

        <section
          id="effects"
          className="grid gap-8 border-t border-white/10 py-14 md:grid-cols-[1fr_1fr]"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">
              {t.effects.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
              {t.effects.title}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
              {t.effects.description}
            </p>
            <div className="mt-7 grid gap-3">
              {t.effects.items.map((effect) => {
                const isSelected = effect.href === selectedEffect.href;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={`group border p-4 text-left transition focus-visible:border-emerald-300 focus-visible:outline-none ${
                      isSelected
                        ? "border-emerald-300/80 bg-emerald-300/10"
                        : "border-white/10 bg-zinc-950/60 hover:border-emerald-300/70"
                    }`}
                    key={effect.name}
                    onClick={() => setSelectedEffectHref(effect.href)}
                    type="button"
                  >
                    <h3 className="font-mono text-sm text-emerald-300 transition group-hover:text-emerald-200">
                      {effect.name}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      {effect.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <Link
              className="mt-6 inline-flex border border-emerald-300/70 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 transition hover:bg-emerald-300 hover:text-black"
              href="/effects"
            >
              {t.effects.openEffectsLab}
            </Link>
          </div>

          <div className="effect-stage border border-white/10 bg-black/45 p-5">
            <div className="flex items-center justify-between font-mono text-xs text-zinc-500">
              <span>{t.effects.preview}</span>
              <span className="text-emerald-300">{t.effects.live}</span>
            </div>
            <div
              className="h-[22rem] overflow-hidden"
              data-active-effect={selectedEffect.href}
              key={selectedEffect.href}
            >
              <EffectPreview href={selectedEffect.href} />
            </div>
          </div>
        </section>

        <section id="work" className="border-t border-white/10 py-14">
          <div className="mb-7 flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">
                {t.work.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
                {t.work.title}
              </h2>
            </div>
            <span className="hidden font-mono text-xs text-zinc-500 sm:block">
              {t.work.count}
            </span>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {t.work.items.map((project) => (
              <article
                className="border border-white/10 bg-zinc-950/60 p-5 transition hover:border-emerald-300/70"
                key={project.name}
              >
                <div className="mb-8 flex items-center justify-between gap-4 font-mono text-xs">
                  <span className="text-emerald-300">{project.type}</span>
                  <span className="text-zinc-600">/</span>
                </div>
                <h3 className="text-xl font-semibold text-zinc-50">
                  {project.name}
                </h3>
                <p className="mt-4 min-h-16 text-sm leading-7 text-zinc-400">
                  {project.description}
                </p>
                <p className="mt-8 border-t border-white/10 pt-4 font-mono text-xs text-zinc-500">
                  {project.stack}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="writing"
          className="grid gap-8 border-t border-white/10 py-14 md:grid-cols-[0.8fr_1.2fr]"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">
              {t.writing.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
              {t.writing.title}
            </h2>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {t.writing.posts.map((post, index) => (
              <a
                className="flex items-center justify-between gap-6 py-5 transition hover:text-emerald-300"
                href="#writing"
                key={post}
              >
                <span className="text-zinc-200">{post}</span>
                <span className="font-mono text-xs text-zinc-600">
                  0{index + 1}
                </span>
              </a>
            ))}
          </div>
        </section>

        <section
          id="todo"
          className="grid gap-8 border-t border-white/10 py-14 md:grid-cols-[1fr_1fr]"
        >
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-500">
              {t.todo.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-zinc-100">
              {t.todo.title}
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
              {t.todo.description}
            </p>
          </div>
          <div className="border border-white/10 bg-black/45 p-5 font-mono">
            <div className="mb-4 flex items-center justify-between text-xs text-zinc-500">
              <span>{t.todo.preview}</span>
              <span className="text-amber-300">{t.todo.locked}</span>
            </div>
            <div className="space-y-3 text-sm">
              {t.todo.items.map(([label, status]) => (
                <div
                  className="flex items-center justify-between gap-4 border border-white/10 px-4 py-3"
                  key={label}
                >
                  <span className="text-zinc-300">{label}</span>
                  <span className="text-zinc-600">{status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
