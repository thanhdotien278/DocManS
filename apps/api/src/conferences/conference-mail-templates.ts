import { escapeHtml } from "../notifications/notification-events.js";
import type { MailingKind } from "./conferences.dto.js";

/**
 * Mẫu thư hội nghị (hàm thuần, có test). Thư mời chỉ ghi thời gian tổ chức và địa điểm; chương trình chi tiết gửi
 * sau khi xếp lịch (Đợt 2). Thư cho báo cáo viên ghi thêm hạn nộp.
 */

export type ConferenceMailFacts = {
  title: string;
  location: string;
  startsAt: Date;
  endsAt: Date;
  responseDeadline: Date | null;
  abstractDeadline: Date;
  fullPaperDeadline: Date;
  hostUnitName: string;
};

export type ConferenceMailInput = {
  kind: MailingKind;
  conference: ConferenceMailFacts;
  recipient: { fullName: string; academicTitle: string | null; kind: "speaker" | "delegate" };
  subject?: string;
  message?: string;
  /** Đường link tuyệt đối để trả lời thư mời (chỉ thư email gửi người chưa có tài khoản). */
  responseUrl?: string;
  /** Thư chương trình: tóm tắt các phiên (tên, giờ, phòng). */
  programLines?: string[];
};

const KIND_LABEL: Record<MailingKind, string> = {
  invitation: "Thư mời",
  reminder: "Thư nhắc",
  change_notice: "Thông báo thay đổi",
  program: "Chương trình hội nghị",
  proceedings: "Kỷ yếu hội nghị"
};

export function formatVietnamDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatVietnamTime(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function formatVietnamDateTime(date: Date) {
  return `${formatVietnamTime(date)} ngày ${formatVietnamDate(date)}`;
}

function period(conference: ConferenceMailFacts) {
  const start = formatVietnamDate(conference.startsAt);
  const end = formatVietnamDate(conference.endsAt);
  return start === end ? start : `${start} – ${end}`;
}

export function conferenceMailSubject(input: Pick<ConferenceMailInput, "kind" | "conference" | "subject">) {
  return input.subject ?? `${KIND_LABEL[input.kind]}: ${input.conference.title}`;
}

/** Nội dung thư dạng các dòng văn bản; dùng chung cho thông báo trong hệ thống và email. */
export function conferenceMailLines(input: ConferenceMailInput) {
  const { conference, recipient } = input;
  const name = [recipient.academicTitle, recipient.fullName].filter(Boolean).join(" ");
  const lines = [`Kính gửi ${name},`, ""];
  if (input.kind === "invitation") {
    lines.push(`${conference.hostUnitName} trân trọng kính mời ${recipient.kind === "speaker" ? "đồng chí tham dự và trình bày báo cáo tham luận tại" : "đồng chí tới dự"} ${conference.title}.`);
  } else if (input.kind === "reminder") {
    lines.push(`Xin nhắc đồng chí về ${conference.title}.`);
  } else if (input.kind === "change_notice") {
    lines.push(`${conference.title} có thay đổi như sau:`);
  } else if (input.kind === "program") {
    lines.push(`${conference.hostUnitName} trân trọng gửi đồng chí chương trình chi tiết của ${conference.title}.`);
  } else {
    lines.push(`${conference.hostUnitName} trân trọng gửi đồng chí kỷ yếu ${conference.title}.`);
  }
  if (input.message) lines.push("", input.message);
  lines.push("", `Thời gian: ${period(conference)}`, `Địa điểm: ${conference.location}`);
  if (input.kind === "program" || input.kind === "proceedings") {
    if (input.programLines?.length) lines.push("", ...input.programLines);
    lines.push("", `Xem ${input.kind === "program" ? "chương trình chi tiết và tải bản Word" : "và tải kỷ yếu"} tại mục Hội nghị của tôi trên hệ thống DocManS.`);
    return lines;
  }
  if (recipient.kind === "speaker") {
    lines.push(`Hạn nộp tóm tắt: ${formatVietnamDate(conference.abstractDeadline)}`, `Hạn nộp toàn văn: ${formatVietnamDate(conference.fullPaperDeadline)}`);
  }
  if (conference.responseDeadline && input.kind !== "change_notice") lines.push(`Đề nghị trả lời trước ngày: ${formatVietnamDate(conference.responseDeadline)}`);
  if (input.kind === "invitation") lines.push("", "Chương trình chi tiết sẽ được gửi sau khi các tiểu ban sắp xếp xong.");
  return lines;
}

export function renderConferenceMailText(input: ConferenceMailInput) {
  const lines = conferenceMailLines(input);
  if (input.responseUrl) lines.push("", `Nhận lời hoặc từ chối tại: ${input.responseUrl}`, "Không chia sẻ đường link này.");
  return lines.join("\n");
}

export function renderConferenceMailHtml(input: ConferenceMailInput) {
  const body = conferenceMailLines(input).map((line) => (line ? `<p style="margin: 0 0 6px 0;">${escapeHtml(line)}</p>` : "<br/>")).join("");
  const button = input.responseUrl
    ? `<p style="margin-top: 16px;"><a href="${escapeHtml(input.responseUrl)}" style="display: inline-block; padding: 10px 15px; background-color: #1f6f43; color: white; text-decoration: none; border-radius: 4px;">Nhận lời / Từ chối</a></p><p style="font-size: 12px; color: #7f8c8d;">Không chia sẻ đường link này.</p>`
    : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">${escapeHtml(conferenceMailSubject(input))}</h2>
      ${body}
      ${button}
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 20px;" />
      <p style="font-size: 12px; color: #7f8c8d;">Hệ thống Quản lý Nghiên cứu Khoa học (DocManS)<br/>Học viện Quân y</p>
    </div>`;
}
