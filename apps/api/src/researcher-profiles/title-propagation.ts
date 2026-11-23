import type { Prisma } from "@prisma/client";
import { formatResearcherDisplayName } from "./researcher-display-name.js";

/**
 * Đổi họ tên, quân hàm, học hàm, học vị trong lý lịch khoa học thì các danh sách ĐANG DÙNG đã chép tên người đó đổi
 * theo; bằng chứng đã nộp, đã trình, đã ký, đã phát hành giữ nguyên tên tại thời điểm đó (CONTEXT.md, bất biến 5).
 *
 * Trong DocManS:
 *   - Hội đồng đánh giá và hội đồng nghiệm thu lấy tên qua quan hệ với bảng `users` nên tự phản ánh `User.displayName`.
 *   - Thành viên hồ sơ đề xuất (`proposal_members`) và đề tài (`approved_project_members`) đang `ACTIVE` là danh sách
 *     sống cần cập nhật theo; dòng đã `ENDED`, bản nộp `proposal_submission_events` và `scopeSnapshot` giữ nguyên.
 */
export type TitlePropagationResult = {
  proposalMembers: number;
  projectMembers: number;
};

export async function propagateScientistTitles(tx: Prisma.TransactionClient, profileId: string): Promise<TitlePropagationResult> {
  const result: TitlePropagationResult = { proposalMembers: 0, projectMembers: 0 };
  const profile = await tx.researcherProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      fullName: true,
      militaryRank: true,
      linkedUserId: true,
      academicRankCatalogItem: { select: { code: true, name: true } },
      academicDegreeCatalogItem: { select: { code: true, name: true } }
    }
  });
  if (!profile) return result;

  const displayName = formatResearcherDisplayName(profile);
  const userId = profile.linkedUserId;

  const proposalMemberDelegate = (tx as unknown as { proposalMember?: Prisma.TransactionClient["proposalMember"] }).proposalMember;
  if (proposalMemberDelegate?.updateMany) {
    const orFilters: Array<{ researcherProfileId?: string; userId?: string }> = [{ researcherProfileId: profileId }];
    if (userId) orFilters.push({ userId });
    result.proposalMembers = (
      await proposalMemberDelegate.updateMany({
        where: { status: "ACTIVE", OR: orFilters, NOT: { name: displayName } },
        data: { name: displayName }
      })
    ).count;
  }

  const projectMemberDelegate = (tx as unknown as { approvedProjectMember?: Prisma.TransactionClient["approvedProjectMember"] }).approvedProjectMember;
  if (userId && projectMemberDelegate?.updateMany) {
    result.projectMembers = (
      await projectMemberDelegate.updateMany({
        where: { userId, status: "ACTIVE", NOT: { name: displayName } },
        data: { name: displayName }
      })
    ).count;
  }

  return result;
}
