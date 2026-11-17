"use client";

import { useSession } from "@/components/auth/session-provider";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { ResearchProposalsPanel } from "@/components/research-proposals/research-proposals-panel";

export default function MyProposalsPage() {
  // NNB tham gia theo phân công hoặc lời mời: không giới thiệu việc tạo nháp.
  const external = useSession().account?.systemRole === "EXTERNAL_RESEARCHER_USER";
  const title = external ? "Hồ sơ tôi tham gia" : "Hồ sơ đề xuất của tôi";
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: title }]} />
      <PageHeader
        eyebrow="Hồ sơ cá nhân"
        title={title}
        description={external ? "Hồ sơ bạn được phân công hoặc được mời tham gia. Lời mời và phiếu đánh giá nằm ở mục Lời mời và phiếu đánh giá." : "Tạo hồ sơ nháp, lưu thông tin có cấu trúc và theo dõi trạng thái nộp chính thức."}
      />
      <ResearchProposalsPanel allowCreate={!external} />
    </>
  );
}
