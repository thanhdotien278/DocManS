"use client";

import { useLayoutEffect, useRef, type ComponentPropsWithoutRef } from "react";

export function Dialog({ children, onClose, label, className = "", ...props }: Omit<ComponentPropsWithoutRef<"dialog">, "onClose"> & { onClose: () => void; label: string }) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; opener?.focus(); };
  }, []);

  return <dialog {...props} ref={ref} className={`workspace-dialog ${className}`} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
