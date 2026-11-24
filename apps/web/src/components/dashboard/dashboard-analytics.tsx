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
import { BUDGET_COLUMN, BucketChartCard, DrillLink, OfficerTable, type OfficerSummaryRow } from "@/components/dashboard/dashboard-cards";
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
  const codeItems = (list: Array<{ code: string; label: string }> = []) => list.map((item) => ({ value: item.code, label: item.label }));
  const filterFields: Array<{ key: keyof DashboardFilters; id: string; label: string; all: string; items: Array<{ value: string; label: string }> }> = [
    { key: "year", id: "dash-year", label: "Năm", all: "Tất cả các năm", items: (options?.years ?? []).map((yr) => ({ value: String(yr), label: `Năm ${yr}` })) },
    { key: "unitId", id: "dash-unit", label: "Đơn vị chủ trì", all: "Tất cả đơn vị", items: (options?.units ?? []).map((u) => ({ value: u.id, label: u.name })) },
    { key: "level", id: "dash-level", label: "Cấp quản lý", all: "Tất cả cấp", items: codeItems(options?.levels) },
    { key: "field", id: "dash-field", label: "Lĩnh vực", all: "Tất cả lĩnh vực", items: codeItems(options?.fields) },
    { key: "scope", id: "dash-scope", label: "Tính chất", all: "Quân sự & Dân sự", items: codeItems(options?.scopes) },
    { key: "officerId", id: "dash-officer", label: "CV phụ trách", all: "Tất cả CV", items: (options?.officers ?? []).map((o) => ({ value: o.id, label: o.label })) },
    { key: "health", id: "dash-health", label: "Sức khoẻ đề tài", all: "Mọi trạng thái sức khoẻ", items: codeItems(options?.healths) }
  ];
  const refreshing = isLoading && Boolean(bundle);
  const openDrill = (selection: Partial<DrillDownSelection> & Pick<DrillDownSelection, "metric" | "title">) => setDrillDown({ ...filters, ...selection });
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
          {filterFields.map((field) => (
            <div className="filter-field" key={field.key}>
              <label htmlFor={field.id}>{field.label}</label>
              <select
                id={field.id}
                value={filters[field.key] ?? ""}
                onChange={(e) => updateFilterUrl({ [field.key]: e.target.value } as Partial<DashboardFilters>)}
              >
                <option value="">{field.all}</option>
                {field.items.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          ))}
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
                openDrill({
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
                openDrill({
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
                openDrill({
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
                openDrill({
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
                openDrill({
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
                  openDrill({
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
                  openDrill({
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
                            openDrill({
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
                                openDrill({
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
                              openDrill({
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
                  openDrill({
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
                              openDrill({
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
                  openDrill({
                    unitId,
                    metric: "funding",
                    title: `Kinh phí đề tài — ${label}`
                  })
                }
              />
            </ChartCard>

            <BucketChartCard refreshing={refreshing} title="Đề tài theo cấp quản lý" labelHeader="Cấp quản lý" countHeader="Số đề tài" extra={BUDGET_COLUMN}
              buckets={bundle.projectDist.byLevel}
              onDrill={(level, label) => openDrill({ level, metric: "projects", title: `Đề tài — Cấp: ${label}` })}
            />

            <BucketChartCard refreshing={refreshing} title="Đề tài theo trạng thái" labelHeader="Trạng thái" countHeader="Số đề tài"
              buckets={bundle.projectDist.byStatus}
              onDrill={(status, label) => openDrill({ status, metric: "projects", title: `Đề tài — ${label}` })}
            />
          </div>

          <h2 className="dash-section-title">Theo tính chất và chuyên viên phụ trách</h2>
          <div className="dash-grid">
            <BucketChartCard refreshing={refreshing} title="Đề tài theo tính chất" subtitle="Quân sự / Dân sự theo hồ sơ đề xuất gốc" labelHeader="Tính chất" countHeader="Số đề tài" extra={BUDGET_COLUMN}
              buckets={bundle.projectDist.byScope}
              onDrill={(scope, label) => openDrill({ scope, metric: "projects", title: `Đề tài — Tính chất: ${label}` })}
            />

            <BucketChartCard refreshing={refreshing} title="Hồ sơ đề xuất theo tính chất" labelHeader="Tính chất" countHeader="Số hồ sơ"
              buckets={bundle.proposalDist.byScope}
              onDrill={(scope, label) => openDrill({ scope, metric: "proposals", title: `Hồ sơ đề xuất — Tính chất: ${label}` })}
            />

            <ChartCard
              wide
              refreshing={refreshing}
              title="Theo chuyên viên phụ trách"
              subtitle="Khối lượng theo dõi đề tài, đề tài quá hạn và hồ sơ đề xuất theo từng chuyên viên"
              table={
                <OfficerTable
                  rows={officerRows}
                  onOpen={(officerId, metric, title) =>
                    openDrill({
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
                  openDrill({
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
            <BucketChartCard refreshing={refreshing} title="Sản phẩm theo loại" subtitle="Tổng hợp từ các hồ sơ nghiệm thu trong phạm vi được đọc" labelHeader="Loại sản phẩm" countHeader="Tổng số" extra={{ header: "Đã nghiệm thu", value: (bucket) => number.format(bucket.acceptedCount) }} emptyText="Chưa có sản phẩm trong hồ sơ nghiệm thu."
              buckets={bundle.products.byType}
              onDrill={(type, label) => openDrill({ type, metric: "products", title: `Sản phẩm nghiệm thu — ${label}` })}
            />

            <BucketChartCard refreshing={refreshing} title="Sản phẩm theo trạng thái nghiệm thu" labelHeader="Trạng thái nghiệm thu" countHeader="Số lượng" emptyText="Chưa có dữ liệu trạng thái nghiệm thu."
              buckets={bundle.products.byStatus}
              onDrill={(productStatus, label) => openDrill({ productStatus: productStatus as DashboardProductStatus, metric: "products", title: `Sản phẩm — ${label}` })}
            />
          </div>

          <h2 className="dash-section-title">Hồ sơ đề xuất</h2>
          <div className="dash-grid">
            <BucketChartCard wide refreshing={refreshing} title="Hồ sơ đề xuất theo đơn vị" labelHeader="Đơn vị chủ trì" countHeader="Số hồ sơ" extra={{ header: "Kinh phí", value: (bucket) => formatMoneyVnd(bucket.totalBudget) }}
              buckets={bundle.proposalDist.byUnit}
              onDrill={(unitId, label) => openDrill({ unitId, metric: "proposals", title: `Hồ sơ đề xuất — ${label}` })}
            />

            <BucketChartCard refreshing={refreshing} title="Hồ sơ đề xuất theo trạng thái" labelHeader="Trạng thái" countHeader="Số hồ sơ"
              buckets={bundle.proposalDist.byStatus}
              onDrill={(status, label) => openDrill({ status, metric: "proposals", title: `Hồ sơ đề xuất — ${label}` })}
            />

            <BucketChartCard refreshing={refreshing} title="Hồ sơ đề xuất theo cấp quản lý" labelHeader="Cấp quản lý" countHeader="Số hồ sơ" extra={{ header: "Kinh phí", value: (bucket) => formatMoneyVnd(bucket.totalBudget) }}
              buckets={bundle.proposalDist.byLevel}
              onDrill={(level, label) => openDrill({ level, metric: "proposals", title: `Hồ sơ đề xuất — Cấp: ${label}` })}
            />

            <BucketChartCard refreshing={refreshing} title="Hồ sơ đề xuất theo lĩnh vực" labelHeader="Lĩnh vực" countHeader="Số hồ sơ"
              buckets={bundle.proposalDist.byField}
              onDrill={(field, label) => openDrill({ field, metric: "proposals", title: `Hồ sơ đề xuất — Lĩnh vực: ${label}` })}
            />

            <BucketChartCard refreshing={refreshing} title="Hồ sơ đề xuất theo năm nộp" labelHeader="Năm" countHeader="Số hồ sơ" canDrill={(key) => /^\d{4}$/.test(key)}
              buckets={bundle.proposalDist.byYear}
              onDrill={(year, label) => openDrill({ year, metric: "proposals", title: `Hồ sơ đề xuất — Năm ${label}` })}
            />
          </div>
        </>
      ) : null}

      <DrillDownPanel selection={drillDown} onClose={() => setDrillDown(null)} />
    </div>
  );
}
