"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Lock, Save, Search, Unlock, UserPlus, X } from "lucide-react";
import {
  createAdminUser,
  loadAdminAccessData,
  updateAdminUser,
  updateAdminUserStatus,
  type AdminRole,
  type AdminUser,
  type OrganizationUnit,
  type UserFilterInput
} from "@/lib/admin-api";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";

type LoadState = "loading" | "ready" | "error";

export function AdminUsersPanel() {
  const [state, setState] = useState<LoadState>("loading");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [resultCount, setResultCount] = useState(0);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [organizationUnits, setOrganizationUnits] = useState<OrganizationUnit[]>([]);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<UserFilterInput>({});
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  async function refresh(nextFilters = filters) {
    setState("loading");
    try {
      const data = await loadAdminAccessData(nextFilters);
      setUsers(data.users);
      setResultCount(data.total);
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
  const hasAppliedFilters = Boolean(filters.keyword || filters.roleCode || filters.organizationId || filters.status);

  async function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextFilters = {
      keyword: String(form.get("keyword") ?? "").trim(),
      roleCode: String(form.get("roleCode") ?? ""),
      organizationId: String(form.get("organizationId") ?? ""),
      status: String(form.get("status") ?? "")
    };

    setFilters(nextFilters);
    await refresh(nextFilters);
  }

  async function clearFilters(form: HTMLFormElement) {
    form.reset();
    const nextFilters = {};
    setFilters(nextFilters);
    await refresh(nextFilters);
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const input = {
      username: String(form.get("username") ?? "").trim(),
      displayName: String(form.get("displayName") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      confirmPassword: String(form.get("confirmPassword") ?? ""),
      roleCode: String(form.get("roleCode") ?? ""),
      organizationUnitId: String(form.get("organizationUnitId") ?? "")
    };

    if (
      !input.username ||
      !input.displayName ||
      !input.password ||
      !input.confirmPassword ||
      !input.roleCode ||
      !input.organizationUnitId
    ) {
      setFormError("Vui lòng nhập đủ thông tin tài khoản, vai trò và đơn vị.");
      return;
    }

    if (input.password !== input.confirmPassword) {
      setFormError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createAdminUser({
        username: input.username,
        displayName: input.displayName,
        password: input.password,
        roleCode: input.roleCode,
        organizationUnitId: input.organizationUnitId
      });
      if (formElement.isConnected) {
        formElement.reset();
      }
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
    const confirmed = window.confirm(
      status === "active"
        ? "Mở khóa/kích hoạt lại tài khoản này?"
        : "Khóa/vô hiệu hóa tài khoản này? Người dùng sẽ không thể đăng nhập hoặc tiếp tục phiên hiện tại."
    );
    if (!confirmed) {
      return;
    }

    try {
      const result = await updateAdminUserStatus(userId, status);
      setUsers((current) => current.map((user) => (user.id === userId ? result.user : user)));
      setMessage(status === "active" ? "Đã mở khóa tài khoản." : "Đã khóa tài khoản.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật trạng thái.");
    }
  }

  async function handleEditUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

    setFormError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const input = {
      displayName: String(form.get("displayName") ?? "").trim(),
      roleCode: String(form.get("roleCode") ?? ""),
      organizationUnitId: String(form.get("organizationUnitId") ?? "")
    };

    if (!input.displayName || !input.roleCode || !input.organizationUnitId) {
      setFormError("Vui lòng nhập đủ họ tên hiển thị, vai trò và phạm vi đơn vị.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updateAdminUser(editingUser.id, input);
      setUsers((current) => current.map((user) => (user.id === editingUser.id ? result.user : user)));
      setEditingUser(result.user);
      setMessage("Đã cập nhật tài khoản, vai trò và phạm vi đơn vị.");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid two-column">
      <SectionCard
        title="Tài khoản nội bộ"
        subtitle={`${resultCount} kết quả, ${activeCount} đang hoạt động`}
      >
        {state === "loading" ? <p className="state-message">Đang tải danh sách tài khoản...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải dữ liệu quản trị tài khoản.</p> : null}
        <form className="filter-bar" onSubmit={(event) => void handleFilterSubmit(event)}>
          <label className="filter-field">
            <span>Tìm kiếm</span>
            <input name="keyword" defaultValue={filters.keyword ?? ""} placeholder="Tên đăng nhập hoặc họ tên" />
          </label>
          <label className="filter-field">
            <span>Vai trò</span>
            <select name="roleCode" defaultValue={filters.roleCode ?? ""}>
              <option value="">Tất cả vai trò</option>
              {roles.map((role) => (
                <option value={role.code} key={role.id}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Đơn vị</span>
            <select name="organizationId" defaultValue={filters.organizationId ?? ""}>
              <option value="">Tất cả đơn vị</option>
              {organizationUnits.map((unit) => (
                <option value={unit.id} key={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Trạng thái</span>
            <select name="status" defaultValue={filters.status ?? ""}>
              <option value="">Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Bị khóa</option>
              <option value="disabled">Vô hiệu hóa</option>
            </select>
          </label>
          <div className="button-row">
            <button className="button primary" type="submit">
              <Search size={16} aria-hidden="true" />
              {state === "loading" ? "Đang lọc" : "Lọc"}
            </button>
            <button className="button" type="button" onClick={(event) => void clearFilters(event.currentTarget.form!)}>
              <X size={16} aria-hidden="true" />
              Xóa lọc
            </button>
          </div>
        </form>
        {state === "ready" && users.length === 0 ? (
          <EmptyState
            title={hasAppliedFilters ? "Không có tài khoản phù hợp" : "Chưa có tài khoản"}
            message={
              hasAppliedFilters
                ? "Đổi điều kiện lọc hoặc xóa lọc để xem danh sách mặc định."
                : "Tạo tài khoản đầu tiên để gán vai trò và phạm vi đơn vị."
            }
          />
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
                        <div className="button-row">
                          <button className="button" type="button" onClick={() => setEditingUser(user)}>
                            <Edit3 size={16} aria-hidden="true" />
                            Sửa
                          </button>
                          <button
                            className={user.status === "active" ? "button danger" : "button"}
                            type="button"
                            onClick={() => void handleStatusChange(user.id, user.status === "active" ? "locked" : "active")}
                          >
                            {user.status === "active" ? <Lock size={16} aria-hidden="true" /> : <Unlock size={16} aria-hidden="true" />}
                            {user.status === "active" ? "Khóa" : "Mở"}
                          </button>
                        </div>
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
                  <div className="button-row">
                    <button className="button" type="button" onClick={() => setEditingUser(user)}>
                      <Edit3 size={16} aria-hidden="true" />
                      Sửa
                    </button>
                    <button
                      className={user.status === "active" ? "button danger" : "button"}
                      type="button"
                      onClick={() => void handleStatusChange(user.id, user.status === "active" ? "locked" : "active")}
                    >
                      {user.status === "active" ? <Lock size={16} aria-hidden="true" /> : <Unlock size={16} aria-hidden="true" />}
                      {user.status === "active" ? "Khóa tài khoản" : "Mở tài khoản"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard
        title={editingUser ? "Cập nhật tài khoản" : "Tạo tài khoản"}
        subtitle={editingUser ? editingUser.username : "Gán vai trò chính và phạm vi đơn vị ngay khi tạo"}
      >
        {editingUser ? (
          <form className="admin-form" onSubmit={(event) => void handleEditUser(event)}>
            <label className="field">
              <span>Tên đăng nhập</span>
              <input value={editingUser.username} disabled />
            </label>
            <label className="field">
              <span>Họ tên hiển thị</span>
              <input name="displayName" defaultValue={editingUser.displayName} autoComplete="name" />
            </label>
            <label className="field">
              <span>Vai trò</span>
              <select name="roleCode" defaultValue={editingUser.roleCode ?? editingUser.role}>
                {roles.map((role) => (
                  <option value={role.code} key={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Phạm vi đơn vị</span>
              <select name="organizationUnitId" defaultValue={editingUser.organizationUnitId ?? ""}>
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
            <div className="button-row">
              <button className="button primary" type="submit" disabled={isSubmitting}>
                <Save size={16} aria-hidden="true" />
                {isSubmitting ? "Đang lưu" : "Lưu thay đổi"}
              </button>
              <button className="button" type="button" onClick={() => setEditingUser(null)}>
                <X size={16} aria-hidden="true" />
                Hủy
              </button>
            </div>
          </form>
        ) : (
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
              <span>Xác nhận mật khẩu</span>
              <input name="confirmPassword" type="password" autoComplete="new-password" />
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
        )}
      </SectionCard>
    </div>
  );
}
