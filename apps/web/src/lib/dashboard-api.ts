import { getApiBaseUrl } from "@/lib/session";

export type ProjectHealthCode = "on_track" | "at_risk" | "delayed" | "completed";
export type DashboardSubject = "projects" | "proposals";
export type DrillDownMetric = "projects" | "overdue_projects" | "funding" | "proposals" | "products";
export type DashboardProductStatus = "accepted" | "failed" | "pending_acceptance" | "supplement_requested" | "draft";

export type DashboardFilters = {
  year?: string;
  unitId?: string;
  level?: string;
  field?: string;
  scope?: string;
  officerId?: string;
  status?: string;
  health?: ProjectHealthCode | "";
};

export type DashboardStatsResponse = {
  generatedAt: string;
  fundingRestricted: boolean;
  projects: {
    total: number;
    preparing: number;
    executing: number;
    paused: number;
    pendingAcceptance: number;
    accepted: number;
    failed: number;
    closed: number;
    overdue: number;
    approaching: number;
    byHealth: Record<ProjectHealthCode, number>;
    avgPlannedPercent: number;
    avgActualPercent: number;
    avgSpi: number;
  };
  proposals: {
    total: number;
    active: number;
    draft: number;
    submitted: number;
    supplementRequested: number;
    resubmitted: number;
    underReview: number;
    readyForApproval: number;
    approved: number;
    rejected: number;
  };
  funding: {
    approvedBudget: number;
    totalDisbursed: number;
    totalSettled: number;
    disbursementRate: number;
    proposalRequestedBudget: number;
  };
  products: {
    total: number;
    accepted: number;
    pendingAcceptance: number;
  };
  filterOptions: {
    years: number[];
    units: Array<{ id: string; code: string; name: string }>;
    levels: Array<{ code: string; label: string }>;
    fields: Array<{ code: string; label: string }>;
    scopes: Array<{ code: string; label: string }>;
    officers: Array<{ id: string; label: string }>;
    healths: Array<{ code: ProjectHealthCode; label: string }>;
  };
};

export type DistributionBucket = {
  key: string;
  code?: string;
  label: string;
  count: number;
  totalBudget: number;
  totalDisbursed: number;
  overdueCount: number;
};

export type UnitHealthRow = {
  unitId: string;
  unitCode: string;
  unitName: string;
  total: number;
  on_track: number;
  at_risk: number;
  delayed: number;
  completed: number;
};

export type DashboardDistributionResponse = {
  subject: DashboardSubject;
  fundingRestricted: boolean;
  totals: {
    count: number;
    totalBudget: number;
    totalDisbursed: number;
    totalSettled: number;
    overdueCount: number;
    completedCount: number;
  };
  byUnit: DistributionBucket[];
  byLevel: DistributionBucket[];
  byField: DistributionBucket[];
  byStatus: DistributionBucket[];
  byScope: DistributionBucket[];
  byOfficer: DistributionBucket[];
  byYear: DistributionBucket[];
  byHealth: DistributionBucket[];
  byUnitHealth: UnitHealthRow[];
};

export type TrendPoint = {
  date: string;
  live: boolean;
  total: number;
  on_track: number;
  at_risk: number;
  delayed: number;
  completed: number;
  plannedPercent: number;
  actualPercent: number;
  spi: number;
  overdueMilestones: number;
  lateReports: number;
  approvedBudget: number;
  disbursedAmount: number;
};

export type DashboardTrendsResponse = {
  from: string;
  to: string;
  today: string;
  fundingRestricted: boolean;
  points: TrendPoint[];
};

export type DashboardProductsResponse = {
  totals: {
    count: number;
    projectCount: number;
    acceptedCount: number;
    pendingCount: number;
  };
  byType: Array<{ key: string; label: string; count: number; acceptedCount: number }>;
  byStatus: Array<{ key: DashboardProductStatus; label: string; count: number }>;
};

export type DrillDownProjectRow = {
  kind: "project";
  id: string;
  code: string | null;
  proposalId: string;
  title: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  piName: string;
  officerId: string;
  officerName: string;
  levelLabel: string;
  fieldLabel: string;
  scopeLabel: string;
  year: number;
  status: string;
  statusLabel: string;
  health: ProjectHealthCode;
  healthLabel: string;
  plannedPercent: number;
  actualPercent: number;
  spi: number;
  overdueMilestones: number;
  maxDaysOverdue: number;
  lateReports: number;
  startDate: string | null;
  endDate: string | null;
  milestones: Array<{
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    isImportant: boolean;
    overdue: boolean;
  }>;
  totalBudget: number | null;
  totalDisbursed: number | null;
  totalSettled: number | null;
};

export type DrillDownProposalRow = {
  kind: "proposal";
  id: string;
  code: string | null;
  title: string;
  unitId: string;
  unitCode: string;
  unitName: string;
  piName: string;
  officerId: string;
  officerName: string;
  levelLabel: string;
  fieldLabel: string;
  scopeLabel: string;
  intakeTitle: string | null;
  year: number;
  status: string;
  statusLabel: string;
  submittedAt: string | null;
  totalBudget: number | null;
  totalDisbursed: null;
};

export type DrillDownProductRow = {
  kind: "product";
  key: string;
  projectId: string;
  projectCode: string | null;
  projectTitle: string;
  unitId: string;
  unitName: string;
  piName: string;
  year: number;
  name: string;
  type: string;
  typeLabel: string;
  description: string;
  productStatus: DashboardProductStatus;
  productStatusLabel: string;
};

export type DrillDownRow = DrillDownProjectRow | DrillDownProposalRow | DrillDownProductRow;

export type DashboardDrillDownResponse = {
  metric: DrillDownMetric;
  fundingRestricted: boolean;
  total: number;
  page: number;
  pageSize: number;
  items: DrillDownRow[];
};

export type DrillDownParams = DashboardFilters & {
  metric: DrillDownMetric;
  type?: string;
  productStatus?: DashboardProductStatus;
  page?: number;
  pageSize?: number;
};

export const HEALTH_LABELS: Record<ProjectHealthCode, string> = {
  on_track: "Đúng tiến độ",
  at_risk: "Nguy cơ trễ",
  delayed: "Chậm tiến độ",
  completed: "Đã hoàn thành"
};

export const FILTER_PARAM_KEYS = ["year", "unitId", "level", "field", "scope", "officerId", "status", "health"] as const;

export function readDashboardFilters(searchParams: { get(key: string): string | null }): DashboardFilters {
  const filters: DashboardFilters = {};
  for (const key of FILTER_PARAM_KEYS) {
    const raw = searchParams.get(key)?.trim();
    if (raw) {
      (filters as Record<string, string>)[key] = raw;
    }
  }
  return filters;
}

export function buildDashboardSearchParams(
  filters: DashboardFilters,
  extra?: Record<string, string | number | undefined>
): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of FILTER_PARAM_KEYS) {
    const val = filters[key]?.trim();
    if (val) params.set(key, val);
  }
  if (extra) {
    for (const [key, raw] of Object.entries(extra)) {
      if (raw === undefined || raw === null) continue;
      const val = String(raw).trim();
      if (val) params.set(key, val);
    }
  }
  return params;
}

async function fetchDashboardJson<T>(path: string, params?: URLSearchParams): Promise<T> {
  const qs = params && params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetch(`${getApiBaseUrl()}${path}${qs}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(
      new Error(typeof body.message === "string" ? body.message : "Không thể tải dữ liệu thống kê."),
      { code: body.code as string | undefined, status: response.status }
    );
  }
  return body as T;
}

function readDownloadFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const utf8Match = /filename\*=UTF-8''([^;\s]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // fall through
    }
  }
  const plainMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  return plainMatch?.[1] || fallback;
}

async function triggerExcelDownload(path: string, params: URLSearchParams, fallbackName: string): Promise<void> {
  const qs = params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetch(`${getApiBaseUrl()}${path}${qs}`, {
    credentials: "include"
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(typeof body.message === "string" ? body.message : "Không thể xuất tệp Excel.");
  }
  const blob = await response.blob();
  const fileName = readDownloadFilename(response.headers.get("Content-Disposition"), fallbackName);
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function loadDashboardStats(filters: DashboardFilters) {
  return fetchDashboardJson<DashboardStatsResponse>("/dashboard/stats", buildDashboardSearchParams(filters));
}

export function loadDashboardDistribution(subject: DashboardSubject, filters: DashboardFilters) {
  return fetchDashboardJson<DashboardDistributionResponse>(
    "/dashboard/distribution",
    buildDashboardSearchParams(filters, { subject })
  );
}

export function loadDashboardTrends(filters: DashboardFilters, range?: { from?: string; to?: string }) {
  return fetchDashboardJson<DashboardTrendsResponse>(
    "/dashboard/trends",
    buildDashboardSearchParams(filters, range)
  );
}

export function loadDashboardProducts(
  filters: DashboardFilters,
  extra?: { type?: string; productStatus?: DashboardProductStatus }
) {
  return fetchDashboardJson<DashboardProductsResponse>(
    "/dashboard/products",
    buildDashboardSearchParams(filters, extra)
  );
}

export function loadDashboardDrillDown(params: DrillDownParams) {
  const { metric, type, productStatus, page, pageSize, ...filters } = params;
  return fetchDashboardJson<DashboardDrillDownResponse>(
    "/dashboard/drill-down",
    buildDashboardSearchParams(filters, { metric, type, productStatus, page, pageSize })
  );
}

export function downloadProposalsExcel(filters: DashboardFilters) {
  return triggerExcelDownload(
    "/dashboard/export-proposals",
    buildDashboardSearchParams(filters),
    "ho-so-de-xuat.xlsx"
  );
}

export function downloadDrillDownExcel(params: Omit<DrillDownParams, "page" | "pageSize">) {
  const { metric, type, productStatus, ...filters } = params;
  return triggerExcelDownload(
    "/dashboard/drill-down/export",
    buildDashboardSearchParams(filters, { metric, type, productStatus }),
    `dashboard-${metric}.xlsx`
  );
}

const currencyCompact = new Intl.NumberFormat("vi-VN");

export function formatMoneyVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return `${currencyCompact.format(Math.round(amount))} đ`;
}

export function formatShortMoneyVnd(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")} tỷ`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")} tr`;
  return `${currencyCompact.format(Math.round(amount))} đ`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  let d = iso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const ms = new Date(iso).getTime();
    d = Number.isNaN(ms) ? iso.slice(0, 10) : new Date(ms + 7 * 3_600_000).toISOString().slice(0, 10);
  }
  const [y, m, day] = d.split("-");
  return day && m && y ? `${day}/${m}/${y}` : iso;
}
