"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { loadAdminConfig, updateSystemParameter, type SystemParameter } from "@/lib/admin-api";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";

const UI_THEME_KEY = "ui_theme";
const UI_THEMES = [
  { value: "classic", title: "Giao diện hiện tại", note: "Thanh điều hướng ngang phía trên." },
  { value: "workspace", title: "Không gian làm việc", note: "Menu bên trái theo nhóm việc của từng vai trò, trang đầu là việc cần xử lý, trang chi tiết có mục lục các phần." },
  { value: "guided", title: "Theo nhóm công việc", note: "Menu bên trái gom theo nhóm việc của từng vai trò, hiện rõ vai trò đang đăng nhập, chữ và nút lớn hơn." },
  { value: "academy", title: "Học viện", note: "Khung điều hướng xanh đậm liền khối với menu theo nhóm việc, điểm nhấn vàng tiết chế, tiêu đề và bảng theo kiểu văn bản chính thống." }
];

export function AdminConfigPanel() {
  const [parameters, setParameters] = useState<SystemParameter[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refresh() {
    setState("loading");
    try {
      const data = await loadAdminConfig();
      setParameters(data.parameters);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function saveParameter(parameter: Pick<SystemParameter, "key" | "label">, value: string, success: string) {
    setMessage("");
    setFormError("");
    setIsSubmitting(true);
    try {
      await updateSystemParameter({ key: parameter.key, label: parameter.label, value });
      setMessage(success);
      // Áp dụng ngay cho phiên này; người dùng khác nhận theme khi tải lại trang.
      if (parameter.key === UI_THEME_KEY) {
        if (value !== "classic") document.documentElement.dataset.theme = value;
        else delete document.documentElement.dataset.theme;
      }
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật tham số.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const savedTheme = parameters.find((parameter) => parameter.key === UI_THEME_KEY)?.value;
  const uiTheme = UI_THEMES.some((theme) => theme.value === savedTheme) ? savedTheme : "classic";
  const listedParameters = parameters.filter((parameter) => parameter.key !== UI_THEME_KEY);

  return (
    <div>
      {message ? <p className="state-message success" role="status">{message}</p> : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      {isSubmitting ? <p className="state-message" role="status">Đang lưu...</p> : null}
      {state === "ready" ? (
        <SectionCard title="Giao diện hệ thống" subtitle="Áp dụng cho toàn bộ hệ thống. Bạn thấy thay đổi ngay sau khi lưu; người dùng khác nhận giao diện mới khi tải lại trang.">
          <fieldset className="choice-group" disabled={isSubmitting}>
            <legend>Chọn giao diện</legend>
            <div className="choice-grid">
              {UI_THEMES.map((theme) => (
                <label className="choice-card" key={theme.value}>
                  <input
                    checked={uiTheme === theme.value}
                    name="ui-theme"
                    onChange={() => void saveParameter({ key: UI_THEME_KEY, label: "Giao diện hệ thống" }, theme.value, `Đã chuyển sang giao diện "${theme.title}".`)}
                    type="radio"
                    value={theme.value}
                  />
                  <span>
                    <strong>{theme.title}{uiTheme === theme.value ? " (đang dùng)" : ""}</strong>
                    <small>{theme.note}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </SectionCard>
      ) : null}
      <SectionCard title="Tham số hệ thống" subtitle="Các tham số nền dùng cho vận hành hệ thống">
        {state === "loading" ? <p className="state-message">Đang tải cấu hình...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải cấu hình hệ thống.</p> : null}
        {state === "ready" && listedParameters.length === 0 ? (
          <EmptyState title="Chưa có tham số" message="Thêm tham số nền để điều chỉnh vận hành hệ thống." />
        ) : null}
        {state === "ready" && listedParameters.length > 0 ? (
          <div className="settings-list">
            {listedParameters.map((parameter) => (
              <article className="setting-row" key={parameter.id}>
                <div>
                  <span className="record-title">{parameter.label}</span>
                  <span className="record-meta">{parameter.key}</span>
                </div>
                {parameter.value === "true" || parameter.value === "false" ? (
                  <button
                    aria-checked={parameter.value === "true"}
                    aria-label={parameter.label}
                    className="toggle-switch"
                    disabled={isSubmitting}
                    onClick={() => void saveParameter(parameter, parameter.value === "true" ? "false" : "true", `Đã ${parameter.value === "true" ? "tắt" : "bật"} "${parameter.label}".`)}
                    role="switch"
                    type="button"
                  >
                    <span className="toggle-switch-label">{parameter.value === "true" ? "Bật" : "Tắt"}</span>
                    <span className="toggle-switch-track" aria-hidden="true" />
                  </button>
                ) : (
                  <form
                    className="setting-inline-form"
                    key={`${parameter.key}:${parameter.value}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = String(new FormData(event.currentTarget).get("value") ?? "").trim();
                      if (!value) return setFormError("Giá trị không được để trống.");
                      void saveParameter(parameter, value, `Đã cập nhật "${parameter.label}".`);
                    }}
                  >
                    <input aria-label={parameter.label} defaultValue={parameter.value} inputMode={/^\d+$/.test(parameter.value) ? "numeric" : undefined} name="value" />
                    <button className="button" disabled={isSubmitting} type="submit">
                      <Save size={14} aria-hidden="true" />
                      Lưu
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
