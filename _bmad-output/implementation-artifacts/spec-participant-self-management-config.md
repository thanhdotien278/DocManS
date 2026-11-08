---
title: 'Cấu hình TP/TB/CV làm PI và xem dữ liệu quản lý trên hồ sơ của mình (phần 1)'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_commit: '5500dc67e7f636e495b24a58ee5d8f5211bd4d11'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/permission-matrix.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** TP, TB, CV luôn được làm PI/thành viên, và khi đã tham gia hồ sơ thì bị ẩn mọi dữ liệu quản lý của hồ sơ đó (matrix §7.3). QT không có cách nào điều chỉnh.

**Approach:** Thêm cấu hình QT dạng bảng (TP/TB/CV × "Được làm PI/thành viên", "Xem dữ liệu quản lý"), lưu trong `system_parameters`. Backend đọc cấu hình ở mỗi request: chặn tạo PI/thành viên mới khi tắt, và mở các projection dữ liệu quản lý khi "Xem" bật.

Quyết định của người dùng (08/11/2026):
- Áp cho TP, TB, CV (không áp PP, GĐ, PGĐ).
- "Xem" bật = trên hồ sơ đề xuất mình tham gia, thấy tiến độ, roster, danh tính người đánh giá, phiếu đã gửi và bản tổng hợp như khi không tham gia (theo quyền đọc sẵn có của vai trò).
- Tắt "Được làm PI" chỉ chặn tạo mới (tạo nháp, được thêm làm thành viên mới); hồ sơ/đề tài đã có vẫn đi tiếp, kể cả sửa và nộp nháp đang có.
- Tách: "Phụ trách" (thao tác quản lý trên hồ sơ mình tham gia) là phần 2, ghi ở `deferred-work.md`.

## Boundaries & Constraints

**Always:**
- Mặc định (chưa có cấu hình): PI bật, Xem tắt = đúng hành vi hiện tại.
- Cấu hình đọc lại mỗi request/mutation; giá trị hỏng thì fail closed về mặc định.
- "Xem" chỉ mở đọc; mọi mutation quản lý vẫn bị chặn như hiện tại (kể cả ngoại lệ D-038 giữ nguyên).
- "Xem" không vượt quyền đọc gốc của vai trò (CV vẫn phải là CV phụ trách hiện hành mới đọc tiến độ).
- Người tham gia vẫn không được mời phản biện/hội đồng/IRB, không chấm điểm.
- QT cập nhật cấu hình có audit như `council_formation.*`; chỉ QT được ghi.

**Never:**
- Không đổi `isInternalResearcherEligible` (sẽ chặn nộp nháp đang có).
- Không đổi `ProposalParticipationService.evaluateConflict` toàn cục.
- Không nới bất kỳ kiểm tra xung đột nào của mutation (để phần 2).
- Không thêm migration schema hay bảng mới.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mặc định | TB là PI, chưa cấu hình | Tiến độ/roster ẩn như hiện tại | N/A |
| Xem bật | TB là PI, `TB.view=true` | `review-progress`, roster hội đồng trả đủ assignments, phiếu, tổng hợp; capability `proposal.review.progress.read` cho phép | N/A |
| Xem bật, không có quyền gốc | CV là thành viên nhưng không phụ trách, `CV.view=true` | Vẫn bị chặn | 403 |
| Xem bật, mutation | TB là PI, `TB.view=true`, lưu tổng hợp | Vẫn chặn | `CONFLICT_DENIED` |
| Tắt làm PI | `CV.pi=false`, CV tạo nháp | Chặn | 403 `ACTION_NOT_GRANTED` |
| Tắt làm PI, thêm thành viên | `TB.pi=false`, PI khác thêm TB vào nhóm (đề xuất hoặc điều chỉnh đề tài) | Chặn người mới; thành viên đã có giữ nguyên | 400 kèm tên vai trò |
| Nháp có sẵn | `CV.pi=false`, CV có nháp cũ | Vẫn sửa và nộp được | N/A |

</frozen-after-approval>

## Code Map

Đường dẫn tương đối `apps/api/src` trừ khi ghi `web/` (= `apps/web/src`).

- `proposals-shared/council-formation.ts:53-97` -- mẫu đọc `systemParameter` (khóa, parse, fail closed) cho khóa mới `participant_policy`.
- `admin/admin-config.service.ts:146-166`, `admin/admin-config.controller.ts:35-41` -- mẫu list/upsert + audit.
- `web/components/admin/admin-council-config-panel.tsx`, `web/lib/admin-api.ts:255-259`, `web/app/system-settings/page.tsx` -- mẫu UI và client.
- `permissions/proposal-capability-v1.ts:137` -- `proposal.review.progress.read` chặn người tham gia; nới khi `view`. Input thêm như `councilFormationConfig:36`.
- `proposal-evaluations/proposal-evaluation-summary.service.ts:84-99` `getReviewProgress` -- CV bị 403 và TP/TB mất assignments/reviews/summary khi `conflict.conflicted`; nới phần participation khi `view` (xung đột phản biện vẫn chặn).
- `proposal-evaluations/proposal-review-assignments.service.ts:172` `listAssignments`; `proposal-evaluation-council.service.ts:150,163,165` `getCouncil` (roster, blockers, approval detail) -- nới đọc khi `view`; KHÔNG đổi các cờ thao tác `:121-145`.
- `research-proposals/research-proposals.service.ts:1337` `toViewerParticipation`, `:1454,1462` `toProposalResponse` -- `reviewWorkflow`/`evaluationSummaryStatus` theo `view`; truyền policy như `readCouncilFormationConfigForView:1378`.
- `research-proposals/research-proposals.service.ts:244` `createDraft`, `:1031` `replaceMembers` -- kiểm `pi` cho chủ nháp mới và thành viên mới thêm (so với danh sách đang hiệu lực).
- `approved-projects/approved-projects.service.ts:718` `applyAdjustmentChanges` (~`:753` thêm thành viên) -- kiểm `pi` cho thành viên mới.
- `web/components/research-proposals/proposal-detail-workspace.tsx:185,684` `isParticipantViewer` -- bảng tiến độ hiện theo capability.
- Không đổi: `proposal-review-assignments.service.ts:118-124,235,242,479,556,591` (ứng viên), `research-proposals.service.ts:1301-1307` (ẩn danh với reviewer).

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/proposals-shared/participant-policy.ts` (mới) -- kiểu, mặc định, parse, `readParticipantPolicy(prisma)`, `participantPolicyFor(actor, policy)` → `{ pi, view }` (vai trò khác luôn mặc định) -- một nguồn sự thật.
- [x] `apps/api/src/admin/admin-config.service.ts`, `admin-config.controller.ts` -- `GET/PUT config/participant-policy`, validate boolean, audit.
- [x] `apps/api/src/proposal-evaluations/*` (summary, assignments, council ở Code Map) -- bỏ qua xung đột participation trong các nhánh đọc khi `view`.
- [x] `apps/api/src/permissions/proposal-capability-v1.ts` -- input `participantView`, nới `:137`.
- [x] `apps/api/src/research-proposals/research-proposals.service.ts` -- truyền policy vào response/capability; chặn PI/thành viên mới khi `pi=false`.
- [x] `apps/api/src/approved-projects/approved-projects.service.ts` -- chặn thành viên mới khi `pi=false`.
- [x] `apps/web/src/lib/admin-api.ts`, `apps/web/src/components/admin/admin-participant-policy-panel.tsx` (mới), `system-settings/page.tsx` -- bảng checkbox 3×2.
- [x] `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx` -- hiện tiến độ theo capability.
- [x] `tests/participant-policy.test.mjs` (mới, hàm thuần) -- parse fail closed, `participantPolicyFor`, capability progress.read theo `view`.
- [x] `docs/permission-matrix.md` §7.3, `_bmad-output/architecture.md`, `_bmad-output/.decision-log.md` -- D-041 (tiếng Việt).

**Acceptance Criteria:**
- Given chưa có cấu hình, when chạy bộ test hiện có, then không test nào đổi kết quả do tính năng này.
- Given QT lưu cấu hình, when TB tải lại hồ sơ mình là PI, then backend và capability phản ánh cấu hình mới mà không cần đăng nhập lại.
- Given người không phải QT, when gọi `PUT config/participant-policy`, then 403.

## Implementation Notes

- Nhánh đọc dùng `resolveReadConflict` (mới, trong `proposal-evaluation-support.ts`): chỉ bỏ qua xung đột tham gia khi `view`, vẫn chặn xung đột phản biện/ngữ cảnh không xác định. `assertScientificManagementScope`/`assertEvaluationReadScope`/`assertReviewAssignmentReadScope` nhận cờ `participantView` (mặc định `false`); mutation không truyền.
- `proposal-detail-workspace.tsx` không cần sửa: bảng tiến độ đã hiện theo capability `proposal.review.progress.read`; panel hội đồng tự hiện khi `getCouncil` trả 200.
- Chặn thành viên mới trong điều chỉnh đề tài áp tại lúc ký (`applyAdjustmentChanges`), không ở lúc PI nộp yêu cầu.
- Bổ sung sau kiểm tra diff: `assertAddedMembersMayParticipate` chặn sớm khi PI tạo, sửa và nộp yêu cầu điều chỉnh (tránh yêu cầu bị kẹt tới lúc ký); kiểm tra lúc ký vẫn giữ. Test thêm cho tạo nháp, thêm thành viên đề xuất/đề tài và nộp nháp có sẵn khi `pi=false`.
- Diff so với `baseline_commit` gồm cả fix Story 5.1 chưa commit (TB kiểm tra đầy đủ, ngoại lệ D-038) theo lựa chọn của người dùng.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 1 | blind | `listAssignments` lọt ngữ cảnh không xác định | false | `evaluateProposalConflict` trả `reasonCode: "unresolved"` cho ngữ cảnh không xác định, điều kiện chỉ nới khi `"participation"`. |
| 2 | blind | PI thấy danh tính người đánh giá, phá ẩn danh | false | Quyết định của người dùng trong frozen intent ("Xem cả dữ liệu quản lý"), ghi ở D-041. |
| 3 | blind | Cột Xem của TP/TB không có tác dụng | false | Nhánh TP/TB trong `getReviewProgress` và `getCouncil` dùng `readConflict` để mở assignments/reviews/summary/roster. |
| 4 | blind, edge | D-038 gộp chung diff, đổi hành vi mặc định | false | Người dùng chọn không commit 5.1 riêng; ghi ở Implementation Notes. |
| 5 | blind | `pi` fail open khi giá trị hỏng | false | Frozen: "giá trị hỏng thì fail closed về mặc định". |
| 6 | blind, edge | GET admin hiện "Mặc định" và audit `beforeFacts` sai khi row hỏng | low | Chỉ xảy ra khi DB bị sửa tay; sửa cần thêm cờ/nhánh → loại. |
| 7 | blind, edge | Không chống ghi đè đồng thời / P2002 lần upsert đầu | low | Hai QT cùng lưu lần đầu rất hiếm; cùng mẫu `council_formation` → loại. |
| 8 | blind, edge | `assertNewMembersMayParticipate` ngoài transaction, dùng `new Date()` | low | Service chạy trong `mutate` nên `this.prisma` là `tx`; lệch đồng hồ chỉ ở biên mili-giây → loại. |
| 9 | blind | Thêm thành viên qua lý lịch không có `userId` bỏ qua kiểm tra | low | Lý lịch không gắn tài khoản thì không có vai trò TP/TB/CV → loại. |
| 10 | blind | UI không phản ánh Xem | false | Bảng tiến độ dùng `canReadReviewProgress` từ capability (`proposal-detail-workspace.tsx:179,734`). |
| 11 | blind | Tài liệu nói lộ "phiếu và tổng hợp" nhưng không có endpoint | false | `getReviewProgress` trả `reviews` và `evaluationSummary`. |
| 12 | blind | Nhãn vai trò dùng `COUNCIL_ROLE_LABELS`, sai chữ "đề tài" ở đề xuất | low | Sửa trực tiếp → patch. |
| 13 | blind | Đọc policy mỗi thành viên lúc ký | low | Vài lần đọc thêm, không ảnh hưởng người dùng → loại. |
| 14 | blind | Spec và deferred-work không có trong diff | false | Diff review cố ý chỉ gồm code/tài liệu; cả hai có trong cây làm việc. |
| 15 | edge | CV tham gia không phụ trách thấy `reviewWorkflow` khi Xem bật | medium | Gate trong `toProposalResponse` thiếu kiểm CV phụ trách, trái dòng I/O "không có quyền gốc" → patch. |
| 16 | edge | `readParticipantPolicy` nuốt lỗi trong transaction Postgres | low | Chỉ khi `findUnique` lỗi giữa transaction → loại. |
| 17 | blind | Câu "mọi thao tác quản lý vẫn bị chặn" thiếu ngoại lệ D-038 | low | Sửa trực tiếp tài liệu → patch. |
| 18 | vgap | Dịch vụ đọc (progress/assignments/council) không có test với `view` | medium | Patch một phần qua test `toProposalResponse`; test service đọc cần harness fake Prisma lớn → deferred-work. |
| 19 | vgap | Wiring policy vào response chưa test | medium | Patch: test `toProposalResponse`. |
| 20 | vgap | `pi=false` chỉ test qua helper | medium | Helper là đúng điểm chặn; test gọi `createDraft` thật; nối gọi helper đã đọc trong diff → patch giới hạn ở helper. |
| 21 | vgap | Admin GET/PUT và audit chưa test | medium | Patch: test `updateParticipantPolicy`. |
| 22 | vgap | D-038 phía service chỉ test ở capability | medium | Patch: test `assertCanRequestSupplement`. |
| 23 | blind | Test "nháp có sẵn" vô nghĩa | low | Không đọc policy → patch viết lại hoặc bỏ. |

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && node --test tests/participant-policy.test.mjs tests/authorization-v1.test.mjs tests/proposal-review-golden-flow.test.mjs tests/proposal-review-cardinality.test.mjs` -- expected: tất cả PASS.

**Manual checks (if no CLI):**
- Trang cấu hình hệ thống có bảng 3×2; bật TB.Xem thì TB là PI thấy bảng tiến độ trên hồ sơ của mình, nút tổng hợp vẫn khóa.
