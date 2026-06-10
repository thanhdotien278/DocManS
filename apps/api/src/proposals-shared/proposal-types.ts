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
};

export type ProposalMissingItem = {
  code: string;
  label: string;
};
