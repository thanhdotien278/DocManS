import { BadRequestException, type PipeTransform } from "@nestjs/common";
import { readDate, readText } from "../proposals-shared/proposal-validation.js";

export const DOCUMENT_PURPOSES = ["REGISTRATION_FORM", "FULL_REPORT", "SUMMARY_REPORT"] as const;
export const AWARD_EVIDENCE_PURPOSE = "AWARD_EVIDENCE";
export const AWARDS = ["FIRST", "SECOND", "THIRD", "ENCOURAGEMENT"] as const;
export const MAX_MEMBERS_CEILING = 5;

export type DocumentPurpose = (typeof DOCUMENT_PURPOSES)[number];
export type TopicFilePurpose = DocumentPurpose | typeof AWARD_EVIDENCE_PURPOSE;
export type PeriodDto = { year: number; title: string; submissionDeadline: Date; maxMembers: number };
export type UpdatePeriodDto = Partial<Omit<PeriodDto, "year">> & { responsibleOfficerUserId?: string };
export type TopicDto = { title: string; summary: string | null; advisorName: string; advisorUnit: string };
export type StudentProfileDto = { studentCode: string; className: string; phone: string; previousSemesterScore: number };
export type CreateTopicDto = TopicDto & { periodId: string };

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ message: "Dữ liệu không hợp lệ." });
  return value as Record<string, unknown>;
}

function integer(value: unknown, min: number, max: number, message: string) {
  const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
  if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed < min || parsed > max) throw new BadRequestException({ message });
  return parsed;
}

const maxMembers = (value: unknown) => integer(value, 1, MAX_MEMBERS_CEILING, `Số thành viên tối đa phải từ 1 đến ${MAX_MEMBERS_CEILING} (tính cả Trưởng nhóm).`);

function topicFields(input: Record<string, unknown>): TopicDto {
  const summary = input.summary;
  return {
    title: readText(input.title, "Tên đề tài", 500),
    summary: typeof summary === "string" && summary.trim() ? readText(summary, "Tóm tắt", 4000) : null,
    advisorName: readText(input.advisorName, "Giảng viên hướng dẫn", 160),
    advisorUnit: readText(input.advisorUnit, "Đơn vị giảng viên hướng dẫn", 240)
  };
}

export const createPeriodPipe: PipeTransform<unknown, PeriodDto> = {
  transform(value) {
    const input = record(value);
    return {
      year: integer(input.year, 2000, 2100, "Năm của đợt không hợp lệ."),
      title: readText(input.title, "Tên đợt", 300),
      submissionDeadline: readDate(input.submissionDeadline, "Hạn cuối"),
      maxMembers: maxMembers(input.maxMembers)
    };
  }
};

export const updatePeriodPipe: PipeTransform<unknown, UpdatePeriodDto> = {
  transform(value) {
    const input = record(value);
    return {
      title: input.title === undefined ? undefined : readText(input.title, "Tên đợt", 300),
      submissionDeadline: input.submissionDeadline === undefined ? undefined : readDate(input.submissionDeadline, "Hạn cuối"),
      maxMembers: input.maxMembers === undefined ? undefined : maxMembers(input.maxMembers),
      responsibleOfficerUserId: input.responsibleOfficerUserId === undefined ? undefined : readText(input.responsibleOfficerUserId, "Chuyên viên phụ trách", 80)
    };
  }
};

export const createTopicPipe: PipeTransform<unknown, CreateTopicDto> = {
  transform(value) {
    const input = record(value);
    return { periodId: readText(input.periodId, "Đợt", 80), ...topicFields(input) };
  }
};

export const updateTopicPipe: PipeTransform<unknown, TopicDto> = { transform: (value) => topicFields(record(value)) };

/** Email hoặc tên đăng nhập của sinh viên được thêm vào nhóm. */
export const memberPipe: PipeTransform<unknown, { identifier: string }> = {
  transform: (value) => ({ identifier: readText(record(value).identifier, "Email hoặc tên đăng nhập", 254).toLowerCase() })
};

export const rejectTopicPipe: PipeTransform<unknown, { reason: string }> = {
  transform: (value) => ({ reason: readText(record(value).reason, "Lý do từ chối", 1000) })
};

/** null = bỏ hạn riêng, quay về hạn chung của đợt. */
export const topicDeadlinePipe: PipeTransform<unknown, { deadlineOverride: Date | null }> = {
  transform(value) {
    const deadline = record(value).deadlineOverride;
    return { deadlineOverride: deadline === null ? null : readDate(deadline, "Hạn riêng") };
  }
};

export const closeTopicPipe: PipeTransform<unknown, { score: number; award: string | null }> = {
  transform(value) {
    const input = record(value);
    const score = input.score;
    if (typeof score !== "number" || !(score >= 0 && score <= 100) || score !== Number(score.toFixed(2))) throw new BadRequestException({ message: "Điểm phải từ 0 đến 100, tối đa 2 chữ số thập phân." });
    const award = input.award ?? null;
    if (award !== null && !(AWARDS as readonly unknown[]).includes(award)) throw new BadRequestException({ message: "Giải thưởng không hợp lệ." });
    return { score, award: award as string | null };
  }
};

export const documentPurposePipe: PipeTransform<unknown, DocumentPurpose> = {
  transform(value) {
    const purpose = record(value).purpose;
    if (!(DOCUMENT_PURPOSES as readonly unknown[]).includes(purpose)) throw new BadRequestException({ message: "Loại văn bản không hợp lệ." });
    return purpose as DocumentPurpose;
  }
};

export const topicFilePurposePipe: PipeTransform<unknown, TopicFilePurpose> = {
  transform(value) {
    const purpose = record(value).purpose;
    return purpose === AWARD_EVIDENCE_PURPOSE ? AWARD_EVIDENCE_PURPOSE : documentPurposePipe.transform(value, { type: "body" });
  }
};

/** Hồ sơ sinh viên: đủ cả bốn trường mới lưu được, nên có hàng StudentProfile nghĩa là hồ sơ đã đầy đủ. */
export const studentProfilePipe: PipeTransform<unknown, StudentProfileDto> = {
  transform(value) {
    const input = record(value);
    const studentCode = readText(input.studentCode, "Mã sinh viên", 32).toUpperCase();
    if (!/^[A-Z0-9._-]+$/.test(studentCode)) throw new BadRequestException({ message: "Mã sinh viên chỉ gồm chữ, số và các dấu . _ -" });
    const phone = readText(input.phone, "Số điện thoại", 20);
    if (!/^\+?[0-9 ]{8,20}$/.test(phone)) throw new BadRequestException({ message: "Số điện thoại không hợp lệ." });
    const score = input.previousSemesterScore;
    if (typeof score !== "number" || !(score >= 0 && score <= 10) || score !== Number(score.toFixed(2))) throw new BadRequestException({ message: "Điểm tổng kết học kỳ trước phải từ 0 đến 10, tối đa 2 chữ số thập phân." });
    return { studentCode, className: readText(input.className, "Lớp / Khoá", 80), phone, previousSemesterScore: score };
  }
};
