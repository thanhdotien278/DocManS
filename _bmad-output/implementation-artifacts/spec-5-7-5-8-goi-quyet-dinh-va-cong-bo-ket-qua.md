---
title: 'Story 5.7 + 5.8 — Gói trình quyết định đủ căn cứ và công bố kết quả có kiểm soát'
type: 'feature'
created: '2026-11-08'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a9f159850a2904222a8c6303015d216cd71d9724'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md', '{project-root}/docs/permission-matrix.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Lõi 5.7/5.8 (hàng đợi GĐ, gói quyết định, approve/reject khóa trạng thái, kiểm tra tờ trình LEADERSHIP, xung đột, audit) đã có từ slice 2026-09-22 và 5.9/5.10. Còn thiếu: (1) gói chỉ trả `attachmentCount`, GĐ không thấy danh sách tệp hồ sơ đã trình; (2) UI quyết định không có ô tóm tắt công bố và yêu cầu tiếp theo, nên `ProposalDecision.publicSummary` luôn rỗng; (3) PI, thành viên, thư ký đề tài và nhà nghiên cứu ngoài không có projection `PublishedReviewSummaryV1` nào để xem kết quả; (4) thông báo quyết định chỉ gửi PI.

**Approach:** Mở rộng các surface sẵn có, không thêm bảng, migration hay trạng thái mới. Gói trả danh sách tệp (metadata, không đường dẫn lưu trữ). Panel quyết định thêm hai ô công bố. Chi tiết hồ sơ trả `publishedDecision` (PublishedReviewSummaryV1) cho người đọc được hồ sơ khi đã có quyết định. Thông báo gửi PI và thành viên/thư ký đang hiệu lực có tài khoản.

### Quyết định tạm (người dùng vắng mặt — cần xác nhận)

- `publicSummary` không bắt buộc. Khi trống, PI vẫn thấy trạng thái quyết định và ngày quyết định.
- `PublishedReviewSummaryV1` gồm `schemaVersion`, `decision`, `decisionLabel`, `decidedAt`, `publicSummary`, `requiredFollowUp`. Không có `note` nội bộ, người quyết định, điểm, reviewer hay bản tổng hợp.
- Queue GĐ giữ nguyên: hồ sơ GĐ có xung đột vẫn hiện, còn gói và nút quyết định bị khóa kèm lý do, đúng AC "action hiển thị bị khóa với lý do".

## Boundaries & Constraints

**Always:** backend tự kiểm tra lại quyền, trạng thái, tờ trình và phiên bản gói trong transaction (giữ nguyên `decide`); mọi surface công bố dùng cùng một hàm projection; tệp chỉ trả metadata (id, tên, mục đích, phiên bản, kích thước, ngày) và tải qua `api/v1/files/:id/download` hiện có.

**Never:** migration Prisma; trạng thái proposal mới; trả `note` nội bộ, danh tính reviewer, điểm hay bản tổng hợp cho PI, thành viên hoặc người ngoài; cho PGĐ-KH, PGĐ-TD, TP, TB, CV quyết định; tự tạo approved project.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|---|---|---|---|
| GĐ mở gói | `ready_for_approval`, tờ trình ở LEADERSHIP | `attachments[]` metadata các tệp active | N/A |
| GĐ quyết định có công bố | approve + publicSummary + requiredFollowUp | `ProposalDecision.publicSummary` lưu cả hai | N/A |
| PI xem sau quyết định | status `approved`/`rejected` | `publishedDecision` không có `note` | N/A |
| PI xem trước quyết định | `ready_for_approval` | `publishedDecision: null` | N/A |
| Gói đổi sau khi tải | revision lệch | `PACKAGE_CONTEXT_MISMATCH` → UI tự tải lại gói | thông báo tải lại |

</frozen-after-approval>

## Code Map

- `apps/api/src/proposal-evaluations/proposal-decisions.service.ts` -- `getDecisionPackage` (thêm `attachments`), `decide` (thông báo cho thành viên), thêm hàm `toPublishedReviewSummaryV1`.
- `apps/api/src/research-proposals/research-proposals.service.ts:1312` `toProposalDetailResponse` -- thêm `publishedDecision`.
- `apps/web/src/lib/proposal-evaluations-api.ts` -- kiểu `attachments`, tham số publicSummary/requiredFollowUp của `decideProposal`.
- `apps/web/src/lib/research-proposals-api.ts` -- kiểu `publishedDecision` trên proposal detail.
- `apps/web/src/components/research-proposals/proposal-decision-panel.tsx` -- danh sách tệp, hai ô công bố, tự tải lại khi lệch gói.
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx` -- thẻ "Kết quả quyết định" khi có `publishedDecision`.
- Giữ nguyên: `proposal-capability-v1.ts`, `approval-routing.ts`, `listDecisionQueue`.

## Tasks & Acceptance

**Execution:**
- [x] `proposal-decisions.service.ts` -- thêm attachments, projection công bố, mở rộng người nhận thông báo.
- [x] `research-proposals.service.ts` -- `publishedDecision` trong chi tiết hồ sơ.
- [x] Web API + panel + workspace -- hiển thị và gửi trường công bố.
- [x] `tests/approval-routing-db.test.mjs` (mở rộng test quyết định sẵn có) -- PI nhận `publishedDecision` không có `note`; gói có `attachments`.

**Acceptance Criteria:**
- Given GĐ đã ra quyết định kèm ghi chú nội bộ và tóm tắt công bố, when PI mở chi tiết hồ sơ, then thấy trạng thái, ngày, tóm tắt và yêu cầu tiếp theo, không thấy ghi chú nội bộ.
- Given quyết định commit, when thông báo phát đi, then PI và thành viên/thư ký đang hiệu lực có tài khoản đều nhận, trừ chính GĐ.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| # | Nguồn | Finding | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 1 | blind | `publicSummary`/`requiredFollowUp` không giới hạn độ dài phía server | medium | Chỉ trim, không cap → patch |
| 2 | blind | Danh sách tệp đọc trực tiếp, không theo snapshot gói | low | Sau khi nộp, trigger DB khóa tệp và không còn tải mới ở `ready_for_approval`. Còn sai nhãn "đã trình" → patch nhãn |
| 3 | blind | Kết quả biến mất khi hồ sơ rời `approved`/`rejected` | false | Proposal không có trạng thái sau `approved`/`rejected`; đề tài là thực thể `ApprovedProject` riêng |
| 4 | blind | Reviewer cũng thấy `publishedDecision` | false | Projection chỉ chứa dữ liệu được phép công bố; không lộ dữ liệu nội bộ |
| 5 | blind | Rủi ro vòng import | false | `npm run build:api` và test DB chạy runtime PASS; `proposal-decisions.service` không import ngược `research-proposals.service` |
| 6 | blind | Hai chỗ đọc `publicSummary` có thể lệch nhau | low | Sửa trực tiếp → patch |
| 7 | blind | Test đồng thời gửi cùng payload | low | Chất lượng fixture, không có lỗi người dùng gặp → reject |
| 8 | blind | Kiểm tra lộ tên dựa vào fixture | low | `deepEqual` đã khóa đúng schema → reject |
| 9 | blind+verif | Lọc thành viên hết hiệu lực khi gửi thông báo chưa có test | medium | Gap đã xác minh → patch test |
| 10 | edge+blind | `CONTEXT_VERSION_MISMATCH` không tải lại; `contextVersion` của parent cũ; `refresh` lỗi làm mất thông báo | medium | `runProposalMutation` trả 409 với code này → patch |
| 11 | edge | Hiện cả các phiên bản tệp đã thay thế | low | Gộp vào #2 (nhãn và phiên bản) |
| 12 | edge | Tệp dưới 512 B hiện "1 KB" | low | Sửa trực tiếp → patch |
| 13 | blind | Khi bỏ trống tóm tắt, PI không thấy lý do từ chối | false | Đây là quyết định tạm đã ghi trong spec (tóm tắt không bắt buộc), không phải lỗi |
| 14 | verif | Trường hợp chỉ có yêu cầu tiếp theo chưa có test | low | defer |
| 15 | verif | Web client gửi trường công bố chưa có test runtime | medium | Repo không có test web runtime → defer, kiểm thủ công qua UI |
| 16 | codex (gpt-6-astra) | GĐ không cần `organizationScopes` vẫn xem gói và quyết định; AC đòi "GĐ có scope rõ ràng" | high | Có từ trước (`assertEvaluationReadScope` cố ý cho GĐ đọc toàn Học viện; `docs/permission-matrix.md` coi BGĐ là toàn Học viện). Người dùng chốt 09/11/2026: GĐ toàn Học viện (D-042) → false, đã sửa AC, không đổi code |
| 17 | codex (gpt-6-astra) | Gói dùng tệp active hiện tại, không theo version đã trình | low | Trùng #2 → reject |

## Verification

**Commands:**
- `npm run build:api && npx tsc -p apps/web --noEmit` -- không lỗi kiểu
- `node --test tests/approval-routing-db.test.mjs` -- PASS (cần DB test theo hướng dẫn trong file)
