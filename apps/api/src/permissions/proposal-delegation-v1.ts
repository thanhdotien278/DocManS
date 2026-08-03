// @ts-ignore Runtime delegation contract is supplied by the shared JavaScript package.
import { isDelegationGrantV1, isDelegablePermissionActionV1, type DelegationGrantV1, type PermissionActionV1 } from "@rtms/permissions";

type DelegationResolution = { allowed: true } | { allowed: false; code: "DELEGATION_INVALID" };

/** Pure source-owned grant check. Callers still apply account, scope, workflow, and conflict policy. */
export function resolveProposalDelegationV1(input: {
  grant: DelegationGrantV1 | unknown;
  delegateUserId: string;
  proposalId: string;
  action: PermissionActionV1 | string;
  asOf: string;
  sourceAuthorityActive: boolean;
}): DelegationResolution {
  if (!isDelegationGrantV1(input.grant) || !isDelegablePermissionActionV1(input.action)) return { allowed: false, code: "DELEGATION_INVALID" };
  const asOf = Date.parse(input.asOf);
  const startsAt = Date.parse(input.grant.startsAt);
  const endsAt = input.grant.endsAt === null ? null : Date.parse(input.grant.endsAt);
  if (!Number.isFinite(asOf) || input.grant.status !== "ACTIVE" || input.grant.revokedAt !== null ||
    input.grant.delegateUserId !== input.delegateUserId || input.grant.targetDomain !== "research-proposal" ||
    input.grant.targetRecordId !== input.proposalId || !input.grant.actionIds.includes(input.action) ||
    !input.sourceAuthorityActive || asOf < startsAt || (endsAt !== null && asOf >= endsAt)) {
    return { allowed: false, code: "DELEGATION_INVALID" };
  }
  return { allowed: true };
}
