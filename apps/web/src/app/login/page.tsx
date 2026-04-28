import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { accountProfiles } from "@/fixtures/shell-context";

export default function LoginPage() {
  const primaryProfile = accountProfiles[0];

  return (
    <div className="login-shell">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-brand-mark">
            <Image src="/logo.png" alt="Học viện Quân y" width={72} height={74} priority />
          </div>
          <div>
            <p className="login-kicker">Cổng thông tin nội bộ</p>
            <h1 className="login-title" id="login-title">
              Hệ thống quản lý NCKH, CN và đổi mới sáng tạo
            </h1>
            <p className="login-subtitle">Học viện Quân y</p>
          </div>
        </div>

        <div className="login-form">
          <div className="access-banner">
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <strong>Sẵn sàng kết nối xác thực nội bộ</strong>
              <span>Luồng đăng nhập chính thức sẽ được triển khai trong giai đoạn tiếp theo.</span>
            </div>
          </div>

          <Link className="button primary login-submit" href="/dashboard">
            Mở giao diện nền tảng
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <aside className="login-context">
        <section className="login-summary-card" aria-live="polite">
          <p className="login-summary-label">Ngữ cảnh hiển thị</p>
          <h2>{primaryProfile?.name}</h2>
          <dl className="summary-grid">
            <div>
              <dt>Vai trò</dt>
              <dd>{primaryProfile?.roleLabel}</dd>
            </div>
            <div>
              <dt>Đơn vị</dt>
              <dd>{primaryProfile?.unit}</dd>
            </div>
          </dl>
        </section>

        <section className="login-note-card">
          <h2>Phạm vi nền tảng</h2>
          <ul className="login-note-list">
            <li>Bố cục quản trị gồm sidebar, topbar, tìm kiếm nhanh và thông báo.</li>
            <li>Các trang điều hành giữ hướng thiết kế chính thống, rõ dữ liệu và phù hợp nghiệp vụ nội bộ.</li>
            <li>Ranh giới xác thực, phiên làm việc và quyền truy cập được chuẩn bị để thay thế bằng backend thật.</li>
          </ul>
        </section>

        <section className="login-note-card">
          <h2>Trạng thái tích hợp</h2>
          <div className="access-status-row">
            <Building2 size={18} aria-hidden="true" />
            <span>Chưa kết nối dịch vụ xác thực</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
