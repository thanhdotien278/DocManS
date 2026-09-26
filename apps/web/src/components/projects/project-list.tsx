"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { createProject, listProjects, type ProjectRecord } from "@/lib/projects-api";
import { loadResearchProposal, loadResearchProposals, type ResearchProposal } from "@/lib/research-proposals-api";

function date(value?: string | null) { return value ? new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC" }).format(new Date(value)) : "Chưa có"; }

export function ProjectList({ mine = false }: { mine?: boolean }) {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [approved, setApproved] = useState<ResearchProposal[]>([]);
  const [filter, setFilter] = useState("all");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setState("loading");
    try {
      const [items, proposals] = await Promise.all([listProjects(), mine ? Promise.resolve([]) : loadResearchProposals().catch(() => [])]);
      setProjects(items);
      setApproved(proposals.filter((item) => item.status === "approved" && !items.some((project) => project.proposalId === item.id)));
      setState("ready");
    } catch { setState("error"); }
  }
  useEffect(() => { void refresh(); }, [mine]);

  async function create(proposalId: string) {
    if (!window.confirm("Tạo đề tài từ phiên bản đề xuất đã được Lãnh đạo phê duyệt?")) return;
    setBusy(true); setMessage("");
    try {
      const proposal = await loadResearchProposal(proposalId);
      const contextVersion = proposal.viewerAuthorization?.contextVersion;
      const result = await createProject(proposalId, contextVersion);
      setMessage(`Đã tạo đề tài ${result.project.id}. Trưởng phòng cần phân công chuyên viên đề tài.`);
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tạo đề tài."); }
    finally { setBusy(false); }
  }

  const visible = projects.filter((project) => filter === "all" || (filter === "overdue" ? project.overdue : filter === "approaching" ? project.approaching : project.status === filter));
  return <div className="form-section-inline">
    <SectionCard title={mine ? "Đề tài của tôi" : "Theo dõi đề tài"} subtitle="Dữ liệu theo quyền trên từng đề tài">
      <div className="button-row"><label className="field"><span>Lọc</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tất cả</option><option value="preparing">Chuẩn bị triển khai</option><option value="executing">Đang thực hiện</option><option value="overdue">Quá hạn</option><option value="approaching">Sắp đến hạn</option></select></label><button className="button" type="button" onClick={() => void refresh()}>Tải lại</button></div>
      {state === "loading" ? <p>Đang tải đề tài…</p> : state === "error" ? <p role="alert">Không tải được đề tài. Vui lòng thử lại.</p> : visible.length === 0 ? <p>Chưa có đề tài phù hợp.</p> : <div className="project-list">{visible.map((project) => <article className="list-card" key={project.id}><h3><Link href={`/projects/${project.id}`}>{project.title}</Link></h3><p>{project.status} · {project.hostOrganizationUnit?.name ?? ""}</p><p>Hạn: {date(project.nearestDeadline)} {project.overdue ? "· Quá hạn" : project.approaching ? "· Sắp đến hạn" : ""}</p><Link className="button" href={`/projects/${project.id}`}>Mở đề tài</Link></article>)}</div>}
      {message ? <p role="status">{message}</p> : null}
    </SectionCard>
    {!mine && approved.length > 0 ? <SectionCard title="Đề xuất đã phê duyệt" subtitle="Chuyên viên đề xuất được phân công có thể tạo đề tài"><div className="project-list">{approved.map((proposal) => <article className="list-card" key={proposal.id}><Link href={`/proposals/${proposal.id}`}>{proposal.title}</Link><button className="button" type="button" disabled={busy} onClick={() => void create(proposal.id)}>Tạo đề tài</button></article>)}</div></SectionCard> : null}
  </div>;
}
