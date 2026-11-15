"use client";

import { useSyncExternalStore } from "react";

// Theme toàn hệ thống nằm ở <html data-theme> (layout.tsx đọc tham số ui_theme); không có thuộc tính = theme hiện tại.
function subscribe(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Tên theme đang áp dụng; đổi ngay khi QT lưu lựa chọn tại Cấu hình hệ thống. */
export function useUiTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme ?? "classic", () => "classic");
}
