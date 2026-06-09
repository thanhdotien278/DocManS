import {
  BarChart3,
  Bell,
  BookCopy,
  Building2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  FileSearch,
  FileText,
  Files,
  FolderKanban,
  History,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Settings2,
  ShieldCheck,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UserRole =
  | "leadership"
  | "scientific-management"
  | "principal-investigator"
  | "reviewer"
  | "council-member"
  | "system-admin";

export type AccountProfile = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  unit: string;
  initials: string;
};

export type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type RouteDefinition = {
  eyebrow: string;
  title: string;
  description: string;
  summaryTitle: string;
  summaryBody: string;
};

export const accountProfiles: AccountProfile[] = [
  {
    id: "leadership-nguyen-van-minh",
    username: "nvm_bgh",
    name: "GS. TS. Trần Viết Tiến",
    role: "leadership",
    roleLabel: "Giám Đốc",
    unit: "Ban Giám Đốc",
    initials: "T"
  },
  {
    id: "staff-vu-lan",
    username: "vlan_qlkh",
    name: "TS. Nguyễn Minh Phương",
    role: "scientific-management",
    roleLabel: "Trưởng phòng",
    unit: "Trưởng phòng KHQS",
    initials: "P"
  },
  {
    id: "pi-pham-anh-tuan",
    username: "patuan_pi",
    name: "TS. Phạm Anh Tuấn",
    role: "principal-investigator",
    roleLabel: "Chủ nhiệm đề tài",
    unit: "Khoa Toán - Tin học",
    initials: "T"
  },
  {
    id: "reviewer-tran-thu-ha",
    username: "ttha_reviewer",
    name: "TS. Đỗ Minh Trung",
    role: "reviewer",
    roleLabel: "Thành viên Hội đồng",
    unit: "Ban Quản lý KHQS",
    initials: "T"
  },
  {
    id: "admin-nguyen-quoc-bao",
    username: "nqbao_admin",
    name: "TS. Đỗ Tiến Thành",
    role: "system-admin",
    roleLabel: "Quản trị hệ thống",
    unit: "Khoa Toán - Tin học",
    initials: "T"
  }
];

export const routeDefinitions: Record<string, RouteDefinition> = {
  "/dashboard": {
    eyebrow: "Điều hành",
    title: "Dashboard",
    description: "Tổng hợp các chỉ số, danh sách và tín hiệu cần xử lý theo vai trò đang đăng nhập.",
    summaryTitle: "Tổng hợp điều hành",
    summaryBody: "Chỉ số và danh sách trong phân hệ này được điều chỉnh theo vai trò, đơn vị và phạm vi nghiệp vụ hiện hành."
  },
  "/approvals": {
    eyebrow: "Phê duyệt",
    title: "Hồ sơ chờ phê duyệt",
    description: "Theo dõi các hồ sơ đã hoàn tất thẩm định và đang chờ quyết định của lãnh đạo.",
    summaryTitle: "Tầm nhìn phê duyệt",
    summaryBody: "Danh sách ưu tiên theo hạn xử lý, kết quả thẩm định và mức độ cần theo dõi để bảo đảm quyết định đúng tiến độ."
  },
  "/projects": {
    eyebrow: "Theo dõi đề tài",
    title: "Theo dõi đề tài",
    description: "Quan sát tiến độ, mốc báo cáo và các dấu hiệu cần can thiệp đối với đề tài đang thực hiện.",
    summaryTitle: "Điều phối tiến độ",
    summaryBody: "Phân hệ này tổng hợp trạng thái thực hiện, cảnh báo trễ hạn và các nhiệm vụ liên quan đến đề tài đã được phê duyệt."
  },
  "/reports": {
    eyebrow: "Báo cáo",
    title: "Báo cáo tổng hợp",
    description: "Tổng hợp dữ liệu theo đợt, đơn vị, lĩnh vực và trạng thái để phục vụ điều hành.",
    summaryTitle: "Khung tổng hợp số liệu",
    summaryBody: "Báo cáo được cấu hình theo phạm vi dữ liệu hiện hành và sẵn sàng cho xuất biểu mẫu văn phòng."
  },
  "/proposals": {
    eyebrow: "OMS",
    title: "Quản lý đề tài",
    description: "Tra cứu, lọc và xử lý hồ sơ đề tài theo đợt tiếp nhận và trạng thái nghiệp vụ.",
    summaryTitle: "Danh mục hồ sơ",
    summaryBody: "Thông tin được sắp xếp theo mã hồ sơ, đơn vị, chủ nhiệm, trạng thái và hạn xử lý để hỗ trợ xử lý nhanh."
  },
  "/intakes": {
    eyebrow: "Tiếp nhận",
    title: "Đợt tiếp nhận",
    description: "Quản lý khung thời gian, đơn vị áp dụng và yêu cầu hồ sơ của từng đợt tiếp nhận.",
    summaryTitle: "Điều phối đợt tiếp nhận",
    summaryBody: "Mốc thời gian, quy định và thành phần hồ sơ được quản lý tập trung để phục vụ công tác tiếp nhận."
  },
  "/reviews": {
    eyebrow: "Thẩm định",
    title: "Đánh giá hồ sơ",
    description: "Theo dõi tiến độ đánh giá, phân công hội đồng và tổng hợp nhận xét chuyên môn.",
    summaryTitle: "Tiến độ thẩm định",
    summaryBody: "Danh sách này ưu tiên các hồ sơ đang chờ nhận xét, quá hạn phân công và các phiên cần tổng hợp kết quả."
  },
  "/my-proposals": {
    eyebrow: "Hồ sơ cá nhân",
    title: "Hồ sơ của tôi",
    description: "Quản lý các hồ sơ đang chuẩn bị, đã nộp và cần bổ sung thuộc thẩm quyền của chủ nhiệm.",
    summaryTitle: "Hồ sơ theo dõi",
    summaryBody: "Người dùng có thể theo dõi nhanh tình trạng hồ sơ, thành phần cần cập nhật và các mốc cần xử lý tiếp theo."
  },
  "/my-projects": {
    eyebrow: "Triển khai đề tài",
    title: "Đề tài đang thực hiện",
    description: "Theo dõi tiến độ, milestone và báo cáo định kỳ của đề tài đang được giao chủ trì.",
    summaryTitle: "Tiến độ thực hiện",
    summaryBody: "Mỗi đề tài đều được hiển thị cùng mốc báo cáo, nhiệm vụ cần xử lý và các tài liệu liên quan."
  },
  "/periodic-reports": {
    eyebrow: "Báo cáo định kỳ",
    title: "Báo cáo định kỳ",
    description: "Tập trung các báo cáo sắp đến hạn, đã gửi và cần bổ sung trong kỳ báo cáo hiện hành.",
    summaryTitle: "Lịch báo cáo",
    summaryBody: "Tiến độ nộp báo cáo và các yêu cầu bổ sung được quản lý theo chu kỳ đề tài và đơn vị chủ trì."
  },
  "/my-tasks": {
    eyebrow: "Công việc",
    title: "Công việc của tôi",
    description: "Tổng hợp công việc được giao, ưu tiên xử lý và các hạn cần hoàn tất.",
    summaryTitle: "Theo dõi thực hiện",
    summaryBody: "Nhiệm vụ được gom theo hạn, mức ưu tiên và bản ghi liên quan để giúp sắp xếp thứ tự xử lý."
  },
  "/notifications": {
    eyebrow: "Thông báo",
    title: "Thông báo",
    description: "Theo dõi các thông báo nghiệp vụ, nhắc hạn và các cập nhật liên quan đến vai trò đăng nhập.",
    summaryTitle: "Kênh nhắc việc",
    summaryBody: "Thông báo trong hệ thống được sắp xếp theo mức độ ưu tiên và thời điểm phát sinh để dễ dàng theo dõi."
  },
  "/assigned-proposals": {
    eyebrow: "Phân công",
    title: "Hồ sơ được phân công",
    description: "Tập hợp các hồ sơ reviewer và thành viên hội đồng được giao xem xét.",
    summaryTitle: "Danh sách thẩm định",
    summaryBody: "Hồ sơ được sắp xếp theo hạn nhận xét, lĩnh vực và tình trạng hoàn thành để đảm bảo tiến độ đánh giá."
  },
  "/my-reviews": {
    eyebrow: "Nhận xét",
    title: "Đánh giá của tôi",
    description: "Quản lý tiến độ chấm điểm, nhận xét và kiến nghị đối với các hồ sơ đã được giao.",
    summaryTitle: "Hồ sơ nhận xét",
    summaryBody: "Mỗi mục bao gồm hạn chấm, kết quả tạm thời và tình trạng nộp nhận xét theo phân công."
  },
  "/council-schedule": {
    eyebrow: "Lịch hội đồng",
    title: "Lịch họp hội đồng",
    description: "Theo dõi lịch họp, thành phần tham gia và tài liệu cần chuẩn bị cho từng phiên hội đồng.",
    summaryTitle: "Lịch điều phối",
    summaryBody: "Kế hoạch họp hội đồng được sắp xếp theo thời gian và điểm họp để phục vụ công tác tham gia đúng lịch."
  },
  "/users": {
    eyebrow: "Quản trị",
    title: "Người dùng",
    description: "Quản lý tài khoản, trạng thái hoạt động và gán vai trò cho người dùng hệ thống.",
    summaryTitle: "Danh mục tài khoản",
    summaryBody: "Danh sách tài khoản được đối chiếu theo đơn vị, vai trò và trạng thái để đảm bảo vận hành an toàn."
  },
  "/roles": {
    eyebrow: "Quản trị",
    title: "Vai trò",
    description: "Quản lý nhóm quyền và phạm vi nghiệp vụ được áp dụng cho từng vai trò hệ thống.",
    summaryTitle: "Khung phân quyền",
    summaryBody: "Vai trò và quyền được cấu hình nhất quán để hỗ trợ kiểm soát truy cập theo nghiệp vụ."
  },
  "/units": {
    eyebrow: "Quản trị",
    title: "Đơn vị",
    description: "Quản lý danh mục đơn vị và phạm vi tổ chức phục vụ phân quyền theo đơn vị.",
    summaryTitle: "Danh mục đơn vị",
    summaryBody: "Thông tin đơn vị được sử dụng làm căn cứ cho phân quyền, thống kê và báo cáo phạm vi dữ liệu."
  },
  "/catalogs": {
    eyebrow: "Quản trị",
    title: "Danh mục",
    description: "Quản lý các danh mục dùng chung phục vụ tiếp nhận, thẩm định, theo dõi và báo cáo.",
    summaryTitle: "Thông tin danh mục",
    summaryBody: "Danh mục được cập nhật tập trung để đảm bảo thuật ngữ và giá trị tham chiếu thống nhất toàn hệ thống."
  },
  "/system-settings": {
    eyebrow: "Quản trị",
    title: "Cấu hình hệ thống",
    description: "Theo dõi tham số vận hành, mẫu thông báo và các tùy chỉnh nền phục vụ quản trị hệ thống.",
    summaryTitle: "Tình hình cấu hình",
    summaryBody: "Phân hệ này tập trung các tham số quản trị cốt lõi, sử dụng cho nhắc việc, thông báo và vận hành nội bộ."
  },
  "/system-logs": {
    eyebrow: "Quản trị",
    title: "Nhật ký hệ thống",
    description: "Tra cứu nhật ký vận hành và các hành động quan trọng phục vụ theo dõi hệ thống.",
    summaryTitle: "Theo dõi nhật ký",
    summaryBody: "Nhật ký được tập hợp theo thời điểm và loại sự kiện để hỗ trợ vận hành và truy vết thông tin."
  }
};

export const navigationByRole: Record<UserRole, NavigationItem[]> = {
  leadership: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/approvals", label: "Hồ sơ chờ phê duyệt", icon: FileClock },
    { href: "/projects", label: "Theo dõi đề tài", icon: FolderKanban },
    { href: "/tasks", label: "Giao việc", icon: ClipboardCheck },
    { href: "/reports", label: "Báo cáo", icon: BarChart3 }
  ],
  "scientific-management": [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/proposals", label: "Quản lý đề tài", icon: Files },
    { href: "/intakes", label: "Đợt tiếp nhận", icon: CalendarRange },
    { href: "/reviews", label: "Đánh giá hồ sơ", icon: FileSearch },
    { href: "/projects", label: "Theo dõi đề tài", icon: FolderKanban },
    { href: "/tasks", label: "Giao việc", icon: ClipboardCheck },
    { href: "/reports", label: "Báo cáo", icon: BarChart3 }
  ],
  "principal-investigator": [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-proposals", label: "Hồ sơ của tôi", icon: FileText },
    { href: "/my-projects", label: "Đề tài đang thực hiện", icon: FolderKanban },
    { href: "/periodic-reports", label: "Báo cáo định kỳ", icon: NotebookPen },
    { href: "/my-tasks", label: "Công việc của tôi", icon: ListTodo },
    { href: "/notifications", label: "Thông báo", icon: Bell }
  ],
  reviewer: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/assigned-proposals", label: "Hồ sơ được phân công", icon: FileCheck2 },
    { href: "/my-reviews", label: "Đánh giá của tôi", icon: Files },
    { href: "/council-schedule", label: "Lịch họp hội đồng", icon: CalendarDays },
    { href: "/notifications", label: "Thông báo", icon: Bell }
  ],
  "council-member": [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/assigned-proposals", label: "Hồ sơ được phân công", icon: FileCheck2 },
    { href: "/my-reviews", label: "Đánh giá của tôi", icon: Files },
    { href: "/council-schedule", label: "Lịch họp hội đồng", icon: CalendarDays },
    { href: "/notifications", label: "Thông báo", icon: Bell }
  ],
  "system-admin": [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/users", label: "Người dùng", icon: Users },
    { href: "/roles", label: "Vai trò", icon: ShieldCheck },
    { href: "/units", label: "Đơn vị", icon: Building2 },
    { href: "/catalogs", label: "Danh mục", icon: BookCopy },
    { href: "/system-settings", label: "Cấu hình hệ thống", icon: Settings2 },
    { href: "/system-logs", label: "Nhật ký hệ thống", icon: History }
  ]
};

export function getAccountById(accountId?: string | null) {
  return accountProfiles.find((account) => account.id === accountId) ?? null;
}

export function getNavigationItems(role: UserRole) {
  return navigationByRole[role];
}

export function getRouteDefinition(pathname: string) {
  return routeDefinitions[pathname] ?? null;
}
