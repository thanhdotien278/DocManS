"use client";

import { useEffect, useState } from "react";
import { Building2, Save, ShieldCheck } from "lucide-react";
import {
  createOrganizationUnit,
  loadAdminAccessData,
  loadAllOrganizationUnits,
  updateOrganizationUnit,
  updateOrganizationUnitStatus,
  type AdminRole,
  type OrganizationUnit
} from "@/lib/admin-api";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

export function AdminRolesPanel() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  async function refresh() {
    setState("loading");
    await loadAdminAccessData()
      .then((data) => {
        setRoles(data.roles);
        setState("ready");
      })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="grid">
      <SectionCard title="Vai trò hệ thống" subtitle="Nguồn gán quyền chính cho tài khoản nội bộ">
        {state === "loading" ? <p className="state-message">Đang tải vai trò...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải danh sách vai trò.</p> : null}
        {state === "ready" && roles.length === 0 ? (
          <EmptyState title="Chưa tải được vai trò" message="Hãy tải lại trang để lấy danh sách system role cố định." />
        ) : null}
        <div className="reference-grid">
          {roles.map((role) => (
            <article className="reference-item" key={role.id}>
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <span className="record-title">{role.label}</span>
                <span className="record-meta">{role.code}</span>
              </div>
              <StatusBadge status="active" />
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

const UNIT_TYPE_OPTIONS = [
  { code: "INSTITUTE", label: "Viện" },
  { code: "DEPARTMENT", label: "Phòng" },
  { code: "FACULTY", label: "Khoa" },
  { code: "DIVISION", label: "Bộ môn" },
  { code: "OTHER", label: "Khác" }
];

export function AdminUnitsPanel() {
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [editing, setEditing] = useState<OrganizationUnit | null>(null);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function refresh() {
    setState("loading");
    await loadAllOrganizationUnits()
      .then((organizationUnits) => {
        setUnits(organizationUnits);
        setState("ready");
      })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFormError("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const unitType = String(form.get("unitType") ?? "");
    const input = {
      code: String(form.get("code") ?? "").trim(),
      name: String(form.get("name") ?? "").trim(),
      ...(unitType ? { unitType } : {})
    };

    if (!input.code || !input.name) {
      setFormError("Vui lòng nhập mã và tên đơn vị.");
      return;
    }

    try {
      await createOrganizationUnit(input);
      if (formElement.isConnected) {
        formElement.reset();
      }
      setMessage("Đã tạo đơn vị.");
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể tạo đơn vị.");
    }
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setMessage("");
    setFormError("");
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      setFormError("Vui lòng nhập tên đơn vị.");
      return;
    }
    try {
      const parentId = String(form.get("parentId") ?? "");
      await updateOrganizationUnit(editing.id, {
        name,
        parentId,
        unitType: String(form.get("unitType") ?? editing.unitType ?? "OTHER")
      });
      setEditing(null);
      setMessage("Đã cập nhật đơn vị.");
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật đơn vị.");
    }
  }

  async function handleStatus(unitId: string, currentStatus: string) {
    setMessage("");
    setFormError("");
    try {
      await updateOrganizationUnitStatus(unitId, currentStatus === "active" ? "inactive" : "active");
      setMessage("Đã cập nhật trạng thái đơn vị.");
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật đơn vị.");
    }
  }

  const nameOf = (id?: string | null) => units.find((unit) => unit.id === id)?.name;

  return (
    <div className="grid two-column">
      <SectionCard title="Đơn vị và phạm vi dữ liệu" subtitle="Nguồn gán organization scope cho tài khoản">
        {state === "loading" ? <p className="state-message">Đang tải đơn vị...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải danh sách đơn vị.</p> : null}
        {state === "ready" && units.length === 0 ? (
          <EmptyState title="Chưa có đơn vị" message="Seed hoặc tạo đơn vị trước khi gán phạm vi dữ liệu." />
        ) : null}
        <div className="reference-grid">
          {units.map((unit) => (
            <article className="reference-item" key={unit.id}>
              <Building2 size={18} aria-hidden="true" />
              <div>
                <span className="record-title">{unit.name}</span>
                <span className="record-meta">{unit.unitTypeLabel ? `${unit.unitTypeLabel} · ` : ""}{unit.code}{unit.parentId ? ` · thuộc ${nameOf(unit.parentId) || "đơn vị khác"}` : ""}</span>
                {unit.positions?.map((position) => (
                  <span key={`${position.userId}-${position.positionCode}`} className="record-meta" style={{ display: "block", color: "#065f46" }}>
                    {position.label}: {position.displayName}
                  </span>
                ))}
              </div>
              <StatusBadge status={unit.status} />
              <div className="button-row">
                <button className="button" type="button" onClick={() => { setFormError(""); setEditing(unit); }}>Sửa</button>
                <button className="button" type="button" onClick={() => void handleStatus(unit.id, unit.status)}>
                  {unit.status === "active" ? "Tắt" : "Bật"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>
      {editing ? (
        <SectionCard title={`Sửa đơn vị ${editing.code}`} subtitle="Đổi tên, loại đơn vị hoặc đơn vị cấp cha">
          <form className="admin-form" key={editing.id} onSubmit={(event) => void handleEdit(event)}>
            <label className="field">
              <span>Tên đơn vị</span>
              <input name="name" defaultValue={editing.name} maxLength={160} />
            </label>
            <label className="field">
              <span>Loại đơn vị</span>
              <select name="unitType" defaultValue={editing.unitType ?? "OTHER"}>
                {UNIT_TYPE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Đơn vị cấp cha</span>
              <select name="parentId" defaultValue={editing.parentId ?? ""}>
                <option value="">Không có (cấp cao nhất)</option>
                {units.filter((unit) => unit.id !== editing.id).map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.name}</option>
                ))}
              </select>
            </label>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="button-row">
              <button className="button primary" type="submit">
                <Save size={16} aria-hidden="true" />
                Lưu thay đổi
              </button>
              <button className="button" type="button" onClick={() => setEditing(null)}>Huỷ</button>
            </div>
          </form>
        </SectionCard>
      ) : (
        <SectionCard title="Tạo đơn vị" subtitle="Đơn vị mới có thể dùng để gán phạm vi dữ liệu">
          <form className="admin-form" onSubmit={(event) => void handleCreate(event)}>
            <label className="field">
              <span>Mã đơn vị</span>
              <input name="code" />
            </label>
            <label className="field">
              <span>Tên đơn vị</span>
              <input name="name" />
            </label>
            <label className="field">
              <span>Loại đơn vị</span>
              <select name="unitType" defaultValue="">
                <option value="">Tự xác định theo tên</option>
                {UNIT_TYPE_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </label>
            {formError ? <p className="form-error">{formError}</p> : null}
            {message ? <p className="state-message success">{message}</p> : null}
            <button className="button primary" type="submit">
              <Save size={16} aria-hidden="true" />
              Tạo đơn vị
            </button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
