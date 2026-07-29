"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadMyReviewAssignments, type ReviewerQueueItem } from "@/lib/proposal-evaluations-api";

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Không đặt hạn";
}

/**
 * ST-3.2 — the reviewer's queue. It is built from assignment records, so it can only ever contain
 * proposals this reviewer was assigned to; there is no client-side filter of a wider list.
 */
export function ReviewerQueuePanel() {
  const [assignments, setAssignments] = useState<ReviewerQueueItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadMyReviewAssignments();
        if (!cancelled) {
          setAssignments(data);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="state-message">Đang tải danh sách hồ sơ được phân công...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">Không thể tải danh sách hồ sơ được phân công.</p>;
  }

  const pendingCount = assignments.filter((assignment) => assignment.myReviewStatus !== "submitted").length;

  return (
    <SectionCard
      title="Hồ sơ được phân công"
      subtitle={`${assignments.length} hồ sơ · ${pendingCount} phiếu chưa gửi`}
    >
      {assignments.length === 0 ? (
        <EmptyState
          title="Chưa có hồ sơ được phân công"
          message="Khi chuyên viên quản lý khoa học phân công đánh giá, hồ sơ sẽ xuất hiện ở đây."
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Hồ sơ</th>
                  <th>Vai trò</th>
                  <th>Hạn đánh giá</th>
                  <th>Trạng thái hồ sơ</th>
                  <th>Phiếu của tôi</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td>
                      <Link className="record-title" href={`/proposals/${assignment.proposal.id}`}>
                        {assignment.proposal.title}
                      </Link>
                      <span className="record-meta">{assignment.proposal.code || "Chưa cấp mã"}</span>
                    </td>
                    <td>{assignment.assignmentRoleLabel}</td>
                    <td>{formatDate(assignment.dueDate)}</td>
                    <td>
                      <StatusBadge status={assignment.proposal.status} />
                    </td>
                    <td>
                      {assignment.myReviewStatus === "submitted" ? (
                        <>
                          <span className="record-title">Đã gửi</span>
                          <span className="record-meta">{formatDate(assignment.myReviewSubmittedAt)}</span>
                        </>
                      ) : (
                        <span className="record-meta">Chưa gửi phiếu</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mobile-list">
            {assignments.map((assignment) => (
              <article className="list-card" key={assignment.id}>
                <div className="list-card-header">
                  <Link className="record-title" href={`/proposals/${assignment.proposal.id}`}>
                    {assignment.proposal.title}
                  </Link>
                  <StatusBadge status={assignment.proposal.status} />
                </div>
                <span className="record-meta">
                  {assignment.assignmentRoleLabel}
                  {assignment.dueDate ? ` · Hạn ${formatDate(assignment.dueDate)}` : " · Không đặt hạn"}
                </span>
                <span className="record-meta">
                  Phiếu của tôi: {assignment.myReviewStatus === "submitted" ? "Đã gửi" : "Chưa gửi"}
                </span>
              </article>
            ))}
          </div>
        </>
      )}
    </SectionCard>
  );
}
