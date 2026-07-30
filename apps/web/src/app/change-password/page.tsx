import { ChangePasswordForm } from "@/components/auth/password-forms";

export default function ChangePasswordPage() {
  return <section className="page-section"><div className="page-heading"><p className="eyebrow">Tài khoản</p><h1>Đổi mật khẩu</h1><p>Đổi mật khẩu sẽ đăng xuất mọi phiên đang hoạt động.</p></div><ChangePasswordForm /></section>;
}
