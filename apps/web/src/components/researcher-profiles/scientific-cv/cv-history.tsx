"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { profileRequest, type Participation, type ProfileHistory, type Publication } from "@/lib/researcher-profiles-api";

export const historyActions: Record<string, string> = { CREATE: "Tạo hồ sơ", UPDATE: "Cập nhật hồ sơ", SELF_UPDATE: "Nhà nghiên cứu cập nhật", ACTIVATE: "Kích hoạt", DEACTIVATE: "Ngừng hoạt động", ACCOUNT_CREATED: "Tạo và liên kết tài khoản", ACCOUNT_LINKED: "Liên kết tài khoản", ACCOUNT_UNLINKED: "Hủy liên kết", ACCOUNT_RESET: "Gửi lại email kích hoạt" };
const levels: Record<string, string> = { ACADEMY_INSTITUTIONAL: "Cấp Học viện / cơ sở", MINISTRY: "Cấp Bộ", OTHER: "Cấp khác" };
const names: Record<string, string> = { fullName: "Họ tên", title: "Chức danh", position: "Chức vụ", militaryRank: "Quân hàm", contactEmail: "Email", contactPhone: "Điện thoại", contactNote: "Ghi chú", externalAffiliation: "Đơn vị công tác", linkedUserId: "Tài khoản liên kết", status: "Trạng thái", profileType: "Loại hồ sơ" };
const profileFields: Record<string, string> = { ...names, managementOrganizationUnitId: "Đơn vị quản lý", academicRankCatalogItemId: "Học hàm", academicDegreeCatalogItemId: "Học vị", researchFieldIds: "Lĩnh vực nghiên cứu", expertiseKeywordKeys: "Từ khóa chuyên môn" };

// Labels for the redacted {section, field, changed} markers the API writes; values are never in the facts, so none are shown.
const personalInfoLabels: Record<string, string> = { gender: "Giới tính", birthDate: "Ngày sinh", birthPlace: "Nơi sinh", nationality: "Quốc gia/Quốc tịch", englishAcademicTitle: "Học hàm, học vị (Tiếng Anh)", contactAddress: "Địa chỉ liên hệ", organization: "Đơn vị quản lý / Đơn vị công tác", languages: "Ngoại ngữ", otherResearchFields: "Lĩnh vực nghiên cứu khác" };
const sensitiveLabels: Record<string, string> = { avatarUrl: "Ảnh chân dung", idNumber: "Số CCCD / Hộ chiếu", idIssueDate: "Ngày cấp CCCD / Hộ chiếu", idIssuePlace: "Nơi cấp CCCD / Hộ chiếu", bankAccount: "Số tài khoản", bankName: "Tên ngân hàng", bankBranch: "Chi nhánh ngân hàng", smartCaSerial: "Tài khoản SmartCA / Serial chứng thư số", shareDataAgreement: "Đồng ý chia sẻ dữ liệu" };
const sectionLabels: Record<string, string> = { educationHistory: "2. Quá trình đào tạo", workHistory: "3. Quá trình công tác & Kinh nghiệm chuyên môn", researchExperience: "4. Kinh nghiệm & Thành tích nghiên cứu — sở hữu trí tuệ, giải thưởng, đề tài/dự án" };

function cvChangeLabel({ section, field }: { section: string; field: string }) {
  if (section === "personalInfo" && sensitiveLabels[field]) return `1. Thông tin chung — ${sensitiveLabels[field]}: đã thay đổi, giá trị được ẩn`;
  if (section === "personalInfo") return `1. Thông tin chung — ${personalInfoLabels[field] ?? field}`;
  if (section === "curriculumVitae" && field === "note") return "1. Thông tin chung — Ghi chú hồ sơ";
  return sectionLabels[section] ?? `${section}.${field}`;
}

/** Section-level summary of one history entry: profile fields, CV markers and publications that differ. */
function historyChangeSummary(before?: Record<string, unknown>, after?: Record<string, unknown>) {
  if (!before || !after) return [];
  // Older entries may lack a key on one side; that is unknown, not a change. Row timestamps change on every save, so they are ignored.
  const comparable = (value: unknown) => JSON.stringify(value, (key, item) => ["createdAt", "updatedAt", "updatedById"].includes(key) ? undefined : item);
  const differs = (key: string) => key in before && key in after && comparable(before[key]) !== comparable(after[key]);
  const summary = Object.entries(profileFields).filter(([key]) => differs(key)).map(([, label]) => label);
  const changes = Array.isArray(after.cvChanges) ? after.cvChanges.filter((item): item is { section: string; field: string; changed: true } => !!item && typeof item === "object" && typeof (item as { section?: unknown }).section === "string" && typeof (item as { field?: unknown }).field === "string" && (item as { changed?: unknown }).changed === true) : [];
  for (const label of changes.map(cvChangeLabel)) if (!summary.includes(label)) summary.push(label);
  // Publications live in their own table, so the API writes no cvChanges marker for them.
  if (differs("publications")) summary.push("4. Kinh nghiệm & Thành tích nghiên cứu — Công bố khoa học");
  if (differs("participations")) summary.push("Quá trình tham gia nghiên cứu");
  return summary;
}

export function HistoryChanges({ before, after }: { before?: Record<string, unknown>; after?: Record<string, unknown> }) {
  const summary = historyChangeSummary(before, after);
  return summary.length ? <><p>Nội dung thay đổi:</p><ul>{summary.map((label) => <li key={label}>{label}</li>)}</ul></> : null;
}

export function HistoryFacts({ label, facts }: { label: string; facts?: Record<string, unknown> }) {
  if (!facts) return null;
  return <div><strong>{label}</strong><dl>{Object.entries(names).filter(([key]) => facts[key] != null).map(([key, name]) => <div key={key}><dt>{name}</dt><dd>{String(facts[key])}</dd></div>)}</dl>{Array.isArray(facts.publications) ? <ul>{(facts.publications as Publication[]).map((item, i) => <li key={i}>{item.title} · {item.venue} · {item.publicationYear} · {item.authors} · {item.doi} · {item.status} · {item.notes}</li>)}</ul> : null}{Array.isArray(facts.participations) ? <ul>{(facts.participations as Participation[]).map((item, i) => <li key={i}>{item.projectTitle} · {item.participationRole} · {levels[item.level]} · {item.startsOn?.slice(0, 10)} – {item.endsOn?.slice(0, 10)} · {item.status} · {item.notes}</li>)}</ul> : null}</div>;
}

/** Read-only right-side Drawer listing the profile's change history as section-level summaries. */
export function CvHistoryDrawer({ profileId, onClose }: { profileId: string; onClose: () => void }) {
  const [history, setHistory] = useState<ProfileHistory[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true; // drop a late response after the Drawer closed or the profile changed
    profileRequest<{ history: ProfileHistory[] }>(`/${profileId}/history`)
      .then((result) => { if (current) setHistory(result.history); })
      .catch((cause) => { if (current) setError(cause instanceof Error ? cause.message : "Không thể tải lịch sử thay đổi."); });
    return () => { current = false; };
  }, [profileId]);

  return <Dialog className="form-dialog cv-drawer-dialog" label="Lịch sử thay đổi" onClose={onClose}>
    <div className="section-card">
      <div className="section-header">
        <h3>Lịch sử thay đổi</h3>
        <button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}><X size={16} aria-hidden="true" /></button>
      </div>
      {error ? <p className="state-message error" role="alert">{error}</p> : null}
      {!history && !error ? <p role="status">Đang tải lịch sử thay đổi…</p> : null}
      {history?.length === 0 ? <p>Chưa có lịch sử thay đổi.</p> : null}
      {history?.length ? <ul className="cv-history-list">{history.map((item) => <li key={item.id}>
        <strong>{new Date(item.createdAt).toLocaleString("vi-VN")} · {historyActions[item.action] ?? item.action}</strong>
        {item.reason ? <p>{item.reason}</p> : null}
        <HistoryChanges before={item.beforeFacts} after={item.afterFacts} />
      </li>)}</ul> : null}
    </div>
  </Dialog>;
}
