// @ts-ignore TS7016: runtime package is JavaScript; web consumers use its TypeScript source entry.
import { AUTHORIZATION_DECISION_CODE_ORDER_V1, AUTHORIZATION_SCHEMA_VERSION_V1, SYSTEM_ROLES, isAuthorizationDecisionCodeV1, isAuthorizationDimensionV1, isAuthorizationResolutionV1, isContextVersionTokenV1, isPermissionActionV1 } from "@rtms/permissions";

type AuthorizationDecisionCodeV1 = (typeof AUTHORIZATION_DECISION_CODE_ORDER_V1)[number];
type AuthorizationDimensionV1 = "systemRole" | "organizationScope" | "relationship" | "assignment" | "delegation" | "workflowState" | "conflict";
type AuthorizationResolutionV1 = "RESOLVED_VALUE" | "RESOLVED_EMPTY" | "NOT_APPLICABLE" | "UNRESOLVED" | "STALE" | "AMBIGUOUS";
type ContextVersionTokenV1 = { domain: string; recordId: string; aggregateVersion: number; relationshipVersion: number; conflictVersion: number; delegationVersion: number; policyVersion: string };
type AuthorizationContextV1 = {
  schemaVersion: "v1"; requestId: string; correlationId: string; asOf: string;
  actor: { userId: string; systemRole: string; organizationIds: string[]; accountStatus: "ACTIVE" | "INACTIVE" };
  target: { domain: string; recordId: string; organizationId: string; aggregateVersion: number }; action: string;
};
type AuthorizationRuleOutcomeV1 = { dimension: AuthorizationDimensionV1; resolution: AuthorizationResolutionV1; allowed?: boolean; code?: AuthorizationDecisionCodeV1; reason: string };
type AuthorizationAuditV1 = { schemaVersion: "v1"; requestId: string; correlationId: string; actorUserId: string; target: AuthorizationContextV1["target"]; action: string; asOf: string; policyVersion: string; contextVersions: ContextVersionTokenV1[]; outcomes: AuthorizationRuleOutcomeV1[]; primaryDecisionCode: AuthorizationDecisionCodeV1 };
type ContextInput = Omit<AuthorizationContextV1, "schemaVersion" | "asOf">;
type Resolver = (context: AuthorizationContextV1) => Promise<AuthorizationRuleOutcomeV1> | AuthorizationRuleOutcomeV1;
type AuthorizationResolverSetV1 = Record<AuthorizationDimensionV1, Resolver>;
type AuthorizationDecisionV1 = { allowed: boolean; code: AuthorizationDecisionCodeV1; reason: string; audit: AuthorizationAuditV1 };

const DIMENSIONS: AuthorizationDimensionV1[] = ["systemRole", "organizationScope", "relationship", "assignment", "delegation", "workflowState", "conflict"];
const UNSAFE_RESOLUTION_CODES = { UNRESOLVED: "CONTEXT_UNRESOLVED", STALE: "CONTEXT_STALE", AMBIGUOUS: "CONTEXT_AMBIGUOUS" } as const;

export function buildAuthorizationContextV1(input: ContextInput, asOf: Date): AuthorizationContextV1 {
  if (Number.isNaN(asOf.valueOf())) throw new Error("Transaction clock returned an invalid UTC instant.");
  return { ...input, schemaVersion: AUTHORIZATION_SCHEMA_VERSION_V1, asOf: asOf.toISOString() };
}

export async function evaluateAuthorizationV1(context: AuthorizationContextV1, resolvers: AuthorizationResolverSetV1, contextVersions: ContextVersionTokenV1[] = []): Promise<AuthorizationDecisionV1> {
  const outcomes = await Promise.all(DIMENSIONS.map(async (dimension) => {
    try {
      const outcome = await resolvers[dimension](context);
      return outcome.dimension === dimension && isAuthorizationDimensionV1(outcome.dimension) && isAuthorizationResolutionV1(outcome.resolution)
        ? outcome
        : unresolvedOutcome(dimension);
    } catch {
      return unresolvedOutcome(dimension);
    }
  }));
  const applicableCodes = [
    ...contextCodes(context),
    ...(isPermissionActionV1(context.action) ? [] : ["CONTRACT_CODE_UNKNOWN" as const]),
    ...(contextVersions.every(isContextVersionTokenV1) ? [] : ["CONTRACT_CODE_UNKNOWN" as const]),
    ...outcomes.flatMap(outcomeCodes)
  ];
  const code = selectPrimaryCode(applicableCodes);
  const allowed = code === "ALLOWED" && outcomes.some((outcome) => outcome.allowed === true && outcome.resolution === "RESOLVED_VALUE");
  const finalCode = allowed ? "ALLOWED" : code === "ALLOWED" ? "ACTION_NOT_GRANTED" : code;
  const reason = publicAuthorizationReasonV1(finalCode);
  return {
    allowed,
    code: finalCode,
    reason,
    audit: {
      schemaVersion: AUTHORIZATION_SCHEMA_VERSION_V1,
      requestId: context.requestId,
      correlationId: context.correlationId,
      actorUserId: context.actor.userId,
      target: context.target,
      action: context.action,
      asOf: context.asOf,
      policyVersion: AUTHORIZATION_SCHEMA_VERSION_V1,
      contextVersions,
      outcomes: outcomes.map((outcome) => ({ ...outcome, reason: publicAuthorizationReasonV1(outcomeCodes(outcome)[0] ?? "ACTION_NOT_GRANTED") })),
      primaryDecisionCode: finalCode
    }
  };
}

export async function readTransactionClockV1(transaction: { $queryRaw: (query: TemplateStringsArray) => Promise<Array<{ asOf: Date }>> }) {
  const rows = await transaction.$queryRaw`SELECT CURRENT_TIMESTAMP AS "asOf"`;
  const asOf = rows[0]?.asOf;
  if (!(asOf instanceof Date)) throw new Error("Transaction clock did not return a UTC instant.");
  return asOf;
}

export async function runAuthorizedMutationV1<TTransaction, TValue>(input: {
  transaction: TTransaction;
  expected: ContextVersionTokenV1[];
  current: (transaction: TTransaction) => Promise<ContextVersionTokenV1[]>;
  mutate: (transaction: TTransaction) => Promise<TValue>;
}): Promise<{ code: "CONTEXT_VERSION_MISMATCH"; value?: undefined } | { code: "ALLOWED"; value: TValue }> {
  const current = await input.current(input.transaction);
  if (!sameVersionTokens(input.expected, current)) return { code: "CONTEXT_VERSION_MISMATCH" };
  return { code: "ALLOWED", value: await input.mutate(input.transaction) };
}

function contextCodes(context: AuthorizationContextV1): AuthorizationDecisionCodeV1[] {
  if (context.schemaVersion !== AUTHORIZATION_SCHEMA_VERSION_V1) return ["CONTRACT_VERSION_UNSUPPORTED"];
  if (!context.actor.userId) return ["UNAUTHENTICATED"];
  if (context.actor.accountStatus !== "ACTIVE") return ["ACCOUNT_INACTIVE"];
  if (!(SYSTEM_ROLES as readonly string[]).includes(context.actor.systemRole)) return ["CONTRACT_CODE_UNKNOWN"];
  return [];
}

function unresolvedOutcome(dimension: AuthorizationDimensionV1): AuthorizationRuleOutcomeV1 {
  return { dimension, resolution: "UNRESOLVED", reason: "Authorization context could not be resolved." };
}

function outcomeCodes(outcome: AuthorizationRuleOutcomeV1): AuthorizationDecisionCodeV1[] {
  const unsafeCode = UNSAFE_RESOLUTION_CODES[outcome.resolution as keyof typeof UNSAFE_RESOLUTION_CODES];
  if (unsafeCode) return [unsafeCode];
  if (outcome.code && !isAuthorizationDecisionCodeV1(outcome.code)) return ["CONTRACT_CODE_UNKNOWN"];
  if (outcome.allowed === false) return [outcome.code ?? "ACTION_NOT_GRANTED"];
  return [];
}

function selectPrimaryCode(codes: AuthorizationDecisionCodeV1[]) {
  return AUTHORIZATION_DECISION_CODE_ORDER_V1.find((candidate: AuthorizationDecisionCodeV1) => codes.includes(candidate)) ?? "ALLOWED";
}

function sameVersionTokens(expected: ContextVersionTokenV1[], current: ContextVersionTokenV1[]) {
  if (!expected.every(isContextVersionTokenV1) || !current.every(isContextVersionTokenV1) || expected.length !== current.length) return false;
  const key = (token: ContextVersionTokenV1) => `${token.domain}:${token.recordId}`;
  if (new Set(expected.map(key)).size !== expected.length || new Set(current.map(key)).size !== current.length) return false;
  const currentByKey = new Map(current.map((token) => [key(token), token]));
  return expected.every((token) => {
    const actual = currentByKey.get(key(token));
    return actual !== undefined && actual.aggregateVersion === token.aggregateVersion && actual.relationshipVersion === token.relationshipVersion && actual.conflictVersion === token.conflictVersion && actual.delegationVersion === token.delegationVersion && actual.policyVersion === token.policyVersion;
  });
}

export function publicAuthorizationReasonV1(code: AuthorizationDecisionCodeV1) {
  const reasons: Record<AuthorizationDecisionCodeV1, string> = {
    UNAUTHENTICATED: "Bạn cần đăng nhập để thực hiện hành động này.", ACCOUNT_INACTIVE: "Tài khoản hiện không hoạt động.", CONTRACT_VERSION_UNSUPPORTED: "Phiên bản hợp đồng phân quyền không được hỗ trợ.", CONTRACT_CODE_UNKNOWN: "Mã phân quyền không được hỗ trợ.", CONTEXT_UNRESOLVED: "Không thể xác minh ngữ cảnh phân quyền một cách an toàn.", CONTEXT_STALE: "Ngữ cảnh phân quyền đã cũ. Vui lòng tải lại trước khi thử lại.", CONTEXT_AMBIGUOUS: "Ngữ cảnh phân quyền không rõ ràng.", CONTEXT_VERSION_MISMATCH: "Dữ liệu phân quyền đã thay đổi. Vui lòng tải lại trước khi thử lại.", ORG_SCOPE_DENIED: "Bạn không có phạm vi tổ chức phù hợp cho hành động này.", RELATIONSHIP_INACTIVE: "Quan hệ nghiệp vụ cần thiết hiện không còn hiệu lực.", WORKFLOW_STATE_DENIED: "Trạng thái hồ sơ hiện không cho phép hành động này.", CONFLICT_DENIED: "Hành động bị từ chối do xung đột lợi ích.", DELEGATION_INVALID: "Ủy quyền cho hành động này không hợp lệ.", ACTION_NOT_GRANTED: "Bạn không được cấp quyền thực hiện hành động này.", ALLOWED: "Hành động được cho phép."
  };
  return reasons[code];
}
