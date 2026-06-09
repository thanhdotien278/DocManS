"use client";

import { useEffect, useState } from "react";
import { Building2, Save, ShieldCheck } from "lucide-react";
import {
  createOrganizationUnit,
  createRole,
  loadAdminAccessData,
  updateOrganizationUnitStatus,
  updateRoleStatus,
  type AdminRole,
  type OrganizationUnit
} from "@/lib/admin-api";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

export function AdminRolesPanel() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

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

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFormError("");
    const form = new FormData(event.currentTarget);
    const input = {
      code: String(form.get("code") ?? "").trim(),
      label: String(form.get("label") ?? "").trim(),
      description: String(form.get("description") ?? "").trim()
    };

    if (!input.code || !input.label) {
      setFormError("Vui lòng nhập mã và tên vai trò.");
      return;
    }

    try {
      await createRole(input);
      event.currentTarget.reset();
      setMessage("Đã tạo vai trò.");
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể tạo vai trò.");
    }
  }

  async function handleStatus(roleId: string, currentStatus: string) {
    setMessage("");
    setFormError("");
    try {
      const result = await updateRoleStatus(roleId, currentStatus === "active" ? "inactive" : "active");
      setRoles((current) => current.map((role) => (role.id === roleId ? result.role : role)));
      setMessage("Đã cập nhật trạng thái vai trò.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật vai trò.");
    }
  }

  return (
    <div className="grid two-column">
      <SectionCard title="Vai trò hệ thống" subtitle="Nguồn gán quyền chính cho tài khoản nội bộ">
        {state === "loading" ? <p className="state-message">Đang tải vai trò...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải danh sách vai trò.</p> : null}
        {state === "ready" && roles.length === 0 ? (
          <EmptyState title="Chưa có vai trò" message="Seed hoặc tạo vai trò trước khi gán tài khoản." />
        ) : null}
        <div className="reference-grid">
          {roles.map((role) => (
            <article className="reference-item" key={role.id}>
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <span className="record-title">{role.label}</span>
                <span className="record-meta">{role.code}</span>
              </div>
              <StatusBadge status={role.status} />
              <button className="button" type="button" onClick={() => void handleStatus(role.id, role.status)}>
                {role.status === "active" ? "Tắt" : "Bật"}
              </button>
            </article>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Tạo vai trò" subtitle="Vai trò mới được ghi audit và có thể gán cho tài khoản">
        <form className="admin-form" onSubmit={(event) => void handleCreate(event)}>
          <label className="field">
            <span>Mã vai trò</span>
            <input name="code" />
          </label>
          <label className="field">
            <span>Tên vai trò</span>
            <input name="label" />
          </label>
          <label className="field">
            <span>Mô tả</span>
            <textarea name="description" rows={4} />
          </label>
          {formError ? <p className="form-error">{formError}</p> : null}
          {message ? <p className="state-message success">{message}</p> : null}
          <button className="button primary" type="submit">
            <Save size={16} aria-hidden="true" />
            Tạo vai trò
          </button>
        </form>
      </SectionCard>
    </div>
  );
}

export function AdminUnitsPanel() {
  const [units, setUnits] = useState<OrganizationUnit[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function refresh() {
    setState("loading");
    await loadAdminAccessData()
      .then((data) => {
        setUnits(data.organizationUnits);
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
    const form = new FormData(event.currentTarget);
    const input = {
      code: String(form.get("code") ?? "").trim(),
      name: String(form.get("name") ?? "").trim()
    };

    if (!input.code || !input.name) {
      setFormError("Vui lòng nhập mã và tên đơn vị.");
      return;
    }

    try {
      await createOrganizationUnit(input);
      event.currentTarget.reset();
      setMessage("Đã tạo đơn vị.");
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể tạo đơn vị.");
    }
  }

  async function handleStatus(unitId: string, currentStatus: string) {
    setMessage("");
    setFormError("");
    try {
      const result = await updateOrganizationUnitStatus(unitId, currentStatus === "active" ? "inactive" : "active");
      setUnits((current) => current.map((unit) => (unit.id === unitId ? result.organizationUnit : unit)));
      setMessage("Đã cập nhật trạng thái đơn vị.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật đơn vị.");
    }
  }

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
                <span className="record-meta">{unit.code}</span>
              </div>
              <StatusBadge status={unit.status} />
              <button className="button" type="button" onClick={() => void handleStatus(unit.id, unit.status)}>
                {unit.status === "active" ? "Tắt" : "Bật"}
              </button>
            </article>
          ))}
        </div>
      </SectionCard>
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
          {formError ? <p className="form-error">{formError}</p> : null}
          {message ? <p className="state-message success">{message}</p> : null}
          <button className="button primary" type="submit">
            <Save size={16} aria-hidden="true" />
            Tạo đơn vị
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
