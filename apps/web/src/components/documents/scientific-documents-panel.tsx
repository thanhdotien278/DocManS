"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Download, FileCode, Pencil, Plus, Scale, ScrollText, Trash2, type LucideIcon } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import {
  createScientificDocument,
  deleteScientificDocument,
  getScientificDocumentDownloadUrl,
  listScientificDocuments,
  updateScientificDocument,
  type ScientificDocument
} from "@/lib/scientific-documents-api";

type CategoryKey = "LAW_REGULATION" | "INTERNAL_REGULATION" | "DOCUMENT_TEMPLATE" | "GUIDELINE";

const CATEGORIES: Record<CategoryKey, { label: string; shortLabel: string; description: string; icon: LucideIcon }> = {
  LAW_REGULATION: {
    label: "1. Văn bản quy phạm pháp luật",
    shortLabel: "1. Văn bản QPPL",
    description: "Các văn bản Luật, Nghị định Chính phủ, Thông tư của Bộ KH&CN và các Bộ ngành liên quan.",
    icon: Scale
  },
  INTERNAL_REGULATION: {
    label: "2. Quy chế & Quy định quản lý KH&CN",
    shortLabel: "2. Quy chế & Quy định",
    description: "Quy chế Quản lý hoạt động NCKH&CN, quy định chi tiêu và phân bổ kinh phí của Học viện.",
    icon: BookOpen
  },
  DOCUMENT_TEMPLATE: {
    label: "3. Mẫu văn bản",
    shortLabel: "3. Mẫu văn bản",
    description: "Biểu mẫu phục vụ đăng ký, thuyết minh đề tài, dự toán kinh phí, lý lịch khoa học, phiếu đánh giá và biên bản nghiệm thu.",
    icon: ScrollText
  },
  GUIDELINE: {
    label: "4. Hướng dẫn & Quy trình nghiệp vụ",
    shortLabel: "4. Hướng dẫn nghiệp vụ",
    description: "Hướng dẫn quy trình đăng ký, nộp hồ sơ trực tuyến, giải ngân và thanh quyết toán.",
    icon: FileCode
  }
};

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];
const MANAGER_ROLES = ["RESEARCH_MANAGEMENT_STAFF", "RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_HEAD", "SYSTEM_ADMIN"];

// Nhóm hiển thị gộp các phân loại cũ của API (mẫu thuyết minh, mẫu đánh giá...) vào bốn mục.
function categoryKey(category: string): CategoryKey {
  if (["DOCUMENT_TEMPLATE", "FORM_TEMPLATE", "PROPOSAL_TEMPLATE", "EVALUATION_TEMPLATE"].includes(category)) return "DOCUMENT_TEMPLATE";
  return category in CATEGORIES ? (category as CategoryKey) : "LAW_REGULATION";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("vi-VN") : "—";
}

function fileBadge(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return { label: "PDF", tone: "pdf" };
  if (extension === "docx" || extension === "doc") return { label: "WORD", tone: "word" };
  if (extension === "xlsx" || extension === "xls") return { label: "EXCEL", tone: "excel" };
  return { label: extension.toUpperCase() || "FILE", tone: "" };
}

type FormTarget = { document: ScientificDocument | null; category: CategoryKey };

export function ScientificDocumentsPanel() {
  const { account } = useSession();
  const canManage = MANAGER_ROLES.includes(account?.systemRole ?? "");
  const [documents, setDocuments] = useState<ScientificDocument[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [focused, setFocused] = useState<CategoryKey | "ALL">("ALL");
  const [keyword, setKeyword] = useState("");
  const [form, setForm] = useState<FormTarget | null>(null);
  const [viewing, setViewing] = useState<ScientificDocument | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [pageError, setPageError] = useState("");

  async function refresh() {
    try {
      setDocuments(await listScientificDocuments());
      setState("ready");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Không thể tải danh sách văn bản và biểu mẫu.");
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const grouped = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    const map: Record<CategoryKey, ScientificDocument[]> = { LAW_REGULATION: [], INTERNAL_REGULATION: [], DOCUMENT_TEMPLATE: [], GUIDELINE: [] };
    for (const item of documents) {
      if (term && ![item.title, item.documentNumber, item.description ?? ""].some((value) => value.toLowerCase().includes(term))) continue;
      map[categoryKey(item.category)].push(item);
    }
    return map;
  }, [documents, keyword]);

  function openForm(target: FormTarget) {
    setFormError("");
    setMessage("");
    setForm(target);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      if (!form.document) {
        setFormError("Vui lòng đính kèm tệp văn bản / biểu mẫu.");
        return;
      }
      data.delete("file");
    }
    // Giữ phân loại gốc khi người dùng không đổi mục hiển thị (nhiều phân loại cùng thuộc "Mẫu văn bản").
    if (form.document && categoryKey(form.document.category) === data.get("category")) data.set("category", form.document.category);

    setFormError("");
    setIsSubmitting(true);
    try {
      if (form.document) await updateScientificDocument(form.document.id, data);
      else await createScientificDocument(data);
      setMessage(form.document ? "Đã cập nhật văn bản / biểu mẫu." : "Đã tải lên văn bản / biểu mẫu.");
      setForm(null);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể lưu văn bản / biểu mẫu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: ScientificDocument) {
    if (!window.confirm(`Xóa văn bản "${item.documentNumber} - ${item.title}"?`)) return;
    setMessage("");
    setPageError("");
    try {
      await deleteScientificDocument(item.id);
      setMessage("Đã xóa văn bản.");
      await refresh();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Không thể xóa văn bản.");
    }
  }

  const editing = form?.document ?? null;

  return (
    <div className="grid">
      {message ? <p className="state-message success" role="status">{message}</p> : null}
      {pageError ? <p className="state-message error" role="alert">{pageError}</p> : null}

      <SectionCard
        title="Kho văn bản & biểu mẫu"
        subtitle="Bấm vào tên văn bản để tải tệp về"
        action={canManage ? (
          <button className="button primary" type="button" onClick={() => openForm({ document: null, category: focused === "ALL" ? "LAW_REGULATION" : focused })}>
            <Plus size={16} aria-hidden="true" />
            Tải lên văn bản
          </button>
        ) : null}
      >
        <div className="filter-bar compact">
          <label className="filter-field">
            <span>Tìm kiếm</span>
            <input type="search" placeholder="Tìm theo số hiệu, tên văn bản..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </label>
        </div>
        <div className="profile-tabs" aria-label="Phân mục văn bản và biểu mẫu">
          <button className={`button ${focused === "ALL" ? "primary" : ""}`} type="button" aria-pressed={focused === "ALL"} onClick={() => setFocused("ALL")}>
            Tất cả ({CATEGORY_KEYS.reduce((total, key) => total + grouped[key].length, 0)})
          </button>
          {CATEGORY_KEYS.map((key) => (
            <button key={key} className={`button ${focused === key ? "primary" : ""}`} type="button" aria-pressed={focused === key} onClick={() => setFocused(key)}>
              {CATEGORIES[key].shortLabel} ({grouped[key].length})
            </button>
          ))}
        </div>
        {state === "loading" ? <p className="state-message" role="status">Đang tải văn bản và biểu mẫu...</p> : null}
      </SectionCard>

      {state === "ready" ? (focused === "ALL" ? CATEGORY_KEYS : [focused]).map((key) => {
        const category = CATEGORIES[key];
        const Icon = category.icon;
        const items = grouped[key];
        return (
          <SectionCard
            key={key}
            title={category.label}
            subtitle={category.description}
            action={canManage ? (
              <button className="button" type="button" onClick={() => openForm({ document: null, category: key })}>
                <Icon size={16} aria-hidden="true" />
                Thêm vào mục này
              </button>
            ) : null}
          >
            {items.length === 0 ? (
              <EmptyState title="Chưa có văn bản" message={keyword.trim() ? "Không có văn bản nào trong mục này khớp với từ khóa tìm kiếm." : "Chưa có văn bản hoặc biểu mẫu nào trong phân mục này."} />
            ) : (
              <div className="table-wrap" tabIndex={0} role="region" aria-label={category.label}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>TT</th>
                      <th>Số hiệu</th>
                      <th>Tên văn bản / Biểu mẫu</th>
                      <th>Ngày ban hành</th>
                      <th>Ngày hiệu lực</th>
                      <th>Tệp đính kèm</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const badge = fileBadge(item.fileName);
                      return (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td><span className="doc-number">{item.documentNumber}</span></td>
                          <td>
                            <a className="doc-link" href={getScientificDocumentDownloadUrl(item.id)} target="_blank" rel="noopener noreferrer" title="Tải văn bản này về">
                              {item.title}
                              <Download size={12} aria-hidden="true" />
                            </a>
                            {item.description ? <p className="doc-description">{item.description}</p> : null}
                          </td>
                          <td>{formatDate(item.issuedDate)}</td>
                          <td>{formatDate(item.effectiveDate)}</td>
                          <td>
                            <span className={`file-type ${badge.tone}`}>{badge.label}</span>
                            <span className="file-size">{formatFileSize(item.fileSize)}</span>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="button" type="button" onClick={() => setViewing(item)}>Chi tiết</button>
                              {canManage ? (
                                <>
                                  <button className="button icon-button" type="button" onClick={() => openForm({ document: item, category: key })} title="Chỉnh sửa" aria-label={`Chỉnh sửa ${item.documentNumber}`}>
                                    <Pencil size={16} aria-hidden="true" />
                                  </button>
                                  <button className="button icon-button danger" type="button" onClick={() => void handleDelete(item)} title="Xóa văn bản" aria-label={`Xóa ${item.documentNumber}`}>
                                    <Trash2 size={16} aria-hidden="true" />
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        );
      }) : null}

      {form ? (
        <Dialog className="form-dialog" label={editing ? "Chỉnh sửa văn bản / biểu mẫu" : "Tải lên văn bản / biểu mẫu"} onClose={() => { if (!isSubmitting) setForm(null); }}>
          <SectionCard
            action={<button className="button" type="button" onClick={() => setForm(null)} disabled={isSubmitting}>Đóng</button>}
            title={editing ? "Chỉnh sửa văn bản / biểu mẫu" : "Tải lên văn bản / biểu mẫu"}
            subtitle="Tệp cho phép: .pdf, .doc, .docx, .xls, .xlsx"
          >
            <form className="admin-form" key={editing?.id ?? "create"} onSubmit={(event) => void handleSubmit(event)}>
              <label className="field">
                <span>Số hiệu văn bản *</span>
                <input name="documentNumber" required maxLength={100} placeholder="VD: 05/2023/TT-BKHCN, BM-01/NCKH" defaultValue={editing?.documentNumber ?? ""} />
              </label>
              <label className="field">
                <span>Mục phân loại *</span>
                <select name="category" defaultValue={form.category}>
                  {CATEGORY_KEYS.map((key) => <option key={key} value={key}>{CATEGORIES[key].label.slice(3)}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Tên gọi / Trích yếu văn bản *</span>
                <input name="title" required maxLength={500} defaultValue={editing?.title ?? ""} />
              </label>
              <label className="field">
                <span>Cơ quan ban hành</span>
                <input name="issuingAuthority" maxLength={255} placeholder="VD: Bộ Khoa học và Công nghệ, Học viện Quân y" defaultValue={editing?.issuingAuthority ?? ""} />
              </label>
              <label className="field">
                <span>Ngày ban hành</span>
                <input name="issuedDate" type="date" defaultValue={editing?.issuedDate?.slice(0, 10) ?? ""} />
              </label>
              <label className="field">
                <span>Ngày hiệu lực</span>
                <input name="effectiveDate" type="date" defaultValue={editing?.effectiveDate?.slice(0, 10) ?? ""} />
              </label>
              <label className="field">
                <span>Mô tả / Tóm tắt nội dung</span>
                <textarea name="description" rows={3} maxLength={5000} defaultValue={editing?.description ?? ""} />
              </label>
              <label className="field">
                <span>{editing ? `Thay tệp đính kèm (để trống nếu giữ tệp hiện tại: ${editing.fileName})` : "Tệp đính kèm *"}</span>
                <input name="file" type="file" required={!editing} accept=".pdf,.doc,.docx,.xls,.xlsx" />
              </label>
              {formError ? <p className="form-error" role="alert">{formError}</p> : null}
              <button className="button primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu" : editing ? "Lưu thay đổi" : "Lưu và tải lên"}
              </button>
            </form>
          </SectionCard>
        </Dialog>
      ) : null}

      {viewing ? (
        <Dialog className="form-dialog" label="Chi tiết văn bản / biểu mẫu" onClose={() => setViewing(null)}>
          <SectionCard action={<button className="button" type="button" onClick={() => setViewing(null)}>Đóng</button>} title={viewing.title} subtitle={viewing.documentNumber}>
            <div className="meta-grid">
              <div className="meta-item">
                <span className="meta-label">Mục phân loại</span>
                <span className="meta-value">{CATEGORIES[categoryKey(viewing.category)].label}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Trạng thái</span>
                <span className="meta-value">{viewing.status === "ACTIVE" ? "Còn hiệu lực" : "Hết hiệu lực"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Cơ quan ban hành</span>
                <span className="meta-value">{viewing.issuingAuthority || "—"}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Ngày ban hành</span>
                <span className="meta-value">{formatDate(viewing.issuedDate)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Ngày hiệu lực</span>
                <span className="meta-value">{formatDate(viewing.effectiveDate)}</span>
              </div>
            </div>
            {viewing.description ? <p className="doc-description">{viewing.description}</p> : null}
            <div className="doc-file-row">
              <div>
                <strong>{viewing.fileName}</strong>
                <span className="file-size">{formatFileSize(viewing.fileSize)}</span>
              </div>
              <a className="button primary" href={getScientificDocumentDownloadUrl(viewing.id)} target="_blank" rel="noopener noreferrer">
                <Download size={16} aria-hidden="true" />
                Tải về
              </a>
            </div>
          </SectionCard>
        </Dialog>
      ) : null}
    </div>
  );
}
