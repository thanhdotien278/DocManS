import type { Prisma } from "@prisma/client";

export type NotificationSourceType = "approval" | "proposal" | "review_assignment" | "ethics_dossier" | "acceptance_dossier" | "acceptance_council" | "registration_request" | "project_funding" | "project_liquidation";

export type NotificationEvent = {
  userIds: Array<string | null | undefined>;
  /** Người thực hiện và người không được nhận (tác giả, người xung đột...). */
  exclude?: Array<string | null | undefined>;
  type: string;
  title: string;
  body: string;
  link?: string;
  sourceType: NotificationSourceType;
  sourceId: string;
  idempotencyKey: string;
};

/**
 * Ghi thông báo trong transaction nghiệp vụ của caller (Story 11.1): lỗi ở đây rollback cả thao tác.
 * Chỉ tài khoản đang hoạt động; trùng `(userId, idempotencyKey)` bị bỏ qua.
 */
export async function notifyUsers(tx: Prisma.TransactionClient, event: NotificationEvent) {
  const excluded = new Set(event.exclude?.filter(Boolean));
  const ids = [...new Set(event.userIds.filter((id): id is string => Boolean(id) && !excluded.has(id!)))];
  if (!ids.length) return 0;
  const active = await tx.user.findMany({ where: { id: { in: ids }, status: "active" }, select: { id: true } });
  if (!active.length) return 0;
  const { userIds: _userIds, exclude: _exclude, ...data } = event;
  const result = await tx.userNotification.createMany({ data: active.map((user) => ({ ...data, userId: user.id, link: data.link ?? null })), skipDuplicates: true });
  return result.count;
}
