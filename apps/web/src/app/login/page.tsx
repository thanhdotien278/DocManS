import Image from "next/image";
import { Building2, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
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

        <LoginForm />
      </section>

      <aside className="login-context">
        <section className="login-summary-card" aria-live="polite">
          <p className="login-summary-label">Xác thực nội bộ</p>
          <h2>Truy cập hệ thống</h2>
          <dl className="summary-grid">
            <div>
              <dt>Phạm vi</dt>
              <dd>Người dùng nội bộ được cấp tài khoản</dd>
            </div>
            <div>
              <dt>Bảo vệ</dt>
              <dd>Phiên đăng nhập được kiểm tra trước khi vào khu vực nghiệp vụ</dd>
            </div>
          </dl>
        </section>

        <section className="login-note-card">
          <h2>Nguyên tắc truy cập</h2>
          <ul className="login-note-list">
            <li>Sử dụng tài khoản được cấp đúng vai trò và đơn vị công tác.</li>
            <li>Thông tin điều hướng và ngữ cảnh người dùng được nạp từ phiên đăng nhập hiện hành.</li>
            <li>Kết thúc phiên làm việc bằng chức năng đăng xuất trong menu người dùng.</li>
          </ul>
        </section>

        <section className="login-note-card">
          <h2>Trạng thái bảo vệ</h2>
          <div className="access-status-row">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Các trang nội bộ yêu cầu phiên đăng nhập hợp lệ</span>
          </div>
          <div className="access-status-row" style={{ marginTop: 10 }}>
            <Building2 size={18} aria-hidden="true" />
            <span>Thông tin vai trò và đơn vị hiển thị trong giao diện sau khi đăng nhập</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
