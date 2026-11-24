"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Clock3,
  Eye,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw
} from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { HEALTH_LABELS } from "@/lib/dashboard-api";
import { listProjects, projectStatusLabel, type ProjectRecord } from "@/lib/projects-api";
import {
  getProposalLevelLabel,
  getProposalMilitaryScope,
  getProposalMilitaryScopeLabel
} from "@/lib/proposal-classification";
import { loadResearchProposals, type ResearchProposal } from "@/lib/research-proposals-api";
import { downloadXlsxReport } from "@/lib/xlsx-export";

type LoadState = "loading" | "ready" | "error";
type ProgressAssessment = "on_track" | "ending_soon" | "overdue" | "not_started" | "finished" | "unknown";

const DEADLINE_TRACKED_STATUSES = ["preparing", "executing", "paused"];
const FUNDING_RESTRICTED_ROLES = ["RESEARCH_OVERSIGHT_AUTHORITY", "RESEARCH_MANAGEMENT_DEPUTY_HEAD"];

const STATUS_LABELS: Record<string, string> = {
  draft: "Bản nháp",
  submitted: "Đã nộp",
  supplement_requested: "Yêu cầu bổ sung",
  resubmitted: "Đã nộp lại",
  under_review: "Đang thẩm định",
  ready_for_approval: "Chờ phê duyệt",
  approved: "Đã phê duyệt",
  rejected: "Không duyệt"
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
  } catch {
    return value;
  }
}

export function ProgressReportPanel() {
  const { account } = useSession();
  const fundingRestricted = FUNDING_RESTRICTED_ROLES.includes(account?.systemRole ?? "");
  const [state, setState] = useState<LoadState>("loading");
  const [proposals, setProposals] = useState<ResearchProposal[]>([]);
  const [projectsByProposal, setProjectsByProposal] = useState<Map<string, ProjectRecord>>(new Map());
  const [keyword, setKeyword] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [progressFilter, setProgressFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedMilitaryScope, setSelectedMilitaryScope] = useState("");
  const [disbursementFilter, setDisbursementFilter] = useState("");
  const [irbFilter, setIrbFilter] = useState("");
  const [acceptanceFilter, setAcceptanceFilter] = useState("");

  async function loadData() {
    setState("loading");
    try {
      const [data, projects] = await Promise.all([loadResearchProposals(), listProjects().catch(() => [] as ProjectRecord[])]);
      setProposals(data);
      setProjectsByProposal(new Map(projects.map((project) => [project.proposalId, project])));
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const unitOptions = useMemo(() => {
    const unitsMap = new Map<string, string>();
    (account?.organizationScopes ?? []).forEach((scope: { id: string; name: string }) => {
      unitsMap.set(scope.id, scope.name);
    });
    proposals.forEach((p) => {
      const id = p.hostOrganizationUnitId;
      const name = p.hostOrganizationUnitName || id;
      if (id && !unitsMap.has(id)) unitsMap.set(id, name);
    });
    return Array.from(unitsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [account?.organizationScopes, proposals]);

  const enhancedProposals = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return proposals.map((proposal) => {
      const project = projectsByProposal.get(proposal.id) ?? null;
      const progressSummary = project?.progress ?? null;
      const startDate = project ? project.startDate : proposal.startDate;
      const endDate = project ? project.endDate : proposal.endDate;
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      let assessment: ProgressAssessment = "unknown";
      let remainingDays = 0;
      let elapsedDays = 0;
      const progressPercent: number | null = progressSummary ? progressSummary.actualPercent : null;

      if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        remainingDays = Math.round((endDay.getTime() - today.getTime()) / 86_400_000);
        elapsedDays = Math.round((today.getTime() - startDay.getTime()) / 86_400_000);

        if (today < startDay) assessment = "not_started";
        else if (remainingDays < 0) assessment = "overdue";
        else if (remainingDays <= 60) assessment = "ending_soon";
        else assessment = "on_track";
      }

      if (!project) {
        assessment = start ? "not_started" : "unknown";
      } else if (progressSummary?.health === "delayed" || (progressSummary?.maxDaysOverdue ?? 0) > 0 || project.overdue) {
        assessment = "overdue";
      } else if ((project.approaching || progressSummary?.health === "at_risk") && assessment === "on_track") {
        assessment = "ending_soon";
      }
      if (project && !DEADLINE_TRACKED_STATUSES.includes(project.status)) {
        assessment = "finished";
      }

      const budgetTotal = fundingRestricted
        ? 0
        : Number(
            project?.fundingSummary?.approvedBudget ??
              proposal.budgetMetadata?.approvedAmount ??
              proposal.budgetMetadata?.amount ??
              0
          );
      const disbursedTotal = fundingRestricted ? 0 : Number(project?.fundingSummary?.totalDisbursed ?? 0);
      const disbursedPercent = budgetTotal > 0 ? Math.min(100, Math.round((disbursedTotal / budgetTotal) * 100)) : 0;

      const ethicsStatus = project?.ethicsDossier?.status ?? null;
      const acceptanceDossierStatus = project?.acceptanceDossier?.status ?? null;
      const isAcceptanceCompleted = project?.status === "accepted";
      const isAcceptanceFailed = project?.status === "failed";
      const isAcceptanceInProgress =
        !isAcceptanceCompleted &&
        !isAcceptanceFailed &&
        (project?.status === "pending_acceptance" || acceptanceDossierStatus === "submitted");

      return {
        ...proposal,
        startDate,
        endDate,
        hasProject: Boolean(project),
        projectStatus: project?.status ?? null,
        plannedPercent: progressSummary?.plannedPercent ?? null,
        spi: progressSummary?.spi ?? null,
        health: progressSummary?.health ?? null,
        remainingDays,
        elapsedDays,
        progressPercent,
        assessment,
        budgetTotal,
        disbursedTotal,
        disbursedPercent,
        ethicsStatus,
        acceptanceDossierStatus,
        isAcceptanceCompleted,
        isAcceptanceFailed,
        isAcceptanceInProgress
      };
    });
  }, [proposals, projectsByProposal, fundingRestricted]);

  const filteredProposals = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const targetLevelLabel = selectedLevel ? getProposalLevelLabel(selectedLevel) : "";
    const targetScopeLabel = selectedMilitaryScope ? getProposalMilitaryScopeLabel(selectedMilitaryScope) : "";

    return enhancedProposals.filter((p) => {
      if (kw) {
        const matchKw =
          p.title.toLowerCase().includes(kw) ||
          (p.code && p.code.toLowerCase().includes(kw)) ||
          (p.ownerDisplayName && p.ownerDisplayName.toLowerCase().includes(kw));
        if (!matchKw) return false;
      }
      if (selectedUnit && p.hostOrganizationUnitId !== selectedUnit) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (selectedLevel && getProposalLevelLabel(p.proposalTypeCode) !== targetLevelLabel) return false;
      if (selectedMilitaryScope && getProposalMilitaryScopeLabel(getProposalMilitaryScope(p)) !== targetScopeLabel) return false;
      if (progressFilter && p.assessment !== progressFilter) return false;
      if (!fundingRestricted && disbursementFilter) {
        if (disbursementFilter === "zero" && p.disbursedPercent > 0) return false;
        if (disbursementFilter === "partial" && (p.disbursedPercent === 0 || p.disbursedPercent >= 100)) return false;
        if (disbursementFilter === "full" && p.disbursedPercent < 100) return false;
      }
      if (irbFilter === "submitted" && p.ethicsStatus !== "submitted") return false;
      if (irbFilter === "draft" && p.ethicsStatus !== "draft") return false;
      if (irbFilter === "none" && p.ethicsStatus !== null) return false;
      if (acceptanceFilter === "completed" && !p.isAcceptanceCompleted) return false;
      if (acceptanceFilter === "in_progress" && !p.isAcceptanceInProgress) return false;
      if (acceptanceFilter === "failed" && !p.isAcceptanceFailed) return false;
      if (acceptanceFilter === "pending" && (p.isAcceptanceCompleted || p.isAcceptanceInProgress || p.isAcceptanceFailed)) return false;
      return true;
    });
  }, [
    enhancedProposals,
    keyword,
    selectedUnit,
    statusFilter,
    selectedLevel,
    selectedMilitaryScope,
    progressFilter,
    fundingRestricted,
    disbursementFilter,
    irbFilter,
    acceptanceFilter
  ]);

  const metrics = useMemo(() => {
    let onTrackCount = 0;
    let endingSoonCount = 0;
    let overdueCount = 0;
    let notStartedCount = 0;
    let finishedCount = 0;
    let totalBudgetSum = 0;
    let totalDisbursedSum = 0;
    let ethicsSubmittedCount = 0;
    let acceptanceCompletedCount = 0;

    filteredProposals.forEach((p) => {
      totalBudgetSum += p.budgetTotal;
      totalDisbursedSum += p.disbursedTotal;
      if (p.ethicsStatus === "submitted") ethicsSubmittedCount++;
      if (p.isAcceptanceCompleted) acceptanceCompletedCount++;
      if (p.assessment === "on_track") onTrackCount++;
      else if (p.assessment === "ending_soon") endingSoonCount++;
      else if (p.assessment === "overdue") overdueCount++;
      else if (p.assessment === "not_started") notStartedCount++;
      else if (p.assessment === "finished") finishedCount++;
    });

    const averageDisbursedPercent = totalBudgetSum > 0 ? Math.round((totalDisbursedSum / totalBudgetSum) * 100) : 0;
    return {
      total: filteredProposals.length,
      onTrackCount,
      endingSoonCount,
      overdueCount,
      notStartedCount,
      finishedCount,
      totalBudgetSum,
      totalDisbursedSum,
      averageDisbursedPercent,
      ethicsSubmittedCount,
      acceptanceCompletedCount
    };
  }, [filteredProposals]);

  const unitProgressStats = useMemo(() => {
    const map = new Map<string, { name: string; total: number; onTrack: number; endingSoon: number; overdue: number }>();
    filteredProposals.forEach((p) => {
      const unitId = p.hostOrganizationUnitId || "unknown";
      const unitName = p.hostOrganizationUnitName || unitId;
      const current = map.get(unitId) ?? { name: unitName, total: 0, onTrack: 0, endingSoon: 0, overdue: 0 };
      current.total += 1;
      if (p.assessment === "on_track") current.onTrack += 1;
      else if (p.assessment === "ending_soon") current.endingSoon += 1;
      else if (p.assessment === "overdue") current.overdue += 1;
      map.set(unitId, current);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filteredProposals]);

  function assessmentLabel(p: (typeof filteredProposals)[number]) {
    if (p.assessment === "on_track") return { assessLabel: "Đang thực hiện đúng hạn", timeNote: `Còn ${p.remainingDays} ngày` };
    if (p.assessment === "ending_soon") return { assessLabel: "Sắp đến hạn kết thúc", timeNote: `Còn ${p.remainingDays} ngày` };
    if (p.assessment === "overdue") return { assessLabel: "Chậm tiến độ / Quá hạn", timeNote: `Quá hạn ${Math.abs(p.remainingDays)} ngày` };
    if (p.assessment === "not_started") {
      return {
        assessLabel: p.hasProject ? "Chưa đến thời gian bắt đầu" : "Chưa lập đề tài",
        timeNote: p.hasProject ? `Bắt đầu sau ${Math.abs(p.elapsedDays)} ngày` : "—"
      };
    }
    if (p.assessment === "finished") return { assessLabel: "Đã kết thúc thực hiện", timeNote: projectStatusLabel(p.projectStatus ?? "") };
    return { assessLabel: "Chưa xác định", timeNote: "—" };
  }

  function ethicsLabel(status: string | null) {
    if (status === "submitted") return "Đã nộp hồ sơ ĐĐ";
    if (status === "draft") return "Đang soạn hồ sơ ĐĐ";
    return "Chưa lập";
  }

  function acceptanceLabel(p: (typeof filteredProposals)[number]) {
    if (p.isAcceptanceCompleted) return "Đã nghiệm thu (Đạt)";
    if (p.isAcceptanceFailed) return "Không đạt";
    if (p.isAcceptanceInProgress) return "Chờ / đang nghiệm thu";
    if (p.acceptanceDossierStatus === "supplement_requested") return "Cần bổ sung hồ sơ NT";
    return "Chưa nghiệm thu";
  }

  async function exportToExcel() {
    const baseHeaders = [
      "STT",
      "Mã đề tài",
      "Tên đề tài nghiên cứu",
      "Cấp đề tài",
      "Phân loại Quân sự / Dân sự",
      "Chủ nhiệm đề tài",
      "Đơn vị chủ trì",
      "Ngày bắt đầu",
      "Ngày kết thúc"
    ];
    const fundingHeaders = fundingRestricted ? [] : ["Kinh phí duyệt (VNĐ)", "Đã giải ngân (VNĐ)", "Tỷ lệ giải ngân (%)"];
    const tailHeaders = [
      "Hồ sơ Đạo đức",
      "Nghiệm thu kết quả",
      "Trạng thái hồ sơ",
      "Tình trạng tiến độ",
      "Thời hạn còn lại / Quá hạn",
      "Tiến độ thực tế theo mốc (%)",
      "Tiến độ kế hoạch (%)",
      "SPI"
    ];

    const rows = filteredProposals.map((p, idx) => {
      const { assessLabel, timeNote } = assessmentLabel(p);
      const baseCols = [
        idx + 1,
        p.code || p.id,
        p.title,
        getProposalLevelLabel(p.proposalTypeCode),
        getProposalMilitaryScopeLabel(getProposalMilitaryScope(p)),
        p.ownerDisplayName || "—",
        p.hostOrganizationUnitName || p.hostOrganizationUnitId,
        formatDate(p.startDate),
        formatDate(p.endDate)
      ];
      const fundingCols = fundingRestricted ? [] : [p.budgetTotal, p.disbursedTotal, `${p.disbursedPercent}%`];
      const tailCols = [
        ethicsLabel(p.ethicsStatus),
        acceptanceLabel(p),
        STATUS_LABELS[p.status] ?? p.status,
        assessLabel,
        timeNote,
        p.progressPercent === null ? "" : `${p.progressPercent}%`,
        p.plannedPercent === null ? "" : `${p.plannedPercent}%`,
        p.spi === null ? "" : Number(p.spi.toFixed(2))
      ];
      return [...baseCols, ...fundingCols, ...tailCols];
    });

    await downloadXlsxReport({
      fileName: `Bao_cao_tien_do_de_tai_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Tiến độ đề tài",
      titleLines: [
        "HỌC VIỆN QUÂN Y - PHÒNG KHOA HỌC QUÂN SỰ",
        "BÁO CÁO TỔNG HỢP TÌNH HÌNH THỰC HIỆN VÀ TIẾN ĐỘ ĐỀ TÀI",
        `Ngày xuất báo cáo: ${new Date().toLocaleDateString("vi-VN")}`,
        `Người lập: ${account?.name || "Cán bộ quản lý"}`
      ],
      headers: [...baseHeaders, ...fundingHeaders, ...tailHeaders],
      widths: [
        6, 16, 44, 18, 18, 24, 26, 13, 13,
        ...(fundingRestricted ? [] : [18, 18, 14]),
        18, 20, 18, 22, 18, 14, 14, 8
      ],
      moneyColumns: fundingRestricted ? [] : [9, 10],
      rows,
      summary: [
        "",
        "TỔNG CỘNG",
        `${filteredProposals.length} đề tài`,
        "", "", "", "", "", "",
        ...(fundingRestricted ? [] : [metrics.totalBudgetSum, metrics.totalDisbursedSum, `${metrics.averageDisbursedPercent}%`]),
        `Đã nộp HS ĐĐ: ${metrics.ethicsSubmittedCount}`,
        `Đã nghiệm thu: ${metrics.acceptanceCompletedCount}`,
        "",
        `Đúng hạn: ${metrics.onTrackCount} | Sắp hết hạn: ${metrics.endingSoonCount} | Quá hạn: ${metrics.overdueCount}`,
        "", "", "", ""
      ]
    });
  }

  return (
    <div className="progress-report-container">
      <div className="report-action-bar no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Báo cáo Tình hình Thực hiện &amp; Tiến độ Đề tài KH&amp;CN
          </h2>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Theo dõi tiến độ theo mốc, cảnh báo trễ hạn và tình trạng hồ sơ đạo đức, nghiệm thu
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button type="button" className="button secondary" onClick={() => void loadData()} title="Làm mới dữ liệu">
            <RefreshCw size={15} aria-hidden="true" />
            Làm mới
          </button>
          <button type="button" className="button secondary" onClick={() => void exportToExcel()} disabled={filteredProposals.length === 0} title="Xuất tệp Excel (.xlsx)">
            <FileSpreadsheet size={15} aria-hidden="true" />
            Xuất Excel
          </button>
          <button type="button" className="button primary" onClick={() => window.print()} disabled={filteredProposals.length === 0} title="In báo cáo tiến độ hoặc lưu PDF">
            <Printer size={15} aria-hidden="true" />
            In báo cáo / PDF
          </button>
        </div>
      </div>

      <div className="print-only-header" style={{ display: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div style={{ textAlign: "center", fontSize: "13px" }}>
            <p style={{ margin: "0 0 2px 0", fontWeight: 600 }}>HỌC VIỆN QUÂN Y</p>
            <p style={{ margin: 0, fontWeight: 700, textDecoration: "underline" }}>PHÒNG KHOA HỌC QUÂN SỰ</p>
          </div>
          <div style={{ textAlign: "center", fontSize: "13px" }}>
            <p style={{ margin: "0 0 2px 0", fontWeight: 700 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style={{ margin: 0, fontWeight: 700, textDecoration: "underline" }}>Độc lập - Tự do - Hạnh phúc</p>
          </div>
        </div>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px 0", textTransform: "uppercase" }}>
            BÁO CÁO TÌNH HÌNH THỰC HIỆN VÀ TIẾN ĐỘ ĐỀ TÀI KH&amp;CN
          </h1>
          <p style={{ fontSize: "13px", fontStyle: "italic", margin: 0 }}>
            Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <div className="grid four-column no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        {!fundingRestricted ? (
          <>
            <KpiCard label="Tổng kinh phí đề tài" value={`${(metrics.totalBudgetSum / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`} meta="Tổng dự toán các đề tài đang lọc" tone="default" />
            <KpiCard label="Tổng giải ngân thực tế" value={`${(metrics.totalDisbursedSum / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`} meta={`Tỷ lệ đạt ${metrics.averageDisbursedPercent}% tổng dự toán`} tone="info" />
          </>
        ) : (
          <>
            <KpiCard label="Tổng số hồ sơ / đề tài" value={`${metrics.total}`} meta={`Đúng hạn: ${metrics.onTrackCount} · Quá hạn: ${metrics.overdueCount}`} tone="default" />
            <KpiCard label="Sắp đến hạn / Đã kết thúc" value={`${metrics.endingSoonCount + metrics.finishedCount}`} meta={`${metrics.endingSoonCount} sắp hết hạn · ${metrics.finishedCount} đã kết thúc`} tone="warning" />
          </>
        )}
        <KpiCard label="Hồ sơ Đạo đức Y sinh" value={`${metrics.ethicsSubmittedCount}`} meta="Đề tài đã nộp hồ sơ đạo đức" tone="info" />
        <KpiCard label="Đã nghiệm thu đạt" value={`${metrics.acceptanceCompletedCount}`} meta="Đề tài hoàn thành nghiệm thu" tone="default" />
      </div>

      <div className="grid two-column no-print" style={{ marginBottom: "20px" }}>
        <SectionCard title="Tỷ lệ tình trạng tiến độ thực hiện" subtitle="Tỷ lệ đề tài đúng hạn, sắp đến hạn và chậm tiến độ">
          {metrics.total === 0 ? (
            <p className="section-copy" style={{ fontStyle: "italic" }}>Chưa có dữ liệu đề tài.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "8px" }}>
              {[
                { label: `Đúng hạn (${metrics.onTrackCount} đề tài)`, count: metrics.onTrackCount, color: "var(--primary)" },
                { label: `Sắp đến hạn (< 60 ngày) (${metrics.endingSoonCount} đề tài)`, count: metrics.endingSoonCount, color: "var(--warning)" },
                { label: `Chậm tiến độ / Quá hạn (${metrics.overdueCount} đề tài)`, count: metrics.overdueCount, color: "var(--danger)" }
              ].map((item) => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600, color: item.color }}>{item.label}</span>
                    <span style={{ fontWeight: 700 }}>{Math.round((item.count / metrics.total) * 100)}%</span>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(item.count / metrics.total) * 100}%`, background: item.color, borderRadius: "4px" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Tình hình thực hiện theo Đơn vị chủ trì" subtitle="Thống kê số lượng đề tài đúng hạn và chậm tiến độ của từng đơn vị">
          {unitProgressStats.length === 0 ? (
            <p className="section-copy" style={{ fontStyle: "italic" }}>Chưa có dữ liệu đơn vị.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "6px" }}>
              {unitProgressStats.slice(0, 5).map((unit) => (
                <div key={unit.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: "var(--surface-muted)", borderRadius: "6px", fontSize: "13px" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{unit.name}</span>
                    <span style={{ color: "var(--text-secondary)", marginLeft: "6px" }}>({unit.total} đề tài)</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ padding: "2px 6px", background: "#f0fdf4", color: "#15803d", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{unit.onTrack} đúng hạn</span>
                    {unit.endingSoon > 0 ? <span style={{ padding: "2px 6px", background: "#fffbeb", color: "#b45309", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{unit.endingSoon} sắp hết hạn</span> : null}
                    {unit.overdue > 0 ? <span style={{ padding: "2px 6px", background: "#fef2f2", color: "#b91c1c", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>{unit.overdue} quá hạn</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="section-card no-print" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: 700 }}>
          <Filter size={16} aria-hidden="true" />
          <span>BỘ LỌC TÌNH HÌNH TIẾN ĐỘ THỰC HIỆN</span>
        </div>
        <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: 0 }}>
          <div className="filter-field">
            <label htmlFor="progress-search">Tìm kiếm đề tài / Chủ nhiệm</label>
            <input id="progress-search" type="text" placeholder="Nhập tên đề tài, mã số hoặc chủ nhiệm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="progress-level">Cấp quản lý đề tài</label>
            <select id="progress-level" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
              <option value="">Tất cả các cấp</option>
              <option value="national-level">Cấp Quốc gia</option>
              <option value="ministry-defense">Cấp Bộ Quốc phòng</option>
              <option value="sector-level">Cấp Ngành / Cục</option>
              <option value="academy-level">Cấp Học viện</option>
              <option value="base-level">Cấp Cơ sở</option>
              <option value="student-research">Sinh viên / Học viên NCKH</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="progress-military">Phân loại Quân sự / Dân sự</label>
            <select id="progress-military" value={selectedMilitaryScope} onChange={(e) => setSelectedMilitaryScope(e.target.value)}>
              <option value="">Tất cả tính chất</option>
              <option value="military">Quân sự - Quốc phòng</option>
              <option value="civil">Ngoài quân đội (Dân sự)</option>
              <option value="dual-use">Lưỡng dụng (Quân - Dân y)</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="progress-assessment">Đánh giá tiến độ</label>
            <select id="progress-assessment" value={progressFilter} onChange={(e) => setProgressFilter(e.target.value)}>
              <option value="">Tất cả tình trạng tiến độ</option>
              <option value="on_track">Đang thực hiện đúng hạn</option>
              <option value="ending_soon">Sắp đến hạn (&lt; 60 ngày)</option>
              <option value="overdue">Chậm tiến độ / Quá hạn</option>
              <option value="not_started">Chưa bắt đầu / Chưa lập đề tài</option>
              <option value="finished">Đã kết thúc thực hiện</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="progress-unit">Đơn vị chủ trì</label>
            <select id="progress-unit" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
              <option value="">Tất cả đơn vị</option>
              {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="progress-status">Trạng thái hồ sơ</label>
            <select id="progress-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="approved">Đã phê duyệt</option>
              <option value="ready_for_approval">Chờ phê duyệt</option>
              <option value="under_review">Đang thẩm định</option>
              <option value="submitted">Đã nộp</option>
              <option value="draft">Bản nháp</option>
            </select>
          </div>
          {!fundingRestricted ? (
            <div className="filter-field">
              <label htmlFor="progress-disbursement">Tiến độ giải ngân</label>
              <select id="progress-disbursement" value={disbursementFilter} onChange={(e) => setDisbursementFilter(e.target.value)}>
                <option value="">Tất cả mức giải ngân</option>
                <option value="zero">Chưa giải ngân (0%)</option>
                <option value="partial">Đang giải ngân (1% - 99%)</option>
                <option value="full">Đã giải ngân đủ (100%)</option>
              </select>
            </div>
          ) : null}
          <div className="filter-field">
            <label htmlFor="progress-irb">Hồ sơ Đạo đức (IRB)</label>
            <select id="progress-irb" value={irbFilter} onChange={(e) => setIrbFilter(e.target.value)}>
              <option value="">Tất cả trạng thái Đạo đức</option>
              <option value="submitted">Đã nộp hồ sơ đạo đức</option>
              <option value="draft">Đang soạn hồ sơ đạo đức</option>
              <option value="none">Chưa lập hồ sơ</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="progress-acceptance">Nghiệm thu đề tài</label>
            <select id="progress-acceptance" value={acceptanceFilter} onChange={(e) => setAcceptanceFilter(e.target.value)}>
              <option value="">Tất cả trạng thái nghiệm thu</option>
              <option value="completed">Đã nghiệm thu (Đạt)</option>
              <option value="in_progress">Đang / chờ nghiệm thu</option>
              <option value="failed">Không đạt</option>
              <option value="pending">Chưa nghiệm thu</option>
            </select>
          </div>
        </div>
      </div>

      <SectionCard title={`Bảng theo dõi tiến độ chi tiết (${filteredProposals.length} đề tài)`} subtitle="Chi tiết thời gian thực hiện, thời hạn còn lại và đánh giá tiến độ từng đề tài">
        {state === "loading" ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
            <p>Đang tổng hợp dữ liệu tiến độ thực hiện đề tài...</p>
          </div>
        ) : state === "error" ? (
          <EmptyState title="Lỗi tải dữ liệu tiến độ" message="Không thể kết nối đến máy chủ để lấy số liệu thực hiện đề tài. Vui lòng thử lại sau." />
        ) : filteredProposals.length === 0 ? (
          <EmptyState title="Không tìm thấy đề tài phù hợp" message="Không có đề tài nào khớp với điều kiện lọc tiến độ hiện tại. Hãy thử thay đổi bộ lọc." />
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                  <th style={{ width: "115px" }}>Mã đề tài</th>
                  <th style={{ minWidth: "220px" }}>Tên đề tài nghiên cứu</th>
                  <th style={{ width: "150px" }}>Cấp &amp; Phân loại</th>
                  <th style={{ width: "135px" }}>Chủ nhiệm (PI)</th>
                  <th style={{ width: "140px" }}>Đơn vị chủ trì</th>
                  <th style={{ width: "95px" }}>Bắt đầu</th>
                  <th style={{ width: "95px" }}>Kết thúc</th>
                  {!fundingRestricted ? <th style={{ width: "155px" }}>Kinh phí &amp; Giải ngân</th> : null}
                  <th style={{ width: "155px" }}>Nghiệm thu &amp; Đạo đức</th>
                  <th style={{ width: "145px" }}>Thời hạn &amp; Tiến độ</th>
                  <th style={{ width: "135px", textAlign: "center" }}>Đánh giá</th>
                  <th className="no-print" style={{ width: "65px", textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((p, index) => {
                  const scope = getProposalMilitaryScope(p);
                  return (
                    <tr key={p.id}>
                      <td style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>{index + 1}</td>
                      <td><Link className="record-title" href={`/proposals/${p.id}`}>{p.code || "Chưa cấp mã"}</Link></td>
                      <td>
                        <Link className="record-title" href={`/proposals/${p.id}`} style={{ fontWeight: 600 }}>{p.title}</Link>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
                          Hồ sơ: <strong>{STATUS_LABELS[p.status] ?? p.status}</strong>
                        </span>
                      </td>
                      <td>
                        <span style={{ display: "block", fontWeight: 600, fontSize: "12px" }}>{getProposalLevelLabel(p.proposalTypeCode)}</span>
                        <span style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)" }}>{getProposalMilitaryScopeLabel(scope)}</span>
                      </td>
                      <td>{p.ownerDisplayName || "—"}</td>
                      <td>{p.hostOrganizationUnitName || p.hostOrganizationUnitId}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDate(p.startDate)}</td>
                      <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>{formatDate(p.endDate)}</td>
                      {!fundingRestricted ? (
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: 700 }}>
                              <span style={{ color: "#166534" }}>{(p.disbursedTotal / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr</span>
                              <span style={{ color: "var(--text-secondary)" }}>{p.disbursedPercent}%</span>
                            </div>
                            <div style={{ height: "6px", background: "var(--surface-muted)", borderRadius: "3px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${p.disbursedPercent}%`, background: p.disbursedPercent >= 100 ? "#2563eb" : p.disbursedPercent > 0 ? "#16a34a" : "#94a3b8" }} />
                            </div>
                            <span style={{ fontSize: "10px", color: "var(--text-secondary)" }}>Duyệt: {(p.budgetTotal / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr</span>
                          </div>
                        </td>
                      ) : null}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }}>
                          <span style={{ fontWeight: 600 }}>{acceptanceLabel(p)}</span>
                          <span style={{ color: "var(--text-secondary)" }}>Đạo đức: {ethicsLabel(p.ethicsStatus)}</span>
                        </div>
                      </td>
                      <td>
                        {p.assessment === "on_track" ? (
                          <span style={{ color: "var(--primary)", fontWeight: 600 }}>Còn {p.remainingDays} ngày</span>
                        ) : p.assessment === "ending_soon" ? (
                          <span style={{ color: "var(--warning)", fontWeight: 700 }}>Còn {p.remainingDays} ngày</span>
                        ) : p.assessment === "overdue" ? (
                          <span style={{ color: "var(--danger)", fontWeight: 700 }}>Quá hạn {Math.abs(p.remainingDays)} ngày</span>
                        ) : p.assessment === "not_started" ? (
                          <span style={{ color: "var(--text-secondary)" }}>{p.hasProject ? `Bắt đầu sau ${Math.abs(p.elapsedDays)} ngày` : "Chưa lập đề tài"}</span>
                        ) : p.assessment === "finished" ? (
                          <span style={{ color: "var(--text-secondary)" }}>{projectStatusLabel(p.projectStatus ?? "")}</span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>Chưa có ngày kết thúc</span>
                        )}
                        {p.progressPercent !== null ? (
                          <>
                            <div style={{ height: "4px", background: "var(--surface-muted)", borderRadius: "2px", overflow: "hidden", marginTop: "4px" }}>
                              <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, p.progressPercent))}%`, background: p.assessment === "overdue" ? "var(--danger)" : p.assessment === "ending_soon" ? "var(--warning)" : "var(--primary)" }} />
                            </div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              Thực tế {p.progressPercent}%{p.plannedPercent !== null ? ` · KH ${p.plannedPercent}%` : ""}
                              {p.health ? ` · ${HEALTH_LABELS[p.health]}` : ""}
                            </div>
                          </>
                        ) : null}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {p.assessment === "on_track" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "#f0fdf4", color: "#15803d", borderRadius: "12px", fontSize: "12px", fontWeight: 600, border: "1px solid #bbf7d0" }}>
                            <CheckCircle2 size={13} /> Đúng hạn
                          </span>
                        ) : p.assessment === "ending_soon" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "#fffbeb", color: "#b45309", borderRadius: "12px", fontSize: "12px", fontWeight: 700, border: "1px solid #fde68a" }}>
                            <Clock3 size={13} /> Sắp hết hạn
                          </span>
                        ) : p.assessment === "overdue" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "#fef2f2", color: "#b91c1c", borderRadius: "12px", fontSize: "12px", fontWeight: 700, border: "1px solid #fecaca" }}>
                            <AlertTriangle size={13} /> Chậm tiến độ
                          </span>
                        ) : p.assessment === "finished" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "#eff6ff", color: "#1e40af", borderRadius: "12px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe" }}>
                            <CheckCircle2 size={13} /> Kết thúc
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "#f8fafc", color: "#64748b", borderRadius: "12px", fontSize: "12px", fontWeight: 500, border: "1px solid #e2e8f0" }}>
                            <Clock size={13} /> Chưa khởi động
                          </span>
                        )}
                      </td>
                      <td className="no-print" style={{ textAlign: "center" }}>
                        <Link className="button secondary" href={`/proposals/${p.id}`} style={{ padding: "4px 8px", fontSize: "12px" }} title="Xem chi tiết hồ sơ đề tài">
                          <Eye size={14} aria-hidden="true" />
                          Xem
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
