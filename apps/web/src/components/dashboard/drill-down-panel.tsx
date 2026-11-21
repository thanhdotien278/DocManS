"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarRange, Download, List, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { ProjectGantt } from "@/components/dashboard/project-gantt";
import {
  downloadDrillDownExcel,
  formatMoneyVnd,
  formatShortDate,
  loadDashboardDrillDown,
  type DashboardDrillDownResponse,
  type DrillDownMetric,
  type DrillDownParams,
  type DrillDownProductRow,
  type DrillDownProjectRow,
  type DrillDownProposalRow
} from "@/lib/dashboard-api";

export type DrillDownSelection = DrillDownParams & {
  title: string;
  subtitle?: string;
};

function supportsGantt(metric: DrillDownMetric): boolean {
  return metric === "projects" || metric === "overdue_projects" || metric === "funding";
}

export function DrillDownPanel({
  selection,
  onClose
}: {
  selection: DrillDownSelection | null;
  onClose: () => void;
}) {
  const [viewMode, setViewMode] = useState<"table" | "gantt">("table");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<DashboardDrillDownResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPage(1);
    setViewMode("table");
    setData(null);
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    let cancelled = false;
    setIsLoading(true);
    setError("");

    const { title: _t, subtitle: _s, ...params } = selection;
    void loadDashboardDrillDown({ ...params, page, pageSize: 50 })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tải danh sách chi tiết.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selection, page]);

  if (!selection) return null;

  const activeData = data && data.metric === selection.metric ? data : null;
  const canShowGantt = supportsGantt(selection.metric);
  const totalPages = activeData ? Math.max(1, Math.ceil(activeData.total / activeData.pageSize)) : 1;

  const handleExport = async () => {
    setIsExporting(true);
    setError("");
    try {
      const { title: _t, subtitle: _s, page: _p, pageSize: _ps, ...exportParams } = selection;
      await downloadDrillDownExcel(exportParams);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể tải tệp Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog label={selection.title} onClose={onClose} className="drill-dialog">
      <div className="drill-panel">
        <header className="drill-head">
          <div>
            <h2 className="drill-title">{selection.title}</h2>
            <p className="drill-subtitle">
              {selection.subtitle ? `${selection.subtitle} · ` : ""}
              {activeData ? `${activeData.total} bản ghi khớp bộ lọc` : "Đang tải dữ liệu..."}
              {activeData?.fundingRestricted ? " · Chế độ giám sát: ẩn kinh phí từng dòng" : ""}
            </p>
          </div>

          <div className="drill-actions">
            {canShowGantt ? (
              <div className="drill-view-switch" role="group" aria-label="Chế độ hiển thị">
                <button
                  type="button"
                  className={`button ${viewMode === "table" ? "primary" : ""}`}
                  onClick={() => setViewMode("table")}
                >
                  <List size={15} aria-hidden="true" />
                  Danh sách
                </button>
                <button
                  type="button"
                  className={`button ${viewMode === "gantt" ? "primary" : ""}`}
                  onClick={() => setViewMode("gantt")}
                >
                  <CalendarRange size={15} aria-hidden="true" />
                  Gantt
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="button"
              onClick={() => void handleExport()}
              disabled={isExporting || isLoading}
            >
              <Download size={15} aria-hidden="true" />
              {isExporting ? "Đang xuất..." : "Tải Excel (.xlsx)"}
            </button>

            <button type="button" className="button" onClick={onClose} aria-label="Đóng bảng chi tiết">
              <X size={16} aria-hidden="true" />
              Đóng
            </button>
          </div>
        </header>

        {error ? (
          <div className="ops-dash-error" role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        <div className="drill-body">
          {isLoading || (!activeData && !error) ? (
            <p className="record-meta" role="status">
              Đang tải dữ liệu chi tiết...
            </p>
          ) : !activeData || activeData.items.length === 0 ? (
            <p className="viz-empty">Không có bản ghi nào khớp với điều kiện lọc hiện tại.</p>
          ) : viewMode === "gantt" && canShowGantt ? (
            <ProjectGantt projects={activeData.items as DrillDownProjectRow[]} />
          ) : selection.metric === "proposals" ? (
            <ProposalsTable rows={activeData.items as DrillDownProposalRow[]} />
          ) : selection.metric === "products" ? (
            <ProductsTable rows={activeData.items as DrillDownProductRow[]} />
          ) : (
            <ProjectsTable rows={activeData.items as DrillDownProjectRow[]} />
          )}
        </div>

        {activeData && totalPages > 1 ? (
          <footer className="drill-foot">
            <span className="record-meta">
              Trang {activeData.page} / {totalPages} ({activeData.total} bản ghi)
            </span>
            <div className="drill-pager">
              <button
                type="button"
                className="button"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trang trước
              </button>
              <button
                type="button"
                className="button"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Trang sau
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    </Dialog>
  );
}

function ProjectsTable({ rows }: { rows: DrillDownProjectRow[] }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách đề tài chi tiết">
      <table className="data-table drill-table">
        <thead>
          <tr>
            <th>Đề tài</th>
            <th>Đơn vị / Chủ nhiệm</th>
            <th>CV phụ trách</th>
            <th>Sức khoẻ</th>
            <th>Tiến độ (TT / KH)</th>
            <th>Kinh phí cấp</th>
            <th>Đã giải ngân</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link className="record-title" href={`/projects/${row.id}`}>
                  {row.code ? `${row.code} · ` : ""}
                  {row.title}
                </Link>
                <div className="record-meta">
                  {row.statusLabel} · {row.scopeLabel} · {formatShortDate(row.startDate)} → {formatShortDate(row.endDate)}
                </div>
              </td>
              <td>
                <div>{row.unitName}</div>
                <div className="record-meta">{row.piName}</div>
              </td>
              <td>{row.officerName}</td>
              <td>
                <span className={`drill-health-pill is-${row.health}`}>{row.healthLabel}</span>
                {row.maxDaysOverdue > 0 ? (
                  <div className="record-meta is-alert">Trễ {row.maxDaysOverdue} ngày</div>
                ) : null}
              </td>
              <td>
                <strong>
                  {row.actualPercent.toFixed(0)}% / {row.plannedPercent.toFixed(0)}%
                </strong>
                <div className="record-meta">SPI {row.spi.toFixed(2)}</div>
              </td>
              <td className="drill-num">{formatMoneyVnd(row.totalBudget)}</td>
              <td className="drill-num">{formatMoneyVnd(row.totalDisbursed)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProposalsTable({ rows }: { rows: DrillDownProposalRow[] }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách hồ sơ đề xuất chi tiết">
      <table className="data-table drill-table">
        <thead>
          <tr>
            <th>Hồ sơ đề xuất</th>
            <th>Đơn vị / Chủ nhiệm</th>
            <th>Phân loại</th>
            <th>CV phụ trách</th>
            <th>Trạng thái</th>
            <th>Ngày nộp</th>
            <th>Kinh phí</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link className="record-title" href={`/proposals/${row.id}`}>
                  {row.code ? `${row.code} · ` : ""}
                  {row.title}
                </Link>
                {row.intakeTitle ? <div className="record-meta">{row.intakeTitle}</div> : null}
              </td>
              <td>
                <div>{row.unitName}</div>
                <div className="record-meta">{row.piName}</div>
              </td>
              <td>
                <div>{row.levelLabel}</div>
                <div className="record-meta">
                  {row.scopeLabel} · {row.fieldLabel}
                </div>
              </td>
              <td>{row.officerName}</td>
              <td>{row.statusLabel}</td>
              <td>{formatShortDate(row.submittedAt)}</td>
              <td className="drill-num">{formatMoneyVnd(row.totalBudget)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductsTable({ rows }: { rows: DrillDownProductRow[] }) {
  return (
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Danh sách sản phẩm nghiệm thu">
      <table className="data-table drill-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Loại sản phẩm</th>
            <th>Trạng thái nghiệm thu</th>
            <th>Đề tài nguồn</th>
            <th>Đơn vị / Chủ nhiệm</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <strong>{row.name}</strong>
                {row.description ? <div className="record-meta">{row.description}</div> : null}
              </td>
              <td>{row.typeLabel}</td>
              <td>
                <span className={`drill-product-pill is-${row.productStatus}`}>{row.productStatusLabel}</span>
              </td>
              <td>
                <Link className="record-title" href={`/projects/${row.projectId}/acceptance-dossier`}>
                  {row.projectCode ? `${row.projectCode} · ` : ""}
                  {row.projectTitle}
                </Link>
              </td>
              <td>
                <div>{row.unitName}</div>
                <div className="record-meta">{row.piName}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
