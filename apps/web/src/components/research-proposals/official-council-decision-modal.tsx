"use client";

import { OfficialDocumentDialog } from "@/components/research-proposals/official-document-dialog";
import { buildDecisionHtml } from "@/lib/decision-document";
import { councilDecisionDocument, type CouncilDecisionInput } from "@/lib/decision-templates";
import { exportCouncilDecisionWord } from "@/lib/word-export";

export interface OfficialCouncilDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: CouncilDecisionInput;
}

/** Xem trước, in/PDF và xuất Word Quyết định thành lập Hội đồng xét duyệt thuyết minh (mẫu QĐ 1273/QĐ-HVQY). */
export function OfficialCouncilDecisionModal({ isOpen, onClose, proposal }: OfficialCouncilDecisionModalProps) {
  if (!isOpen) return null;

  const html = buildDecisionHtml(councilDecisionDocument(proposal));

  return (
    <OfficialDocumentDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Quyết định thành lập Hội đồng xét duyệt thuyết minh"
      subtitle="Mẫu QĐ 1273/QĐ-HVQY — Học viện Quân y"
      html={html}
      onDownloadWord={() => exportCouncilDecisionWord(proposal)}
    />
  );
}
