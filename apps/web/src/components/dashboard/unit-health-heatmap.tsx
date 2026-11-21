"use client";

import { HEALTH_LABELS, type ProjectHealthCode, type UnitHealthRow } from "@/lib/dashboard-api";

const COLUMNS: ProjectHealthCode[] = ["on_track", "at_risk", "delayed", "completed"];

function cellIntensityClass(health: ProjectHealthCode, value: number, maxCell: number): string {
  if (!value) return "is-zero";
  const ratio = maxCell > 0 ? value / maxCell : 0;
  const level = ratio >= 0.66 ? "high" : ratio >= 0.33 ? "mid" : "low";
  return `tone-${health} level-${level}`;
}

export function UnitHealthHeatmap({
  rows,
  onSelectCell
}: {
  rows: UnitHealthRow[];
  onSelectCell: (selection: { unitId: string; unitName: string; health?: ProjectHealthCode }) => void;
}) {
  if (!rows.length) {
    return <p className="viz-empty">Chưa có đề tài nào trong phạm vi lọc để lập bản đồ nhiệt đơn vị.</p>;
  }

  const maxCell = Math.max(
    1,
    ...rows.flatMap((row) => [row.on_track, row.at_risk, row.delayed, row.completed])
  );

  return (
    <div className="heatmap-wrap" tabIndex={0} role="region" aria-label="Bản đồ nhiệt Đơn vị và Sức khoẻ đề tài">
      <table className="heatmap">
        <thead>
          <tr>
            <th scope="col">Đơn vị chủ trì</th>
            {COLUMNS.map((col) => (
              <th key={col} scope="col" className="heatmap-col-head">
                {HEALTH_LABELS[col]}
              </th>
            ))}
            <th scope="col" className="heatmap-col-head">
              Tổng
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.unitId}>
              <th scope="row" className="heatmap-unit">
                <button
                  type="button"
                  className="heatmap-unit-btn"
                  onClick={() => onSelectCell({ unitId: row.unitId, unitName: row.unitName })}
                >
                  <span>{row.unitName}</span>
                </button>
              </th>
              {COLUMNS.map((col) => {
                const val = row[col];
                return (
                  <td key={col} className="heatmap-td">
                    <button
                      type="button"
                      className={`heatmap-cell ${cellIntensityClass(col, val, maxCell)}`}
                      disabled={val === 0}
                      onClick={() => onSelectCell({ unitId: row.unitId, unitName: row.unitName, health: col })}
                      aria-label={`${row.unitName} — ${HEALTH_LABELS[col]}: ${val} đề tài`}
                    >
                      {val}
                    </button>
                  </td>
                );
              })}
              <td className="heatmap-td">
                <button
                  type="button"
                  className="heatmap-cell heatmap-total"
                  onClick={() => onSelectCell({ unitId: row.unitId, unitName: row.unitName })}
                  aria-label={`${row.unitName} — Tổng số: ${row.total} đề tài`}
                >
                  {row.total}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
