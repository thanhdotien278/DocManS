import { CheckCircle2, ClipboardCheck, FileText, MessageSquareMore, Send } from "lucide-react";
import { ActionPanel } from "@/components/ui/action-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DetailInfoGrid } from "@/components/ui/detail-info-grid";
import { DocumentList } from "@/components/ui/document-list";
import { ModuleSummaryStrip } from "@/components/ui/module-summary-strip";
import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge, StatusBadge } from "@/components/ui/status-badge";
import { ProcessTabs } from "@/components/ui/process-tabs";
import { SectionCard } from "@/components/ui/section-card";
import { Timeline } from "@/components/ui/timeline";
import type { TaskRecord } from "@/lib/task-data";

export function TaskDetailView({ task }: { task: TaskRecord }) {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Bảng điều hành", href: "/dashboard" },
          { label: "Quản lý nhiệm vụ", href: "/nhiem-vu" },
          { label: task.code }
        ]}
      />

      <PageHeader
        eyebrow={task.code}
        title={task.title}
        description="Tổng hợp thông tin nhiệm vụ, tiến độ xử lý, tài liệu liên quan và các hành động nghiệp vụ cần theo dõi."
        actions={
          <>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            <button className="button primary" type="button">
              <ClipboardCheck size={16} aria-hidden="true" />
              Cập nhật tiến độ
            </button>
            <button className="button" type="button">
              <CheckCircle2 size={16} aria-hidden="true" />
              Ghi nhận kết quả
            </button>
          </>
        }
      />

      <ProcessTabs
        items={[
          { label: "Tổng quan", href: "#tong-quan", active: true },
          { label: "Quy trình", href: "#quy-trinh" },
          { label: "Tài liệu", href: "#tai-lieu" },
          { label: "Lịch sử xử lý", href: "#lich-su-xu-ly" }
        ]}
      />

      <ModuleSummaryStrip
        items={[
          { label: "Nguồn phát sinh", value: task.source, meta: task.linkedRecord, tone: "info" },
          { label: "Đơn vị phụ trách", value: task.unit, meta: task.assigneeRole },
          { label: "Hạn xử lý", value: task.dueDate, meta: task.dueLabel, tone: task.isOverdue ? "danger" : task.isDueSoon ? "warning" : "default" },
          { label: "Cập nhật gần nhất", value: task.updatedAt, meta: task.assignee, tone: "default" }
        ]}
      />

      <div className="grid two-column" id="tong-quan" style={{ marginTop: 16 }}>
        <div className="grid">
          <SectionCard title="Thông tin nhiệm vụ" subtitle="Mã số, nguồn phát sinh, phạm vi xử lý và đơn vị chịu trách nhiệm">
            <DetailInfoGrid
              items={[
                { label: "Mã nhiệm vụ", value: task.code },
                { label: "Tên nhiệm vụ", value: task.title },
                { label: "Nguồn phát sinh", value: task.source },
                { label: "Bản ghi liên quan", value: task.linkedRecord },
                { label: "Người phụ trách", value: task.assignee },
                { label: "Vai trò phụ trách", value: task.assigneeRole },
                { label: "Đơn vị", value: task.unit },
                { label: "Thời điểm tạo", value: task.createdAt },
                { label: "Hạn xử lý", value: task.dueDate },
                { label: "Trạng thái hiện tại", value: <StatusBadge status={task.status} /> }
              ]}
            />
          </SectionCard>

          <SectionCard title="Nguồn phát sinh" subtitle="Bối cảnh nghiệp vụ và lý do hình thành nhiệm vụ">
            <DetailInfoGrid
              items={[
                { label: "Loại đầu việc", value: task.source },
                { label: "Mã bản ghi liên quan", value: task.linkedRecord },
                { label: "Ghi chú điều hành", value: task.leadershipNote ?? "Không có chỉ đạo bổ sung tại thời điểm hiện tại" }
              ]}
            />
          </SectionCard>

          <SectionCard title="Tiến độ thực hiện" subtitle="Tình trạng cập nhật, kết quả trung gian và mức độ sẵn sàng">
            <DetailInfoGrid
              items={[
                { label: "Tóm tắt tiến độ", value: task.progressSummary },
                { label: "Cập nhật gần nhất", value: task.updatedAt },
                { label: "Mức độ ưu tiên", value: <PriorityBadge priority={task.priority} /> }
              ]}
            />
          </SectionCard>

          <SectionCard title="Kết quả xử lý" subtitle="Kết quả đầu ra hiện tại và các đầu mục sẵn sàng trình duyệt">
            <DetailInfoGrid
              items={[
                { label: "Kết quả hiện có", value: task.resultSummary },
                { label: "Ghi chú điều hành", value: task.leadershipNote ?? "Chưa phát sinh yêu cầu điều hành bổ sung" }
              ]}
            />
          </SectionCard>

          <SectionCard id="tai-lieu" title="Tài liệu liên quan" subtitle="Tệp giao nhiệm vụ, báo cáo tiến độ và minh chứng kèm theo">
            <DocumentList items={task.documents} />
          </SectionCard>
        </div>

        <div className="grid">
          <SectionCard title="Người tham gia" subtitle="Các đầu mối phối hợp và trạng thái tham gia hiện hành">
            <DetailInfoGrid
              items={task.participants.map((participant) => ({
                label: participant.name,
                value: `${participant.role} · ${participant.unit} · ${participant.status}`
              }))}
            />
          </SectionCard>

          <SectionCard id="quy-trinh" title="Quy trình thực hiện" subtitle="Theo dõi đầy đủ các bước từ khởi tạo đến hoàn thành">
            <Timeline items={task.workflow} />
          </SectionCard>

          <SectionCard id="lich-su-xu-ly" title="Lịch sử cập nhật" subtitle="Các mốc làm việc, nhắc việc và ghi nhận xử lý gần nhất">
            <Timeline items={task.updates} />
          </SectionCard>

          <SectionCard title="Hành động xử lý" subtitle="Các thao tác nghiệp vụ dự kiến cho vai trò hiện hành">
            <ActionPanel
              actions={[
                { label: "Cập nhật tiến độ", tone: "primary", icon: <ClipboardCheck size={16} aria-hidden="true" /> },
                { label: "Yêu cầu phản hồi", icon: <MessageSquareMore size={16} aria-hidden="true" /> },
                { label: "Ghi nhận kết quả", icon: <CheckCircle2 size={16} aria-hidden="true" /> },
                { label: "Chuyển phê duyệt", icon: <Send size={16} aria-hidden="true" /> },
                { label: "Mở tài liệu", icon: <FileText size={16} aria-hidden="true" /> }
              ]}
              note="Các nút hiện dùng để minh họa luồng phối hợp và trạng thái xử lý, chưa phát sinh cập nhật dữ liệu thực."
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}
