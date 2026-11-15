"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NotificationItem, useOpenNotification } from "@/components/layout/notification-bell";
import { useSession } from "@/components/auth/session-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { loadNotifications, type UserNotification } from "@/lib/notifications-api";
import { listProjects, type ProjectRecord } from "@/lib/projects-api";
import { proposalNextStep } from "@/lib/proposal-next-step";
import { loadMyReviewAssignments, type ReviewerQueueItem } from "@/lib/proposal-evaluations-api";
import { listRegistrationRequests } from "@/lib/registration-api";
import { loadDecisionQueue, loadResearchProposals, type ResearchProposal } from "@/lib/research-proposals-api";
import type { ViewerAuthorizationV1 } from "@rtms/permissions";

type WorkItem = { key: string; record: string; meta: string; waiting: string; due?: string | null; overdue?: boolean; href: string; action: string };

const RESEARCH_RELATIONSHIPS = ["PROPOSAL_PI", "TOPIC_PI", "TOPIC_SECRETARY", "TOPIC_MEMBER"];
const OFFICER_RELATIONSHIPS = ["PROPOSAL_MANAGEMENT_OFFICER", "PROJECT_MANAGEMENT_OFFICER"];

const hasRelationship = (authorization: ViewerAuthorizationV1 | undefined, types: string[]) =>
  !!authorization?.viewerRelationships?.some((item) => item.status === "ACTIVE" && types.includes(item.type));
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(new Date(value)) : "Chưa đặt hạn";

function proposalItems(proposals: ResearchProposal[], queue: ResearchProposal[]): WorkItem[] {
  const waitingDecision = queue.filter((proposal) => proposal.status === "ready_for_approval");
  const rest = proposals.filter((proposal) => !waitingDecision.some((item) => item.id === proposal.id));
  return [...waitingDecision, ...rest].flatMap((proposal) => {
    // Hàng đợi quyết định đã được backend lọc theo thẩm quyền nên luôn là việc đang chờ người xem.
    const step = proposalNextStep(proposal) ?? (waitingDecision.includes(proposal) ? { waiting: "Chờ bạn quyết định phê duyệt", action: "Xem và quyết định" } : null);
    return step ? [{
      key: `proposal-${proposal.id}`, record: proposal.title, meta: `Hồ sơ đề xuất ${proposal.code} · ${proposal.statusLabel ?? ""}`,
      waiting: step.waiting, href: `/proposals/${proposal.id}`, action: step.action
    }] : [];
  });
}

function reviewItems(assignments: ReviewerQueueItem[]): WorkItem[] {
  return assignments.flatMap((assignment) => {
    if (assignment.access === "preview") {
      return assignment.invitationStatus === "invited" ? [{
        key: `review-${assignment.id}`, record: assignment.proposal.title, meta: `Lời mời đánh giá · ${assignment.assignmentRoleLabel}`,
        waiting: "Trả lời lời mời tham gia đánh giá", due: assignment.dueDate, href: "/my-reviews", action: "Trả lời"
      }] : [];
    }
    if (assignment.assignmentRole === "council_secretary" || assignment.scoring === false || assignment.myReviewStatus === "submitted") return [];
    return [{
      key: `review-${assignment.id}`, record: assignment.proposal.title, meta: `Hồ sơ đề xuất ${assignment.proposal.code} · ${assignment.assignmentRoleLabel}`,
      waiting: "Chấm và gửi phiếu đánh giá", due: assignment.dueDate, href: "/my-reviews", action: "Chấm phiếu"
    }];
  });
}

function projectItems(projects: ProjectRecord[]): WorkItem[] {
  return projects.flatMap((project) => {
    const report = project.reports.find((item) => item.awaitingAction && item.allowedActions.length > 0);
    const mine = hasRelationship(project.viewerAuthorization, [...RESEARCH_RELATIONSHIPS, ...OFFICER_RELATIONSHIPS]);
    const waiting = report
      ? report.awaitingAction === "officer" ? "Xem xét báo cáo tiến độ" : "Bổ sung báo cáo tiến độ"
      : mine && project.overdue ? "Có mốc đã quá hạn" : mine && project.approaching ? "Có mốc sắp đến hạn" : "";
    return waiting ? [{
      key: `project-${project.id}`, record: project.title, meta: "Đề tài đang thực hiện", waiting,
      due: report ? report.responseDeadline : project.nearestDeadline, overdue: report ? report.responseOverdue : project.overdue, href: `/projects/${project.id}`, action: "Mở đề tài"
    }] : [];
  });
}

type HomeData = { items: WorkItem[]; proposals: ResearchProposal[] | null; projects: ProjectRecord[] | null; notifications: UserNotification[] };

/** Trang đầu của theme "Không gian làm việc": việc cần xử lý, hạn và bước tiếp theo, lấy từ các API nghiệp vụ theo quyền. */
export function WorkspaceHome() {
  const { account } = useSession();
  const openNotification = useOpenNotification();
  const [data, setData] = useState<HomeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Nguồn nào backend từ chối (403) thì bỏ qua phần đó; không suy diễn quyền ở trình duyệt.
    const optional = <T,>(request: Promise<T>) => request.catch(() => null);
    void Promise.all([
      optional(loadResearchProposals()), optional(loadDecisionQueue()), optional(loadMyReviewAssignments()),
      optional(listProjects()), optional(listRegistrationRequests()), optional(loadNotifications(20))
    ]).then(([proposals, queue, reviews, projects, registrations, notifications]) => {
      if (cancelled) return;
      const pendingAccounts = registrations?.requests.length ?? 0;
      setData({
        proposals, projects,
        notifications: notifications?.notifications.filter((item) => !item.readAt).slice(0, 5) ?? [],
        items: [
          ...proposalItems(proposals ?? [], queue ?? []), ...reviewItems(reviews ?? []), ...projectItems(projects ?? []),
          ...(pendingAccounts ? [{ key: "registrations", record: `${pendingAccounts} yêu cầu đăng ký tài khoản`, meta: "Tài khoản nhà nghiên cứu", waiting: "Duyệt hoặc từ chối yêu cầu", href: "/registration-requests", action: "Xem yêu cầu" }] : [])
        ]
      });
    });
    return () => { cancelled = true; };
  }, []);

  const count = (records: Array<{ viewerAuthorization?: ViewerAuthorizationV1 }> | null, types: string[]) => records?.filter((record) => hasRelationship(record.viewerAuthorization, types)).length ?? 0;
  const summary = data ? [
    { label: "Hồ sơ đề xuất", href: "/proposals", records: data.proposals },
    { label: "Đề tài đang thực hiện", href: "/projects", records: data.projects }
  ].filter((row) => row.records?.length) : [];

  return (
    <>
      <PageHeader eyebrow={account?.systemRoleLabel ?? "Trang đầu"} title="Việc cần xử lý" description="Các việc đang chờ bạn, hạn xử lý và bước tiếp theo trên từng hồ sơ." />
      <SectionCard title="Việc cần tôi xử lý" subtitle={data ? `${data.items.length} việc đang chờ` : undefined}>
        {!data ? <p className="state-message" role="status">Đang tải việc cần xử lý...</p> : data.items.length === 0 ? (
          <EmptyState title="Không có việc đang chờ bạn" message="Khi có hồ sơ, đề tài hoặc lời mời cần bạn xử lý, việc đó sẽ xuất hiện tại đây." />
        ) : (
          <ul className="work-list">
            {data.items.map((item) => (
              <li className="work-item" key={item.key}>
                <div className="work-item-record">
                  <Link className="record-title" href={item.href}>{item.record}</Link>
                  <span className="record-meta">{item.meta}</span>
                </div>
                <div className="work-item-step">
                  <span className="work-item-label">Việc cần làm</span>
                  <strong>{item.waiting}</strong>
                </div>
                <div className="work-item-step">
                  <span className="work-item-label">Hạn</span>
                  <span className={item.overdue ? "work-item-overdue" : undefined}>{item.overdue && !item.due ? "Quá hạn" : `${formatDate(item.due)}${item.overdue ? " · Quá hạn" : ""}`}</span>
                </div>
                <Link className="button primary" href={item.href}>{item.action}</Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {summary.length ? (
        <SectionCard title="Hồ sơ và đề tài của tôi" subtitle="Số lượng theo quan hệ của bạn với từng hồ sơ">
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Hồ sơ và đề tài của tôi">
            <table className="data-table">
              <thead><tr><th>Loại</th><th>Tôi phụ trách</th><th>Tôi tham gia nghiên cứu</th><th>Trong phạm vi được xem</th></tr></thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.href}>
                    <td><Link className="record-title" href={row.href}>{row.label}</Link></td>
                    <td>{count(row.records, OFFICER_RELATIONSHIPS)}</td>
                    <td>{count(row.records, RESEARCH_RELATIONSHIPS)}</td>
                    <td>{row.records?.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {data?.notifications.length ? (
        <SectionCard title="Thông báo chưa đọc" subtitle="Tờ trình, hồ sơ và lời mời liên quan đến bạn" action={<Link className="button" href="/notifications">Xem tất cả</Link>}>
          <ul className="notification-list">
            {data.notifications.map((item) => <li key={item.id}><NotificationItem item={item} onOpen={openNotification} /></li>)}
          </ul>
        </SectionCard>
      ) : null}
    </>
  );
}
