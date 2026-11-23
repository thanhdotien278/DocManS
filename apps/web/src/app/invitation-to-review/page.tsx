import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { AcceptanceCouncilSeats } from "@/components/projects/acceptance-council-seats";
import { ReviewerQueuePanel } from "@/components/research-proposals/reviewer-queue-panel";

export default function InvitationToReviewPage() {
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Được mời phản biện" }
        ]}
      />
      <PageHeader
        eyebrow="Phản biện chuyên gia"
        title="Được mời phản biện"
        description="Danh sách các hồ sơ đề xuất và hội đồng nghiệm thu đề tài bạn được mời tham gia phản biện, đánh giá."
      />
      <AcceptanceCouncilSeats />
      <ReviewerQueuePanel />
    </>
  );
}
