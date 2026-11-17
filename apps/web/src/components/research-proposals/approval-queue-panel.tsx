"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadApprovalQueue, type ApprovalSubmission } from "@/lib/approval-routing-api";
import { loadDecisionQueue, type ResearchProposal } from "@/lib/research-proposals-api";

const DECIDED_STATUSES = ["approved", "rejected"];

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Chưa có";
}

/**
 * ST-3.5 — the approval authority's queue.
 *
 * The backend returns only routed proposals in the authority's explicit scope; the UI only splits
 * that server-filtered projection into waiting and decided sections.
 */
export function ApprovalQueuePanel() {
  const [proposals, setProposals] = useState<ResearchProposal[] | null>(null);
  const [submissions, setSubmissions] = useState<ApprovalSubmission[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    // Hàng đợi quyết định chỉ dành cho Giám đốc; vai trò khác bị 403 thì chỉ hiện tờ trình chờ chính họ xử lý.
    void Promise.all([loadApprovalQueue(), loadDecisionQueue().catch(() => null)]).then(([queue, decisions]) => {
      if (cancelled) return;
      setSubmissions(queue.submissions);
      setProposals(decisions);
      setState("ready");
    }, () => { if (!cancelled) setState("error"); });
    return () => {
      cancelled = true;
    };
  }, []);

  const waiting = useMemo(() => (proposals ?? []).filter((proposal) => proposal.status === "ready_for_approval"), [proposals]);
  const decided = useMemo(() => (proposals ?? []).filter((proposal) => DECIDED_STATUSES.includes(proposal.status)), [proposals]);
  // Hồ sơ đã nằm ở "Chờ quyết định" thì không lặp lại ở danh sách tờ trình.
  const documents = submissions.filter((item) => !(item.subjectType === "proposal" && waiting.some((proposal) => proposal.id === item.subjectId)));

  if (state === "loading") {
    return <p className="state-message">Đang tải việc chờ bạn xử lý...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">Không thể tải danh sách tờ trình chờ xử lý.</p>;
  }

  return (
    <>
      {proposals ? (
        <SectionCard title="Chờ quyết định" subtitle={`${waiting.length} hồ sơ đã được tổng hợp kết quả và đang chờ phê duyệt`}>
          {waiting.length === 0 ? (
            <EmptyState
              title="Chưa có hồ sơ chờ phê duyệt"
              message="Hồ sơ xuất hiện tại đây sau khi tờ trình đã qua Trưởng ban và Trưởng phòng."
            />
          ) : (
            <ProposalRows proposals={waiting} />
          )}
        </SectionCard>
      ) : null}

      <SectionCard title="Tờ trình chờ tôi xử lý" subtitle={`${documents.length} tờ trình đang ở bước của bạn`}>
        {documents.length === 0 ? (
          <EmptyState title="Không có tờ trình chờ bạn" message="Tờ trình xuất hiện tại đây khi đến bước thuộc thẩm quyền của bạn." />
        ) : (
          <ul className="work-list">
            {documents.map((item) => (
              <li className="work-item" key={item.id}>
                <div className="work-item-record">
                  <Link className="record-title" href={`/${item.subjectType === "project" ? "projects" : "proposals"}/${item.subjectId}`}>{item.title}</Link>
                  <span className="record-meta">{item.kindLabel} · {item.submittedByName} trình ngày {formatDate(item.createdAt)}</span>
                </div>
                <div className="work-item-step">
                  <span className="work-item-label">Bước hiện tại</span>
                  <strong>{item.stageLabel}</strong>
                </div>
                <div className="work-item-step">
                  <span className="work-item-label">Người ký</span>
                  <span>{item.signerLabel}</span>
                </div>
                <Link className="button primary" href={`/${item.subjectType === "project" ? "projects" : "proposals"}/${item.subjectId}`}>Mở hồ sơ</Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {proposals ? (
        <SectionCard title="Đã quyết định" subtitle={`${decided.length} hồ sơ đã có quyết định phê duyệt hoặc từ chối`}>
          {decided.length === 0 ? (
            <EmptyState title="Chưa có quyết định" message="Các hồ sơ đã phê duyệt hoặc từ chối sẽ được lưu lại ở đây." />
          ) : (
            <ProposalRows proposals={decided} />
          )}
        </SectionCard>
      ) : null}
    </>
  );
}

function ProposalRows({ proposals }: { proposals: ResearchProposal[] }) {
  return (
    <>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách hồ sơ chờ quyết định">
        <table className="data-table">
          <thead>
            <tr>
              <th>Hồ sơ</th>
              <th>Đơn vị chủ trì</th>
              <th>Ngày nộp</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>
                  <Link className="record-title" href={`/proposals/${proposal.id}`}>
                    {proposal.title}
                  </Link>
                  <span className="record-meta">{proposal.code || "Chưa cấp mã"}</span>
                </td>
                <td>{proposal.hostOrganizationUnitId}</td>
                <td>{formatDate(proposal.submittedAt)}</td>
                <td>
                  <StatusBadge status={proposal.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-list">
        {proposals.map((proposal) => (
          <article className="list-card" key={proposal.id}>
            <div className="list-card-header">
              <Link className="record-title" href={`/proposals/${proposal.id}`}>
                {proposal.title}
              </Link>
              <StatusBadge status={proposal.status} />
            </div>
            <span className="record-meta">
              {proposal.hostOrganizationUnitId} · Nộp {formatDate(proposal.submittedAt)}
            </span>
          </article>
        ))}
      </div>
    </>
  );
}
