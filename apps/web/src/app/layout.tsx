import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "Hệ thống quản lý NCKH, CN và đổi mới sáng tạo | Học viện Quân y",
  description: "Hệ thống quản lý nghiên cứu khoa học của Học viện Quân y",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  }
};

// Theme do QT chọn (tham số ui_theme). API lỗi hoặc giá trị lạ thì giữ theme hiện tại (không gắn data-theme).
async function readUiTheme() {
  try {
    const apiBaseUrl = process.env.API_INTERNAL_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";
    const response = await fetch(`${apiBaseUrl}/ui-theme`, { cache: "no-store", signal: AbortSignal.timeout(2000) });
    const theme = response.ok ? (await response.json()).theme : undefined;
    return theme === "workspace" || theme === "guided" || theme === "academy" ? theme : undefined;
  } catch {
    return undefined;
  }
}

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme={await readUiTheme()} suppressHydrationWarning>
      <body>
        <SessionProvider>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
