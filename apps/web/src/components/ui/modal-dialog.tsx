"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const focusableIn = (scope: string) => FOCUSABLE.split(", ").map((selector) => `${scope} ${selector}`).join(", ");

/**
 * Hành vi bàn phím của hộp thoại: Esc để đóng, giữ tiêu điểm trong hộp thoại,
 * khóa cuộn trang phía sau và trả tiêu điểm về chỗ cũ khi đóng.
 */
export function useModalBehavior(panelRef: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const initial = [focusableIn(".modal-body"), focusableIn(".modal-footer"), FOCUSABLE];
    initial.map((selector) => panel?.querySelector<HTMLElement>(selector)).find(Boolean)?.focus();
    const onKey = (event: KeyboardEvent) => {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (!panel || dialogs[dialogs.length - 1] !== panel) return;
      if (event.key === "Escape") { event.stopPropagation(); onCloseRef.current(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (event.shiftKey && (current === first || !panel.contains(current))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (current === last || !panel.contains(current))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [panelRef, active]);
}

/** Hộp thoại giữa màn hình dùng chung. */
export function ModalDialog({ title, icon, onClose, footer, children }: { title: string; icon?: ReactNode; onClose: () => void; footer?: ReactNode; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalBehavior(panelRef, onClose);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} className="modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-header">
          <h2 id={titleId}>{icon}{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Đóng">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
