"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { getAccountById, type AccountProfile } from "@/fixtures/shell-context";
import { resolveShellProfileId } from "@/lib/session";

type SessionContextValue = {
  account: AccountProfile | null;
  setShellProfile: (accountId: string) => void;
  resetShellProfile: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  initialProfileId
}: {
  children: React.ReactNode;
  initialProfileId?: string | null;
}) {
  const [accountId, setAccountId] = useState(() => resolveShellProfileId(initialProfileId));

  const value = useMemo<SessionContextValue>(() => {
    const account = getAccountById(accountId);

    return {
      account,
      setShellProfile(nextAccountId: string) {
        setAccountId(resolveShellProfileId(nextAccountId));
      },
      resetShellProfile() {
        setAccountId(resolveShellProfileId());
      }
    };
  }, [accountId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
