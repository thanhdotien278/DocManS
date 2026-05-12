import { CheckCircle2, ClipboardCheck, FileText, MessageSquareMore, Send, ShieldCheck } from "lucide-react";
import { ActionPanel } from "@/components/ui/action-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DetailInfoGrid } from "@/components/ui/detail-info-grid";
import { DocumentList } from "@/components/ui/document-list";
import { ModuleSummaryStrip } from "@/components/ui/module-summary-strip";
import { PageHeader } from "@/components/ui/page-header";
import { ProcessTabs } from "@/components/ui/process-tabs";
import { RiskBadge } from "@/components/ui/risk-badge";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Timeline } from "@/components/ui/timeline";
import type { EthicsRecord } from "@/lib/ethics-data";

export function EthicsDetailView({ record }: { record: EthicsRecord }) {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Bảng điều hành", href: "/dashboard" },
          { label: "Hội đồng y đức", href: "/hoi-dong-y-duc" },
          { label: record.code }
        ]}
      />

      <PageHeader
        eyebrow={record.code}
        title={record.title}
        description="Tổng hợp hồ sơ thẩm định y đức, phân loại rủi ro, thành phần hội đồng, tài liệu, kết luận và lịch sử xử lý."
        actions={
          <>
            <StatusBadge status={record.status} />
            <RiskBadge level={record.riskLevel} />
            <button className="button primary" type="button">
              <ClipboardCheck size={16} aria-hidden="true" />
              Cập nhật thẩm định
            </button>
            <button className="button" type="button">
              <CheckCircle2 size={16} aria-hidden="true" />
              Ghi nhận kết luận
            </button>
          </>
        }
      />

      <ProcessTabs
        items={[
          { label: "Tổng quan", href: "#tong-quan", active: true },
          { label: "Quy trình thẩm định", href: "#quy-trinh-tham-dinh" },
          { label: "Hội đồng", href: "#hoi-dong" },
          { label: "Tài liệu", href: "#tai-lieu" },
          { label: "Lịch sử xử lý", href: "#lich-su-xu-ly" }
        ]}
      />

      <ModuleSummaryStrip
        items={[
          { label: "Loại nghiên cứu", value: record.researchType, meta: record.unit, tone: "info" },
          { label: "Phiên họp", value: record.expectedMeeting, meta: record.meetingInfo },
          { label: "Hạn xử lý", value: record.dueDate, meta: record.dueLabel, tone: record.needsEvidence ? "warning" : record.highRiskWatch ? "danger" : "default" },
          { label: "Cập nhật gần nhất", value: record.updatedAt, meta: record.secretaryOwner }
        ]}
      />

      <div className="grid two-column" id="tong-quan" style={{ marginTop: 16 }}>
        <div className="grid">
          <SectionCard title="Thông tin nghiên cứu" subtitle="Mã hồ sơ, chủ nhiệm nghiên cứu, đơn vị và phạm vi thẩm định">
            <DetailInfoGrid
              items={[
                { label: "Mã hồ sơ", value: record.code },
                { label: "Tên nghiên cứu", value: record.title },
                { label: "Chủ nhiệm nghiên cứu", value: record.principalInvestigator },
                { label: "Đơn vị", value: record.unit },
                { label: "Loại nghiên cứu", value: record.researchType },
                { label: "Ngày tiếp nhận", value: record.receivedAt },
                { label: "Trạng thái hiện tại", value: <StatusBadge status={record.status} /> },
                { label: "Mức độ rủi ro", value: <RiskBadge level={record.riskLevel} /> }
              ]}
            />
          </SectionCard>

          <SectionCard title="Đối tượng nghiên cứu" subtitle="Nhóm tham gia, nguồn dữ liệu và phạm vi mẫu được đề xuất">
            <DetailInfoGrid
              items={[
                { label: "Mục tiêu nghiên cứu", value: record.researchObjective },
                { label: "Đối tượng nghiên cứu", value: record.studySubjects },
                { label: "Cỡ mẫu hoặc nguồn dữ liệu", value: record.sampleScope }
              ]}
            />
          </SectionCard>

          <SectionCard title="Phân loại rủi ro" subtitle="Mức độ rủi ro, căn cứ đánh giá và biện pháp bảo vệ người tham gia">
            <DetailInfoGrid
              items={[
                { label: "Mức độ rủi ro", value: <RiskBadge level={record.riskLevel} /> },
                { label: "Nhận định rủi ro", value: record.riskAssessment },
                { label: "Biện pháp bảo vệ", value: record.protectionMeasures }
              ]}
            />
          </SectionCard>

          <SectionCard id="hoi-dong" title="Thành phần hội đồng" subtitle="Vai trò tham gia thẩm định và trạng thái phối hợp của từng thành viên">
            <DetailInfoGrid
              items={record.committee.map((member) => ({
                label: member.name,
                value: `${member.role} · ${member.unit} · ${member.status}`
              }))}
            />
          </SectionCard>

          <SectionCard title="Phiên họp hội đồng" subtitle="Thông tin điều phối phiên họp, địa điểm, thành phần và trạng thái biểu quyết">
            <DetailInfoGrid
              items={[
                { label: "Phiên họp dự kiến", value: record.expectedMeeting },
                { label: "Thông tin phiên họp", value: record.meetingInfo },
                { label: "Đầu mối thư ký", value: record.secretaryOwner }
              ]}
            />
          </SectionCard>

          <SectionCard title="Nhận xét thẩm định" subtitle="Tổng hợp nhận xét chuyên môn và các nội dung cần lưu ý trước kết luận">
            <DetailInfoGrid items={[{ label: "Tóm tắt nhận xét", value: record.reviewSummary }, { label: "Cập nhật gần nhất", value: record.updatedAt }]} />
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard title="Kết luận và điều kiện kèm theo" subtitle="Kết luận của hội đồng hoặc nội dung đang chờ biểu quyết">
            <DetailInfoGrid
              items={[
                { label: "Kết luận", value: record.decisionSummary },
                { label: "Điều kiện hoặc yêu cầu kèm theo", value: record.needsEvidence ? "Cần bổ sung minh chứng hoặc giải trình trước khi tiếp tục xử lý" : "Theo dõi theo kết luận hiện hành của hội đồng" }
              ]}
            />
          </SectionCard>

          <SectionCard title="Theo dõi sau kết luận" subtitle="Nội dung cần kiểm soát sau khi hội đồng ban hành ý kiến thẩm định">
            <DetailInfoGrid items={[{ label: "Theo dõi hiện hành", value: record.postDecisionTracking }, { label: "Hạn xử lý", value: record.dueLabel }]} />
          </SectionCard>

          <SectionCard id="tai-lieu" title="Tài liệu y đức" subtitle="Đề cương, phiếu thông tin, biểu mẫu chấp thuận, biên bản và quyết nghị hội đồng">
            <DocumentList items={record.documents} />
          </SectionCard>

          <SectionCard id="quy-trinh-tham-dinh" title="Quy trình thẩm định" subtitle="Theo dõi đầy đủ các bước từ tiếp nhận hồ sơ đến theo dõi sau kết luận">
            <Timeline items={record.workflow} />
          </SectionCard>

          <SectionCard id="lich-su-xu-ly" title="Lịch sử xử lý" subtitle="Các mốc tiếp nhận, bổ sung, phân công, họp hội đồng và ban hành kết luận">
            <Timeline items={record.history} />
          </SectionCard>

          <SectionCard title="Hành động xử lý" subtitle="Các thao tác nghiệp vụ dự kiến cho hồ sơ y đức đang xem">
            <ActionPanel
              actions={[
                { label: "Cập nhật thẩm định", tone: "primary", icon: <ClipboardCheck size={16} aria-hidden="true" /> },
                { label: "Yêu cầu bổ sung minh chứng", icon: <MessageSquareMore size={16} aria-hidden="true" /> },
                { label: "Ghi nhận kết luận", icon: <ShieldCheck size={16} aria-hidden="true" /> },
                { label: "Chuyển hội đồng", icon: <Send size={16} aria-hidden="true" /> },
                { label: "Mở tài liệu", icon: <FileText size={16} aria-hidden="true" /> }
              ]}
              note="Các nút hiện dùng để minh họa thao tác nghiệp vụ trên giao diện, chưa phát sinh cập nhật dữ liệu thực."
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
