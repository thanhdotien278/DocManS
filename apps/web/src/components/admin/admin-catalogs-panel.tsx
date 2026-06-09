"use client";

import { useEffect, useState } from "react";
import { BookPlus, Save } from "lucide-react";
import { createCatalogItem, loadCatalogItems, type CatalogItem } from "@/lib/admin-api";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

const catalogTypes = [
  { value: "research-field", label: "Lĩnh vực nghiên cứu" },
  { value: "proposal-type", label: "Loại hồ sơ" },
  { value: "priority", label: "Mức ưu tiên" },
  { value: "report-type", label: "Loại báo cáo" },
  { value: "scoring-criterion", label: "Tiêu chí chấm điểm" }
];

export function AdminCatalogsPanel() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [selectedType, setSelectedType] = useState(catalogTypes[0].value);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh(type = selectedType) {
    setState("loading");
    try {
      setItems(await loadCatalogItems(type));
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refresh(selectedType);
  }, [selectedType]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const input = {
      type: selectedType,
      code: String(form.get("code") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim()
    };

    if (!input.code || !input.name) {
      setFormError("Vui lòng nhập mã và tên danh mục.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createCatalogItem(input);
      event.currentTarget.reset();
      setMessage("Đã thêm danh mục dùng chung.");
      await refresh(selectedType);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể thêm danh mục.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid two-column">
      <SectionCard title="Danh mục dùng chung" subtitle="Quản lý các giá trị nền cho nghiệp vụ EP-01">
        <div className="filter-bar compact">
          <label className="filter-field">
            <span>Loại danh mục</span>
            <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
              {catalogTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {state === "loading" ? <p className="state-message">Đang tải danh mục...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải danh mục.</p> : null}
        {state === "ready" && items.length === 0 ? (
          <EmptyState title="Chưa có giá trị" message="Thêm giá trị đầu tiên cho loại danh mục đang chọn." />
        ) : null}
        {state === "ready" && items.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Mô tả</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="record-title">{item.code}</span>
                      </td>
                      <td>{item.name}</td>
                      <td>{item.description || "Không có"}</td>
                      <td>
                        <StatusBadge status={item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-list">
              {items.map((item) => (
                <article className="list-card" key={item.id}>
                  <div className="list-card-header">
                    <div>
                      <span className="record-title">{item.name}</span>
                      <span className="record-meta">{item.code}</span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <span className="record-meta">{item.description || "Không có mô tả"}</span>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="Thêm danh mục" subtitle="Mã danh mục dùng chữ, số, dấu gạch ngang hoặc gạch dưới">
        <form className="admin-form" onSubmit={(event) => void handleCreate(event)}>
          <label className="field">
            <span>Mã danh mục</span>
            <input name="code" />
          </label>
          <label className="field">
            <span>Tên hiển thị</span>
            <input name="name" />
          </label>
          <label className="field">
            <span>Mô tả</span>
            <textarea name="description" rows={4} />
          </label>
          {formError ? <p className="form-error">{formError}</p> : null}
          {message ? <p className="state-message success">{message}</p> : null}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Save size={16} aria-hidden="true" /> : <BookPlus size={16} aria-hidden="true" />}
            {isSubmitting ? "Đang lưu" : "Thêm danh mục"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
