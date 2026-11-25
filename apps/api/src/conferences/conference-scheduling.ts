/**
 * Xếp lịch chương trình hội nghị (hàm thuần, có test).
 *
 *   - Mỗi phiên có khung giờ do chuyên viên nhập; báo cáo trong phiên xếp lần lượt theo thứ tự, mỗi báo cáo dài
 *     bằng thời lượng tối đa (của phiên, nếu không thì của hội nghị), bỏ qua các khoảng nghỉ.
 *   - Báo cáo chuyên viên đã đặt giờ tay giữ nguyên; các báo cáo khác xếp vào chỗ trống quanh nó.
 *   - Báo cáo không vừa khung giờ vẫn được xếp tiếp sau giờ kết thúc và đánh dấu vượt khung (số phút thiếu):
 *     hệ thống không tự cắt thời lượng.
 *   - Phiên toàn thể không có phiên nào chạy song song; các tiểu ban được song song với nhau.
 * Cùng đầu vào cho cùng kết quả.
 */

export type ScheduleInterval = { startsAt: Date; endsAt: Date };

export type ScheduleSessionInput = {
  id: string;
  kind: "plenary" | "track" | string;
  name: string;
  room: string | null;
  startsAt: Date;
  endsAt: Date;
  slotMinutes: number | null;
  breaks: (ScheduleInterval & { label?: string })[];
  slots: ScheduleSlotInput[];
};

export type ScheduleSlotInput = {
  paperId: string;
  ownerId: string;
  position: number;
  manuallyAdjusted: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

export type ScheduledSlot = {
  paperId: string;
  ownerId: string;
  position: number;
  manuallyAdjusted: boolean;
  startsAt: Date;
  endsAt: Date;
  /** Số phút vượt quá giờ kết thúc của phiên (0 nếu vừa). */
  overflowMinutes: number;
};

export type ScheduleIssue = {
  code: "OVERFLOW" | "PLENARY_OVERLAP" | "ROOM_OVERLAP" | "SPEAKER_OVERLAP" | "MANUAL_OUTSIDE_SESSION" | "MANUAL_OVERLAP" | "PLENARY_SAME_DAY";
  message: string;
  sessionIds: string[];
  paperIds?: string[];
};

export type ScheduleResult = { sessions: { id: string; slots: ScheduledSlot[] }[]; issues: ScheduleIssue[] };

const MINUTE = 60_000;

function overlaps(a: ScheduleInterval, b: ScheduleInterval) {
  return a.startsAt.getTime() < b.endsAt.getTime() && b.startsAt.getTime() < a.endsAt.getTime();
}

/** Ngày theo giờ Việt Nam, để "mỗi ngày tối đa một phiên toàn thể" tính đúng ngày lịch. */
function vietnamDay(date: Date) {
  return new Date(date.getTime() + 7 * 60 * MINUTE).toISOString().slice(0, 10);
}

function clock(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(date);
}

/** Thời điểm sớm nhất ≥ from để đặt một đoạn dài `minutes` không chồng lên các đoạn đã bận. */
function earliestFree(from: number, minutes: number, busy: ScheduleInterval[]) {
  let start = from;
  const sorted = [...busy].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (;;) {
    const end = start + minutes * MINUTE;
    const blocker = sorted.find((item) => item.startsAt.getTime() < end && start < item.endsAt.getTime());
    if (!blocker) return start;
    start = blocker.endsAt.getTime();
  }
}

export function scheduleSession(session: ScheduleSessionInput, defaultSlotMinutes: number): { slots: ScheduledSlot[]; issues: ScheduleIssue[] } {
  const minutes = session.slotMinutes ?? defaultSlotMinutes;
  const issues: ScheduleIssue[] = [];
  const ordered = [...session.slots].sort((a, b) => a.position - b.position || a.paperId.localeCompare(b.paperId));
  const manual = ordered.filter((slot) => slot.manuallyAdjusted && slot.startsAt && slot.endsAt);
  for (const slot of manual) {
    const interval = { startsAt: slot.startsAt!, endsAt: slot.endsAt! };
    if (interval.startsAt < session.startsAt || interval.endsAt > session.endsAt) {
      issues.push({ code: "MANUAL_OUTSIDE_SESSION", message: `Báo cáo đặt giờ tay ${clock(interval.startsAt)}–${clock(interval.endsAt)} nằm ngoài khung giờ phiên ${session.name}.`, sessionIds: [session.id], paperIds: [slot.paperId] });
    }
    const clash = [...session.breaks, ...manual.filter((other) => other !== slot).map((other) => ({ startsAt: other.startsAt!, endsAt: other.endsAt! }))].some((other) => overlaps(interval, other));
    if (clash) issues.push({ code: "MANUAL_OVERLAP", message: `Báo cáo đặt giờ tay ${clock(interval.startsAt)} trùng khoảng nghỉ hoặc báo cáo khác trong phiên ${session.name}.`, sessionIds: [session.id], paperIds: [slot.paperId] });
  }
  const busy: ScheduleInterval[] = [...session.breaks, ...manual.map((slot) => ({ startsAt: slot.startsAt!, endsAt: slot.endsAt! }))];
  let cursor = session.startsAt.getTime();
  const result: ScheduledSlot[] = [];
  for (const slot of ordered) {
    let startsAt: Date;
    let endsAt: Date;
    if (slot.manuallyAdjusted && slot.startsAt && slot.endsAt) {
      startsAt = slot.startsAt;
      endsAt = slot.endsAt;
    } else {
      const start = earliestFree(cursor, minutes, busy);
      startsAt = new Date(start);
      endsAt = new Date(start + minutes * MINUTE);
      busy.push({ startsAt, endsAt });
      cursor = endsAt.getTime();
    }
    const overflowMinutes = Math.max(0, Math.ceil((endsAt.getTime() - session.endsAt.getTime()) / MINUTE));
    result.push({ paperId: slot.paperId, ownerId: slot.ownerId, position: slot.position, manuallyAdjusted: slot.manuallyAdjusted && !!slot.startsAt && !!slot.endsAt, startsAt, endsAt, overflowMinutes });
  }
  const over = result.filter((slot) => slot.overflowMinutes > 0 && !slot.manuallyAdjusted);
  if (over.length) {
    const missing = Math.max(...over.map((slot) => slot.overflowMinutes));
    issues.push({ code: "OVERFLOW", message: `Phiên ${session.name} vượt khung ${missing} phút (${over.length} báo cáo không vừa). Kéo dài phiên, giảm thời lượng mỗi báo cáo hoặc chuyển bớt báo cáo.`, sessionIds: [session.id], paperIds: over.map((slot) => slot.paperId) });
  }
  return { slots: result, issues };
}

/** Xếp toàn bộ chương trình và kiểm tra ràng buộc giữa các phiên. */
export function scheduleProgram(sessions: ScheduleSessionInput[], defaultSlotMinutes: number): ScheduleResult {
  const issues: ScheduleIssue[] = [];
  const scheduled = sessions.map((session) => {
    const result = scheduleSession(session, defaultSlotMinutes);
    issues.push(...result.issues);
    return { session, slots: result.slots };
  });

  const plenaries = sessions.filter((session) => session.kind === "plenary");
  const tracks = sessions.filter((session) => session.kind !== "plenary");
  // Phiên toàn thể: mọi người cùng dự, nên không phiên nào khác được chạy cùng lúc (kể cả phiên toàn thể khác).
  for (const plenary of plenaries) {
    for (const other of sessions) {
      if (other === plenary || (other.kind === "plenary" && other.id < plenary.id)) continue;
      if (overlaps(plenary, other)) issues.push({ code: "PLENARY_OVERLAP", message: `${other.name} trùng giờ với phiên toàn thể ${plenary.name}.`, sessionIds: [plenary.id, other.id] });
    }
  }
  const byDay = new Map<string, ScheduleSessionInput[]>();
  for (const plenary of plenaries) byDay.set(vietnamDay(plenary.startsAt), [...(byDay.get(vietnamDay(plenary.startsAt)) ?? []), plenary]);
  for (const [day, items] of byDay) if (items.length > 1) issues.push({ code: "PLENARY_SAME_DAY", message: `Ngày ${day.split("-").reverse().join("/")} có ${items.length} phiên toàn thể; mỗi ngày tối đa một phiên.`, sessionIds: items.map((item) => item.id) });

  for (let i = 0; i < tracks.length; i += 1) {
    for (let j = i + 1; j < tracks.length; j += 1) {
      const a = tracks[i], b = tracks[j];
      if (a.room && b.room && a.room.trim().toLowerCase() === b.room.trim().toLowerCase() && overlaps(a, b)) issues.push({ code: "ROOM_OVERLAP", message: `${a.name} và ${b.name} cùng dùng phòng ${a.room} trong cùng thời gian.`, sessionIds: [a.id, b.id] });
    }
  }

  // Một người có báo cáo ở hai phiên chạy cùng lúc.
  const all = scheduled.flatMap(({ session, slots }) => slots.map((slot) => ({ session, slot })));
  for (let i = 0; i < all.length; i += 1) {
    for (let j = i + 1; j < all.length; j += 1) {
      const a = all[i], b = all[j];
      if (a.session.id === b.session.id || a.slot.ownerId !== b.slot.ownerId) continue;
      if (overlaps(a.slot, b.slot)) issues.push({ code: "SPEAKER_OVERLAP", message: `Một báo cáo viên có báo cáo trùng giờ ở ${a.session.name} và ${b.session.name}.`, sessionIds: [a.session.id, b.session.id], paperIds: [a.slot.paperId, b.slot.paperId] });
    }
  }
  return { sessions: scheduled.map(({ session, slots }) => ({ id: session.id, slots })), issues };
}
