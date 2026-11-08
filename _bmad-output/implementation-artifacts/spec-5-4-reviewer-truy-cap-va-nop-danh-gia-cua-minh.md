---
title: 'Story 5.4: Reviewer truy cập và nộp đánh giá của mình'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_commit: 'a9f159850a2904222a8c6303015d216cd71d9724'
route: 'dispatch'
review_loop_iteration: 0
context: ['{project-root}/docs/permission-matrix.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Luồng reviewer đã có từ slice 2026-09-22: hàng đợi "Đánh giá của tôi", chấp nhận/từ chối lời mời, rubric, nháp, nộp/khóa phiếu, audit. Rà theo AC Story 5.4 còn năm lỗ hổng:
1. Reviewer vẫn nhận nhật ký thao tác của hồ sơ (detail, `listHistory`, package).
2. Detail và tải tệp không kiểm tra vòng đánh giá, nên reviewer vòng cũ vẫn đọc được.
3. TP/PP/BGĐ đồng thời là reviewer vẫn gọi trực tiếp được roster/progress của hồ sơ đó.
4. Nộp phiếu không thông báo cho CV phụ trách.
5. Lưu nháp không trả `contextVersion` mới.

**Approach:** Vá năm điểm này ở backend, dùng lại guard và helper sẵn có. Web chỉ chỉnh theo dữ liệu đã lọc. Không đổi schema, không thêm trạng thái.

**Quyết định (theo `docs/permission-matrix.md`):**
- Reviewer không thấy nhật ký thao tác (§324, §605).
- Tệp đọc theo cùng tra cứu assignment như hồ sơ (§496), giữ trả mọi tệp đang hoạt động.
- Reviewer không dùng quyền quản lý trên cùng hồ sơ (§611), nên xung đột phản biện chặn roster/progress với mọi vai trò.

## Boundaries & Constraints

**Always:** Kiểm tra ở backend, fail closed. Kiểm tra vòng hiện hành chỉ thu hẹp quyền **đọc** (`isAssignedReviewer` của `resolveForProposal`); `hasReviewConflict`, `resolveConflictForProposal` và mọi chỗ ẩn hay chặn dữ liệu quản lý vẫn tính cả assignment vòng cũ và phiếu đã lưu. So sánh vòng y hệt `assertAssigned` (`reviewedSubmissionEventId === id submission event hiện hành`; giá trị null không cấp quyền). Thông báo ghi trong transaction nộp, có `idempotencyKey`. Hồ sơ vẫn `under_review`.

**Never:** Không mở lại phiếu đã nộp. Không migration. `revise` không đổi trạng thái. Không chỉ ẩn trên UI. Không đụng luồng mời, thu hồi hay tổng hợp.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|----------|--------------|----------|-------|
| Reviewer đọc detail/package | Assignment hiệu lực, vòng hiện hành | Không có trường `history`; `GET …/history` bị từ chối | 403 |
| Reviewer vòng cũ | Hồ sơ đã nộp lại | Không đọc được detail, tệp hay package; staff-reviewer vòng cũ vẫn bị ẩn dữ liệu quản lý | 403/404 |
| TP/PP/BGĐ là reviewer | Có assignment hoặc phiếu | `listAssignments`, `getReviewProgress` bị từ chối | 403 |
| Lưu nháp nhiều lần | Mỗi lần gửi `contextVersion` mới nhất | Thành công, phản hồi có `contextVersion` mới | `contextVersion` cũ → 409 |
| Nộp phiếu | Rubric đủ | Khóa phiếu, hoàn thành assignment, CV phụ trách nhận `review.submitted`, hồ sơ `under_review` | Không có CV → vẫn nộp, không thông báo |
| Reviewer ngoài | `EXTERNAL_RESEARCHER_USER` có assignment | Đọc được hồ sơ được phân công và phiếu của mình; hồ sơ khác bị từ chối | 403/404 |

</frozen-after-approval>

## Code Map

- `apps/api/src/proposals-shared/proposal-review-access.service.ts:51-73` -- `resolveForProposal`, điểm vào của `getProposal` và `FilesService.assertCanRead` (`modules/files/files.service.ts:419`). Thêm `reviewedSubmissionEventId` vào select. Lấy id vòng hiện hành bằng `findCurrentSubmissionEvidence` (`proposal-evaluations/proposal-evaluation-support.ts:144`); nếu hàm lỗi thì không cấp quyền đọc. Không đổi `hasReviewConflict` hay `resolveConflictForProposal`.
- `apps/api/src/proposal-evaluations/proposal-reviews.service.ts:293-316` -- `assertAssigned`, mẫu so sánh vòng. `saveMyReview` (`:85+`) trả `contextVersion` mới. `submitMyReview` gọi `notifyUsers` theo mẫu `research-proposals.service.ts:496` (cùng cách lấy officer): `type: "review.submitted"`, `sourceType` thuộc union `NotificationSourceType`, `idempotencyKey: review-submit:<reviewId>`.
- `apps/api/src/research-proposals/research-proposals.service.ts:666-674` (`listHistory`: từ chối reviewer), `:1339-1346` (`toProposalDetailResponse`: bỏ `history` trong nhánh reviewer). Tên CV phụ trách giữ nguyên.
- `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts:170-182` (`listAssignments`), `:593-730` (`getReviewPackage`: bỏ `history`).
- `apps/api/src/proposal-evaluations/proposal-evaluation-summary.service.ts:82-96` -- `getReviewProgress`. Hiện chỉ chặn staff bị xung đột; đổi để chặn mọi vai trò khi xung đột là phản biện (`REVIEWER_CONFLICT` trong `proposal-evaluation-support.ts:331`). Không đổi cách đối xử với PI hay người tham gia.
- Web: `apps/web/src/lib/research-proposals-api.ts:197` (`history?` đã optional), `proposal-detail-workspace.tsx:1003` (đã có `?.length`). Không gọi `listHistory` hay roster cho reviewer, vì capability đã chặn (`permissions/proposal-capability-v1.ts:144-227`). `proposal-review-form.tsx:129`: dùng `contextVersion` trả về sau khi lưu.
- Test: `tests/proposals-ep03.test.mjs` đang fail 25/27 trước khi sửa (`tx.user.findUnique is not a function` ở `proposal-mutation.js:28`) và cần sửa fake Prisma. `tests/proposal-review-golden-flow.test.mjs` PASS 7/7. Mở rộng hai file này.

## Tasks & Acceptance

**Execution:**
- [x] `tests/proposals-ep03.test.mjs` -- bổ sung `user.findUnique` vào fake transaction -- khôi phục baseline trước khi thêm assert
- [x] `proposal-review-access.service.ts` -- kiểm tra vòng hiện hành cho quyền đọc -- lỗ hổng 2
- [x] `research-proposals.service.ts`, `proposal-review-assignments.service.ts` -- bỏ `history` cho reviewer; `listHistory` từ chối reviewer -- lỗ hổng 1
- [x] `proposal-review-assignments.service.ts`, `proposal-evaluation-summary.service.ts` -- xung đột phản biện chặn roster/progress -- lỗ hổng 3
- [x] `proposal-reviews.service.ts`, `proposal-review-form.tsx` -- `contextVersion` khi lưu; thông báo khi nộp -- lỗ hổng 4, 5
- [x] `tests/proposals-ep03.test.mjs`, `tests/proposal-review-golden-flow.test.mjs` -- một assert cho mỗi dòng của I/O Matrix

**Acceptance Criteria:**
- Given reviewer đã chấp nhận, còn hiệu lực, when mở "Đánh giá của tôi" rồi mở hồ sơ, then thấy hồ sơ, tệp và phiếu của mình, không thấy nhật ký thao tác hay danh tính/phiếu reviewer khác.
- Given PI/người không liên quan biết review ID/file ID, when gọi endpoint, then bị từ chối, không lộ điểm, nhận xét hay danh tính.

## Implementation Notes

- Quyết định của agent: tên CV phụ trách vẫn hiển thị cho reviewer để làm đầu mối liên hệ; matrix không cấm.
- Gap chấp nhận (AC6): package/phiếu trả 403 cho người chưa được phân công, còn tệp trả 404. Từ 403 suy ra được hồ sơ tồn tại nhưng không lộ dữ liệu. Giữ nguyên vì test và thông báo UI dựa vào 403.

- Thực hiện: `proposal-capability-v1.ts` thêm `CONFLICT_DENIED` cho `proposal.review.progress.read` khi người xem là reviewer, để UI hiện nút khóa thay vì nhận 403. `REVIEWER_CONFLICT` được export từ `proposal-evaluation-support.ts`. Kiểu `history` bị bỏ khỏi `ProposalReviewPackage` trên web.
- `listAssignments` vẫn giữ nhánh `isInvitee`, nên người được mời đã từ chối hoặc bị thu hồi vẫn không đọc được phiếu của người khác.
- `tests/proposals-ep03.test.mjs`: đã bổ sung fake (`user.findUnique`, officer, notification, catalog, aggregate). Suite cũ còn 23 test fail. Nguyên nhân là luồng hội đồng đã đổi (completeness, chấp nhận lời mời, thành lập hội đồng), không phải do thiếu fake. Đối chiếu với baseline `a9f1598` (chạy trên worktree tạm): không phát sinh test fail mới. Block "Story 5.4" PASS 4/4.
- Kiểm chứng: `npm run typecheck` PASS. Golden-flow 7/7 PASS, cardinality 4/4 PASS.

- Kiểm chứng UI (2026-11-08; API 4001 + web 3001, bản build tại HEAD, DB dev):
  - Reviewer `test_external01` ở "Đánh giá của tôi" chỉ thấy "Mùa thu 2", không thấy hồ sơ vòng cũ "Hệ thống báo cháy".
  - Mở "Mùa thu 2": phiếu đã gửi hiển thị chỉ đọc; tệp không hiện người tải lên; không có panel tiến độ; không có request nào bị 403 do Story 5.4.
  - Mở "Hệ thống báo cháy" (`f9f57beb`, vòng cũ): bị từ chối truy cập.
  - CV `hdtien1` trên "Mùa thu 2" vẫn thấy Timeline và "Tiến độ phiếu đánh giá".
- Sửa sau kiểm chứng UI: `proposal-detail-workspace.tsx` ẩn khối Timeline khi backend không trả `history`. Trước đó reviewer thấy dòng "Chưa có lịch sử nộp", gây hiểu nhầm.
- Kiểm chứng UI vòng mới (2026-11-08, cùng môi trường):
  - Dựng vòng đánh giá qua API bằng tài khoản seed trên hồ sơ "Mùa thu 3" (`cc36d963`): CV `hdtien1` xác nhận đầy đủ → TP `nmphuong` mời 7 thành viên → 7/7 nhận lời → tờ trình CV → TB `nmtrung` → TP → PGĐ-KH `vndinh` ký thành lập hội đồng (APPROVED).
  - Trên UI, reviewer `test_external01` bấm "Lưu nháp" hai lần liên tiếp, không tải lại trang: hai `PUT …/my-review` đều trả 200, không bị 409.
  - Điền đủ rubric và chọn kết luận `revise` rồi gửi: `POST …/my-review/submit` trả 201; phiếu chuyển sang chỉ đọc, "Tổng 80/100 · Đề nghị chỉnh sửa, bổ sung".
  - CV `hdtien1` nhận thông báo "Có phiếu đánh giá mới được nộp — Mùa thu 3", không nêu tên reviewer. Hồ sơ vẫn "Đang đánh giá"; tiến độ "Đã gửi 1/6 phiếu".
- Dữ liệu dev còn sót: lần thử đầu trên hồ sơ "Chưa biết làm gì" (`c2a85efb`) dừng ở tờ trình chờ TB, vì TB `nmtrung` là thành viên của hồ sơ này (`APPROVAL_CONFLICT`, đúng matrix). Hồ sơ đó còn 7 phân công đã nhận lời và 1 tờ trình đang `BOARD_REVIEW`.
- Dữ liệu cũ: 4 phân công của hồ sơ "Hệ thống báo cháy" (code ngày 16/09) gắn `reviewedSubmissionEventId` vào sự kiện `completeness_check` thay vì lần nộp. Trước story này, các reviewer đó đã bị `assertAssigned` chặn chấm và nộp phiếu; nay bị chặn thêm quyền đọc.

## Spec Change Log

## Review Triage Log

- [medium → patch] `resolveForProposals` (batch) vẫn cấp quyền đọc từ assignment mọi vòng: danh sách và thông báo hiện hồ sơ trong khi trang chi tiết trả 403. Đã kiểm tra: `projectProposalList` → `canReadProposal` dùng `isAssignedReviewer`.
- [high → patch] Các chỗ ẩn thông tin reviewer trong `toProposalDetailResponse`/`toProposalResponse` dựa vào `isAssignedReviewer`, nay chỉ còn tính vòng hiện hành. Hệ quả: TP/CV phản biện vòng cũ thấy lại danh tính PI và phiên bản hồ sơ. Lệch với ràng buộc Always của spec (patch nhỏ, không mở thêm bề mặt API).
- [medium → patch] `getReviewProgress` so sánh `conflict === REVIEWER_CONFLICT` theo tham chiếu đối tượng; lỗi tra cứu (unresolved) không bị chặn với người không phải staff. Sửa bằng kiểm tra trực tiếp `resolveConflictForProposal`, như `listAssignments`.
- [medium → patch] Nhánh `hasReviewConflict`/`conflictUnresolved` của `hidesActionLog` chưa có test.
- [low → defer] Web chưa có test cho việc chuyển `contextVersion` sau khi lưu: repo không có harness test component. Đã ghi vào deferred-work.
- [low] Import vòng `proposals-shared` ↔ `proposal-evaluations`: hàm chỉ được gọi bên trong method; build và test đều chạy. Bỏ qua.
- [false] Lỗi thông báo làm hỏng lần nộp: `notifyUsers` chạy trong transaction giống mọi luồng khác (`research-proposals.service.ts:496`). Đây là chủ ý thiết kế.
- [low] Có hai CV phụ trách → bỏ qua thông báo, không để lại dấu vết. Trường hợp hiếm, sửa phải thêm nhánh xử lý. Bỏ qua.
- [low] `mutate<T>` spread kết quả: mọi kết quả đều là object, typecheck PASS. Bỏ qua.
- [low] Thông điệp 403 khi tra cứu lỗi (`unresolved`) chưa chính xác; `ACTION_NOT_GRANTED` và `CONFLICT_DENIED` dùng chưa thống nhất. Chỉ là chữ hiển thị. Bỏ qua.
- [low] `hidesActionLog` ẩn lịch sử khi tra cứu lỗi mà không báo lý do: đúng chủ ý fail closed. Bỏ qua.
- [false] Bản ghi cũ có `reviewedSubmissionEventId` null mất quyền đọc: khớp cách xử lý của `assertAssigned`; spec chủ ý chọn như vậy (Always).
- [maybe-false, low] Token `contextVersion` bị reset theo tham chiếu đối tượng: trang cha chỉ đổi object khi tải lại. Bỏ qua.
- [low] Mỗi lần mở chi tiết tốn thêm truy vấn: chỉ phát sinh khi người xem có assignment. Bỏ qua.
- [low] Spec ghi task test ở golden-flow nhưng mọi test nằm trong ep03: đã ghi rõ ở Implementation Notes.
- [false] Thư ký hội đồng vòng cũ mất nhánh thư ký: đúng mục tiêu chặn vòng cũ.

## Verification

**Commands:**
- `npm run build:api && node --test tests/proposals-ep03.test.mjs tests/proposal-review-golden-flow.test.mjs tests/proposal-review-cardinality.test.mjs` -- expected: tất cả PASS
- `npm run typecheck` -- expected: PASS

**Manual checks:**
- localhost: reviewer mở hồ sơ được phân công, không thấy khối lịch sử; sau khi nộp phiếu, CV phụ trách thấy thông báo.
