"use client";

import { number } from "@/components/ui/ops-dash";
import { BucketTable, ChartCard, HBarChart, type Series } from "@/components/dashboard/viz";
import { formatMoneyVnd } from "@/lib/dashboard-api";

export type OfficerSummaryRow = {
  key: string;
  label: string;
  projects: number;
  overdue: number;
  proposals: number;
};

const SINGLE_SERIES: Series[] = [{ key: "count", label: "Số lượng", color: "var(--series-1)" }];

export function DrillLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="dash-cell-link" onClick={onClick}>
      {label}
    </button>
  );
}

export const BUDGET_COLUMN = { header: "Kinh phí được cấp", value: (bucket: { totalBudget: number }) => formatMoneyVnd(bucket.totalBudget) };

/** Thẻ phân bố đơn giản: bảng (nhãn mở drill-down, số lượng, một cột phụ tuỳ chọn) và biểu đồ cột một chuỗi. */
export function BucketChartCard<Bucket extends { key: string; label: string; count: number }>({
  title,
  subtitle,
  wide,
  refreshing,
  labelHeader,
  countHeader,
  extra,
  emptyText,
  buckets,
  canDrill = () => true,
  onDrill
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  refreshing: boolean;
  labelHeader: string;
  countHeader: string;
  extra?: { header: string; value: (bucket: Bucket) => string };
  emptyText?: string;
  buckets: Bucket[];
  canDrill?: (key: string) => boolean;
  onDrill: (key: string, label: string) => void;
}) {
  return (
    <ChartCard
      wide={wide}
      refreshing={refreshing}
      title={title}
      subtitle={subtitle}
      table={
        <BucketTable
          emptyText={emptyText}
          columns={[
            { key: "label", label: labelHeader },
            { key: "count", label: countHeader, numeric: true },
            ...(extra ? [{ key: "extra", label: extra.header, numeric: true }] : [])
          ]}
          rows={buckets.map((bucket) => ({
            key: bucket.key,
            cells: {
              label: canDrill(bucket.key) ? <DrillLink label={bucket.label} onClick={() => onDrill(bucket.key, bucket.label)} /> : bucket.label,
              count: number.format(bucket.count),
              ...(extra ? { extra: extra.value(bucket) } : {})
            }
          }))}
        />
      }
    >
      <HBarChart
        rows={buckets.map((bucket) => ({ key: bucket.key, label: bucket.label, values: { count: bucket.count }, clickable: canDrill(bucket.key) }))}
        series={SINGLE_SERIES}
        emptyText={emptyText}
        onSelect={onDrill}
      />
    </ChartCard>
  );
}

export function OfficerTable({
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
