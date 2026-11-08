---
title: 'Story 11.1 — Thông báo trong ứng dụng theo sự kiện nghiệp vụ'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_commit: 'b77d3519aa2491e5fea614e9990c10800dd7875a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-11-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Người dùng không biết khi có tờ trình chờ mình, hồ sơ bị trả lại/yêu cầu bổ sung, lời mời phản biện hay quyết định; repo chưa có bảng, API hay giao diện thông báo.

**Approach:** Ghi thông báo trong cùng transaction nghiệp vụ (idempotent theo `(user_id, idempotency_key)`), đọc lại có re-authorize theo quyền hiện hành, hiển thị bằng chuông trên topbar và trang `/notifications`. Tham khảo giao diện/schema của tuanp83/DocManS nhưng không chép logic người nhận (gửi cho mọi CV) và gửi email.

## Boundaries & Constraints

**Always:**
- Người nhận theo quan hệ/phân công cụ thể; tờ trình lấy theo nơi bước **đến** (`step.toStage`/`step.toStatus`): `BOARD_REVIEW` → TB đang hoạt động; `HEAD_REVIEW` → TP đang hoạt động; `LEADERSHIP` → GĐ, thêm PGĐ-KH chỉ khi signer `DIRECTOR_OR_SCIENCE_DEPUTY`; `RETURNED`/`APPROVED`/`REJECTED` → tác giả (`submittedById`).
- Luôn loại người thực hiện; riêng người nhận bước rà soát/ký loại thêm tác giả và người xung đột (`actorConflicted`). Bỏ qua tài khoản không `active`.
- Hồ sơ: nộp/nộp lại → CV phụ trách hiện hành (không có CV thì không gửi); TP giao CV → CV được giao; yêu cầu bổ sung, quyết định → PI; mời phản biện → reviewer.
- Danh sách và `unreadCount` chỉ gồm thông báo người đọc còn quyền: `approval` → `canViewApproval` và không `actorConflicted`; `proposal` → `canReadProposal` (resolve participation/reviewAccess/officer theo lô như `projectProposalList`); `review_assignment` → assignment của chính mình với status `assigned`/`completed` (như `listMyAssignments`).
- Nội dung cho PI/thành viên chỉ là trạng thái chung: không danh tính reviewer, điểm, nhận xét, không chép `note`/`publicSummary`/lý do (AD-11). Link chỉ điều hướng; trang đích tự re-authorize.
- Lỗi ghi thông báo làm rollback cùng thao tác nghiệp vụ (cùng transaction, không có thông báo "ma").
- Quyết định (2026-11-08): gắn `RoutingStatus` sẵn có vào trang chi tiết đề tài để TB/TP xử lý tờ trình đề tài ngay từ link thông báo.

**Never:**
- Không gửi cho PP (`RESEARCH_MANAGEMENT_DEPUTY_HEAD`), PGĐ-TD (`RESEARCH_OVERSIGHT_AUTHORITY`), hay "mọi CV".
- Không email, không job nhắc hạn, không "Của tôi" (11.2–11.6 đã đưa vào `deferred-work.md`).
- Không thông báo cho bước `CANCEL` (bỏ qua ngay trong `recordStep`, vì `cancelPendingApprovals` cũng gọi nó).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| CV lập tờ trình | `openApprovalSubmission` bởi CV | TB nhận 1 thông báo; PP, PGĐ-TD không nhận | N/A |
| TB chuyển, TP duyệt | `advanceApprovalSubmission` | TP rồi GĐ (+PGĐ-KH nếu signer cho phép) nhận | N/A |
| Trả lại / ký / từ chối | return hoặc `closeApprovalSubmission` | Tác giả nhận | N/A |
| Xử lý lặp | cùng event ghi hai lần | Chỉ một bản ghi | `skipDuplicates` |
| Mất quyền | CV bị thu hồi phụ trách hồ sơ; lời mời phản biện bị thu hồi | Thông báo tương ứng biến mất khỏi list và count | N/A |
| Mời phản biện | assignment `invitationStatus: invited` | Reviewer thấy thông báo dù chưa nhận lời | N/A |
| Đánh dấu đọc | `POST /notifications/:id/read` của người khác | 404 | `NotFoundException` |

</frozen-after-approval>

## Code Map

- `apps/api/src/proposals-shared/approval-routing.ts` -- `recordStep` là điểm duy nhất mọi SUBMIT/FORWARD/APPROVE/RETURN/REJECT đi qua với `tx`; `actorConflicted`, `canViewApproval`, `APPROVAL_KIND_LABELS`, `APPROVAL_SIGNERS`. Không đổi luồng.
- `apps/api/src/research-proposals/research-proposals.service.ts` -- `submitProposal`: CV chỉ được resolve trong nhánh gán CV đợt (~457-483); sau khối đó gọi `new ProposalManagementOfficerService(tx).resolveForProposal(proposalId, now)`. `resubmitProposal` (`this.managementOfficers` đã gắn tx qua `mutate`), `requestSupplement`, `assignManagementOfficer` (~693, create ~743): phát trong transaction sẵn có.
- `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts` (~dòng 273) -- tạo assignment trong tx → mời reviewer; filter đọc mẫu ở `listMyAssignments` (~425-433). Lưu ý `grantsReviewAccess` cần `accepted` nên reviewer được mời không qua `canReadProposal`.
- `apps/api/src/proposal-evaluations/proposal-decisions.service.ts` (~dòng 214) -- quyết định → PI.
- `apps/api/src/proposals-shared/proposal-access.ts` -- `canReadProposal` (cần `ownerId`, `status` của hồ sơ); `ProposalParticipationService`, `ProposalReviewAccessService`, `ProposalManagementOfficerService` có `resolveForProposals`, chỉ phụ thuộc `PrismaService` → khai báo trực tiếp làm provider trong `NotificationsModule` (import `AuthModule`, như `FilesModule`), tránh import vòng.
- `apps/api/src/notifications/mail.service.ts` -- giữ nguyên.
- `apps/web/src/components/layout/app-shell.tsx` -- `topbar-actions` để gắn chuông; mẫu API client: `apps/web/src/lib/approval-routing-api.ts` (`requestJson` + `getApiBaseUrl`).
- `tests/approval-routing-db.test.mjs` -- hàm `setup` tạo đủ 10 vai trò trên PostgreSQL thật; mở rộng tại đây.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/prisma/schema.prisma` + `apps/api/prisma/migrations/20261108000000_user_notifications/migration.sql` -- model `UserNotification` (`user_notifications`): id, userId (FK cascade), type, title, body, link?, sourceType (`approval`|`proposal`|`review_assignment`), sourceId, idempotencyKey, readAt?, createdAt; unique `(user_id, idempotency_key)`, index `(user_id, created_at)`; back-relation `notifications` trên `User`.
- [x] `apps/api/src/notifications/notification-events.ts` -- hàm thuần `notifyUsers(tx, event)` (không phải service, vì `approval-routing.ts` gọi): lọc user active, loại trừ, `createMany({ skipDuplicates: true })`.
- [x] `apps/api/src/proposals-shared/approval-routing.ts` -- phát từ `recordStep` (trừ CANCEL), key `approval:{submissionId}:{action}:{stage}`, link `/proposals/{id}` hoặc `/projects/{id}`; export `actorConflicted` cho lọc khi đọc.
- [x] Các service ở Code Map -- key theo bản ghi sự kiện: `proposal-submit:{submissionEventId}`, `supplement:{requestId}`, `officer:{officerAssignmentId}`, `review-invite:{assignmentId}` (link `/my-reviews`), `decision:{decisionId}`.
- [x] `apps/api/src/notifications/notifications.{service,controller,module}.ts` + `app.module.ts` -- `GET /api/v1/notifications?limit`, `POST /:id/read`, `POST /read-all`, `SessionAuthGuard`, lọc re-authorize.
- [x] `apps/web/src/lib/notifications-api.ts`, `apps/web/src/components/layout/notification-bell.tsx`, `apps/web/src/app/notifications/page.tsx`, `globals.css` -- chuông có badge chưa đọc, dropdown 10 mục, poll 60 giây; trang đầy đủ lọc tất cả/chưa đọc; bàn phím và `aria-label`.
- [x] `apps/web/src/components/projects/project-detail.tsx` -- gắn `<RoutingStatus subjectType="project" subjectId={project.id} />` (mẫu ở `proposal-detail-workspace.tsx:731`).
- [x] `tests/approval-routing-db.test.mjs` -- một test DB phủ ma trận I/O; assert theo từng user (TP/GĐ/CV tích lũy qua các test, không đếm tổng); trùng lặp kiểm bằng gọi `notifyUsers` hai lần (không replay `recordStep` được vì `transition` chặn).
- [x] `_bmad-output/implementation-artifacts/sprint-status.yaml` -- cập nhật `11-1-…` và `epic-11`.

**Acceptance Criteria:**
- Given thông báo đã tạo, when người nhận mở link, then trang đích vẫn tự kiểm tra quyền.
- Given reviewer được phân công, when PI xem thông báo của mình, then không thấy thông báo hay nội dung nào lộ reviewer.
- Given chưa đăng nhập, when gọi API thông báo, then 401.

## Design Notes

Ghi trong transaction thay vì dispatch sau commit như bản tham khảo: nguyên tử, idempotent nhờ unique key, đúng AD-13. "Stable source ID/version, target action" của AC: `sourceType`+`sourceId` là nguồn, `idempotencyKey` mang phiên bản (id bản ghi sự kiện), `type` là hành động đích. Lọc re-authorize khi đọc: lấy tối đa 200 bản ghi mới nhất rồi lọc (`shortcut:` comment nếu cần phân trang).

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && node --test tests/approval-routing-db.test.mjs` -- expected: pass.

**Manual checks:**
- Trình duyệt: chuông hiện badge sau khi lập tờ trình; bấm mục → đánh dấu đã đọc và điều hướng.

## Implementation Notes

- Bảng `user_notifications` (migration `20261108000000_user_notifications`); ghi qua hàm thuần `notifyUsers` trong transaction nguồn.
- `recordStep` đánh dấu đã đọc thông báo `approval.action-required` cũ của tờ trình trước khi phát bước mới (review vòng 1).
- Đường đổi CV cả đợt (`transferProposalOfficers` trong `proposal-intake-periods.service.ts`) chưa phát thông báo; ngoài Code Map.
- Kiểm tra thủ công trên trình duyệt chưa chạy: cần `npm run prisma:deploy` trên DB dev.

## Spec Change Log

## Review Triage Log

Vòng 1 (2026-11-08). B = blind-hunter, E = edge-case-hunter, V = verification-gap.

| # | Phát hiện | Verdict | Bằng chứng | Route |
|---|-----------|---------|------------|-------|
| B1/E1 | Thông báo "Tờ trình chờ xử lý" vẫn chưa đọc sau khi người khác đã xử lý/tờ trình đóng | medium | TP2 nhận ở `HEAD_REVIEW`; khi TP1 chuyển, không có gì cập nhật bản ghi TP2 (`approval-routing.ts` `notifyApprovalStep`) | patch |
| B2 | Đọc approval gọi `actorConflicted` tuần tự cho mỗi submission | low | `notifications.service.ts` vòng `for` trên submissions; nhiều submission cùng subject lặp truy vấn | patch (memo theo subject) |
| B3 | Chuông poll cả khi tab ẩn | low | `notification-bell.tsx` `setInterval` không xét `document.hidden` | patch |
| B4/V1 | Thông báo yêu cầu bổ sung / nộp lại không có test DB | medium | Chỉ `proposals-ep02` (fake prisma, `user.findMany` trả `[]`) chạm hai đường này | patch |
| V2 | Lọc approval khi đọc (xung đột) chưa có test âm | medium | Mọi assert approval dùng `count` thô, bỏ qua `authorized` | patch |
| V3 | Tờ trình đề tài (link `/projects/…`, xung đột thành viên đề tài) chưa test | medium | Không assert nào trên subject `project` | patch |
| V4 | AC "chưa đăng nhập → 401" không có kiểm tra chạy được | low | Không test nào chạm `NotificationsController`; kiểm metadata `__guards__` là 2 dòng | patch |
| B5 | Sự kiện đề tài ngoài tờ trình (bổ sung báo cáo, quyết định yêu cầu → PI đề tài) chưa có thông báo | medium | `approved-projects.service.ts` không gọi `notifyUsers`; intent chỉ liệt kê sự kiện hồ sơ đề xuất + tờ trình | defer |
| B6 | Tài liệu chưa cập nhật: `docs/diagrams/notifications.md` ghi "đánh dấu đã đọc không có"; kiến trúc ghi Redis queue cho notification | low | `docs/diagrams/notifications.md:25-26`, `_bmad-output/architecture.md:179,210` | patch (doc + D-040) |
| B7 | Khóa approval `{action}:{stage}` có thể trùng | false | Stage chỉ tiến, lập lại tạo submission id mới; `transition` chặn lặp | reject |
| B8/E3 | `markAllRead` đánh dấu cả dòng bị lọc/ngoài 200 | low | Có thật nhưng hiếm gặp; sửa cần thêm tham số | reject |
| B9 | `type`/`source_type` không enum/CHECK; không retention | low | `sourceType` có kiểu TS `NotificationSourceType`; giới hạn 200 đã có comment `shortcut:` | reject |
| E2 | `unreadCount` thiếu khi >200 thông báo | low | Đúng giới hạn `shortcut:` đã ghi | reject |
| B10 | Dropdown chuông không đóng khi bấm ra ngoài | low | `<details>` chỉ đóng khi Escape/chọn mục; gặp hằng ngày | patch |
| B11 | Mục là `<button>` không phải link; mở tab mới không được | low | Mọi sự kiện hiện có đều có link; đổi cấu trúc không phải sửa trực tiếp | reject |
| B12 | Người nhận tờ trình theo cả vai trò | false | Spec Always quy định TB/TP/BGĐ theo bước; TB duy nhất, TP/GĐ là người xử lý bước đó | reject |
| B13 | `epic-11-context.md` thiếu dòng trống trước `## Cross-Story Dependencies` | low | Dòng bị xóa ở step-01 để lại heading dính danh sách | patch |
| E4 | `RoutingStatus` trên trang đề tài không tải lại khi yêu cầu đổi trạng thái | medium | `refreshKey={project.status}`; lập tờ trình đổi `request.status` không đổi `project.status` | patch |
| E5 | Bấm thông báo chờ `markNotificationRead` xong mới điều hướng | low | `await` trong `useOpenNotification`; sửa trực tiếp | patch |
| E6 | Nộp lại resolve CV bằng giờ app thay vì giờ DB | low | `resolveForProposal(proposalId, submittedAt)`; nhánh nộp dùng `readTransactionClockV1(tx)` | patch |
