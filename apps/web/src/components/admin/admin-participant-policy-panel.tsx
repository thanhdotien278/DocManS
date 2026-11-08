"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { loadParticipantPolicy, updateParticipantPolicy, type ParticipantPolicyConfig, type ParticipantPolicyEntry } from "@/lib/admin-api";
import { SectionCard } from "@/components/ui/section-card";

const COLUMNS: Array<{ key: keyof ParticipantPolicyEntry; label: string }> = [
  { key: "pi", label: "Được làm PI/thành viên" },
  { key: "view", label: "Xem dữ liệu quản lý" },
  { key: "manage", label: "Phụ trách" }
];

/** D-041: bảng TP/TB/CV × "Được làm PI/thành viên", "Xem dữ liệu quản lý", "Phụ trách" trên hồ sơ/đề tài mình tham gia. */
export function AdminParticipantPolicyPanel() {
  const [config, setConfig] = useState<ParticipantPolicyConfig | null>(null);
  const [draft, setDraft] = useState<Record<string, ParticipantPolicyEntry>>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    loadParticipantPolicy()
      .then((data) => {
        if (!active) return;
        setConfig(data);
        setDraft(data.policy);
        setState("ready");
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "");
        setState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const unchanged = JSON.stringify(draft) === JSON.stringify(config?.policy ?? {});

  async function save() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const saved = await updateParticipantPolicy(draft);
      setConfig(saved);
      setDraft(saved.policy);
      setSuccess("Đã lưu cấu hình");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu cấu hình.");
    } finally {
      setSaving(false);
    }
  }

  const savedAt = config?.updatedAt ? new Date(config.updatedAt).toLocaleString("vi-VN") : null;

  return (
    <section aria-label="Cấu hình người tham gia hồ sơ">
      <h2>Phòng KHQS tham gia hồ sơ</h2>
      {state === "loading" ? <p className="state-message">Đang tải cấu hình...</p> : null}
      {state === "error" ? <p className="state-message error">{error || "Không thể tải cấu hình người tham gia hồ sơ."}</p> : null}
      {state === "ready" && config ? (
        <SectionCard title="TP, TB, CV làm PI/thành viên" subtitle="Tắt làm PI chỉ chặn tạo nháp mới và thêm thành viên mới. Xem chỉ mở đọc tiến độ, hội đồng, phiếu và tổng hợp. Phụ trách (kéo theo Xem) cho phép thao tác quản lý trên hồ sơ/đề tài mình tham gia, kể cả xử lý tờ trình; vẫn không chấm điểm, không tự rà soát tờ trình mình lập.">
          <form
            className="admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!unchanged && !saving) void save();
            }}
          >
            {config.isDefault ? <div><span className="status-badge info">Mặc định</span></div> : null}
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Vai trò</th>
                    {COLUMNS.map((column) => <th key={column.key} scope="col">{column.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {config.roles.map((role) => (
                    <tr key={role.code}>
                      <th scope="row">{role.label}</th>
                      {COLUMNS.map((column) => {
                        // "Phụ trách" kéo theo "Xem": ô Xem hiện đã tích và khóa khi Phụ trách bật.
                        const impliedView = column.key === "view" && Boolean(draft[role.code]?.manage);
                        return (
                        <td key={column.key}>
                          <input
                            type="checkbox"
                            aria-label={`${role.label}: ${column.label}`}
                            checked={impliedView || (draft[role.code]?.[column.key] ?? false)}
                            disabled={saving || impliedView}
                            aria-describedby={impliedView ? `implied-view-${role.code}` : undefined}
                            onChange={(event) => {
                              setSuccess("");
                              const checked = event.target.checked;
                              setDraft((current) => ({ ...current, [role.code]: { ...current[role.code]!, [column.key]: checked } }));
                            }}
                          />
                          {impliedView ? <span id={`implied-view-${role.code}`} className="record-meta"> Bật Phụ trách thì luôn được xem</span> : null}
                        </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div aria-live="polite">
              {error ? <p className="form-error">{error}</p> : null}
              {success ? <p className="state-message success">{success}{savedAt ? ` (cập nhật ${savedAt})` : ""}</p> : null}
              {!success && savedAt ? <p className="record-meta">Cập nhật lần cuối: {savedAt}</p> : null}
            </div>
            <button className="button primary" type="submit" disabled={saving || unchanged} title={unchanged ? "Chưa có thay đổi" : undefined}>
              <Save size={16} aria-hidden="true" />
              {saving ? "Đang lưu" : "Lưu"}
            </button>
          </form>
        </SectionCard>
      ) : null}
    </section>
  );
}
