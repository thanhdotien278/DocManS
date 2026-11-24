import { BadRequestException, ConflictException } from "@nestjs/common";

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const MAX_DECISION_NUMBER_LENGTH = 80;
const MAX_SEQUENCE_ATTEMPTS = 50;

type SequenceTx = {
  $queryRaw: <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;
  researchProposal?: { findFirst?: (args: { where: { code: string }; select: { id: true } }) => Promise<{ id: string } | null> };
  proposalDecision?: { findFirst?: (args: { where: { decisionNumber: string }; select: { id: true } }) => Promise<{ id: string } | null> };
  approvalSubmission?: { findFirst?: (args: { where: { decisionNumber: string }; select: { id: true } }) => Promise<{ id: string } | null> };
  projectLiquidation?: { findFirst?: (args: { where: { liquidationNumber: string }; select: { id: true } }) => Promise<{ id: string } | null> };
};

export function vietnamYear(at = new Date()): number {
  const valid = Number.isNaN(at.valueOf()) ? new Date() : at;
  return new Date(valid.getTime() + VIETNAM_OFFSET_MS).getUTCFullYear();
}

export async function nextDocumentSequence(tx: SequenceTx, scope: string, year: number): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ value: number }>>`
    INSERT INTO document_number_counters (scope, year, last_value) VALUES (${scope}, ${year}, 1)
    ON CONFLICT (scope, year) DO UPDATE SET last_value = document_number_counters.last_value + 1
    RETURNING last_value AS value`;
  const value = Number(rows?.[0]?.value);
  if (!Number.isInteger(value) || value < 1) {
    throw new ConflictException({ code: "DOCUMENT_COUNTER_INVALID", message: "Không lấy được số thứ tự văn bản từ bộ đếm." });
  }
  return value;
}

/** Mã số đề tài: <năm>-<mã đơn vị chủ trì>-<số thứ tự>, vd. 2026-KHTH-001. */
export function formatProposalCode(year: number, unitCode: string, sequence: number): string {
  return `${year}-${unitCode}-${String(sequence).padStart(3, "0")}`;
}

/** Cấp mã đề tài nguyên tử theo đơn vị chủ trì và năm (giờ Việt Nam) trên `document_number_counters`. */
export async function allocateProposalCode(tx: SequenceTx, unitCode: string, at: Date): Promise<string> {
  const year = vietnamYear(at);
  const scope = `proposal-code:${unitCode}`;
  for (let attempt = 0; attempt < MAX_SEQUENCE_ATTEMPTS; attempt += 1) {
    const sequence = await nextDocumentSequence(tx, scope, year);
    const candidate = formatProposalCode(year, unitCode, sequence);
    const taken = typeof tx.researchProposal?.findFirst === "function"
      ? await tx.researchProposal.findFirst({ where: { code: candidate }, select: { id: true } })
      : null;
    if (!taken) return candidate;
  }
  throw new ConflictException({ code: "PROPOSAL_CODE_TAKEN", message: "Không cấp được mã hồ sơ đề xuất duy nhất." });
}

export function readOptionalDecisionNumber(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new BadRequestException({ message: "Số quyết định không hợp lệ." });
  }
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_DECISION_NUMBER_LENGTH) {
    throw new BadRequestException({ message: `Số quyết định tối đa ${MAX_DECISION_NUMBER_LENGTH} ký tự.` });
  }
  return trimmed;
}

export async function isDecisionNumberTaken(tx: SequenceTx, number: string): Promise<boolean> {
  const [decisionRow, approvalRow] = await Promise.all([
    typeof tx.proposalDecision?.findFirst === "function"
      ? tx.proposalDecision.findFirst({ where: { decisionNumber: number }, select: { id: true } })
      : Promise.resolve(null),
    typeof tx.approvalSubmission?.findFirst === "function"
      ? tx.approvalSubmission.findFirst({ where: { decisionNumber: number }, select: { id: true } })
      : Promise.resolve(null)
  ]);
  return Boolean(decisionRow || approvalRow);
}

/**
 * Kiểm tra số quyết định nhập tay hoặc tự cấp theo bộ đếm năm (`NNN/QĐ-HVQY/YYYY`) trong cùng transaction.
 * Bỏ qua các số đã có người nhập tay trước đó.
 */
export async function resolveDecisionNumber(
  tx: SequenceTx,
  options: { requested?: unknown; year: number; scope?: string }
): Promise<string> {
  const requested = readOptionalDecisionNumber(options.requested);
  if (requested) {
    if (await isDecisionNumberTaken(tx, requested)) {
      throw new ConflictException({
        code: "DECISION_NUMBER_TAKEN",
        message: "Số quyết định đã được sử dụng cho văn bản khác."
      });
    }
    return requested;
  }

  const scope = options.scope ?? "qd-hvqy";
  for (let attempt = 0; attempt < MAX_SEQUENCE_ATTEMPTS; attempt += 1) {
    const sequence = await nextDocumentSequence(tx, scope, options.year);
    const candidate = `${String(sequence).padStart(3, "0")}/QĐ-HVQY/${options.year}`;
    if (!(await isDecisionNumberTaken(tx, candidate))) return candidate;
  }
  throw new ConflictException({
    code: "DECISION_NUMBER_TAKEN",
    message: "Không cấp được số quyết định duy nhất."
  });
}

/** Cấp số biên bản thanh lý nguyên tử theo năm: `N/BBTL-HVQY/YYYY`. */
export async function allocateLiquidationNumber(tx: SequenceTx, year: number): Promise<string> {
  for (let attempt = 0; attempt < MAX_SEQUENCE_ATTEMPTS; attempt += 1) {
    const sequence = await nextDocumentSequence(tx, "liquidation-minutes", year);
    const candidate = `${sequence}/BBTL-HVQY/${year}`;
    const taken = typeof tx.projectLiquidation?.findFirst === "function"
      ? await tx.projectLiquidation.findFirst({ where: { liquidationNumber: candidate }, select: { id: true } })
      : null;
    if (!taken) return candidate;
  }
  throw new ConflictException({
    code: "LIQUIDATION_NUMBER_TAKEN",
    message: "Không cấp được số biên bản thanh lý duy nhất."
  });
}

const RANK_LABELS: Record<string, string> = {
  professor: "GS.",
  "associate-professor": "PGS."
};

const DEGREE_LABELS: Record<string, string> = {
  doctor: "TS.",
  master: "ThS.",
  bscki: "BSCKI",
  bsckii: "BSCKII",
  other: ""
};

export function formatAcademicTitleFromProfile(profile?: {
  academicRankCatalogItem?: { code?: string | null; name?: string | null } | null;
  academicDegreeCatalogItem?: { code?: string | null; name?: string | null } | null;
} | null): string {
  if (!profile) return "";
  const rankCode = profile.academicRankCatalogItem?.code?.trim().toLowerCase() ?? "";
  const degreeCode = profile.academicDegreeCatalogItem?.code?.trim().toLowerCase() ?? "";
  const rank = rankCode ? (RANK_LABELS[rankCode] ?? profile.academicRankCatalogItem?.name ?? "") : "";
  const degree = degreeCode ? (DEGREE_LABELS[degreeCode] ?? (profile.academicDegreeCatalogItem?.name === "Khác" ? "" : (profile.academicDegreeCatalogItem?.name ?? ""))) : "";
  return [rank, degree].filter(Boolean).join(" ").trim();
}
