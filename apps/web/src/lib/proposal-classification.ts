export type ProposalLevelCode =
  | "national-level"
  | "ministry-defense"
  | "ministry-level"
  | "sector-level"
  | "branch-level"
  | "academy-level"
  | "base-level"
  | "grassroots-level"
  | "student-research"
  | "student-level";

export type MilitaryScopeCode = "military" | "civil" | "civilian" | "dual-use";

export const PROPOSAL_LEVEL_LABELS: Record<string, string> = {
  "national-level": "Cấp Quốc gia",
  "ministry-defense": "Cấp Bộ Quốc phòng",
  "ministry-level": "Cấp Bộ Quốc phòng",
  "sector-level": "Cấp Ngành / Cục",
  "branch-level": "Cấp Ngành / Cục",
  "academy-level": "Cấp Học viện",
  "base-level": "Cấp Cơ sở",
  "grassroots-level": "Cấp Cơ sở",
  "student-research": "Sinh viên / Học viên NCKH",
  "student-level": "Sinh viên / Học viên NCKH"
};

export const MILITARY_SCOPE_LABELS: Record<string, string> = {
  military: "Quân sự - Quốc phòng",
  civil: "Ngoài quân đội (Dân sự)",
  civilian: "Ngoài quân đội (Dân sự)",
  "dual-use": "Lưỡng dụng (Quân - Dân y)"
};

export function getProposalLevelLabel(code?: string | null): string {
  if (!code) return "Chưa phân cấp";
  return PROPOSAL_LEVEL_LABELS[code] ?? code;
}

export function getProposalMilitaryScope(proposal: {
  proposalNatureCode?: string | null;
  proposalTypeCode?: string | null;
  researchFieldCode?: string | null;
  code?: string | null;
  militaryScope?: string | null;
}): MilitaryScopeCode {
  const explicit = proposal.proposalNatureCode?.trim() || proposal.militaryScope?.trim();
  if (explicit === "civil" || explicit === "civilian" || explicit === "dual-use" || explicit === "military") {
    return explicit === "civil" ? "civilian" : explicit;
  }

  const code = (proposal.code || "").toUpperCase();
  const type = proposal.proposalTypeCode || "";
  const field = proposal.researchFieldCode || "";

  if (
    type === "ministry-defense" ||
    type === "ministry-level" ||
    type === "sector-level" ||
    type === "branch-level" ||
    type === "academy-level" ||
    code.startsWith("BQP") ||
    code.startsWith("HVQY") ||
    field === "military-medicine"
  ) {
    return "military";
  }

  if (type === "national-level" && !field.includes("military")) {
    return "civilian";
  }

  return "military";
}

export function getProposalMilitaryScopeLabel(scope: MilitaryScopeCode | string): string {
  return MILITARY_SCOPE_LABELS[scope] ?? scope;
}
