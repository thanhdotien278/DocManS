export type RiskLevel = "low" | "medium" | "high";

const riskLabels: Record<RiskLevel, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao"
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return <span className={`risk-badge ${level}`}>{riskLabels[level]}</span>;
}
