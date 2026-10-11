"use client";

import type { Participation, Publication } from "@/lib/researcher-profiles-api";

export const historyActions: Record<string, string> = { CREATE: "Tạo hồ sơ", UPDATE: "Cập nhật hồ sơ", SELF_UPDATE: "Nhà nghiên cứu cập nhật", ACTIVATE: "Kích hoạt", DEACTIVATE: "Ngừng hoạt động", ACCOUNT_CREATED: "Tạo và liên kết tài khoản", ACCOUNT_LINKED: "Liên kết tài khoản", ACCOUNT_UNLINKED: "Hủy liên kết", ACCOUNT_RESET: "Gửi lại email kích hoạt" };
const levels: Record<string, string> = { ACADEMY_INSTITUTIONAL: "Cấp Học viện / cơ sở", MINISTRY: "Cấp Bộ", OTHER: "Cấp khác" };

export function HistoryFacts({ label, facts }: { label: string; facts?: Record<string, unknown> }) {
  if (!facts) return null;
  const names: Record<string, string> = { fullName: "Họ tên", title: "Chức danh", position: "Chức vụ", militaryRank: "Quân hàm", contactEmail: "Email", contactPhone: "Điện thoại", contactNote: "Ghi chú", externalAffiliation: "Đơn vị công tác", linkedUserId: "Tài khoản liên kết", status: "Trạng thái", profileType: "Loại hồ sơ" };
  const changes = Array.isArray(facts.cvChanges) ? facts.cvChanges.filter((item): item is { section: string; field: string; changed: true } => !!item && typeof item === "object" && typeof (item as { section?: unknown }).section === "string" && typeof (item as { field?: unknown }).field === "string" && (item as { changed?: unknown }).changed === true) : [];
  return <div><strong>{label}</strong><dl>{Object.entries(names).filter(([key]) => facts[key] != null).map(([key, name]) => <div key={key}><dt>{name}</dt><dd>{String(facts[key])}</dd></div>)}</dl>{changes.length ? <><p>Thay đổi lý lịch khoa học:</p><ul>{changes.map((change, index) => <li key={`${change.section}.${change.field}.${index}`}>{change.section}.{change.field}</li>)}</ul></> : null}{Array.isArray(facts.publications) ? <ul>{(facts.publications as Publication[]).map((item, i) => <li key={i}>{item.title} · {item.venue} · {item.publicationYear} · {item.authors} · {item.doi} · {item.status} · {item.notes}</li>)}</ul> : null}{Array.isArray(facts.participations) ? <ul>{(facts.participations as Participation[]).map((item, i) => <li key={i}>{item.projectTitle} · {item.participationRole} · {levels[item.level]} · {item.startsOn?.slice(0, 10)} – {item.endsOn?.slice(0, 10)} · {item.status} · {item.notes}</li>)}</ul> : null}</div>;
}
