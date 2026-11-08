import { getApiBaseUrl } from "@/lib/session";

/** Thông báo trong ứng dụng (Story 11.1). Backend đã lọc theo quyền hiện hành; link chỉ để điều hướng. */
export type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationList = { notifications: UserNotification[]; unreadCount: number };

/** Phát sau khi đánh dấu đã đọc để chuông và trang thông báo cùng tải lại. */
export const NOTIFICATIONS_CHANGED_EVENT = "notifications-changed";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new Error("Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.");
  }
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (!response.ok) throw new Error((Array.isArray(body.message) ? body.message[0] : body.message) ?? "Không tải được thông báo.");
  return body as T;
}

export function loadNotifications(limit: number) {
  return requestJson<NotificationList>(`/notifications?limit=${limit}`);
}

export async function markNotificationRead(id: string) {
  await requestJson(`/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export async function markAllNotificationsRead() {
  await requestJson(`/notifications/read-all`, { method: "POST" });
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}
