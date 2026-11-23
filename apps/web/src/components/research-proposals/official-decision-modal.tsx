"use client";

import { OfficialDocumentDialog } from "@/components/research-proposals/official-document-dialog";
import { buildDecisionHtml } from "@/lib/decision-document";
import { approvalDecisionDocument } from "@/lib/decision-templates";
import { exportProposalApprovalDecisionWord } from "@/lib/word-export";

export interface OfficialDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: {
    id: string;
    code?: string | null;
    title: string;
    proposalTypeCode?: string | null;
    researchFieldCode?: string | null;
    ownerDisplayName?: string | null;
    hostOrganizationUnitName?: string | null;
    hostOrganizationUnitId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    budgetMetadata?: {
      amount?: number | string | null;
      approvedAmount?: number | null;
      currency?: string | null;
      note?: string | null;
    } | null;
    decisions?: Array<{
      id: string;
      decision: string;
      decisionLabel: string;
      decidedAt: string;
      decidedByDisplayName?: string | null;
      decisionNumber?: string | null;
      note?: string | null;
    }> | null;
  };
}

/** Xem trước, in/PDF và xuất Word quyết định phê duyệt đề tài (QĐ 4626/QĐ-HVQY & TT 14/2022/TT-BQP). */
export function OfficialDecisionModal({ isOpen, onClose, proposal }: OfficialDecisionModalProps) {
  if (!isOpen) return null;

  const approvedDecision = proposal.decisions?.find((d) => d.decision === "approved");
  const decisionInput = {
    ...proposal,
    signerName: approvedDecision?.decidedByDisplayName ?? null
  };
  const html = buildDecisionHtml(approvalDecisionDocument(decisionInput));

  return (
    <OfficialDocumentDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Quyết định phê duyệt đề tài"
      subtitle="Mẫu QĐ 4626/QĐ-HVQY & Thông tư 14/2022/TT-BQP"
      html={html}
      onDownloadWord={() => exportProposalApprovalDecisionWord(decisionInput)}
    />
  );
}
