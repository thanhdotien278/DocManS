"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, BookPlus, Pencil, Save, Trash2, X } from "lucide-react";
import { createCatalogItem, loadCatalogItems, softDeleteCatalogItem, updateCatalogItem, type CatalogItem } from "@/lib/admin-api";
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
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const selectedTypeRef = useRef(selectedType);

  async function refresh(type = selectedType) {
    const requestType = type;
    setState("loading");
    try {
      const nextItems = await loadCatalogItems(requestType);
      if (requestType !== selectedTypeRef.current) {
        return;
      }
      setItems(nextItems);
      setState("ready");
    } catch {
      if (requestType === selectedTypeRef.current) {
        setState("error");
      }
    }
  }

  useEffect(() => {
    selectedTypeRef.current = selectedType;
    void refresh(selectedType);
  }, [selectedType]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
      if (formElement.isConnected) {
        formElement.reset();
      }
      setMessage("Đã thêm danh mục dùng chung.");
      await refresh(selectedType);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể thêm danh mục.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingItem) {
      return;
    }

    setFormError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name") ?? "").trim(),
      description: String(form.get("description") ?? "").trim()
    };

    if (!input.name) {
      setFormError("Vui lòng nhập tên danh mục.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateCatalogItem(editingItem.id, input);
      setEditingItem(null);
      setMessage("Đã cập nhật danh mục dùng chung.");
      await refresh(selectedType);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật danh mục.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatus(item: CatalogItem, status: "active" | "inactive" | "archived") {
    setFormError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      await updateCatalogItem(item.id, { status });
      setMessage(status === "active" ? "Đã kích hoạt danh mục." : status === "inactive" ? "Đã ngừng dùng danh mục." : "Đã lưu trữ danh mục.");
      await refresh(selectedType);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderStatusActions(item: CatalogItem) {
    if (item.status === "archived") {
      return (
        <button className="button" type="button" onClick={() => void handleStatus(item, "active")} disabled={isSubmitting}>
          Khôi phục
        </button>
      );
    }

    return (
      <>
        <button
          className={item.status === "active" ? "button danger" : "button"}
          type="button"
          onClick={() => void handleStatus(item, item.status === "active" ? "inactive" : "active")}
          disabled={isSubmitting}
        >
          {item.status === "active" ? "Ngừng dùng" : "Kích hoạt"}
        </button>
        <button className="button" type="button" onClick={() => void handleStatus(item, "archived")} disabled={isSubmitting}>
          <Archive size={16} aria-hidden="true" />
          Lưu trữ
        </button>
      </>
    );
  }

  async function handleDelete(item: CatalogItem) {
    const confirmed = window.confirm(`Xóa mềm danh mục "${item.name}"?`);
    if (!confirmed) {
      return;
    }

    setFormError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      await softDeleteCatalogItem(item.id);
      if (editingItem?.id === item.id) {
        setEditingItem(null);
      }
      setMessage("Đã xóa mềm danh mục dùng chung.");
      await refresh(selectedType);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể xóa mềm danh mục.");
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
                    <th>Thao tác</th>
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
                      <td>
                        <div className="row-actions">
                          <button className="button icon-button" type="button" onClick={() => setEditingItem(item)} disabled={isSubmitting} title="Sửa danh mục">
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          {renderStatusActions(item)}
                          <button className="button icon-button danger" type="button" onClick={() => void handleDelete(item)} disabled={isSubmitting} title="Xóa mềm">
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
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
                  <div className="row-actions">
                    <button className="button" type="button" onClick={() => setEditingItem(item)} disabled={isSubmitting}>
                      <Pencil size={16} aria-hidden="true" />
                      Sửa
                    </button>
                    {renderStatusActions(item)}
                    <button className="button danger" type="button" onClick={() => void handleDelete(item)} disabled={isSubmitting}>
                      <Trash2 size={16} aria-hidden="true" />
                      Xóa mềm
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title={editingItem ? "Sửa danh mục" : "Thêm danh mục"} subtitle="Mã danh mục dùng chữ, số, dấu gạch ngang hoặc gạch dưới">
        <form className="admin-form" key={editingItem?.id ?? "create"} onSubmit={(event) => (editingItem ? void handleEdit(event) : void handleCreate(event))}>
          <label className="field">
            <span>Mã danh mục</span>
            <input name="code" defaultValue={editingItem?.code ?? ""} disabled={Boolean(editingItem)} />
          </label>
          <label className="field">
            <span>Tên hiển thị</span>
            <input name="name" defaultValue={editingItem?.name ?? ""} />
          </label>
          <label className="field">
            <span>Mô tả</span>
            <textarea name="description" rows={4} defaultValue={editingItem?.description ?? ""} />
          </label>
          {formError ? <p className="form-error">{formError}</p> : null}
          {message ? <p className="state-message success">{message}</p> : null}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Save size={16} aria-hidden="true" /> : <BookPlus size={16} aria-hidden="true" />}
            {isSubmitting ? "Đang lưu" : editingItem ? "Lưu thay đổi" : "Thêm danh mục"}
          </button>
          {editingItem ? (
            <button className="button" type="button" onClick={() => setEditingItem(null)} disabled={isSubmitting}>
              <X size={16} aria-hidden="true" />
              Hủy sửa
            </button>
          ) : null}
        </form>
      </SectionCard>
    </div>
  );
}
