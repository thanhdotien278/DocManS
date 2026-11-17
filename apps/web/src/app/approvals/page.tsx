"use client";

import { useSession } from "@/components/auth/session-provider";
import { ApprovalQueuePanel } from "@/components/research-proposals/approval-queue-panel";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";

// Lối vào theo thẩm quyền: cùng một hàng đợi do backend lọc, tên gọi theo việc của từng vai trò.
const TITLES: Record<string, string> = { LEADERSHIP_APPROVAL_AUTHORITY: "Chờ tôi quyết định", SCIENCE_DEPUTY_DIRECTOR: "Văn bản chờ tôi ký" };

export default function ApprovalsPage() {
  const { account } = useSession();
  const title = TITLES[account?.systemRole ?? ""] ?? "Tờ trình chờ tôi xử lý";
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: title }]} />
      <PageHeader eyebrow="Phê duyệt" title={title} description="Tờ trình và hồ sơ đang ở bước thuộc thẩm quyền của bạn." />
      <ApprovalQueuePanel />
    </>
  );
}
