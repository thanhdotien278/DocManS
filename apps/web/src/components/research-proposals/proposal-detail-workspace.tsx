"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, Pencil, Save, Send, Trash2, UploadCloud, X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  deleteProposalAttachment,
  loadProposalReadiness,
  loadResearchProposal,
  getProposalAttachmentDownloadUrl,
  submitResearchProposal,
  updateProposalAttachmentMetadata,
  updateResearchProposalDraft,
  uploadProposalAttachment,
  type ApiErrorWithReadiness,
  type ProposalDraftInput,
  type ProposalReadiness,
  type ResearchProposal
} from "@/lib/research-proposals-api";

type LoadState = "loading" | "ready" | "error";
const ST23A_ALLOWED_FILE_TYPES = ".doc, .docx, .pdf, .xls, .xlsx";
const ST23A_FILE_ACCEPT = ".doc,.docx,.pdf,.xls,.xlsx";

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
      ? proposal.members
      : [{ name: "", role: "Chủ nhiệm", organization: "" }]
  };
}

export function ProposalDetailWorkspace({ proposalId }: { proposalId: string }) {
  const [state, setState] = useState<LoadState>("loading");
  const [proposal, setProposal] = useState<ResearchProposal | null>(null);
  const [readiness, setReadiness] = useState<ProposalReadiness | null>(null);
  const [form, setForm] = useState<ProposalDraftInput | null>(null);
  const [formError, setFormError] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadRequirementCode, setUploadRequirementCode] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingAttachmentId, setEditingAttachmentId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingAttachmentId, setUpdatingAttachmentId] = useState("");
  const [deletingAttachmentId, setDeletingAttachmentId] = useState("");
  const [attachmentError, setAttachmentError] = useState("");

  async function refresh() {
    setState("loading");
    try {
      const [proposalData, readinessData] = await Promise.all([loadResearchProposal(proposalId), loadProposalReadiness(proposalId)]);
      setProposal(proposalData);
      setReadiness(readinessData);
      setForm(toDraftInput(proposalData));
      setUploadRequirementCode(proposalData.requiredPackage?.[0]?.code ?? "");
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, [proposalId]);

  const canEdit = proposal?.status === "draft" && proposal.canEdit;
  const canSubmit = proposal?.status === "draft" && proposal.canSubmit;
  const requirementOptions = proposal?.requiredPackage ?? [];
  const selectedRequirement = useMemo(
    () => requirementOptions.find((item) => item.code === uploadRequirementCode),
    [requirementOptions, uploadRequirementCode]
  );

  function updateMember(field: "name" | "role" | "organization", value: string) {
    setForm((current) =>
      current
        ? {
            ...current,
            members: [{ name: "", role: "Chủ nhiệm", organization: "", ...(current.members?.[0] ?? {}), [field]: value }]
          }
        : current
    );
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
      const result = await updateResearchProposalDraft(proposal.id, payload);
      setProposal(result.proposal);
      setForm(toDraftInput(result.proposal));
      setReadiness(await loadProposalReadiness(proposal.id));
      setMessage("Đã lưu hồ sơ nháp.");
    } catch (error) {
      setFormError({ submit: error instanceof Error ? error.message : "Không thể lưu hồ sơ." });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError("");
    setAttachmentError("");
    setMessage("");
    if (!proposal || !uploadRequirementCode || !uploadFile) {
      setUploadError("Chọn loại tài liệu và tệp cần tải lên.");
      return;
    }

    setIsUploading(true);
    try {
      await uploadProposalAttachment(proposal.id, {
        requirementCode: uploadRequirementCode,
        description: uploadDescription,
        file: uploadFile
      });
      setUploadFile(null);
      setUploadDescription("");
      setFileInputKey((current) => current + 1);
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
                <span className="meta-label">Trạng thái</span>
                <span className="meta-value">
                  <StatusBadge status={proposal.status} />
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Ngày nộp</span>
                <span className="meta-value">{proposal.submittedAt ? formatDate(proposal.submittedAt) : "Chưa nộp"}</span>
              </div>
            </div>

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
                  <span>Bắt đầu</span>
                  <input disabled={!canEdit} type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
                </label>
                <label className="field">
                  <span>Kết thúc</span>
                  <input disabled={!canEdit} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
                  {formError.endDate ? <span className="field-error">{formError.endDate}</span> : null}
                </label>
              </div>
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
                  type="number"
                  min={0}
                  value={form.budgetMetadata?.amount ?? 0}
                  onChange={(event) =>
                    setForm({ ...form, budgetMetadata: { ...form.budgetMetadata, amount: Number(event.target.value), currency: "VND" } })
                  }
                />
              </label>
            </div>

            {formError.submit ? <p className="form-error">{formError.submit}</p> : null}
            {message ? <p className="state-message success">{message}</p> : null}
            <div className="button-row">
              <button className="button primary" type="submit" disabled={!canEdit || isSaving}>
                <Save size={16} aria-hidden="true" />
                {isSaving ? "Đang lưu" : "Lưu nháp"}
              </button>
              <Link className="button" href="/my-proposals">
                Danh sách hồ sơ
              </Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard title="Tệp tài liệu" subtitle="Metadata tệp được lưu theo hồ sơ, loại tài liệu, người tải và thời điểm tải">
          <form className="upload-row" onSubmit={(event) => void handleUpload(event)}>
            <label className="field">
              <span>Loại tài liệu</span>
              <select disabled={!canEdit} value={uploadRequirementCode} onChange={(event) => setUploadRequirementCode(event.target.value)}>
                {requirementOptions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              {selectedRequirement ? (
                <span className="field-hint">
                  {ST23A_ALLOWED_FILE_TYPES} · tối đa {selectedRequirement.maxSizeMb}MB
                </span>
              ) : null}
            </label>
            <label className="field">
              <span>Chọn tệp</span>
              <input
                key={fileInputKey}
                disabled={!canEdit}
                type="file"
                accept={ST23A_FILE_ACCEPT}
                onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <label className="field">
              <span>Mô tả tài liệu</span>
              <input
                disabled={!canEdit}
                maxLength={500}
                value={uploadDescription}
                onChange={(event) => setUploadDescription(event.target.value)}
                placeholder="Mô tả ngắn cho tệp"
              />
            </label>
            <button className="button" type="submit" disabled={!canEdit || isUploading}>
              <UploadCloud size={16} aria-hidden="true" />
              {isUploading ? "Đang tải" : "Tải tệp"}
            </button>
          </form>
          {uploadError ? <p className="form-error">{uploadError}</p> : null}
          {attachmentError ? <p className="form-error">{attachmentError}</p> : null}

          {proposal.attachments?.length ? (
            <div className="file-list">
              {proposal.attachments.map((attachment) => (
                <article className="file-item" key={attachment.id}>
                  <span className="file-icon">
                    <FileText size={17} aria-hidden="true" />
                  </span>
                  <div>
                    <span className="record-title">{attachment.fileName}</span>
                    <span className="file-description">{attachment.description || "Chưa có mô tả"}</span>
                    <span className="record-meta">
                      {attachment.requirementCode} · {attachment.mimeType} · {formatBytes(attachment.sizeBytes)} · người tải {attachment.uploadedById} ·{" "}
                      {formatDate(attachment.createdAt)}
                    </span>
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
                        title="Sửa mô tả"
                        aria-label={`Sửa mô tả ${attachment.fileName}`}
                        onClick={() => startEditingAttachment(attachment.id, attachment.description)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    {attachment.canDelete ? (
                      <button
                        className="button icon-button danger"
                        type="button"
                        title="Xóa tệp"
                        aria-label={`Xóa tệp ${attachment.fileName}`}
                        disabled={deletingAttachmentId === attachment.id}
                        onClick={() => void handleDeleteAttachment(attachment.id, attachment.fileName)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                    <StatusBadge status={attachment.status === "active" ? "active" : "closed"} />
                  </div>
                  {editingAttachmentId === attachment.id ? (
                    <form className="attachment-edit-row" onSubmit={(event) => void handleUpdateAttachmentDescription(event, attachment.id)}>
                      <label className="field">
                        <span>Mô tả tài liệu</span>
                        <textarea rows={3} maxLength={500} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
                      </label>
                      <div className="button-row compact-actions">
                        <button className="button primary" type="submit" disabled={updatingAttachmentId === attachment.id}>
                          <Save size={16} aria-hidden="true" />
                          {updatingAttachmentId === attachment.id ? "Đang lưu" : "Lưu mô tả"}
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
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có tệp" message="Tải các tài liệu bắt buộc trước khi nộp chính thức." />
          )}
        </SectionCard>
      </div>

      <div className="grid">
        <SectionCard title="Readiness" subtitle="Điều kiện dữ liệu và tệp trước khi nộp">
          {readiness?.ready ? (
            <p className="state-message success">
              <CheckCircle2 size={16} aria-hidden="true" /> Hồ sơ đã đủ điều kiện nộp.
            </p>
          ) : (
            <div className="readiness-list">
              <strong>Còn thiếu</strong>
              {(readiness?.missingFields.length || 0) + (readiness?.missingFiles.length || 0) === 0 ? (
                <span className="record-meta">Đang kiểm tra điều kiện.</span>
              ) : null}
              {readiness?.missingFields.map((item) => (
                <span key={item.code}>Dữ liệu: {item.label}</span>
              ))}
              {readiness?.missingFiles.map((item) => (
                <span key={item.code}>Tệp: {item.label}</span>
              ))}
            </div>
          )}
          <button className="button primary submit-button" type="button" disabled={!canSubmit || isSubmitting} onClick={() => void handleSubmit()}>
            <Send size={16} aria-hidden="true" />
            {isSubmitting ? "Đang nộp" : "Nộp chính thức"}
          </button>
          {!canSubmit ? <p className="record-meta">Chỉ hồ sơ nháp của chủ sở hữu mới được nộp.</p> : null}
        </SectionCard>

        <SectionCard title="Timeline" subtitle="Lịch sử nộp và thay đổi trạng thái chính">
          {proposal.history?.length ? (
            <div className="timeline">
              {proposal.history.map((event) => (
                <article className="timeline-item" key={event.id}>
                  <span className="timeline-dot" />
                  <div>
                    <p className="timeline-title">
                      {event.fromStatus} → {event.toStatus}
                    </p>
                    <p className="timeline-meta">
                      {formatDate(event.submittedAt)} · actor {event.actorId}
                    </p>
                    {event.note ? <p className="timeline-meta">{event.note}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Chưa có lịch sử nộp" message="Timeline sẽ xuất hiện khi hồ sơ được nộp chính thức." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
