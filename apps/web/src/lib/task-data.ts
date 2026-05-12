import type { WorkflowStatus } from "@rtms/contracts";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskParticipant = {
  name: string;
  role: string;
  unit: string;
  status: string;
};

export type TaskDocument = {
  name: string;
  meta: string;
  actionLabel?: string;
};

export type TaskTimelineItem = {
  title: string;
  meta: string;
  status: WorkflowStatus;
};

export type TaskRecord = {
  id: string;
  code: string;
  title: string;
  source: string;
  linkedRecord: string;
  assignee: string;
  assigneeRole: string;
  unit: string;
  priority: TaskPriority;
  status: WorkflowStatus;
  dueDate: string;
  dueLabel: string;
  createdAt: string;
  updatedAt: string;
  progressSummary: string;
  resultSummary: string;
  leadershipNote?: string;
  isDueSoon?: boolean;
  isOverdue?: boolean;
  completedThisWeek?: boolean;
  boardColumn: "assigned" | "processing" | "waiting-response" | "pending-result-approval" | "completed";
  participants: TaskParticipant[];
  documents: TaskDocument[];
  updates: TaskTimelineItem[];
  workflow: TaskTimelineItem[];
};

const workflowTitles = [
  "Tạo nhiệm vụ",
  "Phân công người phụ trách",
  "Tiếp nhận nhiệm vụ",
  "Cập nhật tiến độ",
  "Nộp kết quả",
  "Duyệt kết quả",
  "Hoàn thành"
] as const;

const workflowStatusIndex: Record<WorkflowStatus, number> = {
  draft: 0,
  submitted: 0,
  "needs-supplement": 3,
  "in-review": 5,
  processing: 3,
  assigned: 1,
  accepted: 2,
  "in-progress": 3,
  "waiting-response": 4,
  "pending-result-approval": 5,
  "pending-approval": 5,
  approved: 6,
  passed: 6,
  "not-passed": 5,
  rejected: 5,
  overdue: 3,
  completed: 6,
  paused: 3
};

function buildWorkflow(task: Pick<TaskRecord, "status" | "dueLabel" | "assignee" | "updatedAt">): TaskTimelineItem[] {
  const currentIndex = workflowStatusIndex[task.status] ?? 0;

  return workflowTitles.map((title, index) => {
    if (index < currentIndex) {
      return {
        title,
        meta: `Đã hoàn tất trước mốc cập nhật ${task.updatedAt}`,
        status: "completed"
      };
    }

    if (index === currentIndex) {
      return {
        title,
        meta: `Người phụ trách: ${task.assignee} · ${task.dueLabel}`,
        status: task.status
      };
    }

    return {
      title,
      meta: "Đang chờ thực hiện theo quy trình nghiệp vụ",
      status: "draft"
    };
  });
}

function buildDocuments(code: string, owner: string, date: string): TaskDocument[] {
  return [
    {
      name: `Phieu-giao-nhiem-vu-${code}.pdf`,
      meta: `PDF · ${owner} · cập nhật ${date}`,
      actionLabel: "Xem trước"
    },
    {
      name: `Bao-cao-tien-do-${code}.docx`,
      meta: `Word · ${owner} · cập nhật ${date}`,
      actionLabel: "Mở tệp"
    },
    {
      name: `Tong-hop-minh-chung-${code}.zip`,
      meta: `Tệp nén · Tổ thư ký cập nhật ${date}`,
      actionLabel: "Tải danh mục"
    }
  ];
}

function createTask(task: Omit<TaskRecord, "workflow" | "documents">): TaskRecord {
  return {
    ...task,
    documents: buildDocuments(task.code, task.assignee, task.updatedAt),
    workflow: buildWorkflow(task)
  };
}

export const taskRecords: TaskRecord[] = [
  createTask({
    id: "nv-2026-001",
    code: "NV-2026-001",
    title: "Rà soát hồ sơ đề tài HVQY-2026-001 trước khi trình phê duyệt",
    source: "Hồ sơ đề tài",
    linkedRecord: "HVQY-2026-001",
    assignee: "TS. Nguyễn Minh Phương",
    assigneeRole: "Trưởng phòng KHQS",
    unit: "Phòng Quản lý khoa học",
    priority: "critical",
    status: "pending-result-approval",
    dueDate: "14/05/2026",
    dueLabel: "Hạn xử lý 14/05/2026",
    createdAt: "09/05/2026 08:30",
    updatedAt: "12/05/2026 09:45",
    progressSummary: "Đã tổng hợp ý kiến phản biện và chờ lãnh đạo xem xét kết quả cuối cùng.",
    resultSummary: "Dự thảo tờ trình phê duyệt đã hoàn tất, còn chờ xác nhận lần cuối.",
    leadershipNote: "Cần lãnh đạo cho ý kiến trước phiên giao ban chiều 14/05/2026.",
    isDueSoon: true,
    boardColumn: "pending-result-approval",
    participants: [
      { name: "TS. Nguyễn Minh Phương", role: "Phụ trách chính", unit: "Phòng Quản lý khoa học", status: "Đang xử lý" },
      { name: "CN. Vũ Lan", role: "Chuyên viên tổng hợp", unit: "Phòng Quản lý khoa học", status: "Đã cập nhật hồ sơ" },
      { name: "GS. TS. Trần Viết Tiến", role: "Lãnh đạo phê duyệt", unit: "Ban Giám Đốc", status: "Chờ duyệt kết quả" }
    ],
    updates: [
      { title: "Đã tiếp nhận yêu cầu trình phê duyệt", meta: "09/05/2026 08:30 · Hệ thống phân công nhiệm vụ", status: "assigned" },
      { title: "Hoàn tất kiểm tra thành phần hồ sơ", meta: "10/05/2026 15:10 · CN. Vũ Lan", status: "accepted" },
      { title: "Tổng hợp nhận xét reviewer và tổ thư ký", meta: "11/05/2026 17:20 · TS. Nguyễn Minh Phương", status: "in-progress" },
      { title: "Dự thảo tờ trình chờ lãnh đạo phê duyệt", meta: "12/05/2026 09:45 · Chờ ý kiến Ban Giám Đốc", status: "pending-result-approval" }
    ]
  }),
  createTask({
    id: "nv-2026-002",
    code: "NV-2026-002",
    title: "Nhắc đơn vị chủ trì nộp báo cáo tiến độ quý II/2026",
    source: "Báo cáo tiến độ",
    linkedRecord: "BC-TD-Q2-2026",
    assignee: "CN. Vũ Lan",
    assigneeRole: "Chuyên viên theo dõi báo cáo",
    unit: "Phòng Quản lý khoa học",
    priority: "high",
    status: "overdue",
    dueDate: "10/05/2026",
    dueLabel: "Quá hạn 2 ngày",
    createdAt: "05/05/2026 10:00",
    updatedAt: "12/05/2026 08:10",
    progressSummary: "Đã gửi 2 thông báo nhắc việc nhưng đơn vị chủ trì chưa phản hồi đầy đủ.",
    resultSummary: "Chưa nhận được báo cáo chính thức, cần escalte lên lãnh đạo đơn vị.",
    leadershipNote: "Cần lãnh đạo chỉ đạo trực tiếp với Khoa Kiểm soát nhiễm khuẩn.",
    isOverdue: true,
    boardColumn: "processing",
    participants: [
      { name: "CN. Vũ Lan", role: "Theo dõi báo cáo", unit: "Phòng Quản lý khoa học", status: "Quá hạn" },
      { name: "PGS. Trần Thu Hà", role: "Đầu mối đơn vị chủ trì", unit: "Khoa Kiểm soát nhiễm khuẩn", status: "Chưa phản hồi" }
    ],
    updates: [
      { title: "Khởi tạo nhiệm vụ nhắc hạn báo cáo", meta: "05/05/2026 10:00 · Hệ thống điều hành", status: "assigned" },
      { title: "Đơn vị đầu mối đã tiếp nhận yêu cầu", meta: "06/05/2026 09:20 · PGS. Trần Thu Hà", status: "accepted" },
      { title: "Nhắc việc lần 1", meta: "09/05/2026 16:00 · CN. Vũ Lan", status: "in-progress" },
      { title: "Nhiệm vụ chuyển trạng thái quá hạn", meta: "12/05/2026 08:10 · Hệ thống tự động cảnh báo", status: "overdue" }
    ]
  }),
  createTask({
    id: "nv-2026-003",
    code: "NV-2026-003",
    title: "Kiểm tra minh chứng bổ sung hồ sơ HVQY-2026-021",
    source: "Hồ sơ đề tài",
    linkedRecord: "HVQY-2026-021",
    assignee: "ThS. Hoàng Mai",
    assigneeRole: "Chuyên viên kiểm tra hồ sơ",
    unit: "Phòng Quản lý khoa học",
    priority: "medium",
    status: "waiting-response",
    dueDate: "16/05/2026",
    dueLabel: "Chờ đơn vị bổ sung trước 16/05/2026",
    createdAt: "11/05/2026 07:50",
    updatedAt: "12/05/2026 11:30",
    progressSummary: "Đã gửi danh mục tài liệu cần bổ sung và đang chờ phản hồi từ chủ nhiệm đề tài.",
    resultSummary: "Sẽ tiếp tục kiểm tra sau khi nhận đủ bản cam kết và phụ lục dữ liệu.",
    boardColumn: "waiting-response",
    participants: [
      { name: "ThS. Hoàng Mai", role: "Chuyên viên kiểm tra", unit: "Phòng Quản lý khoa học", status: "Đang chờ phản hồi" },
      { name: "ThS. Lê Quốc Huy", role: "Chủ nhiệm đề tài", unit: "Bộ môn Sinh lý bệnh", status: "Cần bổ sung minh chứng" }
    ],
    updates: [
      { title: "Tiếp nhận nhiệm vụ kiểm tra tài liệu bổ sung", meta: "11/05/2026 07:50 · Phòng Quản lý khoa học", status: "assigned" },
      { title: "Đã rà soát danh mục tài liệu còn thiếu", meta: "11/05/2026 14:15 · ThS. Hoàng Mai", status: "in-progress" },
      { title: "Gửi yêu cầu bổ sung đến chủ nhiệm đề tài", meta: "12/05/2026 11:30 · Chờ phản hồi từ đơn vị", status: "waiting-response" }
    ]
  }),
  createTask({
    id: "nv-2026-004",
    code: "NV-2026-004",
    title: "Chuẩn bị chương trình hội thảo khoa học về hồi sức cấp cứu chiến trường",
    source: "Hội thảo khoa học",
    linkedRecord: "HTKH-2026-003",
    assignee: "Thiếu tá, ThS. Bùi Huy Dũng",
    assigneeRole: "Tổ thư ký hội thảo",
    unit: "Trung tâm Huấn luyện kỹ năng y khoa",
    priority: "high",
    status: "in-progress",
    dueDate: "20/05/2026",
    dueLabel: "Còn 8 ngày đến mốc hoàn tất chương trình",
    createdAt: "08/05/2026 13:30",
    updatedAt: "12/05/2026 10:15",
    progressSummary: "Đã chốt khung chương trình, đang chờ xác nhận 2 báo cáo viên khách mời.",
    resultSummary: "Dự thảo chương trình phiên sáng đã hoàn thiện 80%.",
    boardColumn: "processing",
    participants: [
      { name: "Thiếu tá, ThS. Bùi Huy Dũng", role: "Điều phối chương trình", unit: "Trung tâm Huấn luyện kỹ năng y khoa", status: "Đang thực hiện" },
      { name: "TS. Nguyễn Minh Phương", role: "Phê duyệt nội dung", unit: "Phòng Quản lý khoa học", status: "Đã cho ý kiến" }
    ],
    updates: [
      { title: "Khởi tạo nhiệm vụ chuẩn bị hội thảo", meta: "08/05/2026 13:30 · Quyết định phân công", status: "assigned" },
      { title: "Tổ thư ký tiếp nhận và lập kế hoạch", meta: "09/05/2026 09:00 · Thiếu tá, ThS. Bùi Huy Dũng", status: "accepted" },
      { title: "Hoàn tất dự thảo khung chương trình", meta: "12/05/2026 10:15 · Đang chờ xác nhận báo cáo viên", status: "in-progress" }
    ]
  }),
  createTask({
    id: "nv-2026-005",
    code: "NV-2026-005",
    title: "Hoàn thiện biên bản phiên họp Hội đồng y đức số 05/2026",
    source: "Hội đồng y đức",
    linkedRecord: "HĐYĐ-2026-005",
    assignee: "Đại úy, CN. Trần Khánh Ly",
    assigneeRole: "Thư ký hội đồng",
    unit: "Văn phòng Hội đồng y đức",
    priority: "critical",
    status: "pending-result-approval",
    dueDate: "13/05/2026",
    dueLabel: "Hạn chốt biên bản 13/05/2026",
    createdAt: "11/05/2026 18:20",
    updatedAt: "12/05/2026 07:55",
    progressSummary: "Biên bản và danh mục điều kiện kèm theo đã soạn xong, chờ Chủ tịch hội đồng duyệt.",
    resultSummary: "Sẵn sàng ban hành sau khi ký xác nhận kết luận phiên họp.",
    isDueSoon: true,
    leadershipNote: "Cần ưu tiên vì hồ sơ liên quan nghiên cứu can thiệp lâm sàng.",
    boardColumn: "pending-result-approval",
    participants: [
      { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Văn phòng Hội đồng y đức", status: "Chờ duyệt kết quả" },
      { name: "GS. TS. Trần Viết Tiến", role: "Chủ tịch hội đồng", unit: "Ban Giám Đốc", status: "Chưa ký biên bản" }
    ],
    updates: [
      { title: "Phiên họp hội đồng đã kết thúc", meta: "11/05/2026 18:20 · Văn phòng Hội đồng y đức", status: "assigned" },
      { title: "Thư ký tổng hợp kết luận và điều kiện kèm theo", meta: "11/05/2026 21:10 · Đại úy, CN. Trần Khánh Ly", status: "in-progress" },
      { title: "Biên bản chờ Chủ tịch hội đồng duyệt", meta: "12/05/2026 07:55 · Chờ ký xác nhận", status: "pending-result-approval" }
    ]
  }),
  createTask({
    id: "nv-2026-006",
    code: "NV-2026-006",
    title: "Tổng hợp danh sách đề tài sinh viên NCKH đủ điều kiện sơ tuyển",
    source: "Đề tài sinh viên NCKH",
    linkedRecord: "SVNCKH-2026-001",
    assignee: "CN. Phạm Thu Huyền",
    assigneeRole: "Chuyên viên tổng hợp sinh viên NCKH",
    unit: "Phòng Quản lý khoa học",
    priority: "medium",
    status: "accepted",
    dueDate: "18/05/2026",
    dueLabel: "Còn 6 ngày để hoàn tất danh sách",
    createdAt: "10/05/2026 16:40",
    updatedAt: "11/05/2026 08:20",
    progressSummary: "Đã tiếp nhận hồ sơ từ 5 khoa, đang rà soát điều kiện tham gia vòng sơ tuyển.",
    resultSummary: "Danh sách tạm thời gồm 18 đề tài, chờ xác nhận dữ liệu từ 2 bộ môn.",
    boardColumn: "processing",
    participants: [
      { name: "CN. Phạm Thu Huyền", role: "Tổng hợp hồ sơ", unit: "Phòng Quản lý khoa học", status: "Đã tiếp nhận" },
      { name: "ThS. Đặng Văn Tùng", role: "Xác nhận dữ liệu khoa", unit: "Khoa Y học quân sự", status: "Đang phối hợp" }
    ],
    updates: [
      { title: "Tạo nhiệm vụ tổng hợp danh sách sơ tuyển", meta: "10/05/2026 16:40 · Phòng Quản lý khoa học", status: "assigned" },
      { title: "Chuyên viên tiếp nhận đủ hồ sơ từ 5 khoa", meta: "11/05/2026 08:20 · CN. Phạm Thu Huyền", status: "accepted" }
    ]
  }),
  createTask({
    id: "nv-2026-007",
    code: "NV-2026-007",
    title: "Đối chiếu quyết toán kinh phí đề tài cấp Học viện năm 2025",
    source: "Công việc điều hành nội bộ",
    linkedRecord: "QTKP-2025",
    assignee: "TS. Lê Thị Thanh",
    assigneeRole: "Phụ trách tài chính nghiên cứu",
    unit: "Phòng Tài chính",
    priority: "high",
    status: "in-progress",
    dueDate: "22/05/2026",
    dueLabel: "Còn 10 ngày để hoàn tất đối chiếu",
    createdAt: "07/05/2026 11:15",
    updatedAt: "12/05/2026 09:05",
    progressSummary: "Đã đối chiếu 9/14 hồ sơ quyết toán, còn 5 hồ sơ chờ bổ sung chứng từ.",
    resultSummary: "Dự kiến trình báo cáo tổng hợp đầu tuần tới.",
    boardColumn: "processing",
    participants: [
      { name: "TS. Lê Thị Thanh", role: "Phụ trách tài chính", unit: "Phòng Tài chính", status: "Đang thực hiện" },
      { name: "Phòng Quản lý khoa học", role: "Phối hợp xác minh", unit: "Phòng Quản lý khoa học", status: "Đã cung cấp danh mục" }
    ],
    updates: [
      { title: "Giao nhiệm vụ đối chiếu quyết toán", meta: "07/05/2026 11:15 · Ban Giám Đốc", status: "assigned" },
      { title: "Đã tổng hợp hồ sơ cần đối chiếu", meta: "09/05/2026 17:40 · TS. Lê Thị Thanh", status: "accepted" },
      { title: "Hoàn tất đối chiếu 9/14 hồ sơ", meta: "12/05/2026 09:05 · Còn 5 hồ sơ chờ chứng từ", status: "in-progress" }
    ]
  }),
  createTask({
    id: "nv-2026-008",
    code: "NV-2026-008",
    title: "Chuẩn bị thư mời báo cáo viên cho hội thảo điều trị chấn thương",
    source: "Hội thảo khoa học",
    linkedRecord: "HTKH-2026-007",
    assignee: "CN. Nguyễn Thu Hoài",
    assigneeRole: "Thư ký truyền thông hội thảo",
    unit: "Khoa Chấn thương chỉnh hình",
    priority: "medium",
    status: "completed",
    dueDate: "11/05/2026",
    dueLabel: "Đã hoàn tất ngày 11/05/2026",
    createdAt: "06/05/2026 09:10",
    updatedAt: "11/05/2026 16:25",
    progressSummary: "Đã gửi thư mời tới 7 báo cáo viên và nhận đủ phản hồi xác nhận.",
    resultSummary: "100% thư mời đã phát hành, 6/7 báo cáo viên xác nhận lịch trình.",
    completedThisWeek: true,
    boardColumn: "completed",
    participants: [
      { name: "CN. Nguyễn Thu Hoài", role: "Soạn thảo và gửi thư mời", unit: "Khoa Chấn thương chỉnh hình", status: "Hoàn thành" },
      { name: "TS. Bùi Thanh Lâm", role: "Duyệt nội dung thư mời", unit: "Khoa Chấn thương chỉnh hình", status: "Đã duyệt" }
    ],
    updates: [
      { title: "Khởi tạo nhiệm vụ thư mời báo cáo viên", meta: "06/05/2026 09:10 · Ban tổ chức hội thảo", status: "assigned" },
      { title: "Duyệt nội dung thư mời", meta: "08/05/2026 15:00 · TS. Bùi Thanh Lâm", status: "pending-result-approval" },
      { title: "Đã gửi thư mời và nhận phản hồi", meta: "11/05/2026 16:25 · CN. Nguyễn Thu Hoài", status: "completed" }
    ]
  }),
  createTask({
    id: "nv-2026-009",
    code: "NV-2026-009",
    title: "Xác minh điều kiện bảo mật dữ liệu cho nghiên cứu hồi cứu",
    source: "Hội đồng y đức",
    linkedRecord: "HĐYĐ-2026-009",
    assignee: "ThS. Phạm Đức Long",
    assigneeRole: "Chuyên viên pháp chế dữ liệu",
    unit: "Phòng Công nghệ thông tin",
    priority: "high",
    status: "waiting-response",
    dueDate: "17/05/2026",
    dueLabel: "Chờ đơn vị nghiên cứu bổ sung trước 17/05/2026",
    createdAt: "10/05/2026 09:30",
    updatedAt: "12/05/2026 10:40",
    progressSummary: "Đã đối chiếu biểu mẫu đồng thuận, còn thiếu cam kết phân quyền truy cập dữ liệu.",
    resultSummary: "Chỉ thông qua khi đơn vị chủ trì nộp đủ kế hoạch lưu trữ dữ liệu.",
    boardColumn: "waiting-response",
    participants: [
      { name: "ThS. Phạm Đức Long", role: "Thẩm tra bảo mật dữ liệu", unit: "Phòng Công nghệ thông tin", status: "Đang chờ bổ sung" },
      { name: "BSCKII. Nguyễn Mạnh Hùng", role: "Đầu mối nghiên cứu", unit: "Bệnh viện Quân y 103", status: "Chưa nộp tài liệu" }
    ],
    updates: [
      { title: "Tiếp nhận hồ sơ xác minh bảo mật dữ liệu", meta: "10/05/2026 09:30 · Văn phòng Hội đồng y đức", status: "assigned" },
      { title: "Đã rà soát biểu mẫu đồng thuận", meta: "11/05/2026 13:20 · ThS. Phạm Đức Long", status: "in-progress" },
      { title: "Gửi yêu cầu bổ sung kế hoạch lưu trữ dữ liệu", meta: "12/05/2026 10:40 · Chờ phản hồi đơn vị nghiên cứu", status: "waiting-response" }
    ]
  }),
  createTask({
    id: "nv-2026-010",
    code: "NV-2026-010",
    title: "Hoàn tất báo cáo tuần phục vụ giao ban lãnh đạo khối khoa học",
    source: "Công việc điều hành nội bộ",
    linkedRecord: "GB-KH-2026-W19",
    assignee: "Thiếu tá, CN. Lương Văn Hải",
    assigneeRole: "Chuyên viên tổng hợp giao ban",
    unit: "Phòng Quản lý khoa học",
    priority: "critical",
    status: "assigned",
    dueDate: "13/05/2026",
    dueLabel: "Còn 1 ngày đến hạn giao ban",
    createdAt: "12/05/2026 07:20",
    updatedAt: "12/05/2026 07:20",
    progressSummary: "Nhiệm vụ mới giao, chưa phát sinh cập nhật xử lý.",
    resultSummary: "Báo cáo sẽ tổng hợp từ hồ sơ, nhiệm vụ, hội thảo và hội đồng y đức trong tuần.",
    isDueSoon: true,
    leadershipNote: "Ưu tiên số 1 trong phiên làm việc sáng nay.",
    boardColumn: "assigned",
    participants: [
      { name: "Thiếu tá, CN. Lương Văn Hải", role: "Tổng hợp giao ban", unit: "Phòng Quản lý khoa học", status: "Mới giao" },
      { name: "GS. TS. Trần Viết Tiến", role: "Người nhận báo cáo", unit: "Ban Giám Đốc", status: "Chờ báo cáo" }
    ],
    updates: [
      { title: "Lãnh đạo giao nhiệm vụ chuẩn bị báo cáo tuần", meta: "12/05/2026 07:20 · Ban Giám Đốc", status: "assigned" }
    ]
  }),
  createTask({
    id: "nv-2026-011",
    code: "NV-2026-011",
    title: "Đối chiếu danh sách reviewer tham gia đợt tiếp nhận 2/2026",
    source: "Hồ sơ đề tài",
    linkedRecord: "ĐTN-2026-02",
    assignee: "CN. Vũ Lan",
    assigneeRole: "Điều phối reviewer",
    unit: "Phòng Quản lý khoa học",
    priority: "medium",
    status: "completed",
    dueDate: "09/05/2026",
    dueLabel: "Đã hoàn tất ngày 09/05/2026",
    createdAt: "04/05/2026 14:00",
    updatedAt: "09/05/2026 17:45",
    progressSummary: "Đã cập nhật đủ danh sách reviewer theo lĩnh vực chuyên môn.",
    resultSummary: "Có 22 reviewer sẵn sàng phân công cho đợt tiếp nhận 2/2026.",
    completedThisWeek: true,
    boardColumn: "completed",
    participants: [
      { name: "CN. Vũ Lan", role: "Điều phối reviewer", unit: "Phòng Quản lý khoa học", status: "Hoàn thành" }
    ],
    updates: [
      { title: "Khởi tạo nhiệm vụ đối chiếu reviewer", meta: "04/05/2026 14:00 · Phòng Quản lý khoa học", status: "assigned" },
      { title: "Danh sách reviewer được xác nhận", meta: "09/05/2026 17:45 · CN. Vũ Lan", status: "completed" }
    ]
  }),
  createTask({
    id: "nv-2026-012",
    code: "NV-2026-012",
    title: "Theo dõi việc nộp minh chứng nghiệm thu đề tài huấn luyện y khoa",
    source: "Báo cáo tiến độ",
    linkedRecord: "DT-NT-2026-011",
    assignee: "ThS. Hoàng Mai",
    assigneeRole: "Chuyên viên theo dõi nghiệm thu",
    unit: "Trung tâm Huấn luyện kỹ năng y khoa",
    priority: "high",
    status: "in-progress",
    dueDate: "19/05/2026",
    dueLabel: "Còn 7 ngày đến hạn nghiệm thu",
    createdAt: "09/05/2026 10:45",
    updatedAt: "12/05/2026 08:55",
    progressSummary: "Đã nhận báo cáo kết quả, còn chờ video minh chứng và biên bản đánh giá nội bộ.",
    resultSummary: "Hồ sơ nghiệm thu dự kiến đủ điều kiện trong 2 ngày tới.",
    isDueSoon: true,
    boardColumn: "processing",
    participants: [
      { name: "ThS. Hoàng Mai", role: "Theo dõi nghiệm thu", unit: "Phòng Quản lý khoa học", status: "Đang thực hiện" },
      { name: "Đại tá, TS. Phạm Anh Tuấn", role: "Chủ nhiệm đề tài", unit: "Trung tâm Huấn luyện kỹ năng y khoa", status: "Đang bổ sung minh chứng" }
    ],
    updates: [
      { title: "Giao nhiệm vụ theo dõi hồ sơ nghiệm thu", meta: "09/05/2026 10:45 · Phòng Quản lý khoa học", status: "assigned" },
      { title: "Đã tiếp nhận báo cáo kết quả và danh mục tệp", meta: "10/05/2026 15:00 · ThS. Hoàng Mai", status: "accepted" },
      { title: "Chờ nộp video minh chứng và biên bản nội bộ", meta: "12/05/2026 08:55 · Đang thực hiện", status: "in-progress" }
    ]
  }),
  createTask({
    id: "nv-2026-013",
    code: "NV-2026-013",
    title: "Bổ sung thành phần tổ thư ký hội thảo cấp Học viện tháng 6/2026",
    source: "Hội thảo khoa học",
    linkedRecord: "HTKH-2026-011",
    assignee: "TS. Nguyễn Minh Phương",
    assigneeRole: "Phụ trách điều phối hội thảo",
    unit: "Phòng Quản lý khoa học",
    priority: "low",
    status: "paused",
    dueDate: "25/05/2026",
    dueLabel: "Tạm dừng đến khi có quyết định nhân sự",
    createdAt: "08/05/2026 11:10",
    updatedAt: "10/05/2026 16:30",
    progressSummary: "Tạm dừng theo chỉ đạo do chờ kiện toàn danh sách cán bộ tham gia.",
    resultSummary: "Sẽ kích hoạt lại sau khi Văn phòng Học viện ban hành quyết định nhân sự.",
    boardColumn: "processing",
    participants: [
      { name: "TS. Nguyễn Minh Phương", role: "Điều phối nhiệm vụ", unit: "Phòng Quản lý khoa học", status: "Tạm dừng" },
      { name: "Văn phòng Học viện", role: "Đầu mối nhân sự", unit: "Văn phòng Học viện", status: "Chờ quyết định" }
    ],
    updates: [
      { title: "Đã lập danh sách tổ thư ký dự kiến", meta: "08/05/2026 11:10 · Phòng Quản lý khoa học", status: "accepted" },
      { title: "Tạm dừng chờ quyết định kiện toàn nhân sự", meta: "10/05/2026 16:30 · Theo chỉ đạo Văn phòng Học viện", status: "paused" }
    ]
  }),
  createTask({
    id: "nv-2026-014",
    code: "NV-2026-014",
    title: "Kiểm tra việc hoàn tất kết luận sau phiên họp Hội đồng y đức khẩn",
    source: "Hội đồng y đức",
    linkedRecord: "HĐYĐ-2026-011",
    assignee: "Đại úy, CN. Trần Khánh Ly",
    assigneeRole: "Thư ký hội đồng",
    unit: "Văn phòng Hội đồng y đức",
    priority: "critical",
    status: "completed",
    dueDate: "08/05/2026",
    dueLabel: "Đã hoàn tất ngày 08/05/2026",
    createdAt: "06/05/2026 07:35",
    updatedAt: "08/05/2026 18:10",
    progressSummary: "Biên bản, kết luận và danh mục điều kiện đã ban hành đầy đủ.",
    resultSummary: "Hồ sơ đủ điều kiện chuyển sang theo dõi sau kết luận.",
    completedThisWeek: true,
    boardColumn: "completed",
    participants: [
      { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Văn phòng Hội đồng y đức", status: "Hoàn thành" },
      { name: "GS. TS. Trần Viết Tiến", role: "Chủ tịch hội đồng", unit: "Ban Giám Đốc", status: "Đã phê duyệt" }
    ],
    updates: [
      { title: "Phiên họp y đức khẩn kết thúc", meta: "06/05/2026 07:35 · Văn phòng Hội đồng y đức", status: "assigned" },
      { title: "Duyệt kết luận cuối cùng", meta: "08/05/2026 11:45 · Chủ tịch hội đồng", status: "pending-result-approval" },
      { title: "Ban hành biên bản và kết luận", meta: "08/05/2026 18:10 · Đại úy, CN. Trần Khánh Ly", status: "completed" }
    ]
  })
];

export function getTaskById(id: string) {
  return taskRecords.find((task) => task.id === id) ?? null;
}

export function getTaskSummary() {
  const total = taskRecords.length;
  const processing = taskRecords.filter((task) =>
    ["accepted", "in-progress", "waiting-response", "pending-result-approval", "overdue"].includes(task.status)
  ).length;
  const dueSoon = taskRecords.filter((task) => task.isDueSoon).length;
  const overdue = taskRecords.filter((task) => task.isOverdue || task.status === "overdue").length;
  const completedThisWeek = taskRecords.filter((task) => task.completedThisWeek).length;

  return { total, processing, dueSoon, overdue, completedThisWeek };
}

export function getTaskStatusOptions() {
  return [
    "Mới giao",
    "Đã tiếp nhận",
    "Đang thực hiện",
    "Chờ phản hồi",
    "Chờ duyệt kết quả",
    "Hoàn thành",
    "Quá hạn",
    "Tạm dừng"
  ];
}

export function getTaskPriorityOptions() {
  return ["Khẩn cấp", "Cao", "Trung bình", "Thấp"];
}

export function getTaskUnitOptions() {
  return [...new Set(taskRecords.map((task) => task.unit))];
}

export function getOverdueTasks() {
  return taskRecords.filter((task) => task.isOverdue || task.status === "overdue");
}

export function getLeadershipTasks() {
  return taskRecords.filter((task) => task.leadershipNote);
}

export function getTaskBoardColumns() {
  return [
    { key: "assigned", label: "Mới giao" },
    { key: "processing", label: "Đang thực hiện" },
    { key: "waiting-response", label: "Chờ phản hồi" },
    { key: "pending-result-approval", label: "Chờ duyệt kết quả" },
    { key: "completed", label: "Hoàn thành" }
  ] as const;
}

export function getTasksByBoardColumn(column: TaskRecord["boardColumn"]) {
  return taskRecords.filter((task) => task.boardColumn === column);
}

export function getTaskUnitLoad() {
  const toneCycle = ["emerald", "amber", "blue", "teal", "maroon"] as const;
  const grouped = [...new Set(taskRecords.map((task) => task.unit))].map((unit, index) => {
    const count = taskRecords.filter((task) => task.unit === unit).length;
    return {
      label: unit
        .replace("Phòng ", "")
        .replace("Trung tâm ", "TT ")
        .replace("Văn phòng ", "VP "),
      count,
      height: `${72 + count * 14}px`,
      tone: toneCycle[index % toneCycle.length]
    };
  });

  return grouped;
}
