"use client";

import Link from "next/link";
import { formatShortDate, type DrillDownProjectRow } from "@/lib/dashboard-api";

const DAY_MS = 86_400_000;

function parseDayMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function ProjectGantt({ projects }: { projects: DrillDownProjectRow[] }) {
  if (!projects.length) {
    return <p className="viz-empty">Không có đề tài để hiển thị biểu đồ Gantt.</p>;
  }

  const nowMs = Date.now();
  const timestamps: number[] = [nowMs];

  for (const proj of projects) {
    const startMs = parseDayMs(proj.startDate);
    const endMs = parseDayMs(proj.endDate);
    if (startMs !== null) timestamps.push(startMs);
    if (endMs !== null) timestamps.push(endMs);
    for (const ms of proj.milestones) {
      const dueMs = parseDayMs(ms.dueDate);
      if (dueMs !== null) timestamps.push(dueMs);
    }
  }

  const minMs = Math.min(...timestamps) - 14 * DAY_MS;
  const maxMs = Math.max(Math.max(...timestamps) + 14 * DAY_MS, minMs + 30 * DAY_MS);
  const span = maxMs - minMs;

  const toPct = (ms: number) => Math.min(100, Math.max(0, ((ms - minMs) / span) * 100));
  const todayPct = toPct(nowMs);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const d = new Date(minMs + ratio * span);
    return {
      pct: ratio * 100,
      label: d.toISOString().slice(0, 10)
    };
  });

  return (
    <div className="gantt" role="region" aria-label="Biểu đồ tiến độ Gantt các đề tài">
      <div className="gantt-legend">
        <span>
          <i className="gantt-dot is-completed" aria-hidden="true" /> Mốc hoàn thành
        </span>
        <span>
          <i className="gantt-dot is-open" aria-hidden="true" /> Mốc đang mở
        </span>
        <span>
          <i className="gantt-dot is-overdue" aria-hidden="true" /> Mốc quá hạn
        </span>
        <span>
          <i className="gantt-today-sample" aria-hidden="true" /> Hôm nay
        </span>
      </div>

      <div className="gantt-head">
        <div className="gantt-label-col">Đề tài / Chủ nhiệm</div>
        <div className="gantt-track-col gantt-scale">
          {ticks.map((t) => (
            <span key={t.pct} className="gantt-scale-tick" style={{ left: `${t.pct}%` }}>
              {formatShortDate(t.label)}
            </span>
          ))}
        </div>
      </div>

      <div className="gantt-rows">
        {projects.map((proj) => {
          const startMs = parseDayMs(proj.startDate);
          const endMs = parseDayMs(proj.endDate);
          const hasRange = startMs !== null && endMs !== null && endMs >= startMs;
          const barLeft = hasRange ? toPct(startMs) : 0;
          const barWidth = hasRange ? Math.max(1.5, toPct(endMs) - barLeft) : 0;

          return (
            <div key={proj.id} className="gantt-row">
              <div className="gantt-label-col">
                <Link href={`/projects/${proj.id}`} className="gantt-project-link">
                  {proj.code ? `${proj.code} · ` : ""}
                  {proj.title}
                </Link>
                <span className="gantt-project-meta">
                  {proj.unitName} · CN: {proj.piName} · TT {proj.actualPercent.toFixed(0)}%
                </span>
              </div>

              <div className="gantt-track-col">
                <span className="gantt-today-line" style={{ left: `${todayPct}%` }} title="Hôm nay" />

                {hasRange ? (
                  <div
                    className={`gantt-bar health-${proj.health}`}
                    style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                    title={`${formatShortDate(proj.startDate)} → ${formatShortDate(proj.endDate)} | Kế hoạch ${proj.plannedPercent.toFixed(1)}% · Thực tế ${proj.actualPercent.toFixed(1)}%`}
                    aria-label={`${proj.title}: ${formatShortDate(proj.startDate)} đến ${formatShortDate(proj.endDate)}, kế hoạch ${proj.plannedPercent.toFixed(1)}%, thực tế ${proj.actualPercent.toFixed(1)}%`}
                  >
                    <span
                      className="gantt-bar-progress"
                      style={{ width: `${Math.min(100, Math.max(0, proj.actualPercent))}%` }}
                    />
                  </div>
                ) : proj.milestones.every((m) => !m.dueDate) ? (
                  <span className="gantt-no-dates">Chưa đặt thời gian bắt đầu / kết thúc</span>
                ) : null}

                {proj.milestones.map((ms) => {
                  const dueMs = parseDayMs(ms.dueDate);
                  if (dueMs === null) return null;
                  const state =
                    ms.status === "completed" ? "completed" : ms.overdue ? "overdue" : "open";
                  const msLabel = `${ms.title} (${formatShortDate(ms.dueDate)}) — ${ms.status === "completed" ? "Hoàn thành" : ms.overdue ? "Quá hạn" : "Đang mở"}`;
                  return (
                    <span
                      key={ms.id}
                      className={`gantt-milestone is-${state} ${ms.isImportant ? "is-important" : ""}`}
                      style={{ left: `${toPct(dueMs)}%` }}
                      title={msLabel}
                      aria-label={msLabel}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
