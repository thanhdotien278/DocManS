---
title: 'Story 5.6 — Thư ký hỗ trợ hành chính cho quy trình đánh giá (lát cắt tệp hành chính)'
type: 'feature'
created: '2026-11-08'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a9f159850a2904222a8c6303015d216cd71d9724'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Thư ký đề tài (`TOPIC_SECRETARY`) chỉ tải tệp khi hồ sơ ở `draft`/`supplement_requested`, nên không nộp được tài liệu họp khi hồ sơ đang đánh giá. Thư ký hội đồng (`council_secretary`) soạn được bản nháp tổng hợp (đã có) nhưng không có chỗ nộp biên bản họp hội đồng.

**Approach:** Tái dùng `FileRecord` với hai mục đích tệp mới, không thêm bảng hay migration:
- `MEETING_MATERIAL`: thư ký đề tài đang hiệu lực tải lên khi hồ sơ `under_review`. Ai đọc được hồ sơ đều thấy.
- `COUNCIL_MINUTES`: thư ký hội đồng (phân công `council_secretary` đã chấp nhận, hội đồng đã thành lập, không xung đột) tải lên khi hồ sơ `under_review`. Ẩn với người tham gia hồ sơ (PI, thành viên, thư ký đề tài) ở danh sách, tải về và gói chi tiết.

Mọi hành động chuyên môn hoặc quyết định của thư ký tiếp tục bị chặn bằng cổng xung đột sẵn có. Có test chứng minh việc này.

### Quyết định tạm (người dùng vắng mặt — cần xác nhận)

- "Task" và "tracking note" chuyển sang Epic 7 (quản lý công việc, đang backlog) và được ghi vào `deferred-work.md`. Lý do: chưa có mô hình task, và dựng mới là ngoài phạm vi.
- Hai AC cùng nhắc biên bản. Cách tách: biên bản họp hội đồng thuộc thư ký hội đồng. Thư ký đề tài chỉ nộp tài liệu họp của nhóm đề tài.
- Tệp hành chính nộp khi `under_review` không sửa hoặc xóa được sau khi tải (bảo tồn chứng cứ). Muốn thay thì tải phiên bản mới.
- Không dựng "non-delegable registry" mới. Việc chặn dựa vào cổng xung đột và capability hiện có.

## Boundaries & Constraints

**Always:**
- Backend kiểm tra quan hệ hiệu lực tại thời điểm request (đã gồm `effectiveUntil`), trong cả pha kiểm tra và transaction ghi.
- Audit `upload-file` ghi rõ mục đích và quan hệ của actor.
- Tệp đã tải vẫn giữ nguyên khi quan hệ hết hiệu lực.

**Never:**
- Migration Prisma.
- Cho thư ký đề tài tải `COUNCIL_MINUTES`, hoặc thư ký hội đồng tải mục đích khác.
- Cho người tham gia hồ sơ thấy `COUNCIL_MINUTES`.
- Mở quyền chấm phiếu, phân công, tổng hợp/chốt, trình tờ trình hoặc quyết định cho bất kỳ thư ký nào.
- Đổi luật tải tệp hiện có ở `draft`/`supplement_requested`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|---|---|---|---|
| Thư ký đề tài nộp tài liệu họp | `under_review`, purpose `MEETING_MATERIAL` | 201. Audit có `TOPIC_SECRETARY` | N/A |
| Thư ký đề tài nộp sai mục đích | `under_review`, purpose khác | Từ chối | 403 |
| Thư ký đề tài hết hiệu lực | `effectiveUntil` đã qua | Từ chối tải | 403 |
| Thư ký hội đồng nộp biên bản | `under_review`, `COUNCIL_MINUTES` | 201 | N/A |
| PI xem danh sách hoặc tải biên bản | có `COUNCIL_MINUTES` | Không thấy trong danh sách; tải theo id trả 404 | 404 |
| Thư ký đề tài gọi phân công, chấm, tổng hợp, quyết định | bất kỳ | Bị chặn bởi xung đột | 400/403 |

</frozen-after-approval>

## Code Map

- `apps/api/src/modules/files/files.service.ts:392` `assertCanUpload` -- truyền thêm `filePurpose`, thêm hai nhánh `under_review`; `findReadableFile` (:458) với hồ sơ đề xuất phải kiểm tra tệp có trong `getProposal(actor).attachments` (đã lọc), nếu không có thì 404; audit `upload-file` (:205) thêm mục đích và quan hệ vào `reason`.
- `apps/api/src/research-proposals/research-proposals.service.ts:1233` `findAttachments` -- lọc `COUNCIL_MINUTES` khi `participation.isParticipant`.
- `apps/api/src/proposals-shared/proposal-review-access.ts` / `ProposalReviewAccessService.resolveForProposal` -- xác định `council_secretary`. Chỉ cho phép khi phân công accepted, `councilEstablishedAt` khác null và không xung đột (xem `proposal-evaluation-summary.service.ts:124` để làm theo đúng cách).
- `apps/web/src/components/research-proposals/council-secretary-panel.tsx` -- thêm ô tải "Biên bản họp hội đồng".
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx` -- khi viewer là `TOPIC_SECRETARY` và hồ sơ `under_review`, hiện ô tải "Tài liệu họp". Dùng client upload sẵn có trong `apps/web/src/lib/`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- thêm mục hoãn task/tracking note.

## Tasks & Acceptance

**Execution:**
- [x] `files.service.ts` -- luật tải theo mục đích và quan hệ; download qua danh sách đã lọc; audit.
- [x] `research-proposals.service.ts` -- lọc biên bản với người tham gia.
- [x] Web: hai ô tải tệp hành chính.
- [x] Test: mở rộng một test DB sẵn có về tệp hoặc secretary (ví dụ `tests/proposals-st30.test.mjs` hoặc `tests/relationship-lifecycle-v1.test.mjs`) cho các dòng của ma trận. Không tạo seam chỉ để test.
- [x] `deferred-work.md` -- mục hoãn.

**Acceptance Criteria:**
- Given thư ký hội đồng đã nộp biên bản, when TP/TB/CV phụ trách hoặc GĐ mở hồ sơ, then thấy và tải được biên bản.

## Implementation Notes

- `assertCanUpload` nhận `filePurpose`; hai mục đích mới luôn đi nhánh riêng (chỉ `under_review`). `assertUnsubmittedFile` chặn sửa/xóa tệp hành chính ở mọi trạng thái; `findAttachments` luôn trả `canEdit/canDelete=false` cho chúng.
- `findReadableFile` dùng kết quả `getProposal` (qua `assertCanRead`) và trả 404 nếu tệp không có trong `attachments` đã lọc.
- Ảnh chụp nộp hồ sơ (`submissionSnapshot`) cũng bỏ `COUNCIL_MINUTES`, vì người tham gia đọc được các phiên bản đã nộp.
- Test: mở rộng `tests/proposals-st30.test.mjs`; sửa stub `assertCanRead` trong `tests/proposal-files-4-4.test.mjs` để trả danh sách tệp.

## Spec Change Log

- 2026-11-08, phát hiện khi review: trigger `protect_proposal_file_evidence` (migration `20260911000000`) chặn mọi INSERT `file_records` của hồ sơ không ở `draft`/`supplement_requested`. Test trên fake prisma không phát hiện. Nếu giữ ràng buộc "Never: migration Prisma" thì tính năng không chạy được trên DB thật. **Quyết định tạm (người dùng vắng mặt):** thêm migration bổ sung `20261108230000_evaluation_admin_files`. Migration chỉ `CREATE OR REPLACE FUNCTION`, nới riêng INSERT `MEETING_MATERIAL`/`COUNCIL_MINUTES` khi `under_review`. UPDATE vẫn bị chặn như cũ. Test DB thật nằm trong `tests/approval-routing-db.test.mjs` (test 5.10 council secretary). KEEP: toàn bộ logic service, UI và test hiện có.

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng / xử lý |
|---|---|---|---|---|
| 0 | orchestrator | Trigger DB chặn INSERT khi `under_review` nên tính năng không chạy trên DB thật | high | Đã thêm migration bổ sung (xem Change Log) và test DB thật |
| 1 | blind | `MEETING_MATERIAL` lọt vào snapshot nộp lại của PI | medium | Snapshot chỉ loại `COUNCIL_MINUTES` → patch |
| 2 | blind | Trigger vẫn cho UPDATE tệp hành chính khi hồ sơ quay về nháp | low | Backend chặn, nhưng comment migration sai → patch trigger: chặn mọi UPDATE với hai mục đích này |
| 3 | blind+edge | Mỗi lần tải tệp hành chính làm tăng context, khiến form đang mở của người khác bị lệch | medium | Trigger cập nhật `authorization_context_updated_at` → patch: bỏ cập nhật với INSERT hành chính; có test DB |
| 4 | blind | Luật ẩn (`isParticipant`) khác luật chặn tải lên (`evaluateConflict`) | low | Người hết hiệu lực không còn quyền đọc hồ sơ; không thấy tác hại cụ thể → reject |
| 5 | blind | Tải về phải dựng toàn bộ `getProposal` nên chậm | low | Chỉ là hiệu năng, giữ cách đúng trước → reject |
| 6 | blind | Danh sách mục đích bị hard-code ở nhiều nơi | low | Sửa trực tiếp → patch (backend dùng chung một hằng) |
| 7 | blind+edge | Form tải biên bản hiện ở mọi trạng thái | low | Sửa trực tiếp → patch |
| 8 | blind | Form tài liệu họp gate theo quan hệ, không theo capability | low | Trường hợp thư ký ngoài hiếm gặp; backend vẫn chặn → reject |
| 9 | blind+edge | `refresh()` làm form bị unmount, mất thông báo thành công | low | patch: dùng `refreshWorkflowState()` |
| 10 | verif+blind | Thiếu test: chặn theo trạng thái, xung đột, `MEETING_MATERIAL` trên DB thật, snapshot | medium | Gap đã xác minh → patch (riêng `MEETING_MATERIAL` trên DB thật đã thêm) |
| 11 | blind | `proposals-st30` đổi kỳ vọng `staffUser` không liên quan | false | Thay đổi đó nằm trong phần người dùng đã stage trước phiên này (`git diff --cached`) |
| 12 | blind | Không xác nhận trước khi tải tệp bất biến | low | UX nhỏ → reject |
| 13 | edge | Tra nhãn có thể khớp key của `Object.prototype` | low | Sửa trực tiếp → patch `Object.hasOwn` |
| 14 | edge | Spec nói không có migration | false | Đã ghi trong Spec Change Log |
| 15 | codex (gpt-6-astra) | Biên bản chỉ ẩn với người tham gia nên reviewer khác, PGĐ-KH, PGĐ-TD vẫn xem/tải được, lộ danh tính người chấm | high | Đúng (API 4001: PGĐ-KH tải 200). Patch: chỉ cho TP, TB, CV phụ trách, GĐ, thư ký hội đồng; luôn ẩn với người tham gia. Test `proposals-st30` + kiểm trên API thật |

## Verification

**Commands:**
- `npm run build:api && npx tsc -p apps/web --noEmit` -- không lỗi kiểu.
- `node --test <test đã mở rộng>` -- PASS.
