import { ClipboardCheck, type LucideIcon } from "lucide-react";
import {
  getNavigationItems as getRoleNavigationItems,
  getRouteDefinition,
  navigationByRole,
  type UserRole
} from "@/fixtures/shell-context";

export function getNavigationItems(role: UserRole) {
  const items = [...getRoleNavigationItems(role)];
  if (role === "SYSTEM_ADMIN" && !items.some((item) => item.href === "/researcher-profiles")) {
    const profileItem = getRoleNavigationItems("RESEARCH_MANAGEMENT_STAFF").find((item) => item.href === "/researcher-profiles");
    if (profileItem) items.push(profileItem);
  }
  if (role !== "SYSTEM_ADMIN" && !items.some((item) => item.href === "/my-reviews")) items.push({ href: "/my-reviews", label: "Đánh giá của tôi", icon: ClipboardCheck });
  return items;
}

// Theme "guided" và "academy": gom menu theo loại công việc; href chưa khai báo rơi vào nhóm cuối.
const NAVIGATION_GROUPS: [string, string[]][] = [
  ["Tổng quan", ["/dashboard", "/notifications", "/documents"]],
  ["Việc của tôi", ["/my-profile", "/my-proposals", "/my-projects", "/periodic-reports", "/my-tasks", "/my-reviews", "/approvals"]],
  ["Đề xuất và đề tài", ["/proposals", "/intakes", "/reviews", "/projects", "/tasks", "/reports"]],
  ["Nhà khoa học và tài khoản", ["/researcher-profiles", "/registration-requests", "/users", "/roles", "/units"]],
  ["Hệ thống", []]
];

export function groupNavigationItems<T extends { href: string }>(items: T[]) {
  const listed = NAVIGATION_GROUPS.flatMap(([, hrefs]) => hrefs);
  return NAVIGATION_GROUPS
    .map(([title, hrefs], index) => ({
      title,
      items: items.filter((item) => index === NAVIGATION_GROUPS.length - 1 ? !listed.includes(item.href) : hrefs.includes(item.href))
    }))
    .filter((group) => group.items.length > 0);
}

// Theme "Không gian làm việc": menu theo việc của từng vai trò. Chỉ là lối vào; dữ liệu và hành động trong mỗi màn
// vẫn do backend lọc theo quyền. Không liệt kê Giao việc, Báo cáo, Báo cáo định kỳ vì chưa có nguồn dữ liệu thật.
const WORK = "Công việc của tôi";
const RECORDS = "Hồ sơ và đề tài";
const MANAGE = "Quản lý";
const ADMIN = "Quản trị hệ thống";
const HOME: [string, string] = ["/dashboard", "Việc cần xử lý"];
const NOTICES: [string, string] = ["/notifications", "Thông báo"];
const MY_REVIEWS: [string, string] = ["/my-reviews", "Đánh giá của tôi"];
const CV: [string, string] = ["/my-profile", "Lý lịch khoa học"];
const PROPOSALS: [string, string] = ["/proposals", "Hồ sơ đề xuất"];
const PROJECTS: [string, string] = ["/projects", "Đề tài đang thực hiện"];
const INTAKES: [string, string] = ["/intakes", "Đợt tiếp nhận"];
const REVIEWS: [string, string] = ["/reviews", "Đánh giá hồ sơ"];
const PROFILES: [string, string] = ["/researcher-profiles", "Hồ sơ nhà khoa học"];
const DOCUMENTS: [string, string] = ["/documents", "Văn bản & Biểu mẫu"];
const REGISTRATIONS: [string, string] = ["/registration-requests", "Yêu cầu đăng ký"];
const researcherGroups = (proposals: string, projects: string): [string, [string, string][]][] => [
  [WORK, [HOME, MY_REVIEWS, NOTICES]],
  ["Nghiên cứu của tôi", [["/my-proposals", proposals], ["/my-projects", projects], CV, DOCUMENTS]]
];

const WORKSPACE_NAVIGATION: Record<UserRole, [string, [string, string][]][]> = {
  SYSTEM_ADMIN: [
    [WORK, [HOME, NOTICES]],
    ["Tài khoản", [["/users", "Người dùng"], REGISTRATIONS, ["/roles", "Vai trò"], ["/units", "Đơn vị"], PROFILES]],
    [ADMIN, [["/catalogs", "Danh mục"], DOCUMENTS, ["/system-settings", "Cấu hình hệ thống"], ["/system-logs", "Nhật ký hệ thống"]]]
  ],
  LEADERSHIP_APPROVAL_AUTHORITY: [
    [WORK, [HOME, ["/approvals", "Hồ sơ chờ quyết định"], MY_REVIEWS, NOTICES]],
    [RECORDS, [PROPOSALS, PROJECTS, DOCUMENTS]]
  ],
  SCIENCE_DEPUTY_DIRECTOR: [[WORK, [HOME, MY_REVIEWS, NOTICES]], [RECORDS, [PROPOSALS, PROJECTS, CV, DOCUMENTS]]],
  RESEARCH_OVERSIGHT_AUTHORITY: [
    [WORK, [HOME, MY_REVIEWS, NOTICES]],
    [RECORDS, [PROPOSALS, PROJECTS, ["/my-proposals", "Hồ sơ đề xuất của tôi"], DOCUMENTS]]
  ],
  RESEARCH_MANAGEMENT_HEAD: [
    [WORK, [HOME, MY_REVIEWS, NOTICES]],
    [RECORDS, [PROPOSALS, PROJECTS, DOCUMENTS]],
    [MANAGE, [INTAKES, REVIEWS, PROFILES, CV]]
  ],
  RESEARCH_MANAGEMENT_DEPUTY_HEAD: [[WORK, [HOME, MY_REVIEWS, NOTICES]], [RECORDS, [PROPOSALS, PROJECTS, DOCUMENTS]]],
  RESEARCH_BOARD_HEAD: [
    [WORK, [HOME, MY_REVIEWS, NOTICES]],
    [RECORDS, [PROPOSALS, PROJECTS, DOCUMENTS]],
    [MANAGE, [REGISTRATIONS, CV]]
  ],
  RESEARCH_MANAGEMENT_STAFF: [
    [WORK, [HOME, MY_REVIEWS, NOTICES]],
    [RECORDS, [["/proposals", "Hồ sơ tôi phụ trách"], PROJECTS, DOCUMENTS]],
    [MANAGE, [INTAKES, REVIEWS, PROFILES, REGISTRATIONS, CV]]
  ],
  RESEARCHER_INTERNAL_USER: researcherGroups("Hồ sơ đề xuất của tôi", "Đề tài của tôi"),
  // NNB chỉ làm việc được mời/được phân công: nhãn không dẫn dắt tạo đề xuất.
  EXTERNAL_RESEARCHER_USER: researcherGroups("Hồ sơ tôi tham gia", "Đề tài tôi tham gia")
};

const NAVIGATION_ICONS = new Map<string, LucideIcon>(
  [...Object.values(navigationByRole).flat(), { href: "/my-reviews", icon: ClipboardCheck }].map((item) => [item.href, item.icon])
);

export function getWorkspaceNavigation(role: UserRole) {
  return WORKSPACE_NAVIGATION[role].map(([title, items]) => ({
    title,
    items: items.map(([href, label]) => ({ href, label, icon: NAVIGATION_ICONS.get(href) ?? ClipboardCheck }))
  }));
}

/** Nhóm menu theo theme; null = theme hiện tại (menu ngang không nhóm). */
export function getNavigationGroups(theme: string, role: UserRole) {
  if (theme === "workspace") return getWorkspaceNavigation(role);
  return theme === "guided" || theme === "academy" ? groupNavigationItems(getNavigationItems(role)) : null;
}

export function getPageTitle(pathname: string) {
  return getRouteDefinition(pathname)?.title ?? "Dashboard";
}
