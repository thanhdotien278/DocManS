"use client";

import { createContext, useContext, useEffect, useMemo, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, logoutSession } from "@/lib/auth-api";
import { toShellAccount, type ShellAccount } from "@/lib/session";

type SessionContextValue = {
  account: ShellAccount | null;
  isLoading: boolean;
  refreshCurrentUser: () => Promise<ShellAccount | null>;
  logout: () => Promise<boolean>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [account, setAccount] = useState<ShellAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshCurrentUser() {
    const user = await getCurrentUser();
    const shellAccount = user ? toShellAccount(user) : null;
    setAccount(shellAccount);
    setIsLoading(false);

    if (!user && window.location.pathname !== "/login") {
      startTransition(() => {
        router.replace("/login");
        router.refresh();
      });
    }

    return shellAccount;
  }

  useEffect(() => {
    void refreshCurrentUser();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      account,
      isLoading,
      refreshCurrentUser,
      async logout() {
        const didLogout = await logoutSession();
        if (!didLogout) {
          return false;
        }

        setAccount(null);
        startTransition(() => {
          router.replace("/login");
          router.refresh();
        });
        return true;
      }
    }),
    [account, isLoading, router]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}
