import {
  getNavigationItems as getRoleNavigationItems,
  getRouteDefinition,
  type UserRole
} from "@/fixtures/shell-context";

export function getNavigationItems(role: UserRole) {
  return getRoleNavigationItems(role);
}

export function getPageTitle(pathname: string) {
  return getRouteDefinition(pathname)?.title ?? "Dashboard";
}
