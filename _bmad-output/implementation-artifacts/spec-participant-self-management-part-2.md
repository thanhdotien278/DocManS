---
title: 'TP/TB/CV phụ trách hồ sơ/đề tài mình tham gia (D-041 phần 2)'
type: 'feature'
created: '2026-11-08'
status: 'done'
baseline_commit: '5500dc67e7f636e495b24a58ee5d8f5211bd4d11'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/docs/permission-matrix.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-participant-self-management-config.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sau phần 1, TP/TB/CV tham gia hồ sơ/đề tài (PI, thành viên, thư ký) chỉ có thể được cho xem dữ liệu quản lý; mọi thao tác quản lý trên chính hồ sơ/đề tài đó vẫn bị chặn bởi luật xung đột (§7.3), trừ ngoại lệ D-038.

**Approach:** Thêm cột "Phụ trách" (`manage`) vào cấu hình `participant_policy`. Khi bật cho vai trò của người thao tác, backend bỏ qua xung đột *do tham gia* ở mọi kiểm tra phía người thao tác quản lý (actor) và ở kiểm tra ứng viên CV phụ trách; không đụng loại trừ ứng viên chấm điểm.

Quyết định của người dùng (08/11/2026):
- "Phụ trách" bật = mọi thao tác quản lý của vai trò đó trên hồ sơ/đề tài mình tham gia: giao/thu hồi CV phụ trách, mời/thu hồi hội đồng, lập/chuyển tờ trình (kể cả TB/TP xử lý bước tờ trình của hồ sơ mình), tổng hợp/chốt/lập tờ trình quyết định, nghiệp vụ đề tài (CV phụ trách, TP duyệt, kinh phí); trừ chấm điểm/phản biện và quyết định của GĐ.
- Bật "Phụ trách" kéo theo "Xem".
- Audit ghi lại khi một thao tác dùng ngoại lệ này.

## Boundaries & Constraints

**Always:**
- Mặc định `manage=false`; khi tắt, hành vi giữ đúng sau phần 1 (gồm ngoại lệ D-038).
- `participantPolicyFor(...).view` = `view || manage`; UI khóa ô Xem (đã tích) khi Phụ trách bật.
- Ngoại lệ chỉ bỏ xung đột do tham gia (`reasonCode: "participation"`); xung đột phản biện/đã chấm và ngữ cảnh không xác định vẫn chặn.
- Mutation đọc policy trong transaction của mutation; capability chỉ để hiển thị.
- Người tham gia vẫn không được mời làm phản biện/thành viên hội đồng/IRB, không chấm điểm; vẫn cấm tự phân công chính mình và tự rà soát tờ trình do mình lập (luật hiện có).
- Mutation dùng ngoại lệ ghi audit `participant-waiver-used` (actor, hồ sơ/đề tài, thao tác) trong cùng transaction.
- Cấu hình cũ chưa có khóa `manage` vẫn đọc được (coi `manage=false`); ghi mới luôn đủ ba khóa.

**Never:**
- Không đổi `ProposalParticipationService.evaluateConflict` toàn cục; không nới các điểm loại trừ ứng viên chấm điểm.
- Không đổi quyền quyết định của GĐ/PGĐ-KH (vai trò ngoài TP/TB/CV luôn mặc định).
- Không thêm migration schema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mặc định | TB là thành viên, `manage=false`, lưu tổng hợp | Chặn như hiện tại | `CONFLICT_DENIED` |
| Phụ trách bật | TB là thành viên, `TB.manage=true` | Tổng hợp, chốt, lập tờ trình được; capability mở; audit `participant-waiver-used` | N/A |
| Tờ trình | TP là PI, `TP.manage=true`, tờ trình hồ sơ ở bước TP, do người khác lập | TP chuyển/trả được; TP nhận thông báo chờ xử lý | N/A |
| Vẫn cấm tự rà soát | TB lập tờ trình rồi xử lý bước TB | Chặn | `APPROVAL_SELF_REVIEW` |
| Vẫn loại ứng viên | `TB.manage=true`, mời TB (PI) vào hội đồng | Bị loại | `CONFLICT_DENIED` |
| Đã phản biện | `TP.manage=true`, TP từng chấm hồ sơ | Chặn | `CONFLICT_DENIED` |
| CV phụ trách là thành viên | `CV.manage=true`, TP giao CV là thành viên làm CV phụ trách (đề xuất hoặc đề tài) | Cho phép | N/A |
| Đề tài | CV phụ trách là thành viên đề tài, `CV.manage=true` | Thao tác CV phụ trách được | N/A |
| Kéo theo Xem | `CV.manage=true`, `CV.view=false` | Đọc tiến độ/roster như `view=true` | N/A |

</frozen-after-approval>

## Code Map

Đường dẫn tương đối `apps/api/src` trừ khi ghi `web/`. Bucket A = actor quản lý (nới), B = ứng viên chấm/hội đồng (giữ).

- `proposals-shared/participant-policy.ts` -- thêm `manage` vào kiểu, mặc định, parse (đọc: thiếu `manage` → false; ghi: bắt buộc), `participantPolicyFor` trả `view: view || manage`.
- `proposal-evaluations/proposal-evaluation-support.ts:311` `resolveActorConflict`, `resolveReadConflict` (phần 1) -- thêm biến thể cho mutation dùng cùng logic với cờ `manage` và tùy chọn ghi audit `participant-waiver-used`; `:220` `assertScientificManagementScope` (A, CV write).
- `proposals-shared/approval-routing.ts:134` `actorConflicted` -- nhận actor có `systemRole` để áp `manage`; `:153` `assertStageActor`, `:231` lọc người nhận thông báo (select thêm `systemRole`), `:337` signer (GĐ/PGĐ: không đổi vì ngoài TP/TB/CV). Nhánh đề tài (`approvedProjectMember`) cũng áp `manage`.
- `permissions/proposal-capability-v1.ts:160,164,174,180,188,215` -- input `participantManage`; bỏ nhánh `isParticipant`/`evaluateProposalConflict` khi bật. Giữ `:205,207`.
- `proposal-evaluations/proposal-evaluation-summary.service.ts:304,415`; `proposal-review-assignments.service.ts:90,194,362` (A) — giữ `:118-124,235,242,479,556,591` (B) và `:161` `routingSoleHolderIds`; `proposal-evaluation-council.service.ts:80,121-145,200` (A, cờ `viewer.*` theo `manage`).
- `research-proposals/research-proposals.service.ts:1008` `assertNoProposalReviewConflict` (A, actor TP giao/thu hồi CV), `:686-695,720-721` ứng viên CV phụ trách là người tham gia (áp `manage` theo vai trò ứng viên), `:1044` CV phụ trách không được làm thành viên (nới khi CV phụ trách hiện hành có `manage`); truyền `participantManage` vào capability cạnh `participantView`.
- `approved-projects/approved-projects.service.ts:96` `assertOfficer`, `:230` tạo đề tài, `:333` ứng viên CV phụ trách là thành viên, `:751` CV phụ trách không làm thành viên, `:781` kinh phí, `:881` `assertHead`; `project-capability-v1.ts:78-79` (input mới). Giữ `:106` `assertNoEvaluationConflict`.
- `web/components/admin/admin-participant-policy-panel.tsx`, `web/lib/admin-api.ts` -- cột thứ ba; khóa ô Xem khi Phụ trách bật.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/proposals-shared/participant-policy.ts` -- `manage` như Code Map.
- [x] `apps/api/src/proposal-evaluations/proposal-evaluation-support.ts` -- helper mutation có `manage` + audit tùy chọn.
- [x] `apps/api/src/proposals-shared/approval-routing.ts` -- `actorConflicted` theo actor/policy; thông báo.
- [x] `apps/api/src/proposal-evaluations/*.service.ts` (summary, assignments, council) -- áp helper ở các điểm A.
- [x] `apps/api/src/permissions/proposal-capability-v1.ts`, `apps/api/src/approved-projects/project-capability-v1.ts` -- input `participantManage`.
- [x] `apps/api/src/research-proposals/research-proposals.service.ts` -- điểm A, ứng viên CV phụ trách, truyền capability.
- [x] `apps/api/src/approved-projects/approved-projects.service.ts` -- điểm A đề tài.
- [x] `apps/web/src/lib/admin-api.ts`, `apps/web/src/components/admin/admin-participant-policy-panel.tsx` -- cột Phụ trách.
- [x] `tests/participant-policy.test.mjs` -- các dòng I/O Matrix ở mức capability/helper/service khả thi (parse thiếu `manage`, `view||manage`, capability theo `participantManage`, helper giữ xung đột phản biện, `actorConflicted` theo vai trò, audit khi dùng ngoại lệ).
- [x] `docs/permission-matrix.md`, `docs/permission-matrix.vi.md`, `_bmad-output/architecture.md`, `_bmad-output/.decision-log.md` -- bổ sung D-041 phần 2 (tiếng Việt), ghi rõ TB/TP có thể xử lý tờ trình hồ sơ mình khi bật.

**Acceptance Criteria:**
- Given `manage=false` cho mọi vai trò, when chạy bộ test hiện có, then không test nào đổi kết quả do phần này.
- Given cấu hình đã lưu từ phần 1 (không có `manage`), when đọc, then không rơi về mặc định toàn bộ mà giữ `pi`/`view` và `manage=false`.

## Implementation Notes

- Helper mutation: `resolveManagerConflict(prisma, resolvers, actor, proposalId, operation?)` trong `proposal-evaluation-support.ts` dùng chung logic miễn với `resolveReadConflict` (`isWaivableParticipation`: chỉ `reasonCode: "participation"` có vai trò cụ thể). `manage=false` trả nguyên quyết định của `resolveActorConflict`. Chỉ ghi audit khi có `operation` và ngoại lệ thực sự được dùng; nhánh hiển thị (`getCouncil`, `candidates`, `resolveApprovalActions`, thông báo, danh sách ứng viên CV) không truyền `operation`.
- CV write scope: `assertProposalManagementWriteScope` truyền `manage` vào `assertScientificManagementScope` (không ghi audit); audit do kiểm tra xung đột của từng thao tác (`assertSynthesisActorIsEligible`, `submitCompletedPackage`, `submitCouncil`) ghi.
- `actorConflicted(tx, actor, row, operation?)` nhận actor có `systemRole`; nhánh đề tài miễn thành viên khi `manage`. Người nhận thông báo tờ trình select thêm `systemRole`; `notifications.service` cũng truyền actor nên danh sách thông báo không lọc mất.
- Đề tài: `assertOfficer`/`assertHead` (async, nhận `tx`), `createFromApprovedProposal`, ứng viên/giao CV đề tài là thành viên, CV phụ trách được thêm làm thành viên qua điều chỉnh, `canWriteFunding`, capability `canOperate`/`canHeadDecide` (input `participantManage`). `canSign` và các nhánh GĐ (`decideRequest`, `decideLiquidation`) không đổi.
- Ứng viên CV phụ trách đề xuất là người tham gia: áp `manage` của vai trò CV (ứng viên luôn là CV); `replaceMembers` cho CV phụ trách hiện hành vào nhóm khi vai trò CV bật Phụ trách.
- Không đổi (bucket B): `proposal-review-assignments.service.ts` ứng viên/nhận lời/chấm, `routingSoleHolderIds`, thư ký soạn tổng hợp, `proposal-reviews.service`, `proposal-decisions.service` (chỉ GĐ), capability `proposal.review.submit`.
- Một mutation có thể ghi hơn một dòng audit nếu đi qua nhiều kiểm tra dùng ngoại lệ (ví dụ đề tài: `assertHead` rồi ứng viên là thành viên); chấp nhận được, cùng transaction.

- Phát hiện khi kiểm UI 08/11 (lỗi từ phần 1): `listSystemParameters` trả cả khóa `participant_policy`, nên form "Tham số hệ thống" hiện JSON thô và bấm lưu sẽ bị 400. Đã loại khóa này khỏi danh sách chung (`admin-config.service.ts`).

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 1 | blind, edge | CV vừa là PI vừa là CV phụ trách đề tài tự duyệt báo cáo/yêu cầu của mình khi bật Phụ trách | false | Đúng frozen intent ("mọi thao tác quản lý… nghiệp vụ đề tài"); chỉ tờ trình có luật cấm tự rà soát sẵn. Báo người dùng như một rủi ro cần cân nhắc. |
| 2 | blind | Phụ trách nới cả `proposal.decision.approve/reject` trong capability | false | Trước đó đã chặn `ACTION_NOT_GRANTED` cho mọi vai trò khác GĐ; GĐ ngoài TP/TB/CV nên `manage` luôn false. |
| 3 | blind, edge, vgap | Audit ngoại lệ ghi trước các bước kiểm tra sau, có thể sót khi thất bại | false | `assignManagementOfficer`, `submitCouncil`, `ApprovedProjectsService.mutate` đều chạy trong `$transaction`; ném lỗi thì rollback cả audit. |
| 4 | blind, edge | Thiếu audit khi CV phụ trách được thêm làm thành viên (đề xuất, điều chỉnh đề tài) | medium | Trái "Mutation dùng ngoại lệ ghi audit" → patch. |
| 5 | blind | `officerMayParticipate` dùng cứng vai trò CV | low | CV phụ trách luôn là CV → loại. |
| 6 | blind | GET admin trả `view` lưu trữ thay vì hiệu lực | low | Panel hiển thị `view‖manage`; backend luôn tính hiệu lực → loại. |
| 7 | blind | JSDoc chồng sai chỗ | low | Sửa trực tiếp → patch. |
| 8 | blind | Đọc policy thừa mỗi lần gọi | low | Vài truy vấn nhỏ → loại. |
| 9 | blind | Tên `notInProject` gây hiểu nhầm; `assertHead` gọi `activeMember` hai lần | low | Không ảnh hưởng người dùng → loại. |
| 10 | blind, vgap | Nhánh bật Phụ trách ở đề tài, giao CV phụ trách đề xuất, capability chưa có test | medium | Patch: thêm test. |
| 11 | blind | Ô Xem bị khóa chỉ giải thích bằng `title` | low | Sửa trực tiếp (gợi ý hiển thị) → patch. |
| 12 | vgap | Panel admin chưa có test cột Phụ trách | maybe-false | Repo không có harness test web; sẽ kiểm bằng UI thật → không defer riêng. |
| 13 | blind | `assignReviewer` trả lỗi không ném vẫn commit audit ngoại lệ | low | Audit phản ánh một lần thử thật kèm audit thất bại → loại. |

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && node --test tests/participant-policy.test.mjs tests/authorization-v1.test.mjs tests/proposal-review-golden-flow.test.mjs tests/proposal-review-cardinality.test.mjs tests/approval-routing-db.test.mjs tests/approved-project-service.test.mjs` -- expected: PASS (test opt-in DB có thể skip).

**Manual checks (if no CLI):**
- Bật TB.Phụ trách: TB là thành viên hồ sơ `c2a85efb-…` thấy nút mời hội đồng bật; tắt lại thì khóa với lý do xung đột.
