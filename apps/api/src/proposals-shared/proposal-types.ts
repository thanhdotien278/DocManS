import type { SafeUserContext } from "../auth/auth.types.js";

export type RequestWithCurrentUser = {
  currentUser?: SafeUserContext;
};

export type RequiredPackageItem = {
  code: string;
  label: string;
  allowedMimeTypes: string[];
  maxSizeMb: number;
};

export type ProposalStatus = "draft" | "submitted";

export type IntakeStatus = "draft" | "open" | "closed" | "expired";

export type ProposalMemberInput = {
  name: string;
  role: string;
  organization: string;
  /** Account reference when the participant already has one; omitted for external participants. */
  userId?: string;
  /** Alternative to `userId`: the API resolves it to an account id before persisting. */
  username?: string;
  participationRole?: string;
};

/** A member row after account resolution, ready to persist. */
export type ProposalMemberPersistInput = {
  name: string;
  role: string;
  organization: string;
  userId: string | null;
  participationRole: string;
};

export type ProposalMissingItem = {
  code: string;
  label: string;
};
