"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { loadAdminConfig, updateSystemParameter, type SystemParameter } from "@/lib/admin-api";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";

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

  async function saveParameter(parameter: SystemParameter, value: string, success: string) {
    setMessage("");
    setFormError("");
    setIsSubmitting(true);
    try {
      await updateSystemParameter({ key: parameter.key, label: parameter.label, value });
      setMessage(success);
      await refresh();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Không thể cập nhật tham số.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <SectionCard title="Tham số hệ thống" subtitle="Các tham số nền dùng cho vận hành EP-01">
        {state === "loading" ? <p className="state-message">Đang tải cấu hình...</p> : null}
        {state === "error" ? <p className="state-message error">Không thể tải cấu hình hệ thống.</p> : null}
        {state === "ready" && parameters.length === 0 ? (
          <EmptyState title="Chưa có tham số" message="Thêm tham số nền để điều chỉnh vận hành hệ thống." />
        ) : null}
        {state === "ready" && parameters.length > 0 ? (
          <div className="settings-list">
            {message ? <p className="state-message success">{message}</p> : null}
            {formError ? <p className="form-error" role="alert">{formError}</p> : null}
            {parameters.map((parameter) => (
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
