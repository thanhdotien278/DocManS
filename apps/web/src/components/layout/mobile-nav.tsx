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
    <details className="mobile-menu" key={pathname}>
      <summary>Menu điều hướng</summary>
      <nav className="mobile-menu-links" aria-label="Điều hướng trên điện thoại">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link className={isActive ? "is-active" : ""} href={item.href} key={item.href} aria-current={isActive ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}
