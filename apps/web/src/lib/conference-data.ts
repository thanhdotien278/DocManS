export type ConferenceStatus =
  | "conference-draft"
  | "conference-awaiting-appraisal"
  | "conference-pending-approval"
  | "conference-approved"
  | "conference-preparing"
  | "conference-in-session"
  | "conference-awaiting-report"
  | "conference-completed"
  | "conference-postponed";

export type ConferencePerson = {
  name: string;
  role: string;
  unit: string;
  status: string;
};

export type ConferenceSubmission = {
  title: string;
  author: string;
  unit: string;
  status: string;
};

export type ConferenceProgramItem = {
  time: string;
  topic: string;
  owner: string;
  location: string;
};

export type ConferenceDocument = {
  name: string;
  meta: string;
  actionLabel?: string;
};

export type ConferenceTimelineItem = {
  title: string;
  meta: string;
  status: string;
};

export type ConferenceRecord = {
  id: string;
  code: string;
  title: string;
  eventType: string;
  level: string;
  format: string;
  status: ConferenceStatus;
  organizingUnit: string;
  chair: string;
  secretaryOwner: string;
  timeLabel: string;
  month: string;
  venue: string;
  delegateCount: number;
  confirmedDelegates: number;
  pendingDelegates: number;
  objective: string;
  scope: string;
  planSummary: string;
  programSummary: string;
  postEventReport: string;
  conclusionSummary: string;
  updatedAt: string;
  upcoming?: boolean;
  awaitingApproval?: boolean;
  missingReport?: boolean;
  program: ConferenceProgramItem[];
  speakers: ConferencePerson[];
  delegates: ConferencePerson[];
  submissions: ConferenceSubmission[];
  documents: ConferenceDocument[];
  relatedTasks: ConferenceTimelineItem[];
  workflow: ConferenceTimelineItem[];
  history: ConferenceTimelineItem[];
};

const workflowTitles = [
  "Đề xuất tổ chức",
  "Thẩm định nội dung",
  "Phê duyệt kế hoạch",
  "Mời báo cáo viên",
  "Công bố chương trình",
  "Tổ chức hội thảo",
  "Nộp biên bản và tài liệu",
  "Hoàn tất báo cáo"
] as const;

const workflowStatusIndex: Record<ConferenceStatus, number> = {
  "conference-draft": 0,
  "conference-awaiting-appraisal": 1,
  "conference-pending-approval": 2,
  "conference-approved": 3,
  "conference-preparing": 4,
  "conference-in-session": 5,
  "conference-awaiting-report": 6,
  "conference-completed": 7,
  "conference-postponed": 3
};

function buildWorkflow(record: Pick<ConferenceRecord, "status" | "secretaryOwner" | "timeLabel" | "updatedAt">): ConferenceTimelineItem[] {
  const currentIndex = workflowStatusIndex[record.status] ?? 0;

  return workflowTitles.map((title, index) => {
    if (index < currentIndex) {
      return {
        title,
        meta: `Đã hoàn tất trước mốc cập nhật ${record.updatedAt}`,
        status: "completed"
      };
    }

    if (index === currentIndex) {
      return {
        title,
        meta: `${record.secretaryOwner} đang theo dõi · ${record.timeLabel}`,
        status: record.status
      };
    }

    return {
      title,
      meta: "Đang chờ thực hiện theo kế hoạch tổ chức hội thảo",
      status: "draft"
    };
  });
}

function buildDocuments(code: string, owner: string, date: string): ConferenceDocument[] {
  return [
    { name: `Ke-hoach-to-chuc-${code}.pdf`, meta: `PDF · ${owner} · cập nhật ${date}`, actionLabel: "Xem kế hoạch" },
    { name: `Cong-van-moi-bao-cao-vien-${code}.docx`, meta: `Văn bản · Phòng KHQS · cập nhật ${date}`, actionLabel: "Mở công văn" },
    { name: `Chuong-trinh-hoi-thao-${code}.pdf`, meta: `PDF · Ban tổ chức · cập nhật ${date}`, actionLabel: "Xem chương trình" },
    { name: `Danh-sach-dai-bieu-${code}.xlsx`, meta: `Bảng dữ liệu · Ban thư ký · cập nhật ${date}`, actionLabel: "Mở danh sách" },
    { name: `Tai-lieu-bao-cao-${code}.zip`, meta: `Tệp nén · Báo cáo viên · cập nhật ${date}`, actionLabel: "Xem tài liệu" },
    { name: `Bien-ban-hoi-thao-${code}.pdf`, meta: `PDF · Thư ký phiên · cập nhật ${date}`, actionLabel: "Xem biên bản" },
    { name: `Ket-luan-hoi-thao-${code}.pdf`, meta: `PDF · Chủ trì hội thảo · cập nhật ${date}`, actionLabel: "Xem kết luận" },
    { name: `Bao-cao-sau-hoi-thao-${code}.docx`, meta: `Văn bản · Đơn vị tổ chức · cập nhật ${date}`, actionLabel: "Mở báo cáo" }
  ];
}

function speakers(mainSpeaker: string, guestSpeaker: string, chair: string, secretary: string, unit: string): ConferencePerson[] {
  return [
    { name: mainSpeaker, role: "Báo cáo viên chính", unit, status: "Đã xác nhận nội dung báo cáo" },
    { name: guestSpeaker, role: "Báo cáo viên khách mời", unit: "Đơn vị phối hợp", status: "Đã xác nhận tham dự" },
    { name: chair, role: "Chủ trì phiên", unit: "Học viện Quân y", status: "Chủ trì chương trình" },
    { name: secretary, role: "Thư ký phiên", unit: "Phòng Khoa học Quân sự", status: "Tổng hợp tài liệu và biên bản" }
  ];
}

function delegates(unit: string, confirmed: number, pending: number): ConferencePerson[] {
  return [
    { name: `${confirmed} đại biểu`, role: "Đại biểu đã xác nhận", unit, status: "Đã xác nhận tham dự theo thư mời" },
    { name: `${pending} đại biểu`, role: "Đại biểu chưa xác nhận", unit: "Các đơn vị liên quan", status: "Đang chờ phản hồi trước hạn chốt danh sách" },
    { name: "Đại diện Phòng Đào tạo", role: "Đại biểu phối hợp", unit: "Phòng Đào tạo", status: "Theo dõi nội dung chuyên môn" },
    { name: "Đại diện Ban Sau đại học", role: "Đại biểu phối hợp", unit: "Ban Sau đại học", status: "Phối hợp quản lý học viên tham dự" }
  ];
}

function program(opening: string, mainTopic: string, closing: string, venue: string): ConferenceProgramItem[] {
  return [
    { time: "08:00 - 08:20", topic: "Ổn định tổ chức, tuyên bố lý do, giới thiệu đại biểu", owner: "Ban tổ chức", location: venue },
    { time: "08:20 - 08:45", topic: opening, owner: "Chủ trì hội thảo", location: venue },
    { time: "08:45 - 10:15", topic: mainTopic, owner: "Báo cáo viên chính", location: venue },
    { time: "10:15 - 11:15", topic: "Thảo luận khoa học và tiếp nhận ý kiến góp ý", owner: "Chủ trì phiên", location: venue },
    { time: "11:15 - 11:30", topic: closing, owner: "Thư ký phiên", location: venue }
  ];
}

function submissions(topic: string, unit: string): ConferenceSubmission[] {
  return [
    { title: topic, author: "TS. Nguyễn Minh Phương", unit, status: "Đã duyệt trình bày" },
    { title: "Báo cáo kinh nghiệm triển khai tại đơn vị", author: "ThS. Trần Khánh Ly", unit, status: "Đã nhận bản toàn văn" },
    { title: "Trao đổi phương pháp và định hướng nghiên cứu tiếp theo", author: "PGS. TS. Hoàng Đức Minh", unit: "Đơn vị phối hợp", status: "Chờ hoàn thiện tóm tắt" }
  ];
}

function createConferenceRecord(record: Omit<ConferenceRecord, "workflow" | "documents">): ConferenceRecord {
  return {
    ...record,
    documents: buildDocuments(record.code, record.secretaryOwner, record.updatedAt),
    workflow: buildWorkflow(record)
  };
}

export const conferenceRecords: ConferenceRecord[] = [
  createConferenceRecord({
    id: "htkh-2026-001",
    code: "HTKH-2026-001",
    title: "Hội thảo khoa học về chuyển đổi số trong quản lý nghiên cứu y học quân sự",
    eventType: "Hội thảo khoa học cấp Học viện",
    level: "Cấp Học viện",
    format: "Kết hợp",
    status: "conference-preparing",
    organizingUnit: "Phòng Khoa học Quân sự",
    chair: "GS. TS. Trần Viết Tiến",
    secretaryOwner: "TS. Nguyễn Minh Phương",
    timeLabel: "20/05/2026 · 08:00",
    month: "05/2026",
    venue: "Hội trường A · kết nối trực tuyến bảo mật",
    delegateCount: 180,
    confirmedDelegates: 142,
    pendingDelegates: 38,
    objective: "Thống nhất định hướng ứng dụng nền tảng quản lý nghiên cứu trong toàn Học viện.",
    scope: "Các phòng ban chức năng, khoa/bộ môn, bệnh viện thực hành và nhóm chủ nhiệm đề tài.",
    planSummary: "Kế hoạch đã được phê duyệt, đang chốt danh sách đại biểu và tài liệu trình bày.",
    programSummary: "Chương trình gồm báo cáo định hướng, tham luận đơn vị và phiên thảo luận điều phối dữ liệu nghiên cứu.",
    postEventReport: "Chưa đến thời hạn nộp báo cáo sau hội thảo.",
    conclusionSummary: "Dự kiến ban hành kết luận sau khi tổng hợp ý kiến các đơn vị.",
    updatedAt: "12/05/2026 10:30",
    upcoming: true,
    program: program(
      "Phát biểu định hướng chuyển đổi số nghiên cứu khoa học",
      "Báo cáo giải pháp quản lý quy trình đề tài, hội đồng và hội thảo khoa học",
      "Kết luận định hướng triển khai thí điểm",
      "Hội trường A"
    ),
    speakers: speakers("TS. Nguyễn Minh Phương", "PGS. TS. Hoàng Đức Minh", "GS. TS. Trần Viết Tiến", "Đại úy, CN. Trần Khánh Ly", "Phòng Khoa học Quân sự"),
    delegates: delegates("Các khoa/bộ môn", 142, 38),
    submissions: submissions("Mô hình dữ liệu phục vụ quản trị đề tài và hội thảo khoa học", "Phòng Khoa học Quân sự"),
    relatedTasks: [
      { title: "Chốt danh sách đại biểu tham dự", meta: "HTKH-2026-001 · Phòng KHQS · hạn 16/05/2026", status: "in-progress" },
      { title: "Hoàn thiện bộ tài liệu trình chiếu", meta: "HTKH-2026-001 · Ban thư ký · hạn 18/05/2026", status: "waiting-response" }
    ],
    history: [
      { title: "Đề xuất tổ chức hội thảo", meta: "28/04/2026 09:00 · Phòng Khoa học Quân sự", status: "conference-draft" },
      { title: "Phê duyệt kế hoạch tổ chức", meta: "06/05/2026 15:20 · Ban Giám đốc", status: "conference-approved" },
      { title: "Công bố chương trình dự kiến", meta: "12/05/2026 10:30 · Ban tổ chức", status: "conference-preparing" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-002",
    code: "HTKH-2026-002",
    title: "Tọa đàm khoa học về an toàn dữ liệu trong nghiên cứu lâm sàng",
    eventType: "Tọa đàm khoa học",
    level: "Chuyên đề",
    format: "Trực tiếp",
    status: "conference-pending-approval",
    organizingUnit: "Khoa Y học lâm sàng",
    chair: "PGS. TS. Lê Thị Thanh Hương",
    secretaryOwner: "Thiếu tá, ThS. Bùi Huy Dũng",
    timeLabel: "28/05/2026 · 14:00",
    month: "05/2026",
    venue: "Phòng họp A2",
    delegateCount: 60,
    confirmedDelegates: 41,
    pendingDelegates: 19,
    objective: "Rà soát quy trình bảo mật dữ liệu nghiên cứu lâm sàng và yêu cầu phối hợp với Hội đồng y đức.",
    scope: "Các nhóm nghiên cứu lâm sàng, tổ thư ký hội đồng và cán bộ quản trị dữ liệu.",
    planSummary: "Hồ sơ kế hoạch đã hoàn tất thẩm định nội dung, đang chờ phê duyệt tổ chức.",
    programSummary: "Chương trình tập trung vào quản trị dữ liệu bệnh án, ẩn danh dữ liệu và lưu vết truy cập.",
    postEventReport: "Chưa phát sinh báo cáo sau tọa đàm.",
    conclusionSummary: "Chưa có kết luận do kế hoạch chưa được phê duyệt.",
    updatedAt: "12/05/2026 14:10",
    awaitingApproval: true,
    upcoming: true,
    program: program("Định hướng quản trị dữ liệu nghiên cứu", "Thảo luận tiêu chuẩn bảo mật dữ liệu lâm sàng", "Thống nhất khuyến nghị trình lãnh đạo", "Phòng họp A2"),
    speakers: speakers("PGS. TS. Nguyễn Văn Khánh", "TS. Đỗ Minh Trung", "PGS. TS. Lê Thị Thanh Hương", "Thiếu tá, ThS. Bùi Huy Dũng", "Khoa Y học lâm sàng"),
    delegates: delegates("Khoa Y học lâm sàng", 41, 19),
    submissions: submissions("Khung kiểm soát truy cập dữ liệu bệnh án trong nghiên cứu", "Khoa Y học lâm sàng"),
    relatedTasks: [
      { title: "Trình lãnh đạo phê duyệt kế hoạch tọa đàm", meta: "HTKH-2026-002 · Phòng KHQS · hạn 15/05/2026", status: "pending-approval" }
    ],
    history: [
      { title: "Tiếp nhận đề xuất tọa đàm", meta: "05/05/2026 08:40 · Khoa Y học lâm sàng", status: "conference-draft" },
      { title: "Hoàn tất thẩm định nội dung", meta: "11/05/2026 17:00 · Phòng KHQS", status: "conference-awaiting-appraisal" },
      { title: "Chuyển phê duyệt kế hoạch", meta: "12/05/2026 14:10 · Ban thư ký", status: "conference-pending-approval" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-003",
    code: "HTKH-2026-003",
    title: "Sinh hoạt khoa học chuyên đề phục hồi chức năng sau chấn thương",
    eventType: "Sinh hoạt khoa học chuyên đề",
    level: "Cấp khoa",
    format: "Trực tiếp",
    status: "conference-approved",
    organizingUnit: "Khoa Chấn thương chỉnh hình",
    chair: "PGS. TS. Hoàng Đức Minh",
    secretaryOwner: "ThS. Lê Quốc Huy",
    timeLabel: "24/05/2026 · 08:30",
    month: "05/2026",
    venue: "Giảng đường Khoa Chấn thương chỉnh hình",
    delegateCount: 75,
    confirmedDelegates: 58,
    pendingDelegates: 17,
    objective: "Cập nhật kinh nghiệm phục hồi chức năng sớm và tiêu chí theo dõi an toàn người bệnh.",
    scope: "Bác sĩ, điều dưỡng, học viên sau đại học và nhóm nghiên cứu chuyên ngành.",
    planSummary: "Kế hoạch đã được phê duyệt, đang chuẩn bị thư mời báo cáo viên và tài liệu.",
    programSummary: "Gồm hai báo cáo chuyên đề, thảo luận tình huống và thống nhất nội dung nghiên cứu tiếp theo.",
    postEventReport: "Chưa đến thời hạn nộp báo cáo sau sinh hoạt khoa học.",
    conclusionSummary: "Dự kiến ghi nhận khuyến nghị cập nhật quy trình theo dõi phục hồi chức năng.",
    updatedAt: "10/05/2026 16:40",
    upcoming: true,
    program: program("Khai mạc sinh hoạt khoa học chuyên đề", "Phục hồi chức năng sớm sau chấn thương chi dưới", "Tổng hợp khuyến nghị chuyên môn", "Giảng đường khoa"),
    speakers: speakers("TS. Phạm Anh Tuấn", "BSCKII. Nguyễn Thị Mai", "PGS. TS. Hoàng Đức Minh", "ThS. Lê Quốc Huy", "Khoa Chấn thương chỉnh hình"),
    delegates: delegates("Khoa Chấn thương chỉnh hình", 58, 17),
    submissions: submissions("Theo dõi kết quả phục hồi chức năng sớm trong điều trị nội trú", "Khoa Chấn thương chỉnh hình"),
    relatedTasks: [
      { title: "Gửi thư mời báo cáo viên khách mời", meta: "HTKH-2026-003 · Khoa Chấn thương chỉnh hình", status: "in-progress" }
    ],
    history: [
      { title: "Khoa gửi kế hoạch tổ chức", meta: "29/04/2026 10:00 · Khoa Chấn thương chỉnh hình", status: "conference-draft" },
      { title: "Phê duyệt kế hoạch cấp khoa", meta: "10/05/2026 16:40 · Phòng KHQS", status: "conference-approved" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-004",
    code: "HTKH-2026-004",
    title: "Hội thảo liên viện về hồi sức cấp cứu trong điều kiện quân y",
    eventType: "Hội thảo liên viện",
    level: "Liên viện",
    format: "Kết hợp",
    status: "conference-awaiting-appraisal",
    organizingUnit: "Khoa Hồi sức cấp cứu",
    chair: "PGS. TS. Trần Thu Hà",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    timeLabel: "12/06/2026 · 08:00",
    month: "06/2026",
    venue: "Hội trường B · điểm cầu Bệnh viện thực hành",
    delegateCount: 220,
    confirmedDelegates: 96,
    pendingDelegates: 124,
    objective: "Chia sẻ kinh nghiệm tổ chức hồi sức cấp cứu và điều phối chuyên môn giữa các đơn vị quân y.",
    scope: "Các bệnh viện thực hành, khoa hồi sức, khoa cấp cứu và đơn vị huấn luyện quân y.",
    planSummary: "Đề xuất đã nộp, đang thẩm định nội dung phối hợp liên viện và danh mục báo cáo.",
    programSummary: "Dự kiến có phiên toàn thể và phiên chuyên đề về vận chuyển cấp cứu, kiểm soát nhiễm khuẩn, điều trị hồi sức.",
    postEventReport: "Chưa phát sinh báo cáo sau hội thảo.",
    conclusionSummary: "Chưa có kết luận do đang thẩm định nội dung.",
    updatedAt: "12/05/2026 09:45",
    program: program("Khai mạc hội thảo liên viện", "Điều phối hồi sức cấp cứu trong tình huống quân y phức tạp", "Tổng hợp kiến nghị phối hợp liên viện", "Hội trường B"),
    speakers: speakers("PGS. TS. Trần Thu Hà", "PGS. TS. Phạm Minh Đức", "PGS. TS. Trần Thu Hà", "Đại úy, CN. Trần Khánh Ly", "Khoa Hồi sức cấp cứu"),
    delegates: delegates("Khoa Hồi sức cấp cứu", 96, 124),
    submissions: submissions("Mô hình điều phối hồi sức cấp cứu liên viện", "Khoa Hồi sức cấp cứu"),
    relatedTasks: [
      { title: "Rà soát danh mục báo cáo liên viện", meta: "HTKH-2026-004 · Phòng KHQS · hạn 20/05/2026", status: "in-review" }
    ],
    history: [
      { title: "Tiếp nhận đề xuất liên viện", meta: "09/05/2026 09:30 · Khoa Hồi sức cấp cứu", status: "conference-draft" },
      { title: "Bắt đầu thẩm định nội dung", meta: "12/05/2026 09:45 · Phòng KHQS", status: "conference-awaiting-appraisal" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-005",
    code: "HTKH-2026-005",
    title: "Hội nghị báo cáo kết quả nghiên cứu đề tài cấp cơ sở năm 2025",
    eventType: "Hội nghị báo cáo kết quả nghiên cứu",
    level: "Cấp Học viện",
    format: "Trực tiếp",
    status: "conference-awaiting-report",
    organizingUnit: "Ban Quản lý KHQS",
    chair: "TS. Nguyễn Minh Phương",
    secretaryOwner: "Thiếu tá, ThS. Bùi Huy Dũng",
    timeLabel: "08/05/2026 · đã tổ chức",
    month: "05/2026",
    venue: "Hội trường A",
    delegateCount: 160,
    confirmedDelegates: 151,
    pendingDelegates: 9,
    objective: "Tổng hợp kết quả nghiên cứu đề tài cấp cơ sở và xác định hướng chuyển giao ứng dụng.",
    scope: "Chủ nhiệm đề tài cấp cơ sở, hội đồng nghiệm thu, lãnh đạo đơn vị và phòng chức năng.",
    planSummary: "Hội nghị đã tổ chức, đang chờ nộp đầy đủ biên bản và báo cáo sau hội thảo.",
    programSummary: "Đã hoàn thành các phiên báo cáo kết quả, phản biện và kết luận định hướng ứng dụng.",
    postEventReport: "Còn thiếu báo cáo tổng hợp sau hội nghị và phụ lục danh mục sản phẩm.",
    conclusionSummary: "Chủ trì yêu cầu phân nhóm kết quả có khả năng chuyển giao trong quý II/2026.",
    updatedAt: "12/05/2026 15:05",
    missingReport: true,
    program: program("Khai mạc hội nghị báo cáo kết quả", "Tổng hợp kết quả đề tài cấp cơ sở năm 2025", "Kết luận phân nhóm sản phẩm nghiên cứu", "Hội trường A"),
    speakers: speakers("TS. Nguyễn Minh Phương", "PGS. TS. Nguyễn Văn Khánh", "TS. Nguyễn Minh Phương", "Thiếu tá, ThS. Bùi Huy Dũng", "Ban Quản lý KHQS"),
    delegates: delegates("Các chủ nhiệm đề tài", 151, 9),
    submissions: submissions("Tổng hợp kết quả nghiệm thu đề tài cấp cơ sở năm 2025", "Ban Quản lý KHQS"),
    relatedTasks: [
      { title: "Nộp báo cáo sau hội nghị", meta: "HTKH-2026-005 · Ban Quản lý KHQS · quá hạn 12/05/2026", status: "overdue" },
      { title: "Hoàn thiện phụ lục sản phẩm nghiên cứu", meta: "HTKH-2026-005 · Phòng KHQS", status: "waiting-response" }
    ],
    history: [
      { title: "Tổ chức hội nghị báo cáo kết quả", meta: "08/05/2026 08:00 · Hội trường A", status: "conference-in-session" },
      { title: "Nhắc nộp báo cáo sau hội nghị", meta: "12/05/2026 15:05 · Phòng KHQS", status: "conference-awaiting-report" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-006",
    code: "HTKH-2026-006",
    title: "Hội thảo cấp khoa về nghiên cứu dịch tễ học quân sự",
    eventType: "Hội thảo cấp khoa",
    level: "Cấp khoa",
    format: "Trực tuyến",
    status: "conference-in-session",
    organizingUnit: "Bộ môn Dịch tễ học quân sự",
    chair: "TS. Lê Minh Châu",
    secretaryOwner: "ThS. Trần Khánh Ly",
    timeLabel: "12/05/2026 · đang tổ chức",
    month: "05/2026",
    venue: "Phòng họp trực tuyến bảo mật",
    delegateCount: 90,
    confirmedDelegates: 86,
    pendingDelegates: 4,
    objective: "Trao đổi phương pháp điều tra dịch tễ trong môi trường quân sự và quản lý dữ liệu khảo sát.",
    scope: "Bộ môn Dịch tễ học quân sự, học viên sau đại học và đơn vị phối hợp điều tra thực địa.",
    planSummary: "Đang tổ chức theo chương trình đã công bố.",
    programSummary: "Đang diễn ra phiên thảo luận phương pháp lấy mẫu, kiểm soát sai lệch và lưu trữ dữ liệu.",
    postEventReport: "Sẽ nộp sau khi kết thúc chương trình.",
    conclusionSummary: "Chưa ghi nhận kết luận cuối cùng.",
    updatedAt: "12/05/2026 10:05",
    program: program("Khai mạc hội thảo trực tuyến", "Phương pháp điều tra dịch tễ trong đơn vị quân sự", "Ghi nhận nội dung cần nghiên cứu tiếp", "Phòng họp trực tuyến"),
    speakers: speakers("TS. Lê Minh Châu", "TS. Đỗ Minh Trung", "TS. Lê Minh Châu", "ThS. Trần Khánh Ly", "Bộ môn Dịch tễ học quân sự"),
    delegates: delegates("Bộ môn Dịch tễ học quân sự", 86, 4),
    submissions: submissions("Quy trình kiểm soát chất lượng dữ liệu khảo sát dịch tễ", "Bộ môn Dịch tễ học quân sự"),
    relatedTasks: [
      { title: "Ghi nhận biên bản phiên trực tuyến", meta: "HTKH-2026-006 · Thư ký phiên", status: "in-progress" }
    ],
    history: [
      { title: "Công bố chương trình hội thảo", meta: "09/05/2026 08:30 · Bộ môn Dịch tễ học quân sự", status: "conference-preparing" },
      { title: "Bắt đầu tổ chức hội thảo", meta: "12/05/2026 08:00 · Phòng họp trực tuyến", status: "conference-in-session" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-007",
    code: "HTKH-2026-007",
    title: "Hội thảo khoa học cấp Học viện về đào tạo sau đại học gắn với nghiên cứu",
    eventType: "Hội thảo khoa học cấp Học viện",
    level: "Cấp Học viện",
    format: "Trực tiếp",
    status: "conference-draft",
    organizingUnit: "Ban Sau đại học",
    chair: "PGS. TS. Nguyễn Văn Khánh",
    secretaryOwner: "TS. Nguyễn Minh Phương",
    timeLabel: "Dự kiến 18/06/2026",
    month: "06/2026",
    venue: "Hội trường C",
    delegateCount: 130,
    confirmedDelegates: 0,
    pendingDelegates: 130,
    objective: "Xây dựng khuyến nghị gắn đào tạo sau đại học với nhiệm vụ nghiên cứu khoa học cấp Học viện.",
    scope: "Học viên sau đại học, giảng viên hướng dẫn, phòng ban đào tạo và quản lý khoa học.",
    planSummary: "Đơn vị đang hoàn thiện dự thảo kế hoạch và danh sách báo cáo viên.",
    programSummary: "Dự kiến gồm phiên định hướng, tham luận kinh nghiệm và thảo luận chuẩn đầu ra nghiên cứu.",
    postEventReport: "Chưa phát sinh.",
    conclusionSummary: "Chưa có kết luận.",
    updatedAt: "11/05/2026 09:15",
    program: program("Định hướng gắn đào tạo với nghiên cứu", "Mô hình tổ chức seminar nghiên cứu cho học viên sau đại học", "Tổng hợp góp ý hoàn thiện kế hoạch", "Hội trường C"),
    speakers: speakers("PGS. TS. Nguyễn Văn Khánh", "TS. Bùi Hải Nam", "PGS. TS. Nguyễn Văn Khánh", "TS. Nguyễn Minh Phương", "Ban Sau đại học"),
    delegates: delegates("Ban Sau đại học", 0, 130),
    submissions: submissions("Đề xuất khung sinh hoạt học thuật định kỳ cho học viên sau đại học", "Ban Sau đại học"),
    relatedTasks: [
      { title: "Hoàn thiện dự thảo kế hoạch tổ chức", meta: "HTKH-2026-007 · Ban Sau đại học", status: "draft" }
    ],
    history: [
      { title: "Tạo dự thảo kế hoạch hội thảo", meta: "11/05/2026 09:15 · Ban Sau đại học", status: "conference-draft" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-008",
    code: "HTKH-2026-008",
    title: "Tọa đàm khoa học về công bố quốc tế trong lĩnh vực y sinh",
    eventType: "Tọa đàm khoa học",
    level: "Chuyên đề",
    format: "Kết hợp",
    status: "conference-completed",
    organizingUnit: "Phòng Khoa học Quân sự",
    chair: "TS. Nguyễn Minh Phương",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    timeLabel: "26/04/2026 · đã hoàn tất",
    month: "04/2026",
    venue: "Phòng họp A1 · điểm cầu trực tuyến",
    delegateCount: 110,
    confirmedDelegates: 108,
    pendingDelegates: 2,
    objective: "Nâng cao năng lực chuẩn bị bản thảo, lựa chọn tạp chí và quản lý minh chứng công bố.",
    scope: "Chủ nhiệm đề tài, giảng viên, học viên sau đại học và cán bộ quản lý khoa học.",
    planSummary: "Đã hoàn tất đầy đủ kế hoạch, chương trình, biên bản, kết luận và báo cáo sau hội thảo.",
    programSummary: "Đã tổ chức các phiên về chuẩn mực công bố, đạo đức xuất bản và quản lý hồ sơ minh chứng.",
    postEventReport: "Đã nộp báo cáo sau hội thảo kèm danh mục khuyến nghị hỗ trợ công bố.",
    conclusionSummary: "Khuyến nghị xây dựng nhóm hỗ trợ công bố quốc tế theo lĩnh vực chuyên môn.",
    updatedAt: "30/04/2026 16:00",
    program: program("Khai mạc tọa đàm công bố quốc tế", "Kinh nghiệm chuẩn bị bản thảo và quản lý minh chứng công bố", "Kết luận khuyến nghị hỗ trợ công bố", "Phòng họp A1"),
    speakers: speakers("PGS. TS. Hoàng Đức Minh", "TS. Nguyễn Quang Huy", "TS. Nguyễn Minh Phương", "Đại úy, CN. Trần Khánh Ly", "Phòng Khoa học Quân sự"),
    delegates: delegates("Các khoa/bộ môn", 108, 2),
    submissions: submissions("Quản lý minh chứng công bố quốc tế trong hồ sơ nghiệm thu đề tài", "Phòng Khoa học Quân sự"),
    relatedTasks: [
      { title: "Lưu trữ báo cáo sau hội thảo", meta: "HTKH-2026-008 · Phòng KHQS", status: "completed" }
    ],
    history: [
      { title: "Tổ chức tọa đàm", meta: "26/04/2026 08:00 · Phòng họp A1", status: "conference-in-session" },
      { title: "Nộp báo cáo sau hội thảo", meta: "30/04/2026 16:00 · Phòng KHQS", status: "conference-completed" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-009",
    code: "HTKH-2026-009",
    title: "Sinh hoạt khoa học chuyên đề kiểm soát nhiễm khuẩn trong nghiên cứu bệnh viện",
    eventType: "Sinh hoạt khoa học chuyên đề",
    level: "Cấp khoa",
    format: "Trực tiếp",
    status: "conference-postponed",
    organizingUnit: "Khoa Truyền nhiễm",
    chair: "BSCKII. Nguyễn Thị Mai",
    secretaryOwner: "ThS. Lê Quốc Huy",
    timeLabel: "Tạm hoãn · chờ lịch mới",
    month: "05/2026",
    venue: "Giảng đường Khoa Truyền nhiễm",
    delegateCount: 70,
    confirmedDelegates: 52,
    pendingDelegates: 18,
    objective: "Cập nhật yêu cầu kiểm soát nhiễm khuẩn khi triển khai nghiên cứu trong môi trường bệnh viện.",
    scope: "Khoa Truyền nhiễm, khoa lâm sàng phối hợp và nhóm nghiên cứu liên quan.",
    planSummary: "Đã có kế hoạch sơ bộ nhưng tạm hoãn do trùng lịch chuyên môn cấp Học viện.",
    programSummary: "Chương trình sẽ được cập nhật lại sau khi chốt lịch mới.",
    postEventReport: "Chưa phát sinh.",
    conclusionSummary: "Chưa có kết luận.",
    updatedAt: "09/05/2026 11:25",
    program: program("Khai mạc sinh hoạt khoa học", "Kiểm soát nhiễm khuẩn trong nghiên cứu bệnh viện", "Tổng hợp nội dung điều chỉnh quy trình", "Giảng đường khoa"),
    speakers: speakers("BSCKII. Nguyễn Thị Mai", "TS. Bùi Hải Nam", "BSCKII. Nguyễn Thị Mai", "ThS. Lê Quốc Huy", "Khoa Truyền nhiễm"),
    delegates: delegates("Khoa Truyền nhiễm", 52, 18),
    submissions: submissions("Kiểm soát nguy cơ nhiễm khuẩn khi thu thập dữ liệu nghiên cứu", "Khoa Truyền nhiễm"),
    relatedTasks: [
      { title: "Đề xuất lịch tổ chức thay thế", meta: "HTKH-2026-009 · Khoa Truyền nhiễm", status: "paused" }
    ],
    history: [
      { title: "Phê duyệt kế hoạch sơ bộ", meta: "04/05/2026 14:00 · Khoa Truyền nhiễm", status: "conference-approved" },
      { title: "Tạm hoãn lịch tổ chức", meta: "09/05/2026 11:25 · Ban tổ chức", status: "conference-postponed" }
    ]
  }),
  createConferenceRecord({
    id: "htkh-2026-010",
    code: "HTKH-2026-010",
    title: "Hội nghị báo cáo kết quả nghiên cứu về ứng dụng trí tuệ nhân tạo trong chẩn đoán hình ảnh",
    eventType: "Hội nghị báo cáo kết quả nghiên cứu",
    level: "Liên viện",
    format: "Kết hợp",
    status: "conference-preparing",
    organizingUnit: "Khoa Chẩn đoán hình ảnh",
    chair: "ThS. Nguyễn Đức Anh",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    timeLabel: "05/06/2026 · 08:00",
    month: "06/2026",
    venue: "Hội trường B · điểm cầu liên viện",
    delegateCount: 150,
    confirmedDelegates: 83,
    pendingDelegates: 67,
    objective: "Báo cáo kết quả nghiên cứu ứng dụng trí tuệ nhân tạo trong hỗ trợ chẩn đoán hình ảnh.",
    scope: "Khoa Chẩn đoán hình ảnh, đơn vị công nghệ phối hợp, hội đồng chuyên môn và nhóm nghiên cứu.",
    planSummary: "Kế hoạch đã được phê duyệt, đang chuẩn bị chương trình và tài liệu báo cáo.",
    programSummary: "Dự kiến có báo cáo kết quả nghiên cứu, phản biện dữ liệu và thảo luận hướng ứng dụng.",
    postEventReport: "Chưa đến thời hạn nộp báo cáo sau hội nghị.",
    conclusionSummary: "Dự kiến ghi nhận điều kiện quản trị dữ liệu trước khi mở rộng ứng dụng.",
    updatedAt: "12/05/2026 13:10",
    upcoming: true,
    program: program("Khai mạc hội nghị báo cáo kết quả", "Kết quả nghiên cứu hỗ trợ chẩn đoán hình ảnh bằng trí tuệ nhân tạo", "Kết luận định hướng ứng dụng và quản trị dữ liệu", "Hội trường B"),
    speakers: speakers("ThS. Nguyễn Đức Anh", "PGS. TS. Nguyễn Văn Khánh", "ThS. Nguyễn Đức Anh", "Đại úy, CN. Trần Khánh Ly", "Khoa Chẩn đoán hình ảnh"),
    delegates: delegates("Khoa Chẩn đoán hình ảnh", 83, 67),
    submissions: submissions("Đánh giá mô hình hỗ trợ phát hiện tổn thương phổi trên dữ liệu hình ảnh", "Khoa Chẩn đoán hình ảnh"),
    relatedTasks: [
      { title: "Kiểm tra tài liệu báo cáo và dữ liệu minh chứng", meta: "HTKH-2026-010 · Khoa Chẩn đoán hình ảnh", status: "in-progress" }
    ],
    history: [
      { title: "Phê duyệt kế hoạch tổ chức", meta: "07/05/2026 16:30 · Phòng KHQS", status: "conference-approved" },
      { title: "Cập nhật chương trình dự kiến", meta: "12/05/2026 13:10 · Ban tổ chức", status: "conference-preparing" }
    ]
  })
];

export function getConferenceById(id: string) {
  return conferenceRecords.find((record) => record.id === id) ?? null;
}

export function getConferenceSummary() {
  return {
    total: conferenceRecords.length,
    upcoming: conferenceRecords.filter((record) => record.upcoming).length,
    awaitingApproval: conferenceRecords.filter((record) => record.status === "conference-pending-approval" || record.awaitingApproval).length,
    preparing: conferenceRecords.filter((record) => record.status === "conference-preparing").length,
    awaitingReport: conferenceRecords.filter((record) => record.status === "conference-awaiting-report" || record.missingReport).length,
    completed: conferenceRecords.filter((record) => record.status === "conference-completed").length
  };
}

export function getConferenceStatusOptions() {
  return [
    "Dự thảo kế hoạch",
    "Chờ thẩm định",
    "Chờ phê duyệt",
    "Đã phê duyệt",
    "Đang chuẩn bị",
    "Đang tổ chức",
    "Chờ báo cáo sau hội thảo",
    "Hoàn tất",
    "Tạm hoãn"
  ];
}

export function getConferenceLevelOptions() {
  return [...new Set(conferenceRecords.map((record) => record.level))];
}

export function getConferenceUnitOptions() {
  return [...new Set(conferenceRecords.map((record) => record.organizingUnit))];
}

export function getConferenceMonthOptions() {
  return [...new Set(conferenceRecords.map((record) => record.month))];
}

export function getConferenceFormatOptions() {
  return [...new Set(conferenceRecords.map((record) => record.format))];
}

export function getUpcomingConferences() {
  return conferenceRecords.filter((record) => record.upcoming);
}

export function getPendingApprovalConferences() {
  return conferenceRecords.filter((record) => record.status === "conference-pending-approval" || record.awaitingApproval);
}

export function getMissingReportConferences() {
  return conferenceRecords.filter((record) => record.status === "conference-awaiting-report" || record.missingReport);
}

export function getMonthlyConferenceSchedule() {
  return conferenceRecords.filter((record) => record.month === "05/2026");
}
