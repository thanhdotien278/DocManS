"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { HEALTH_LABELS, type ProjectHealthCode, type TrendPoint } from "@/lib/dashboard-api";

export type Series = {
  key: string;
  label: string;
  color: string;
};

export type TableColumn = {
  key: string;
  label: string;
  numeric?: boolean;
};

export type TableRow = {
  key: string;
  cells: Record<string, ReactNode>;
};

export type HBarRow = {
  key: string;
  label: string;
  values: Record<string, number>;
  clickable?: boolean;
};

type TooltipState = {
  x: number;
  y: number;
  title: string;
  rows: Array<{ color: string; value: string; label: string }>;
} | null;

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function niceScale(max: number, ticks = 4, integer = false) {
  if (!(max > 0)) return { max: ticks, step: 1 };
  const rough = max / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const factors = integer && magnitude < 10 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const step =
    factors.map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ??
    10 * magnitude;
  const rounded = Math.max(1, integer ? Math.round(step) : step);
  return { max: Math.ceil(max / rounded) * rounded, step: rounded };
}

function compactAxisNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} N`;
  }
  return value.toLocaleString("vi-VN");
}

function shortWeekLabel(isoDate: string): string {
  const parts = isoDate.slice(0, 10).split("-");
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : isoDate;
}

function Tooltip({ state, width }: { state: TooltipState; width: number }) {
  if (!state) return null;
  const left = Math.max(0, Math.min(state.x + 12, Math.max(0, width - 260)));
  return (
    <div className="viz-tooltip" style={{ left, top: Math.max(0, state.y) }} aria-hidden="true">
      <div className="viz-tooltip-title">{state.title}</div>
      {state.rows.map((row) => (
        <div className="viz-tooltip-row" key={row.label}>
          <span className="viz-swatch line" style={{ background: row.color }} aria-hidden="true" />
          <strong>{row.value}</strong>
          <span>{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function tooltipText(state: TooltipState): string {
  return state
    ? `${state.title}: ${state.rows.map((row) => `${row.label} ${row.value}`).join(", ")}`
    : "";
}

export function ChartCard({
  title,
  subtitle,
  table,
  action,
  refreshing,
  wide,
  className = "",
  children
}: {
  title: string;
  subtitle?: string;
  table?: ReactNode;
  action?: ReactNode;
  refreshing?: boolean;
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const showTable = view === "table" && Boolean(table);

  return (
    <section className={`chart-card${wide ? " wide" : ""}${className ? ` ${className}` : ""}`}>
      <header className="chart-card-head">
        <div>
          <h3 className="chart-card-title">{title}</h3>
          {subtitle ? <p className="chart-card-subtitle">{subtitle}</p> : null}
        </div>
        {table || action ? (
          <div className="chart-card-head-actions">
            {action}
            {table ? (
              <div className="view-toggle" role="group" aria-label={`Cách xem: ${title}`}>
                <button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")}>
                  Biểu đồ
                </button>
                <button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>
                  Bảng
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
      <div className={`chart-card-body${refreshing ? " is-refreshing" : ""}`} aria-busy={refreshing || undefined}>
        {showTable ? (
          <div className="table-wrap chart-table-wrap" tabIndex={0} role="region" aria-label={`Bảng số liệu: ${title}`}>
            {table}
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function BucketTable({
  columns,
  rows,
  emptyText = "Chưa có dữ liệu trong phạm vi lọc."
}: {
  columns: TableColumn[];
  rows: TableRow[];
  emptyText?: string;
}) {
  if (!rows.length) {
    return <p className="viz-empty">{emptyText}</p>;
  }

  return (
    <table className="data-table drill-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} scope="col" className={col.numeric ? "num" : undefined}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            {columns.map((col) => (
              <td key={col.key} className={col.numeric ? "num" : undefined}>
                {row.cells[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HBarChart({
  rows,
  series,
  format = (value: number) => value.toLocaleString("vi-VN"),
  emptyText = "Chưa có dữ liệu trong phạm vi lọc.",
  onSelect
}: {
  rows: HBarRow[];
  series: Series[];
  format?: (value: number) => string;
  emptyText?: string;
  onSelect?: (key: string, label: string) => void;
}) {
  if (!rows.length) {
    return <p className="viz-empty">{emptyText}</p>;
  }

  const max = Math.max(0, ...rows.flatMap((row) => series.map((item) => row.values[item.key] ?? 0)));

  return (
    <>
      {series.length > 1 ? (
        <ul className="viz-legend viz-legend-static" aria-label="Chú giải">
          {series.map((item) => (
            <li key={item.key}>
              <span className="viz-swatch" style={{ background: item.color }} aria-hidden="true" />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="hbar-list">
        {rows.map((row) => {
          const content = (
            <>
              <span className="hbar-label" title={row.label}>
                {row.label}
              </span>
              <span className="hbar-track">
                {series.map((item) => {
                  const value = row.values[item.key] ?? 0;
                  return (
                    <span className="hbar-line" key={item.key}>
                      <span
                        className="hbar-bar"
                        style={{
                          width: max > 0 && value > 0 ? `calc((100% - 88px) * ${value / max})` : 0,
                          minWidth: value > 0 ? 3 : 0,
                          background: item.color
                        }}
                        aria-hidden="true"
                      />
                      <span className="hbar-value">{format(value)}</span>
                    </span>
                  );
                })}
              </span>
            </>
          );
          const ariaLabel = `${row.label}: ${series
            .map((item) => `${item.label} ${format(row.values[item.key] ?? 0)}`)
            .join(", ")}`;
          return (
            <li key={row.key}>
              {onSelect && row.clickable !== false ? (
                <button
                  type="button"
                  className="hbar-row"
                  onClick={() => onSelect(row.key, row.label)}
                  aria-label={`${ariaLabel}. Xem danh sách chi tiết`}
                >
                  {content}
                </button>
              ) : (
                <div className="hbar-row" aria-label={ariaLabel}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

const HEALTH_SERIES: Array<{ key: ProjectHealthCode; color: string; tone: string }> = [
  { key: "on_track", color: "var(--status-good)", tone: "on_track" },
  { key: "at_risk", color: "var(--status-warning)", tone: "at_risk" },
  { key: "delayed", color: "var(--status-critical)", tone: "delayed" },
  { key: "completed", color: "var(--status-none)", tone: "completed" }
];

export function WeeklyHealthChart({
  points,
  onSelectHealth
}: {
  points: TrendPoint[];
  onSelectHealth?: (health: ProjectHealthCode) => void;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  if (!points.length) {
    return <p className="viz-empty">Chưa có dữ liệu sức khoẻ theo tuần trong khoảng thời gian đã chọn.</p>;
  }

  const height = 230;
  const margin = { top: 10, right: 12, bottom: 28, left: 42 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;
  const maxTotal = Math.max(0, ...points.map((p) => p.total));
  const scale = niceScale(maxTotal, 4, true);
  const band = points.length ? innerWidth / points.length : 0;
  const barWidth = Math.max(8, Math.min(28, band * 0.58));
  const y = (value: number) => innerHeight - (value / scale.max) * innerHeight;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(innerWidth / 76))));
  const latest = points[points.length - 1]!;

  const activePoint = active !== null ? points[active] : undefined;
  const tip: TooltipState = activePoint
    ? {
        x: margin.left + band * active! + band / 2,
        y: margin.top,
        title: `${shortWeekLabel(activePoint.date)}${activePoint.live ? " (Hôm nay)" : ""} · Tổng ${activePoint.total} đề tài`,
        rows: [...HEALTH_SERIES].reverse().map((series) => ({
          color: series.color,
          value: String(activePoint[series.key]),
          label: HEALTH_LABELS[series.key]
        }))
      }
    : null;

  return (
    <div className="viz-weekly">
      <ul className="viz-legend" aria-label="Chú giải sức khoẻ đề tài">
        {HEALTH_SERIES.map((series) => (
          <li key={series.key}>
            <button
              type="button"
              className="viz-legend-btn"
              onClick={() => onSelectHealth?.(series.key)}
              title={`Xem danh sách đề tài ${HEALTH_LABELS[series.key]}`}
            >
              <span className={`viz-swatch is-${series.tone}`} aria-hidden="true" />
              <span>{HEALTH_LABELS[series.key]}</span>
              <strong>{latest[series.key]}</strong>
            </button>
          </li>
        ))}
      </ul>

      <div ref={ref} className="viz-chart-wrap">
        {width > 0 ? (
          <div
            tabIndex={0}
            role="group"
            aria-label="Biểu đồ cột chồng sức khoẻ đề tài theo tuần. Dùng phím mũi tên trái/phải để xem từng tuần; bấm nút Bảng để xem toàn bộ số liệu."
            onFocus={() => {
              setKeyboard(true);
              setActive((curr) => curr ?? points.length - 1);
            }}
            onBlur={() => {
              setKeyboard(false);
              setActive(null);
            }}
            onKeyDown={(event) => {
              if (!points.length) return;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setActive((curr) => Math.max(0, (curr ?? points.length - 1) - 1));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setActive((curr) => Math.min(points.length - 1, (curr ?? 0) + 1));
              }
            }}
          >
            <svg className="viz-svg" width={width} height={height} aria-hidden="true" onMouseLeave={() => setActive(null)}>
              <g transform={`translate(${margin.left},${margin.top})`}>
                {Array.from({ length: Math.round(scale.max / scale.step) + 1 }, (_, idx) => idx * scale.step).map((tick) => (
                  <g key={tick}>
                    <line
                      x1={0}
                      x2={innerWidth}
                      y1={y(tick)}
                      y2={y(tick)}
                      stroke={tick === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
                      strokeWidth={1}
                    />
                    <text x={-8} y={y(tick)} dy="0.32em" textAnchor="end">
                      {compactAxisNumber(tick)}
                    </text>
                  </g>
                ))}

                {points.map((point, index) => {
                  let base = 0;
                  const x = band * index + (band - barWidth) / 2;
                  const visible = HEALTH_SERIES.filter((series) => point[series.key] > 0);
                  const topKey = visible[visible.length - 1]?.key;
                  const showTick =
                    index === points.length - 1 ||
                    (index % labelEvery === 0 && points.length - 1 - index >= Math.ceil(labelEvery * 0.6));

                  return (
                    <g key={point.date} onMouseMove={() => setActive(index)}>
                      <rect className="viz-hit" x={band * index} y={0} width={band} height={innerHeight} />
                      {active === index ? (
                        <rect
                          x={band * index}
                          y={0}
                          width={band}
                          height={innerHeight}
                          fill="var(--viz-ink)"
                          opacity={0.04}
                          pointerEvents="none"
                        />
                      ) : null}
                      {HEALTH_SERIES.map((series) => {
                        const value = point[series.key];
                        if (!value) return null;
                        const y0 = y(base);
                        base += value;
                        const y1 = y(base);
                        const gap = series.key === topKey || y0 - y1 <= 3 ? 0 : 2;
                        const h = Math.max(0.5, y0 - y1 - gap);
                        const yTop = y1 + gap;
                        const r = series.key === topKey ? Math.min(4, h, barWidth / 2) : 0;
                        const d = `M${x},${yTop + h} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barWidth - r} Q${x + barWidth},${yTop} ${x + barWidth},${yTop + r} V${yTop + h} Z`;
                        return (
                          <path
                            key={series.key}
                            d={d}
                            fill={series.color}
                            style={onSelectHealth ? { cursor: "pointer" } : undefined}
                            onClick={onSelectHealth ? () => onSelectHealth(series.key) : undefined}
                          />
                        );
                      })}
                      {showTick ? (
                        <text x={band * index + band / 2} y={innerHeight + 18} textAnchor="middle">
                          {shortWeekLabel(point.date)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        ) : (
          <div style={{ height }} />
        )}
        <Tooltip state={tip} width={width} />
        <span className="sr-only" aria-live="polite">
          {keyboard ? tooltipText(tip) : ""}
        </span>
      </div>
    </div>
  );
}

export function SCurveChart({
  points,
  onDrillProjects
}: {
  points: TrendPoint[];
  onDrillProjects?: () => void;
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [keyboard, setKeyboard] = useState(false);

  if (!points.length) {
    return <p className="viz-empty">Chưa có chuỗi dữ liệu tiến độ cho đường cong S.</p>;
  }

  const height = 220;
  const margin = { top: 12, right: 16, bottom: 28, left: 46 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;

  const xAt = (i: number) => (points.length <= 1 ? innerWidth / 2 : (i / (points.length - 1)) * innerWidth);
  const yAt = (pct: number) => innerHeight - (Math.min(100, Math.max(0, pct)) / 100) * innerHeight;

  const plannedPath = points
    .map((pt, idx) => `${idx === 0 ? "M" : "L"}${xAt(idx).toFixed(1)},${yAt(pt.plannedPercent).toFixed(1)}`)
    .join(" ");
  const actualPath = points
    .map((pt, idx) => `${idx === 0 ? "M" : "L"}${xAt(idx).toFixed(1)},${yAt(pt.actualPercent).toFixed(1)}`)
    .join(" ");
  const actualArea =
    points.length > 1
      ? `${actualPath} L${xAt(points.length - 1).toFixed(1)},${innerHeight.toFixed(1)} L${xAt(0).toFixed(1)},${innerHeight.toFixed(1)} Z`
      : "";

  const latest = points[points.length - 1]!;
  const spiTone = latest.spi >= 0.95 ? "good" : latest.spi >= 0.75 ? "warn" : "bad";
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(innerWidth / 76))));

  const hoveredPoint = hover !== null ? points[hover] : undefined;
  const tip: TooltipState = hoveredPoint
    ? {
        x: margin.left + xAt(hover!),
        y: margin.top,
        title: `${shortWeekLabel(hoveredPoint.date)}${hoveredPoint.live ? " (Hôm nay)" : ""}`,
        rows: [
          { color: "var(--warning)", value: `${hoveredPoint.plannedPercent.toFixed(1)}%`, label: "Kế hoạch" },
          { color: "var(--primary)", value: `${hoveredPoint.actualPercent.toFixed(1)}%`, label: "Thực tế" },
          { color: "var(--info)", value: hoveredPoint.spi.toFixed(2), label: "Chỉ số SPI" }
        ]
      }
    : null;

  const nearest = (clientX: number, element: SVGRectElement) => {
    if (points.length <= 1 || innerWidth <= 0) return 0;
    const box = element.getBoundingClientRect();
    const position = clientX - box.left - 8;
    return Math.max(0, Math.min(points.length - 1, Math.round((position / innerWidth) * (points.length - 1))));
  };

  return (
    <div className="viz-scurve">
      <div className="viz-scurve-summary">
        <div className="viz-metric-chip">
          <span className="viz-line-sample is-planned" aria-hidden="true" />
          <span>Kế hoạch TB:</span>
          <strong>{latest.plannedPercent.toFixed(1)}%</strong>
        </div>
        <div className="viz-metric-chip">
          <span className="viz-line-sample is-actual" aria-hidden="true" />
          <span>Thực tế TB:</span>
          <strong>{latest.actualPercent.toFixed(1)}%</strong>
        </div>
        <button
          type="button"
          className={`viz-spi-badge is-${spiTone}`}
          onClick={onDrillProjects}
          title="Nhấn để xem chi tiết tiến độ từng đề tài"
        >
          SPI {latest.spi.toFixed(2)}
        </button>
      </div>

      <div ref={ref} className="viz-chart-wrap">
        {width > 0 ? (
          <div
            tabIndex={0}
            role="group"
            aria-label={`Đường cong S: kế hoạch ${latest.plannedPercent.toFixed(1)}%, thực tế ${latest.actualPercent.toFixed(1)}%, chỉ số SPI ${latest.spi.toFixed(2)}. Dùng phím mũi tên trái/phải để xem từng điểm; bấm nút Bảng để xem toàn bộ số liệu.`}
            onFocus={() => {
              setKeyboard(true);
              setHover((curr) => curr ?? points.length - 1);
            }}
            onBlur={() => {
              setKeyboard(false);
              setHover(null);
            }}
            onKeyDown={(event) => {
              if (!points.length) return;
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                setHover((curr) => Math.max(0, (curr ?? points.length - 1) - 1));
              } else if (event.key === "ArrowRight") {
                event.preventDefault();
                setHover((curr) => Math.min(points.length - 1, (curr ?? 0) + 1));
              }
            }}
          >
            <svg className="viz-svg" width={width} height={height} aria-hidden="true">
              <g transform={`translate(${margin.left},${margin.top})`}>
                {[0, 25, 50, 75, 100].map((tick) => {
                  const y = yAt(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={0}
                        y1={y}
                        x2={innerWidth}
                        y2={y}
                        stroke={tick === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
                        strokeDasharray={tick === 0 ? undefined : "3 3"}
                        strokeWidth={1}
                      />
                      <text x={-8} y={y} dy="0.32em" textAnchor="end" className="viz-axis-text">
                        {tick}%
                      </text>
                    </g>
                  );
                })}

                {actualArea ? <path d={actualArea} className="viz-area-actual" /> : null}
                <path d={plannedPath} className="viz-path-planned" />
                <path d={actualPath} className="viz-path-actual" />

                {points.map((pt, idx) => {
                  const x = xAt(idx);
                  const showTick =
                    idx === points.length - 1 ||
                    (idx % labelEvery === 0 && points.length - 1 - idx >= Math.ceil(labelEvery * 0.6));
                  return (
                    <g key={pt.date}>
                      <circle cx={x} cy={yAt(pt.plannedPercent)} r={pt.live ? 4 : 3} className="viz-dot-planned" />
                      <circle cx={x} cy={yAt(pt.actualPercent)} r={pt.live ? 4.5 : 3.2} className="viz-dot-actual" />
                      {showTick ? (
                        <text x={x} y={innerHeight + 18} textAnchor="middle" className="viz-axis-text">
                          {shortWeekLabel(pt.date)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}

                {hover !== null && hoveredPoint ? (
                  <>
                    <line
                      x1={xAt(hover)}
                      x2={xAt(hover)}
                      y1={0}
                      y2={innerHeight}
                      stroke="var(--viz-axis)"
                      strokeWidth={1}
                    />
                    <circle cx={xAt(hover)} cy={yAt(hoveredPoint.plannedPercent)} r={4.5} className="viz-dot-planned" />
                    <circle cx={xAt(hover)} cy={yAt(hoveredPoint.actualPercent)} r={5} className="viz-dot-actual" />
                  </>
                ) : null}

                <rect
                  className="viz-hit"
                  x={-8}
                  y={0}
                  width={innerWidth + 16}
                  height={innerHeight}
                  onMouseMove={(event) => setHover(nearest(event.clientX, event.currentTarget))}
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            </svg>
          </div>
        ) : (
          <div style={{ height }} />
        )}
        <Tooltip state={tip} width={width} />
        <span className="sr-only" aria-live="polite">
          {keyboard ? tooltipText(tip) : ""}
        </span>
      </div>
    </div>
  );
}
