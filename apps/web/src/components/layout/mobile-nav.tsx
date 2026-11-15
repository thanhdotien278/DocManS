"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/auth/session-provider";
import { getNavigationGroups, getNavigationItems } from "@/lib/navigation";
import { useUiTheme } from "@/lib/ui-theme";

export function MobileNav() {
  const pathname = usePathname();
  const { account } = useSession();
  const theme = useUiTheme();

  if (!account) {
    return null;
  }

  // Theme có menu theo nhóm thì drawer dùng đúng các nhóm, mục và nhãn đó.
  const groups = getNavigationGroups(theme, account.systemRole) ?? [{ title: "", items: getNavigationItems(account.systemRole) }];

  return (
    <details className="mobile-menu" key={pathname}>
      <summary>Menu<span className="mobile-menu-long"> điều hướng</span></summary>
      <nav className="mobile-menu-links" aria-label="Điều hướng trên điện thoại">
        {groups.map((group) => (
          <div className="mobile-menu-group" key={group.title}>
            {group.title ? <p className="nav-group-title">{group.title}</p> : null}
            {group.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link className={isActive ? "is-active" : ""} href={item.href} key={item.href} aria-current={isActive ? "page" : undefined}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </details>
  );
}
