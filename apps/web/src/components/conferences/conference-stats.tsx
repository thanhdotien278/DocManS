"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChartCard, HBarChart, type Series } from "@/components/dashboard/viz";
import { formatIntakeDate } from "@/lib/intake-dates";
import {
  CONFERENCE_LEVEL_LABELS,
  CONFERENCE_STATUS_LABELS,
  conferenceStatsExportUrl,
  formatRate,
  getConferenceStats,
  type ConferenceLevel,
  type ConferenceStats,
  type ConferenceStatsFilters,
  type ConferenceStatus
} from "@/lib/conferences-api";

const SINGLE: Series[] = [{ key: "count", label: "Số lượng", color: "var(--series-1)" }];
const count = (value: number) => value.toLocaleString("vi-VN");
type VisibleStats = Extract<ConferenceStats, { visible: true }>;
type Bucket = VisibleStats["byStatus"][number];

/** Số liệu thống kê hội nghị theo bộ lọc; null khi đang tải lần đầu, { visible: false } khi người xem không có hội nghị nào. */
export function useConferenceStats(filters: ConferenceStatsFilters) {
  const [stats, setStats] = useState<ConferenceStats | null>(null);
  const [error, setError] = useState("");
  const key = JSON.stringify(filters);
  useEffect(() => {
    const controller = new AbortController();
    getConferenceStats(filters, controller.signal).then((result) => { setStats(result); setError(""); }).catch((cause) => {
      if ((cause as Error)?.name !== "AbortError") setError(cause instanceof Error ? cause.message : "Không tải được thống kê hội nghị.");
    });
    return () => controller.abort();
  }, [key]);
  return { stats, error };
}

function StatTile({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return <div className="dash-tile"><span className="dash-tile-label">{label}</span><span className="dash-tile-value">{value}</span>{meta ? <span className="dash-tile-meta">{meta}</span> : null}</div>;
}

function BucketTable({ rows, label }: { rows: Bucket[]; label: string }) {
  return <table className="data-table"><thead><tr><th>{label}</th><th className="numeric">Số lượng</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key}><td>{row.label}</td><td className="numeric">{count(row.count)}</td></tr>)}</tbody></table>;
}

function BucketChart({ title, subtitle, rows, label }: { title: string; subtitle?: string; rows: Bucket[]; label: string }) {
  return <ChartCard title={title} subtitle={subtitle} table={<BucketTable rows={rows} label={label} />}>
    <HBarChart rows={rows.map((row) => ({ key: row.key, label: row.label, values: { count: row.count } }))} series={SINGLE} format={count} />
  </ChartCard>;
}

/** Các ô số chính: số hội nghị, tỉ lệ nhận lời, tỉ lệ nộp toàn văn, đã xếp lịch. */
export function ConferenceStatTiles({ stats }: { stats: VisibleStats }) {
  const totals = stats.totals;
  return <div className="dash-tiles">
    <StatTile label="Hội nghị" value={count(totals.conferences)} meta={`${count(totals.completed)} đã kết thúc${totals.conferences - totals.active ? ` · ${count(totals.conferences - totals.active)} đã huỷ` : ""}`} />
    <StatTile label="Nhận lời" value={formatRate(totals.acceptanceRate)} meta={`${count(totals.accepted)}/${count(totals.invited)} khách mời · ${count(totals.awaiting)} chờ trả lời`} />
    <StatTile label="Nộp toàn văn" value={formatRate(totals.fullPaperRate)} meta={`${count(totals.fullPapers)}/${count(totals.speakers)} báo cáo viên · ${count(totals.abstracts)} đã nộp tóm tắt`} />
    <StatTile label="Đã xếp lịch" value={count(totals.scheduled)} meta={`${formatRate(totals.scheduledRate)} báo cáo viên${totals.withdrawn ? ` · ${count(totals.withdrawn)} báo cáo đã rút` : ""}`} />
  </div>;
}

function relabel(rows: Bucket[], label: (key: string) => string) {
  return rows.map((row) => ({ ...row, label: label(row.key) }));
}

/** Mục "Hội nghị khoa học" trên dashboard: theo bộ lọc Năm và Đơn vị của dashboard (đơn vị = đơn vị chủ trì). */
export function DashboardConferenceSection({ year, unitId }: { year?: string; unitId?: string }) {
  const { stats } = useConferenceStats({ year, hostUnitId: unitId });
  // Người không có hội nghị nào trong phạm vi (nhà nghiên cứu…): không hiện mục.
  if (!stats || !stats.visible || !stats.options.years.length) return null;
  return <>
    <h2 className="dash-section-title">Hội nghị khoa học</h2>
    <ConferenceStatTiles stats={stats} />
    <div className="dash-grid">
      <BucketChart title="Hội nghị theo năm" rows={stats.byYear} label="Năm" />
      <BucketChart title="Báo cáo viên theo đơn vị" subtitle="Báo cáo viên đã nhận lời, chưa rút báo cáo." rows={stats.speakersByUnit} label="Đơn vị" />
    </div>
    <p><Link href="/reports?tab=conferences">Xem báo cáo hội nghị chi tiết</Link></p>
  </>;
}

/** Tab "Hội nghị khoa học" trên trang Báo cáo: bộ lọc riêng, biểu đồ, bảng theo hội nghị và theo phiên, xuất Excel. */
export function ConferenceReportPanel() {
  const [filters, setFilters] = useState<ConferenceStatsFilters>({});
  const { stats, error } = useConferenceStats(filters);
  if (error) return <p role="alert">{error}</p>;
  if (!stats) return <p>Đang tải…</p>;
  if (!stats.visible) return <p>Không có hội nghị nào trong phạm vi của bạn.</p>;
  const set = (key: keyof ConferenceStatsFilters) => (event: { target: { value: string } }) => setFilters({ ...filters, [key]: event.target.value || undefined });
  return <div className="form-section-inline">
    <div className="form-grid two no-print">
      <label className="field"><span>Năm</span><select value={filters.year ?? ""} onChange={set("year")}><option value="">Tất cả</option>{stats.options.years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
      <label className="field"><span>Đơn vị chủ trì</span><select value={filters.hostUnitId ?? ""} onChange={set("hostUnitId")}><option value="">Tất cả</option>{stats.options.hostUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>
      <label className="field"><span>Cấp hội nghị</span><select value={filters.level ?? ""} onChange={set("level")}><option value="">Tất cả</option>{stats.options.levels.map((level) => <option key={level} value={level}>{CONFERENCE_LEVEL_LABELS[level]}</option>)}</select></label>
      <div className="button-row"><a className="button" href={conferenceStatsExportUrl(filters)}>Xuất Excel</a></div>
    </div>
    <ConferenceStatTiles stats={stats} />
    <div className="dash-grid">
      <BucketChart title="Theo trạng thái" rows={relabel(stats.byStatus, (key) => CONFERENCE_STATUS_LABELS[key as ConferenceStatus] ?? key)} label="Trạng thái" />
      <BucketChart title="Theo cấp hội nghị" rows={relabel(stats.byLevel, (key) => CONFERENCE_LEVEL_LABELS[key as ConferenceLevel] ?? key)} label="Cấp" />
      <BucketChart title="Theo đơn vị chủ trì" rows={stats.byHostUnit} label="Đơn vị" />
      <BucketChart title="Báo cáo viên theo đơn vị" subtitle="Báo cáo viên đã nhận lời, chưa rút báo cáo; người ngoài gom thành Ngoài Học viện." rows={stats.speakersByUnit} label="Đơn vị" />
    </div>

    <h2 className="dash-section-title">Theo từng hội nghị</h2>
    {!stats.perConference.length ? <p>Không có hội nghị phù hợp bộ lọc.</p> : <div className="table-wrap"><table className="data-table">
      <thead><tr><th>Mã</th><th>Tên hội nghị</th><th>Ngày</th><th>Trạng thái</th><th className="numeric">Đã mời</th><th className="numeric">Nhận lời</th><th className="numeric">Báo cáo viên</th><th className="numeric">Tóm tắt</th><th className="numeric">Toàn văn</th><th className="numeric">Đã xếp lịch</th><th className="numeric">Phiên</th></tr></thead>
      <tbody>{stats.perConference.map((row) => <tr key={row.id}>
        <td>{row.code}</td><td><Link href={`/conferences/${row.id}`}>{row.title}</Link><br /><small>{row.hostUnitName}</small></td><td>{formatIntakeDate(row.startsAt)}</td>
        <td>{CONFERENCE_STATUS_LABELS[row.status] ?? row.status}</td>
        <td className="numeric">{count(row.invited)}</td><td className="numeric">{count(row.accepted)}<br /><small>{formatRate(row.acceptanceRate)}</small></td>
        <td className="numeric">{count(row.speakers)}</td><td className="numeric">{count(row.abstracts)}</td><td className="numeric">{count(row.fullPapers)}<br /><small>{formatRate(row.fullPaperRate)}</small></td>
        <td className="numeric">{count(row.scheduled)}</td><td className="numeric">{count(row.sessions)}</td>
      </tr>)}</tbody>
    </table></div>}

    <h2 className="dash-section-title">Theo phiên và tiểu ban</h2>
    {!stats.tracks.length ? <p>Chưa có phiên nào được lập.</p> : <div className="table-wrap"><table className="data-table">
      <thead><tr><th>Hội nghị</th><th>Loại</th><th>Phiên</th><th className="numeric">Số báo cáo</th></tr></thead>
      <tbody>{stats.tracks.map((row, index) => <tr key={`${row.conferenceId}-${index}`}><td>{row.conferenceCode}</td><td>{row.kind === "plenary" ? "Phiên toàn thể" : "Tiểu ban"}</td><td>{row.name}</td><td className="numeric">{count(row.papers)}</td></tr>)}</tbody>
    </table></div>}
  </div>;
}
