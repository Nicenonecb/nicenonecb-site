"use client";

import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./magnetic-nav.module.css";

type MagneticNavProps = {
  variant?: "detail" | "preview";
};

type Indicator = {
  height: number;
  left: number;
  top: number;
  width: number;
};

const navItems = [
  { label: "Studio", meta: "01" },
  { label: "Systems", meta: "02" },
  { label: "Motion", meta: "03" },
  { label: "Notes", meta: "04" },
];

const sourceLines = [
  "li:has(a:is(:hover, :focus-visible)) {",
  "  anchor-name: --a;",
  "}",
  "ul::before {",
  "  position-anchor: --a;",
  "  left: anchor(left);",
  "  width: anchor-size(width);",
  "}",
];

function getIndicatorForItem(
  item: HTMLLIElement,
  list: HTMLUListElement,
): Indicator {
  const itemRect = item.getBoundingClientRect();
  const listRect = list.getBoundingClientRect();

  return {
    height: itemRect.height,
    left: itemRect.left - listRect.left,
    top: itemRect.top - listRect.top,
    width: itemRect.width,
  };
}

export function MagneticNav({ variant = "detail" }: MagneticNavProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [indicator, setIndicator] = useState<Indicator>({
    height: 48,
    left: 0,
    top: 0,
    width: 126,
  });

  const indicatorStyle = useMemo(
    () =>
      ({
        "--magnetic-height": `${indicator.height}px`,
        "--magnetic-left": `${indicator.left}px`,
        "--magnetic-top": `${indicator.top}px`,
        "--magnetic-width": `${indicator.width}px`,
      }) as CSSProperties,
    [indicator],
  );

  const updateIndicator = useCallback((nextIndex: number) => {
    const list = listRef.current;
    const item = list?.children.item(nextIndex);

    if (!(list && item instanceof HTMLLIElement)) {
      return;
    }

    setActiveIndex(nextIndex);
    setIndicator(getIndicatorForItem(item, list));
  }, []);

  useLayoutEffect(() => {
    updateIndicator(activeIndex);
  }, [activeIndex, updateIndicator]);

  useEffect(() => {
    const list = listRef.current;

    if (!list) {
      return;
    }

    // ResizeObserver 负责非 anchor 浏览器的回退定位，避免导航换行后高亮层错位。
    const handleResize = () => updateIndicator(activeIndex);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(list);

    Array.from(list.children).forEach((item) => resizeObserver.observe(item));
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [activeIndex, updateIndicator]);

  return (
    <section className={styles.shell} data-variant={variant}>
      <div className={styles.frame}>
        <div className={styles.statusBar} aria-hidden="true">
          <span>CSS Anchor Positioning</span>
          <span>MAGNETIC NAV</span>
        </div>

        <div className={styles.stage}>
          <nav className={styles.nav} aria-label="Magnetic navigation sample">
            <ul
              className={styles.navList}
              data-active-index={activeIndex}
              ref={listRef}
              style={indicatorStyle}
            >
              {navItems.map((item, index) => (
                <li key={item.label}>
                  <a
                    aria-current={activeIndex === index ? "page" : undefined}
                    href={`#${item.label.toLowerCase()}`}
                    onClick={(event) => {
                      event.preventDefault();
                      updateIndicator(index);
                    }}
                    onBlur={() => updateIndicator(activeIndex)}
                    onFocus={() => updateIndicator(index)}
                    onMouseEnter={() => updateIndicator(index)}
                    onPointerEnter={() => updateIndicator(index)}
                  >
                    <span>{item.label}</span>
                    <small>{item.meta}</small>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.copyPanel}>
            <p>anchor()</p>
            <h3>Hover state tracks the link, not a hard-coded pill.</h3>
          </div>
        </div>

        <div className={styles.codePanel} aria-label="Anchor positioning snippet">
          {sourceLines.map((line, index) => (
            <code key={`${line}-${index}`}>{line}</code>
          ))}
        </div>
      </div>
    </section>
  );
}
