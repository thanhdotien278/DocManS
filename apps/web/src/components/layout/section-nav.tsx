"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TITLE_SELECTOR = ".section-card > .section-header .section-title";

/**
 * Theme "Không gian làm việc": mục lục các phần của trang dài (chi tiết hồ sơ, đề tài) để đến thẳng phần cần làm.
 * Chỉ đọc tiêu đề các panel đang hiển thị nên không biết và không đổi quyền hay dữ liệu của panel.
 */
export function SectionNav() {
  const pathname = usePathname();
  const [titles, setTitles] = useState<string[]>([]);

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    const scan = () => {
      const next = [...main.querySelectorAll(TITLE_SELECTOR)].map((node) => node.textContent ?? "");
      setTitles((current) => current.join("\n") === next.join("\n") ? current : next);
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  if (titles.length < 4) return null;

  function open(index: number) {
    const card = document.querySelectorAll<HTMLElement>(`#main-content ${TITLE_SELECTOR}`)[index]?.closest<HTMLElement>(".section-card");
    if (!card) return;
    card.tabIndex = -1;
    card.scrollIntoView({ block: "start" });
    card.focus({ preventScroll: true });
  }

  return (
    <nav className="section-nav" aria-label="Các phần trong trang">
      {titles.map((title, index) => <button type="button" key={`${index}-${title}`} onClick={() => open(index)}>{title}</button>)}
    </nav>
  );
}
