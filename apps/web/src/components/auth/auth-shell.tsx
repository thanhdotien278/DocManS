import { PublicHeader } from "@/components/auth/public-header";

// Khung dùng chung cho các trang công khai (đăng ký, thiết lập mật khẩu): nhận diện Học viện, một cột, tối đa 520px.
export function AuthShell({ kicker, title, description, children, footer }: { kicker: string; title: string; description: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="public-page">
      <PublicHeader />
      <main className="auth-page" id="main-content">
        <section className="auth-card" aria-labelledby="auth-title">
          <p className="login-kicker auth-kicker">{kicker}</p>
          <h1 className="auth-title" id="auth-title">{title}</h1>
          <p className="auth-description">{description}</p>
          {children}
          {footer ? <footer className="auth-card-footer">{footer}</footer> : null}
        </section>
      </main>
    </div>
  );
}
