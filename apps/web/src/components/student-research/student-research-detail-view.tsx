import { Award, CheckCircle2, ClipboardCheck, FileText, MessageSquareMore, Send } from "lucide-react";
import { ActionPanel } from "@/components/ui/action-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DetailInfoGrid } from "@/components/ui/detail-info-grid";
import { DocumentList } from "@/components/ui/document-list";
import { ModuleSummaryStrip } from "@/components/ui/module-summary-strip";
import { PageHeader } from "@/components/ui/page-header";
import { ProcessTabs } from "@/components/ui/process-tabs";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import type { StudentResearchRecord } from "@/lib/student-research-data";

export function StudentResearchDetailView({ record }: { record: StudentResearchRecord }) {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Bảng điều hành", href: "/dashboard" },
          { label: "Đề tài sinh viên NCKH", href: "/de-tai-sinh-vien" },
          { label: record.code }
        ]}
      />

      <PageHeader
        eyebrow={record.code}
        title={record.title}
        description="Tổng hợp hồ sơ đăng ký, nhóm sinh viên, giảng viên hướng dẫn, tiến độ nghiên cứu, nghiệm thu, kết quả và lịch sử xử lý."
        actions={
          <>
            <StatusBadge status={record.status} />
            <span className="status-badge info">{record.academicYear}</span>
            <button className="button primary" type="button">
              <ClipboardCheck size={16} aria-hidden="true" />
              Cập nhật tiến độ
            </button>
            <button className="button" type="button">
              <CheckCircle2 size={16} aria-hidden="true" />
              Ghi nhận nghiệm thu
            </button>
          </>
        }
      />

      <ProcessTabs
        items={[
          { label: "Tổng quan", href: "#tong-quan", active: true },
          { label: "Tiến độ", href: "#tien-do" },
          { label: "Hội đồng", href: "#hoi-dong" },
          { label: "Tài liệu", href: "#tai-lieu" },
          { label: "Lịch sử xử lý", href: "#lich-su-xu-ly" }
        ]}
      />

      <ModuleSummaryStrip
        items={[
          { label: "Nhóm sinh viên", value: `${record.studentMembers.length} thành viên`, meta: record.studentLead.name, tone: "info" },
          { label: "Giảng viên hướng dẫn", value: "Đã phân công", meta: record.supervisor.name },
          { label: "Hạn xử lý", value: record.dueDate, meta: record.dueLabel, tone: record.needsSupplement ? "warning" : record.status === "student-not-passed" ? "danger" : "default" },
          { label: "Cập nhật gần nhất", value: record.updatedAt, meta: record.secretary.name }
        ]}
      />

      <div className="grid two-column" id="tong-quan" style={{ marginTop: 16 }}>
        <div className="grid">
          <SectionCard title="Thông tin đề tài" subtitle="Mã đề tài, tên đề tài, năm học, lĩnh vực và đơn vị quản lý">
            <DetailInfoGrid
              items={[
                { label: "Mã đề tài", value: record.code },
                { label: "Tên đề tài", value: record.title },
                { label: "Năm học", value: record.academicYear },
                { label: "Lĩnh vực", value: record.field },
                { label: "Khoa/Bộ môn", value: record.unit },
                { label: "Ngày đăng ký", value: record.registeredAt },
                { label: "Trạng thái hiện tại", value: <StatusBadge status={record.status} /> }
              ]}
            />
          </SectionCard>

          <SectionCard title="Thành viên nhóm sinh viên" subtitle="Nhóm trưởng, thành viên tham gia và trạng thái phân công trong nhóm">
            <DetailInfoGrid
              items={record.studentMembers.map((member) => ({
                label: member.name,
                value: `${member.role} · ${member.className} · ${member.status}`
              }))}
            />
          </SectionCard>

          <SectionCard title="Giảng viên hướng dẫn" subtitle="Giảng viên hướng dẫn chính, đồng hướng dẫn và đơn vị chuyên môn liên quan">
            <DetailInfoGrid
              items={[
                {
                  label: record.supervisor.name,
                  value: `${record.supervisor.role} · ${record.supervisor.unit} · ${record.supervisor.status}`
                },
                {
                  label: record.coSupervisor?.name ?? "Không có giảng viên đồng hướng dẫn",
                  value: record.coSupervisor
                    ? `${record.coSupervisor.role} · ${record.coSupervisor.unit} · ${record.coSupervisor.status}`
                    : "Đề tài hiện chỉ ghi nhận giảng viên hướng dẫn chính"
                }
              ]}
            />
          </SectionCard>

          <SectionCard title="Kế hoạch thực hiện" subtitle="Mục tiêu, phương pháp, sản phẩm dự kiến và kế hoạch triển khai">
            <DetailInfoGrid
              items={[
                { label: "Mục tiêu nghiên cứu", value: record.objective },
                { label: "Phương pháp thực hiện", value: record.methodology },
                { label: "Sản phẩm dự kiến", value: record.expectedProduct },
                { label: "Kế hoạch triển khai", value: record.implementationPlan }
              ]}
            />
          </SectionCard>

          <SectionCard id="tien-do" title="Tiến độ nghiên cứu" subtitle="Tóm tắt tiến độ hiện hành và các mốc cần theo dõi">
            <DetailInfoGrid
              items={[
                { label: "Tóm tắt tiến độ", value: record.progressSummary },
                { label: "Hạn xử lý", value: record.dueLabel },
                { label: "Cập nhật gần nhất", value: record.updatedAt }
              ]}
            />
          </SectionCard>

          <SectionCard title="Sản phẩm nghiên cứu" subtitle="Các đầu ra cần lưu vết trong hồ sơ nghiệm thu và báo cáo kết quả">
            <DetailInfoGrid
              items={record.researchProducts.map((product, index) => ({
                label: `Sản phẩm ${index + 1}`,
                value: product
              }))}
            />
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard id="hoi-dong" title="Hội đồng nghiệm thu" subtitle="Thành phần hội đồng, vai trò chuyên môn và trạng thái phối hợp">
            <DetailInfoGrid
              items={record.committee.map((member) => ({
                label: member.name,
                value: `${member.role} · ${member.unit} · ${member.status}`
              }))}
            />
          </SectionCard>

          <SectionCard title="Lịch nghiệm thu" subtitle="Thời gian, địa điểm hoặc trạng thái xếp lịch nghiệm thu đề tài">
            <DetailInfoGrid
              items={[
                { label: "Lịch nghiệm thu", value: record.acceptanceSchedule },
                { label: "Thư ký hội đồng", value: `${record.secretary.name} · ${record.secretary.status}` }
              ]}
            />
          </SectionCard>

          <SectionCard title="Điểm đánh giá" subtitle="Kết quả chấm điểm hoặc trạng thái chờ đánh giá của hội đồng">
            <DetailInfoGrid items={[{ label: "Điểm và xếp loại", value: record.scoreSummary }, { label: "Kết quả", value: record.resultSummary }]} />
          </SectionCard>

          <SectionCard title="Kết quả và khen thưởng" subtitle="Kết quả nghiệm thu, đề xuất giải thưởng hoặc trạng thái lưu hồ sơ kết quả">
            <DetailInfoGrid items={[{ label: "Kết quả nghiệm thu", value: record.resultSummary }, { label: "Khen thưởng", value: record.awardSummary }]} />
          </SectionCard>

          <SectionCard id="tai-lieu" title="Tài liệu báo cáo" subtitle="Phiếu đăng ký, đề cương, xác nhận hướng dẫn, báo cáo, phiếu nhận xét và chứng nhận kết quả">
            <DocumentList items={record.documents} />
          </SectionCard>

          <SectionCard title="Quy trình xử lý" subtitle="Theo dõi đầy đủ các bước từ đăng ký đề tài đến công nhận kết quả">
            <Timeline items={record.workflow} />
          </SectionCard>

          <SectionCard id="lich-su-xu-ly" title="Lịch sử xử lý" subtitle="Các mốc tiếp nhận, bổ sung, xét duyệt, theo dõi tiến độ, nghiệm thu và công nhận kết quả">
            <Timeline items={record.history} />
          </SectionCard>

          <SectionCard title="Hành động xử lý" subtitle="Các thao tác nghiệp vụ dự kiến cho hồ sơ đề tài sinh viên đang xem">
            <ActionPanel
              actions={[
                { label: "Cập nhật tiến độ", tone: "primary", icon: <ClipboardCheck size={16} aria-hidden="true" /> },
                { label: "Yêu cầu bổ sung", icon: <MessageSquareMore size={16} aria-hidden="true" /> },
                { label: "Ghi nhận nghiệm thu", icon: <CheckCircle2 size={16} aria-hidden="true" /> },
                { label: "Đề xuất khen thưởng", icon: <Award size={16} aria-hidden="true" /> },
                { label: "Chuyển phê duyệt", icon: <Send size={16} aria-hidden="true" /> },
                { label: "Mở tài liệu", icon: <FileText size={16} aria-hidden="true" /> }
              ]}
              note="Các nút hiện chỉ mô tả thao tác nghiệp vụ trên giao diện, chưa phát sinh cập nhật dữ liệu thực."
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
