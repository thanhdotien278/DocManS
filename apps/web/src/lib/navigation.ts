import {
  getNavigationItems as getRoleNavigationItems,
  getRouteDefinition,
  type UserRole
} from "@/lib/accounts";

export function getNavigationItems(role: UserRole) {
  return getRoleNavigationItems(role);
}

export function getPageTitle(pathname: string) {
  return getRouteDefinition(pathname)?.title ?? "Bảng điều hành";
}
