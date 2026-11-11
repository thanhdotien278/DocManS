# Prompt cho Codex: kiểm thử Story 6.9 — Hội đồng nghiệm thu

> Dán toàn bộ phần dưới đây cho Codex. Codex chỉ **kiểm thử và báo cáo**, không sửa code.

---

## Vai trò và mục tiêu

Bạn là QA kiểm thử Story 6.9 của RTMS (hệ thống quản lý nghiên cứu khoa học, Học viện Quân y). Repo ở `/Users/Super/DocManS`, nhánh `feat/6-9-quyet-dinh-nghiem-thu`. Hãy kiểm thử **vai trò/phân quyền**, **logic nghiệp vụ** và **UI/UX** của hội đồng nghiệm thu đề tài, rồi viết báo cáo phát hiện.

Quy tắc:
- KHÔNG sửa code, KHÔNG commit, KHÔNG push. Chỉ đọc code, chạy app, gọi API, chạy test.
- KHÔNG dùng DB dev chung `docmansystem`. Tạo DB riêng `docmans_codex69` và xóa khi xong.
- Mọi tài khoản là tài khoản seed cục bộ, mật khẩu `1234` (xem `docs/development/auth-seed-users.md`).
- Đọc trước: `CLAUDE.md`, `CONTEXT.md`, `docs/permission-matrix.md` (dòng Acceptance/final review và mục mời thành viên hội đồng), `docs/ux-design-guidelines.md`, `_bmad-output/implementation-artifacts/spec-6-9-hoi-dong-va-ket-qua-nghiem-thu.md`, `_bmad-output/implementation-artifacts/spec-6-9-p2-giao-dien-hoi-dong-nghiem-thu.md`.

## Luồng nghiệp vụ cần hiểu

Đề tài `pending_acceptance` (PI đã nộp hồ sơ nghiệm thu) → người được cấu hình lập hội đồng (cấu hình `council_formation.ACCEPTANCE`, mặc định TP/TB; CV phụ trách chỉ khi QT tick) mời thành viên: đúng **1 Chủ tịch, 1 Thư ký, `memberCount − 2` Ủy viên** → người được mời nhận lời/từ chối (từ chối bắt buộc lý do) → khi đủ cơ cấu và mọi người nhận lời, TP/TB/CV phụ trách lập tờ trình `ACCEPTANCE_COUNCIL` → TB chuyển → TP chuyển → GĐ hoặc PGĐ-KH ký (hoặc từ chối) → hội đồng thành lập, thành viên đã nhận lời đọc được hồ sơ nghiệm thu → **chỉ Chủ tịch** tải biên bản (`ACCEPTANCE_MINUTES`), nhập nhận xét, ghi Đạt (`accepted`) hoặc Không đạt (`failed`) → đề tài mở được thanh lý.

Trả lại/từ chối tờ trình: danh sách thành viên giữ nguyên, người lập thu hồi/mời thêm rồi trình lại.

Code chính:
- API: `apps/api/src/approved-projects/acceptance-council.service.ts`, `project-capability-v1.ts` (`acceptanceCouncilDenial`), `approved-projects.controller.ts` (route `:id/acceptance-council/...`, `acceptance-council/my-seats`), `proposals-shared/approval-routing.ts` (`actorConflicted`), `modules/files/files.service.ts` (biên bản).
- Web: `apps/web/src/components/projects/acceptance-council-panel.tsx`, `acceptance-council-seats.tsx`, `app/projects/[id]/acceptance-council/page.tsx`, `app/my-reviews/page.tsx`, `components/projects/project-detail.tsx`.
- Test sẵn có: `tests/acceptance-council-db.test.mjs`.

## Chuẩn bị môi trường

```bash
cd /Users/Super/DocManS
git checkout feat/6-9-quyet-dinh-nghiem-thu
docker compose up -d postgres minio
docker exec docmans-postgres-1 psql -U docmansystem -d postgres -c "CREATE DATABASE docmans_codex69"
export DB69="postgresql://docmansystem:docmansystem@localhost:5432/docmans_codex69?schema=public"
DATABASE_URL="$DB69" npm run prisma:deploy
DATABASE_URL="$DB69" npm run prisma:seed
npm run build:api
```

Tạo dữ liệu: lưu đoạn sau thành `/tmp/codex69-fixture.mjs` rồi chạy `DATABASE_URL="$DB69" node /tmp/codex69-fixture.mjs`. Script tạo **2 đề tài** `pending_acceptance` có hồ sơ đã nộp (PI `patuan`, thành viên `int1`, CV phụ trách `hdtien1`) và đặt cấu hình hội đồng 3 người, cho phép TP/TB/CV.

```js
import { PrismaService } from "/Users/Super/DocManS/dist/apps/api/infrastructure/prisma/prisma.service.js";
const db = new PrismaService();
const u = (username) => db.user.findUniqueOrThrow({ where: { username } });
const [pi, member, staff, head] = await Promise.all(["patuan", "int1", "hdtien1", "nmphuong"].map(u));
await db.systemParameter.upsert({ where: { key: "council_formation.ACCEPTANCE" }, create: { key: "council_formation.ACCEPTANCE", value: JSON.stringify({ allowedRoles: ["RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD", "RESEARCH_MANAGEMENT_STAFF"], memberCount: 3 }), label: "Hội đồng nghiệm thu" }, update: {} });
const intake = await db.proposalIntakePeriod.create({ data: { code: "DOT-CODEX-69", title: "Đợt kiểm thử", startsAt: new Date("2026-01-01"), endsAt: new Date("2027-01-01"), requiredPackage: [] } });
for (const title of ["Đề tài A — nghiệm thu đạt", "Đề tài B — nghiệm thu không đạt / trả lại"]) {
  const proposal = await db.researchProposal.create({ data: { intakePeriodId: intake.id, ownerId: pi.id, hostOrganizationUnitId: "org-k30", title, status: "approved", submittedAt: new Date() } });
  const event = await db.proposalSubmissionEvent.create({ data: { proposalId: proposal.id, actorId: pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: {} } });
  const decision = await db.proposalDecision.create({ data: { proposalId: proposal.id, decision: "approved", decidedById: head.id, fromStatus: "under_review", toStatus: "approved" } });
  const project = await db.approvedProject.create({ data: { proposalId: proposal.id, sourceSubmissionEventId: event.id, sourceDecisionId: decision.id, hostOrganizationUnitId: "org-k30", title, scopeSnapshot: { title }, status: "pending_acceptance", startDate: new Date("2025-01-01"), endDate: new Date("2026-12-31"), createdById: staff.id } });
  const since = new Date(Date.now() - 86400000);
  for (const [user, role] of [[pi, "TOPIC_PI"], [member, "TOPIC_MEMBER"]]) await db.approvedProjectMember.create({ data: { projectId: project.id, userId: user.id, name: user.displayName, role, participationRole: role, status: "ACTIVE", effectiveFrom: since, createdById: staff.id } });
  await db.projectManagementOfficer.create({ data: { projectId: project.id, officerUserId: staff.id, assignedById: head.id, status: "ACTIVE", effectiveFrom: since, assignmentContextVersion: {} } });
  await db.acceptanceDossier.create({ data: { projectId: project.id, status: "submitted", sections: { results: "Đạt mục tiêu", products: [{ name: "Phần mềm", type: "software", description: "" }], summary: "Tóm tắt", milestoneNotes: {} }, sourceContext: {}, createdById: pi.id, submittedById: pi.id, submittedAt: new Date() } });
  console.log(title, project.id);
}
await db.$disconnect();
```

Chạy app (2 terminal, cổng riêng để không đụng app đang chạy):

```bash
API_PORT=4005 WEB_ORIGIN=http://localhost:3005 DATABASE_URL="$DB69" node dist/apps/api/main.js
NEXT_PUBLIC_API_BASE_URL=http://localhost:4005/api/v1 API_INTERNAL_BASE_URL=http://localhost:4005/api/v1 npx next dev apps/web -p 3005
```

Đăng nhập: UI `http://localhost:3005/login`, hoặc API `POST http://localhost:4005/api/v1/auth/login` body `{"username":"...","password":"1234"}` (cookie `rtms_session`). Mọi thao tác ghi cần `contextVersion` lấy từ `GET /projects/:id/acceptance-council`.

## Tài khoản theo vai trò

| Tài khoản | Vai trò | Vai trò trong kịch bản |
|---|---|---|
| `hdtien1` | CV (`RESEARCH_MANAGEMENT_STAFF`) | CV phụ trách hai đề tài |
| `hdtien2` | CV | CV **không** phụ trách |
| `nmtrung` | TB | Rà soát bước 1, có thể lập hội đồng |
| `nmphuong` | TP | Rà soát bước 2, có thể lập hội đồng |
| `tvtien` | GĐ | Ký |
| `vndinh` | PGĐ-KH | Ký; dùng thử làm thành viên hội đồng để kiểm xung đột |
| `dnbinh` | PP | Chỉ đọc theo phạm vi |
| `ndbac` | PGĐ-TD | Chỉ đọc |
| `patuan` | PI đề tài | Không được mời, không ghi kết quả |
| `int1` | Thành viên đề tài | Không được mời |
| `int2`, `int3`, `ex1`–`ex3` | Nhà nghiên cứu (đơn vị khác/ngoài) | Ứng viên hội đồng; không đọc được đề tài |
| `admin` | QT | Không được mời, không lập hội đồng |

## A. Vai trò và phân quyền

Với mỗi ca, kiểm cả **API** (mã HTTP + `code` lỗi) lẫn **UI** (nút ẩn, hoặc hiện khóa kèm lý do tiếng Việt; không có đường vượt).

1. Lập hội đồng (mời/thu hồi): TP, TB, CV phụ trách (khi được tick) được; CV không phụ trách, PI, thành viên đề tài, PP, PGĐ-TD, GĐ, QT bị `403`. Đổi cấu hình về mặc định (chỉ TP/TB) thì CV phụ trách bị `COUNCIL_FORMATION_DENIED`.
2. Ứng viên (`GET .../candidates`): không có QT, thành viên đề tài, người chưa có lý lịch khoa học, người đã có ghế, **và chính người đang mời**. Mời các đối tượng này qua API → `400 COUNCIL_MEMBER_INELIGIBLE`.
3. Người được mời ở đơn vị khác (`int2`): mở được `/projects/:id/acceptance-council` và `/my-reviews`, nhưng `GET /projects/:id` bị 403; chỉ thấy ghế của mình, không thấy danh sách đầy đủ/tờ trình.
4. Nhận lời/từ chối: chỉ chính người được mời; người khác gọi `respond` với `memberId` của họ → `404`. Từ chối không lý do → `400 DECLINE_REASON_REQUIRED`.
5. Lập tờ trình: TP/TB/CV phụ trách; PI → `403`; người đang có ghế hội đồng → `403 APPROVAL_CONFLICT`.
6. Chuyển bước tờ trình: chỉ TB ở bước 1, TP ở bước 2; TB/TP đang có ghế hội đồng → `403 APPROVAL_CONFLICT`.
7. Ký: chỉ GĐ/PGĐ-KH ở bước Ban giám đốc. TP/CV ký → `403 APPROVAL_SIGNER_DENIED`. PGĐ-KH đang là thành viên hội đồng → `403 APPROVAL_CONFLICT` và không có `acceptance-council.sign` trong `allowedActions`.
8. Ghi kết quả: chỉ Chủ tịch đã nhận lời của hội đồng đã thành lập. Thư ký, Ủy viên, CV, TP, TB, GĐ, PI → `403 ACTION_NOT_GRANTED`. Chủ tịch vừa trở thành thành viên đề tài → bị chặn (không áp ngoại lệ "Phụ trách").
9. Hồ sơ nghiệm thu: sau khi thành lập, thành viên đã nhận lời đọc được (chỉ đọc, không sửa mục/tệp); người bị thu hồi/đã từ chối/chưa nhận lời → `403`.
10. Biên bản: chỉ Chủ tịch tải/xóa, khi hội đồng đã thành lập và chưa có kết quả; PI/Ủy viên xóa → `403`; sau khi có kết quả thì không xóa được (`WORKFLOW_STATE_DENIED`).

## B. Logic nghiệp vụ và trạng thái

1. Mời khi đề tài không ở `pending_acceptance` (ví dụ sửa DB về `executing`) → `400 WORKFLOW_STATE_DENIED`.
2. Mời vượt cơ cấu (2 Chủ tịch) → `400 COUNCIL_POSITION_FULL`. `councilRole`/`outcome` lạ qua API → `400`.
3. Trình khi còn người chưa nhận lời hoặc đã từ chối → `400 COUNCIL_NOT_READY` kèm `blockers` tiếng Việt.
4. Khi tờ trình đang chờ: mời/thu hồi bị khóa; UI báo "Danh sách bị khóa khi trình ký".
5. TB trả lại → danh sách giữ nguyên, mời/thu hồi mở lại, trình lại được. GĐ từ chối (bắt buộc lý do) → tương tự; đề tài vẫn `pending_acceptance`.
6. Ký khi một thành viên đã nhận lời vừa thành thành viên đề tài hoặc bị khóa tài khoản → `400 COUNCIL_MEMBER_INELIGIBLE`.
7. Ghi kết quả thiếu nhận xét hoặc chưa có biên bản → `400 READINESS_INCOMPLETE` kèm `missing`. Ghi khi hội đồng chưa ký → `WORKFLOW_STATE_DENIED`. Ghi lần hai → `WORKFLOW_STATE_DENIED`.
8. Đạt → `accepted`, Không đạt → `failed`; cả hai mở được thanh lý (`liquidation.eligible = true`); lập biên bản thanh lý và GĐ ký → `closed`.
9. `contextVersion` cũ (mở hai tab, thao tác ở tab 1 rồi tab 2) → `409`; UI hiện nút "Tải lại", không mất dữ liệu đang nhập.
10. Lịch sử đề tài có `acceptance-council.invite|accept|decline|revoke|submit|establish|reject` và `project.acceptance.result` với nhãn tiếng Việt; audit log có bản ghi tương ứng.
11. Thông báo: người được mời, người mời (khi nhận lời/từ chối), người trình + CV (khi GĐ từ chối), thành viên (khi thành lập), PI + CV + thành viên (khi có kết quả), TB/TP/GĐ (theo bước tờ trình). Mọi link trỏ `/projects/:id/acceptance-council`. Người bị thu hồi hoặc đã từ chối không còn thấy thông báo hội đồng.
12. `/my-reviews`: liệt kê ghế `invited`/`accepted` của đề tài còn `pending_acceptance`; mất khi đã có kết quả, bị thu hồi hoặc đã từ chối.
13. Hai thao tác đồng thời (hai người nhận lời cùng lúc, hai lần bấm ký nhanh) không tạo trạng thái lệch.

## C. UI/UX

Kiểm ở desktop (≥1280px) và mobile (375px), theo `docs/ux-design-guidelines.md` (xanh định chế, dày dữ liệu; không gradient, hero, emoji).

1. Trang hội đồng: tiêu đề đề tài, phụ đề trạng thái (Đang lập / Đang trình · bước / Đã thành lập ngày … / Đã ghi kết quả ngày …), huy hiệu trạng thái, tiến độ theo vị trí (vd. "Chủ tịch 1/1").
2. Bảng thành viên ở desktop, thẻ (`mobile-list`) ở mobile; không tràn ngang; cột Lý do hiện lý do từ chối/thu hồi.
3. Form mời: chọn vị trí còn trống → ô tìm (debounce) → chọn người → "Gửi lời mời". Đổi từ khóa thì lựa chọn cũ không còn hợp lệ phải bị bỏ chọn. Thu hồi xong danh sách ứng viên cập nhật. ≥50 kết quả có gợi ý lọc thêm.
4. Nút khóa luôn có lý do; nút không thuộc quyền thì ẩn hẳn (không hiện "Ký thành lập" cho người không ký).
5. Hộp thoại xác nhận cho thu hồi, từ chối lời mời, ký, từ chối ký, ghi kết quả; lý do bắt buộc thì nút xác nhận khóa đến khi nhập; ghi rõ "Không hoàn tác" khi cần. Đóng được bằng Esc/Hủy; focus đúng.
6. Từ chối lời mời xong: màn "Bạn đã từ chối…" và nút về `/my-reviews`, không hiện lỗi 403.
7. Khu Chủ tịch: danh sách biên bản (tải về, xóa), ô tải tệp, nhận xét, chọn Đạt/Không đạt; nút "Ghi kết quả nghiệm thu" khóa kèm lý do đến khi đủ. Lỗi tải danh sách biên bản phải hiện ra, không khóa nút sai.
8. Sau kết quả: thẻ "Kết quả nghiệm thu" chỉ đọc, link tải biên bản; không còn ô thao tác.
9. Ngày giờ hiển thị theo giờ Việt Nam (thao tác sau 0h giờ VN không bị lùi một ngày).
10. Trang chi tiết đề tài: thẻ "Hội đồng nghiệm thu" dẫn sang trang hội đồng; trạng thái "Đã nghiệm thu"/"Không đạt" và thẻ thanh lý mở. Hồ sơ nghiệm thu có nhóm "Biên bản họp hội đồng" chỉ đọc.
11. Trạng thái tải/rỗng/lỗi/không quyền rõ ràng; toàn bộ chữ tiếng Việt, không lộ mã kỹ thuật (`COUNCIL_NOT_READY`, `undefined`, id thô) cho người dùng.
12. Truy cập: điều hướng bằng bàn phím, nhãn trường, `aria-label` cho nút biểu tượng (thu hồi), thông báo `role="status"/"alert"`, độ tương phản huy hiệu.
13. Lỗi console và request 4xx/5xx không mong đợi khi thao tác bình thường.

## D. Test tự động

Test DB tự tạo và xóa database tạm riêng cạnh `DATABASE_URL` (không đụng dữ liệu của DB đó), nên trỏ `DATABASE_URL` vào DB kiểm thử đã tạo ở trên:

```bash
export DATABASE_URL="$DB69"
npm run typecheck
npm test
```

Ghi kết quả. Nếu thấy ca quan trọng chưa có test, mô tả ca đó (không cần viết test).

## Báo cáo

Viết báo cáo tiếng Việt vào `/tmp/codex-6-9-test-report.md` (không ghi vào repo), gồm:

1. Tóm tắt: số ca đã chạy, đạt, lỗi, chưa chạy được (kèm lý do).
2. Bảng phát hiện, sắp theo mức độ:

| # | Mức độ (Nghiêm trọng / Cao / Trung bình / Thấp) | Nhóm (Vai trò / Logic / UI-UX) | Vai trò thực hiện | Các bước tái hiện | Kết quả mong đợi | Kết quả thực tế | Bằng chứng (HTTP code + body, ảnh chụp, file:dòng) |

3. Danh sách ca đã đạt (ngắn gọn, theo mục A/B/C).
4. Các điểm spec mơ hồ hoặc mâu thuẫn với `docs/permission-matrix.md`.

Chỉ báo cáo điều đã tận mắt tái hiện; ghi rõ ca nào chỉ suy luận từ code. Khi xong: dừng các tiến trình đã chạy và xóa DB:

```bash
docker exec docmans-postgres-1 psql -U docmansystem -d postgres -c "DROP DATABASE docmans_codex69"
```
