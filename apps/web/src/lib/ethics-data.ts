import type { RiskLevel } from "@/components/ui/risk-badge";

export type EthicsStatus =
  | "ethics-new"
  | "ethics-awaiting-check"
  | "ethics-needs-evidence"
  | "ethics-in-review"
  | "ethics-awaiting-meeting"
  | "ethics-approved"
  | "ethics-conditional-approved"
  | "ethics-not-approved"
  | "ethics-paused";

export type EthicsMember = {
  name: string;
  role: string;
  unit: string;
  status: string;
};

export type EthicsDocument = {
  name: string;
  meta: string;
  actionLabel?: string;
};

export type EthicsTimelineItem = {
  title: string;
  meta: string;
  status: string;
};

export type EthicsRecord = {
  id: string;
  code: string;
  title: string;
  principalInvestigator: string;
  unit: string;
  researchType: string;
  expectedMeeting: string;
  riskLevel: RiskLevel;
  status: EthicsStatus;
  dueDate: string;
  dueLabel: string;
  receivedAt: string;
  updatedAt: string;
  secretaryOwner: string;
  researchObjective: string;
  studySubjects: string;
  sampleScope: string;
  riskAssessment: string;
  protectionMeasures: string;
  meetingInfo: string;
  reviewSummary: string;
  decisionSummary: string;
  postDecisionTracking: string;
  needsEvidence?: boolean;
  highRiskWatch?: boolean;
  upcomingMeeting?: boolean;
  committee: EthicsMember[];
  documents: EthicsDocument[];
  workflow: EthicsTimelineItem[];
  history: EthicsTimelineItem[];
};

const workflowTitles = [
  "Tiếp nhận hồ sơ",
  "Kiểm tra thành phần hồ sơ",
  "Yêu cầu bổ sung minh chứng",
  "Phân công thẩm định",
  "Tổng hợp nhận xét",
  "Lên lịch phiên họp",
  "Họp hội đồng",
  "Ban hành kết luận",
  "Theo dõi sau kết luận"
] as const;

const workflowStatusIndex: Record<EthicsStatus, number> = {
  "ethics-new": 0,
  "ethics-awaiting-check": 1,
  "ethics-needs-evidence": 2,
  "ethics-in-review": 4,
  "ethics-awaiting-meeting": 5,
  "ethics-approved": 8,
  "ethics-conditional-approved": 8,
  "ethics-not-approved": 7,
  "ethics-paused": 3
};

function buildWorkflow(record: Pick<EthicsRecord, "status" | "secretaryOwner" | "dueLabel" | "updatedAt">): EthicsTimelineItem[] {
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
        meta: `${record.secretaryOwner} đang theo dõi · ${record.dueLabel}`,
        status: record.status
      };
    }

    return {
      title,
      meta: "Đang chờ thực hiện theo quy trình thẩm định y đức",
      status: "draft"
    };
  });
}

function buildDocuments(code: string, owner: string, date: string): EthicsDocument[] {
  return [
    { name: `De-cuong-nghien-cuu-${code}.pdf`, meta: `PDF · ${owner} · cập nhật ${date}`, actionLabel: "Xem trước" },
    { name: `Phieu-cung-cap-thong-tin-nghien-cuu-${code}.docx`, meta: `Văn bản · Chủ nhiệm nghiên cứu · cập nhật ${date}`, actionLabel: "Mở tệp" },
    { name: `Phieu-chap-thuan-tham-gia-nghien-cuu-${code}.pdf`, meta: `PDF · Đã kiểm tra biểu mẫu · cập nhật ${date}`, actionLabel: "Xem biểu mẫu" },
    { name: `Bieu-mau-thu-thap-du-lieu-${code}.xlsx`, meta: `Bảng dữ liệu · Tổ thư ký rà soát · cập nhật ${date}`, actionLabel: "Mở danh mục" },
    { name: `Cam-ket-bao-mat-thong-tin-${code}.pdf`, meta: `PDF · ${owner} · cập nhật ${date}`, actionLabel: "Kiểm tra" },
    { name: `Bien-ban-hop-hoi-dong-${code}.pdf`, meta: `PDF · Văn phòng Hội đồng y đức · cập nhật ${date}`, actionLabel: "Xem biên bản" },
    { name: `Quyet-nghi-hoi-dong-${code}.pdf`, meta: `PDF · Văn phòng Hội đồng y đức · cập nhật ${date}`, actionLabel: "Xem quyết nghị" }
  ];
}

function committee(chair: string, reviewer: string, unit: string): EthicsMember[] {
  return [
    { name: chair, role: "Chủ tịch hội đồng", unit: "Hội đồng y đức Học viện", status: "Chủ trì phiên họp" },
    { name: "Đại úy, CN. Trần Khánh Ly", role: "Thư ký hội đồng", unit: "Văn phòng Hội đồng y đức", status: "Tổng hợp hồ sơ" },
    { name: reviewer, role: "Ủy viên phản biện", unit: "Bộ môn chuyên ngành", status: "Đã nhận phân công" },
    { name: "PGS. TS. Lê Thị Thanh Hương", role: "Ủy viên chuyên môn", unit: "Khoa Y học lâm sàng", status: "Theo dõi nhận xét chuyên môn" },
    { name: "TS. Nguyễn Minh Phương", role: "Đại diện đơn vị nghiên cứu", unit, status: "Phối hợp giải trình" }
  ];
}

function createEthicsRecord(record: Omit<EthicsRecord, "workflow" | "documents">): EthicsRecord {
  return {
    ...record,
    documents: buildDocuments(record.code, record.secretaryOwner, record.updatedAt),
    workflow: buildWorkflow(record)
  };
}

export const ethicsRecords: EthicsRecord[] = [
  createEthicsRecord({
    id: "hdyd-2026-001",
    code: "HDYD-2026-001",
    title: "Đánh giá hiệu quả phục hồi chức năng sớm cho người bệnh sau chấn thương chi dưới",
    principalInvestigator: "TS. Phạm Anh Tuấn",
    unit: "Khoa Chấn thương chỉnh hình",
    researchType: "Nghiên cứu can thiệp",
    expectedMeeting: "Phiên 06/2026 · 18/05/2026",
    riskLevel: "medium",
    status: "ethics-awaiting-meeting",
    dueDate: "20/05/2026",
    dueLabel: "Còn 8 ngày đến hạn ban hành kết luận",
    receivedAt: "02/05/2026 08:30",
    updatedAt: "12/05/2026 09:20",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    researchObjective: "Đánh giá mức cải thiện vận động và an toàn của phác đồ phục hồi chức năng sớm.",
    studySubjects: "Người bệnh sau phẫu thuật chấn thương chi dưới, có đồng ý tham gia nghiên cứu.",
    sampleScope: "80 người bệnh tại Khoa Chấn thương chỉnh hình trong năm 2026.",
    riskAssessment: "Rủi ro trung bình do có can thiệp phục hồi chức năng và theo dõi tác dụng không mong muốn.",
    protectionMeasures: "Có quy trình tư vấn, phiếu chấp thuận tham gia và dừng nghiên cứu khi người bệnh không phù hợp.",
    meetingInfo: "Phòng họp A2 · 14:00 ngày 18/05/2026 · đã đủ thành phần tối thiểu.",
    reviewSummary: "Đã tổng hợp hai nhận xét phản biện, còn chờ phiên họp biểu quyết.",
    decisionSummary: "Chưa ban hành kết luận chính thức.",
    postDecisionTracking: "Sẽ theo dõi điều kiện chỉnh sửa đề cương sau phiên họp.",
    upcomingMeeting: true,
    committee: committee("GS. TS. Trần Viết Tiến", "PGS. TS. Hoàng Đức Minh", "Khoa Chấn thương chỉnh hình"),
    history: [
      { title: "Tiếp nhận hồ sơ thẩm định", meta: "02/05/2026 08:30 · Văn phòng Hội đồng y đức", status: "ethics-new" },
      { title: "Hoàn tất kiểm tra thành phần hồ sơ", meta: "04/05/2026 16:10 · Đại úy, CN. Trần Khánh Ly", status: "completed" },
      { title: "Phân công ủy viên phản biện", meta: "06/05/2026 09:45 · Chủ tịch hội đồng", status: "ethics-in-review" },
      { title: "Xếp lịch phiên họp hội đồng", meta: "12/05/2026 09:20 · Phiên 06/2026", status: "ethics-awaiting-meeting" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-002",
    code: "HDYD-2026-002",
    title: "Khảo sát yếu tố nguy cơ rối loạn giấc ngủ ở học viên quân y",
    principalInvestigator: "ThS. Vũ Lan Anh",
    unit: "Bộ môn Tâm thần và Tâm lý y học",
    researchType: "Nghiên cứu quan sát",
    expectedMeeting: "Kiểm tra trước khi xếp lịch",
    riskLevel: "low",
    status: "ethics-needs-evidence",
    dueDate: "16/05/2026",
    dueLabel: "Chờ bổ sung minh chứng trước 16/05/2026",
    receivedAt: "07/05/2026 10:00",
    updatedAt: "12/05/2026 11:05",
    secretaryOwner: "Thiếu tá, ThS. Bùi Huy Dũng",
    researchObjective: "Xác định tỷ lệ và yếu tố liên quan đến rối loạn giấc ngủ trong nhóm học viên.",
    studySubjects: "Học viên quân y tham gia khảo sát tự nguyện, không thu thập định danh nhạy cảm.",
    sampleScope: "Dự kiến 320 phiếu khảo sát ẩn danh trong học kỳ II.",
    riskAssessment: "Rủi ro thấp, chủ yếu liên quan đến bảo mật thông tin khảo sát.",
    protectionMeasures: "Ẩn danh dữ liệu, tách thông tin đồng ý tham gia khỏi dữ liệu phân tích.",
    meetingInfo: "Chưa xếp phiên họp do thiếu bản giải trình bảo mật dữ liệu.",
    reviewSummary: "Tổ thư ký yêu cầu bổ sung phiếu cung cấp thông tin nghiên cứu và phương án lưu trữ dữ liệu.",
    decisionSummary: "Chưa đủ điều kiện trình hội đồng.",
    postDecisionTracking: "Theo dõi hạn bổ sung minh chứng từ chủ nhiệm nghiên cứu.",
    needsEvidence: true,
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Đỗ Minh Trung", "Bộ môn Tâm thần và Tâm lý y học"),
    history: [
      { title: "Tiếp nhận hồ sơ", meta: "07/05/2026 10:00 · Tổ thư ký", status: "ethics-new" },
      { title: "Kiểm tra thành phần hồ sơ", meta: "10/05/2026 14:20 · Thiếu tá, ThS. Bùi Huy Dũng", status: "ethics-awaiting-check" },
      { title: "Yêu cầu bổ sung minh chứng", meta: "12/05/2026 11:05 · Gửi đến chủ nhiệm nghiên cứu", status: "ethics-needs-evidence" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-003",
    code: "HDYD-2026-003",
    title: "Phân tích dữ liệu bệnh án người bệnh viêm phổi nặng điều trị hồi sức",
    principalInvestigator: "PGS. TS. Trần Thu Hà",
    unit: "Khoa Hồi sức cấp cứu",
    researchType: "Nghiên cứu dữ liệu bệnh án",
    expectedMeeting: "Phiên 06/2026 · 18/05/2026",
    riskLevel: "medium",
    status: "ethics-in-review",
    dueDate: "22/05/2026",
    dueLabel: "Đang tổng hợp nhận xét phản biện",
    receivedAt: "05/05/2026 09:15",
    updatedAt: "12/05/2026 15:40",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    researchObjective: "Đánh giá đặc điểm điều trị và yếu tố tiên lượng ở người bệnh viêm phổi nặng.",
    studySubjects: "Hồ sơ bệnh án đã kết thúc điều trị, không can thiệp trực tiếp lên người bệnh.",
    sampleScope: "240 bệnh án giai đoạn 2024-2026 tại Khoa Hồi sức cấp cứu.",
    riskAssessment: "Rủi ro trung bình do sử dụng dữ liệu bệnh án và yêu cầu bảo mật chặt chẽ.",
    protectionMeasures: "Mã hóa định danh, giới hạn quyền truy cập và lưu trữ dữ liệu trên máy trạm được kiểm soát.",
    meetingInfo: "Dự kiến trình phiên 06/2026 nếu hoàn tất nhận xét trước 15/05/2026.",
    reviewSummary: "Một phản biện đã gửi nhận xét, phản biện còn lại đang rà soát phương án bảo mật.",
    decisionSummary: "Chưa có kết luận.",
    postDecisionTracking: "Theo dõi yêu cầu cập nhật phụ lục xử lý dữ liệu.",
    committee: committee("GS. TS. Trần Viết Tiến", "PGS. TS. Nguyễn Văn Khánh", "Khoa Hồi sức cấp cứu"),
    history: [
      { title: "Tiếp nhận hồ sơ dữ liệu bệnh án", meta: "05/05/2026 09:15 · Văn phòng Hội đồng y đức", status: "ethics-new" },
      { title: "Phân công phản biện bảo mật dữ liệu", meta: "09/05/2026 08:00 · Chủ tịch hội đồng", status: "ethics-in-review" },
      { title: "Nhận nhận xét phản biện thứ nhất", meta: "12/05/2026 15:40 · PGS. TS. Nguyễn Văn Khánh", status: "ethics-in-review" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-004",
    code: "HDYD-2026-004",
    title: "Thử nghiệm quy trình theo dõi đường huyết liên tục trong điều trị nội trú",
    principalInvestigator: "TS. Nguyễn Quang Huy",
    unit: "Khoa Nội tiết",
    researchType: "Thử nghiệm lâm sàng nội bộ",
    expectedMeeting: "Phiên khẩn · 15/05/2026",
    riskLevel: "high",
    status: "ethics-awaiting-meeting",
    dueDate: "17/05/2026",
    dueLabel: "Cần theo dõi sát trước phiên họp khẩn",
    receivedAt: "30/04/2026 14:00",
    updatedAt: "12/05/2026 08:50",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    researchObjective: "Đánh giá tính khả thi và an toàn của quy trình theo dõi đường huyết liên tục.",
    studySubjects: "Người bệnh nội trú có chỉ định theo dõi đường huyết liên tục theo phác đồ điều trị.",
    sampleScope: "60 người bệnh tại Khoa Nội tiết trong 6 tháng.",
    riskAssessment: "Rủi ro cao do thử nghiệm quy trình lâm sàng và sử dụng thiết bị theo dõi liên tục.",
    protectionMeasures: "Có giám sát bác sĩ điều trị, quy trình xử trí bất thường và quyền rút khỏi nghiên cứu.",
    meetingInfo: "Phòng họp trực tuyến bảo mật · 09:00 ngày 15/05/2026 · cần đủ ủy viên phản biện.",
    reviewSummary: "Tổ thư ký đã đánh dấu hồ sơ cần hội đồng xem xét kỹ điều kiện an toàn.",
    decisionSummary: "Chưa biểu quyết.",
    postDecisionTracking: "Nếu được thông qua, cần báo cáo an toàn hàng tháng.",
    highRiskWatch: true,
    upcomingMeeting: true,
    committee: committee("GS. TS. Trần Viết Tiến", "PGS. TS. Phạm Minh Đức", "Khoa Nội tiết"),
    history: [
      { title: "Tiếp nhận hồ sơ thử nghiệm nội bộ", meta: "30/04/2026 14:00 · Văn phòng Hội đồng y đức", status: "ethics-new" },
      { title: "Yêu cầu làm rõ tiêu chí dừng nghiên cứu", meta: "06/05/2026 17:30 · Ủy viên phản biện", status: "ethics-needs-evidence" },
      { title: "Chủ nhiệm nghiên cứu đã bổ sung giải trình", meta: "10/05/2026 10:15 · Khoa Nội tiết", status: "completed" },
      { title: "Lên lịch phiên họp khẩn", meta: "12/05/2026 08:50 · Chủ tịch hội đồng", status: "ethics-awaiting-meeting" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-005",
    code: "HDYD-2026-005",
    title: "Đánh giá đặc điểm mô bệnh học trong mẫu bệnh phẩm ung thư tuyến giáp",
    principalInvestigator: "ThS. Lê Quốc Huy",
    unit: "Bộ môn Giải phẫu bệnh",
    researchType: "Nghiên cứu sử dụng mẫu bệnh phẩm",
    expectedMeeting: "Đã họp phiên 05/2026",
    riskLevel: "medium",
    status: "ethics-conditional-approved",
    dueDate: "25/05/2026",
    dueLabel: "Theo dõi hoàn tất điều kiện kèm theo",
    receivedAt: "22/04/2026 08:45",
    updatedAt: "11/05/2026 18:20",
    secretaryOwner: "Thiếu tá, ThS. Bùi Huy Dũng",
    researchObjective: "Mô tả đặc điểm mô bệnh học và liên hệ với chỉ dấu lâm sàng đã lưu trữ.",
    studySubjects: "Mẫu bệnh phẩm lưu trữ sau chẩn đoán, không lấy thêm mẫu từ người bệnh.",
    sampleScope: "150 mẫu bệnh phẩm đã mã hóa tại Bộ môn Giải phẫu bệnh.",
    riskAssessment: "Rủi ro trung bình do sử dụng mẫu bệnh phẩm và dữ liệu liên quan.",
    protectionMeasures: "Ẩn danh mẫu, quản lý sổ bàn giao và không sử dụng ngoài phạm vi đề cương.",
    meetingInfo: "Phiên 05/2026 · Phòng họp A1 · đã đủ số phiếu thông qua có điều kiện.",
    reviewSummary: "Hội đồng yêu cầu bổ sung quy trình hủy mẫu thừa sau phân tích.",
    decisionSummary: "Thông qua có điều kiện, phải nộp phụ lục quản lý mẫu trước khi triển khai.",
    postDecisionTracking: "Tổ thư ký theo dõi phụ lục điều kiện trước 25/05/2026.",
    needsEvidence: true,
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Đỗ Minh Trung", "Bộ môn Giải phẫu bệnh"),
    history: [
      { title: "Tiếp nhận hồ sơ sử dụng mẫu bệnh phẩm", meta: "22/04/2026 08:45 · Văn phòng Hội đồng y đức", status: "ethics-new" },
      { title: "Họp hội đồng phiên 05/2026", meta: "10/05/2026 15:00 · Phòng họp A1", status: "completed" },
      { title: "Ban hành kết luận có điều kiện", meta: "11/05/2026 18:20 · Văn phòng Hội đồng y đức", status: "ethics-conditional-approved" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-006",
    code: "HDYD-2026-006",
    title: "Hồi cứu hiệu quả điều trị kháng sinh trong nhiễm khuẩn tiết niệu phức tạp",
    principalInvestigator: "BSCKII. Nguyễn Thị Mai",
    unit: "Khoa Truyền nhiễm",
    researchType: "Nghiên cứu hồi cứu",
    expectedMeeting: "Không cần họp toàn thể",
    riskLevel: "low",
    status: "ethics-approved",
    dueDate: "12/05/2026",
    dueLabel: "Đã ban hành kết luận đúng hạn",
    receivedAt: "25/04/2026 09:00",
    updatedAt: "12/05/2026 10:10",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    researchObjective: "Phân tích kết quả điều trị hồi cứu để cải thiện khuyến cáo sử dụng kháng sinh.",
    studySubjects: "Bệnh án đã hoàn tất điều trị, dữ liệu được mã hóa trước khi phân tích.",
    sampleScope: "190 bệnh án giai đoạn 2023-2025.",
    riskAssessment: "Rủi ro thấp do không can thiệp và không liên hệ lại người bệnh.",
    protectionMeasures: "Không thu thập danh tính trực tiếp, chỉ dùng mã nghiên cứu nội bộ.",
    meetingInfo: "Thẩm định rút gọn, đã có đủ ý kiến đồng thuận của hội đồng.",
    reviewSummary: "Các nhận xét thống nhất hồ sơ đủ điều kiện triển khai.",
    decisionSummary: "Đã thông qua.",
    postDecisionTracking: "Lưu ý báo cáo việc bảo mật dữ liệu khi nghiệm thu đề tài.",
    committee: committee("GS. TS. Trần Viết Tiến", "PGS. TS. Hoàng Đức Minh", "Khoa Truyền nhiễm"),
    history: [
      { title: "Tiếp nhận hồ sơ hồi cứu", meta: "25/04/2026 09:00 · Tổ thư ký", status: "ethics-new" },
      { title: "Hoàn tất thẩm định rút gọn", meta: "09/05/2026 16:00 · Hội đồng y đức", status: "completed" },
      { title: "Ban hành kết luận thông qua", meta: "12/05/2026 10:10 · Văn phòng Hội đồng y đức", status: "ethics-approved" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-007",
    code: "HDYD-2026-007",
    title: "Nghiên cứu can thiệp giáo dục sức khỏe cho người bệnh tăng huyết áp",
    principalInvestigator: "ThS. Đỗ Hồng Sơn",
    unit: "Khoa Tim mạch",
    researchType: "Nghiên cứu can thiệp",
    expectedMeeting: "Phiên 07/2026 · dự kiến 03/06/2026",
    riskLevel: "medium",
    status: "ethics-awaiting-check",
    dueDate: "24/05/2026",
    dueLabel: "Đang kiểm tra thành phần hồ sơ",
    receivedAt: "11/05/2026 13:20",
    updatedAt: "12/05/2026 13:45",
    secretaryOwner: "Thiếu tá, ThS. Bùi Huy Dũng",
    researchObjective: "Đánh giá thay đổi tuân thủ điều trị sau chương trình giáo dục sức khỏe.",
    studySubjects: "Người bệnh tăng huyết áp ngoại trú tự nguyện tham gia tư vấn theo nhóm.",
    sampleScope: "120 người bệnh tại phòng khám Tim mạch.",
    riskAssessment: "Rủi ro trung bình do có can thiệp tư vấn và thu thập dữ liệu theo dõi.",
    protectionMeasures: "Cung cấp thông tin đầy đủ, không thay đổi phác đồ điều trị hiện hành.",
    meetingInfo: "Dự kiến đưa vào phiên 07/2026 nếu hồ sơ đủ thành phần.",
    reviewSummary: "Tổ thư ký đang rà soát biểu mẫu đồng ý tham gia nghiên cứu.",
    decisionSummary: "Chưa trình hội đồng.",
    postDecisionTracking: "Chưa phát sinh theo dõi sau kết luận.",
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Đỗ Minh Trung", "Khoa Tim mạch"),
    history: [
      { title: "Tiếp nhận hồ sơ mới", meta: "11/05/2026 13:20 · Cổng tiếp nhận nội bộ", status: "ethics-new" },
      { title: "Bắt đầu kiểm tra thành phần", meta: "12/05/2026 13:45 · Tổ thư ký", status: "ethics-awaiting-check" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-008",
    code: "HDYD-2026-008",
    title: "Theo dõi an toàn nghiên cứu sử dụng thuốc giảm đau sau phẫu thuật",
    principalInvestigator: "TS. Bùi Hải Nam",
    unit: "Khoa Gây mê hồi sức",
    researchType: "Thử nghiệm lâm sàng nội bộ",
    expectedMeeting: "Tạm dừng chờ giải trình",
    riskLevel: "high",
    status: "ethics-paused",
    dueDate: "18/05/2026",
    dueLabel: "Tạm dừng thẩm định đến khi có giải trình an toàn",
    receivedAt: "20/04/2026 15:30",
    updatedAt: "09/05/2026 16:50",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    researchObjective: "Theo dõi an toàn và hiệu quả giảm đau sau phẫu thuật trong môi trường nội trú.",
    studySubjects: "Người bệnh sau phẫu thuật có chỉ định dùng thuốc theo phác đồ điều trị.",
    sampleScope: "70 người bệnh dự kiến theo dõi trong 3 tháng.",
    riskAssessment: "Rủi ro cao do liên quan thuốc, biến cố bất lợi và theo dõi sau phẫu thuật.",
    protectionMeasures: "Cần bổ sung quy trình báo cáo biến cố bất lợi và hội đồng giám sát an toàn.",
    meetingInfo: "Chưa xếp lịch lại sau khi hồ sơ bị tạm dừng.",
    reviewSummary: "Hội đồng yêu cầu giải trình rõ tiêu chí loại trừ và xử trí biến cố.",
    decisionSummary: "Tạm dừng thẩm định.",
    postDecisionTracking: "Theo dõi văn bản giải trình của chủ nhiệm nghiên cứu.",
    needsEvidence: true,
    highRiskWatch: true,
    committee: committee("GS. TS. Trần Viết Tiến", "PGS. TS. Phạm Minh Đức", "Khoa Gây mê hồi sức"),
    history: [
      { title: "Tiếp nhận hồ sơ thử nghiệm", meta: "20/04/2026 15:30 · Văn phòng Hội đồng y đức", status: "ethics-new" },
      { title: "Phản biện ghi nhận rủi ro an toàn", meta: "06/05/2026 11:20 · Ủy viên phản biện", status: "ethics-in-review" },
      { title: "Tạm dừng thẩm định", meta: "09/05/2026 16:50 · Chủ tịch hội đồng", status: "ethics-paused" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-009",
    code: "HDYD-2026-009",
    title: "Đánh giá chấp nhận tiêm chủng dự phòng trong lực lượng học viên",
    principalInvestigator: "TS. Lê Minh Châu",
    unit: "Bộ môn Dịch tễ học quân sự",
    researchType: "Nghiên cứu quan sát",
    expectedMeeting: "Phiên 07/2026 · dự kiến 03/06/2026",
    riskLevel: "low",
    status: "ethics-new",
    dueDate: "28/05/2026",
    dueLabel: "Mới tiếp nhận, chờ phân luồng kiểm tra",
    receivedAt: "12/05/2026 08:15",
    updatedAt: "12/05/2026 08:15",
    secretaryOwner: "Thiếu tá, ThS. Bùi Huy Dũng",
    researchObjective: "Khảo sát nhận thức và yếu tố ảnh hưởng đến chấp nhận tiêm chủng dự phòng.",
    studySubjects: "Học viên tham gia khảo sát tự nguyện bằng phiếu ẩn danh.",
    sampleScope: "500 học viên các khóa đào tạo chính quy.",
    riskAssessment: "Rủi ro thấp, không can thiệp y tế và không thu thập dữ liệu định danh.",
    protectionMeasures: "Thông tin khảo sát được mã hóa theo lớp, không truy hồi cá nhân.",
    meetingInfo: "Chưa xếp phiên họp.",
    reviewSummary: "Chưa kiểm tra thành phần hồ sơ.",
    decisionSummary: "Chưa có kết luận.",
    postDecisionTracking: "Chưa phát sinh theo dõi sau kết luận.",
    committee: committee("PGS. TS. Lê Thị Thanh Hương", "TS. Đỗ Minh Trung", "Bộ môn Dịch tễ học quân sự"),
    history: [
      { title: "Tiếp nhận hồ sơ mới", meta: "12/05/2026 08:15 · Cổng tiếp nhận nội bộ", status: "ethics-new" }
    ]
  }),
  createEthicsRecord({
    id: "hdyd-2026-010",
    code: "HDYD-2026-010",
    title: "Nghiên cứu sử dụng dữ liệu hình ảnh chẩn đoán trong phát hiện tổn thương phổi",
    principalInvestigator: "ThS. Nguyễn Đức Anh",
    unit: "Khoa Chẩn đoán hình ảnh",
    researchType: "Nghiên cứu dữ liệu bệnh án",
    expectedMeeting: "Đã họp phiên 05/2026",
    riskLevel: "high",
    status: "ethics-not-approved",
    dueDate: "11/05/2026",
    dueLabel: "Đã ban hành kết luận không thông qua",
    receivedAt: "18/04/2026 09:40",
    updatedAt: "11/05/2026 17:10",
    secretaryOwner: "Đại úy, CN. Trần Khánh Ly",
    researchObjective: "Khai thác dữ liệu hình ảnh chẩn đoán để hỗ trợ phát hiện tổn thương phổi.",
    studySubjects: "Dữ liệu hình ảnh và bệnh án liên quan của người bệnh đã điều trị.",
    sampleScope: "Kho dữ liệu hình ảnh giai đoạn 2022-2025.",
    riskAssessment: "Rủi ro cao do phạm vi dữ liệu lớn và chưa làm rõ cơ chế ẩn danh hình ảnh.",
    protectionMeasures: "Phương án bảo mật chưa đạt yêu cầu của hội đồng.",
    meetingInfo: "Phiên 05/2026 · hội đồng biểu quyết không thông qua.",
    reviewSummary: "Hồ sơ chưa chứng minh được cơ chế bảo vệ dữ liệu hình ảnh và quyền riêng tư.",
    decisionSummary: "Không thông qua, đề nghị xây dựng lại phương án bảo mật và phạm vi dữ liệu.",
    postDecisionTracking: "Nếu nộp lại, cần hồ sơ mới kèm thuyết minh quản trị dữ liệu.",
    highRiskWatch: true,
    committee: committee("GS. TS. Trần Viết Tiến", "PGS. TS. Nguyễn Văn Khánh", "Khoa Chẩn đoán hình ảnh"),
    history: [
      { title: "Tiếp nhận hồ sơ dữ liệu hình ảnh", meta: "18/04/2026 09:40 · Văn phòng Hội đồng y đức", status: "ethics-new" },
      { title: "Họp hội đồng phiên 05/2026", meta: "10/05/2026 15:00 · Phòng họp A1", status: "completed" },
      { title: "Ban hành kết luận không thông qua", meta: "11/05/2026 17:10 · Văn phòng Hội đồng y đức", status: "ethics-not-approved" }
    ]
  })
];

export function getEthicsRecordById(id: string) {
  return ethicsRecords.find((record) => record.id === id) ?? null;
}

export function getEthicsSummary() {
  return {
    total: ethicsRecords.length,
    awaitingCheck: ethicsRecords.filter((record) => record.status === "ethics-awaiting-check").length,
    inReview: ethicsRecords.filter((record) => record.status === "ethics-in-review").length,
    awaitingMeeting: ethicsRecords.filter((record) => record.status === "ethics-awaiting-meeting").length,
    needsEvidence: ethicsRecords.filter((record) => record.needsEvidence || record.status === "ethics-needs-evidence").length,
    concluded: ethicsRecords.filter((record) =>
      ["ethics-approved", "ethics-conditional-approved", "ethics-not-approved"].includes(record.status)
    ).length
  };
}

export function getEthicsStatusOptions() {
  return [
    "Mới tiếp nhận",
    "Chờ kiểm tra",
    "Cần bổ sung minh chứng",
    "Đang thẩm định",
    "Chờ họp hội đồng",
    "Đã thông qua",
    "Thông qua có điều kiện",
    "Không thông qua",
    "Tạm dừng"
  ];
}

export function getEthicsRiskOptions() {
  return ["Thấp", "Trung bình", "Cao"];
}

export function getEthicsResearchTypeOptions() {
  return [...new Set(ethicsRecords.map((record) => record.researchType))];
}

export function getEthicsUnitOptions() {
  return [...new Set(ethicsRecords.map((record) => record.unit))];
}

export function getEthicsMeetingOptions() {
  return [...new Set(ethicsRecords.map((record) => record.expectedMeeting))];
}

export function getEthicsNeedsEvidence() {
  return ethicsRecords.filter((record) => record.needsEvidence || record.status === "ethics-needs-evidence");
}

export function getEthicsUpcomingMeetings() {
  return ethicsRecords.filter((record) => record.upcomingMeeting);
}

export function getEthicsHighRiskRecords() {
  return ethicsRecords.filter((record) => record.highRiskWatch || record.riskLevel === "high");
}

export function getEthicsSecretaryLoad() {
  const toneCycle = ["emerald", "amber", "blue", "teal", "maroon"] as const;

  return [...new Set(ethicsRecords.map((record) => record.secretaryOwner))].map((owner, index) => {
    const count = ethicsRecords.filter((record) => record.secretaryOwner === owner).length;

    return {
      label: owner.replace("Đại úy, CN. ", "").replace("Thiếu tá, ThS. ", ""),
      count,
      height: `${72 + count * 18}px`,
      tone: toneCycle[index % toneCycle.length]
    };
  });
}
