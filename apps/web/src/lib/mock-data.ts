import type { WorkflowStatus } from "@rtms/contracts";

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

export type Task = {
  id: string;
  title: string;
  linkedRecord: string;
  assignee: string;
  priority: "high" | "medium" | "low";
  status: WorkflowStatus;
  dueDate: string;
};

export const proposals: Proposal[] = [
  {
    id: "demo-001",
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
    id: "demo-002",
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
    id: "demo-003",
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
    id: "demo-004",
    code: "HVQY-2026-032",
    title: "Tối ưu quy trình huấn luyện mô phỏng cấp cứu chiến thuật",
    unit: "Trung tâm Mô phỏng y học",
    owner: "Đại tá, TS. Phạm Anh Tuấn",
    intakePeriod: "Đợt 2/2026",
    status: "submitted",
    submittedAt: "25/04/2026",
    dueDate: "05/05/2026"
  }
];

export const tasks: Task[] = [
  {
    id: "T-1024",
    title: "Rà soát hồ sơ chờ phê duyệt HVQY-2026-001",
    linkedRecord: "HVQY-2026-001",
    assignee: "Phòng QLKH",
    priority: "high",
    status: "pending-approval",
    dueDate: "Hôm nay"
  },
  {
    id: "T-1025",
    title: "Nhắc reviewer hoàn tất đánh giá đề tài nhiễm khuẩn",
    linkedRecord: "HVQY-2026-014",
    assignee: "CN. Vũ Lan",
    priority: "medium",
    status: "overdue",
    dueDate: "Quá hạn 1 ngày"
  },
  {
    id: "T-1026",
    title: "Kiểm tra minh chứng bổ sung của đề tài thận cấp",
    linkedRecord: "HVQY-2026-021",
    assignee: "ThS. Hoàng Mai",
    priority: "medium",
    status: "needs-supplement",
    dueDate: "27/04/2026"
  },
  {
    id: "T-1027",
    title: "Chuẩn bị báo cáo tổng hợp đợt 1/2026",
    linkedRecord: "Báo cáo điều hành",
    assignee: "Phòng QLKH",
    priority: "low",
    status: "draft",
    dueDate: "03/05/2026"
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
    meta: "Phòng QLKH - 25/04/2026 16:10",
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
