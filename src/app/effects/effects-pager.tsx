"use client";

import { Children, type ReactNode, useMemo, useRef, useState } from "react";
import styles from "./effects-gallery.module.css";

type EffectsPagerProps = {
  children: ReactNode;
  pageSize: number;
  total: number;
};

export function EffectsPager({ children, pageSize, total }: EffectsPagerProps) {
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLElement>(null);
  const cards = useMemo(() => Children.toArray(children), [children]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageStart = (page - 1) * pageSize;
  const visibleCards = cards.slice(pageStart, pageStart + pageSize);

  const goToPage = (nextPage: number) => {
    const boundedPage = Math.min(Math.max(nextPage, 1), totalPages);

    setPage(boundedPage);

    // 页码切换后把视线带回卡片区，避免用户停留在上一页的滚动位置。
    window.requestAnimationFrame(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <section className={styles.grid} aria-label={`Effects list page ${page}`} ref={gridRef}>
        {visibleCards}
      </section>

      <nav className={styles.pagination} aria-label="Effects pagination">
        <p>
          {String(pageStart + 1).padStart(2, "0")}-
          {String(Math.min(pageStart + pageSize, total)).padStart(2, "0")} /{" "}
          {String(total).padStart(2, "0")}
        </p>

        <div className={styles.pageControls}>
          <button
            aria-label="上一页 effects"
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
            type="button"
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, index) => {
            const pageNumber = index + 1;

            return (
              <button
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`第 ${pageNumber} 页 effects`}
                key={pageNumber}
                onClick={() => goToPage(pageNumber)}
                type="button"
              >
                {String(pageNumber).padStart(2, "0")}
              </button>
            );
          })}

          <button
            aria-label="下一页 effects"
            disabled={page === totalPages}
            onClick={() => goToPage(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </nav>
    </>
  );
}
