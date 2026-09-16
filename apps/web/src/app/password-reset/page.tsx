import { ResetPasswordForm } from "@/components/auth/password-forms";

export default function PasswordResetPage() {
  return <main className="content auth-loading"><section className="page-section"><div className="page-heading"><p className="eyebrow">Khôi phục truy cập</p><h1>Thiết lập mật khẩu</h1><p>Dùng liên kết kích hoạt hoặc mã đặt lại hợp lệ.</p></div><ResetPasswordForm /></section></main>;
}
