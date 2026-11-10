import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return <main className="content auth-loading"><section className="page-section"><div className="page-heading"><p className="eyebrow">Đăng ký tài khoản</p><h1>Đăng ký tài khoản nhà nghiên cứu</h1><p>Hệ thống gửi liên kết xác minh tới email; tài khoản được dùng sau khi cán bộ quản lý khoa học duyệt.</p></div><RegisterForm /></section></main>;
}
