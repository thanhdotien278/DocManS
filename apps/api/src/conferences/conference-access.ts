import type { SafeUserContext } from "../auth/auth.types.js";
import {
  getOrganizationScopeIds,
  isAcademyLeadership,
  isResearchBoardHead,
  isResearchManagementDeputyHead,
  isResearchManagementHead,
  isResearchManagementStaff
} from "../proposals-shared/proposal-access.js";
import { CONFERENCE_CLOSED_STATUSES, CONFERENCE_INVITABLE_STATUSES, CONFERENCE_PROCEEDINGS_STATUSES, CONFERENCE_PROGRAM_STATUSES, CONFERENCE_TRANSITIONS, type ConferenceStatus, type ConferenceTransition } from "./conference-workflow.js";

/**
 * Phân quyền hội nghị khoa học (hàm thuần, có test).
 *
 *   - Trưởng phòng KHQS: tạo hội nghị cho đơn vị trong phạm vi của mình, giao/giao lại/thu hồi chuyên viên phụ
 *     trách, sửa thông tin, huỷ; xem toàn bộ hội nghị trong phạm vi.
 *   - Chuyên viên phụ trách (một người còn hiệu lực): khách mời, gửi thư, theo dõi và yêu cầu sửa bài, đóng nhận bài,
 *     lập và chốt chương trình chi tiết (sau khi đóng nhận bài), tải và gửi kỷ yếu (cả sau khi kết thúc), kết thúc, huỷ. Chuyên viên khác không xử lý hội nghị không được giao.
 *   - Phó phòng, Trưởng ban QLKH: xem trong phạm vi. Ban giám đốc: xem mọi hội nghị không còn là nháp.
 *   - Khách mời (đã gửi thư hoặc đã nhận lời) có tài khoản: chỉ thông tin chung, lời mời và báo cáo của mình.
 *   - Tách nhiệm vụ: chuyên viên phụ trách không đồng thời là khách mời của chính hội nghị đó (kiểm tra cả hai chiều
 *     trong service).
 */

export type ConferenceFacts = {
  status: ConferenceStatus | string;
  hostOrganizationUnitId: string;
  createdById: string;
  activeOfficerId: string | null;
};

export type ConferenceAction =
  | "edit"
  | "officer.assign"
  | "invitation.manage"
  | "mailing.send"
  | "paper.review"
  | "export"
  | "program.manage"
  | "proceedings.manage"
  | ConferenceTransition;

/** Vai trò được giao làm chuyên viên phụ trách hội nghị. */
export const CONFERENCE_OFFICER_ROLES = ["RESEARCH_MANAGEMENT_STAFF"];

function inScope(actor: SafeUserContext, conference: ConferenceFacts) {
  return getOrganizationScopeIds(actor).includes(conference.hostOrganizationUnitId);
}

function isClosed(conference: ConferenceFacts) {
  return (CONFERENCE_CLOSED_STATUSES as string[]).includes(conference.status);
}

/** Trưởng phòng tạo hội nghị cho đơn vị chủ trì thuộc phạm vi của mình. */
export function canCreateConference(actor: SafeUserContext, hostOrganizationUnitId?: string) {
  if (!isResearchManagementHead(actor)) return false;
  return hostOrganizationUnitId === undefined ? getOrganizationScopeIds(actor).length > 0 : getOrganizationScopeIds(actor).includes(hostOrganizationUnitId);
}

/** Trưởng phòng chịu trách nhiệm hội nghị: trong phạm vi đơn vị chủ trì, hoặc là người tạo. */
export function isConferenceHead(actor: SafeUserContext, conference: ConferenceFacts) {
  return isResearchManagementHead(actor) && (inScope(actor, conference) || conference.createdById === actor.id);
}

/** Chuyên viên phụ trách còn hiệu lực, và tài khoản vẫn giữ vai trò chuyên viên. */
export function isConferenceOfficer(actor: SafeUserContext, conference: ConferenceFacts) {
  return !!conference.activeOfficerId && conference.activeOfficerId === actor.id && isResearchManagementStaff(actor);
}

/** Xem toàn bộ hội nghị để theo dõi (không thao tác). Nháp chỉ Trưởng phòng thấy. */
export function canOverseeConference(actor: SafeUserContext, conference: ConferenceFacts) {
  if (isConferenceHead(actor, conference)) return true;
  if (conference.status === "draft") return false;
  if ((isResearchManagementDeputyHead(actor) || isResearchBoardHead(actor)) && inScope(actor, conference)) return true;
  return isAcademyLeadership(actor);
}

/** Đọc bản quản lý (mọi khách mời, mọi báo cáo, thư đã gửi, lịch sử). */
export function canReadConferenceManagement(actor: SafeUserContext, conference: ConferenceFacts) {
  return isConferenceOfficer(actor, conference) || canOverseeConference(actor, conference);
}

export type ParticipantInvitationFacts = { userId: string | null; status: string };

/** Khách mời xem được hội nghị khi thư đã gửi tới mình (chờ trả lời) hoặc mình đã nhận lời. */
export function isConferenceParticipant(actor: SafeUserContext, invitation: ParticipantInvitationFacts | null | undefined) {
  return !!invitation && invitation.userId === actor.id && (invitation.status === "sent" || invitation.status === "accepted");
}

export function canConference(actor: SafeUserContext, conference: ConferenceFacts, action: ConferenceAction) {
  const head = isConferenceHead(actor, conference);
  const officer = isConferenceOfficer(actor, conference);
  switch (action) {
    case "edit":
      return (head || officer) && !isClosed(conference);
    case "officer.assign":
      return head && !isClosed(conference);
    case "invitation.manage":
    case "mailing.send":
      return officer && (CONFERENCE_INVITABLE_STATUSES as string[]).includes(conference.status);
    case "paper.review":
      return officer && !isClosed(conference);
    case "export":
      return canReadConferenceManagement(actor, conference);
    case "program.manage":
      return officer && (CONFERENCE_PROGRAM_STATUSES as string[]).includes(conference.status);
    case "proceedings.manage":
      return officer && (CONFERENCE_PROCEEDINGS_STATUSES as string[]).includes(conference.status);
    case "close-submission":
    case "complete":
      return officer && (CONFERENCE_TRANSITIONS[action].from as string[]).includes(conference.status);
    case "cancel":
      return (head || officer) && (CONFERENCE_TRANSITIONS.cancel.from as string[]).includes(conference.status);
    default:
      return false;
  }
}

const ALL_ACTIONS: ConferenceAction[] = ["edit", "officer.assign", "invitation.manage", "mailing.send", "paper.review", "export", "program.manage", "proceedings.manage", "close-submission", "complete", "cancel"];

export function conferenceActions(actor: SafeUserContext, conference: ConferenceFacts) {
  return ALL_ACTIONS.filter((action) => canConference(actor, conference, action));
}

/**
 * Điều kiện lọc thô ở cơ sở dữ liệu cho danh sách quản lý; kết quả vẫn qua `canReadConferenceManagement`.
 * Ban giám đốc xem mọi hội nghị, nên không cần lọc theo đơn vị.
 */
export function conferenceManagementFilter(actor: SafeUserContext) {
  if (isAcademyLeadership(actor)) return { status: { not: "draft" } };
  const or: Record<string, unknown>[] = [];
  const scopes = getOrganizationScopeIds(actor);
  if ((isResearchManagementHead(actor) || isResearchManagementDeputyHead(actor) || isResearchBoardHead(actor)) && scopes.length) or.push({ hostOrganizationUnitId: { in: scopes } });
  if (isResearchManagementHead(actor)) or.push({ createdById: actor.id });
  if (isResearchManagementStaff(actor)) or.push({ officers: { some: { userId: actor.id, revokedAt: null } } });
  return or.length ? { OR: or } : null;
}

/** Báo cáo: tác giả chính tự nộp, nộp lại, rút; chuyên viên phụ trách huỷ báo cáo (có lý do). */
export function isPaperOwner(actor: SafeUserContext, paper: { ownerId: string }) {
  return paper.ownerId === actor.id;
}
