import { exportHtmlToWord } from "@/lib/word-export";
import type { ProgramSnapshot } from "@/lib/conferences-api";

const timeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });

export function programTime(value: string) {
  return timeFormat.format(new Date(value));
}

export function programDate(value: string) {
  return dateFormat.format(new Date(value));
}

function text(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Các phiên nhóm theo ngày (giờ Việt Nam), trong ngày xếp theo giờ bắt đầu. */
export function sessionsByDay(snapshot: ProgramSnapshot) {
  const groups = new Map<string, ProgramSnapshot["sessions"]>();
  const ordered = [...snapshot.sessions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  for (const session of ordered) {
    const key = programDate(session.startsAt);
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }
  return [...groups.entries()];
}

function sessionTable(session: ProgramSnapshot["sessions"][number]) {
  const header = [
    `<p style="font-weight: bold;">${session.kind === "plenary" ? "PHIÊN TOÀN THỂ" : "TIỂU BAN"}: ${text(session.name)}</p>`,
    `<p>Thời gian: ${programTime(session.startsAt)} – ${programTime(session.endsAt)}${session.room ? ` · Địa điểm: ${text(session.room)}` : ""}</p>`,
    session.chairName || session.secretaryName ? `<p>${session.chairName ? `Chủ toạ: ${text(session.chairName)}` : ""}${session.chairName && session.secretaryName ? " · " : ""}${session.secretaryName ? `Thư ký: ${text(session.secretaryName)}` : ""}</p>` : ""
  ].join("");
  const rows = session.items.map((item) => {
    const time = `${programTime(item.startsAt)} – ${programTime(item.endsAt)}`;
    if (item.type === "break") return `<tr><td style="text-align: center;">${time}</td><td colspan="2" style="text-align: center; font-style: italic;">${text(item.label)}</td></tr>`;
    return `<tr><td style="text-align: center;">${time}</td><td>${text(item.title)}</td><td>${text(item.speaker)}${item.organization ? `<br/>${text(item.organization)}` : ""}</td></tr>`;
  }).join("");
  return `${header}<table class="border-table"><thead><tr><th style="width: 18%;">Thời gian</th><th>Tên báo cáo</th><th style="width: 32%;">Báo cáo viên</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/** Xuất chương trình chi tiết đã chốt ra tệp Word (.docx). */
export async function exportProgramWord(snapshot: ProgramSnapshot, versionNumber: number) {
  const days = sessionsByDay(snapshot).map(([day, sessions]) => `<p style="font-weight: bold; margin-top: 12pt;">Ngày ${day}</p>${sessions.map(sessionTable).join("")}`).join("");
  const contentHtml = `
    <div style="text-align: center;">
      <p style="font-weight: bold;">${text(snapshot.conference.hostUnitName.toUpperCase())}</p>
      <p style="font-weight: bold; font-size: 14pt; margin-top: 12pt;">CHƯƠNG TRÌNH HỘI NGHỊ</p>
      <p style="font-weight: bold;">${text(snapshot.conference.title)}</p>
      <p>Địa điểm: ${text(snapshot.conference.location)}</p>
    </div>
    ${days}`;
  await exportHtmlToWord({ filename: `Chuong_trinh_${snapshot.conference.code}_v${versionNumber}`, title: `Chương trình ${snapshot.conference.title}`, contentHtml });
}
