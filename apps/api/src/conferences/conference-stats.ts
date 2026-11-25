/**
 * Thống kê hội nghị khoa học (hàm thuần, có test). Đầu vào là các hội nghị người xem đã được phép đọc bản quản lý;
 * hàm chỉ đếm, không quyết định quyền.
 *
 * Quy ước đếm:
 *   - Khách mời "đã mời" là lời mời đã gửi thư (không tính chưa gửi và đã huỷ).
 *   - Tỉ lệ nhận lời = nhận lời / đã mời. Tỉ lệ nộp toàn văn = báo cáo đã có toàn văn / báo cáo viên đã nhận lời
 *     (không tính báo cáo đã rút).
 *   - Hội nghị đã huỷ vẫn có trong phân bố theo trạng thái nhưng không tính vào các tỉ lệ và tổng khách mời, bài nộp.
 *   - Năm của hội nghị là năm (giờ Việt Nam) của ngày bắt đầu.
 */

export type StatsInvitation = {
  kind: string;
  status: string;
  unitName: string | null;
  isInternal: boolean;
  paper: { status: string; hasAbstract: boolean; hasFullPaper: boolean } | null;
};

export type StatsSession = { kind: string; name: string; papers: number };

export type StatsConference = {
  id: string;
  code: string;
  title: string;
  level: string;
  status: string;
  startsAt: Date;
  hostUnitId: string;
  hostUnitName: string;
  invitations: StatsInvitation[];
  sessions: StatsSession[];
};

export type StatsFilters = { year?: number; hostUnitId?: string; level?: string };

export type Bucket = { key: string; label: string; count: number };

type Counts = { invited: number; accepted: number; declined: number; awaiting: number; speakers: number; abstracts: number; fullPapers: number; scheduled: number; withdrawn: number };

const OUTSIDE_UNIT = "Ngoài Học viện";

export function vietnamYear(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).getUTCFullYear();
}

function emptyCounts(): Counts {
  return { invited: 0, accepted: 0, declined: 0, awaiting: 0, speakers: 0, abstracts: 0, fullPapers: 0, scheduled: 0, withdrawn: 0 };
}

function countConference(conference: StatsConference): Counts {
  const counts = emptyCounts();
  for (const invitation of conference.invitations) {
    if (invitation.status === "draft" || invitation.status === "revoked") continue;
    counts.invited += 1;
    if (invitation.status === "accepted") counts.accepted += 1;
    if (invitation.status === "declined") counts.declined += 1;
    if (invitation.status === "sent") counts.awaiting += 1;
    const paper = invitation.paper;
    if (invitation.kind !== "speaker" || invitation.status !== "accepted" || !paper) continue;
    if (paper.status === "withdrawn") { counts.withdrawn += 1; continue; }
    counts.speakers += 1;
    if (paper.hasAbstract) counts.abstracts += 1;
    if (paper.hasFullPaper) counts.fullPapers += 1;
    if (paper.status === "scheduled") counts.scheduled += 1;
  }
  return counts;
}

function add(target: Counts, source: Counts) {
  for (const key of Object.keys(target) as Array<keyof Counts>) target[key] += source[key];
}

/** Tỉ lệ phần trăm làm tròn một chữ số; null khi mẫu số bằng 0 (không phải 0%). */
export function rate(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 1000) / 10 : null;
}

function bucketize(entries: Array<{ key: string; label: string }>): Bucket[] {
  const map = new Map<string, Bucket>();
  for (const entry of entries) {
    const bucket = map.get(entry.key) ?? { key: entry.key, label: entry.label, count: 0 };
    bucket.count += 1;
    map.set(entry.key, bucket);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "vi"));
}

export function matchesStatsFilters(conference: StatsConference, filters: StatsFilters) {
  if (filters.year !== undefined && vietnamYear(conference.startsAt) !== filters.year) return false;
  if (filters.hostUnitId && conference.hostUnitId !== filters.hostUnitId) return false;
  if (filters.level && conference.level !== filters.level) return false;
  return true;
}

export function computeConferenceStats(all: StatsConference[], filters: StatsFilters = {}) {
  // Năm, đơn vị, cấp để chọn lọc: lấy từ toàn bộ hội nghị người xem được thấy (chưa lọc).
  const options = {
    years: [...new Set(all.map((conference) => vietnamYear(conference.startsAt)))].sort((a, b) => b - a),
    hostUnits: [...new Map(all.map((conference) => [conference.hostUnitId, { id: conference.hostUnitId, name: conference.hostUnitName }])).values()].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    levels: [...new Set(all.map((conference) => conference.level))].sort()
  };
  const conferences = all.filter((conference) => matchesStatsFilters(conference, filters));
  const active = conferences.filter((conference) => conference.status !== "cancelled");
  const totals = emptyCounts();
  const perConference = conferences.map((conference) => {
    const counts = countConference(conference);
    if (conference.status !== "cancelled") add(totals, counts);
    return {
      id: conference.id, code: conference.code, title: conference.title, level: conference.level, status: conference.status, startsAt: conference.startsAt, hostUnitName: conference.hostUnitName,
      ...counts, sessions: conference.sessions.length,
      acceptanceRate: rate(counts.accepted, counts.invited), fullPaperRate: rate(counts.fullPapers, counts.speakers)
    };
  }).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());

  // Báo cáo viên theo đơn vị: báo cáo viên đã nhận lời, còn báo cáo (người ngoài gom thành "Ngoài Học viện").
  const speakerUnits = active.flatMap((conference) => conference.invitations
    .filter((invitation) => invitation.kind === "speaker" && invitation.status === "accepted" && invitation.paper && invitation.paper.status !== "withdrawn")
    .map((invitation) => {
      const label = invitation.isInternal ? invitation.unitName ?? "Chưa rõ đơn vị" : OUTSIDE_UNIT;
      return { key: label, label };
    }));

  const tracks = active.flatMap((conference) => conference.sessions.map((session) => ({ conferenceId: conference.id, conferenceCode: conference.code, kind: session.kind, name: session.name, papers: session.papers })))
    .sort((a, b) => a.conferenceCode.localeCompare(b.conferenceCode) || b.papers - a.papers);

  return {
    options,
    totals: {
      conferences: conferences.length,
      active: active.length,
      completed: conferences.filter((conference) => conference.status === "completed").length,
      ...totals,
      acceptanceRate: rate(totals.accepted, totals.invited),
      fullPaperRate: rate(totals.fullPapers, totals.speakers),
      scheduledRate: rate(totals.scheduled, totals.speakers)
    },
    byStatus: bucketize(conferences.map((conference) => ({ key: conference.status, label: conference.status }))),
    byLevel: bucketize(conferences.map((conference) => ({ key: conference.level, label: conference.level }))),
    byYear: bucketize(conferences.map((conference) => ({ key: String(vietnamYear(conference.startsAt)), label: String(vietnamYear(conference.startsAt)) }))).sort((a, b) => b.key.localeCompare(a.key)),
    byHostUnit: bucketize(conferences.map((conference) => ({ key: conference.hostUnitId, label: conference.hostUnitName }))),
    speakersByUnit: bucketize(speakerUnits),
    perConference,
    tracks
  };
}

export type ConferenceStats = ReturnType<typeof computeConferenceStats>;
