import {
  getNavigationItems as getRoleNavigationItems,
  getRouteDefinition,
  type UserRole
} from "@/fixtures/shell-context";

export function getNavigationItems(role: UserRole) {
  const items = getRoleNavigationItems(role);
  if (role === "SYSTEM_ADMIN" && !items.some((item) => item.href === "/researcher-profiles")) {
    const profileItem = getRoleNavigationItems("SCIENTIFIC_MANAGEMENT_STAFF").find((item) => item.href === "/researcher-profiles");
    if (profileItem) return [...items, profileItem];
  }
  return items;
}

export function getPageTitle(pathname: string) {
  return getRouteDefinition(pathname)?.title ?? "Dashboard";
}
