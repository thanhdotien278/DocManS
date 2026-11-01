---
title: 'Story 4.6: Nộp chính thức và xem lịch sử nộp đề xuất (phần còn thiếu)'
type: 'feature'
created: '2026-11-01'
status: 'in-review'
baseline_commit: 'b9dacadafd570c9a8d82fbb1f1fc7f1279d749a4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `submitProposal` đã có (readiness, đợt mở, owner-only, transition + `ProposalSubmissionEvent` + audit) nhưng sự kiện nộp chưa ghi context authorization, timeline chưa hiện số phiên bản nộp trên từng sự kiện, và chưa có test cho các AC: vai trò không phải PI, EXTERNAL, hai request nộp đồng thời, context version cũ.

**Approach:** Bổ sung phần thiếu, không viết lại luồng nộp. Ghi context token (`proposalContextVersion`) vào snapshot của event nộp/nộp lại; gắn `submissionVersion` (thứ tự nộp, 1-based) vào history trả về; hiện trên Timeline. Thêm test hành vi cho các AC.

## Boundaries & Constraints

**Always:** Nộp là owner-only (PI hiện tại); thư ký, delegate, member, TP/PP/TB/CV/BGĐ, EXTERNAL, QT/NNB bị từ chối trước mutation, không tạo event. Re-authorize và đổi state trong cùng transaction (`runProposalMutation`, Serializable, context token bắt buộc). Hai request đồng thời: đúng một thành công, request kia nhận 409 `CONTEXT_VERSION_MISMATCH`, không event trùng. Không migration: dùng cột `snapshot` Json hiện có; `submissionVersion` suy ra khi đọc, không lưu.

**Never:** Không thêm state mới, không đổi `resubmit`/`completeCheck`, không đụng 4.7 (gán CV khi nộp). Không đổi hợp đồng readiness 4.5. Không thêm route `/proposals/:id/submit` (panel nộp hiện có giữ nguyên).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Nộp hợp lệ | PI, readiness đạt, đợt mở, context token đúng | `status=submitted`; 1 event có actor, thời điểm, bộ tệp (kèm `version`), context token; history có `submissionVersion=1` | N/A |
| Không phải PI | Thư ký/member/TP/CV/BGĐ gọi nộp | Từ chối, không đổi state, không event | 403 |
| EXTERNAL | EXTERNAL_RESEARCHER_USER gọi nộp | Như trên | 403 |
| Nộp đồng thời | 2 request cùng context token | Một thành công | Request kia 409 `CONTEXT_VERSION_MISMATCH` |
| Context cũ | Token lỗi thời sau khi hồ sơ đổi | Không đổi state | 409 `CONTEXT_VERSION_MISMATCH` |
| Chưa sẵn sàng | Thiếu field/tệp hoặc đợt đóng | Giữ `draft`, không event | 400 kèm `missingFields`/`missingFiles` |

</frozen-after-approval>

## Code Map

- `apps/api/src/research-proposals/research-proposals.service.ts` -- `submitProposal` (~415), `submissionSnapshot` (~848), `listHistoryForProposal` (~1531), `toProposalDetailResponse`/`versions` (~1259); thêm context token vào snapshot và `submissionVersion` vào history (chỉ đếm event `submitted`/`resubmitted`, bỏ event `kind`).
- `apps/api/src/proposals-shared/proposal-mutation.ts` -- `proposalContextVersion`, `runProposalMutation` (409 đã có); tái dùng, không sửa.
- `apps/web/src/components/research-proposals/proposal-detail-workspace.tsx` -- Timeline (~989): hiện "Phiên bản N" cho sự kiện nộp.
- `apps/web/src/lib/research-proposals-api.ts` -- thêm `submissionVersion?: number` vào kiểu history.
- `tests/proposals-ep02.test.mjs` (~932) -- mở rộng test submit hiện có; `tests/authorization-v1.test.mjs` là mẫu `CONTEXT_VERSION_MISMATCH`.

## Tasks & Acceptance

**Execution:**
- [x] `research-proposals.service.ts` -- ghi `contextVersion` vào snapshot event nộp; thêm `submissionVersion` vào history -- bằng chứng lần nộp và version
- [x] `research-proposals-api.ts`, `proposal-detail-workspace.tsx` -- kiểu + hiển thị phiên bản nộp trên Timeline -- AC timeline
- [x] `tests/proposal-submit-4-6-db.test.mjs` (mới, PostgreSQL thật) -- thêm test: vai trò không phải PI/EXTERNAL bị từ chối không event; nộp đồng thời; context cũ; event có context token và `submissionVersion` -- bảo vệ AC

**Acceptance Criteria:**
- Given hồ sơ đã nộp, when PI hoặc người được xem mở detail, then Timeline hiện trạng thái, thời điểm và phiên bản nộp, và hành động sửa/nộp bị khóa theo state machine.

## Implementation Notes

- `tests/proposals-ep02.test.mjs` đã hỏng sẵn 9/10 test (mock thiếu `tx.user`, có trước 4.6) nên test mới đặt ở file DB thật; không sửa file ep02.
- `authorizationContext` ghi qua `submissionSnapshot` nên áp cho cả nộp lại.

## Spec Change Log

## Review Triage Log

| Phát hiện | Mức | Xử lý |
|---|---|---|
| Request thua khi nộp đồng thời nhận lỗi Prisma thô (P2010/SQLSTATE 40001 từ `$queryRaw FOR UPDATE`), không phải 409 | high | Sửa `runProposalMutation` map P2010+40001 sang 409 `CONTEXT_VERSION_MISMATCH`; test khẳng định 409 |
| `authorizationContext` nằm trong `versions[].content` nên người xem hồ sơ thấy bộ đếm version nội bộ | low | Giữ nguyên, không lộ dữ liệu ngoài phạm vi |

## Verification

**Commands:**
- `node --test tests/proposal-submit-4-6-db.test.mjs tests/proposal-readiness-4-5.test.mjs` -- expected: PASS
- `npm run typecheck` (hoặc lệnh tương đương của repo) -- expected: không lỗi
