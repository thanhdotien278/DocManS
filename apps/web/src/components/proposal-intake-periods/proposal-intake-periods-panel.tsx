"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Edit3, Lock, Plus, Save, Search, Unlock } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  closeProposalIntakePeriod,
  createProposalIntakePeriod,
  loadProposalIntakePeriods,
  openProposalIntakePeriod,
  updateProposalIntakePeriod,
  type ProposalIntakePeriod,
  type RequiredPackageItem
} from "@/lib/proposal-intake-periods-api";

type LoadState = "loading" | "ready" | "error";

const defaultPackage: RequiredPackageItem[] = [
  { code: "proposal-form", label: "Thuyết minh đề tài", allowedMimeTypes: ["application/pdf"], maxSizeMb: 5 },
  { code: "budget-form", label: "Dự toán kinh phí", allowedMimeTypes: ["application/pdf"], maxSizeMb: 5 }
];

const emptyForm = {
  code: "",
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  applicableOrganizationUnitId: "",
  requiredPackage: defaultPackage
};

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN").format(new Date(value)) : "Chưa có";
}

function toDateInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export function ProposalIntakePeriodsPanel() {
  const [state, setState] = useState<LoadState>("loading");
  const [periods, setPeriods] = useState<ProposalIntakePeriod[]>([]);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    setState("loading");
    try {
      setPeriods(await loadProposalIntakePeriods());
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

  function updatePackage(index: number, field: keyof RequiredPackageItem, value: string) {
    setForm((current) => ({
      ...current,
      requiredPackage: current.requiredPackage.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: field === "allowedMimeTypes" ? value.split(",").map((mimeType) => mimeType.trim()).filter(Boolean) : value,
              ...(field === "maxSizeMb" ? { maxSizeMb: Number(value) } : {})
            }
          : item
      )
    }));
  }

  function startEdit(period: ProposalIntakePeriod) {
    setEditingId(period.id);
    setForm({
      code: period.code,
      title: period.title,
      description: period.description,
      startsAt: toDateInput(period.startsAt),
      endsAt: toDateInput(period.endsAt),
      applicableOrganizationUnitId: period.applicableOrganizationUnitId,
      requiredPackage: period.requiredPackage.length ? period.requiredPackage : defaultPackage
    });
    setMessage("");
    setFormError("");
  }

  function resetForm() {
    setEditingId("");
    setForm(emptyForm);
    setFormError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFormError("");

    if (!form.code || !form.title || !form.startsAt || !form.endsAt || form.requiredPackage.some((item) => !item.code || !item.label)) {
      setFormError("Vui lòng nhập mã, tên, thời gian và danh sách tệp bắt buộc.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateProposalIntakePeriod(editingId, form);
        setMessage("Đã cập nhật đợt tiếp nhận.");
      } else {
        await createProposalIntakePeriod(form);
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
    setMessage("");
    setFormError("");
    try {
      const result = action === "open" ? await openProposalIntakePeriod(period.id) : await closeProposalIntakePeriod(period.id);
      setPeriods((current) => current.map((item) => (item.id === period.id ? result.intakePeriod : item)));
      setMessage(action === "open" ? "Đã mở đợt tiếp nhận." : "Đã đóng đợt tiếp nhận.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái.");
    }
  }

  return (
    <div className="grid two-column">
      <SectionCard title="Danh sách đợt tiếp nhận" subtitle="Tìm, lọc và điều phối trạng thái nhận hồ sơ">
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
            <div className="table-wrap">
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
                      <td>{period.applicableOrganizationUnitId || "Toàn hệ thống"}</td>
                      <td>{period.requiredPackage.map((item) => item.label).join(", ")}</td>
                      <td>
                        <StatusBadge status={period.status} />
                      </td>
                      <td>
                        <div className="button-row compact-actions">
                          <button className="button" type="button" onClick={() => startEdit(period)}>
                            <Edit3 size={16} aria-hidden="true" />
                            Sửa
                          </button>
                          {period.status === "open" ? (
                            <button className="button danger" type="button" onClick={() => void handleStatusAction(period, "close")}>
                              <Lock size={16} aria-hidden="true" />
                              Đóng
                            </button>
                          ) : (
                            <button className="button" type="button" onClick={() => void handleStatusAction(period, "open")}>
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
                  <span className="record-meta">{period.requiredPackage.map((item) => item.label).join(", ")}</span>
                  <div className="button-row">
                    <button className="button" type="button" onClick={() => startEdit(period)}>
                      <Edit3 size={16} aria-hidden="true" />
                      Sửa
                    </button>
                    <button
                      className={period.status === "open" ? "button danger" : "button"}
                      type="button"
                      onClick={() => void handleStatusAction(period, period.status === "open" ? "close" : "open")}
                    >
                      {period.status === "open" ? <Lock size={16} aria-hidden="true" /> : <Unlock size={16} aria-hidden="true" />}
                      {period.status === "open" ? "Đóng" : "Mở"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard
        title={editingId ? "Cập nhật đợt tiếp nhận" : "Tạo đợt tiếp nhận"}
        subtitle="Thiết lập thời gian, phạm vi áp dụng và danh sách tệp bắt buộc"
      >
        <form className="admin-form" onSubmit={(event) => void handleSubmit(event)}>
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
              <input type="date" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} />
            </label>
            <label className="field">
              <span>Ngày kết thúc</span>
              <input type="date" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} />
            </label>
          </div>
          <label className="field">
            <span>Phạm vi đơn vị áp dụng</span>
            <input
              value={form.applicableOrganizationUnitId}
              onChange={(event) => setForm({ ...form, applicableOrganizationUnitId: event.target.value })}
              placeholder="Để trống nếu áp dụng toàn hệ thống"
            />
          </label>
          <div className="form-section-inline">
            <div className="section-mini-heading">
              <CalendarClock size={16} aria-hidden="true" />
              Tệp bắt buộc
            </div>
            {form.requiredPackage.map((item, index) => (
              <div className="package-row" key={index}>
                <label className="field">
                  <span>Mã tệp</span>
                  <input value={item.code} onChange={(event) => updatePackage(index, "code", event.target.value)} />
                </label>
                <label className="field">
                  <span>Tên tệp</span>
                  <input value={item.label} onChange={(event) => updatePackage(index, "label", event.target.value)} />
                </label>
                <label className="field">
                  <span>MIME</span>
                  <input value={item.allowedMimeTypes.join(", ")} onChange={(event) => updatePackage(index, "allowedMimeTypes", event.target.value)} />
                </label>
                <label className="field">
                  <span>MB</span>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={item.maxSizeMb}
                    onChange={(event) => updatePackage(index, "maxSizeMb", event.target.value)}
                  />
                </label>
              </div>
            ))}
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
        </form>
      </SectionCard>
    </div>
  );
}
