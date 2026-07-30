"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { getNavigationItems } from "@/lib/navigation";

export function MobileNav() {
  const pathname = usePathname();
  const { account } = useSession();

  if (!account) {
    return null;
  }

  const navigationItems = getNavigationItems(account.systemRole);

  return (
    <details className="mobile-menu">
      <summary>Menu điều hướng</summary>
      <nav className="mobile-menu-links" aria-label="Điều hướng mobile">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={isActive ? "is-active" : ""} href={item.href} key={item.href}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}
