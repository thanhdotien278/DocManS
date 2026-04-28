import { getAccountById } from "@/fixtures/shell-context";

export const DEFAULT_SHELL_PROFILE_ID = "leadership-nguyen-van-minh";

export function resolveShellProfileId(profileId?: string | null) {
  return getAccountById(profileId)?.id ?? DEFAULT_SHELL_PROFILE_ID;
}
