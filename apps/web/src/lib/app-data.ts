import type { WorkflowStatus } from "@rtms/contracts";
import type { UserRole } from "@/lib/accounts";
import { taskRecords } from "@/lib/task-data";

export type Proposal = {
  id: string;
  code: string;
  title: string;
  unit: string;
  owner: string;
  intakePeriod: string;
  status: WorkflowStatus;
  submittedAt: string;
  dueDate: string;
};

export type DashboardKpi = {
  label: string;
  value: string;
  meta: string;
  tone?: "default" | "warning" | "danger" | "info";
};

export type DashboardTableRow = {
  code: string;
  title: string;
  meta: string;
  unit: string;
  status: WorkflowStatus;
  dueDate: string;
  href: string;
};

export type DashboardListItem = {
  title: string;
  meta: string;
};

export type DashboardBar = {
  label: string;
  height: string;
  value?: string;
  tone?: "emerald" | "amber" | "blue" | "teal" | "maroon";
};

export type DashboardPanel =
  | {
      variant: "table";
      title: string;
      subtitle: string;
      actionLabel?: string;
      actionHref?: string;
      rows: DashboardTableRow[];
    }
  | {
      variant: "list";
      title: string;
      subtitle: string;
      actionLabel?: string;
      actionHref?: string;
      items: DashboardListItem[];
    }
  | {
      variant: "chart";
      title: string;
      subtitle: string;
      bars: DashboardBar[];
    };

export type DashboardSnapshot = {
  eyebrow: string;
  title: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  kpis: DashboardKpi[];
  panels: [DashboardPanel, DashboardPanel, DashboardPanel, DashboardPanel];
};

export const proposals: Proposal[] = [
  {
    id: "hvqy-2026-001",
    code: "HVQY-2026-001",
    title: "Đánh giá hiệu quả can thiệp phục hồi chức năng sau chấn thương chi dưới",
    unit: "Khoa Chấn thương chỉnh hình",
    owner: "TS. Nguyễn Minh Đức",
    intakePeriod: "Đợt 1/2026",
    status: "pending-approval",
    submittedAt: "22/04/2026",
    dueDate: "30/04/2026"
  },
  {
    id: "hvqy-2026-014",
    code: "HVQY-2026-014",
    title: "Ứng dụng mô hình dự báo nguy cơ nhiễm khuẩn bệnh viện",
    unit: "Khoa Kiểm soát nhiễm khuẩn",
    owner: "PGS. Trần Thu Hà",
    intakePeriod: "Đợt 1/2026",
    status: "in-review",
    submittedAt: "20/04/2026",
    dueDate: "28/04/2026"
  },
  {
    id: "hvqy-2026-021",
    code: "HVQY-2026-021",
    title: "Nghiên cứu chỉ số sinh học trong chẩn đoán sớm tổn thương thận cấp",
    unit: "Bộ môn Sinh lý bệnh",
    owner: "ThS. Lê Quốc Huy",
    intakePeriod: "Đợt 1/2026",
    status: "needs-supplement",
    submittedAt: "18/04/2026",
    dueDate: "27/04/2026"
  },
  {
    id: "hvqy-2026-032",
    code: "HVQY-2026-032",
    title: "Tối ưu quy trình huấn luyện cấp cứu chiến thuật",
    unit: "Trung tâm Huấn luyện kỹ năng y khoa",
    owner: "Đại tá, TS. Phạm Anh Tuấn",
    intakePeriod: "Đợt 2/2026",
    status: "submitted",
    submittedAt: "25/04/2026",
    dueDate: "05/05/2026"
  }
];

export const timeline = [
  {
    title: "Hồ sơ được nộp chính thức",
    meta: "TS. Nguyễn Minh Đức - 22/04/2026 09:12",
    status: "submitted"
  },
  {
    title: "Chuyên viên kiểm tra tính đầy đủ",
    meta: "CN. Vũ Lan - 23/04/2026 14:30",
    status: "completed"
  },
  {
    title: "Hoàn tất tổng hợp ý kiến đánh giá",
    meta: "Phòng Quản lý khoa học - 25/04/2026 16:10",
    status: "completed"
  },
  {
    title: "Chờ lãnh đạo phê duyệt",
    meta: "Trạng thái hiện tại - hạn xử lý 30/04/2026",
    status: "pending-approval"
  }
];

export const submittedFiles = [
  {
    name: "Thuyet-minh-de-cuong-HVQY-2026-001.pdf",
    meta: "PDF - 2.4 MB - TS. Nguyễn Minh Đức - 22/04/2026"
  },
  {
    name: "Du-toan-kinh-phi.xlsx",
    meta: "Excel - 418 KB - TS. Nguyễn Minh Đức - 22/04/2026"
  },
  {
    name: "Ly-lich-khoa-hoc-chu-nhiem.pdf",
    meta: "PDF - 860 KB - TS. Nguyễn Minh Đức - 22/04/2026"
  }
];

export function getProposalById(id: string) {
  return proposals.find((proposal) => proposal.id === id) ?? null;
}

export function getDashboardSnapshot(role: UserRole): DashboardSnapshot {
  switch (role) {
    case "scientific-management":
      return {
        eyebrow: "Điều hành nghiệp vụ",
        title: "Bảng điều hành chuyên viên quản lý khoa học",
        description: "Tổng hợp các hồ sơ mới nộp, hồ sơ cần kiểm tra và tiến độ thẩm định trong phạm vi đơn vị quản lý.",
        primaryActionLabel: "Mở danh sách hồ sơ",
        primaryActionHref: "/proposals",
        kpis: [
          { label: "Hồ sơ mới nộp", value: "14", meta: "5 hồ sơ phát sinh trong 48 giờ qua", tone: "info" },
          { label: "Hồ sơ cần kiểm tra", value: "09", meta: "Cần rà soát thành phần và điều kiện nộp", tone: "warning" },
          { label: "Hồ sơ đang đánh giá", value: "18", meta: "Đã phân công reviewer và hội đồng", tone: "default" },
          { label: "Reviewer chưa hoàn thành", value: "06", meta: "3 phân công sắp đến hạn", tone: "danger" }
        ],
        panels: [
          {
            variant: "table",
            title: "Hồ sơ cần kiểm tra",
            subtitle: "Sắp xếp theo hạn xử lý và tình trạng thành phần",
            actionLabel: "Xem toàn bộ",
            actionHref: "/proposals",
            rows: proposals.map((proposal) => ({
              code: proposal.code,
              title: proposal.title,
              meta: proposal.owner,
              unit: proposal.unit,
              status: proposal.status,
              dueDate: proposal.dueDate,
              href: `/proposals/${proposal.id}`
            }))
          },
          {
            variant: "list",
            title: "Cảnh báo thẩm định",
            subtitle: "Theo dõi các mục cần nhắc việc và tổng hợp",
            items: [
              { title: "Hội đồng Kiểm soát nhiễm khuẩn chưa nộp đủ biên bản", meta: "Hạn tổng hợp 29/04/2026" },
              { title: "Hồ sơ HVQY-2026-021 đang chờ bổ sung tài liệu bắt buộc", meta: "Đơn vị chủ trì đã được thông báo" },
              { title: "Báo cáo tổng hợp đợt 1/2026 cần chốt trước 03/05/2026", meta: "Phòng Quản lý khoa học phụ trách" }
            ]
          },
          {
            variant: "chart",
            title: "Tình hình theo đơn vị",
            subtitle: "Số lượng hồ sơ đang xử lý theo đơn vị chuyên môn",
            bars: [
              { label: "Chấn thương", height: "148px", value: "06", tone: "emerald" },
              { label: "Nội khoa", height: "112px", value: "04", tone: "amber" },
              { label: "Cận lâm sàng", height: "136px", value: "05", tone: "blue" },
              { label: "Sinh học", height: "94px", value: "03", tone: "teal" },
              { label: "QLKH", height: "168px", value: "07", tone: "maroon" }
            ]
          },
          {
            variant: "list",
            title: "Báo cáo sắp đến hạn",
            subtitle: "Các mốc cần nhắc việc trong 7 ngày tới",
            actionLabel: "Mở báo cáo",
            actionHref: "/reports",
            items: [
              { title: "Tổng hợp đợt tiếp nhận 1/2026", meta: "Hạn 03/05/2026 - Phòng Quản lý khoa học" },
              { title: "Danh sách hội đồng cần xác nhận lịch họp", meta: "Hạn 30/04/2026 - 4 phiên cần đối chiếu" },
              { title: "Báo cáo công tác tuần", meta: "Hạn 02/05/2026 - Chuyên viên tổng hợp" }
            ]
          }
        ]
      };
    case "principal-investigator":
      return {
        eyebrow: "Công việc cá nhân",
        title: "Bảng điều hành chủ nhiệm đề tài",
        description: "Tổng hợp hồ sơ, đề tài đang thực hiện, báo cáo định kỳ và công việc được giao cho chủ nhiệm.",
        primaryActionLabel: "Mở hồ sơ của tôi",
        primaryActionHref: "/my-proposals",
        kpis: [
          { label: "Hồ sơ đang chuẩn bị", value: "02", meta: "Cần bổ sung thành phần trước khi nộp", tone: "warning" },
          { label: "Hồ sơ đã nộp", value: "04", meta: "Đang theo dõi quá trình thẩm định", tone: "info" },
          { label: "Đề tài đang thực hiện", value: "03", meta: "01 đề tài cần cập nhật tiến độ", tone: "default" },
          { label: "Báo cáo cần nộp", value: "02", meta: "Một mốc đến hạn trong 5 ngày tới", tone: "danger" }
        ],
        panels: [
          {
            variant: "table",
            title: "Hồ sơ của tôi",
            subtitle: "Theo dõi tình trạng tiếp nhận, thẩm định và bổ sung",
            actionLabel: "Xem hồ sơ",
            actionHref: "/my-proposals",
            rows: proposals.slice(0, 3).map((proposal) => ({
              code: proposal.code,
              title: proposal.title,
              meta: `Chủ nhiệm: ${proposal.owner}`,
              unit: proposal.intakePeriod,
              status: proposal.status,
              dueDate: proposal.dueDate,
              href: `/proposals/${proposal.id}`
            }))
          },
          {
            variant: "list",
            title: "Công việc của tôi",
            subtitle: "Nhiệm vụ ưu tiên cần xử lý trong ngày",
            actionLabel: "Mở công việc",
            actionHref: "/my-tasks",
            items: [
              { title: "Hoàn thiện dự toán kinh phí đề tài thận cấp", meta: "Hạn 29/04/2026 - Mức ưu tiên cao" },
              { title: "Cập nhật biên bản họp nhóm nghiên cứu", meta: "Hạn 30/04/2026 - Trung tâm Huấn luyện kỹ năng y khoa" },
              { title: "Rà soát tài liệu bổ sung đề tài chấn thương", meta: "Hạn 02/05/2026 - Cần đối chiếu với Phòng QLKH" }
            ]
          },
          {
            variant: "chart",
            title: "Tiến độ đề tài",
            subtitle: "Mức độ hoàn thành theo nhóm công việc",
            bars: [
              { label: "Nội dung", height: "158px" },
              { label: "Nhân sự", height: "126px" },
              { label: "Kinh phí", height: "92px" },
              { label: "Báo cáo", height: "118px" },
              { label: "Minh chứng", height: "146px" }
            ]
          },
          {
            variant: "list",
            title: "Báo cáo định kỳ",
            subtitle: "Các kỳ báo cáo cần lưu ý",
            actionLabel: "Mở báo cáo định kỳ",
            actionHref: "/periodic-reports",
            items: [
              { title: "Báo cáo quý II đề tài cấp Học viện", meta: "Hạn 05/05/2026 - Đang chuẩn bị tệp đính kèm" },
              { title: "Báo cáo tiến độ nhóm đề tài cấp cơ sở", meta: "Hạn 10/05/2026 - Chờ xác nhận thành viên" },
              { title: "Cập nhật bảng kê chi phí đợt 1", meta: "Hạn 12/05/2026 - Cần đối chiếu phòng Tài chính" }
            ]
          }
        ]
      };
    case "reviewer":
      return {
        eyebrow: "Thẩm định cá nhân",
        title: "Bảng điều hành thành viên hội đồng",
        description: "Tổng hợp hồ sơ được phân công, đánh giá chưa hoàn thành và lịch họp hội đồng sắp tới.",
        primaryActionLabel: "Mở hồ sơ được phân công",
        primaryActionHref: "/assigned-proposals",
        kpis: [
          { label: "Hồ sơ được phân công", value: "07", meta: "02 hồ sơ mới cập nhật trong hôm nay", tone: "info" },
          { label: "Đánh giá chưa hoàn thành", value: "03", meta: "Cần bổ sung nhận xét trước hạn", tone: "warning" },
          { label: "Hạn chấm sắp đến", value: "02", meta: "Cần nộp trước 30/04/2026", tone: "danger" },
          { label: "Lịch họp hội đồng", value: "01", meta: "Phiên họp tổng hợp vào ngày 02/05/2026", tone: "default" }
        ],
        panels: [
          {
            variant: "table",
            title: "Hồ sơ được phân công",
            subtitle: "Danh sách hồ sơ trong phạm vi thẩm định hiện hành",
            actionLabel: "Mở danh sách",
            actionHref: "/assigned-proposals",
            rows: proposals.slice(0, 3).map((proposal) => ({
              code: proposal.code,
              title: proposal.title,
              meta: `Chủ nhiệm: ${proposal.owner}`,
              unit: proposal.unit,
              status: proposal.status,
              dueDate: proposal.dueDate,
              href: `/proposals/${proposal.id}`
            }))
          },
          {
            variant: "list",
            title: "Đánh giá của tôi",
            subtitle: "Các hồ sơ cần hoàn tất nhận xét",
            actionLabel: "Mở đánh giá",
            actionHref: "/my-reviews",
            items: [
              { title: "HVQY-2026-014 cần bổ sung đánh giá tiêu chí ứng dụng", meta: "Hạn nộp 29/04/2026" },
              { title: "HVQY-2026-021 cần xác nhận điểm thành phần", meta: "Hạn nộp 30/04/2026" },
              { title: "HVQY-2026-032 cần đối chiếu tài liệu bổ trợ", meta: "Hạn nộp 02/05/2026" }
            ]
          },
          {
            variant: "list",
            title: "Lịch họp hội đồng",
            subtitle: "Lịch làm việc cần được xác nhận",
            actionLabel: "Mở lịch họp",
            actionHref: "/council-schedule",
            items: [
              { title: "Phiên họp tổng hợp kết quả đợt 1/2026", meta: "08:00 - 02/05/2026 - Phòng họp 201" },
              { title: "Họp chuyên đề đánh giá đề tài cấp cơ sở", meta: "14:00 - 04/05/2026 - Phòng họp 305" },
              { title: "Làm việc với tổ thư ký hội đồng", meta: "09:00 - 05/05/2026 - Phòng Quản lý khoa học" }
            ]
          },
          {
            variant: "list",
            title: "Thông báo liên quan",
            subtitle: "Thông tin về phân công và hạn xử lý",
            actionLabel: "Mở thông báo",
            actionHref: "/notifications",
            items: [
              { title: "Đã cập nhật tài liệu hồ sơ HVQY-2026-014", meta: "Từ tổ thư ký hội đồng - 08:15 hôm nay" },
              { title: "Cần xác nhận tham dự phiên họp ngày 02/05/2026", meta: "Thông báo văn phòng hội đồng" },
              { title: "Báo cáo tổng hợp nhận xét đã mở cho phiên đợt 1/2026", meta: "Cập nhật lúc 16:20 hôm qua" }
            ]
          }
        ]
      };
    case "system-admin":
      return {
        eyebrow: "Quản trị hệ thống",
        title: "Bảng điều hành quản trị hệ thống",
        description: "Tổng hợp tài khoản, vai trò, đơn vị và các điểm cần cấu hình trong hệ thống vận hành nội bộ.",
        primaryActionLabel: "Mở quản lý người dùng",
        primaryActionHref: "/users",
        kpis: [
          { label: "Tổng số người dùng", value: "128", meta: "Phân bổ trên 18 đơn vị", tone: "default" },
          { label: "Tài khoản đang hoạt động", value: "121", meta: "07 tài khoản tạm ngưng", tone: "info" },
          { label: "Vai trò hệ thống", value: "09", meta: "Bao gồm vai trò nghiệp vụ và quản trị", tone: "warning" },
          { label: "Danh mục cần cấu hình", value: "05", meta: "Cần đối chiếu trước đợt tiếp nhận mới", tone: "danger" }
        ],
        panels: [
          {
            variant: "list",
            title: "Người dùng và vai trò",
            subtitle: "Tổng hợp tài khoản cần theo dõi",
            actionLabel: "Mở danh sách người dùng",
            actionHref: "/users",
            items: [
              { title: "07 tài khoản cần cập nhật đơn vị công tác", meta: "Liên quan đến thay đổi nhân sự tháng 04/2026" },
              { title: "03 tài khoản cần đối chiếu quyền truy cập báo cáo", meta: "Thuộc nhóm lãnh đạo và văn phòng tổng hợp" },
              { title: "02 tài khoản mới chưa kích hoạt", meta: "Chờ xác nhận hồ sơ từ Trung tâm CNTT" }
            ]
          },
          {
            variant: "list",
            title: "Danh mục và cấu hình",
            subtitle: "Các nội dung cần rà soát trước kỳ vận hành mới",
            actionLabel: "Mở cấu hình hệ thống",
            actionHref: "/system-settings",
            items: [
              { title: "Cần bổ sung danh mục lĩnh vực nghiên cứu năm 2026", meta: "Phục vụ đợt tiếp nhận mới" },
              { title: "Mẫu thông báo nhắc hạn cần cập nhật nội dung", meta: "Chờ phê duyệt văn bản" },
              { title: "Thông tin đơn vị vừa điều chỉnh cơ cấu", meta: "Cần đồng bộ trước khi cấp quyền" }
            ]
          },
          {
            variant: "chart",
            title: "Phân bổ theo đơn vị",
            subtitle: "Số lượng tài khoản đang hoạt động theo nhóm đơn vị",
            bars: [
              { label: "BGH", height: "104px" },
              { label: "QLKH", height: "166px" },
              { label: "Khoa", height: "152px" },
              { label: "Hội đồng", height: "118px" },
              { label: "CNTT", height: "86px" }
            ]
          },
          {
            variant: "list",
            title: "Nhật ký hệ thống",
            subtitle: "Các mục cần kiểm tra trong 24 giờ qua",
            actionLabel: "Mở nhật ký",
            actionHref: "/system-logs",
            items: [
              { title: "Đã ghi nhận 18 phiên đăng nhập thành công", meta: "Không có cảnh báo bất thường" },
              { title: "02 tài khoản bị từ chối do sai thông tin đăng nhập", meta: "Cần đối chiếu nếu lặp lại nhiều lần" },
              { title: "01 cấu hình thông báo đã được cập nhật", meta: "Thực hiện bởi KS. Nguyễn Quốc Bảo" }
            ]
          }
        ]
      };
    case "leadership":
    default:
      return {
        eyebrow: "Điều hành",
        title: "Bảng điều hành lãnh đạo",
        description: "Tổng hợp hồ sơ chờ phê duyệt, đề tài chậm tiến độ, việc quá hạn và báo cáo tổng hợp trong phạm vi Học viện Quân y.",
        primaryActionLabel: "Mở hồ sơ chờ phê duyệt",
        primaryActionHref: "/approvals",
        kpis: [
          { label: "Hồ sơ chờ phê duyệt", value: "08", meta: "3 hồ sơ cần xử lý trong hôm nay", tone: "warning" },
          { label: "Đề tài chậm tiến độ", value: "03", meta: "01 đề tài cần can thiệp trực tiếp", tone: "info" },
          { label: "Việc quá hạn", value: "05", meta: "2 nhiệm vụ thuộc Phòng Quản lý khoa học", tone: "danger" },
          { label: "Báo cáo tổng hợp", value: "12", meta: "7 ngày tới có 12 đầu mục cần theo dõi", tone: "default" }
        ],
        panels: [
          {
            variant: "table",
            title: "Hồ sơ chờ phê duyệt",
            subtitle: "Ưu tiên theo hạn xử lý và kết quả thẩm định hiện có",
            actionLabel: "Xem toàn bộ",
            actionHref: "/approvals",
            rows: proposals.slice(0, 3).map((proposal) => ({
              code: proposal.code,
              title: proposal.title,
              meta: proposal.owner,
              unit: proposal.unit,
              status: proposal.status,
              dueDate: proposal.dueDate,
              href: `/proposals/${proposal.id}`
            }))
          },
          {
            variant: "list",
            title: "Cảnh báo ưu tiên",
            subtitle: "Các tín hiệu cần xử lý hoặc cần theo dõi sát",
            items: [
              { title: "Reviewer quá hạn đánh giá hồ sơ HVQY-2026-014", meta: "Quá hạn 1 ngày - cần nhắc xử lý" },
              { title: "Hồ sơ HVQY-2026-001 đang chờ quyết định phê duyệt", meta: "Hạn xử lý 30/04/2026" },
              { title: "Báo cáo tiến độ quý II sắp đến hạn", meta: "12 báo cáo cần theo dõi trong 7 ngày tới" }
            ]
          },
          {
            variant: "chart",
            title: "Tình hình theo đơn vị",
            subtitle: "Tổng hợp hồ sơ và đầu mục cần xử lý theo đơn vị",
            bars: [
              { label: "Ngoại khoa", height: "150px", value: "06", tone: "emerald" },
              { label: "Nội khoa", height: "112px", value: "04", tone: "amber" },
              { label: "Cận lâm sàng", height: "136px", value: "05", tone: "blue" },
              { label: "Sinh học", height: "84px", value: "02", tone: "teal" },
              { label: "QLKH", height: "168px", value: "07", tone: "maroon" }
            ]
          },
          {
            variant: "list",
            title: "Nhiệm vụ quá hạn",
            subtitle: "Nhiệm vụ cần can thiệp trong phạm vi điều hành",
            actionLabel: "Mở quản lý nhiệm vụ",
            actionHref: "/nhiem-vu",
            items: taskRecords.slice(0, 3).map((task) => ({
              title: task.title,
              meta: `${task.assignee} - ${task.dueLabel}`
            }))
          }
        ]
      };
  }
}
