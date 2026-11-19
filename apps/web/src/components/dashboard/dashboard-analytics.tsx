"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FilterX, RefreshCw } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { dateTime, fullDate, number } from "@/components/ui/ops-dash";
import {
  BucketTable,
  ChartCard,
  HBarChart,
  SCurveChart,
  WeeklyHealthChart,
  type Series
} from "@/components/dashboard/viz";
import { UnitHealthHeatmap } from "@/components/dashboard/unit-health-heatmap";
import { DrillDownPanel, type DrillDownSelection } from "@/components/dashboard/drill-down-panel";
import {
  downloadDrillDownExcel,
  downloadProposalsExcel,
  FILTER_PARAM_KEYS,
  formatMoneyVnd,
  formatShortDate,
  formatShortMoneyVnd,
  HEALTH_LABELS,
  loadDashboardDistribution,
  loadDashboardProducts,
  loadDashboardStats,
  loadDashboardTrends,
  readDashboardFilters,
  type DashboardDistributionResponse,
  type DashboardFilters,
  type DashboardProductsResponse,
  type DashboardProductStatus,
  type DashboardStatsResponse,
  type DashboardTrendsResponse,
  type DistributionBucket,
  type ProjectHealthCode,
  type TrendPoint
} from "@/lib/dashboard-api";

type DashboardBundle = {
  stats: DashboardStatsResponse;
  projectDist: DashboardDistributionResponse;
  proposalDist: DashboardDistributionResponse;
  trends: DashboardTrendsResponse;
  products: DashboardProductsResponse;
};

type OfficerSummaryRow = {
  key: string;
  label: string;
  projects: number;
  overdue: number;
  proposals: number;
};

const SINGLE_SERIES: Series[] = [{ key: "count", label: "Số lượng", color: "var(--series-1)" }];
const BUDGET_SERIES: Series[] = [
  { key: "totalBudget", label: "Kinh phí được cấp", color: "var(--series-1)" },
  { key: "totalDisbursed", label: "Đã giải ngân", color: "var(--series-2)" }
];
const OFFICER_SERIES: Series[] = [
  { key: "count", label: "Đề tài", color: "var(--series-1)" },
  { key: "overdue", label: "Quá hạn", color: "var(--status-critical)" }
];
const HEALTH_COLUMNS: ProjectHealthCode[] = ["on_track", "at_risk", "delayed", "completed"];

function formatTrendDate(point: TrendPoint): string {
  return `${formatShortDate(point.date)}${point.live ? " (Hôm nay)" : ""}`;
}

function mergeOfficers(
  projectBuckets: DistributionBucket[],
  proposalBuckets: DistributionBucket[]
): OfficerSummaryRow[] {
  const map = new Map<string, OfficerSummaryRow>();
  const ensure = (bucket: DistributionBucket): OfficerSummaryRow =>
    map.get(bucket.key) ?? {
      key: bucket.key,
      label: bucket.label,
      projects: 0,
      overdue: 0,
      proposals: 0
    };

  for (const bucket of projectBuckets) {
    map.set(bucket.key, {
      ...ensure(bucket),
      projects: bucket.count,
      overdue: bucket.overdueCount
    });
  }
  for (const bucket of proposalBuckets) {
    map.set(bucket.key, {
      ...ensure(bucket),
      proposals: bucket.count
    });
  }

  return [...map.values()].sort(
    (a, b) =>
      Number(a.key === "unassigned") - Number(b.key === "unassigned") ||
      b.projects + b.proposals - (a.projects + a.proposals) ||
      a.label.localeCompare(b.label, "vi")
  );
}

function DrillLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="dash-cell-link" onClick={onClick}>
      {label}
    </button>
  );
}

function OfficerTable({
  rows,
  onOpen
}: {
  rows: OfficerSummaryRow[];
  onOpen: (
    officerId: string,
    metric: "projects" | "overdue_projects" | "proposals",
    title: string
  ) => void;
}) {
  return (
    <BucketTable
      columns={[
        { key: "label", label: "Chuyên viên phụ trách" },
        { key: "projects", label: "Đề tài", numeric: true },
        { key: "overdue", label: "Quá hạn", numeric: true },
        { key: "proposals", label: "Hồ sơ đề xuất", numeric: true }
      ]}
      rows={rows.map((row) => ({
        key: row.key,
        cells: {
          label: row.label,
          projects: row.projects ? (
            <DrillLink
              label={number.format(row.projects)}
              onClick={() => onOpen(row.key, "projects", `Đề tài phụ trách — ${row.label}`)}
            />
          ) : (
            "0"
          ),
          overdue: row.overdue ? (
            <DrillLink
              label={number.format(row.overdue)}
              onClick={() => onOpen(row.key, "overdue_projects", `Đề tài quá hạn — ${row.label}`)}
            />
          ) : (
            "0"
          ),
          proposals: row.proposals ? (
            <DrillLink
              label={number.format(row.proposals)}
              onClick={() => onOpen(row.key, "proposals", `Hồ sơ đề xuất — ${row.label}`)}
            />
          ) : (
            "0"
          )
        }
      }))}
    />
  );
}

export function DashboardAnalytics() {
  const { account } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => readDashboardFilters(searchParams), [searchParams]);
  const hasActiveFilters = useMemo(() => FILTER_PARAM_KEYS.some((key) => Boolean(filters[key])), [filters]);
  const requestIdRef = useRef(0);
  const [bundle, setBundle] = useState<DashboardBundle | null>(null);
  const [cachedOptions, setCachedOptions] = useState<DashboardStatsResponse["filterOptions"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState<"" | "projects" | "proposals">("");
  const [error, setError] = useState("");
  const [drillDown, setDrillDown] = useState<DrillDownSelection | null>(null);

  const updateFilterUrl = useCallback(
    (patch: Partial<DashboardFilters> | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (patch === null) {
        for (const key of FILTER_PARAM_KEYS) next.delete(key);
      } else {
        for (const [key, raw] of Object.entries(patch)) {
          const val = raw?.trim() ?? "";
          if (val) next.set(key, val);
          else next.delete(key);
        }
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const refresh = useCallback(async () => {
    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setError("");
    try {
      const [stats, projectDist, proposalDist, trends, products] = await Promise.all([
        loadDashboardStats(filters),
        loadDashboardDistribution("projects", filters),
        loadDashboardDistribution("proposals", filters),
        loadDashboardTrends(filters),
        loadDashboardProducts(filters)
      ]);
      if (reqId !== requestIdRef.current) return;
      setBundle({ stats, projectDist, proposalDist, trends, products });
      setCachedOptions((prev) => (!hasActiveFilters || prev === null ? stats.filterOptions : prev));
    } catch (err: unknown) {
      if (reqId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "Không thể tải số liệu thống kê phân tích.");
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters, hasActiveFilters]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleExportProposals = async () => {
    setIsExporting("proposals");
    setError("");
    try {
      await downloadProposalsExcel(filters);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể xuất danh sách hồ sơ đề xuất.");
    } finally {
      setIsExporting("");
    }
  };

  const handleExportProjects = async () => {
    setIsExporting("projects");
    setError("");
    try {
      await downloadDrillDownExcel({ ...filters, metric: "projects" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không thể xuất danh sách đề tài.");
    } finally {
      setIsExporting("");
    }
  };

  const options = bundle?.stats.filterOptions ?? cachedOptions;
  const refreshing = isLoading && Boolean(bundle);
  const fundingUnits = useMemo(
    () => (bundle?.projectDist.byUnit ?? []).filter((b) => b.totalBudget > 0 || b.totalDisbursed > 0),
    [bundle]
  );
  const officerRows = useMemo(
    () => (bundle ? mergeOfficers(bundle.projectDist.byOfficer, bundle.proposalDist.byOfficer) : []),
    [bundle]
  );

  return (
    <div className="viz-root dash-shell">
      <Breadcrumb items={[{ label: "Dashboard" }, { label: "Thống kê & Phân tích" }]} />
      <PageHeader
        eyebrow={account?.systemRoleLabel ?? "Phân tích & Điều hành"}
        title="Thống kê & Phân tích khoa học"
        description="Tổng hợp tiến độ, sức khoẻ theo tuần, đường cong S, bản đồ nhiệt đơn vị, kinh phí, hồ sơ đề xuất và sản phẩm nghiệm thu trong phạm vi được phân quyền."
        actions={
          <div className="dash-header-actions">
            <button
              type="button"
              className="button"
              onClick={() => void refresh()}
              disabled={isLoading}
            >
              <RefreshCw size={15} aria-hidden="true" className={isLoading ? "spin" : undefined} />
              {isLoading ? "Đang tải" : "Làm mới"}
            </button>
            <button
              type="button"
              className="button"
              onClick={() => void handleExportProposals()}
              disabled={isExporting !== "" || isLoading}
            >
              <FileSpreadsheet size={15} aria-hidden="true" />
              {isExporting === "proposals" ? "Đang xuất..." : "Xuất đề xuất (.xlsx)"}
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => void handleExportProjects()}
              disabled={isExporting !== "" || isLoading}
            >
              <Download size={15} aria-hidden="true" />
              {isExporting === "projects" ? "Đang xuất..." : "Xuất đề tài (.xlsx)"}
            </button>
          </div>
        }
      />

      <section className="dash-filters" aria-label="Bộ lọc thống kê đồng bộ URL">
        <div className="dash-filter-grid">
          <div className="filter-field">
            <label htmlFor="dash-year">Năm</label>
            <select
              id="dash-year"
              value={filters.year ?? ""}
              onChange={(e) => updateFilterUrl({ year: e.target.value })}
            >
              <option value="">Tất cả các năm</option>
              {(options?.years ?? []).map((yr) => (
                <option key={yr} value={String(yr)}>
                  Năm {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="dash-unit">Đơn vị chủ trì</label>
            <select
              id="dash-unit"
              value={filters.unitId ?? ""}
              onChange={(e) => updateFilterUrl({ unitId: e.target.value })}
            >
              <option value="">Tất cả đơn vị</option>
              {(options?.units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="dash-level">Cấp quản lý</label>
            <select
              id="dash-level"
              value={filters.level ?? ""}
              onChange={(e) => updateFilterUrl({ level: e.target.value })}
            >
              <option value="">Tất cả cấp</option>
              {(options?.levels ?? []).map((lv) => (
                <option key={lv.code} value={lv.code}>
                  {lv.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="dash-field">Lĩnh vực</label>
            <select
              id="dash-field"
              value={filters.field ?? ""}
              onChange={(e) => updateFilterUrl({ field: e.target.value })}
            >
              <option value="">Tất cả lĩnh vực</option>
              {(options?.fields ?? []).map((fd) => (
                <option key={fd.code} value={fd.code}>
                  {fd.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="dash-scope">Tính chất</label>
            <select
              id="dash-scope"
              value={filters.scope ?? ""}
              onChange={(e) => updateFilterUrl({ scope: e.target.value })}
            >
              <option value="">Quân sự & Dân sự</option>
              {(options?.scopes ?? []).map((sc) => (
                <option key={sc.code} value={sc.code}>
                  {sc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="dash-officer">CV phụ trách</label>
            <select
              id="dash-officer"
              value={filters.officerId ?? ""}
              onChange={(e) => updateFilterUrl({ officerId: e.target.value })}
            >
              <option value="">Tất cả CV</option>
              {(options?.officers ?? []).map((ofc) => (
                <option key={ofc.id} value={ofc.id}>
                  {ofc.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="dash-health">Sức khoẻ đề tài</label>
            <select
              id="dash-health"
              value={filters.health ?? ""}
              onChange={(e) => updateFilterUrl({ health: e.target.value as ProjectHealthCode | "" })}
            >
              <option value="">Mọi trạng thái sức khoẻ</option>
              {(options?.healths ?? []).map((hl) => (
                <option key={hl.code} value={hl.code}>
                  {hl.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters ? (
          <div className="dash-filter-bar-foot">
            <button type="button" className="button" onClick={() => updateFilterUrl(null)}>
              <FilterX size={15} aria-hidden="true" />
              Xoá bộ lọc
            </button>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="ops-dash-error" role="alert">
          <p>{error}</p>
          <button type="button" className="button" onClick={() => void refresh()}>
            Thử lại
          </button>
        </div>
      ) : null}

      {!bundle && isLoading ? (
        <p className="record-meta" role="status">
          Đang tổng hợp số liệu thống kê...
        </p>
      ) : null}

      {bundle ? (
        <>
          <p className="record-meta dash-stamp">
            Cập nhật lúc {dateTime.format(new Date(bundle.stats.generatedAt)).slice(6)} ngày{" "}
            {fullDate.format(new Date(bundle.stats.generatedAt))}. Nhấn vào bất kỳ thẻ KPI, thanh biểu đồ, ô bản đồ
            nhiệt hoặc chuyển sang chế độ Bảng trên từng thẻ để xem số liệu và mở chi tiết (kèm Gantt & xuất Excel).
          </p>

          <section className="dash-kpi-grid" aria-label="Chỉ số tổng hợp chính">
            <button
              type="button"
              className="dash-kpi-card"
              onClick={() =>
                setDrillDown({
                  ...filters,
                  metric: "projects",
                  title: "Danh sách đề tài trong phạm vi",
                  subtitle: "Hỗ trợ xem tiến độ Gantt và tải Excel"
                })
              }
            >
              <span className="dash-kpi-label">Đề tài khoa học</span>
              <strong className="dash-kpi-value">{number.format(bundle.stats.projects.total)}</strong>
              <span className="dash-kpi-meta">
                {bundle.stats.projects.executing} đang thực hiện · {bundle.stats.projects.byHealth.completed} hoàn thành
              </span>
            </button>

            <button
              type="button"
              className={`dash-kpi-card ${bundle.stats.projects.overdue > 0 ? "is-danger" : ""}`}
              onClick={() =>
                setDrillDown({
                  ...filters,
                  metric: "overdue_projects",
                  title: "Đề tài quá hạn cần đôn đốc",
                  subtitle: "Có mốc thực hiện, điểm báo cáo hoặc thời hạn đã quá hạn"
                })
              }
            >
              <span className="dash-kpi-label">Đề tài chậm / quá hạn</span>
              <strong className="dash-kpi-value">{number.format(bundle.stats.projects.overdue)}</strong>
              <span className="dash-kpi-meta">
                {bundle.stats.projects.approaching} đề tài sắp đến hạn (14 ngày)
              </span>
            </button>

            <button
              type="button"
              className="dash-kpi-card is-info"
              onClick={() =>
                setDrillDown({
                  ...filters,
                  metric: "funding",
                  title: "Phân tích kinh phí đề tài",
                  subtitle: bundle.stats.fundingRestricted
                    ? "Vai trò giám sát chỉ hiển thị số tổng hợp"
                    : "Sắp xếp theo kinh phí được phê duyệt"
                })
              }
            >
              <span className="dash-kpi-label">Kinh phí được cấp</span>
              <strong className="dash-kpi-value">
                {formatShortMoneyVnd(bundle.stats.funding.approvedBudget)}
              </strong>
              <span className="dash-kpi-meta">
                Giải ngân {formatShortMoneyVnd(bundle.stats.funding.totalDisbursed)} (
                {bundle.stats.funding.disbursementRate}%)
              </span>
            </button>

            <button
              type="button"
              className="dash-kpi-card"
              onClick={() =>
                setDrillDown({
                  ...filters,
                  metric: "proposals",
                  title: "Danh sách hồ sơ đề xuất",
                  subtitle: "Theo phạm vi phân quyền hiện tại"
                })
              }
            >
              <span className="dash-kpi-label">Hồ sơ đề xuất</span>
              <strong className="dash-kpi-value">{number.format(bundle.stats.proposals.total)}</strong>
              <span className="dash-kpi-meta">
                {bundle.stats.proposals.approved} đã duyệt · {bundle.stats.proposals.underReview} đang đánh giá
              </span>
            </button>

            <button
              type="button"
              className="dash-kpi-card"
              onClick={() =>
                setDrillDown({
                  ...filters,
                  metric: "products",
                  title: "Sản phẩm từ hồ sơ nghiệm thu",
                  subtitle: "Tổng hợp từ các hồ sơ nghiệm thu được phép đọc"
                })
              }
            >
              <span className="dash-kpi-label">Sản phẩm nghiệm thu</span>
              <strong className="dash-kpi-value">{number.format(bundle.stats.products.total)}</strong>
              <span className="dash-kpi-meta">
                {bundle.stats.products.accepted} đã nghiệm thu · {bundle.stats.products.pendingAcceptance} chờ nghiệm thu
              </span>
            </button>
          </section>

          <h2 className="dash-section-title">Đề tài đang quản lý</h2>
          <div className="dash-grid">
            <ChartCard
              wide
              refreshing={refreshing}
              title="Xu hướng sức khoẻ đề tài theo tuần"
              subtitle={`Từ ${formatShortDate(bundle.trends.from)} đến ${formatShortDate(bundle.trends.to)} (điểm cuối là số liệu hiện tại theo giờ Việt Nam)`}
              table={
                <BucketTable
                  emptyText="Chưa có dữ liệu sức khoẻ theo tuần trong khoảng thời gian đã chọn."
                  columns={[
                    { key: "date", label: "Ngày" },
                    ...HEALTH_COLUMNS.map((key) => ({ key, label: HEALTH_LABELS[key], numeric: true })),
                    { key: "total", label: "Tổng", numeric: true }
                  ]}
                  rows={bundle.trends.points.map((point) => ({
                    key: point.date,
                    cells: {
                      date: formatTrendDate(point),
                      on_track: number.format(point.on_track),
                      at_risk: number.format(point.at_risk),
                      delayed: number.format(point.delayed),
                      completed: number.format(point.completed),
                      total: number.format(point.total)
                    }
                  }))}
                />
              }
            >
              <WeeklyHealthChart
                points={bundle.trends.points}
                onSelectHealth={(health) =>
                  setDrillDown({
                    ...filters,
                    health,
                    metric: "projects",
                    title: `Đề tài: ${HEALTH_LABELS[health]}`,
                    subtitle: "Lọc theo phân nhóm sức khoẻ"
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Đường cong S (Kế hoạch vs Thực tế & SPI)"
              subtitle="So sánh tỷ lệ hoàn thành mốc thực tế với tiến độ kế hoạch trung bình"
              table={
                <BucketTable
                  emptyText="Chưa có chuỗi dữ liệu tiến độ cho đường cong S."
                  columns={[
                    { key: "date", label: "Ngày" },
                    { key: "planned", label: "Kế hoạch", numeric: true },
                    { key: "actual", label: "Thực tế", numeric: true },
                    { key: "spi", label: "SPI", numeric: true }
                  ]}
                  rows={bundle.trends.points.map((point) => ({
                    key: point.date,
                    cells: {
                      date: formatTrendDate(point),
                      planned: `${point.plannedPercent.toFixed(1)}%`,
                      actual: `${point.actualPercent.toFixed(1)}%`,
                      spi: point.spi.toFixed(2)
                    }
                  }))}
                />
              }
            >
              <SCurveChart
                points={bundle.trends.points}
                onDrillProjects={() =>
                  setDrillDown({
                    ...filters,
                    metric: "projects",
                    title: "Chi tiết tiến độ & chỉ số SPI các đề tài"
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Đơn vị × Sức khoẻ đề tài"
              subtitle="Nhấn vào từng ô để mở danh sách đề tài và biểu đồ Gantt tương ứng của đơn vị"
              table={
                <BucketTable
                  emptyText="Chưa có đề tài nào trong phạm vi lọc để lập bản đồ nhiệt đơn vị."
                  columns={[
                    { key: "unit", label: "Đơn vị chủ trì" },
                    ...HEALTH_COLUMNS.map((key) => ({ key, label: HEALTH_LABELS[key], numeric: true })),
                    { key: "total", label: "Tổng", numeric: true }
                  ]}
                  rows={bundle.projectDist.byUnitHealth.map((row) => ({
                    key: row.unitId,
                    cells: {
                      unit: (
                        <DrillLink
                          label={row.unitName}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              unitId: row.unitId,
                              metric: "projects",
                              title: row.unitName,
                              subtitle: "Danh sách đề tài của đơn vị"
                            })
                          }
                        />
                      ),
                      ...Object.fromEntries(
                        HEALTH_COLUMNS.map((col) => [
                          col,
                          row[col] > 0 ? (
                            <DrillLink
                              label={number.format(row[col])}
                              onClick={() =>
                                setDrillDown({
                                  ...filters,
                                  unitId: row.unitId,
                                  health: col,
                                  metric: "projects",
                                  title: `${row.unitName} — ${HEALTH_LABELS[col]}`,
                                  subtitle: "Lọc theo đơn vị & mức sức khoẻ"
                                })
                              }
                            />
                          ) : (
                            "0"
                          )
                        ])
                      ),
                      total:
                        row.total > 0 ? (
                          <DrillLink
                            label={number.format(row.total)}
                            onClick={() =>
                              setDrillDown({
                                ...filters,
                                unitId: row.unitId,
                                metric: "projects",
                                title: row.unitName,
                                subtitle: "Toàn bộ đề tài của đơn vị"
                              })
                            }
                          />
                        ) : (
                          "0"
                        )
                    }
                  }))}
                />
              }
            >
              <UnitHealthHeatmap
                rows={bundle.projectDist.byUnitHealth}
                onSelectCell={({ unitId, unitName, health }) =>
                  setDrillDown({
                    ...filters,
                    unitId,
                    ...(health ? { health } : {}),
                    metric: "projects",
                    title: `${unitName}${health ? ` — ${HEALTH_LABELS[health]}` : ""}`,
                    subtitle: "Drill-down từ bản đồ nhiệt Đơn vị × Sức khoẻ"
                  })
                }
              />
            </ChartCard>

            <ChartCard
              wide
              refreshing={refreshing}
              title="Kinh phí cấp & giải ngân theo đơn vị"
              subtitle="So sánh tổng kinh phí được cấp và kinh phí đã giải ngân theo đơn vị chủ trì"
              table={
                <BucketTable
                  emptyText="Chưa có số liệu kinh phí được cấp trong phạm vi hiển thị."
                  columns={[
                    { key: "label", label: "Đơn vị chủ trì" },
                    { key: "count", label: "Số đề tài", numeric: true },
                    { key: "budget", label: "Kinh phí được cấp", numeric: true },
                    { key: "disbursed", label: "Đã giải ngân", numeric: true },
                    { key: "rate", label: "Tỷ lệ giải ngân", numeric: true }
                  ]}
                  rows={fundingUnits.map((unit) => {
                    const rate =
                      unit.totalBudget > 0 ? Math.round((unit.totalDisbursed / unit.totalBudget) * 100) : 0;
                    return {
                      key: unit.key,
                      cells: {
                        label: (
                          <DrillLink
                            label={unit.label}
                            onClick={() =>
                              setDrillDown({
                                ...filters,
                                unitId: unit.key,
                                metric: "funding",
                                title: `Kinh phí đề tài — ${unit.label}`
                              })
                            }
                          />
                        ),
                        count: number.format(unit.count),
                        budget: formatMoneyVnd(unit.totalBudget),
                        disbursed: formatMoneyVnd(unit.totalDisbursed),
                        rate: `${rate}%`
                      }
                    };
                  })}
                />
              }
            >
              <HBarChart
                rows={fundingUnits.map((unit) => ({
                  key: unit.key,
                  label: unit.label,
                  values: { totalBudget: unit.totalBudget, totalDisbursed: unit.totalDisbursed }
                }))}
                series={BUDGET_SERIES}
                format={formatShortMoneyVnd}
                emptyText="Chưa có số liệu kinh phí được cấp trong phạm vi hiển thị."
                onSelect={(unitId, label) =>
                  setDrillDown({
                    ...filters,
                    unitId,
                    metric: "funding",
                    title: `Kinh phí đề tài — ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Đề tài theo cấp quản lý"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Cấp quản lý" },
                    { key: "count", label: "Số đề tài", numeric: true },
                    { key: "budget", label: "Kinh phí được cấp", numeric: true }
                  ]}
                  rows={bundle.projectDist.byLevel.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              level: bucket.key,
                              metric: "projects",
                              title: `Đề tài — Cấp: ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count),
                      budget: formatMoneyVnd(bucket.totalBudget)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.projectDist.byLevel.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(level, label) =>
                  setDrillDown({
                    ...filters,
                    level,
                    metric: "projects",
                    title: `Đề tài — Cấp: ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Đề tài theo trạng thái"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Trạng thái" },
                    { key: "count", label: "Số đề tài", numeric: true }
                  ]}
                  rows={bundle.projectDist.byStatus.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              status: bucket.key,
                              metric: "projects",
                              title: `Đề tài — ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.projectDist.byStatus.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(status, label) =>
                  setDrillDown({
                    ...filters,
                    status,
                    metric: "projects",
                    title: `Đề tài — ${label}`
                  })
                }
              />
            </ChartCard>
          </div>

          <h2 className="dash-section-title">Theo tính chất và chuyên viên phụ trách</h2>
          <div className="dash-grid">
            <ChartCard
              refreshing={refreshing}
              title="Đề tài theo tính chất"
              subtitle="Quân sự / Dân sự theo hồ sơ đề xuất gốc"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Tính chất" },
                    { key: "count", label: "Số đề tài", numeric: true },
                    { key: "budget", label: "Kinh phí được cấp", numeric: true }
                  ]}
                  rows={bundle.projectDist.byScope.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              scope: bucket.key,
                              metric: "projects",
                              title: `Đề tài — Tính chất: ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count),
                      budget: formatMoneyVnd(bucket.totalBudget)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.projectDist.byScope.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(scope, label) =>
                  setDrillDown({
                    ...filters,
                    scope,
                    metric: "projects",
                    title: `Đề tài — Tính chất: ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Hồ sơ đề xuất theo tính chất"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Tính chất" },
                    { key: "count", label: "Số hồ sơ", numeric: true }
                  ]}
                  rows={bundle.proposalDist.byScope.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              scope: bucket.key,
                              metric: "proposals",
                              title: `Hồ sơ đề xuất — Tính chất: ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.proposalDist.byScope.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(scope, label) =>
                  setDrillDown({
                    ...filters,
                    scope,
                    metric: "proposals",
                    title: `Hồ sơ đề xuất — Tính chất: ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              wide
              refreshing={refreshing}
              title="Theo chuyên viên phụ trách"
              subtitle="Khối lượng theo dõi đề tài, đề tài quá hạn và hồ sơ đề xuất theo từng chuyên viên"
              table={
                <OfficerTable
                  rows={officerRows}
                  onOpen={(officerId, metric, title) =>
                    setDrillDown({
                      ...filters,
                      officerId,
                      metric,
                      title
                    })
                  }
                />
              }
            >
              <HBarChart
                rows={officerRows.map((row) => ({
                  key: row.key,
                  label: row.label,
                  values: { count: row.projects, overdue: row.overdue }
                }))}
                series={OFFICER_SERIES}
                onSelect={(officerId, label) =>
                  setDrillDown({
                    ...filters,
                    officerId,
                    metric: "projects",
                    title: `Đề tài phụ trách — ${label}`
                  })
                }
              />
            </ChartCard>
          </div>

          <h2 className="dash-section-title">Sản phẩm nghiệm thu</h2>
          <div className="dash-grid">
            <ChartCard
              refreshing={refreshing}
              title="Sản phẩm theo loại"
              subtitle="Tổng hợp từ các hồ sơ nghiệm thu trong phạm vi được đọc"
              table={
                <BucketTable
                  emptyText="Chưa có sản phẩm trong hồ sơ nghiệm thu."
                  columns={[
                    { key: "label", label: "Loại sản phẩm" },
                    { key: "count", label: "Tổng số", numeric: true },
                    { key: "accepted", label: "Đã nghiệm thu", numeric: true }
                  ]}
                  rows={bundle.products.byType.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              type: bucket.key,
                              metric: "products",
                              title: `Sản phẩm nghiệm thu — ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count),
                      accepted: number.format(bucket.acceptedCount)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.products.byType.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                emptyText="Chưa có sản phẩm trong hồ sơ nghiệm thu."
                onSelect={(type, label) =>
                  setDrillDown({
                    ...filters,
                    type,
                    metric: "products",
                    title: `Sản phẩm nghiệm thu — ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Sản phẩm theo trạng thái nghiệm thu"
              table={
                <BucketTable
                  emptyText="Chưa có dữ liệu trạng thái nghiệm thu."
                  columns={[
                    { key: "label", label: "Trạng thái nghiệm thu" },
                    { key: "count", label: "Số lượng", numeric: true }
                  ]}
                  rows={bundle.products.byStatus.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              productStatus: bucket.key,
                              metric: "products",
                              title: `Sản phẩm — ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.products.byStatus.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                emptyText="Chưa có dữ liệu trạng thái nghiệm thu."
                onSelect={(productStatus, label) =>
                  setDrillDown({
                    ...filters,
                    productStatus: productStatus as DashboardProductStatus,
                    metric: "products",
                    title: `Sản phẩm — ${label}`
                  })
                }
              />
            </ChartCard>
          </div>

          <h2 className="dash-section-title">Hồ sơ đề xuất</h2>
          <div className="dash-grid">
            <ChartCard
              wide
              refreshing={refreshing}
              title="Hồ sơ đề xuất theo đơn vị"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Đơn vị chủ trì" },
                    { key: "count", label: "Số hồ sơ", numeric: true },
                    { key: "budget", label: "Kinh phí", numeric: true }
                  ]}
                  rows={bundle.proposalDist.byUnit.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              unitId: bucket.key,
                              metric: "proposals",
                              title: `Hồ sơ đề xuất — ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count),
                      budget: formatMoneyVnd(bucket.totalBudget)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.proposalDist.byUnit.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(unitId, label) =>
                  setDrillDown({
                    ...filters,
                    unitId,
                    metric: "proposals",
                    title: `Hồ sơ đề xuất — ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Hồ sơ đề xuất theo trạng thái"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Trạng thái" },
                    { key: "count", label: "Số hồ sơ", numeric: true }
                  ]}
                  rows={bundle.proposalDist.byStatus.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              status: bucket.key,
                              metric: "proposals",
                              title: `Hồ sơ đề xuất — ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.proposalDist.byStatus.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(status, label) =>
                  setDrillDown({
                    ...filters,
                    status,
                    metric: "proposals",
                    title: `Hồ sơ đề xuất — ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Hồ sơ đề xuất theo cấp quản lý"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Cấp quản lý" },
                    { key: "count", label: "Số hồ sơ", numeric: true },
                    { key: "budget", label: "Kinh phí", numeric: true }
                  ]}
                  rows={bundle.proposalDist.byLevel.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              level: bucket.key,
                              metric: "proposals",
                              title: `Hồ sơ đề xuất — Cấp: ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count),
                      budget: formatMoneyVnd(bucket.totalBudget)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.proposalDist.byLevel.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(level, label) =>
                  setDrillDown({
                    ...filters,
                    level,
                    metric: "proposals",
                    title: `Hồ sơ đề xuất — Cấp: ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Hồ sơ đề xuất theo lĩnh vực"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Lĩnh vực" },
                    { key: "count", label: "Số hồ sơ", numeric: true }
                  ]}
                  rows={bundle.proposalDist.byField.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              field: bucket.key,
                              metric: "proposals",
                              title: `Hồ sơ đề xuất — Lĩnh vực: ${bucket.label}`
                            })
                          }
                        />
                      ),
                      count: number.format(bucket.count)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.proposalDist.byField.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count }
                }))}
                series={SINGLE_SERIES}
                onSelect={(field, label) =>
                  setDrillDown({
                    ...filters,
                    field,
                    metric: "proposals",
                    title: `Hồ sơ đề xuất — Lĩnh vực: ${label}`
                  })
                }
              />
            </ChartCard>

            <ChartCard
              refreshing={refreshing}
              title="Hồ sơ đề xuất theo năm nộp"
              table={
                <BucketTable
                  columns={[
                    { key: "label", label: "Năm" },
                    { key: "count", label: "Số hồ sơ", numeric: true }
                  ]}
                  rows={bundle.proposalDist.byYear.map((bucket) => ({
                    key: bucket.key,
                    cells: {
                      label: /^\d{4}$/.test(bucket.key) ? (
                        <DrillLink
                          label={bucket.label}
                          onClick={() =>
                            setDrillDown({
                              ...filters,
                              year: bucket.key,
                              metric: "proposals",
                              title: `Hồ sơ đề xuất — Năm ${bucket.label}`
                            })
                          }
                        />
                      ) : (
                        bucket.label
                      ),
                      count: number.format(bucket.count)
                    }
                  }))}
                />
              }
            >
              <HBarChart
                rows={bundle.proposalDist.byYear.map((b) => ({
                  key: b.key,
                  label: b.label,
                  values: { count: b.count },
                  clickable: /^\d{4}$/.test(b.key)
                }))}
                series={SINGLE_SERIES}
                onSelect={(year, label) =>
                  setDrillDown({
                    ...filters,
                    year,
                    metric: "proposals",
                    title: `Hồ sơ đề xuất — Năm ${label}`
                  })
                }
              />
            </ChartCard>
          </div>
        </>
      ) : null}

      <DrillDownPanel selection={drillDown} onClose={() => setDrillDown(null)} />
    </div>
  );
}
