"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck, UserPlus } from "lucide-react";
import {
  createAdminUser,
  loadAdminAccessData,
  updateAdminUserStatus,
  type AdminRole,
  type AdminUser,
  type OrganizationUnit
} from "@/lib/admin-api";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type LoadState = "loading" | "ready" | "error";

export function AdminUsersPanel() {
  const [state, setState] = useState<LoadState>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>([]);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    setState("loading");
    try {
      const data = await loadAdminAccessData();
      setUsers(data.users);
      setRoles(data.roles);
      setOrganizationUnits(data.organizationUnits);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const activeCount = useMemo(() => users.filter((user) => user.status === "active").length, [users]);

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const input = {
      username: String(form.get("username") ?? "").trim(),
      displayName: String(form.get("displayName") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      roleCode: String(form.get("roleCode") ?? ""),
      organizationUnitId: String(form.get("organizationUnitId") ?? "")
    };

    if (!input.username || !input.displayName || !input.password || !input.roleCode || !input.organizationUnitId) {
      setFormError("Vui lòng nhập đủ thông tin tài khoản, vai trò và đơn vị.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminUser(input);
      event.currentTarget.reset();
      setMessage("Đã tạo tài khoản và gán phạm vi truy cập.");
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể tạo tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(userId: string, status: string) {
    setMessage("");
    setFormError("");
    try {
      const result = await updateAdminUserStatus(userId, status);
      setUsers((current) => current.map((user) => (user.id === userId ? result.user : user)));
      setMessage(status === "active" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái.");
    }
  }

  return (
    <div className="grid two-column">
      <SectionCard
        title="Tài khoản nội bộ"
        subtitle={`${users.length} tài khoản, ${activeCount} đang hoạt động`}
      >
        {state === "loading" ? <p className="state-message">Đang tải danh sách tài khoản...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải dữ liệu quản trị tài khoản.</p> : null}
        {state === "ready" && users.length === 0 ? (
          <EmptyState title="Chưa có tài khoản" message="Tạo tài khoản đầu tiên để gán vai trò và phạm vi đơn vị." />
        ) : null}
        {state === "ready" && users.length > 0 ? (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Đơn vị</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <span className="record-title">{user.displayName}</span>
                        <span className="record-meta">{user.username}</span>
                      </td>
                      <td>{user.roleLabel}</td>
                      <td>{user.unit}</td>
                      <td>
                        <StatusBadge status={user.status === "active" ? "approved" : "blocked"} />
                        <span className="record-meta">{user.status === "active" ? "Được truy cập" : "Bị chặn truy cập"}</span>
                      </td>
                      <td>
                        <button
                          className="button"
                          type="button"
                          onClick={() => void handleStatusChange(user.id, user.status === "active" ? "locked" : "active")}
                        >
                          <ShieldCheck size={16} aria-hidden="true" />
                          {user.status === "active" ? "Khóa" : "Mở"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-list">
              {users.map((user) => (
                <article className="list-card" key={user.id}>
                  <div className="list-card-header">
                    <div>
                      <span className="record-title">{user.displayName}</span>
                      <span className="record-meta">{user.username}</span>
                    </div>
                    <StatusBadge status={user.status === "active" ? "approved" : "blocked"} />
                  </div>
                  <span className="record-meta">
                    {user.roleLabel} - {user.unit}
                  </span>
                  <button
                    className="button"
                    type="button"
                    onClick={() => void handleStatusChange(user.id, user.status === "active" ? "locked" : "active")}
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    {user.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}
                  </button>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="Tạo tài khoản" subtitle="Gán vai trò chính và phạm vi đơn vị ngay khi tạo">
        <form className="admin-form" onSubmit={(event) => void handleCreateUser(event)}>
          <label className="field">
            <span>Tên đăng nhập</span>
            <input name="username" autoComplete="username" />
          </label>
          <label className="field">
            <span>Họ tên hiển thị</span>
            <input name="displayName" autoComplete="name" />
          </label>
          <label className="field">
            <span>Mật khẩu khởi tạo</span>
            <input name="password" type="password" autoComplete="new-password" />
          </label>
          <label className="field">
            <span>Vai trò</span>
            <select name="roleCode" defaultValue="">
              <option value="" disabled>
                Chọn vai trò
              </option>
              {roles.map((role) => (
                <option value={role.code} key={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Phạm vi đơn vị</span>
            <select name="organizationUnitId" defaultValue="">
              <option value="" disabled>
                Chọn đơn vị
              </option>
              {organizationUnits.map((unit) => (
                <option value={unit.id} key={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
          {formError ? <p className="form-error">{formError}</p> : null}
          {message ? <p className="state-message success">{message}</p> : null}
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Save size={16} aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}
            {isSubmitting ? "Đang lưu" : "Tạo tài khoản"}
          </button>
        </form>
      </SectionCard>
    </div>
  );
}
