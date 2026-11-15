"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Eye, FolderKanban, RefreshCw } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { RankedBars, dateTime, fullDate, number } from "@/components/ui/ops-dash";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { summarizeManagement, type ManagementSummary } from "@/lib/management-dashboard";
import { listProjects } from "@/lib/projects-api";
import { loadProposalIntakePeriods } from "@/lib/proposal-intake-periods-api";
import { proposalNextStep } from "@/lib/proposal-next-step";
import { listRegistrationRequests } from "@/lib/registration-api";
import { loadProposalCatalogs, loadResearchProposals, type ResearchProposal } from "@/lib/research-proposals-api";

const phaseTone: Record<string, string> = { intake: "waiting", review: "pending", decision: "dormant", approved: "active", rejected: "blocked" };
const intakeStatusLabel: Record<string, string> = { open: "Đang mở", draft: "Chưa mở" };

type Loaded = { summary: ManagementSummary; tasks: Array<{ proposal: ResearchProposal; waiting: string; action: string }>; natureLabels: Map<string, string>; registrations: number; generatedAt: string; failed: string[] };

/** Dashboard CV: số liệu thật từ các API nghiệp vụ; backend đã lọc theo hồ sơ/đề tài được giao cho người xem. */
export function ManagementDashboardPanel() {
  const { account } = useSession();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError("");
    const failed: string[] = [];
    const optional = <T,>(label: string, request: Promise<T>, fallback: T) =>
      request.catch(() => {
        failed.push(label);
        return fallback;
      });
    const [proposals, projects, intakePeriods, catalogs, registrations] = await Promise.all([
      optional("hồ sơ đề xuất", loadResearchProposals(), []),
      optional("đề tài", listProjects(), []),
      optional("đợt tiếp nhận", loadProposalIntakePeriods(), []),
      optional("danh mục", loadProposalCatalogs(), []),
      optional("yêu cầu đăng ký", listRegistrationRequests(), null)
    ]);
    if (failed.length === 5) {
      setError("Không tải được số liệu. Vui lòng kiểm tra kết nối hoặc thử lại.");
    } else {
      const now = new Date();
      setData({
        summary: summarizeManagement({ proposals, projects, intakePeriods, now }),
        tasks: proposals.flatMap((proposal) => {
          const step = proposalNextStep(proposal);
          return step ? [{ proposal, ...step }] : [];
        }),
        natureLabels: new Map(catalogs.filter((item) => item.type === "proposal-nature").map((item) => [item.code, item.name])),
        registrations: registrations?.requests.length ?? 0,
        generatedAt: now.toISOString(),
        failed
      });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      <PageHeader
        eyebrow={account?.systemRoleLabel ?? "Điều hành nghiệp vụ"}
        title="Dashboard chuyên viên quản lý khoa học"
        description="Hồ sơ, đợt tiếp nhận và đề tài bạn được giao phụ trách: việc cần làm, tiến độ đánh giá và hạn sắp tới."
        actions={
          <>
            <button className="button" type="button" onClick={() => void refresh()} disabled={isLoading}>
              <RefreshCw size={16} aria-hidden="true" className={isLoading ? "spin" : undefined} />
              {isLoading ? "Đang tải" : "Làm mới"}
            </button>
            <Link className="button primary" href="/proposals">
              Mở danh sách hồ sơ
            </Link>
          </>
        }
      />

      {error ? (
        <div className="ops-dash-error" role="alert">
          <p>{error}</p>
          <button className="button" type="button" onClick={() => void refresh()}>
            Thử lại
          </button>
        </div>
      ) : null}
      {!data && isLoading ? <p className="record-meta" role="status">Đang tải số liệu…</p> : null}
      {data ? <ManagementDashboardBody data={data} /> : null}
    </>
  );
}

function ManagementDashboardBody({ data }: { data: Loaded }) {
  const { summary } = data;
  const nearestOpen = summary.openIntakes[0];
  const actionCount = data.tasks.length + summary.projectTasks.length + (data.registrations ? 1 : 0);
  const watchRows = summary.reviewProgress.filter((row) => row.pending > 0 || row.overdue > 0 || row.readyForSynthesis);

  return (
    <div className="ops-dash">
      <p className="record-meta ops-dash-stamp">
        Số liệu lúc {dateTime.format(new Date(data.generatedAt)).slice(6)} ngày {fullDate.format(new Date(data.generatedAt))}, chỉ gồm hồ sơ và đề tài bạn được giao.
        {data.failed.length ? <strong className="is-alert"> Không tải được: {data.failed.join(", ")}.</strong> : null}
      </p>

      <section className="section-card ops-dash-ledger" aria-label="Hồ sơ đề xuất theo giai đoạn">
        <div className="ops-dash-ledger-main">
          <div className="ops-dash-figure">
            <span className="ops-dash-figure-value">{number.format(summary.total)}</span>
            <span className="ops-dash-figure-label">hồ sơ đề xuất bạn phụ trách</span>
          </div>
          <div className="ops-dash-status-bar" role="img" aria-label={summary.phases.map((phase) => `${phase.label}: ${phase.count}`).join(", ")}>
            {summary.phases.map((phase) => (phase.count ? <span key={phase.key} className={`tone-${phaseTone[phase.key]}`} style={{ flexGrow: phase.count }} title={`${phase.label}: ${phase.count}`} /> : null))}
          </div>
          <ul className="ops-dash-legend">
            {summary.phases.map((phase) => (
              <li key={phase.key} className={phase.count ? undefined : "is-zero"}>
                <span className={`ops-dash-swatch tone-${phaseTone[phase.key]}`} aria-hidden="true" />
                {phase.label} <strong>{phase.count}</strong>
              </li>
            ))}
          </ul>
        </div>
        <dl className="ops-dash-facts">
          <div>
            <dt>Việc chờ bạn xử lý</dt>
            <dd>{actionCount}</dd>
            <p>{actionCount ? "hồ sơ, đề tài và tài khoản" : "Không có việc tồn"}</p>
          </div>
          <div>
            <dt>Phiếu đánh giá chưa nộp</dt>
            <dd>{summary.pendingReviews}</dd>
            <p className={summary.overdueReviews ? "is-alert" : undefined}>{summary.overdueReviews ? `${summary.overdueReviews} phiếu quá hạn` : "Không có phiếu quá hạn"}</p>
          </div>
          <div>
            <dt>Đợt tiếp nhận đang mở</dt>
            <dd>{summary.openIntakes.length}</dd>
            <p className={nearestOpen && nearestOpen.daysLeft <= 7 ? "is-alert" : undefined}>
              {nearestOpen ? (nearestOpen.daysLeft > 0 ? `Gần nhất đóng sau ${nearestOpen.daysLeft} ngày` : "Đến hạn đóng hôm nay") : "Không có đợt đang mở"}
            </p>
          </div>
        </dl>
      </section>

      <div className="grid two-column">
        <SectionCard title="Việc cần xử lý" subtitle="Việc đang chờ bạn thao tác, sau đó là các hồ sơ cần theo dõi">
          {actionCount ? (
            <ol className="ops-dash-queue">
              {data.tasks.map((task) => (
                <li key={task.proposal.id}>
                  <div className="ops-dash-queue-who">
                    <Link className="record-title" href={`/proposals/${task.proposal.id}`}>
                      {task.proposal.title}
                    </Link>
                    <span className="record-meta">
                      {[task.proposal.code, task.proposal.statusLabel, task.proposal.ownerDisplayName].filter(Boolean).join(" · ")}
                    </span>
                  </div>
                  <div className="ops-dash-queue-state">
                    <span className="ops-dash-pill tone-pending">{task.waiting}</span>
                  </div>
                  <div className="ops-dash-queue-next">
                    <Link href={`/proposals/${task.proposal.id}`}>{task.action}</Link>
                  </div>
                </li>
              ))}
              {data.registrations ? (
                <li>
                  <div className="ops-dash-queue-who">
                    <Link className="record-title" href="/registration-requests">
                      {data.registrations} yêu cầu đăng ký tài khoản
                    </Link>
                    <span className="record-meta">Tài khoản nhà nghiên cứu</span>
                  </div>
                  <div className="ops-dash-queue-state">
                    <span className="ops-dash-pill tone-pending">Duyệt hoặc từ chối yêu cầu</span>
                  </div>
                  <div className="ops-dash-queue-next">
                    <Link href="/registration-requests">Xem yêu cầu</Link>
                  </div>
                </li>
              ) : null}
              {summary.projectTasks.map((task) => (
                <li key={task.key}>
                  <div className="ops-dash-queue-who">
                    <Link className="record-title" href={`/projects/${task.projectId}`}>
                      {task.title}
                    </Link>
                    <span className="record-meta">Đề tài đang thực hiện</span>
                  </div>
                  <div className="ops-dash-queue-state">
                    <span className="ops-dash-pill tone-pending">{task.waiting}</span>
                    {task.due ? <span className={task.overdue ? "ops-dash-wait is-late" : "ops-dash-wait"}>{task.overdue ? "Quá hạn " : "Hạn "}{fullDate.format(new Date(task.due))}</span> : null}
                  </div>
                  <div className="ops-dash-queue-next">
                    <Link href={`/projects/${task.projectId}`}>Mở đề tài</Link>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ops-dash-clear">Không có hồ sơ hay đề tài nào đang chờ bạn thao tác.</p>
          )}

          <h3 className="ops-dash-subhead">
            <Eye size={15} aria-hidden="true" /> Theo dõi đánh giá
          </h3>
          {watchRows.length ? (
            <ul className="ops-dash-review">
              {watchRows.map((row) => {
                const total = row.submitted + row.pending;
                return (
                  <li key={row.id}>
                    <div className="ops-dash-review-head">
                      <Link className="record-title" href={`/proposals/${row.id}`}>
                        {row.title}
                      </Link>
                      <span className={row.overdue ? "ops-dash-wait is-late" : "ops-dash-wait"}>
                        {row.readyForSynthesis ? "Đủ phiếu, sẵn sàng tổng hợp" : row.overdue ? `${row.overdue} phiếu quá hạn` : `Còn ${row.pending} phiếu chưa nộp`}
                      </span>
                    </div>
                    <div
                      className="ops-dash-status-bar thin"
                      role="img"
                      aria-label={`${row.submitted} phiếu đã nộp, ${row.pending} phiếu chưa nộp, trong đó ${row.overdue} quá hạn`}
                    >
                      {row.submitted ? <span className="tone-active" style={{ flexGrow: row.submitted }} /> : null}
                      {row.pending - row.overdue > 0 ? <span className="tone-track" style={{ flexGrow: row.pending - row.overdue }} /> : null}
                      {row.overdue ? <span className="tone-blocked" style={{ flexGrow: row.overdue }} /> : null}
                    </div>
                    <span className="record-meta">
                      Đã nộp {row.submitted}/{total} phiếu chấm điểm
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="record-meta">Không có hồ sơ nào đang chờ phiếu đánh giá.</p>
          )}
        </SectionCard>

        <SectionCard
          title="Đợt tiếp nhận"
          subtitle="Đợt đang mở và chuẩn bị mở; số hồ sơ là hồ sơ bạn phụ trách"
          action={
            <Link className="button" href="/proposal-intake-periods">
              Mở đợt tiếp nhận
            </Link>
          }
        >
          {summary.intakes.length ? (
            <ul className="ops-dash-intakes">
              {summary.intakes.map((intake) => (
                <li key={intake.id}>
                  <div className="ops-dash-review-head">
                    <span className="record-title">{intake.title}</span>
                    <span className={`ops-dash-pill tone-${intake.status === "open" ? "active-soft" : "dormant"}`}>{intakeStatusLabel[intake.status]}</span>
                  </div>
                  {intake.status === "open" ? (
                    <div className="ops-dash-timeline" role="img" aria-label={`Đã qua ${Math.round(intake.elapsed * 100)}% thời gian tiếp nhận`}>
                      <span style={{ width: `${intake.elapsed * 100}%` }} className={intake.daysLeft <= 7 ? "is-late" : undefined} />
                    </div>
                  ) : null}
                  <span className="record-meta">
                    {fullDate.format(new Date(intake.startsAt))} – {fullDate.format(new Date(intake.endsAt))}
                    {intake.status === "open" ? ` · ${intake.daysLeft > 0 ? `còn ${intake.daysLeft} ngày` : "đến hạn đóng"}` : ""} · {intake.proposals} hồ sơ
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Không có đợt đang mở" message="Các đợt tiếp nhận đang mở hoặc chuẩn bị mở sẽ hiện tại đây." />
          )}
        </SectionCard>
      </div>

      <div className="grid two-column">
        <SectionCard title="Cơ cấu hồ sơ phụ trách" subtitle="Theo tính chất đề tài và theo đợt tiếp nhận, không tính hồ sơ nháp">
          <div className="ops-dash-split">
            <RankedBars
              title="Theo tính chất"
              rows={summary.natures.map((nature) => ({ key: nature.code || "none", label: nature.code ? data.natureLabels.get(nature.code) ?? nature.code : "Chưa phân loại", value: nature.count }))}
            />
            <RankedBars
              title="Theo đợt tiếp nhận"
              rows={summary.byIntake.slice(0, 6).map((intake) => ({ key: intake.id, label: intake.title, value: intake.count }))}
              footer={summary.byIntake.length > 6 ? `và ${summary.byIntake.length - 6} đợt khác` : undefined}
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Đề tài đang theo dõi"
          subtitle={summary.projects.total ? `${summary.projects.total} đề tài · ${summary.projects.overdue} có mốc quá hạn · ${summary.projects.approaching} sắp đến hạn` : "Đề tài bạn được giao theo dõi"}
          action={
            <Link className="button" href="/projects">
              <FolderKanban size={16} aria-hidden="true" />
              Mở đề tài
            </Link>
          }
        >
          {summary.projects.upcoming.length ? (
            <ol className="ops-dash-changes">
              {summary.projects.upcoming.map((project) => (
                <li key={project.id}>
                  <time dateTime={project.nearestDeadline!} className={project.overdue ? "is-alert" : undefined}>
                    {fullDate.format(new Date(project.nearestDeadline!))}
                  </time>
                  <div>
                    <Link className="record-title" href={`/projects/${project.id}`}>
                      {project.title}
                    </Link>
                    <span className="record-meta">{project.overdue ? "Có mốc đã quá hạn" : project.approaching ? "Mốc sắp đến hạn" : "Mốc gần nhất"}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Chưa có đề tài được giao" message="Khi bạn được phân công theo dõi đề tài, hạn mốc gần nhất sẽ hiện tại đây." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
