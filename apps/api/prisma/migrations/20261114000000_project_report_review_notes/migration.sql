-- Story 6.5: ghi chú quản lý nội bộ (ẩn với PI/thành viên) và vấn đề còn tồn đọng khi chấp nhận báo cáo.
ALTER TABLE "project_report_revisions" ADD COLUMN "internal_note" TEXT;
ALTER TABLE "project_report_revisions" ADD COLUMN "unresolved_issues" TEXT;
