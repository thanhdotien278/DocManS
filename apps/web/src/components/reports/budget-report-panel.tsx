"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Eye, FileSpreadsheet, Filter, Printer, RefreshCw } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { BudgetSummaryPanel } from "@/components/reports/budget-summary-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getProposalLevelLabel,
  getProposalMilitaryScope,
  getProposalMilitaryScopeLabel
} from "@/lib/proposal-classification";
import { loadResearchProposals, type ResearchProposal } from "@/lib/research-proposals-api";
import { formatVndNumber, numberToVietnameseWords } from "@/lib/vietnamese-currency";
import { downloadXlsxReport } from "@/lib/xlsx-export";

type LoadState = "loading" | "ready" | "error";

const SUMMARY_ONLY_ROLES = ["RESEARCH_OVERSIGHT_AUTHORITY", "RESEARCH_MANAGEMENT_DEPUTY_HEAD"];

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

function proposalBudgetAmount(proposal: ResearchProposal) {
  return Number(proposal.budgetMetadata?.approvedAmount ?? proposal.budgetMetadata?.amount ?? 0);
}

/** PGĐ theo dõi và Phó phòng chỉ xem báo cáo kinh phí tổng hợp; các vai trò được phép xem chi tiết từng hồ sơ. */
export function BudgetReportPanel() {
  const { account } = useSession();
  if (SUMMARY_ONLY_ROLES.includes(account?.systemRole ?? "")) return <BudgetSummaryPanel />;
  return <BudgetReportDetailPanel />;
}

function BudgetReportDetailPanel() {
  const { account } = useSession();
  const [state, setState] = useState<LoadState>("loading");
  const [proposals, setProposals] = useState<ResearchProposal[]>([]);
  const [keyword, setKeyword] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedMilitaryScope, setSelectedMilitaryScope] = useState("");

  async function loadData() {
    setState("loading");
    try {
      const data = await loadResearchProposals();
      setProposals(data);
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

  const filteredProposals = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const targetLevelLabel = selectedLevel ? getProposalLevelLabel(selectedLevel) : "";
    const targetScopeLabel = selectedMilitaryScope ? getProposalMilitaryScopeLabel(selectedMilitaryScope) : "";
    return proposals.filter((proposal) => {
      const matchKeyword =
        !kw ||
        proposal.title.toLowerCase().includes(kw) ||
        (proposal.code && proposal.code.toLowerCase().includes(kw)) ||
        (proposal.ownerDisplayName && proposal.ownerDisplayName.toLowerCase().includes(kw));
      const matchUnit = !selectedUnit || proposal.hostOrganizationUnitId === selectedUnit;
      const matchStatus = !selectedStatus || proposal.status === selectedStatus;
      const amount = proposalBudgetAmount(proposal);
      let matchBudget = true;
      if (budgetRange === "under_100m") matchBudget = amount > 0 && amount < 100_000_000;
      else if (budgetRange === "100m_500m") matchBudget = amount >= 100_000_000 && amount <= 500_000_000;
      else if (budgetRange === "500m_1b") matchBudget = amount > 500_000_000 && amount <= 1_000_000_000;
      else if (budgetRange === "over_1b") matchBudget = amount > 1_000_000_000;
      else if (budgetRange === "no_budget") matchBudget = amount === 0;
      const matchLevel = !selectedLevel || getProposalLevelLabel(proposal.proposalTypeCode) === targetLevelLabel;
      const matchMilitary = !selectedMilitaryScope || getProposalMilitaryScopeLabel(getProposalMilitaryScope(proposal)) === targetScopeLabel;
      return matchKeyword && matchUnit && matchStatus && matchBudget && matchLevel && matchMilitary;
    });
  }, [proposals, keyword, selectedUnit, selectedStatus, budgetRange, selectedLevel, selectedMilitaryScope]);

  const metrics = useMemo(() => {
    let totalBudget = 0;
    let approvedBudget = 0;
    let inReviewBudget = 0;
    let proposalsWithBudget = 0;
    let approvedCount = 0;
    let inReviewCount = 0;

    filteredProposals.forEach((p) => {
      const amt = proposalBudgetAmount(p);
      totalBudget += amt;
      if (amt > 0) proposalsWithBudget++;
      if (p.status === "approved") {
        approvedBudget += amt;
        approvedCount++;
      } else if (["under_review", "ready_for_approval", "submitted", "resubmitted"].includes(p.status)) {
        inReviewBudget += amt;
        inReviewCount++;
      }
    });

    const avgBudget = proposalsWithBudget > 0 ? Math.round(totalBudget / proposalsWithBudget) : 0;
    return {
      totalCount: filteredProposals.length,
      totalBudget,
      totalBudgetWords: numberToVietnameseWords(totalBudget),
      approvedBudget,
      approvedCount,
      inReviewBudget,
      inReviewCount,
      avgBudget,
      proposalsWithBudget
    };
  }, [filteredProposals]);

  const unitAllocations = useMemo(() => {
    const map = new Map<string, { name: string; count: number; totalBudget: number }>();
    filteredProposals.forEach((p) => {
      const unitId = p.hostOrganizationUnitId || "unknown";
      const unitName = p.hostOrganizationUnitName || unitId;
      const current = map.get(unitId) ?? { name: unitName, count: 0, totalBudget: 0 };
      current.count += 1;
      current.totalBudget += proposalBudgetAmount(p);
      map.set(unitId, current);
    });
    const total = metrics.totalBudget || 1;
    return Array.from(map.values())
      .sort((a, b) => b.totalBudget - a.totalBudget)
      .map((item) => ({ ...item, percent: Math.min(100, Math.round((item.totalBudget / total) * 100)) }));
  }, [filteredProposals, metrics.totalBudget]);

  const statusAllocations = useMemo(() => {
    const map = new Map<string, { label: string; count: number; totalBudget: number }>();
    filteredProposals.forEach((p) => {
      const st = p.status;
      const label = STATUS_LABELS[st] ?? p.statusLabel ?? st;
      const current = map.get(st) ?? { label, count: 0, totalBudget: 0 };
      current.count += 1;
      current.totalBudget += proposalBudgetAmount(p);
      map.set(st, current);
    });
    const total = metrics.totalBudget || 1;
    return Array.from(map.values())
      .sort((a, b) => b.totalBudget - a.totalBudget)
      .map((item) => ({ ...item, percent: Math.min(100, Math.round((item.totalBudget / total) * 100)) }));
  }, [filteredProposals, metrics.totalBudget]);

  async function exportToExcel() {
    await downloadXlsxReport({
      fileName: `Bao_cao_kinh_phi_de_tai_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Kinh phí đề tài",
      titleLines: [
        "HỌC VIỆN QUÂN Y - PHÒNG KHOA HỌC QUÂN SỰ",
        "BÁO CÁO TỔNG HỢP TÌNH HÌNH KINH PHÍ ĐỀ TÀI NGHIÊN CỨU KHOA HỌC",
        `Ngày xuất báo cáo: ${new Date().toLocaleDateString("vi-VN")}`,
        `Người lập: ${account?.name || "Cán bộ quản lý"}`
      ],
      headers: [
        "STT",
        "Mã đề tài",
        "Tên đề tài nghiên cứu",
        "Cấp đề tài",
        "Phân loại Quân sự / Dân sự",
        "Chủ nhiệm đề tài",
        "Đơn vị chủ trì",
        "Thời gian bắt đầu",
        "Thời gian kết thúc",
        "Trạng thái",
        "Kinh phí dự toán (VND)",
        "Bằng chữ",
        "Ghi chú nguồn kinh phí"
      ],
      widths: [6, 16, 48, 18, 18, 24, 26, 14, 14, 18, 18, 36, 30],
      moneyColumns: [10],
      rows: filteredProposals.map((p, idx) => {
        const amount = proposalBudgetAmount(p);
        return [
          idx + 1,
          p.code || p.id,
          p.title,
          getProposalLevelLabel(p.proposalTypeCode),
          getProposalMilitaryScopeLabel(getProposalMilitaryScope(p)),
          p.ownerDisplayName || "—",
          p.hostOrganizationUnitName || p.hostOrganizationUnitId,
          formatDate(p.startDate),
          formatDate(p.endDate),
          STATUS_LABELS[p.status] ?? p.status,
          amount,
          numberToVietnameseWords(amount),
          p.budgetMetadata?.note || "—"
        ];
      }),
      summary: ["", "TỔNG CỘNG", `${filteredProposals.length} đề tài`, "", "", "", "", "", "", "", metrics.totalBudget, metrics.totalBudgetWords, ""]
    });
  }

  return (
    <div className="budget-report-container">
      <div className="report-action-bar no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Báo cáo Tình hình Kinh phí Đề tài KH&amp;CN
          </h2>
          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            Tổng hợp từ cơ sở dữ liệu hồ sơ đề tài Học viện Quân y theo bộ lọc hiện tại
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
          <button type="button" className="button primary" onClick={() => window.print()} disabled={filteredProposals.length === 0} title="In báo cáo hoặc lưu định dạng PDF">
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
            BÁO CÁO TỔNG HỢP TÌNH HÌNH KINH PHÍ ĐỀ TÀI NGHIÊN CỨU KHOA HỌC
          </h1>
          <p style={{ fontSize: "13px", fontStyle: "italic", margin: 0 }}>
            Hà Nội, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
          </p>
        </div>
      </div>

      <div className="grid four-column no-print" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <KpiCard label="Tổng kinh phí" value={`${formatVndNumber(metrics.totalBudget)} VND`} meta={`${metrics.totalCount} đề tài trong phạm vi lọc`} tone="default" />
        <KpiCard label="Kinh phí đã phê duyệt" value={`${formatVndNumber(metrics.approvedBudget)} VND`} meta={`${metrics.approvedCount} đề tài đã phê duyệt`} tone="info" />
        <KpiCard label="Kinh phí đang xét duyệt" value={`${formatVndNumber(metrics.inReviewBudget)} VND`} meta={`${metrics.inReviewCount} đề tài đang đánh giá / chờ duyệt`} tone="warning" />
        <KpiCard label="Bình quân / đề tài" value={`${formatVndNumber(metrics.avgBudget)} VND`} meta={`Tính trên ${metrics.proposalsWithBudget} đề tài có dự toán`} tone="default" />
      </div>

      <div className="grid two-column no-print" style={{ marginBottom: "20px" }}>
        <SectionCard title="Cơ cấu kinh phí theo Đơn vị chủ trì" subtitle="Tỷ lệ phân bổ ngân sách giữa các Khoa, Viện, Bộ môn">
          {unitAllocations.length === 0 ? (
            <p className="section-copy" style={{ fontStyle: "italic" }}>Chưa có dữ liệu phân bổ theo đơn vị.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              {unitAllocations.slice(0, 5).map((item) => (
                <div key={item.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.name} <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>({item.count} đề tài)</span>
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                      {formatVndNumber(item.totalBudget)} VND ({item.percent}%)
                    </span>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max(item.percent, 3)}%`, background: "var(--primary)", borderRadius: "4px" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Phân bổ kinh phí theo Trạng thái hồ sơ" subtitle="Tình trạng xét duyệt và quyết định kinh phí các đề tài">
          {statusAllocations.length === 0 ? (
            <p className="section-copy" style={{ fontStyle: "italic" }}>Chưa có dữ liệu phân bổ theo trạng thái.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px" }}>
              {statusAllocations.map((item) => (
                <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {item.label} <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>({item.count} hồ sơ)</span>
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      {formatVndNumber(item.totalBudget)} VND ({item.percent}%)
                    </span>
                  </div>
                  <div style={{ height: "8px", background: "var(--surface-muted)", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.max(item.percent, 3)}%`, background: item.label.includes("phê duyệt") ? "var(--primary)" : "var(--info)", borderRadius: "4px" }} />
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
          <span>BỘ LỌC KINH PHÍ ĐỀ TÀI</span>
        </div>
        <div className="filter-bar" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: 0 }}>
          <div className="filter-field">
            <label htmlFor="budget-search">Tìm kiếm đề tài / Chủ nhiệm</label>
            <input id="budget-search" type="text" placeholder="Nhập tên đề tài, mã số hoặc chủ nhiệm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="budget-level">Cấp quản lý đề tài</label>
            <select id="budget-level" value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)}>
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
            <label htmlFor="budget-military">Phân loại Quân sự / Dân sự</label>
            <select id="budget-military" value={selectedMilitaryScope} onChange={(e) => setSelectedMilitaryScope(e.target.value)}>
              <option value="">Tất cả tính chất</option>
              <option value="military">Quân sự - Quốc phòng</option>
              <option value="civil">Ngoài quân đội (Dân sự)</option>
              <option value="dual-use">Lưỡng dụng (Quân - Dân y)</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="budget-unit">Đơn vị chủ trì</label>
            <select id="budget-unit" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
              <option value="">Tất cả đơn vị</option>
              {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="budget-status">Trạng thái hồ sơ</label>
            <select id="budget-status" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="approved">Đã phê duyệt</option>
              <option value="ready_for_approval">Chờ phê duyệt</option>
              <option value="under_review">Đang thẩm định</option>
              <option value="submitted">Đã nộp</option>
              <option value="draft">Bản nháp</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="budget-range">Mức kinh phí</label>
            <select id="budget-range" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)}>
              <option value="">Tất cả mức kinh phí</option>
              <option value="under_100m">Dưới 100 triệu VND</option>
              <option value="100m_500m">Từ 100 - 500 triệu VND</option>
              <option value="500m_1b">Từ 500 triệu - 1 tỷ VND</option>
              <option value="over_1b">Trên 1 tỷ VND</option>
              <option value="no_budget">Chưa khai báo kinh phí</option>
            </select>
          </div>
        </div>
      </div>

      <SectionCard title={`Danh mục chi tiết kinh phí đề tài (${filteredProposals.length} đề tài)`} subtitle="Chi tiết dự toán, đọc số thành chữ và ghi chú nguồn kinh phí của từng đề tài">
        {state === "loading" ? (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--text-secondary)" }}>
            <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 8px" }} />
            <p>Đang tổng hợp dữ liệu kinh phí đề tài...</p>
          </div>
        ) : state === "error" ? (
          <EmptyState title="Lỗi tải dữ liệu báo cáo" message="Không thể kết nối đến máy chủ để lấy số liệu kinh phí. Vui lòng thử lại sau." />
        ) : filteredProposals.length === 0 ? (
          <EmptyState title="Không tìm thấy đề tài phù hợp" message="Không có đề tài nào khớp với điều kiện lọc kinh phí hiện tại. Hãy thử thay đổi bộ lọc." />
        ) : (
          <div className="table-wrap">
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>STT</th>
                  <th style={{ width: "120px" }}>Mã đề tài</th>
                  <th style={{ minWidth: "240px" }}>Tên đề tài nghiên cứu</th>
                  <th style={{ width: "160px" }}>Cấp &amp; Phân loại</th>
                  <th style={{ width: "140px" }}>Chủ nhiệm (PI)</th>
                  <th style={{ width: "150px" }}>Đơn vị chủ trì</th>
                  <th style={{ width: "120px" }}>Trạng thái</th>
                  <th style={{ width: "150px", textAlign: "right" }}>Kinh phí (VND)</th>
                  <th style={{ minWidth: "180px" }}>Bằng chữ &amp; Ghi chú</th>
                  <th className="no-print" style={{ width: "70px", textAlign: "center" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((proposal, index) => {
                  const amount = proposalBudgetAmount(proposal);
                  const words = numberToVietnameseWords(amount);
                  const note = proposal.budgetMetadata?.note;
                  const scope = getProposalMilitaryScope(proposal);
                  return (
                    <tr key={proposal.id}>
                      <td style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "13px" }}>{index + 1}</td>
                      <td><Link className="record-title" href={`/proposals/${proposal.id}`}>{proposal.code || "Chưa cấp mã"}</Link></td>
                      <td>
                        <Link className="record-title" href={`/proposals/${proposal.id}`} style={{ fontWeight: 600 }}>{proposal.title}</Link>
                        <span className="record-meta" style={{ fontSize: "11px", display: "block" }}>Thời gian: {formatDate(proposal.startDate)} — {formatDate(proposal.endDate)}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontWeight: 600, fontSize: "12px", color: "var(--text-primary)" }}>{getProposalLevelLabel(proposal.proposalTypeCode)}</span>
                          <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{getProposalMilitaryScopeLabel(scope)}</span>
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{proposal.ownerDisplayName || "—"}</span></td>
                      <td><span style={{ fontSize: "13px" }}>{proposal.hostOrganizationUnitName || proposal.hostOrganizationUnitId}</span></td>
                      <td><StatusBadge status={proposal.status} /></td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <span style={{ fontWeight: 700, color: amount > 0 ? "var(--text-primary)" : "var(--text-secondary)" }}>{formatVndNumber(amount)} VND</span>
                      </td>
                      <td>
                        {amount > 0 ? (
                          <div style={{ fontSize: "12px" }}>
                            <span style={{ fontStyle: "italic", color: "var(--text-secondary)", display: "block" }}>{words}</span>
                            {note ? <span style={{ color: "var(--primary)", fontWeight: 500, fontSize: "11px", display: "block", marginTop: "2px" }}>Nguồn: {note}</span> : null}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontStyle: "italic", fontSize: "12px" }}>Chưa có dự toán</span>
                        )}
                      </td>
                      <td className="no-print" style={{ textAlign: "center" }}>
                        <Link className="button secondary" href={`/proposals/${proposal.id}`} style={{ padding: "4px 8px", fontSize: "12px" }} title="Xem chi tiết hồ sơ đề tài">
                          <Eye size={14} aria-hidden="true" />
                          Xem
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot style={{ background: "var(--surface-muted)", borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <tr>
                  <td colSpan={7} style={{ padding: "12px 16px", textAlign: "right", textTransform: "uppercase" }}>TỔNG CỘNG ({filteredProposals.length} đề tài):</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap", color: "var(--primary)", fontSize: "15px" }}>{formatVndNumber(metrics.totalBudget)} VND</td>
                  <td colSpan={2} style={{ padding: "12px 16px", fontSize: "12px", fontStyle: "italic", color: "var(--text-secondary)" }}>Bằng chữ: {metrics.totalBudgetWords || "Không đồng"}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="print-only-signatures" style={{ display: "none", marginTop: "40px", pageBreakInside: "avoid" }}>
        <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", fontSize: "13px" }}>
          <div style={{ width: "200px" }}>
            <p style={{ fontWeight: 700, margin: "0 0 60px 0" }}>NGƯỜI LẬP BÁO CÁO</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{account?.name || "Cán bộ quản lý"}</p>
          </div>
          <div style={{ width: "220px" }}>
            <p style={{ fontWeight: 700, margin: "0 0 60px 0" }}>TRƯỞNG PHÒNG KHQS</p>
            <p style={{ margin: 0, fontWeight: 600 }}>…………………</p>
          </div>
          <div style={{ width: "220px" }}>
            <p style={{ fontWeight: 700, margin: "0 0 60px 0" }}>THỦ TRƯỞNG HỌC VIỆN</p>
            <p style={{ margin: 0, fontWeight: 600 }}>…………………</p>
          </div>
        </div>
      </div>
    </div>
  );
}
