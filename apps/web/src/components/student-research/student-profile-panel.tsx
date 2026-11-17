"use client";

import { useEffect, useState, type FormEvent } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { loadStudentProfile, saveStudentProfile, type StudentProfile } from "@/lib/student-research-api";

const FIELDS: [keyof Pick<StudentProfile, "studentCode" | "className" | "phone" | "previousSemesterScore">, string, React.InputHTMLAttributes<HTMLInputElement>][] = [
  ["studentCode", "Mã sinh viên", { maxLength: 32 }],
  ["className", "Lớp / Khoá", { maxLength: 80 }],
  ["phone", "Số điện thoại", { type: "tel", autoComplete: "tel", maxLength: 20 }],
  ["previousSemesterScore", "Điểm tổng kết học kỳ trước (thang 10)", { type: "number", min: 0, max: 10, step: 0.01, inputMode: "decimal" }]
];

export function StudentProfilePanel() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void loadStudentProfile().then(setProfile, (cause) => setError(cause instanceof Error ? cause.message : "Không thể tải hồ sơ.")); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();
    const score = text("previousSemesterScore") === "" ? Number.NaN : Number(text("previousSemesterScore"));
    setError(""); setMessage("");
    if (!text("studentCode") || !text("className") || !text("phone")) return setError("Nhập đủ mã sinh viên, lớp và số điện thoại.");
    if (!(score >= 0 && score <= 10)) return setError("Nhập điểm từ 0 đến 10.");
    setBusy(true);
    try {
      setProfile(await saveStudentProfile({ studentCode: text("studentCode"), className: text("className"), phone: text("phone"), previousSemesterScore: score }));
      setMessage("Đã lưu hồ sơ sinh viên.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể lưu hồ sơ."); } finally { setBusy(false); }
  }

  if (!profile) return error ? <p className="state-message error" role="alert">{error}</p> : <p className="state-message" role="status">Đang tải hồ sơ...</p>;
  return (
    <SectionCard title={profile.fullName} subtitle={profile.unit}>
      {!profile.complete ? <p className="state-message warning" role="status">Hồ sơ chưa đầy đủ: bạn chưa đăng ký hoặc tham gia đề tài được.</p> : null}
      {message ? <p className="state-message success" role="status">{message}</p> : null}
      {error ? <p className="state-message error" role="alert">{error}</p> : null}
      <form className="auth-form" noValidate onSubmit={submit}>
        {FIELDS.map(([name, label, attributes]) => (
          <div className="field" key={name}>
            <label htmlFor={`profile-${name}`}>{label} <span className="required-mark" aria-hidden="true">*</span></label>
            <div className="field-input"><input id={`profile-${name}`} name={name} required defaultValue={profile[name] ?? ""} {...attributes} /></div>
          </div>
        ))}
        <button className="button primary" disabled={busy} type="submit">{busy ? "Đang lưu..." : "Lưu hồ sơ"}</button>
      </form>
    </SectionCard>
  );
}
