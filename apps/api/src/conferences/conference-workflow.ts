/**
 * Hội nghị khoa học: trạng thái và điều kiện chuyển trạng thái.
 * Một bảng duy nhất để mỗi quy tắc chỉ nêu một lần; service và giao diện cùng đọc từ đây.
 */

export const CONFERENCE_STATUS = {
  draft: "draft",
  preparing: "preparing",
  inviting: "inviting",
  submissionClosed: "submission_closed",
  programPublished: "program_published",
  completed: "completed",
  cancelled: "cancelled"
} as const;

export type ConferenceStatus = (typeof CONFERENCE_STATUS)[keyof typeof CONFERENCE_STATUS];

export const CONFERENCE_STATUS_LABELS: Record<ConferenceStatus, string> = {
  draft: "Nháp",
  preparing: "Đang chuẩn bị",
  inviting: "Đang mời, nhận bài",
  submission_closed: "Đã đóng nhận bài",
  program_published: "Đã gửi chương trình",
  completed: "Đã kết thúc",
  cancelled: "Đã huỷ"
};

export const CONFERENCE_LEVELS = ["academy", "faculty", "national", "international"] as const;
export type ConferenceLevel = (typeof CONFERENCE_LEVELS)[number];

/** Hội nghị đã kết thúc hoặc đã huỷ: không còn thao tác nghiệp vụ nào. */
export const CONFERENCE_CLOSED_STATUSES: ConferenceStatus[] = ["completed", "cancelled"];

/** Trạng thái được thêm khách mời và gửi thư (mời, nhắc, thông báo thay đổi). */
export const CONFERENCE_INVITABLE_STATUSES: ConferenceStatus[] = ["preparing", "inviting", "submission_closed", "program_published"];

/** Trạng thái báo cáo viên được nộp bài: còn hạn trong `inviting`, hoặc theo yêu cầu sửa còn hạn đến trước khi kết thúc. */
export const CONFERENCE_SUBMISSION_STATUSES: ConferenceStatus[] = ["inviting", "submission_closed", "program_published"];

/** Trạng thái được lập và chốt chương trình chi tiết: sau khi đóng nhận bài (chốt lại được sau khi đã gửi). */
export const CONFERENCE_PROGRAM_STATUSES: ConferenceStatus[] = ["submission_closed", "program_published"];

/** Trạng thái được tải và gửi kỷ yếu: sau khi có chương trình, kể cả sau khi hội nghị kết thúc. */
export const CONFERENCE_PROCEEDINGS_STATUSES: ConferenceStatus[] = ["program_published", "completed"];

export type ConferenceTransition = "close-submission" | "complete" | "cancel";

export const CONFERENCE_TRANSITIONS: Record<ConferenceTransition, { from: ConferenceStatus[]; to: ConferenceStatus; reasonRequired: boolean }> = {
  "close-submission": { from: ["inviting"], to: "submission_closed", reasonRequired: false },
  complete: { from: ["submission_closed", "program_published"], to: "completed", reasonRequired: false },
  cancel: { from: ["draft", "preparing", "inviting", "submission_closed", "program_published"], to: "cancelled", reasonRequired: true }
};

export const INVITATION_STATUS = { draft: "draft", sent: "sent", accepted: "accepted", declined: "declined", revoked: "revoked" } as const;
export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];
export type InvitationKind = "speaker" | "delegate";

export const PAPER_STATUS = {
  awaitingAbstract: "awaiting_abstract",
  abstractSubmitted: "abstract_submitted",
  fullPaperSubmitted: "full_paper_submitted",
  scheduled: "scheduled",
  withdrawn: "withdrawn"
} as const;
export type PaperStatus = (typeof PAPER_STATUS)[keyof typeof PAPER_STATUS];
export type PaperVersionKind = "abstract" | "full_paper";

/** Báo cáo còn nhận bài và còn rút được (chưa xếp vào chương trình, chưa rút). */
export const PAPER_OPEN_STATUSES: PaperStatus[] = ["awaiting_abstract", "abstract_submitted", "full_paper_submitted"];

export type OpenRevision = { kind: PaperVersionKind; dueAt: Date };

/**
 * Báo cáo viên có được nộp loại bài này lúc `now` không.
 *   - Có yêu cầu sửa cùng loại còn hạn: được nộp (kể cả sau hạn chung, kể cả khi đã đóng nhận bài).
 *   - Nếu không: chỉ khi hội nghị đang `inviting` và còn trong hạn chung.
 *   - Toàn văn cần đã có ít nhất một bản tóm tắt; không có bước chấp nhận tóm tắt.
 * Trả về lý do từ chối (để báo cho người dùng) hoặc null nếu được nộp.
 */
export function submissionBlockReason(input: {
  conferenceStatus: string;
  paperStatus: string;
  kind: PaperVersionKind;
  abstractDeadline: Date;
  fullPaperDeadline: Date;
  hasAbstract: boolean;
  openRevisions: OpenRevision[];
  now?: Date;
}): string | null {
  const now = input.now ?? new Date();
  if (!(CONFERENCE_SUBMISSION_STATUSES as string[]).includes(input.conferenceStatus)) return "Hội nghị không ở giai đoạn nhận bài.";
  if (!(PAPER_OPEN_STATUSES as string[]).includes(input.paperStatus)) return "Báo cáo đã rút hoặc đã được xếp vào chương trình.";
  if (input.kind === "full_paper" && !input.hasAbstract) return "Cần nộp tóm tắt trước khi nộp toàn văn.";
  const revision = input.openRevisions.find((item) => item.kind === input.kind);
  if (revision && revision.dueAt.getTime() >= now.getTime()) return null;
  if (input.conferenceStatus !== "inviting") return "Đã đóng nhận bài.";
  const deadline = input.kind === "abstract" ? input.abstractDeadline : input.fullPaperDeadline;
  if (deadline.getTime() < now.getTime()) return input.kind === "abstract" ? "Đã quá hạn nộp tóm tắt." : "Đã quá hạn nộp toàn văn.";
  return null;
}

/** Trạng thái báo cáo sau khi nộp một bản: nộp tóm tắt không kéo lùi báo cáo đã có toàn văn. */
export function paperStatusAfterSubmit(current: string, kind: PaperVersionKind): PaperStatus {
  if (kind === "full_paper") return PAPER_STATUS.fullPaperSubmitted;
  return current === PAPER_STATUS.fullPaperSubmitted ? PAPER_STATUS.fullPaperSubmitted : PAPER_STATUS.abstractSubmitted;
}
