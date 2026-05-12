import { CheckCircle2, ClipboardCheck, FileText, MessageSquareMore, Send, UsersRound } from "lucide-react";
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
import type { ConferenceRecord } from "@/lib/conference-data";

export function ConferenceDetailView({ record }: { record: ConferenceRecord }) {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Bảng điều hành", href: "/dashboard" },
          { label: "Hội thảo khoa học", href: "/hoi-thao-khoa-hoc" },
          { label: record.code }
        ]}
      />

      <PageHeader
        eyebrow={record.code}
        title={record.title}
        description="Tổng hợp kế hoạch tổ chức, chương trình, báo cáo viên, đại biểu, bài tham luận, tài liệu, kết luận và lịch sử xử lý."
        actions={
          <>
            <StatusBadge status={record.status} />
            <span className="status-badge info">{record.level}</span>
            <button className="button primary" type="button">
              <ClipboardCheck size={16} aria-hidden="true" />
              Cập nhật chương trình
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
          { label: "Chương trình", href: "#chuong-trinh" },
          { label: "Báo cáo viên", href: "#bao-cao-vien" },
          { label: "Tài liệu", href: "#tai-lieu" },
          { label: "Lịch sử xử lý", href: "#lich-su-xu-ly" }
        ]}
      />

      <ModuleSummaryStrip
        items={[
          { label: "Cấp tổ chức", value: record.level, meta: record.eventType, tone: "info" },
          { label: "Thời gian", value: record.timeLabel, meta: record.venue },
          { label: "Đại biểu", value: `${record.delegateCount}`, meta: `${record.confirmedDelegates} xác nhận · ${record.pendingDelegates} chờ xác nhận`, tone: record.pendingDelegates > 30 ? "warning" : "default" },
          { label: "Cập nhật gần nhất", value: record.updatedAt, meta: record.secretaryOwner }
        ]}
      />

      <div className="grid two-column" id="tong-quan" style={{ marginTop: 16 }}>
        <div className="grid">
          <SectionCard title="Thông tin chung" subtitle="Mã hội thảo, loại hình, cấp tổ chức, đơn vị chủ trì và hình thức tổ chức">
            <DetailInfoGrid
              items={[
                { label: "Mã hội thảo", value: record.code },
                { label: "Tên hội thảo", value: record.title },
                { label: "Loại hình", value: record.eventType },
                { label: "Cấp tổ chức", value: record.level },
                { label: "Hình thức tổ chức", value: record.format },
                { label: "Trạng thái hiện tại", value: <StatusBadge status={record.status} /> },
                { label: "Đơn vị tổ chức", value: record.organizingUnit },
                { label: "Chủ trì", value: record.chair }
              ]}
            />
          </SectionCard>

          <SectionCard title="Kế hoạch tổ chức" subtitle="Mục tiêu, phạm vi, thời gian, địa điểm và đầu mối theo dõi kế hoạch">
            <DetailInfoGrid
              items={[
                { label: "Mục tiêu", value: record.objective },
                { label: "Phạm vi tham dự", value: record.scope },
                { label: "Thời gian", value: record.timeLabel },
                { label: "Địa điểm", value: record.venue },
                { label: "Đầu mối thư ký", value: record.secretaryOwner },
                { label: "Tóm tắt kế hoạch", value: record.planSummary }
              ]}
            />
          </SectionCard>

          <SectionCard id="chuong-trinh" title="Chương trình hội thảo" subtitle="Các mốc nội dung chính, người phụ trách và địa điểm thực hiện">
            <DetailInfoGrid
              items={record.program.map((item) => ({
                label: item.time,
                value: `${item.topic} · ${item.owner} · ${item.location}`
              }))}
            />
          </SectionCard>

          <SectionCard id="bao-cao-vien" title="Báo cáo viên" subtitle="Báo cáo viên chính, khách mời, chủ trì phiên và thư ký phiên">
            <DetailInfoGrid
              items={record.speakers.map((speaker) => ({
                label: speaker.name,
                value: `${speaker.role} · ${speaker.unit} · ${speaker.status}`
              }))}
            />
          </SectionCard>

          <SectionCard title="Danh sách đại biểu" subtitle="Theo dõi đại biểu đã xác nhận, chưa xác nhận và các đầu mối phối hợp">
            <DetailInfoGrid
              items={record.delegates.map((delegate) => ({
                label: delegate.role,
                value: `${delegate.name} · ${delegate.unit} · ${delegate.status}`
              }))}
            />
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard title="Bài tham luận/Báo cáo khoa học" subtitle="Danh mục báo cáo dự kiến trình bày và tình trạng tiếp nhận bản thảo">
            <DetailInfoGrid
              items={record.submissions.map((submission) => ({
                label: submission.title,
                value: `${submission.author} · ${submission.unit} · ${submission.status}`
              }))}
            />
          </SectionCard>

          <SectionCard id="tai-lieu" title="Tài liệu hội thảo" subtitle="Kế hoạch, công văn mời, chương trình, danh sách đại biểu, tài liệu báo cáo và hồ sơ sau hội thảo">
            <DocumentList items={record.documents} />
          </SectionCard>

          <SectionCard title="Biên bản và kết luận" subtitle="Tình trạng tổng hợp biên bản, kết luận và báo cáo sau hội thảo">
            <DetailInfoGrid
              items={[
                { label: "Kết luận hội thảo", value: record.conclusionSummary },
                { label: "Báo cáo sau hội thảo", value: record.postEventReport },
                { label: "Cập nhật gần nhất", value: record.updatedAt }
              ]}
            />
          </SectionCard>

          <SectionCard title="Nhiệm vụ liên quan" subtitle="Các đầu việc đang theo dõi để hoàn tất tổ chức, tài liệu hoặc báo cáo sau hội thảo">
            <Timeline items={record.relatedTasks} />
          </SectionCard>

          <SectionCard title="Lịch sử phê duyệt" subtitle="Các mốc đề xuất, thẩm định, phê duyệt, tổ chức và hoàn tất hồ sơ">
            <Timeline items={record.workflow} />
          </SectionCard>

          <SectionCard id="lich-su-xu-ly" title="Lịch sử xử lý" subtitle="Dấu vết cập nhật nghiệp vụ gần nhất của kế hoạch hội thảo">
            <Timeline items={record.history} />
          </SectionCard>

          <SectionCard title="Hành động xử lý" subtitle="Các thao tác nghiệp vụ dự kiến cho hội thảo đang xem">
            <ActionPanel
              actions={[
                { label: "Cập nhật chương trình", tone: "primary", icon: <ClipboardCheck size={16} aria-hidden="true" /> },
                { label: "Gửi nhắc đại biểu", icon: <UsersRound size={16} aria-hidden="true" /> },
                { label: "Yêu cầu bổ sung tài liệu", icon: <MessageSquareMore size={16} aria-hidden="true" /> },
                { label: "Ghi nhận kết luận", icon: <CheckCircle2 size={16} aria-hidden="true" /> },
                { label: "Chuyển phê duyệt", icon: <Send size={16} aria-hidden="true" /> },
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
