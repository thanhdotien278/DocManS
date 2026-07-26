import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookCopy,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  FileSearch,
  FileText,
  FolderKanban,
  History,
  LayoutDashboard,
  ListTodo,
  NotebookPen,
  Settings2,
  ShieldCheck,
  UserCog,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import styles from "./page.module.css";

type Tone = "default" | "info" | "warning" | "danger" | "success";

type Kpi = {
  label: string;
  value: string;
  meta: string;
  tone?: Tone;
};

type WorkItem = {
  title: string;
  meta: string;
  status: string;
  tone?: Tone;
};

type WorkspaceMockup = {
  id: string;
  title: string;
  subtitle: string;
  user: string;
  scope: string;
  icon: LucideIcon;
  nav: Array<{ label: string; icon: LucideIcon }>;
  kpis: Kpi[];
  queueTitle: string;
  queue: WorkItem[];
  focusTitle: string;
  focus: WorkItem[];
  sideTitle: string;
  side: WorkItem[];
  primaryAction: string;
};

const toneLabel: Record<Tone, string> = {
  default: "Theo dõi",
  info: "Đang xử lý",
  warning: "Cần chú ý",
  danger: "Quá hạn",
  success: "Hoàn tất"
};

const workspaces: WorkspaceMockup[] = [
  {
    id: "admin-console",
    title: "Admin Console",
    subtitle: "Quản trị nền tảng, tài khoản, vai trò, đơn vị và cấu hình dùng chung.",
    user: "TS. Đỗ Tiến Thành",
    scope: "Quản trị hệ thống - Khoa Toán Tin học",
    icon: ShieldCheck,
    nav: [
      { label: "Người dùng", icon: Users },
      { label: "Vai trò", icon: ShieldCheck },
      { label: "Đơn vị", icon: Building2 },
      { label: "Danh mục", icon: BookCopy },
      { label: "Cấu hình", icon: Settings2 },
      { label: "Nhật ký", icon: History }
    ],
    kpis: [
      { label: "Người dùng", value: "128", meta: "121 đang hoạt động", tone: "info" },
      { label: "Vai trò", value: "09", meta: "Có scope nghiệp vụ riêng", tone: "warning" },
      { label: "Đơn vị", value: "18", meta: "3 đơn vị vừa cập nhật" },
      { label: "Cảnh báo audit", value: "02", meta: "Cần đối chiếu trong ngày", tone: "danger" }
    ],
    queueTitle: "Việc quản trị cần xử lý",
    queue: [
      {
        title: "07 tài khoản cần cập nhật đơn vị công tác",
        meta: "Liên quan thay đổi nhân sự tháng 04/2026",
        status: "Cần rà soát",
        tone: "warning"
      },
      {
        title: "02 tài khoản mới chưa kích hoạt",
        meta: "Chờ xác nhận từ Trung tâm CNTT",
        status: "Đang chờ",
        tone: "info"
      },
      {
        title: "Mẫu thông báo nhắc hạn cần cập nhật",
        meta: "Không ảnh hưởng quyền phê duyệt nghiệp vụ",
        status: "Cấu hình",
        tone: "default"
      }
    ],
    focusTitle: "Ma trận kiểm soát",
    focus: [
      { title: "Admin không tự động có quyền phê duyệt", meta: "Business decision thuộc authority scope", status: "Policy", tone: "success" },
      { title: "Audit bắt buộc khi đổi tài khoản hoặc role", meta: "Lưu actor, thời điểm và nội dung thay đổi", status: "Audit", tone: "info" },
      { title: "Danh mục dùng chung cần version history", meta: "Tránh phá dữ liệu proposal đang xử lý", status: "Trace", tone: "default" }
    ],
    sideTitle: "Cấu hình nổi bật",
    side: [
      { title: "Lĩnh vực nghiên cứu 2026", meta: "Cần bổ sung trước đợt tiếp nhận mới", status: "Danh mục", tone: "warning" },
      { title: "Notification templates", meta: "Dùng cho nhắc deadline và workflow action", status: "Mẫu", tone: "info" },
      { title: "Audit log search", meta: "Lọc theo actor, role, module, thời gian", status: "Log", tone: "default" }
    ],
    primaryAction: "Mở quản lý người dùng"
  },
  {
    id: "staff-operations",
    title: "Staff Operations Workspace",
    subtitle: "Điều phối tiếp nhận, kiểm tra, bổ sung, phân công reviewer và tổng hợp kết quả.",
    user: "TS. Nguyễn Minh Phương",
    scope: "Trưởng phòng KHQS - phạm vi đơn vị được cấp",
    icon: ClipboardCheck,
    nav: [
      { label: "Đợt tiếp nhận", icon: CalendarDays },
      { label: "Kiểm tra hồ sơ", icon: FileSearch },
      { label: "Phân công", icon: UserCog },
      { label: "Đánh giá", icon: FileCheck2 },
      { label: "Đề tài duyệt", icon: FolderKanban },
      { label: "Báo cáo", icon: BarChart3 }
    ],
    kpis: [
      { label: "Hồ sơ mới nộp", value: "14", meta: "5 phát sinh trong 48 giờ", tone: "info" },
      { label: "Cần kiểm tra", value: "09", meta: "Thành phần hồ sơ chưa đủ", tone: "warning" },
      { label: "Reviewer quá hạn", value: "06", meta: "3 phân công sắp đến hạn", tone: "danger" },
      { label: "Chờ trình lãnh đạo", value: "04", meta: "Đủ điều kiện tổng hợp", tone: "success" }
    ],
    queueTitle: "Hàng đợi vận hành",
    queue: [
      { title: "HVQY-2026-021 chờ bổ sung tài liệu bắt buộc", meta: "Đơn vị chủ trì đã được thông báo", status: "Bổ sung", tone: "warning" },
      { title: "HVQY-2026-014 quá hạn reviewer 1 ngày", meta: "Cần nhắc hội đồng Kiểm soát nhiễm khuẩn", status: "Quá hạn", tone: "danger" },
      { title: "Tổng hợp đợt tiếp nhận 1/2026", meta: "Hạn chốt 03/05/2026", status: "Báo cáo", tone: "info" }
    ],
    focusTitle: "Pipeline hồ sơ",
    focus: [
      { title: "Submitted", meta: "Kiểm tra tính đầy đủ, file và điều kiện nộp", status: "09 hồ sơ", tone: "warning" },
      { title: "Under review", meta: "Theo dõi điểm, nhận xét và phân công hội đồng", status: "18 hồ sơ", tone: "info" },
      { title: "Ready for approval", meta: "Tổng hợp kết quả trước khi trình lãnh đạo", status: "04 hồ sơ", tone: "success" }
    ],
    sideTitle: "Phạm vi staff",
    side: [
      { title: "Dashboard, search, export đều theo scope", meta: "Không thấy dữ liệu ngoài phạm vi được cấp", status: "Scope", tone: "success" },
      { title: "Không ra quyết định thay leadership", meta: "Staff chỉ chuẩn bị, tổng hợp và trình", status: "Boundary", tone: "default" },
      { title: "Workflow action phải ghi lịch sử", meta: "Yêu cầu bổ sung, phân công, tổng hợp", status: "Audit", tone: "info" }
    ],
    primaryAction: "Mở hàng đợi hồ sơ"
  },
  {
    id: "leadership-dashboard",
    title: "Leadership Decision Dashboard",
    subtitle: "Tập trung vào quyết định, drill-down hồ sơ, phê duyệt, từ chối và chỉ đạo xử lý.",
    user: "GS. TS. Trần Viết Tiến",
    scope: "Giám đốc - approval authority scope",
    icon: LayoutDashboard,
    nav: [
      { label: "Tổng quan", icon: LayoutDashboard },
      { label: "Chờ phê duyệt", icon: FileClock },
      { label: "Đề tài chậm", icon: FolderKanban },
      { label: "Giao việc", icon: ClipboardCheck },
      { label: "Báo cáo", icon: BarChart3 }
    ],
    kpis: [
      { label: "Chờ phê duyệt", value: "08", meta: "3 hồ sơ cần xử lý hôm nay", tone: "warning" },
      { label: "Đề tài chậm", value: "03", meta: "1 cần can thiệp trực tiếp", tone: "info" },
      { label: "Việc quá hạn", value: "05", meta: "2 thuộc Phòng QLKH", tone: "danger" },
      { label: "Báo cáo tổng hợp", value: "12", meta: "Theo dõi trong 7 ngày tới" }
    ],
    queueTitle: "Quyết định cần xử lý",
    queue: [
      { title: "HVQY-2026-001 chờ quyết định phê duyệt", meta: "Đã đủ tổng hợp thẩm định, hạn 30/04/2026", status: "Approve/Reject", tone: "warning" },
      { title: "Hồ sơ y đức chờ quyết định", meta: "Cần xem lịch sử xử lý và file hội đồng", status: "Y đức", tone: "info" },
      { title: "Đề tài chậm báo cáo tiến độ quý II", meta: "Cần ý kiến chỉ đạo hoặc giao việc", status: "Chậm", tone: "danger" }
    ],
    focusTitle: "Drill-down quyết định",
    focus: [
      { title: "Tóm tắt hồ sơ", meta: "Chủ nhiệm, đơn vị, lĩnh vực, kinh phí, deadline", status: "Summary", tone: "default" },
      { title: "Kết quả đánh giá", meta: "Điểm, nhận xét, kiến nghị và tổng hợp staff", status: "Review", tone: "info" },
      { title: "Lịch sử và conflict policy", meta: "Chặn tự phê duyệt nếu có vai trò xung đột", status: "Guard", tone: "success" }
    ],
    sideTitle: "Thống kê điều hành",
    side: [
      { title: "Theo đơn vị", meta: "Ngoại khoa, Nội khoa, Cận lâm sàng, Sinh học, QLKH", status: "Chart", tone: "default" },
      { title: "Theo lĩnh vực nghiên cứu", meta: "Ưu tiên các nhóm có hồ sơ quá hạn", status: "Chart", tone: "info" },
      { title: "Theo trạng thái workflow", meta: "Submitted, under review, ready for approval", status: "Flow", tone: "warning" }
    ],
    primaryAction: "Mở hàng đợi phê duyệt"
  },
  {
    id: "researcher-workspace",
    title: "Researcher Workspace",
    subtitle: "Không tách app riêng cho PI, thành viên, thư ký; quyền thay đổi theo từng hồ sơ.",
    user: "TS. Phạm Anh Tuấn",
    scope: "Chủ nhiệm đề tài - participation scope",
    icon: NotebookPen,
    nav: [
      { label: "Đề tài tôi chủ nhiệm", icon: FileText },
      { label: "Tôi tham gia", icon: Users },
      { label: "Tôi làm thư ký", icon: ClipboardCheck },
      { label: "Báo cáo định kỳ", icon: NotebookPen },
      { label: "Công việc", icon: ListTodo },
      { label: "Thông báo", icon: Bell }
    ],
    kpis: [
      { label: "Hồ sơ đang chuẩn bị", value: "02", meta: "Cần bổ sung trước khi nộp", tone: "warning" },
      { label: "Hồ sơ đã nộp", value: "04", meta: "Đang theo dõi thẩm định", tone: "info" },
      { label: "Đề tài thực hiện", value: "03", meta: "1 cần cập nhật tiến độ" },
      { label: "Báo cáo cần nộp", value: "02", meta: "Một mốc trong 5 ngày tới", tone: "danger" }
    ],
    queueTitle: "Hồ sơ và báo cáo của tôi",
    queue: [
      { title: "Hoàn thiện dự toán kinh phí đề tài thận cấp", meta: "Hạn 29/04/2026, mức ưu tiên cao", status: "Cần làm", tone: "warning" },
      { title: "Báo cáo quý II đề tài cấp Học viện", meta: "Hạn 05/05/2026, đang chuẩn bị tệp đính kèm", status: "Báo cáo", tone: "danger" },
      { title: "Rà soát tài liệu bổ sung đề tài chấn thương", meta: "Cần đối chiếu Phòng QLKH", status: "Bổ sung", tone: "info" }
    ],
    focusTitle: "Ngữ cảnh tham gia",
    focus: [
      { title: "Tôi là PI", meta: "Tạo nháp, upload, submit, phản hồi bổ sung", status: "Own", tone: "success" },
      { title: "Tôi là thành viên", meta: "Xem project, cập nhật task, upload evidence được giao", status: "Member", tone: "info" },
      { title: "Tôi là thư ký khoa học", meta: "Chuẩn bị tài liệu, lịch họp, biên bản nếu được giao", status: "Secretary", tone: "default" }
    ],
    sideTitle: "Chặn quyền sai",
    side: [
      { title: "Không tự phê duyệt đề tài của mình", meta: "Conflict policy áp dụng trên từng bản ghi", status: "Guard", tone: "success" },
      { title: "Không tự gán reviewer chính thức", meta: "Thuộc Staff Operations Workspace", status: "Boundary", tone: "default" },
      { title: "Không xem review nội bộ nếu policy chưa cho phép", meta: "Ẩn cả UI và enforce backend", status: "Policy", tone: "warning" }
    ],
    primaryAction: "Mở hồ sơ của tôi"
  },
  {
    id: "reviewer-council-ethics",
    title: "Reviewer / Council / Ethics Workspace",
    subtitle: "Workspace đánh giá độc lập cho hồ sơ được phân công, hội đồng và y đức.",
    user: "TS. Đỗ Minh Trung",
    scope: "Thành viên Hội đồng - reviewer assignment scope",
    icon: FileCheck2,
    nav: [
      { label: "Hồ sơ được phân công", icon: FileCheck2 },
      { label: "Đánh giá của tôi", icon: FileSearch },
      { label: "Lịch họp hội đồng", icon: CalendarDays },
      { label: "Tài liệu", icon: FileText },
      { label: "Thông báo", icon: Bell }
    ],
    kpis: [
      { label: "Được phân công", value: "07", meta: "2 hồ sơ mới cập nhật", tone: "info" },
      { label: "Chưa hoàn thành", value: "03", meta: "Cần bổ sung nhận xét", tone: "warning" },
      { label: "Sắp đến hạn", value: "02", meta: "Trước 30/04/2026", tone: "danger" },
      { label: "Lịch hội đồng", value: "01", meta: "Phiên 02/05/2026" }
    ],
    queueTitle: "Hồ sơ cần đánh giá",
    queue: [
      { title: "HVQY-2026-014 cần bổ sung đánh giá tiêu chí ứng dụng", meta: "Hạn nộp 29/04/2026", status: "Lưu nháp", tone: "warning" },
      { title: "HVQY-2026-021 cần xác nhận điểm thành phần", meta: "Hạn nộp 30/04/2026", status: "Chấm điểm", tone: "danger" },
      { title: "Hồ sơ y đức đợt 1/2026", meta: "Chỉ hiện hồ sơ được giao", status: "Y đức", tone: "info" }
    ],
    focusTitle: "Màn đánh giá chi tiết",
    focus: [
      { title: "Tài liệu đánh giá", meta: "Xem/tải file cần thiết, không sửa hồ sơ PI", status: "File", tone: "default" },
      { title: "Điểm theo tiêu chí", meta: "Nhập điểm, nhận xét chuyên môn, kiến nghị", status: "Score", tone: "info" },
      { title: "Gửi nhận xét chính thức", meta: "Sau submit chỉ xem lại theo policy", status: "Submit", tone: "success" }
    ],
    sideTitle: "Giới hạn quyền",
    side: [
      { title: "Không thấy proposal chưa được phân công", meta: "Reviewer assignment scope là biên truy cập", status: "Scope", tone: "success" },
      { title: "Không xem review của người khác nếu policy chưa cho phép", meta: "Tránh rò rỉ nhận xét độc lập", status: "Policy", tone: "warning" },
      { title: "Không approve/reject cuối cùng", meta: "Quyết định thuộc Leadership", status: "Boundary", tone: "default" }
    ],
    primaryAction: "Mở hồ sơ được phân công"
  },
  {
    id: "my-work",
    title: "My Work - Công việc của tôi",
    subtitle: "Màn hình cá nhân dùng chung cho mọi user, không phải một role riêng.",
    user: "Người dùng hiện tại",
    scope: "User-specific + assignment + linked-record scope",
    icon: ListTodo,
    nav: [
      { label: "Hôm nay", icon: ListTodo },
      { label: "Quá hạn", icon: AlertTriangle },
      { label: "Hồ sơ chờ tôi", icon: FileClock },
      { label: "Báo cáo", icon: NotebookPen },
      { label: "Thông báo", icon: Bell },
      { label: "Lịch", icon: CalendarDays }
    ],
    kpis: [
      { label: "Cần tôi xử lý", value: "11", meta: "Gom từ workflow và task", tone: "warning" },
      { label: "Quá hạn", value: "03", meta: "Ưu tiên hiển thị đầu", tone: "danger" },
      { label: "Thông báo mới", value: "08", meta: "Có 2 nhắc hạn", tone: "info" },
      { label: "Hoàn tất hôm nay", value: "06", meta: "Đã cập nhật trạng thái", tone: "success" }
    ],
    queueTitle: "Hàng đợi cá nhân",
    queue: [
      { title: "Hồ sơ chờ tôi bổ sung hoặc kiểm tra", meta: "Tự đổi nội dung theo vai trò đăng nhập", status: "Hôm nay", tone: "warning" },
      { title: "Review sắp hạn / quyết định cần xử lý", meta: "Chỉ hiện khi user có assignment hoặc authority", status: "Scope", tone: "info" },
      { title: "Task quá hạn có linked-record permission", meta: "Không hiện task nếu không có quyền bản ghi liên quan", status: "Guard", tone: "danger" }
    ],
    focusTitle: "Nguồn công việc",
    focus: [
      { title: "Staff", meta: "Hồ sơ mới, reviewer quá hạn, báo cáo chờ rà soát", status: "Role", tone: "default" },
      { title: "Leadership", meta: "Hồ sơ chờ phê duyệt, đề tài chậm, quyết định", status: "Role", tone: "default" },
      { title: "PI / Reviewer / Admin", meta: "Proposal bổ sung, review sắp hạn, cấu hình cần kiểm tra", status: "Role", tone: "default" }
    ],
    sideTitle: "Nguyên tắc hiển thị",
    side: [
      { title: "Một màn hình, nhiều nguồn dữ liệu", meta: "Task, workflow action, notification, deadline", status: "Aggregate", tone: "success" },
      { title: "Ẩn UI không thay thế backend policy", meta: "API vẫn enforce role, scope, state, conflict", status: "Security", tone: "warning" },
      { title: "Ưu tiên theo hạn và mức độ rủi ro", meta: "Quá hạn, hôm nay, sắp hạn, theo dõi", status: "Priority", tone: "info" }
    ],
    primaryAction: "Mở công việc của tôi"
  }
];

function ToneBadge({ tone = "default", label }: { tone?: Tone; label?: string }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{label ?? toneLabel[tone]}</span>;
}

function WorkspaceFrame({ workspace, index }: { workspace: WorkspaceMockup; index: number }) {
  const Icon = workspace.icon;

  return (
    <section className={styles.workspaceFrame} id={workspace.id}>
      <div className={styles.frameSidebar}>
        <div className={styles.frameBrand}>
          <span className={styles.brandMark}>
            <Icon size={20} aria-hidden="true" />
          </span>
          <div>
            <strong>{workspace.title}</strong>
            <span>Mockup {String(index + 1).padStart(2, "0")}</span>
          </div>
        </div>
        <nav className={styles.frameNav} aria-label={`${workspace.title} navigation mockup`}>
          {workspace.nav.map((item, itemIndex) => {
            const NavIcon = item.icon;
            return (
              <span className={itemIndex === 0 ? styles.activeNavItem : styles.navItem} key={item.label}>
                <NavIcon size={15} aria-hidden="true" />
                {item.label}
              </span>
            );
          })}
        </nav>
        <div className={styles.scopeBox}>
          <span>Phạm vi</span>
          <strong>{workspace.scope}</strong>
        </div>
      </div>

      <div className={styles.frameMain}>
        <header className={styles.frameTopbar}>
          <div>
            <p>{workspace.user}</p>
            <h2>{workspace.title}</h2>
            <span>{workspace.subtitle}</span>
          </div>
          <button className={styles.primaryButton} type="button">
            {workspace.primaryAction}
          </button>
        </header>

        <div className={styles.kpiGrid}>
          {workspace.kpis.map((kpi) => (
            <article className={`${styles.kpiTile} ${styles[kpi.tone ?? "default"]}`} key={kpi.label}>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <p>{kpi.meta}</p>
            </article>
          ))}
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.primaryPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h3>{workspace.queueTitle}</h3>
                <p>Ưu tiên theo deadline, workflow state và phạm vi quyền.</p>
              </div>
              <ToneBadge tone="warning" label="Priority" />
            </div>
            <div className={styles.workList}>
              {workspace.queue.map((item) => (
                <article className={styles.workRow} key={item.title}>
                  <span className={`${styles.rowMarker} ${styles[item.tone ?? "default"]}`} />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.meta}</p>
                  </div>
                  <ToneBadge tone={item.tone} label={item.status} />
                </article>
              ))}
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <h3>{workspace.sideTitle}</h3>
            <div className={styles.compactList}>
              {workspace.side.map((item) => (
                <article key={item.title}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.meta}</p>
                  </div>
                  <ToneBadge tone={item.tone} label={item.status} />
                </article>
              ))}
            </div>
          </aside>
        </div>

        <div className={styles.focusStrip}>
          <div>
            <h3>{workspace.focusTitle}</h3>
            <p>Khối dưới mô tả các trạng thái/hành động chính cần hiện ngay trong workspace.</p>
          </div>
          <div className={styles.focusItems}>
            {workspace.focus.map((item) => (
              <article key={item.title}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <strong>{item.title}</strong>
                <p>{item.meta}</p>
                <ToneBadge tone={item.tone} label={item.status} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function UiWorkspacesPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "UI Workspaces Mockup" }]} />
      <PageHeader
        eyebrow="UI mockup"
        title="DocManSystem workspace mockups"
        description="Sáu workspace MVP được dựng từ đề xuất UI, permission matrix và role/navigation hiện có của DocManSystem."
        actions={
          <div className={styles.headerPills}>
            <ToneBadge tone="success" label="5 workspace chính" />
            <ToneBadge tone="info" label="1 My Work dùng chung" />
          </div>
        }
      />

      <div className={styles.jumpGrid} aria-label="Đi tới mockup workspace">
        {workspaces.map((workspace, index) => {
          const Icon = workspace.icon;
          return (
            <a href={`#${workspace.id}`} key={workspace.id}>
              <Icon size={18} aria-hidden="true" />
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{workspace.title}</strong>
            </a>
          );
        })}
      </div>

      <div className={styles.mockupStack}>
        {workspaces.map((workspace, index) => (
          <WorkspaceFrame workspace={workspace} index={index} key={workspace.id} />
        ))}
      </div>
    </>
  );
}
