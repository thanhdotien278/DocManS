"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadNotifications, markAllNotificationsRead, markNotificationRead, NOTIFICATIONS_CHANGED_EVENT, type NotificationList, type UserNotification } from "@/lib/notifications-api";

const POLL_MS = 60_000;

/** Một dòng thông báo; bấm thì đánh dấu đã đọc rồi điều hướng. Trạng thái chưa đọc có chữ, không chỉ dựa vào màu. */
export function NotificationItem({ item, onOpen }: { item: UserNotification; onOpen: (item: UserNotification) => void }) {
  return (
    <button type="button" className={`notification-item${item.readAt ? "" : " unread"}`} onClick={() => onOpen(item)}>
      <span className="record-title">{item.title}</span>
      <span className="record-meta">{item.body}</span>
      <span className="record-meta">
        {new Date(item.createdAt).toLocaleString("vi-VN")}
        {item.readAt ? "" : " · Chưa đọc"}
      </span>
    </button>
  );
}

/** Mở thông báo: lỗi đánh dấu đã đọc không chặn điều hướng; trang đích tự kiểm tra quyền. */
export function useOpenNotification() {
  const router = useRouter();
  return useCallback((item: UserNotification) => {
    if (!item.readAt) void markNotificationRead(item.id).catch(() => undefined);
    if (item.link) router.push(item.link);
  }, [router]);
}

export function NotificationBell() {
  const [data, setData] = useState<NotificationList | null>(null);
  const [failed, setFailed] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const openItem = useOpenNotification();

  const reload = useCallback(async () => {
    try {
      setData(await loadNotifications(10));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => { if (!document.hidden) void reload(); }, POLL_MS);
    const closeOutside = (event: MouseEvent) => { if (menu.current?.open && !menu.current.contains(event.target as Node)) menu.current.removeAttribute("open"); };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
    document.addEventListener("mousedown", closeOutside);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
      document.removeEventListener("mousedown", closeOutside);
    };
  }, [reload]);

  function close() {
    menu.current?.removeAttribute("open");
  }

  const count = data?.unreadCount ?? 0;
  return (
    <details
      className="notification-menu"
      ref={menu}
      onToggle={(event) => { if (event.currentTarget.open) void reload(); }}
      onKeyDown={(event) => { if (event.key === "Escape" && menu.current?.open) { close(); menu.current.querySelector("summary")?.focus(); } }}
    >
      <summary className="icon-button notification-trigger" aria-label={count ? `Thông báo: ${count} chưa đọc` : "Thông báo: không có thông báo chưa đọc"}>
        <Bell size={18} aria-hidden="true" />
        {count ? <span className="notification-badge" aria-hidden="true">{count > 99 ? "99+" : count}</span> : null}
      </summary>
      <div className="notification-panel">
        <div className="notification-panel-header">
          <strong>Thông báo</strong>
          {count ? <button type="button" className="button secondary" onClick={() => void markAllNotificationsRead().catch(() => setFailed(true))}>Đánh dấu tất cả đã đọc</button> : null}
        </div>
        {failed ? <p role="alert" className="field-error">Không tải được thông báo.</p> : null}
        {!data ? (failed ? null : <p className="record-meta">Đang tải...</p>) : data.notifications.length ? (
          <ul className="notification-list">
            {data.notifications.map((item) => <li key={item.id}><NotificationItem item={item} onOpen={(target) => { close(); openItem(target); }} /></li>)}
          </ul>
        ) : <p className="record-meta">Chưa có thông báo.</p>}
        <Link className="notification-all" href="/notifications" onClick={close}>Xem tất cả thông báo</Link>
      </div>
    </details>
  );
}
