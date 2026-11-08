"use client";

import { useCallback, useEffect, useState } from "react";
import { NotificationItem, useOpenNotification } from "@/components/layout/notification-bell";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { loadNotifications, markAllNotificationsRead, NOTIFICATIONS_CHANGED_EVENT, type NotificationList } from "@/lib/notifications-api";

export default function NotificationsPage() {
  const [data, setData] = useState<NotificationList | null>(null);
  const [error, setError] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const openItem = useOpenNotification();

  const reload = useCallback(async () => {
    try {
      setData(await loadNotifications(200));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được thông báo.");
    }
  }, []);

  useEffect(() => {
    void reload();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
  }, [reload]);

  const items = data?.notifications.filter((item) => !unreadOnly || !item.readAt) ?? [];
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Thông báo" }]} />
      <PageHeader
        eyebrow="Thông báo"
        title="Thông báo"
        description="Thông báo về tờ trình, hồ sơ và lời mời đánh giá liên quan đến bạn. Mở thông báo để đến trang xử lý."
        actions={data?.unreadCount ? <button type="button" className="button" onClick={() => void markAllNotificationsRead().catch(() => setError("Không đánh dấu được thông báo."))}>Đánh dấu tất cả đã đọc</button> : null}
      />
      <SectionCard title="Danh sách thông báo" subtitle={data ? `${data.unreadCount} chưa đọc` : undefined}>
        <div className="button-row notification-filter" role="group" aria-label="Lọc thông báo">
          <button type="button" className={`button${unreadOnly ? "" : " primary"}`} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>Tất cả</button>
          <button type="button" className={`button${unreadOnly ? " primary" : ""}`} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Chưa đọc</button>
        </div>
        {error ? <p role="alert" className="field-error">{error}</p> : null}
        {!data ? (error ? null : <p role="status">Đang tải thông báo...</p>) : items.length ? (
          <ul className="notification-list">
            {items.map((item) => <li key={item.id}><NotificationItem item={item} onOpen={openItem} /></li>)}
          </ul>
        ) : <EmptyState title={unreadOnly ? "Không có thông báo chưa đọc" : "Chưa có thông báo"} message="Thông báo mới sẽ xuất hiện khi có việc liên quan đến bạn." />}
      </SectionCard>
    </>
  );
}
