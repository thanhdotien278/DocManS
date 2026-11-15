import type { ProjectRecord } from "@/lib/projects-api";
import type { ProposalIntakePeriod } from "@/lib/proposal-intake-periods-api";
import type { ResearchProposal } from "@/lib/research-proposals-api";

// Tổng hợp dashboard CV từ dữ liệu backend đã lọc theo phạm vi: mọi con số là "trong phạm vi bạn phụ trách",
// không phải tổng của Học viện. Chỉ import kiểu để test Node nạp trực tiếp được.

const DAY_MS = 86_400_000;

/** Giai đoạn của hồ sơ trên thanh tiến trình; hồ sơ nháp chưa tới tay CV nên không tính. */
export const PROPOSAL_PHASES = [
  { key: "intake", label: "Tiếp nhận, kiểm tra", statuses: ["submitted", "resubmitted", "supplement_requested"] },
  { key: "review", label: "Đang đánh giá", statuses: ["under_review"] },
  { key: "decision", label: "Chờ phê duyệt", statuses: ["ready_for_approval"] },
  { key: "approved", label: "Đã duyệt", statuses: ["approved"] },
  { key: "rejected", label: "Không duyệt", statuses: ["rejected"] }
] as const;

export type ReviewProgressRow = { id: string; title: string; submitted: number; pending: number; overdue: number; readyForSynthesis: boolean };
export type ProjectTaskRow = { key: string; projectId: string; title: string; waiting: string; due: string | null; overdue: boolean };
export type IntakeRow = { id: string; title: string; status: ProposalIntakePeriod["status"]; startsAt: string; endsAt: string; elapsed: number; daysLeft: number; proposals: number; canOpen: boolean };

export function summarizeManagement(input: {
  proposals: ResearchProposal[];
  projects: ProjectRecord[];
  intakePeriods: ProposalIntakePeriod[];
  now: Date;
}) {
  const { proposals, projects, intakePeriods, now } = input;
  const active = proposals.filter((proposal) => proposal.status !== "draft");

  const phases = PROPOSAL_PHASES.map((phase) => ({
    key: phase.key,
    label: phase.label,
    count: active.filter((proposal) => (phase.statuses as readonly string[]).includes(proposal.status)).length
  }));

  // FR45a: phân bổ theo CV phụ trách hiện tại, có nhóm "chưa có CV"; "đang xử lý" là hồ sơ chưa có kết quả duyệt.
  const officers = new Map<string, { key: string; name: string; inProgress: number; total: number }>();
  for (const proposal of active) {
    const current = proposal.managementOfficer?.current;
    const key = current?.officerUserId ?? "";
    const row = officers.get(key) ?? { key: key || "unassigned", name: current?.officerDisplayName || (key ? "CV không xác định" : "Chưa có CV phụ trách"), inProgress: 0, total: 0 };
    row.total++;
    if (proposal.status !== "approved" && proposal.status !== "rejected") row.inProgress++;
    officers.set(key, row);
  }

  const natureCounts = new Map<string, number>();
  for (const proposal of active) natureCounts.set(proposal.proposalNatureCode || "", (natureCounts.get(proposal.proposalNatureCode || "") ?? 0) + 1);

  // Dùng nguyên số backend trả: tổng ghế có thể gồm ghế không chấm điểm nên không suy "chưa nộp" từ phép trừ.
  const reviewProgress: ReviewProgressRow[] = proposals
    .filter((proposal) => proposal.status === "under_review" && proposal.reviewWorkflow)
    .map((proposal) => ({
      id: proposal.id,
      title: proposal.title,
      submitted: proposal.reviewWorkflow!.submittedCount,
      pending: proposal.reviewWorkflow!.pendingCount,
      overdue: proposal.reviewWorkflow!.overdueCount,
      readyForSynthesis: proposal.reviewWorkflow!.readyForSynthesis
    }));

  const projectTasks: ProjectTaskRow[] = projects.flatMap((project) => [
    ...project.requests
      .filter((request) => request.allowedActions.length > 0 && (request.status === "under_staff_review" || request.status === "under_staff_validation"))
      .map((request) => ({
        key: `request-${request.id}`,
        projectId: project.id,
        title: project.title,
        waiting: request.requestType === "extension" ? "Xem xét đề nghị gia hạn" : "Xem xét đề nghị điều chỉnh",
        due: request.responseDeadline ?? null,
        overdue: !!request.responseDeadline && Date.parse(request.responseDeadline) < now.getTime()
      })),
    ...project.reports
      .filter((report) => report.awaitingAction === "officer" && report.allowedActions.length > 0)
      .map((report) => ({
        key: `report-${report.id}`,
        projectId: project.id,
        title: project.title,
        waiting: "Xem xét báo cáo tiến độ",
        due: report.responseDeadline ?? null,
        overdue: !!report.responseOverdue
      }))
  ]);

  const proposalsByPeriod = new Map<string, number>();
  const periodTitles = new Map<string, string>();
  for (const proposal of active) {
    proposalsByPeriod.set(proposal.intakePeriodId, (proposalsByPeriod.get(proposal.intakePeriodId) ?? 0) + 1);
    if (proposal.intakePeriodTitle) periodTitles.set(proposal.intakePeriodId, proposal.intakePeriodTitle);
  }
  const intakes: IntakeRow[] = intakePeriods
    .filter((period) => period.status === "open" || period.status === "draft")
    .map((period) => {
      const start = Date.parse(period.startsAt);
      const end = Date.parse(period.endsAt);
      return {
        id: period.id,
        title: period.title,
        status: period.status,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
        elapsed: end > start ? Math.min(1, Math.max(0, (now.getTime() - start) / (end - start))) : 0,
        daysLeft: Math.ceil((end - now.getTime()) / DAY_MS),
        proposals: proposalsByPeriod.get(period.id) ?? 0,
        canOpen: period.capabilities?.canOpen ?? false
      };
    })
    .sort((left, right) => (left.status === right.status ? Date.parse(left.endsAt) - Date.parse(right.endsAt) : left.status === "open" ? -1 : 1));

  return {
    total: active.length,
    phases,
    officers: [...officers.values()].sort((left, right) => right.inProgress - left.inProgress || right.total - left.total || left.name.localeCompare(right.name, "vi")),
    unassigned: officers.get("")?.inProgress ?? 0,
    natures: [...natureCounts.entries()].map(([code, count]) => ({ code, count })).sort((left, right) => right.count - left.count),
    byIntake: [...proposalsByPeriod.entries()]
      .map(([id, count]) => ({ id, title: periodTitles.get(id) ?? "Đợt không xác định", count }))
      .sort((left, right) => right.count - left.count),
    reviewProgress,
    pendingReviews: reviewProgress.reduce((sum, row) => sum + row.pending, 0),
    overdueReviews: reviewProgress.reduce((sum, row) => sum + row.overdue, 0),
    projectTasks,
    projects: {
      total: projects.length,
      overdue: projects.filter((project) => project.overdue).length,
      approaching: projects.filter((project) => project.approaching).length,
      upcoming: projects
        .filter((project) => project.nearestDeadline)
        .sort((left, right) => Date.parse(left.nearestDeadline!) - Date.parse(right.nearestDeadline!))
        .slice(0, 5)
    },
    intakes,
    openIntakes: intakes.filter((row) => row.status === "open")
  };
}

export type ManagementSummary = ReturnType<typeof summarizeManagement>;
