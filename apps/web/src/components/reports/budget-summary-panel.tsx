"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatMoneyVnd,
  loadDashboardDistribution,
  type DashboardDistributionResponse,
  type DistributionBucket
} from "@/lib/dashboard-api";
import { getProposalLevelLabel } from "@/lib/proposal-classification";
import { downloadXlsxReport } from "@/lib/xlsx-export";

/**
 * Báo cáo kinh phí tổng hợp (cho PGĐ theo dõi và Phó phòng không phụ trách từng hồ sơ):
 * chỉ hiển thị tổng hợp theo đơn vị và cấp đề tài, không lộ kinh phí từng hồ sơ/đề tài.
 */
export function BudgetSummaryPanel() {
  const [proposals, setProposals] = useState<DashboardDistributionResponse | null>(null);
  const [projects, setProjects] = useState<DashboardDistributionResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([loadDashboardDistribution("proposals", {}), loadDashboardDistribution("projects", {})])
      .then(([proposalData, projectData]) => {
        setProposals(proposalData);
        setProjects(projectData);
      })
      .catch(() => setError("Không tải được báo cáo kinh phí tổng hợp."));
  }, []);

  async function exportSummaryExcel() {
    if (!projects) return;
    await downloadXlsxReport({
      fileName: `Bao_cao_kinh_phi_tong_hop_${new Date().toISOString().slice(0, 10)}.xlsx`,
      sheetName: "Tổng hợp kinh phí",
      titleLines: [
        "HỌC VIỆN QUÂN Y - PHÒNG KHOA HỌC QUÂN SỰ",
        "BÁO CÁO TỔNG HỢP KINH PHÍ ĐỀ TÀI KH&CN (SỐ LIỆU TỔNG HỢP)",
        `Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`
      ],
      headers: ["Phân nhóm", "Nhóm", "Số đề tài", "Kinh phí cấp (VND)", "Đã giải ngân (VND)"],
      widths: [20, 38, 14, 22, 22],
      moneyColumns: [3, 4],
      rows: [
        ...projects.byUnit.map((row) => ["Theo đơn vị", row.label || row.key, row.count, row.totalBudget ?? 0, row.totalDisbursed ?? 0]),
        ...projects.byLevel.map((row) => ["Theo cấp đề tài", getProposalLevelLabel(row.key), row.count, row.totalBudget ?? 0, row.totalDisbursed ?? 0])
      ],
      summary: ["TỔNG CỘNG", "Toàn phạm vi", projects.totals.count, projects.totals.totalBudget, projects.totals.totalDisbursed]
    });
  }

  if (error) return <p className="state-message error">{error}</p>;
  if (!proposals || !projects) return <p className="state-message">Đang tải báo cáo kinh phí tổng hợp...</p>;

  const renderGroupTable = (title: string, rows: DistributionBucket[], labelOf: (row: DistributionBucket) => string) => (
    <SectionCard title={title} subtitle="Số liệu tổng hợp, không hiển thị kinh phí từng đề tài">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nhóm</th>
              <th>Số đề tài</th>
              <th>Kinh phí cấp</th>
              <th>Đã giải ngân</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <td>{labelOf(row)}</td>
                <td>{row.count}</td>
                <td>{formatMoneyVnd(row.totalBudget ?? 0)}</td>
                <td>{formatMoneyVnd(row.totalDisbursed ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );

  return (
    <div className="grid">
      <div className="no-print" style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="button secondary" onClick={() => void exportSummaryExcel()}>
          <FileSpreadsheet size={15} aria-hidden="true" />
          Xuất Excel tổng hợp
        </button>
      </div>
      <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
        <KpiCard label="Dự toán hồ sơ đề xuất" value={formatMoneyVnd(proposals.totals.totalBudget)} meta={`${proposals.totals.count} hồ sơ`} />
        <KpiCard label="Kinh phí cấp cho đề tài" value={formatMoneyVnd(projects.totals.totalBudget)} meta={`${projects.totals.count} đề tài`} />
        <KpiCard label="Đã giải ngân" value={formatMoneyVnd(projects.totals.totalDisbursed)} meta={projects.totals.totalBudget ? `${Math.round((projects.totals.totalDisbursed / projects.totals.totalBudget) * 100)}% kinh phí cấp` : "—"} />
        <KpiCard label="Đã quyết toán" value={formatMoneyVnd(projects.totals.totalSettled)} meta="Tổng số đã quyết toán" />
      </div>
      {renderGroupTable("Kinh phí theo đơn vị chủ trì", projects.byUnit, (row) => row.label || row.key)}
      {renderGroupTable("Kinh phí theo cấp đề tài", projects.byLevel, (row) => getProposalLevelLabel(row.key))}
    </div>
  );
}
