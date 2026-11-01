"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
  loadCouncilFormationConfig,
  updateCouncilFormationConfig,
  type CouncilFormationConfig,
  type CouncilSelectableRole
} from "@/lib/admin-api";
import { SectionCard } from "@/components/ui/section-card";

type Draft = { allowedRoles: string[]; memberCount: string };

function toDraft(config: CouncilFormationConfig): Draft {
  return { allowedRoles: config.allowedRoles, memberCount: String(config.memberCount) };
}

function CouncilCard({
  config,
  roles,
  onSaved
}: {
  config: CouncilFormationConfig;
  roles: CouncilSelectableRole[];
  onSaved: (config: CouncilFormationConfig) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(config));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const count = Number(draft.memberCount);
  const countValid = draft.memberCount.trim() !== "" && Number.isInteger(count) && count >= config.minMemberCount && count <= config.maxMemberCount;
  const unchanged =
    count === config.memberCount &&
    draft.allowedRoles.length === config.allowedRoles.length &&
    draft.allowedRoles.every((role) => config.allowedRoles.includes(role));
  const noRole = draft.allowedRoles.length === 0;
  const reason = noRole
    ? "Chọn ít nhất một vai trò"
    : !countValid
      ? `Số lượng thành viên phải là số nguyên từ ${config.minMemberCount} đến ${config.maxMemberCount}`
      : unchanged
        ? "Chưa có thay đổi"
        : "";

  function toggleRole(code: string) {
    setSuccess("");
    setDraft((current) => ({
      ...current,
      allowedRoles: current.allowedRoles.includes(code) ? current.allowedRoles.filter((role) => role !== code) : [...current.allowedRoles, code]
    }));
  }

  async function save() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const { config: saved } = await updateCouncilFormationConfig(config.councilType, { allowedRoles: draft.allowedRoles, memberCount: count });
      onSaved(saved);
      setDraft(toDraft(saved));
      setSuccess("Đã lưu cấu hình");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu cấu hình hội đồng.");
    } finally {
      setSaving(false);
    }
  }

  const savedAt = config.updatedAt ? new Date(config.updatedAt).toLocaleString("vi-VN") : null;

  return (
    <SectionCard title={config.councilTypeLabel} subtitle="Vai trò được thành lập hội đồng và số lượng thành viên">
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!reason && !saving) {
            void save();
          }
        }}
      >
        <div>
          <span className={`status-badge ${config.enforced ? "success" : "neutral"}`}>{config.enforced ? "Đang áp dụng" : "Chưa áp dụng"}</span>{" "}
          {config.isDefault ? <span className="status-badge info">Mặc định</span> : null}
        </div>
        <fieldset className="field" disabled={saving}>
          <legend>Vai trò được thành lập hội đồng và mời thành viên</legend>
          {roles.map((role) => (
            <label key={role.code} className="multi-select-option">
              <input type="checkbox" checked={draft.allowedRoles.includes(role.code)} onChange={() => toggleRole(role.code)} />
              {role.label}
            </label>
          ))}
          <p className="field-hint">Quản trị hệ thống chỉ cấu hình, không thành lập hay mời thành viên.</p>
        </fieldset>
        <label className="field">
          <span>Số lượng thành viên (kể cả thư ký)</span>
          <input
            type="number"
            inputMode="numeric"
            min={config.minMemberCount}
            max={config.maxMemberCount}
            step={1}
            value={draft.memberCount}
            disabled={saving}
            onChange={(event) => {
              setSuccess("");
              setDraft((current) => ({ ...current, memberCount: event.target.value }));
            }}
          />
          <span className="field-hint">
            Từ {config.minMemberCount} đến {config.maxMemberCount} thành viên.
            {config.councilType === "EVALUATION" && countValid ? ` 1 Chủ tịch · 2 Phản biện · ${count - 4} Ủy viên · 1 Thư ký` : ""}
          </span>
        </label>
        <div aria-live="polite">
          {error ? <p className="form-error">{error}</p> : null}
          {success ? (
            <p className="state-message success">
              {success}
              {savedAt ? ` (cập nhật ${savedAt})` : ""}
            </p>
          ) : null}
          {!success && savedAt ? <p className="record-meta">Cập nhật lần cuối: {savedAt}</p> : null}
        </div>
        <button className="button primary" type="submit" disabled={saving || Boolean(reason)} title={reason || undefined}>
          <Save size={16} aria-hidden="true" />
          {saving ? "Đang lưu" : "Lưu"}
        </button>
        {reason && !saving ? <span className="record-meta">{reason}</span> : null}
      </form>
    </SectionCard>
  );
}

export function AdminCouncilConfigPanel() {
  const [configs, setConfigs] = useState<CouncilFormationConfig[]>([]);
  const [roles, setRoles] = useState<CouncilSelectableRole[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    loadCouncilFormationConfig()
      .then((data) => {
        if (!active) return;
        setConfigs(data.configs);
        setRoles(data.selectableRoles);
        setState("ready");
      })
      .catch((caught) => {
        if (!active) return;
        setLoadError(caught instanceof Error ? caught.message : "");
        setState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section aria-label="Cấu hình thành lập hội đồng">
      <h2>Cấu hình thành lập hội đồng</h2>
      {state === "loading" ? <p className="state-message">Đang tải cấu hình hội đồng...</p> : null}
      {state === "error" ? <p className="state-message error">{loadError || "Không thể tải cấu hình thành lập hội đồng."}</p> : null}
      {state === "ready" ? (
        <div className="grid two-column">
          {configs.map((config) => (
            <CouncilCard
              key={config.councilType}
              config={config}
              roles={roles}
              onSaved={(saved) => setConfigs((current) => current.map((item) => (item.councilType === saved.councilType ? saved : item)))}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
