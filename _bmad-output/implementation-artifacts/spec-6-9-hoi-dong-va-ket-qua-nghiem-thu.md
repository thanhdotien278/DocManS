---
title: 'Story 6.9 — Hội đồng nghiệm thu và kết quả nghiệm thu'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_commit: '3da00e949c95cdecbb53458716b4dec2dc326b9e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-6-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-8-chuan-bi-va-nop-ho-so-nghiem-thu.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sau khi PI nộp hồ sơ nghiệm thu (6.8), đề tài dừng ở `pending_acceptance`. Không có hội đồng nghiệm thu, không có tờ trình `ACCEPTANCE_COUNCIL` và không ai chuyển đề tài sang `accepted`/`failed`. Vì vậy thanh lý (6.12/6.13, `LIQUIDATABLE`) không bao giờ chạy được.

**Approach:** Thêm bảng thành viên hội đồng nghiệm thu gắn với `ApprovedProject`, theo khuôn mời/nhận lời của hội đồng đánh giá đề xuất (5.10/5.11). Người được cấu hình lập hội đồng (`readCouncilFormationConfig("ACCEPTANCE")` + `canFormCouncil`) mời thành viên. Khi mọi thành viên nhận lời thì lập tờ trình `ACCEPTANCE_COUNCIL` qua routing 5.9 (TB → TP → GĐ/PGĐ-KH ký). Ký xong thì hội đồng được thành lập và thành viên được đọc hồ sơ. Chủ tịch không xung đột ghi kết quả: đạt → `accepted`, không đạt → `failed`. Mỗi bước là một transaction gồm state, lịch sử, audit và thông báo.

## Boundaries & Constraints

**Always:**
- Mỗi đề tài một hội đồng nghiệm thu (D-034). Không có bản ghi riêng cho từng cấp (sản phẩm, cơ sở, cấp trên).
- Lập hội đồng và mời chỉ khi đề tài ở `pending_acceptance` và hồ sơ `submitted`.
- Thành viên: mọi role trừ QT, có hồ sơ khoa học, đang active. Không phải thành viên đề tài đang hiệu lực. Một người giữ một vị trí.
- Từ chối lời mời bắt buộc có lý do. Thu hồi bắt buộc có lý do và giữ lại lịch sử.
- Chỉ trình tờ trình khi đủ cơ cấu và mọi thành viên đã `accepted`. Ký kiểm tra lại cơ cấu trong cùng transaction.
- Ký dùng `closeApprovalSubmission`. Người ký là GĐ hoặc PGĐ-KH, không xung đột và không là thành viên hội đồng. TP, TB, CV, PP, PGĐ-TD không ký được.
- Ghi kết quả: chỉ chủ tịch của hội đồng đã thành lập. Kiểm tra lại trong transaction rằng chủ tịch không phải thành viên đề tài. Không áp ngoại lệ "Phụ trách" (participant waiver). Thành viên khác, CV, TB, TP, PI và thư ký đề tài đều bị từ chối.
- Ghi kết quả thành công: đề tài `pending_acceptance → accepted|failed`, tăng `aggregateVersion`. Ghi `projectHistory` và audit. Thông báo PI, CV phụ trách và thành viên hội đồng.
- Thành viên đã nhận lời của hội đồng đã thành lập được đọc hồ sơ nghiệm thu và tệp của nó, không được sửa.
- Capability dùng Authorization Contracts V1 hiện có. Client gửi `contextVersion` cũ thì bị 409.

**Never:**
- Không thêm endpoint đặt status tùy ý. Ngoài đường ghi kết quả, không đường nào chuyển sang `accepted`/`failed`.
- Không tổng quát hóa `ProposalReviewAssignment` dùng chung cho đề tài.
- Không thêm bản ghi nghiệm thu cấp trên (6-13 cũ đã bỏ).
- Không sửa luồng thanh lý.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected | Error |
|---|---|---|---|
| Người được cấu hình mời | `pending_acceptance`, ứng viên hợp lệ | Lời mời `invited`, audit, thông báo người được mời | — |
| Mời thành viên đề tài hoặc QT | — | Từ chối | 400 `COUNCIL_MEMBER_INELIGIBLE` |
| CV không được tick trong cấu hình | — | Từ chối | 403 `COUNCIL_FORMATION_DENIED` |
| Mời khi đề tài `executing` | — | Từ chối | 400 `WORKFLOW_STATE_DENIED` |
| Trình khi còn người chưa nhận lời | — | Từ chối, trả danh sách thiếu | 400 `COUNCIL_NOT_READY` |
| TB rồi TP chuyển bước, GĐ ký | Tờ trình ở LEADERSHIP | Tờ trình `APPROVED`, đóng dấu `councilEstablishedAt`, thành viên đọc được hồ sơ | — |
| TP hoặc CV ký | — | Từ chối | 403 `APPROVAL_SIGNER_DENIED` |
| Chủ tịch ghi thiếu nhận xét hoặc chưa có biên bản | — | Từ chối | 400 `READINESS_INCOMPLETE` |
| Chủ tịch ghi "đạt" | Hội đồng đã thành lập, có biên bản | Đề tài `accepted`, lịch sử, audit, thông báo | — |
| Chủ tịch ghi "không đạt" | Hội đồng đã thành lập | Đề tài `failed` | — |
| Ủy viên, CV, TP hoặc PI ghi kết quả | — | Từ chối | 403 `ACTION_NOT_GRANTED` |
| Chủ tịch ghi khi hội đồng chưa ký | — | Từ chối | 400 `WORKFLOW_STATE_DENIED` |
| Ghi kết quả lần hai | Đề tài đã `accepted`/`failed` | Từ chối | 400 `WORKFLOW_STATE_DENIED` |
| Sau `accepted`/`failed` | — | Mở được thanh lý (`LIQUIDATABLE`) | — |

## Quyết định (người dùng chốt 2026-11-12)

- Phạm vi: spec này chỉ làm backend, API, quyền, tệp và test. Giao diện web tách sang phần 2 (`deferred-work.md`).
- Cơ cấu: đúng 1 chủ tịch (`council_chair`), 1 thư ký (`council_secretary`), còn lại ủy viên (`committee_member`); tổng số bằng `memberCount` của cấu hình `ACCEPTANCE` (mặc định 7).
- Ghi kết quả: chủ tịch ghi trực tiếp, kèm nhận xét bắt buộc và tệp biên bản họp hội đồng bắt buộc (`ACCEPTANCE_MINUTES`). Không có phiếu của từng thành viên.
- Yêu cầu bổ sung hồ sơ đã nộp: tách story riêng (`deferred-work.md`).
- Tờ trình bị TB/TP trả lại hoặc GĐ từ chối: giữ danh sách thành viên; người lập thu hồi/mời thêm rồi trình lại. Không cần nhánh mới trong `revertSourceOnReturn`.

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` + migration `20261112000000_acceptance_council` -- model mới `AcceptanceCouncilMember`: `projectId`, `userId`, `councilRole`, `invitationStatus` (invited/accepted/declined/revoked), `declineReason`, `revokeReason`, `invitedById`, `respondedAt`, `councilEstablishedAt`. Mô phỏng các cột của `ProposalReviewAssignment` (:630). Thêm quan hệ ngược trên `ApprovedProject` và `User`.
- `tests/smoke.test.mjs` -- thêm model vào danh sách model có thứ tự.
- `packages/permissions/src/index.ts`, `index.js` (viết tay), `apps/api/src/permissions/permission-policy.ts` -- thêm action `acceptance-council.invite|revoke|respond|submit|sign|record-result`.
- `apps/api/src/approved-projects/project-capability-v1.ts` -- thêm vào `PROJECT_ACTIONS`, thêm hàm từ chối. Chủ tịch ghi kết quả bỏ qua waiver.
- `apps/api/src/approved-projects/acceptance-council.service.ts` (mới) -- invite, revoke, respond, candidates, submit, sign, recordResult. Dùng `mutate`/`loadAuthorized`/`currentOfficer` (approved-projects.service.ts:92–125). Mời theo khuôn `proposal-review-assignments.service.ts` (`assignReviewer` :192, `respondToInvitation` :545). Trình và ký theo khuôn `proposal-evaluation-council.service.ts` (`submitCouncil` :203, `decideCouncil` :221) và `decideRequest` (approved-projects.service.ts:707). Dùng `readCouncilFormationConfig(prisma,"ACCEPTANCE")`, `canFormCouncil` (council-formation.ts:97, :122), `openApprovalSubmission`/`closeApprovalSubmission` với `subjectType:"project"`, và `actorConflicted` (approval-routing.ts:138).
- `apps/api/src/proposals-shared/approval-routing.ts` -- không sửa; trả lại/từ chối giữ nguyên danh sách. Đánh dấu phần `ACCEPTANCE_COUNCIL` ở `deferred-work.md:257` là đã làm.
- `apps/api/src/approved-projects/acceptance-dossiers.service.ts` `get` + `modules/files/files.service.ts` `assertCanRead` -- cho thành viên hội đồng đã thành lập quyền đọc. Thêm purpose `ACCEPTANCE_MINUTES` cho entity `acceptance_dossier`: chỉ chủ tịch tải/xóa, khi hội đồng đã thành lập và chưa có kết quả; không bị khóa bởi `assertUnsubmittedFile`. Kết quả ghim id tệp biên bản.
- `approved-projects.controller.ts`, `.module.ts`, `.dto.ts` -- route `:id/acceptance-council/...`, pipe viết tay.
- `apps/api/src/notifications/notification-events.ts` -- source type `acceptance_council`, dùng `notifyUsers`.
- `docs/permission-matrix.md` (dòng :400, mục mời :689) và `sprint-status.yaml` -- cập nhật cùng change set.
- Test mẫu: `tests/approval-routing-db.test.mjs` (`projectFixture` :539, test hội đồng 5.10 :398/:508, test thanh lý :729) và `tests/acceptance-dossier-db.test.mjs`.

## Tasks & Acceptance

**Execution:**
- [x] schema, migration, smoke -- thêm model.
- [x] permissions + capability -- thêm action và luật từ chối.
- [x] `acceptance-council.service.ts` + controller -- mời, phản hồi, thu hồi, trình, ký, ghi kết quả.
- [x] routing + quyền đọc hồ sơ và tệp cho thành viên hội đồng.
- [x] `tests/acceptance-council-db.test.mjs` -- các dòng của ma trận I/O, gồm chạy hết luồng tới thanh lý.

**Acceptance Criteria:**
- Given đề tài vừa `accepted` hoặc `failed`, when CV lập biên bản thanh lý và GĐ ký, then đề tài `closed` qua luồng thanh lý hiện có.
- Given hội đồng đã thành lập, when thành viên GET hồ sơ nghiệm thu, then nhận dữ liệu chỉ đọc; người bị thu hồi hoặc chưa nhận lời bị từ chối.

## Implementation Notes

- `respond` không nhận `contextVersion` (người được mời không đọc được đề tài): khóa đề tài rồi cập nhật có điều kiện hàng còn `invited` (như 5.11, `SKIP_CONTEXT`).
- Người không có `project.read` dùng `loadAuthorized(..., { dossierReader | councilSeat })`: thành viên đã nhận lời của hội đồng đã ký chỉ có `acceptance-dossier.read`; người có ghế chỉ thấy ghế của mình ở `GET :id/acceptance-council`.
- Trình tờ trình: TP, TB hoặc CV phụ trách (như `submitCouncil`), không theo cấu hình lập hội đồng; mời/thu hồi theo cấu hình `ACCEPTANCE`.
- Kết quả lưu ở `projectHistory` `project.acceptance.result` (nhận xét ở `reason`, `afterFacts.minutesFileId` ghim biên bản mới nhất); không thêm cột.
- Thông báo `acceptance_council` có `sourceId` là đề tài; hiện khi người xem còn ghế chưa thu hồi hoặc xem được đề tài (`notifications.service.ts`, ngoài Code Map).
- `permission-policy.ts` không chứa danh sách action ID nên không sửa.

- Sau review: `respond` khi từ chối trả `{ memberId, invitationStatus: "declined" }` thay cho view hội đồng (người từ chối mất ghế nên không đọc được view). UI phần 2 cần xử lý.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 1 | blind+vgap | `recordResult` coi mọi outcome khác "accepted" là `failed`; `invite` không kiểm role | medium | Chỉ pipe chặn; gọi service trực tiếp ghi nhầm trạng thái cuối. Patch. |
| 2 | blind | Capability `sign` hiện cho GĐ là thành viên đề tài, service lại từ chối | low | Sửa trực tiếp một điều kiện. Patch. |
| 3 | blind | Không có unique index một-ghế ở DB | low | Service chạy dưới khóa `mutate`; thêm ràng buộc là thêm độ phức tạp. Bỏ qua. |
| 4 | blind | Hội đồng đã thành lập không thay được chủ tịch → đề tài kẹt `pending_acceptance` | low | Hiếm (chủ tịch mất/vào đề tài sau khi ký); cần luồng mới. Bỏ qua, báo người dùng. |
| 5 | blind | QT đổi `memberCount` khi tờ trình đang chờ → ký luôn lỗi | low | Hiếm; TB/TP trả lại là đường thoát. Bỏ qua. |
| 6 | blind | Link thông báo mời trỏ `/projects/{id}` người được mời không mở được | low | Chưa có trang đích; thuộc UI phần 2 (deferred). Bỏ qua. |
| 7 | blind+edge | revoke/respond/reject không gửi thông báo, lệch Approach | medium | Patch: thông báo người mời (nhận lời/từ chối) và người trình (GĐ từ chối). Bỏ thông báo thu hồi vì bộ lọc ghế ẩn nó với chính người nhận. |
| 8 | blind | `loadAuthorized` thêm truy vấn; `.catch` trong transaction | low | Catch chỉ nuốt lỗi parse cấu hình (503), không phải lỗi DB. Bỏ qua. |
| 9 | blind | Ma trận quyền ghi "up to memberCount" | low | Sửa chữ trực tiếp. Patch. |
| 10 | blind+edge | Người đã từ chối vẫn giữ quyền ghế và thấy thông báo | low | Sửa điều kiện seat. Patch. |
| 11 | blind | Mục `deferred-work.md` tự mâu thuẫn | low | Sửa chữ. Patch. |
| 12 | blind | Pipe hard-code danh sách role | low | Dùng hằng có sẵn. Patch. |
| 13 | vgap | Pipe không có test | medium | Pre-verified. Patch test. |
| 14 | vgap | Chủ tịch xóa biên bản trước kết quả chưa test | medium | Pre-verified. Patch test. |
| 15 | vgap | Lọc thông báo người bị thu hồi chưa test | medium | Pre-verified. Patch test. |
| 16 | vgap | Submit bởi PI chưa test; `sign` allowedActions chưa test | medium | Patch test submit; `sign` chưa có người dùng tới UI phần 2. |
| 17 | edge | Ký không kiểm lại thành viên đã nhận lời nay vào đề tài/bị khóa | medium | Lệch Always "Ký kiểm tra lại". Patch. |
| 18 | edge | Người lập tự mời mình; người có ghế tự trình tờ trình | medium | Patch: chặn tự mời, chặn trình bởi người có ghế, và `actorConflicted` coi người có ghế là xung đột với tờ trình `ACCEPTANCE_COUNCIL` (TB/TP không chuyển bước). |
| 19 | edge | `view()` 503 khi cấu hình hỏng | false | Fail-closed đúng thiết kế `readCouncilFormationConfig`. |
| 20 | edge | Đề tài rời `pending_acceptance` khi tờ trình đang chờ | false | Chỉ `recordResult` đổi trạng thái và cần hội đồng đã ký; không xảy ra. |

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && DATABASE_URL=… node --test tests/acceptance-council-db.test.mjs tests/approval-routing-db.test.mjs tests/smoke.test.mjs` -- expected: PASS.
