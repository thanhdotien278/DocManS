"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, Pencil, Save, Send, Trash2, UploadCloud, X } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { ProposalDecisionPanel } from "@/components/research-proposals/proposal-decision-panel";
import { ProposalEvaluationPanel } from "@/components/research-proposals/proposal-evaluation-panel";
import { ProposalReviewForm } from "@/components/research-proposals/proposal-review-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ParticipationBadge } from "@/components/ui/participation-badge";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatVndNumber, numberToVietnameseWords, parseVndNumber } from "@/lib/vietnamese-currency";
import {
  deleteProposalAttachment,
  blockedProposalAction,
  canPerformProposalAction,
  getProposalCapabilityState,
  loadProposalReadiness,
  loadResearchProposal,
  getProposalAttachmentDownloadUrl,
  requestProposalSupplement,
  resubmitResearchProposal,
  submitResearchProposal,
  updateProposalAttachmentMetadata,
  updateResearchProposalDraft,
  uploadProposalAttachment,
  type ApiErrorWithReadiness,
  type ProposalDraftInput,
  type ProposalAttachment,
  type ProposalReadiness,
  type ResearchProposal
} from "@/lib/research-proposals-api";

type LoadState = "loading" | "ready" | "error";
const ST23A_ALLOWED_FILE_TYPES = ".doc, .docx, .pdf, .xls, .xlsx";
const ST23A_FILE_ACCEPT = ".doc,.docx,.pdf,.xls,.xlsx";
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  "proposal-form": "Thuyết minh đề tài",
  proposalForm: "Thuyết minh đề tài",
  THUYET_MINH: "Thuyết minh đề tài",
  "budget-form": "Dự toán kinh phí",
  budgetForm: "Dự toán kinh phí",
  DU_TOAN_KINH_PHI: "Dự toán kinh phí"
};

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Chưa có";
}

function toDateInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function getDocumentTypeLabel(code: string, fallback?: string) {
  return DOCUMENT_TYPE_LABELS[code] ?? fallback ?? code;
}

function relationshipLabel(type: string) {
  return { PROPOSAL_PI: "Chủ nhiệm", PROPOSAL_MEMBER: "Thành viên", PROPOSAL_SCIENTIFIC_SECRETARY: "Thư ký", REVIEWER_ASSIGNMENT: "Người phản biện" }[type] ?? type;
}

function toDraftInput(proposal: ResearchProposal): ProposalDraftInput {
  return {
    hostOrganizationUnitId: proposal.hostOrganizationUnitId,
    title: proposal.title,
    researchFieldCode: proposal.researchFieldCode,
    proposalTypeCode: proposal.proposalTypeCode,
    startDate: toDateInput(proposal.startDate),
    endDate: toDateInput(proposal.endDate),
    objectives: proposal.objectives,
    summary: proposal.summary,
    budgetMetadata: proposal.budgetMetadata,
    members: proposal.members?.length
      ? proposal.members.map((member) => ({ ...member, username: "" }))
      : [{ name: "", role: "Chủ nhiệm", organization: "", username: "" }]
  };
}

export function ProposalDetailWorkspace({ proposalId }: { proposalId: string }) {
  const { account } = useSession();
  const [state, setState] = useState<LoadState>("loading");
  const [proposal, setProposal] = useState<ResearchProposal | null>(null);
  const [readiness, setReadiness] = useState<ProposalReadiness | null>(null);
  const [form, setForm] = useState<ProposalDraftInput | null>(null);
  const [formError, setFormError] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<Record<string, File | null>>({});
  const [uploadDescriptions, setUploadDescriptions] = useState<Record<string, string>>({});
  const [fileInputKeys, setFileInputKeys] = useState<Record<string, number>>({});
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingAttachmentId, setUpdatingAttachmentId] = useState("");
  const [deletingAttachmentId, setDeletingAttachmentId] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [supplementReason, setSupplementReason] = useState("");
  const [supplementDueDate, setSupplementDueDate] = useState("");
  const [supplementError, setSupplementError] = useState("");
  const [isRequestingSupplement, setIsRequestingSupplement] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  async function refresh() {
    setState("loading");
    try {
      const [proposalData, readinessData] = await Promise.all([loadResearchProposal(proposalId), loadProposalReadiness(proposalId)]);
      setProposal(proposalData);
      setReadiness(readinessData);
      setForm(toDraftInput(proposalData));
      setState("ready");
    } catch {
      setState("error");
    }
  }

  /**
   * Re-reads the proposal after an EP-03 panel changed the workflow, without dropping back to the
   * loading state — that would unmount the panel that is still reporting its own result.
   */
  async function refreshWorkflowState() {
    try {
      const [proposalData, readinessData] = await Promise.all([loadResearchProposal(proposalId), loadProposalReadiness(proposalId)]);
      setProposal(proposalData);
      setReadiness(readinessData);
      setForm(toDraftInput(proposalData));
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [proposalId]);

  const capabilityState = proposal ? getProposalCapabilityState(proposal) : { capability: null, reloadRequired: true, reason: "Đang tải quyền thao tác." };
  const canEdit = canPerformProposalAction(capabilityState, "proposal.draft.update");
  const canSubmit = canPerformProposalAction(capabilityState, "proposal.submit");
  const canRequestSupplement = canPerformProposalAction(capabilityState, "proposal.supplement.request");
  const canUpload = canPerformProposalAction(capabilityState, "file.upload");
  const isSupplementFlow = proposal?.status === "supplement_requested";
  const showEvaluationPanel = canPerformProposalAction(capabilityState, "proposal.review.assign") || Boolean(blockedProposalAction(capabilityState, "proposal.review.assign"));
  const showReviewForm = canPerformProposalAction(capabilityState, "proposal.review.submit") || Boolean(blockedProposalAction(capabilityState, "proposal.review.submit"));
  const showDecisionPanel = canPerformProposalAction(capabilityState, "proposal.decision.approve") || Boolean(blockedProposalAction(capabilityState, "proposal.decision.approve"));
  const requirementOptions = proposal?.requiredPackage ?? [];
  const documentGroups = useMemo(
    () =>
      requirementOptions.map((item) => ({
        ...item,
        label: getDocumentTypeLabel(item.code, item.label),
        attachments:
          proposal?.attachments?.filter((attachment) => (attachment.requirementCode || attachment.filePurpose) === item.code) ?? []
      })),
    [proposal?.attachments, requirementOptions]
  );
  const budgetWords = numberToVietnameseWords(form?.budgetMetadata?.amount);

  function updateMember(field: "name" | "role" | "organization" | "username", value: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            members: [
              {
                name: "",
                role: "Chủ nhiệm",
                organization: "",
                ...(current.members?.[0] ?? {}),
                [field]: value,
                // Editing the account field re-resolves the link. The server-echoed userId has to
                // go, or the API would keep the old account and silently discard the new username —
                // and clearing the field could never unlink.
                ...(field === "username" ? { userId: "" } : {})
              }
            ]
          }
        : current
    );
  }

  function getSubmissionActorName(event: NonNullable<ResearchProposal["history"]>[number]) {
    if (event.actorDisplayName) {
      return event.actorDisplayName;
    }
    if (proposal?.submittedById && account?.id === proposal.submittedById) {
      return account.name;
    }
    return "Không xác định";
  }

  function getAttachmentUploaderName(attachment: ProposalAttachment) {
    if (attachment.uploaderDisplayName) {
      return attachment.uploaderDisplayName;
    }
    if (attachment.uploadedById && account?.id === attachment.uploadedById) {
      return account.name;
    }
    return "Không xác định";
  }

  function validateDraft() {
    const errors: Record<string, string> = {};
    if (!form?.title?.trim()) {
      errors.title = "Nhập tên đề tài.";
    }
    if (!form?.hostOrganizationUnitId?.trim()) {
      errors.hostOrganizationUnitId = "Nhập đơn vị chủ trì.";
    }
    if (form?.startDate && form?.endDate && new Date(form.endDate).getTime() <= new Date(form.startDate).getTime()) {
      errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu.";
    }
    setFormError(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!proposal || !form || !canEdit || !validateDraft()) {
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        budgetMetadata: {
          amount: Number(form.budgetMetadata?.amount ?? 0),
          currency: form.budgetMetadata?.currency || "VND"
        },
        members: form.members?.filter((member) => member.name.trim() && member.role.trim() && member.organization.trim())
      };
      const result = await updateResearchProposalDraft(proposal.id, payload, proposal.viewerAuthorization?.contextVersion);
      setProposal(result.proposal);
      setForm(toDraftInput(result.proposal));
      setReadiness(await loadProposalReadiness(proposal.id));
      setMessage(isSupplementFlow ? "Đã lưu nội dung bổ sung." : "Đã lưu hồ sơ nháp.");
    } catch (error) {
      setFormError({ submit: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>, requirementCode: string) {
    event.preventDefault();
    setUploadError("");
    setAttachmentError("");
    setMessage("");
    const uploadFile = uploadFiles[requirementCode];
    if (!proposal || !requirementCode || !uploadFile) {
      setUploadError("Chọn loại tài liệu và tệp cần tải lên.");
      return;
    }

    setIsUploading(true);
    try {
      await uploadProposalAttachment(proposal.id, {
        requirementCode,
        description: uploadDescriptions[requirementCode] ?? "",
        file: uploadFile
      });
      setUploadFiles((current) => ({ ...current, [requirementCode]: null }));
      setUploadDescriptions((current) => ({ ...current, [requirementCode]: "" }));
      setFileInputKeys((current) => ({ ...current, [requirementCode]: (current[requirementCode] ?? 0) + 1 }));
      setMessage("Đã tải tệp và cập nhật readiness.");
      await refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Không thể tải tệp.");
    } finally {
      setIsUploading(false);
    }
  }

  function startEditingAttachment(attachmentId: string, description: string | null | undefined) {
    setAttachmentError("");
    setEditingAttachmentId(attachmentId);
    setEditDescription(description ?? "");
  }

  async function handleUpdateAttachmentDescription(event: React.FormEvent<HTMLFormElement>, attachmentId: string) {
    event.preventDefault();
    setAttachmentError("");
    setMessage("");

    setUpdatingAttachmentId(attachmentId);
    try {
      await updateProposalAttachmentMetadata(attachmentId, {
        description: editDescription
      });
      setEditingAttachmentId("");
      setEditDescription("");
      setMessage("Đã cập nhật mô tả tệp.");
      await refresh();
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Không thể cập nhật mô tả tệp.");
    } finally {
      setUpdatingAttachmentId("");
    }
  }

  async function handleDeleteAttachment(attachmentId: string, fileName: string) {
    setAttachmentError("");
    setMessage("");
    const confirmed = window.confirm(`Xóa tệp "${fileName}" khỏi danh sách hồ sơ?`);
    if (!confirmed) {
      return;
    }

    setDeletingAttachmentId(attachmentId);
    try {
      await deleteProposalAttachment(attachmentId);
      setMessage("Đã xóa tệp khỏi danh sách hồ sơ.");
      await refresh();
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Không thể xóa tệp.");
    } finally {
      setDeletingAttachmentId("");
    }
  }

  async function handleSubmit() {
    if (!proposal) {
      return;
    }

    setMessage("");
    setFormError({});
    const confirmed = window.confirm("Nộp chính thức hồ sơ này? Sau khi nộp, hồ sơ chuyển sang trạng thái đã nộp và không còn sửa nháp.");
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitResearchProposal(proposal.id);
      setProposal(result.proposal);
      setForm(toDraftInput(result.proposal));
      setReadiness(await loadProposalReadiness(proposal.id));
      setMessage("Đã nộp hồ sơ chính thức.");
    } catch (error) {
      const readinessError = error as ApiErrorWithReadiness;
      if (readinessError.missingFields || readinessError.missingFiles) {
        setReadiness({
          ready: false,
          missingFields: readinessError.missingFields ?? [],
          missingFiles: readinessError.missingFiles ?? []
        });
      }
      setFormError({ submit: error instanceof Error ? error.message : "Không thể nộp hồ sơ." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestSupplement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!proposal || !canRequestSupplement) {
      return;
    }

    setSupplementError("");
    setMessage("");
    if (!supplementReason.trim() || !supplementDueDate) {
      setSupplementError("Nhập lý do và hạn phản hồi.");
      return;
    }

    const confirmed = window.confirm("Gửi yêu cầu bổ sung cho hồ sơ này?");
    if (!confirmed) {
      return;
    }

    setIsRequestingSupplement(true);
    try {
      const result = await requestProposalSupplement(proposal.id, {
        reason: supplementReason,
        dueDate: supplementDueDate
      });
      setProposal(result.proposal);
      setForm(toDraftInput(result.proposal));
      setReadiness(await loadProposalReadiness(proposal.id));
      setSupplementReason("");
      setSupplementDueDate("");
      setMessage("Đã gửi yêu cầu bổ sung.");
    } catch (error) {
      setSupplementError(error instanceof Error ? error.message : "Không thể gửi yêu cầu bổ sung.");
    } finally {
      setIsRequestingSupplement(false);
    }
  }

  async function handleResubmit() {
    if (!proposal) {
      return;
    }

    setMessage("");
    setFormError({});
    const confirmed = window.confirm("Nộp lại hồ sơ sau bổ sung?");
    if (!confirmed) {
      return;
    }

    setIsResubmitting(true);
    try {
      const result = await resubmitResearchProposal(proposal.id);
      setProposal(result.proposal);
      setForm(toDraftInput(result.proposal));
      setReadiness(await loadProposalReadiness(proposal.id));
      setMessage("Đã nộp lại hồ sơ.");
    } catch (error) {
      const readinessError = error as ApiErrorWithReadiness;
      if (readinessError.missingFields || readinessError.missingFiles) {
        setReadiness({
          ready: false,
          missingFields: readinessError.missingFields ?? [],
          missingFiles: readinessError.missingFiles ?? []
        });
      }
      setFormError({ submit: error instanceof Error ? error.message : "Không thể nộp lại hồ sơ." });
    } finally {
      setIsResubmitting(false);
    }
  }

  if (state === "loading") {
    return <p className="state-message">Đang tải chi tiết hồ sơ...</p>;
  }

  if (state === "error" || !proposal || !form) {
    return <p className="state-message error">Không thể tải chi tiết hồ sơ hoặc bạn không có quyền truy cập.</p>;
  }

  return (
    <div className="grid detail-grid">
      <div className="grid">
        <SectionCard title="Thông tin hồ sơ" subtitle={canEdit ? "Có thể lưu nháp nhiều lần trước khi nộp chính thức" : "Hồ sơ đang ở trạng thái chỉ đọc"}>
          <form className="admin-form" onSubmit={(event) => void handleSave(event)}>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Vai trò của tôi với hồ sơ này</span>
                <span className="meta-value">
                  {(capabilityState.capability?.viewerRelationships ?? []).map((relationship) => (
                    <span className="status-badge info" key={relationship.type}>{relationshipLabel(relationship.type)}</span>
                  ))}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Trạng thái</span>
                <span className="meta-value">
                  <StatusBadge status={proposal.status} />
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Ngày nộp</span>
                <span className="meta-value">{proposal.submittedAt ? formatDate(proposal.submittedAt) : "Chưa nộp"}</span>
              </div>
              {proposal.supplementRequests?.at(-1) ? (
                <div className="meta-item">
                  <span className="meta-label">Yêu cầu bổ sung</span>
                  <span className="meta-value">Hạn phản hồi {formatDate(proposal.supplementRequests.at(-1)?.dueDate ?? "")}</span>
                </div>
              ) : null}
            </div>

            {capabilityState.reloadRequired ? (
              <p className="state-message warning" role="status">
                {capabilityState.reason}
              </p>
            ) : null}

            <div className="form-section-inline">
              <div className="section-mini-heading">Thông tin chung</div>
              <label className="field">
                <span>Tên đề tài</span>
                <input disabled={!canEdit} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                {formError.title ? <span className="field-error">{formError.title}</span> : null}
              </label>
              <div className="form-grid two">
                <label className="field">
                  <span>Lĩnh vực</span>
                  <input
                    disabled={!canEdit}
                    value={form.researchFieldCode}
                    onChange={(event) => setForm({ ...form, researchFieldCode: event.target.value })}
                  />
                </label>
                <label className="field">
                  <span>Loại đề tài</span>
                  <input
                    disabled={!canEdit}
                    value={form.proposalTypeCode}
                    onChange={(event) => setForm({ ...form, proposalTypeCode: event.target.value })}
                  />
                </label>
              </div>
              <label className="field">
                <span>Đơn vị chủ trì</span>
                <input
                  disabled={!canEdit}
                  value={form.hostOrganizationUnitId}
                  onChange={(event) => setForm({ ...form, hostOrganizationUnitId: event.target.value })}
                />
                {formError.hostOrganizationUnitId ? <span className="field-error">{formError.hostOrganizationUnitId}</span> : null}
              </label>
            </div>

            <div className="form-section-inline">
              <div className="section-mini-heading">Chủ nhiệm/thành viên và thời gian</div>
              <div className="form-grid two">
                <label className="field">
                  <span>Chủ nhiệm/thành viên</span>
                  <input disabled={!canEdit} value={form.members?.[0]?.name ?? ""} onChange={(event) => updateMember("name", event.target.value)} />
                </label>
                <label className="field">
                  <span>Đơn vị thành viên</span>
                  <input
                    disabled={!canEdit}
                    value={form.members?.[0]?.organization ?? ""}
                    onChange={(event) => updateMember("organization", event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Tài khoản hệ thống (nếu có)</span>
                  <input
                    disabled={!canEdit}
                    value={form.members?.[0]?.username ?? ""}
                    onChange={(event) => updateMember("username", event.target.value)}
                    placeholder={
                      proposal.members?.[0]?.isAccountLinked ? "Đã liên kết tài khoản" : "Tên đăng nhập, để trống nếu là người ngoài hệ thống"
                    }
                  />
                </label>
                <label className="field">
                  <span>Bắt đầu</span>
                  <input disabled={!canEdit} type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </label>
                <label className="field">
                  <span>Kết thúc</span>
                  <input disabled={!canEdit} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
                  {formError.endDate ? <span className="field-error">{formError.endDate}</span> : null}
                </label>
              </div>

              {proposal.members?.length ? (
                <ul className="participation-list">
                  {proposal.members.map((member, index) => (
                    <li className="participation-item" key={member.id ?? `${member.name}-${index}`}>
                      <span className="participation-name">{member.name}</span>
                      <ParticipationBadge role={member.participationRole} label={member.participationRoleLabel} />
                      <span className="record-meta">
                        {member.organization}
                        {" · "}
                        {member.isAccountLinked ? "Đã liên kết tài khoản" : "Người ngoài hệ thống"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="form-section-inline">
              <div className="section-mini-heading">Mục tiêu, tóm tắt và kinh phí</div>
              <label className="field">
                <span>Mục tiêu</span>
                <textarea disabled={!canEdit} rows={3} value={form.objectives} onChange={(event) => setForm({ ...form, objectives: event.target.value })} />
              </label>
              <label className="field">
                <span>Tóm tắt</span>
                <textarea disabled={!canEdit} rows={4} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} />
              </label>
              <label className="field">
                <span>Kinh phí dự kiến</span>
                <input
                  disabled={!canEdit}
                  inputMode="numeric"
                  value={formatVndNumber(form.budgetMetadata?.amount)}
                  onChange={(event) => {
                    const amount = parseVndNumber(event.target.value);
                    setForm({ ...form, budgetMetadata: { ...form.budgetMetadata, amount, currency: "VND" } });
                  }}
                />
                <span className="field-hint">
                  {budgetWords ? `Bằng chữ: ${budgetWords}` : "Nhập kinh phí để hệ thống tự chuyển thành chữ."}
                </span>
              </label>
            </div>

            {formError.submit ? <p className="form-error">{formError.submit}</p> : null}
            {message ? <p className="state-message success">{message}</p> : null}
            <div className="button-row">
              <button className="button primary" type="submit" disabled={!canEdit || isSaving}>
                <Save size={16} aria-hidden="true" />
                {isSaving ? "Đang lưu" : isSupplementFlow ? "Lưu bổ sung" : "Lưu nháp"}
              </button>
              <Link className="button" href="/my-proposals">
                Danh sách hồ sơ
              </Link>
            </div>
          </form>
        </SectionCard>

        {proposal.supplementRequests?.length || canRequestSupplement || blockedProposalAction(capabilityState, "proposal.supplement.request") ? (
          <SectionCard title="Yêu cầu bổ sung" subtitle="Lý do, hạn phản hồi và trạng thái xử lý của vòng bổ sung">
            {proposal.supplementRequests?.length ? (
              <div className="timeline">
                {proposal.supplementRequests.map((request) => (
                  <article className="timeline-item" key={request.id}>
                    <span className="timeline-dot" />
                    <div>
                      <p className="timeline-title">{request.reason}</p>
                      <p className="timeline-meta">
                        Người yêu cầu: {request.actorDisplayName || "Không xác định"} · Hạn phản hồi: {formatDate(request.dueDate)}
                      </p>
                      <p className="timeline-meta">
                        Trạng thái: {request.status === "resolved" ? "Đã xử lý" : "Đang chờ bổ sung"}
                        {request.resolvedAt ? ` · Hoàn tất: ${formatDate(request.resolvedAt)}` : ""}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có yêu cầu bổ sung" message="Staff có thể gửi yêu cầu khi hồ sơ đã nộp cần hoàn thiện thêm." />
            )}

            <form className="admin-form compact-form" onSubmit={(event) => void handleRequestSupplement(event)}>
                <label className="field">
                  <span>Lý do bổ sung</span>
                  <textarea disabled={!canRequestSupplement} rows={3} maxLength={2000} value={supplementReason} onChange={(event) => setSupplementReason(event.target.value)} />
                </label>
                <label className="field">
                  <span>Hạn phản hồi</span>
                  <input disabled={!canRequestSupplement} type="date" value={supplementDueDate} onChange={(event) => setSupplementDueDate(event.target.value)} />
                </label>
                {supplementError ? <p className="form-error">{supplementError}</p> : null}
                <button className="button primary" type="submit" disabled={!canRequestSupplement || isRequestingSupplement} title={!canRequestSupplement ? blockedProposalAction(capabilityState, "proposal.supplement.request")?.reason ?? capabilityState.reason : undefined}>
                  <Send size={16} aria-hidden="true" />
                  {isRequestingSupplement ? "Đang gửi" : "Yêu cầu bổ sung"}
                </button>
                {!canRequestSupplement ? <p className="record-meta">{blockedProposalAction(capabilityState, "proposal.supplement.request")?.reason ?? capabilityState.reason}</p> : null}
              </form>
          </SectionCard>
        ) : null}

        {showReviewForm ? <ProposalReviewForm proposalId={proposal.id} onReviewSubmitted={() => void refreshWorkflowState()} canSubmitReview={canPerformProposalAction(capabilityState, "proposal.review.submit")} blockedReason={blockedProposalAction(capabilityState, "proposal.review.submit")?.reason ?? capabilityState.reason} /> : null}

        {showEvaluationPanel ? (
          <ProposalEvaluationPanel proposalId={proposal.id} onWorkflowChange={() => void refreshWorkflowState()} canAssignReviewers={canPerformProposalAction(capabilityState, "proposal.review.assign")} canConsolidate={canPerformProposalAction(capabilityState, "proposal.review.consolidate")} blockedReason={blockedProposalAction(capabilityState, "proposal.review.assign")?.reason ?? capabilityState.reason} />
        ) : null}

        {showDecisionPanel ? <ProposalDecisionPanel proposalId={proposal.id} onDecision={() => void refreshWorkflowState()} canDecide={canPerformProposalAction(capabilityState, "proposal.decision.approve")} blockedReason={blockedProposalAction(capabilityState, "proposal.decision.approve")?.reason ?? capabilityState.reason} /> : null}

        <SectionCard title="Tệp tài liệu" subtitle="Theo dõi từng tài liệu bắt buộc và metadata nộp hồ sơ">
          {uploadError ? <p className="form-error">{uploadError}</p> : null}
          {attachmentError ? <p className="form-error">{attachmentError}</p> : null}

          <div className="document-groups">
            {documentGroups.map((group) => (
              <section className="document-box" key={group.code} aria-labelledby={`document-${group.code}`}>
                <div className="document-box-header">
                  <div>
                    <h3 id={`document-${group.code}`}>{group.label}</h3>
                    <p>
                      {ST23A_ALLOWED_FILE_TYPES} · tối đa {group.maxSizeMb}MB
                    </p>
                  </div>
                  <StatusBadge status={group.attachments.length ? "active" : "draft"} />
                </div>

                {
                  <form className="document-upload-row" onSubmit={(event) => void handleUpload(event, group.code)}>
                    <label className="field">
                      <span>Chọn tệp</span>
                      <input
                        disabled={!canUpload}
                        key={fileInputKeys[group.code] ?? 0}
                        type="file"
                        accept={ST23A_FILE_ACCEPT}
                        onChange={(event) => setUploadFiles((current) => ({ ...current, [group.code]: event.target.files?.[0] ?? null }))}
                      />
                    </label>
                    <label className="field">
                      <span>Mô tả tài liệu</span>
                      <input
                        disabled={!canUpload}
                        maxLength={500}
                        value={uploadDescriptions[group.code] ?? ""}
                        onChange={(event) => setUploadDescriptions((current) => ({ ...current, [group.code]: event.target.value }))}
                        placeholder="Mô tả ngắn cho tệp"
                      />
                    </label>
                    <button className="button" type="submit" disabled={!canUpload || isUploading} title={!canUpload ? blockedProposalAction(capabilityState, "file.upload")?.reason ?? capabilityState.reason : undefined}>
                      <UploadCloud size={16} aria-hidden="true" />
                      {isUploading ? "Đang tải" : "Tải tệp"}
                    </button>
                  </form>
                }
                {!canUpload ? <p className="record-meta">{blockedProposalAction(capabilityState, "file.upload")?.reason ?? capabilityState.reason}</p> : null}

                {group.attachments.length ? (
                  <>
                    <div className="table-wrap document-table-wrap">
                      <table className="data-table document-table">
                        <thead>
                          <tr>
                            <th>Tên tệp</th>
                            <th>Mô tả tài liệu</th>
                            <th>Kích thước</th>
                            <th>Người tải lên</th>
                            <th>Thời gian nộp</th>
                            <th>Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.attachments.map((attachment) => (
                            <tr key={attachment.id}>
                              <td>
                                <span className="record-title">{attachment.fileName}</span>
                              </td>
                              <td>{attachment.description || "Chưa có mô tả"}</td>
                              <td>{formatBytes(attachment.sizeBytes)}</td>
                              <td>{getAttachmentUploaderName(attachment)}</td>
                              <td>{formatDate(attachment.createdAt)}</td>
                              <td>
                                <div className="file-actions compact-actions">
                                  <a
                                    className="button icon-button"
                                    href={getProposalAttachmentDownloadUrl(attachment.id)}
                                    title="Tải xuống"
                                    aria-label={`Tải xuống ${attachment.fileName}`}
                                  >
                                    <Download size={16} aria-hidden="true" />
                                  </a>
                                  {attachment.canEdit ? (
                                    <button
                                      className="button icon-button"
                                      type="button"
                                      title="Chỉnh sửa mô tả"
                                      aria-label={`Chỉnh sửa mô tả ${attachment.fileName}`}
                                      onClick={() => startEditingAttachment(attachment.id, attachment.description)}
                                    >
                                      <Pencil size={16} aria-hidden="true" />
                                    </button>
                                  ) : null}
                                  {attachment.canDelete ? (
                                    <button
                                      className="button icon-button danger"
                                      type="button"
                                      title="Xóa tài liệu"
                                      aria-label={`Xóa tài liệu ${attachment.fileName}`}
                                      disabled={deletingAttachmentId === attachment.id}
                                      onClick={() => void handleDeleteAttachment(attachment.id, attachment.fileName)}
                                    >
                                      <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mobile-list document-mobile-list">
                      {group.attachments.map((attachment) => (
                        <article className="file-item" key={attachment.id}>
                          <span className="file-icon">
                            <FileText size={17} aria-hidden="true" />
                          </span>
                          <div>
                            <span className="record-title">{attachment.fileName}</span>
                            <dl className="document-meta-list">
                              <div>
                                <dt>Mô tả tài liệu</dt>
                                <dd>{attachment.description || "Chưa có mô tả"}</dd>
                              </div>
                              <div>
                                <dt>Kích thước</dt>
                                <dd>{formatBytes(attachment.sizeBytes)}</dd>
                              </div>
                              <div>
                                <dt>Người tải lên</dt>
                                <dd>{getAttachmentUploaderName(attachment)}</dd>
                              </div>
                              <div>
                                <dt>Thời gian nộp</dt>
                                <dd>{formatDate(attachment.createdAt)}</dd>
                              </div>
                            </dl>
                          </div>
                          <div className="file-actions">
                            <a
                              className="button icon-button"
                              href={getProposalAttachmentDownloadUrl(attachment.id)}
                              title="Tải xuống"
                              aria-label={`Tải xuống ${attachment.fileName}`}
                            >
                              <Download size={16} aria-hidden="true" />
                            </a>
                            {attachment.canEdit ? (
                              <button
                                className="button icon-button"
                                type="button"
                                title="Chỉnh sửa mô tả"
                                aria-label={`Chỉnh sửa mô tả ${attachment.fileName}`}
                                onClick={() => startEditingAttachment(attachment.id, attachment.description)}
                              >
                                <Pencil size={16} aria-hidden="true" />
                              </button>
                            ) : null}
                            {attachment.canDelete ? (
                              <button
                                className="button icon-button danger"
                                type="button"
                                title="Xóa tài liệu"
                                aria-label={`Xóa tài liệu ${attachment.fileName}`}
                                disabled={deletingAttachmentId === attachment.id}
                                onClick={() => void handleDeleteAttachment(attachment.id, attachment.fileName)}
                              >
                                <Trash2 size={16} aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>
                        </article>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyState title="Chưa có tài liệu" message={`${group.label} chưa được tải lên.`} />
                )}
              </section>
            ))}
          </div>

          {editingAttachmentId ? (
            <form className="attachment-edit-row standalone" onSubmit={(event) => void handleUpdateAttachmentDescription(event, editingAttachmentId)}>
              <label className="field">
                <span>Mô tả tài liệu</span>
                <textarea rows={3} maxLength={500} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
              </label>
              <div className="button-row compact-actions">
                <button className="button primary" type="submit" disabled={updatingAttachmentId === editingAttachmentId}>
                  <Save size={16} aria-hidden="true" />
                  {updatingAttachmentId === editingAttachmentId ? "Đang lưu" : "Lưu mô tả"}
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    setEditingAttachmentId("");
                    setEditDescription("");
                  }}
                >
                  <X size={16} aria-hidden="true" />
                  Hủy
                </button>
              </div>
            </form>
          ) : null}
        </SectionCard>
      </div>

      <div className="grid">
        <SectionCard title="Nộp chính thức" subtitle="Xác nhận khi hồ sơ đã đủ điều kiện">
          <div className="submit-panel">
            {readiness?.ready ? (
              <p className="state-message success compact-state">
                <CheckCircle2 size={16} aria-hidden="true" /> Hồ sơ đã đủ điều kiện nộp.
              </p>
            ) : (
              <div className="readiness-list compact-readiness">
                <strong>Còn thiếu</strong>
                {(readiness?.missingFields.length || 0) + (readiness?.missingFiles.length || 0) === 0 ? (
                  <span className="record-meta">Đang kiểm tra điều kiện.</span>
                ) : null}
                {readiness?.missingFields.map((item) => (
                  <span key={item.code}>Dữ liệu: {item.label}</span>
                ))}
                {readiness?.missingFiles.map((item) => (
                  <span key={item.code}>Tài liệu: {item.label}</span>
                ))}
              </div>
            )}
            <button
              className="button primary submit-button"
              type="button"
              disabled={!canSubmit || isSubmitting || isResubmitting}
              onClick={() => void (isSupplementFlow ? handleResubmit() : handleSubmit())}
            >
              <Send size={16} aria-hidden="true" />
              {isSubmitting || isResubmitting ? "Đang nộp" : isSupplementFlow ? "Nộp lại hồ sơ" : "Nộp chính thức"}
            </button>
          </div>
          {!canSubmit ? <p className="record-meta">{blockedProposalAction(capabilityState, "proposal.submit")?.reason ?? capabilityState.reason}</p> : null}
        </SectionCard>

        <SectionCard title="Timeline" subtitle="Lịch sử nộp và thay đổi trạng thái chính">
          {proposal.history?.length ? (
            <div className="table-wrap timeline-table-wrap">
              <table className="data-table timeline-table">
                <thead>
                  <tr>
                    <th>Người nộp</th>
                    <th>Thời gian nộp</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.history.map((event) => (
                    <tr key={event.id}>
                      <td>{getSubmissionActorName(event)}</td>
                      <td>{formatDate(event.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="Chưa có lịch sử nộp" message="Timeline sẽ xuất hiện khi hồ sơ được nộp chính thức." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
