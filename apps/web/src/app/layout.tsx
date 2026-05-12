import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { AppShell } from "@/components/layout/app-shell";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const metadata: Metadata = {
  title: "Hệ thống quản lý NCKH, CN và đổi mới sáng tạo | Học viện Quân y",
  description: "Hệ thống quản lý nghiên cứu khoa học của Học viện Quân y",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAccountId = (await cookies()).get(SESSION_COOKIE_NAME)?.value ?? null;

  return (
    <html lang="vi">
      <body>
        <SessionProvider initialAccountId={initialAccountId}>
          <AppShell>{children}</AppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
