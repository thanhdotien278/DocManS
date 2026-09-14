import type { SafeUserContext } from "../auth/auth.types.js";
import type { ProposalTeamRole } from "./proposal-participation.js";

export type RequestWithCurrentUser = {
  currentUser?: SafeUserContext;
};

export type RequiredPackageItem = {
  code: string;
  label: string;
  allowedMimeTypes: string[];
  maxSizeMb: number | null;
  templateFileId?: string;
  fileName?: string;
  description?: string;
};

export type ProposalStatus = "draft" | "submitted";

export type IntakeStatus = "draft" | "open" | "closed" | "expired";

export type ProposalMemberInput = {
  name: string;
  /** Display-compatible field carrying the canonical team role code. */
  role: ProposalTeamRole;
  organization: string;
  /** Account reference when the participant already has one; omitted for external participants. */
  userId?: string;
  /** Alternative to `userId`: the API resolves it to an account id before persisting. */
  username?: string;
  participationRole?: ProposalTeamRole;
};

/** A member row after account resolution, ready to persist. */
export type ProposalMemberPersistInput = {
  name: string;
  role: ProposalTeamRole;
  organization: string;
  userId: string | null;
  participationRole: ProposalTeamRole;
};

export type ProposalMissingItem = {
  code: string;
  label: string;
};
