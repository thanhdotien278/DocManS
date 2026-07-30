import { ResetPasswordForm } from "@/components/auth/password-forms";

export default function PasswordResetPage() {
  return <main className="content auth-loading"><section className="page-section"><div className="page-heading"><p className="eyebrow">Khôi phục truy cập</p><h1>Đặt lại mật khẩu</h1><p>Chỉ sử dụng mã do quản trị viên cung cấp.</p></div><ResetPasswordForm /></section></main>;
}
