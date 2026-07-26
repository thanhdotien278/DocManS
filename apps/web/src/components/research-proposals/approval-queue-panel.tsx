"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadResearchProposals, type ResearchProposal } from "@/lib/research-proposals-api";

const DECIDED_STATUSES = ["approved", "rejected"];

function formatDate(value: string) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(value)) : "Chưa có";
}

/**
 * ST-3.5 — the approval authority's queue.
 *
 * It reads the ordinary proposal list, which the backend already narrows to what this authority may
 * see, and splits it into "waiting for a decision" and "already decided". Drafts never reach it
 * because leadership read starts at formal submission.
 */
export function ApprovalQueuePanel() {
  const [proposals, setProposals] = useState<ResearchProposal[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadResearchProposals();
        if (!cancelled) {
          setProposals(data);
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

  const waiting = useMemo(() => proposals.filter((proposal) => proposal.status === "ready_for_approval"), [proposals]);
  const decided = useMemo(() => proposals.filter((proposal) => DECIDED_STATUSES.includes(proposal.status)), [proposals]);

  if (state === "loading") {
    return <p className="state-message">Đang tải hồ sơ chờ phê duyệt...</p>;
  }

  if (state === "error") {
    return <p className="state-message error">Không thể tải danh sách hồ sơ chờ phê duyệt.</p>;
  }

  return (
    <>
      <SectionCard title="Chờ quyết định" subtitle={`${waiting.length} hồ sơ đã được tổng hợp kết quả và đang chờ phê duyệt`}>
        {waiting.length === 0 ? (
          <EmptyState
            title="Chưa có hồ sơ chờ phê duyệt"
            message="Hồ sơ sẽ xuất hiện sau khi chuyên viên quản lý khoa học tổng hợp kết quả đánh giá."
          />
        ) : (
          <ProposalRows proposals={waiting} />
        )}
      </SectionCard>

      <SectionCard title="Đã quyết định" subtitle={`${decided.length} hồ sơ đã có quyết định phê duyệt hoặc từ chối`}>
        {decided.length === 0 ? (
          <EmptyState title="Chưa có quyết định" message="Các hồ sơ đã phê duyệt hoặc từ chối sẽ được lưu lại ở đây." />
        ) : (
          <ProposalRows proposals={decided} />
        )}
      </SectionCard>
    </>
  );
}

function ProposalRows({ proposals }: { proposals: ResearchProposal[] }) {
  return (
    <>
      <div className="table-wrap">
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
