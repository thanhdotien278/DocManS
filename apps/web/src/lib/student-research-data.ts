export type StudentResearchStatus =
  | "student-registering"
  | "student-awaiting-check"
  | "student-needs-supplement"
  | "student-eligible"
  | "student-in-progress"
  | "student-awaiting-acceptance"
  | "student-accepted"
  | "student-not-passed"
  | "student-awarded";

export type StudentMember = {
  name: string;
  role: string;
  className: string;
  status: string;
};

export type StudentResearchPerson = {
  name: string;
  role: string;
  unit: string;
  status: string;
};

export type StudentResearchDocument = {
  name: string;
  meta: string;
  actionLabel?: string;
};

export type StudentResearchTimelineItem = {
  title: string;
  meta: string;
  status: string;
};

export type StudentResearchRecord = {
  id: string;
  code: string;
  title: string;
  status: StudentResearchStatus;
  studentLead: StudentMember;
  studentMembers: StudentMember[];
  supervisor: StudentResearchPerson;
  coSupervisor?: StudentResearchPerson;
  unit: string;
  academicYear: string;
  field: string;
  dueDate: string;
  dueLabel: string;
  registeredAt: string;
  updatedAt: string;
  objective: string;
  methodology: string;
  expectedProduct: string;
  implementationPlan: string;
  progressSummary: string;
  acceptanceSchedule: string;
  scoreSummary: string;
  resultSummary: string;
  awardSummary: string;
  researchProducts: string[];
  committee: StudentResearchPerson[];
  secretary: StudentResearchPerson;
  documents: StudentResearchDocument[];
  workflow: StudentResearchTimelineItem[];
  history: StudentResearchTimelineItem[];
  awaitingReview?: boolean;
  needsSupplement?: boolean;
  awaitingAcceptance?: boolean;
  upcomingDefense?: boolean;
  awarded?: boolean;
};

const workflowTitles = [
  "Đăng ký đề tài",
  "Kiểm tra điều kiện",
  "Phân công giảng viên hướng dẫn",
  "Xét duyệt đề cương",
  "Theo dõi thực hiện",
  "Nộp báo cáo",
  "Tổ chức nghiệm thu",
  "Công nhận kết quả"
] as const;

const workflowStatusIndex: Record<StudentResearchStatus, number> = {
  "student-registering": 0,
  "student-awaiting-check": 1,
  "student-needs-supplement": 1,
  "student-eligible": 3,
  "student-in-progress": 4,
  "student-awaiting-acceptance": 6,
  "student-accepted": 7,
  "student-not-passed": 7,
  "student-awarded": 7
};

function buildWorkflow(
  record: Pick<StudentResearchRecord, "status" | "supervisor" | "dueLabel" | "updatedAt">
): StudentResearchTimelineItem[] {
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
        meta: `${record.supervisor.name} đang theo dõi · ${record.dueLabel}`,
        status: record.status
      };
    }

    return {
      title,
      meta: "Đang chờ thực hiện theo quy trình đề tài sinh viên",
      status: "draft"
    };
  });
}

function buildDocuments(code: string, owner: string, date: string): StudentResearchDocument[] {
  return [
    { name: `Phieu-dang-ky-de-tai-${code}.pdf`, meta: `PDF · Nhóm sinh viên · cập nhật ${date}`, actionLabel: "Xem phiếu" },
    { name: `De-cuong-nghien-cuu-${code}.docx`, meta: `Văn bản · ${owner} · cập nhật ${date}`, actionLabel: "Mở đề cương" },
    { name: `Xac-nhan-giang-vien-huong-dan-${code}.pdf`, meta: `PDF · Khoa/Bộ môn xác nhận · cập nhật ${date}`, actionLabel: "Xem xác nhận" },
    { name: `Bao-cao-tien-do-${code}.docx`, meta: `Văn bản · Nhóm nghiên cứu · cập nhật ${date}`, actionLabel: "Mở báo cáo" },
    { name: `Bao-cao-tong-ket-${code}.pdf`, meta: `PDF · Nhóm nghiên cứu · cập nhật ${date}`, actionLabel: "Xem tổng kết" },
    { name: `Bai-trinh-bay-nghiem-thu-${code}.pptx`, meta: `Trình chiếu · Nhóm nghiên cứu · cập nhật ${date}`, actionLabel: "Mở trình bày" },
    { name: `Phieu-nhan-xet-hoi-dong-${code}.pdf`, meta: `PDF · Hội đồng nghiệm thu · cập nhật ${date}`, actionLabel: "Xem nhận xét" },
    { name: `Giay-chung-nhan-ket-qua-${code}.pdf`, meta: `PDF · Phòng KHQS · cập nhật ${date}`, actionLabel: "Xem chứng nhận" }
  ];
}

function members(lead: string, first: string, second: string): StudentMember[] {
  return [
    { name: lead, role: "Nhóm trưởng sinh viên", className: "Lớp Y6A", status: "Phụ trách điều phối nhóm" },
    { name: first, role: "Thành viên nhóm", className: "Lớp Y5B", status: "Phụ trách thu thập số liệu" },
    { name: second, role: "Thành viên nhóm", className: "Lớp Dược K10", status: "Phụ trách tổng hợp tài liệu" }
  ];
}

function committee(chair: string, reviewer: string, secretaryName: string, unit: string): StudentResearchPerson[] {
  return [
    { name: chair, role: "Chủ tịch hội đồng", unit: "Hội đồng nghiệm thu đề tài sinh viên", status: "Chủ trì phiên nghiệm thu" },
    { name: reviewer, role: "Ủy viên phản biện", unit, status: "Đã nhận hồ sơ nhận xét" },
    { name: "TS. Nguyễn Minh Phương", role: "Ủy viên quản lý khoa học", unit: "Phòng Khoa học Quân sự", status: "Theo dõi thủ tục nghiệm thu" },
    { name: secretaryName, role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Tổng hợp biên bản và phiếu điểm" }
  ];
}

function createStudentResearchRecord(
  record: Omit<StudentResearchRecord, "studentLead" | "workflow" | "documents">
): StudentResearchRecord {
  return {
    ...record,
    studentLead: record.studentMembers[0],
    documents: buildDocuments(record.code, record.supervisor.name, record.updatedAt),
    workflow: buildWorkflow(record)
  };
}

export const studentResearchRecords: StudentResearchRecord[] = [
  createStudentResearchRecord({
    id: "svnckh-2026-001",
    code: "SVNCKH-2026-001",
    title: "Khảo sát kiến thức phòng chống nhiễm khuẩn bệnh viện của học viên quân y",
    status: "student-awaiting-check",
    studentMembers: members("Nguyễn Hoàng Nam", "Trần Thị Mai Anh", "Lê Đức Minh"),
    supervisor: { name: "TS. Phạm Anh Tuấn", role: "Giảng viên hướng dẫn", unit: "Khoa Y tế công cộng", status: "Đã xác nhận hướng dẫn" },
    coSupervisor: { name: "ThS. Hoàng Mai", role: "Giảng viên đồng hướng dẫn", unit: "Bộ môn Dịch tễ học", status: "Phối hợp phương pháp khảo sát" },
    unit: "Khoa Y tế công cộng",
    academicYear: "2025-2026",
    field: "Y tế công cộng",
    dueDate: "18/05/2026",
    dueLabel: "Chờ kiểm tra điều kiện trước 18/05/2026",
    registeredAt: "08/05/2026 09:00",
    updatedAt: "12/05/2026 10:15",
    objective: "Đánh giá mức độ hiểu biết và thực hành phòng chống nhiễm khuẩn bệnh viện trong nhóm học viên lâm sàng.",
    methodology: "Nghiên cứu mô tả cắt ngang, sử dụng phiếu khảo sát ẩn danh và phân tích thống kê mô tả.",
    expectedProduct: "Báo cáo tổng hợp, bộ khuyến nghị truyền thông nội bộ và bài trình bày nghiệm thu.",
    implementationPlan: "Hoàn thiện phiếu khảo sát trong tháng 5/2026, thu thập dữ liệu tháng 6/2026, phân tích và viết báo cáo tháng 7/2026.",
    progressSummary: "Hồ sơ đăng ký đã tiếp nhận, tổ chuyên viên đang kiểm tra điều kiện tham gia và xác nhận giảng viên hướng dẫn.",
    acceptanceSchedule: "Dự kiến nghiệm thu cấp khoa trong tháng 09/2026.",
    scoreSummary: "Chưa chấm điểm do đề tài chưa đến giai đoạn nghiệm thu.",
    resultSummary: "Chưa có kết quả chính thức.",
    awardSummary: "Chưa xét khen thưởng.",
    researchProducts: ["Phiếu khảo sát kiến thức", "Báo cáo phân tích dữ liệu", "Khuyến nghị truyền thông"],
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Đỗ Minh Trung", "Đại úy, CN. Trần Khánh Ly", "Khoa Y tế công cộng"),
    secretary: { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Theo dõi hồ sơ" },
    awaitingReview: true,
    history: [
      { title: "Tiếp nhận phiếu đăng ký", meta: "08/05/2026 09:00 · Phòng Khoa học Quân sự", status: "student-registering" },
      { title: "Chuyển kiểm tra điều kiện", meta: "12/05/2026 10:15 · Chuyên viên phụ trách", status: "student-awaiting-check" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-002",
    code: "SVNCKH-2026-002",
    title: "Đánh giá hiệu quả giáo dục sức khỏe về tuân thủ dùng thuốc tăng huyết áp",
    status: "student-needs-supplement",
    studentMembers: members("Phạm Minh Châu", "Vũ Thị Hương", "Đặng Quốc Huy"),
    supervisor: { name: "PGS. TS. Trần Thu Hà", role: "Giảng viên hướng dẫn", unit: "Khoa Y học lâm sàng", status: "Đã góp ý đề cương" },
    unit: "Khoa Y học lâm sàng",
    academicYear: "2025-2026",
    field: "Y học lâm sàng",
    dueDate: "16/05/2026",
    dueLabel: "Cần bổ sung xác nhận mẫu nghiên cứu",
    registeredAt: "05/05/2026 14:30",
    updatedAt: "12/05/2026 11:40",
    objective: "Đánh giá thay đổi kiến thức và hành vi tuân thủ dùng thuốc sau can thiệp giáo dục sức khỏe.",
    methodology: "Can thiệp trước sau trên nhóm người bệnh ngoại trú, có phiếu đồng ý tham gia nghiên cứu.",
    expectedProduct: "Báo cáo tổng kết và tài liệu truyền thông ngắn cho người bệnh.",
    implementationPlan: "Bổ sung xác nhận địa điểm nghiên cứu, hoàn thiện công cụ đánh giá, triển khai thu thập dữ liệu theo đợt.",
    progressSummary: "Tổ chuyên viên yêu cầu bổ sung xác nhận của đơn vị tiếp nhận người bệnh trước khi trình xét duyệt đề cương.",
    acceptanceSchedule: "Chưa xếp lịch nghiệm thu.",
    scoreSummary: "Chưa chấm điểm.",
    resultSummary: "Chưa có kết quả chính thức.",
    awardSummary: "Chưa xét khen thưởng.",
    researchProducts: ["Tài liệu giáo dục sức khỏe", "Bảng theo dõi tuân thủ dùng thuốc", "Báo cáo tổng kết"],
    committee: committee("GS. TS. Trần Viết Tiến", "TS. Nguyễn Quang Huy", "Thiếu tá, ThS. Bùi Huy Dũng", "Khoa Y học lâm sàng"),
    secretary: { name: "Thiếu tá, ThS. Bùi Huy Dũng", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Chờ hồ sơ bổ sung" },
    needsSupplement: true,
    history: [
      { title: "Tiếp nhận đăng ký đề tài", meta: "05/05/2026 14:30 · Nhóm sinh viên nộp hồ sơ", status: "student-registering" },
      { title: "Yêu cầu bổ sung xác nhận địa điểm", meta: "12/05/2026 11:40 · Phòng Khoa học Quân sự", status: "student-needs-supplement" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-003",
    code: "SVNCKH-2026-003",
    title: "Ứng dụng mô hình học máy hỗ trợ phân loại hình ảnh tế bào máu ngoại vi",
    status: "student-in-progress",
    studentMembers: members("Lê Gia Bảo", "Nguyễn Hải Yến", "Trịnh Minh Đức"),
    supervisor: { name: "TS. Đỗ Tiến Thành", role: "Giảng viên hướng dẫn", unit: "Khoa Toán - Tin học", status: "Theo dõi kỹ thuật mô hình" },
    coSupervisor: { name: "PGS. TS. Nguyễn Văn Khánh", role: "Giảng viên đồng hướng dẫn", unit: "Bộ môn Huyết học", status: "Thẩm định dữ liệu chuyên môn" },
    unit: "Khoa Toán - Tin học",
    academicYear: "2025-2026",
    field: "Công nghệ sinh học y dược",
    dueDate: "30/06/2026",
    dueLabel: "Đang thực hiện, báo cáo tiến độ trước 30/06/2026",
    registeredAt: "10/03/2026 08:15",
    updatedAt: "11/05/2026 16:20",
    objective: "Xây dựng mô hình thử nghiệm hỗ trợ phân loại ảnh tế bào máu phục vụ đào tạo và nghiên cứu.",
    methodology: "Huấn luyện mô hình phân loại ảnh trên bộ dữ liệu đã ẩn danh, đánh giá độ chính xác và sai số phân loại.",
    expectedProduct: "Bộ dữ liệu mẫu đã ẩn danh, mô hình thử nghiệm, báo cáo đánh giá và bài trình bày nghiệm thu.",
    implementationPlan: "Hoàn tất tiền xử lý dữ liệu trong tháng 5/2026, huấn luyện và đánh giá mô hình trong tháng 6-7/2026.",
    progressSummary: "Đã hoàn thành 55% khối lượng, nhóm đang tinh chỉnh dữ liệu huấn luyện và kiểm tra độ ổn định kết quả.",
    acceptanceSchedule: "Dự kiến nghiệm thu cấp Học viện tháng 09/2026.",
    scoreSummary: "Chưa chấm điểm.",
    resultSummary: "Có kết quả thử nghiệm ban đầu, chưa công nhận nghiệm thu.",
    awardSummary: "Có tiềm năng đề xuất khen thưởng nếu hoàn thiện sản phẩm đúng hạn.",
    researchProducts: ["Mô hình phân loại ảnh thử nghiệm", "Bộ dữ liệu đã ẩn danh", "Báo cáo đánh giá mô hình"],
    committee: committee("PGS. TS. Hoàng Đức Minh", "TS. Đỗ Minh Trung", "Đại úy, CN. Trần Khánh Ly", "Khoa Toán - Tin học"),
    secretary: { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Theo dõi tiến độ" },
    history: [
      { title: "Phê duyệt đề cương nghiên cứu", meta: "22/03/2026 15:30 · Hội đồng xét duyệt", status: "student-eligible" },
      { title: "Cập nhật báo cáo tiến độ lần 1", meta: "11/05/2026 16:20 · Nhóm sinh viên", status: "student-in-progress" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-004",
    code: "SVNCKH-2026-004",
    title: "Nghiên cứu đặc điểm sử dụng kháng sinh trong điều trị viêm phổi cộng đồng",
    status: "student-awaiting-acceptance",
    studentMembers: members("Trần Khánh Linh", "Đỗ Đức Anh", "Bùi Ngọc Hân"),
    supervisor: { name: "TS. Nguyễn Quang Huy", role: "Giảng viên hướng dẫn", unit: "Bộ môn Dược lâm sàng", status: "Đã duyệt báo cáo tổng kết" },
    unit: "Bộ môn Dược lâm sàng",
    academicYear: "2025-2026",
    field: "Dược học",
    dueDate: "22/05/2026",
    dueLabel: "Chờ nghiệm thu cấp khoa ngày 22/05/2026",
    registeredAt: "12/01/2026 10:20",
    updatedAt: "12/05/2026 09:10",
    objective: "Mô tả thực trạng sử dụng kháng sinh và mức độ phù hợp với khuyến cáo điều trị.",
    methodology: "Nghiên cứu hồi cứu hồ sơ bệnh án, đối chiếu phác đồ điều trị và kết quả vi sinh.",
    expectedProduct: "Báo cáo tổng kết, bảng phân tích sử dụng thuốc và khuyến nghị cải thiện kê đơn.",
    implementationPlan: "Đã hoàn tất thu thập và phân tích dữ liệu, đang chuẩn bị phiên nghiệm thu.",
    progressSummary: "Báo cáo tổng kết đã nộp, hội đồng đang rà soát phiếu nhận xét trước phiên nghiệm thu.",
    acceptanceSchedule: "22/05/2026 · 14:00 · Phòng họp Khoa Dược",
    scoreSummary: "Chưa có điểm chính thức, đang chờ hội đồng nghiệm thu.",
    resultSummary: "Chờ công nhận kết quả sau phiên nghiệm thu.",
    awardSummary: "Chưa xét khen thưởng.",
    researchProducts: ["Bảng phân tích sử dụng kháng sinh", "Báo cáo tổng kết", "Bài trình bày nghiệm thu"],
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Phạm Anh Tuấn", "Thiếu tá, ThS. Bùi Huy Dũng", "Bộ môn Dược lâm sàng"),
    secretary: { name: "Thiếu tá, ThS. Bùi Huy Dũng", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Chuẩn bị biên bản nghiệm thu" },
    awaitingAcceptance: true,
    upcomingDefense: true,
    history: [
      { title: "Nộp báo cáo tổng kết", meta: "10/05/2026 08:45 · Nhóm sinh viên", status: "student-awaiting-acceptance" },
      { title: "Xếp lịch nghiệm thu", meta: "12/05/2026 09:10 · Thư ký hội đồng", status: "student-awaiting-acceptance" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-005",
    code: "SVNCKH-2026-005",
    title: "Đánh giá chất lượng giấc ngủ và yếu tố liên quan ở sinh viên năm thứ nhất",
    status: "student-awarded",
    studentMembers: members("Vũ Minh Quân", "Hoàng Thùy Dương", "Phan Đức Long"),
    supervisor: { name: "ThS. Vũ Lan Anh", role: "Giảng viên hướng dẫn", unit: "Bộ môn Tâm thần và Tâm lý y học", status: "Hoàn tất hướng dẫn" },
    unit: "Bộ môn Tâm thần và Tâm lý y học",
    academicYear: "2025-2026",
    field: "Y học cơ sở",
    dueDate: "Đã nghiệm thu",
    dueLabel: "Đã công nhận kết quả và đề xuất khen thưởng",
    registeredAt: "05/01/2026 09:30",
    updatedAt: "09/05/2026 15:00",
    objective: "Xác định tỷ lệ chất lượng giấc ngủ kém và yếu tố liên quan trong nhóm sinh viên năm thứ nhất.",
    methodology: "Khảo sát cắt ngang bằng thang đo chuẩn hóa, phân tích tương quan giữa học tập, sinh hoạt và chất lượng giấc ngủ.",
    expectedProduct: "Báo cáo tổng kết, poster khoa học và khuyến nghị hỗ trợ sức khỏe học viên.",
    implementationPlan: "Đã hoàn tất toàn bộ kế hoạch nghiên cứu và nghiệm thu.",
    progressSummary: "Đề tài đã nghiệm thu, sản phẩm được đánh giá có khả năng ứng dụng trong tư vấn học viên.",
    acceptanceSchedule: "Đã nghiệm thu ngày 06/05/2026 tại Phòng họp A2.",
    scoreSummary: "92/100 · Xếp loại Xuất sắc",
    resultSummary: "Đã công nhận kết quả nghiệm thu.",
    awardSummary: "Đề xuất giải Nhì sinh viên nghiên cứu khoa học cấp Học viện.",
    researchProducts: ["Báo cáo tổng kết", "Poster khoa học", "Khuyến nghị tư vấn học viên"],
    committee: committee("GS. TS. Trần Viết Tiến", "PGS. TS. Hoàng Đức Minh", "Đại úy, CN. Trần Khánh Ly", "Bộ môn Tâm thần và Tâm lý y học"),
    secretary: { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Đã hoàn tất chứng nhận" },
    awarded: true,
    history: [
      { title: "Tổ chức nghiệm thu đề tài", meta: "06/05/2026 14:00 · Hội đồng nghiệm thu", status: "student-accepted" },
      { title: "Đề xuất khen thưởng", meta: "09/05/2026 15:00 · Phòng Khoa học Quân sự", status: "student-awarded" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-006",
    code: "SVNCKH-2026-006",
    title: "Xây dựng quy trình truyền thông phòng chống đuối nước cho học sinh phổ thông",
    status: "student-eligible",
    studentMembers: members("Đỗ Hồng Phúc", "Ngô Thu Trang", "Mai Tiến Dũng"),
    supervisor: { name: "TS. Nguyễn Minh Phương", role: "Giảng viên hướng dẫn", unit: "Khoa Y tế công cộng", status: "Đã nhận phân công hướng dẫn" },
    unit: "Khoa Y tế công cộng",
    academicYear: "2025-2026",
    field: "Y tế công cộng",
    dueDate: "25/05/2026",
    dueLabel: "Đủ điều kiện, chờ duyệt đề cương trước 25/05/2026",
    registeredAt: "02/05/2026 08:40",
    updatedAt: "12/05/2026 13:30",
    objective: "Xây dựng bộ tài liệu truyền thông ngắn về phòng chống đuối nước cho học sinh phổ thông.",
    methodology: "Tổng quan tài liệu, phỏng vấn chuyên gia và thử nghiệm thông điệp truyền thông trong nhóm nhỏ.",
    expectedProduct: "Bộ tài liệu truyền thông, kế hoạch thử nghiệm và báo cáo đánh giá khả năng áp dụng.",
    implementationPlan: "Hoàn thiện đề cương chi tiết, xin ý kiến chuyên gia và triển khai thử nghiệm tài liệu trong tháng 6/2026.",
    progressSummary: "Đề tài đã đủ điều kiện về thành viên, giảng viên hướng dẫn và phạm vi triển khai.",
    acceptanceSchedule: "Dự kiến nghiệm thu tháng 09/2026.",
    scoreSummary: "Chưa chấm điểm.",
    resultSummary: "Chưa có kết quả chính thức.",
    awardSummary: "Chưa xét khen thưởng.",
    researchProducts: ["Bộ tài liệu truyền thông", "Kế hoạch thử nghiệm", "Báo cáo đánh giá"],
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Đỗ Minh Trung", "Thiếu tá, ThS. Bùi Huy Dũng", "Khoa Y tế công cộng"),
    secretary: { name: "Thiếu tá, ThS. Bùi Huy Dũng", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Theo dõi xét duyệt đề cương" },
    history: [
      { title: "Hoàn tất kiểm tra điều kiện", meta: "12/05/2026 13:30 · Chuyên viên phụ trách", status: "student-eligible" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-007",
    code: "SVNCKH-2026-007",
    title: "Khảo sát kỹ năng chăm sóc người bệnh sau phẫu thuật của sinh viên điều dưỡng",
    status: "student-in-progress",
    studentMembers: members("Bùi Thanh Hằng", "Nguyễn Thị Ngân", "Cao Minh Trí"),
    supervisor: { name: "ThS. Trần Khánh Ly", role: "Giảng viên hướng dẫn", unit: "Khoa Điều dưỡng", status: "Theo dõi thực hành nghiên cứu" },
    unit: "Khoa Điều dưỡng",
    academicYear: "2025-2026",
    field: "Điều dưỡng",
    dueDate: "28/06/2026",
    dueLabel: "Báo cáo tiến độ đợt 2 trước 28/06/2026",
    registeredAt: "18/03/2026 09:00",
    updatedAt: "10/05/2026 17:10",
    objective: "Đánh giá kỹ năng chăm sóc người bệnh sau phẫu thuật và các nội dung cần tăng cường đào tạo.",
    methodology: "Quan sát thực hành có bảng kiểm và phỏng vấn ngắn sinh viên sau ca thực hành.",
    expectedProduct: "Bảng kiểm kỹ năng, báo cáo phân tích và đề xuất cải tiến hướng dẫn thực hành.",
    implementationPlan: "Tiếp tục thu thập dữ liệu tại khu thực hành lâm sàng và hoàn thiện phân tích trong tháng 7/2026.",
    progressSummary: "Nhóm đã hoàn thành khoảng 45% số phiếu quan sát, chưa phát sinh chậm tiến độ.",
    acceptanceSchedule: "Dự kiến nghiệm thu tháng 09/2026.",
    scoreSummary: "Chưa chấm điểm.",
    resultSummary: "Chưa có kết quả chính thức.",
    awardSummary: "Chưa xét khen thưởng.",
    researchProducts: ["Bảng kiểm kỹ năng", "Báo cáo phân tích", "Đề xuất cải tiến thực hành"],
    committee: committee("PGS. TS. Nguyễn Văn Khánh", "TS. Phạm Anh Tuấn", "Đại úy, CN. Trần Khánh Ly", "Khoa Điều dưỡng"),
    secretary: { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Theo dõi tiến độ" },
    history: [
      { title: "Cập nhật tiến độ thu thập dữ liệu", meta: "10/05/2026 17:10 · Nhóm sinh viên", status: "student-in-progress" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-008",
    code: "SVNCKH-2026-008",
    title: "Phân tích thành phần hoạt chất trong một số mẫu dược liệu dùng tại tuyến cơ sở",
    status: "student-accepted",
    studentMembers: members("Nguyễn Bảo Ngọc", "Lê Quốc Việt", "Trần Hà My"),
    supervisor: { name: "TS. Nguyễn Quang Huy", role: "Giảng viên hướng dẫn", unit: "Bộ môn Dược liệu", status: "Hoàn tất hướng dẫn" },
    unit: "Bộ môn Dược liệu",
    academicYear: "2025-2026",
    field: "Dược học",
    dueDate: "Đã nghiệm thu",
    dueLabel: "Đã nghiệm thu và lưu hồ sơ kết quả",
    registeredAt: "10/01/2026 08:00",
    updatedAt: "08/05/2026 10:45",
    objective: "Định tính một số nhóm hoạt chất chính trong mẫu dược liệu thường dùng tại tuyến cơ sở.",
    methodology: "Phân tích phòng thí nghiệm theo quy trình định tính, đối chiếu tài liệu chuyên ngành và ghi nhận sai khác.",
    expectedProduct: "Báo cáo tổng kết, bảng kết quả phân tích và khuyến nghị sử dụng mẫu đạt chuẩn.",
    implementationPlan: "Đã hoàn tất kế hoạch và nghiệm thu.",
    progressSummary: "Đề tài đã hoàn tất nghiệm thu, hồ sơ kết quả đã lưu tại Phòng Khoa học Quân sự.",
    acceptanceSchedule: "Đã nghiệm thu ngày 08/05/2026.",
    scoreSummary: "84/100 · Xếp loại Tốt",
    resultSummary: "Đã công nhận kết quả nghiệm thu.",
    awardSummary: "Không đề xuất giải thưởng cấp Học viện.",
    researchProducts: ["Bảng kết quả phân tích", "Báo cáo tổng kết", "Bài trình bày nghiệm thu"],
    committee: committee("PGS. TS. Hoàng Đức Minh", "TS. Đỗ Minh Trung", "Thiếu tá, ThS. Bùi Huy Dũng", "Bộ môn Dược liệu"),
    secretary: { name: "Thiếu tá, ThS. Bùi Huy Dũng", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Đã lưu hồ sơ" },
    history: [
      { title: "Nghiệm thu đề tài", meta: "08/05/2026 09:00 · Hội đồng nghiệm thu", status: "student-accepted" },
      { title: "Lưu hồ sơ kết quả", meta: "08/05/2026 10:45 · Phòng Khoa học Quân sự", status: "completed" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-009",
    code: "SVNCKH-2026-009",
    title: "Mô tả thực trạng tiêm chủng phòng bệnh trong nhóm học viên mới nhập học",
    status: "student-registering",
    studentMembers: members("Hoàng Nhật Minh", "Vũ Khánh Huyền", "Đinh Gia Hưng"),
    supervisor: { name: "TS. Phạm Anh Tuấn", role: "Giảng viên hướng dẫn", unit: "Khoa Y tế công cộng", status: "Đang xác nhận hướng dẫn" },
    unit: "Khoa Y tế công cộng",
    academicYear: "2025-2026",
    field: "Y tế công cộng",
    dueDate: "20/05/2026",
    dueLabel: "Đang đăng ký, cần hoàn tất hồ sơ trước 20/05/2026",
    registeredAt: "12/05/2026 08:20",
    updatedAt: "12/05/2026 08:20",
    objective: "Mô tả tình trạng tiêm chủng phòng bệnh và nhu cầu tư vấn của học viên mới nhập học.",
    methodology: "Khảo sát hồ sơ tiêm chủng tự khai và phỏng vấn ngắn về nhu cầu tư vấn sức khỏe.",
    expectedProduct: "Báo cáo mô tả và đề xuất tài liệu tư vấn nhập học.",
    implementationPlan: "Hoàn thiện phiếu đăng ký, xác nhận giảng viên hướng dẫn và nộp đề cương chi tiết.",
    progressSummary: "Nhóm mới tạo hồ sơ đăng ký, chưa hoàn tất xác nhận giảng viên hướng dẫn.",
    acceptanceSchedule: "Chưa xếp lịch nghiệm thu.",
    scoreSummary: "Chưa chấm điểm.",
    resultSummary: "Chưa có kết quả chính thức.",
    awardSummary: "Chưa xét khen thưởng.",
    researchProducts: ["Phiếu khảo sát", "Báo cáo mô tả", "Tài liệu tư vấn nhập học"],
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Đỗ Minh Trung", "Đại úy, CN. Trần Khánh Ly", "Khoa Y tế công cộng"),
    secretary: { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Theo dõi đăng ký" },
    history: [{ title: "Khởi tạo hồ sơ đăng ký", meta: "12/05/2026 08:20 · Nhóm sinh viên", status: "student-registering" }]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-010",
    code: "SVNCKH-2026-010",
    title: "Đánh giá mức độ sẵn sàng chuyển đổi số trong quản lý học tập lâm sàng",
    status: "student-in-progress",
    studentMembers: members("Phan Quang Huy", "Nguyễn Linh Chi", "Lê Minh Khang"),
    supervisor: { name: "TS. Đỗ Tiến Thành", role: "Giảng viên hướng dẫn", unit: "Khoa Toán - Tin học", status: "Theo dõi công cụ khảo sát" },
    coSupervisor: { name: "TS. Nguyễn Minh Phương", role: "Giảng viên đồng hướng dẫn", unit: "Phòng Khoa học Quân sự", status: "Góp ý nghiệp vụ quản lý" },
    unit: "Khoa Toán - Tin học",
    academicYear: "2025-2026",
    field: "Quản lý y tế",
    dueDate: "05/07/2026",
    dueLabel: "Đang thực hiện, cần nộp báo cáo giữa kỳ trước 05/07/2026",
    registeredAt: "20/03/2026 09:40",
    updatedAt: "11/05/2026 09:50",
    objective: "Đánh giá mức độ sẵn sàng chuyển đổi số trong quản lý học tập lâm sàng của sinh viên và đơn vị đào tạo.",
    methodology: "Khảo sát định lượng kết hợp phỏng vấn nhóm nhỏ cán bộ phụ trách và sinh viên lâm sàng.",
    expectedProduct: "Báo cáo đánh giá, bộ tiêu chí sẵn sàng và khuyến nghị triển khai nội bộ.",
    implementationPlan: "Hoàn tất khảo sát trực tuyến trong tháng 6/2026 và tổng hợp khuyến nghị trong tháng 7/2026.",
    progressSummary: "Đang thu thập phản hồi, tỷ lệ hoàn thành khảo sát đạt khoảng 62%.",
    acceptanceSchedule: "Dự kiến nghiệm thu tháng 10/2026.",
    scoreSummary: "Chưa chấm điểm.",
    resultSummary: "Chưa có kết quả chính thức.",
    awardSummary: "Chưa xét khen thưởng.",
    researchProducts: ["Bộ tiêu chí sẵn sàng", "Báo cáo đánh giá", "Khuyến nghị triển khai"],
    committee: committee("PGS. TS. Hoàng Đức Minh", "TS. Phạm Anh Tuấn", "Thiếu tá, ThS. Bùi Huy Dũng", "Khoa Toán - Tin học"),
    secretary: { name: "Thiếu tá, ThS. Bùi Huy Dũng", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Theo dõi tiến độ" },
    history: [
      { title: "Cập nhật tỷ lệ khảo sát", meta: "11/05/2026 09:50 · Nhóm sinh viên", status: "student-in-progress" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-011",
    code: "SVNCKH-2026-011",
    title: "Khảo sát tình trạng đau cổ vai gáy ở sinh viên sử dụng máy tính kéo dài",
    status: "student-not-passed",
    studentMembers: members("Ngô Minh Anh", "Trần Đức Kiên", "Vũ Hải Hà"),
    supervisor: { name: "ThS. Hoàng Mai", role: "Giảng viên hướng dẫn", unit: "Bộ môn Phục hồi chức năng", status: "Đã hoàn tất nhận xét" },
    unit: "Bộ môn Phục hồi chức năng",
    academicYear: "2025-2026",
    field: "Y học lâm sàng",
    dueDate: "Đã nghiệm thu",
    dueLabel: "Không đạt, cần lưu hồ sơ kết luận",
    registeredAt: "06/01/2026 10:00",
    updatedAt: "07/05/2026 16:10",
    objective: "Khảo sát tỷ lệ đau cổ vai gáy và yếu tố liên quan ở sinh viên sử dụng máy tính kéo dài.",
    methodology: "Khảo sát cắt ngang bằng bảng hỏi tự khai và thang đánh giá triệu chứng.",
    expectedProduct: "Báo cáo tổng kết và khuyến nghị tư thế học tập.",
    implementationPlan: "Đã kết thúc quy trình nghiệm thu.",
    progressSummary: "Hội đồng đánh giá dữ liệu chưa đủ tin cậy do tỷ lệ phiếu không hợp lệ cao.",
    acceptanceSchedule: "Đã tổ chức nghiệm thu ngày 07/05/2026.",
    scoreSummary: "58/100 · Không đạt yêu cầu nghiệm thu.",
    resultSummary: "Không công nhận kết quả nghiệm thu.",
    awardSummary: "Không xét khen thưởng.",
    researchProducts: ["Báo cáo tổng kết", "Bảng hỏi khảo sát", "Phiếu nhận xét hội đồng"],
    committee: committee("PGS. TS. Nguyễn Văn Khánh", "TS. Nguyễn Quang Huy", "Đại úy, CN. Trần Khánh Ly", "Bộ môn Phục hồi chức năng"),
    secretary: { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Đã lưu kết luận" },
    history: [
      { title: "Hội đồng nghiệm thu không công nhận kết quả", meta: "07/05/2026 16:10 · Hội đồng nghiệm thu", status: "student-not-passed" }
    ]
  }),
  createStudentResearchRecord({
    id: "svnckh-2026-012",
    code: "SVNCKH-2026-012",
    title: "Đánh giá khả năng kháng khuẩn của dịch chiết thảo dược trên một số chủng vi khuẩn thường gặp",
    status: "student-awaiting-acceptance",
    studentMembers: members("Lê Thảo Nguyên", "Phạm Đức Tài", "Đỗ Minh Châu"),
    supervisor: { name: "PGS. TS. Hoàng Đức Minh", role: "Giảng viên hướng dẫn", unit: "Bộ môn Vi sinh", status: "Đã duyệt báo cáo tổng kết" },
    unit: "Bộ môn Vi sinh",
    academicYear: "2025-2026",
    field: "Y học cơ sở",
    dueDate: "24/05/2026",
    dueLabel: "Chờ nghiệm thu cấp bộ môn ngày 24/05/2026",
    registeredAt: "15/01/2026 14:00",
    updatedAt: "12/05/2026 15:25",
    objective: "Đánh giá khả năng ức chế vi khuẩn của một số dịch chiết thảo dược trong điều kiện phòng thí nghiệm.",
    methodology: "Thử nghiệm khuếch tán trên thạch, đo vòng vô khuẩn và so sánh với mẫu đối chứng.",
    expectedProduct: "Bảng kết quả thử nghiệm, báo cáo tổng kết và bài trình bày nghiệm thu.",
    implementationPlan: "Đã hoàn tất thử nghiệm và đang chuẩn bị nghiệm thu.",
    progressSummary: "Hồ sơ nghiệm thu đã đủ tài liệu, thư ký hội đồng đang hoàn thiện phiếu nhận xét.",
    acceptanceSchedule: "24/05/2026 · 08:30 · Phòng họp Bộ môn Vi sinh",
    scoreSummary: "Chưa có điểm chính thức.",
    resultSummary: "Chờ công nhận sau phiên nghiệm thu.",
    awardSummary: "Có khả năng đề xuất khen thưởng nếu hội đồng đánh giá cao sản phẩm.",
    researchProducts: ["Bảng kết quả thử nghiệm", "Báo cáo tổng kết", "Bài trình bày nghiệm thu"],
    committee: committee("GS. TS. Trần Viết Tiến", "TS. Đỗ Minh Trung", "Thiếu tá, ThS. Bùi Huy Dũng", "Bộ môn Vi sinh"),
    secretary: { name: "Thiếu tá, ThS. Bùi Huy Dũng", role: "Thư ký hội đồng", unit: "Phòng Khoa học Quân sự", status: "Chuẩn bị phiên nghiệm thu" },
    awaitingAcceptance: true,
    upcomingDefense: true,
    history: [
      { title: "Nộp báo cáo tổng kết và bài trình bày", meta: "12/05/2026 15:25 · Nhóm sinh viên", status: "student-awaiting-acceptance" }
    ]
  })
];

export function getStudentResearchById(id: string) {
  return studentResearchRecords.find((record) => record.id === id) ?? null;
}

export function getStudentResearchSummary() {
  return {
    total: studentResearchRecords.length,
    awaitingCheck: studentResearchRecords.filter((record) => record.status === "student-awaiting-check").length,
    inProgress: studentResearchRecords.filter((record) => record.status === "student-in-progress").length,
    awaitingAcceptance: studentResearchRecords.filter((record) => record.status === "student-awaiting-acceptance").length,
    accepted: studentResearchRecords.filter((record) => record.status === "student-accepted" || record.status === "student-awarded").length,
    awarded: studentResearchRecords.filter((record) => record.status === "student-awarded").length
  };
}

export function getStudentResearchStatusOptions() {
  return [
    "Đang đăng ký",
    "Chờ kiểm tra",
    "Cần bổ sung",
    "Đã đủ điều kiện",
    "Đang thực hiện",
    "Chờ nghiệm thu",
    "Đã nghiệm thu",
    "Không đạt",
    "Đạt giải"
  ];
}

export function getStudentResearchUnitOptions() {
  return Array.from(new Set(studentResearchRecords.map((record) => record.unit)));
}

export function getStudentResearchAcademicYearOptions() {
  return Array.from(new Set(studentResearchRecords.map((record) => record.academicYear)));
}

export function getStudentResearchFieldOptions() {
  return Array.from(new Set(studentResearchRecords.map((record) => record.field)));
}

export function getStudentResearchSupervisorOptions() {
  return Array.from(new Set(studentResearchRecords.map((record) => record.supervisor.name)));
}

export function getAwaitingReviewStudentResearch() {
  return studentResearchRecords.filter((record) => record.awaitingReview || record.status === "student-awaiting-check");
}

export function getSupplementStudentResearch() {
  return studentResearchRecords.filter((record) => record.needsSupplement || record.status === "student-needs-supplement");
}

export function getAwaitingAcceptanceStudentResearch() {
  return studentResearchRecords.filter((record) => record.awaitingAcceptance || record.status === "student-awaiting-acceptance");
}

export function getUpcomingDefenseStudentResearch() {
  return studentResearchRecords.filter((record) => record.upcomingDefense);
}

export function getAwardedStudentResearch() {
  return studentResearchRecords.filter((record) => record.awarded || record.status === "student-awarded");
}
