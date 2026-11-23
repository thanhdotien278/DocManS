"use client";

import { useState } from "react";
import { FileDown, FileText, Printer, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

export interface OfficialDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  html: string;
  onDownloadWord: () => Promise<void> | void;
  wordButtonLabel?: string;
}

/** Hộp thoại xem trước, in/PDF và xuất Word (.docx) cho các quyết định hành chính. */
export function OfficialDocumentDialog({
  isOpen,
  onClose,
  title,
  subtitle,
  html,
  onDownloadWord,
  wordButtonLabel = "Tải file Word (.docx)"
}: OfficialDocumentDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleDownloadWord() {
    setBusy(true);
    setError("");
    try {
      await onDownloadWord();
    } catch {
      setError("Không tạo được tệp Word. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog className="decision-dialog" label={title} onClose={onClose}>
      <div className="decision-dialog-toolbar no-print">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "var(--primary)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <FileText size={18} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>{title}</div>
            {subtitle ? <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{subtitle}</div> : null}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="button secondary" disabled={busy} onClick={() => void handleDownloadWord()}>
            <FileDown size={15} aria-hidden="true" />
            {busy ? "Đang tạo Word…" : wordButtonLabel}
          </button>
          <button type="button" className="button primary" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" />
            In / Lưu PDF
          </button>
          <button type="button" className="button secondary" onClick={onClose} aria-label="Đóng hộp thoại">
            <X size={16} aria-hidden="true" />
            Đóng
          </button>
        </div>
      </div>
      {error ? (
        <div className="callout danger no-print" role="alert" style={{ margin: "12px 20px 0" }}>
          <p>{error}</p>
        </div>
      ) : null}
      <div className="decision-dialog-body">
        <div className="decision-print-paper">
          <div className="decision-document" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </Dialog>
  );
}
