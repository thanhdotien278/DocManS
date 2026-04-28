"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useRouter } from "next/navigation";
import { getAccountById, type AccountProfile } from "@/lib/accounts";
import {
  clearBrowserSession,
  getBrowserSessionAccountId,
  persistBrowserSession
} from "@/lib/session";

type SessionContextValue = {
  account: AccountProfile | null;
  isAuthenticated: boolean;
  login: (accountId: string) => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  initialAccountId
}: {
  children: React.ReactNode;
  initialAccountId?: string | null;
}) {
  const router = useRouter();
  const [accountId, setAccountId] = useState<string | null>(() => {
    const account = getAccountById(initialAccountId);
    return account?.id ?? null;
  });

  useEffect(() => {
    const browserAccountId = getBrowserSessionAccountId();

    if (browserAccountId && browserAccountId !== accountId) {
      setAccountId(browserAccountId);
      return;
    }

    if (!browserAccountId && accountId) {
      persistBrowserSession(accountId);
    }
  }, [accountId]);

  const value = useMemo<SessionContextValue>(() => {
    const account = getAccountById(accountId);

    return {
      account,
      isAuthenticated: Boolean(account),
      login(nextAccountId: string) {
        persistBrowserSession(nextAccountId);
        setAccountId(nextAccountId);
      },
      logout() {
        clearBrowserSession();
        setAccountId(null);
        startTransition(() => {
          router.replace("/login");
          router.refresh();
        });
      }
    };
  }, [accountId, router]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return context;
}

