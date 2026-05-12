import { cookies } from "next/headers";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { getAccountById, getRouteDefinition } from "@/lib/accounts";
import { SESSION_COOKIE_NAME } from "@/lib/session";

function formatSegment(segment: string) {
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function CatchAllPage({
  params
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  const pathname = `/${segments.join("/")}`;
  const routeDefinition = getRouteDefinition(pathname);
  const account = getAccountById((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  const title = routeDefinition?.title ?? formatSegment(segments[segments.length - 1] ?? "Phân hệ");

  return (
    <>
      <Breadcrumb items={[{ label: "Bảng điều hành", href: "/dashboard" }, { label: title }]} />
      <PageHeader
        eyebrow={routeDefinition?.eyebrow ?? "Nghiệp vụ"}
        title={title}
        description={
          routeDefinition?.description ??
          "Thông tin trong phân hệ này được trình bày theo vai trò và phạm vi truy cập hiện hành."
        }
      />

      <div className="grid two-column">
        <SectionCard
          title={routeDefinition?.summaryTitle ?? "Tổng quan phân hệ"}
          subtitle={`Người dùng hiện hành: ${account?.name ?? "Tài khoản hệ thống"}`}
        >
          <p className="section-copy">
            {routeDefinition?.summaryBody ??
              "Nội dung, danh sách và hành động của phân hệ này được cấu hình thống nhất theo quy trình vận hành hiện hành của Học viện Quân y."}
          </p>
        </SectionCard>

        <SectionCard title="Trạng thái vận hành" subtitle="Thông tin điều hướng và hiển thị ngữ cảnh">
          <EmptyState
            title="Sẵn sàng tiếp tục mở rộng nghiệp vụ"
            message="Khung điều hướng, ngữ cảnh tài khoản và bố cục trang đã được kích hoạt theo vai trò đang đăng nhập."
          />
        </SectionCard>
      </div>
    </>
  );
}
