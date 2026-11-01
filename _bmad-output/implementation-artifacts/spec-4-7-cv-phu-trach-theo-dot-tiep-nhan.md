---
title: 'Story 4.7: CV phụ trách theo đợt tiếp nhận'
type: 'feature'
created: '2026-11-01'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Đợt tiếp nhận chưa có CV phụ trách, nên hồ sơ nộp vào đợt không tự có người xử lý (D-038, cập nhật 2026-11-01).

**Approach:** Lưu một CV phụ trách trên mỗi đợt. TP chọn CV khi tạo/sửa đợt và không mở được đợt chưa có CV; CV mở đợt chưa có CV thì hệ thống gán chính CV đó. PI nộp lần đầu thì hồ sơ nhận CV của đợt làm `PROPOSAL_MANAGEMENT_OFFICER`.

**Quyết định (người dùng chốt 2026-11-01):** TP đổi CV của đợt đã có hồ sơ → chuyển sang CV mới các hồ sơ trong đợt đang do CV cũ của đợt phụ trách hoặc chưa có CV; hồ sơ TP/TB đã giao riêng cho người khác giữ nguyên.

## Boundaries & Constraints

**Always:**
- Đợt `open` luôn có CV phụ trách. Gán CV khi CV mở đợt diễn ra cùng transaction với việc mở; audit ghi `actorId: null` (System) kèm người mở trong `reason`.
- CV của đợt là `RESEARCH_MANAGEMENT_STAFF` đang `active`. Chỉ TP chọn/đổi CV qua tạo/sửa đợt.
- Gán CV cho hồ sơ khi nộp diễn ra cùng transaction với việc nộp và bỏ qua kiểm tra xung đột PI/thành viên (D-038). Hồ sơ đã có CV active giữ nguyên. `resubmitProposal` không gán CV.
- Mỗi lần ghi officer tăng các `authorization*Version` của hồ sơ như `assignManagementOfficer`.

**Never:**
- Không tạo bảng lịch sử riêng cho CV của đợt; lịch sử lấy từ audit log.
- Không đổi luồng giao/thu hồi CV theo từng hồ sơ hiện có.
- Không làm phần hiển thị CV cho PI và danh sách hồ sơ theo đợt cho CV (đã chuyển sang `deferred-work.md`), không làm Story 4.8.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| TP mở đợt chưa có CV | `openPeriod`, `responsibleOfficerUserId = null` | Đợt giữ `draft` | 400 "Cần chọn chuyên viên phụ trách trước khi mở đợt." |
| CV mở đợt chưa có CV | `openPeriod` bởi CV | Đợt `open`, CV của đợt = CV đó | N/A |
| Mở đợt đã có CV | TP hoặc CV khác mở | Giữ CV hiện có | N/A |
| TP chọn CV không hợp lệ | Không phải CV active | Không lưu | 400 |
| CV gửi `responsibleOfficerUserId` | CV tạo/sửa đợt với giá trị khác hiện tại | Không lưu | 403 |
| TP đổi CV đợt có hồ sơ | Đợt có hồ sơ của CV cũ, hồ sơ chưa có CV, hồ sơ giao riêng | Hai loại đầu sang CV mới; hồ sơ giao riêng giữ nguyên | Lỗi → rollback toàn bộ |
| PI nộp hồ sơ | Đợt có CV, hồ sơ chưa có CV active | Tạo officer ACTIVE là CV của đợt | Lỗi → rollback việc nộp |
| Đợt cũ đang mở chưa có CV | PI nộp | Nộp thành công, hồ sơ chưa có CV | N/A |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- `ProposalIntakePeriod` (:413): thêm `responsibleOfficerUserId String?` (relation `User`), `responsibleOfficerAssignedById String?`, `responsibleOfficerAssignedAt DateTime?`; migration mới trong `apps/api/prisma/migrations/`.
- `apps/api/src/proposal-intake-periods/proposal-intake-periods.service.ts` -- `createPeriod` (:166), `updatePeriod` (:207), `openPeriod` (:264), `toResponse` (:357). Mutation đã chạy trong `mutate()` có khóa `FOR UPDATE`.
- `apps/api/src/proposal-intake-periods/proposal-intake-periods.controller.ts`, `.dto.ts` -- field `responsibleOfficerUserId`; endpoint `GET /proposal-intake-periods/officer-candidates` (chỉ TP; CV active trong scope).
- `apps/api/src/proposals-shared/proposal-access.ts` -- dùng lại `isResearchManagementHead/Staff`, `assertCanManageIntakePeriods`.
- `apps/api/src/research-proposals/research-proposals.service.ts` -- `submitProposal` (:374): thêm tạo officer trong `$transaction`; mẫu ghi officer + version ở `assignManagementOfficer` (:623–711). Audit `actorId: null`.
- `apps/web/src/lib/proposal-intake-periods-api.ts` -- type thêm `responsibleOfficer`, hàm `loadIntakeOfficerCandidates`.
- `apps/web/src/components/proposal-intake-periods/proposal-intake-periods-panel.tsx` -- dialog tạo/sửa (:274–348) thêm select CV cho TP; cột "CV phụ trách" (bảng :200, thẻ :240); `handleStatusAction` (:143) hiện xác nhận khi CV mở đợt chưa có CV.
- `tests/proposals-ep02.test.mjs` -- `createOpenIntake` (:425) mở đợt bằng CV; mở rộng tại đây. `proposals-st30` có 11 test hỏng sẵn (xem `deferred-work.md`), không tính.

## Tasks & Acceptance

**Execution:**
- [ ] `apps/api/prisma/schema.prisma` + migration -- thêm 3 cột -- nguồn dữ liệu CV của đợt.
- [ ] `proposal-intake-periods.service.ts/.controller.ts/.dto.ts` -- validate CV, chặn TP mở khi thiếu CV, gán khi CV mở, đổi CV kèm chuyển hồ sơ theo Quyết định, endpoint ứng viên, trả `responsibleOfficer { userId, displayName }` -- I/O 1–6.
- [ ] `research-proposals.service.ts` -- gán CV của đợt khi nộp -- I/O 7–8.
- [ ] `proposal-intake-periods-api.ts`, `proposal-intake-periods-panel.tsx` -- select CV, cột CV, xác nhận khi CV mở.
- [ ] `tests/proposals-ep02.test.mjs` -- TP mở thiếu CV bị từ chối; CV mở được gán; nộp hồ sơ nhận CV của đợt; TP đổi CV chuyển đúng hồ sơ.

**Acceptance Criteria:**
- Given TP tạo đợt có chọn CV, when TP mở đợt, then đợt `open` với CV đã chọn và audit ghi actor, đợt, CV.
- Given đợt chưa có CV, when CV bấm mở, then giao diện báo CV sẽ thành CV phụ trách, và sau khi mở bảng hiển thị tên CV đó.
- Given TP đổi CV của đợt, when lưu, then audit ghi CV cũ/mới và danh sách hồ sơ bị chuyển.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run build:api && node --test tests/proposals-ep02.test.mjs tests/intake-templates.test.mjs tests/intake-dates.test.mjs` -- expected: pass
- Build/typecheck web theo script trong `package.json` -- expected: không lỗi type

**Manual checks (if no CLI):**
- Chạy app, đăng nhập TP và CV (`docs/development/auth-seed-users.md`), thử tạo đợt, mở đợt, đổi CV, nộp hồ sơ bằng PI.
