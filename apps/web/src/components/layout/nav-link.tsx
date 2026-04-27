"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export function NavLink({
  href,
  label,
  icon: Icon
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link className={`nav-link ${isActive ? "is-active" : ""}`} href={href}>
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
