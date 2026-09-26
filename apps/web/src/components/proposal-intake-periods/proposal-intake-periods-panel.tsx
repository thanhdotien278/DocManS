"use client";

import { Dialog } from "@/components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Edit3, Lock, Plus, Save, Search, Unlock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatIntakeDate as formatDate, toIntakeDateInput as toDateInput, intakeDateToIso } from "@/lib/intake-dates";
import {
  closeProposalIntakePeriod,
  intakeTemplateUrl,
  loadIntakeOptions,
  type IntakeOptions,
  createProposalIntakePeriod,
  loadProposalIntakePeriods,
  openProposalIntakePeriod,
  updateProposalIntakePeriod,
  type ProposalIntakePeriod,
  type RequiredPackageItem
} from "@/lib/proposal-intake-periods-api";

type LoadState = "loading" | "ready" | "error";

type TemplateItem = RequiredPackageItem & { file?: File };
const defaultPackage: TemplateItem[] = [
  { code: "template-1", label: "", description: "", allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], maxSizeMb: null }
];

const emptyForm = {
  code: "",
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  applicableOrganizationUnitId: "",
  applicableOrganizationUnitIds: [] as string[],
  requiredPackage: defaultPackage
};

export function ProposalIntakePeriodsPanel() {
  const [showCreate, setShowCreate] = useState(false);
  const [options, setOptions] = useState<IntakeOptions>({ canCreate: false, organizationUnits: [] });
  const [state, setState] = useState<LoadState>("loading");
  const [periods, setPeriods] = useState<ProposalIntakePeriod[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    setState("loading");
    try {
      const [periods, available] = await Promise.all([loadProposalIntakePeriods(), loadIntakeOptions()]);
      setPeriods(periods); setOptions(available);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredPeriods = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return periods.filter((period) => {
      const matchesKeyword =
        !normalizedKeyword ||
        period.code.toLowerCase().includes(normalizedKeyword) ||
        period.title.toLowerCase().includes(normalizedKeyword);
      const matchesStatus = !statusFilter || period.status === statusFilter;
      return matchesKeyword && matchesStatus;
    });
  }, [keyword, periods, statusFilter]);

  function updateTemplate(index: number, changes: Partial<TemplateItem>) {
    setForm((current) => ({ ...current, requiredPackage: current.requiredPackage.map((item, i) => i === index ? { ...item, ...changes } : item) }));
  }

  function startEdit(period: ProposalIntakePeriod) {
    setFileInputVersion((value) => value + 1);
    setEditingId(period.id);
    setForm({
      code: period.code,
      title: period.title,
      description: period.description,
      startsAt: toDateInput(period.startsAt),
      endsAt: toDateInput(period.endsAt),
      applicableOrganizationUnitId: period.applicableOrganizationUnitId,
      applicableOrganizationUnitIds: period.applicableOrganizationUnitIds,
      requiredPackage: period.requiredPackage.length ? period.requiredPackage : defaultPackage
    });
    setMessage("");
    setFormError("");
  }

  function resetForm() {
    setFileInputVersion((value) => value + 1);
    setEditingId("");
    setForm(emptyForm);
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFormError("");

    if (!form.code || !form.title || !form.startsAt || !form.endsAt || form.requiredPackage.some((item) => !item.file && !item.templateFileId && !item.label)) {
      setFormError("Vui lòng nhập mã, tên, ngày tiếp nhận và chọn file mẫu.");
      return;
    }

    const files: File[] = [];
    const requiredPackage = form.requiredPackage.map(({ file, ...item }) => {
      const uploadIndex = file ? files.push(file) - 1 : undefined;
      return { ...item, fileName: file?.name || item.fileName, label: (file?.name || item.fileName || item.label).slice(0, 160), uploadIndex };
    });
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateProposalIntakePeriod(editingId, { ...form, requiredPackage, applicableOrganizationUnitId: undefined, startsAt: intakeDateToIso(form.startsAt), endsAt: intakeDateToIso(form.endsAt, true), contextVersion: periods.find((p) => p.id === editingId)?.contextVersion }, files);
        setMessage("Đã cập nhật đợt tiếp nhận.");
      } else {
        await createProposalIntakePeriod({ ...form, requiredPackage, applicableOrganizationUnitId: undefined, startsAt: intakeDateToIso(form.startsAt), endsAt: intakeDateToIso(form.endsAt, true) }, files);
        setMessage("Đã tạo đợt tiếp nhận.");
      }
      resetForm();
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể lưu đợt tiếp nhận.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusAction(period: ProposalIntakePeriod, action: "open" | "close") {
    if (isSubmitting || !window.confirm(action === "close" ? "Đóng đợt tiếp nhận? Các hồ sơ đã nộp vẫn tiếp tục được xử lý." : "Mở đợt tiếp nhận?")) return;
    setIsSubmitting(true);
    setMessage("");
    setFormError("");
    try {
      const result = action === "open" ? await openProposalIntakePeriod(period.id, period.contextVersion) : await closeProposalIntakePeriod(period.id, period.contextVersion);
      setPeriods((current) => current.map((item) => (item.id === period.id ? result.intakePeriod : item)));
      setMessage(action === "open" ? "Đã mở đợt tiếp nhận." : "Đã đóng đợt tiếp nhận.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái.");
    } finally { setIsSubmitting(false); }
  }

  return (
    <div className="grid">
      <SectionCard action={<button className="button primary" type="button" disabled={!options.canCreate} onClick={() => { setMessage(""); resetForm(); setShowCreate(true); }}>Tạo đợt tiếp nhận</button>} title="Danh sách đợt tiếp nhận" subtitle="Tìm, lọc và điều phối trạng thái nhận hồ sơ">
        <div className="filter-bar">
          <label className="filter-field">
            <span>Từ khóa</span>
            <span className="field-input plain">
              <Search size={16} aria-hidden="true" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Mã hoặc tên đợt" />
            </span>
          </label>
          <label className="filter-field">
            <span>Trạng thái</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Tất cả</option>
              <option value="draft">Nháp</option>
              <option value="open">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="expired">Quá hạn</option>
            </select>
          </label>
        </div>

        {state === "loading" ? <p className="state-message">Đang tải đợt tiếp nhận...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải danh sách đợt tiếp nhận.</p> : null}
        {state === "ready" && filteredPeriods.length === 0 ? (
          <EmptyState title="Chưa có đợt tiếp nhận phù hợp" message="Tạo đợt mới hoặc đổi điều kiện lọc để tiếp tục." />
        ) : null}
        {state === "ready" && filteredPeriods.length > 0 ? (
          <>
            <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách đợt tiếp nhận">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Đợt tiếp nhận</th>
                    <th>Hiệu lực</th>
                    <th>Phạm vi</th>
                    <th>Tệp bắt buộc</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeriods.map((period) => (
                    <tr key={period.id}>
                      <td>
                        <span className="record-title">{period.title}</span>
                        <span className="record-meta">{period.code}</span>
                      </td>
                      <td>
                        {formatDate(period.startsAt)} - {formatDate(period.endsAt)}
                      </td>
                      <td>{period.applicableOrganizationUnitIds?.map((id) => options.organizationUnits.find((u) => u.id === id)?.name ?? id).join(", ") || "Toàn Học viện"}</td>
                      <td>{period.requiredPackage.map((item, index) => <span key={item.code}>{index > 0 ? ", " : ""}{item.templateFileId ? <a href={intakeTemplateUrl(period.id, item.templateFileId)} title={item.description}>{item.fileName || item.label}</a> : item.label}</span>)}</td>
                      <td>
                        <StatusBadge status={period.status} />
                      </td>
                      <td>
                        <div className="button-row compact-actions">
                          <button className="button" type="button" disabled={isSubmitting || !period.capabilities?.canEdit} onClick={() => startEdit(period)}>
                            <Edit3 size={16} aria-hidden="true" />
                            Sửa
                          </button>
                          {period.capabilities?.canClose ? (
                            <button className="button danger" type="button" disabled={isSubmitting || !period.capabilities?.canClose} onClick={() => void handleStatusAction(period, "close")}>
                              <Lock size={16} aria-hidden="true" />
                              Đóng
                            </button>
                          ) : (
                            <button className="button" type="button" disabled={isSubmitting || !period.capabilities?.canOpen} onClick={() => void handleStatusAction(period, "open")}>
                              <Unlock size={16} aria-hidden="true" />
                              Mở
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-list">
              {filteredPeriods.map((period) => (
                <article className="list-card" key={period.id}>
                  <div className="list-card-header">
                    <div>
                      <span className="record-title">{period.title}</span>
                      <span className="record-meta">{period.code}</span>
                    </div>
                    <StatusBadge status={period.status} />
                  </div>
                  <span className="record-meta">
                    {formatDate(period.startsAt)} - {formatDate(period.endsAt)}
                  </span>
                  <span className="record-meta">{period.requiredPackage.map((item, index) => <span key={item.code}>{index > 0 ? ", " : ""}{item.templateFileId ? <a href={intakeTemplateUrl(period.id, item.templateFileId)} title={item.description}>{item.fileName || item.label}</a> : item.label}</span>)}</span>
                  <div className="button-row">
                    <button className="button" type="button" disabled={isSubmitting || !period.capabilities?.canEdit} onClick={() => startEdit(period)}>
                      <Edit3 size={16} aria-hidden="true" />
                      Sửa
                    </button>
                    <button
                      className={period.capabilities?.canClose ? "button danger" : "button"}
                      type="button"
                      disabled={isSubmitting || !(period.capabilities?.canClose || period.capabilities?.canOpen)}
                      onClick={() => void handleStatusAction(period, period.capabilities?.canClose ? "close" : "open")}
                    >
                      {period.capabilities?.canClose ? <Lock size={16} aria-hidden="true" /> : <Unlock size={16} aria-hidden="true" />}
                      {period.capabilities?.canClose ? "Đóng" : "Mở"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </SectionCard>

      {showCreate || editingId ? <Dialog className="form-dialog" label={editingId ? "Cập nhật đợt tiếp nhận" : "Tạo đợt tiếp nhận"} onClose={() => { setShowCreate(false); resetForm(); }}>
      <SectionCard action={<button className="button" type="button" onClick={() => { setShowCreate(false); resetForm(); }}>Đóng</button>}
        title={editingId ? "Cập nhật đợt tiếp nhận" : "Tạo đợt tiếp nhận"}
        subtitle="Thiết lập thời gian, phạm vi áp dụng và danh sách tệp bắt buộc"
      >
        <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset disabled={!options.canCreate || isSubmitting} style={{ border: 0, padding: 0, minWidth: 0 }}>
          <label className="field">
            <span>Mã đợt</span>
            <input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="INTAKE-2026" />
          </label>
          <label className="field">
            <span>Tên đợt</span>
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label className="field">
            <span>Mô tả</span>
            <textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <div className="form-grid two">
            <label className="field">
              <span>Ngày bắt đầu</span>
              <input type="date" lang="vi" required value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
            </label>
            <label className="field">
              <span>Ngày kết thúc</span>
              <input type="date" lang="vi" required min={form.startsAt} value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Phạm vi đơn vị áp dụng</span>
            <select multiple value={form.applicableOrganizationUnitIds} onChange={(event) => setForm({ ...form, applicableOrganizationUnitIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>
              {options.organizationUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
            <span>Không chọn đơn vị: Toàn Học viện.</span>
            <button className="button" type="button" onClick={() => setForm({ ...form, applicableOrganizationUnitIds: [] })}>Toàn Học viện</button>
          </label>
          <div className="form-section-inline">
            <div className="section-mini-heading">
              <CalendarClock size={16} aria-hidden="true" />
              Tệp bắt buộc
            </div>
            {form.requiredPackage.map((item, index) => (
              <div className="document-box" key={`${fileInputVersion}-${item.code}`}>
                <label className="field">
                  <span>File upload {index + 1}</span>
                  <input type="file" accept=".docx,.pdf" required={!item.templateFileId && !item.label} onChange={(event) => updateTemplate(index, { file: event.target.files?.[0] })} />
                </label>
                {item.templateFileId && editingId ? <a href={intakeTemplateUrl(editingId, item.templateFileId)}>{item.fileName || item.label}</a> : item.label && !item.file ? <span>{item.label} — chưa có file mẫu</span> : null}
                <label className="field">
                  <span>Miêu tả</span>
                  <textarea rows={2} maxLength={500} value={item.description ?? ""} onChange={(event) => updateTemplate(index, { description: event.target.value })} />
                </label>
                <button className="button" type="button" disabled={form.requiredPackage.length === 1} onClick={() => setForm({ ...form, requiredPackage: form.requiredPackage.filter((_, i) => i !== index) })}>Bỏ file {index + 1}</button>
              </div>
            ))}
            <button className="button" type="button" onClick={() => setForm({ ...form, requiredPackage: [...form.requiredPackage, { ...defaultPackage[0], code: `template-${crypto.randomUUID()}` }] })}>Thêm file</button>
          </div>
          {formError ? <p className="form-error">{formError}</p> : null}
          {message ? <p className="state-message success">{message}</p> : null}
          <div className="button-row">
            <button className="button primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Save size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
              {isSubmitting ? "Đang lưu" : editingId ? "Lưu thay đổi" : "Tạo đợt"}
            </button>
            {editingId ? (
              <button className="button" type="button" onClick={resetForm}>
                Hủy sửa
              </button>
            ) : null}
          </div>
          </fieldset>
        </form>
      </SectionCard>
      </Dialog> : null}
    </div>
  );
}
