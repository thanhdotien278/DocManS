---
title: 'Story 6.8 (phần 2: giao diện) — Hồ sơ nghiệm thu'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '314a9144316b92c88848b8afc35309f92a129d9e'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-8-chuan-bi-va-nop-ho-so-nghiem-thu.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-10-3-p2-giao-dien-ho-so-dao-duc.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Backend hồ sơ nghiệm thu đã có (phần 1), nhưng PI, thư ký và thành viên phụ trách mốc chưa có giao diện để tạo, soạn, đóng góp tệp và nộp hồ sơ; CV phụ trách chưa có chỗ xem hồ sơ đã nộp.

**Approach:** Theo khuôn `EthicsDossierWorkspace` (10.3 phần 2): thêm trang `/projects/[id]/acceptance-dossier` gồm 4 thẻ mục, bảng đối chiếu mốc, thẻ tệp theo purpose, thẻ nộp có danh sách thiếu; sau khi nộp chỉ còn chế độ xem. Trang chi tiết đề tài có thẻ dẫn vào.

## Boundaries & Constraints

**Always:**
- Nút hiện theo `allowedActions`/`blockedActions` (`acceptance-dossier.create|edit|contribute|submit`) của `GET …/acceptance-dossier`; nút bị khóa hiện lý do. Không suy quyền từ vai trò.
- Có `acceptance-dossier.edit` (PI, nháp): soạn 4 mục và tải tệp mọi purpose. Chỉ có `acceptance-dossier.contribute`: chỉ tải `ACCEPTANCE_CONTRIBUTION`. Nút xóa tệp theo `files[].canDelete` do backend tính.
- Mỗi thao tác ghi gửi `contextVersion` mới nhất; lưu mục lấy view từ response, thao tác tệp thì GET lại. Lỗi `CONTEXT_VERSION_MISMATCH` hiện hướng dẫn "Tải lại" và giữ phần đang sửa dở (như hồ sơ đạo đức).
- `READINESS_INCOMPLETE` và thẻ nộp hiện các danh sách thiếu bằng nhãn tiếng Việt: mục, mốc chưa giải trình (theo tên mốc), tệp, số yêu cầu điều chỉnh/gia hạn chưa kết thúc, số báo cáo tiến độ đang chờ CV xét.
- Thông báo nộp hồ sơ trỏ `/projects/{id}/acceptance-dossier`.
- Nhãn lịch sử tiếng Việt cho `acceptance-dossier.create|submit|file.upload|file.metadata|file.delete` và `project.acceptance.submit`.

**Never:** đổi quyền hay readiness ở backend; hủy nháp; rút hoặc bổ sung hồ sơ đã nộp; hội đồng nghiệm thu (6.9); thêm thư viện.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|---|---|---|
| PI, chưa có hồ sơ | `executing` | Nút "Tạo hồ sơ nghiệm thu" |
| PI soạn | `draft` | 4 thẻ có ô nhập + "Lưu mục"; tải tệp 4 purpose |
| Thư ký / thành viên phụ trách mốc | `draft` | Mục chỉ đọc; chỉ ô tải "Tệp đóng góp"; xóa được tệp của mình |
| CV phụ trách | bất kỳ | Chỉ xem; không có ô tải, nút sửa hay nộp |
| PI nộp thiếu | readiness chưa đạt | Danh sách thiếu, không đổi trạng thái |
| PI nộp đủ | readiness đạt | Hộp xác nhận → chế độ chỉ đọc, bảng phiên bản đã nộp, đề tài "Chờ nghiệm thu" |
| Xung đột | `contextVersion` cũ | Thông báo tải lại, giữ bản sửa dở |

</frozen-after-approval>

## Code Map

- `apps/web/src/lib/projects-api.ts` -- thêm kiểu `AcceptanceDossierView`, `ACCEPTANCE_SECTION_LABELS`, `ACCEPTANCE_FILE_LABELS`, `acceptanceDossierStatusLabel`, get/create/saveSection/submit, upload (`relatedEntityType: "acceptance_dossier"`). Dùng lại `json()`, `projectFileUrl`, `deleteEthicsFile` (gọi `DELETE /files/:id` chung) — đổi tên thành hàm chung nếu gọn. Thêm `acceptanceDossier?` vào `ProjectRecord` và nhãn lịch sử vào `HISTORY_ACTION_LABELS`.
- `apps/web/src/components/projects/acceptance-dossier-workspace.tsx` (mới) -- sao cấu trúc `ethics-dossier-workspace.tsx`: `act()`, dirty set, reseed theo view. `products` là danh sách dòng thêm/xóa; `milestoneNotes` lưu nguyên object, ô giải trình chỉ cho mốc chưa `completed`.
- `apps/web/src/app/projects/[id]/acceptance-dossier/page.tsx` (mới) -- như `ethics-dossier/page.tsx`.
- `apps/web/src/components/projects/project-detail.tsx` -- thẻ "Hồ sơ nghiệm thu" cạnh thẻ hồ sơ đạo đức (`:138`), hiện khi có `project.acceptanceDossier` hoặc được `acceptance-dossier.create`.
- `apps/api/src/approved-projects/acceptance-dossiers.service.ts` -- `view()` thêm `files[].canDelete` = nháp và (`edit` hoặc (`contribute` và tệp của mình)), cùng luật `files.service.ts:517`; link thông báo đổi về `/acceptance-dossier`.
- `tests/acceptance-dossier-db.test.mjs` -- `seesNotification` so link mới; thêm assert `canDelete`.

## Tasks & Acceptance

**Execution:**
- [x] `projects-api.ts` -- kiểu, nhãn, hàm API.
- [x] `acceptance-dossier-workspace.tsx` + `page.tsx` -- workspace và route.
- [x] `project-detail.tsx` -- thẻ lối vào.
- [x] `acceptance-dossiers.service.ts` + test -- `canDelete`, link thông báo.

**Acceptance Criteria:**
- Given hồ sơ đã nộp, when bất kỳ ai mở trang, then không còn ô nhập, ô tải hay nút xóa/nộp, và hiện bảng phiên bản đã nộp.
- Given thông báo "Hồ sơ nghiệm thu đã được nộp", when CV bấm, then mở `/projects/{id}/acceptance-dossier`.

## Implementation Notes

- Checkpoint 1 bỏ qua: session cha giao việc với phạm vi và quyết định đã chốt (09/11/2026).
- Dùng lại `ethicsCan`/`ethicsDenial` (nới kiểu tham số) và `uploadEthicsFile` (thêm tham số `relatedEntityType`), `deleteEthicsFile` cho tệp nghiệm thu; không đổi hành vi hồ sơ đạo đức.
- Người đóng góp = có `contribute` nhưng không có `edit` (PI cũng có `contribute`). Thẻ sản phẩm khóa "Lưu mục" khi còn dòng chưa có tên (backend trả `SECTION_INVALID`).
- Preview chạy trên DB riêng `docmans_68p2` (migrate + seed + dữ liệu tạo bằng script trong scratchpad), không đụng DB dev chung.
- Matrix test audit: các dòng ma trận là hành vi giao diện, kiểm bằng preview (PI, `int2`, CV); quyền/`canDelete` do test DB phủ.
- `npm test`: 289 pass, 2 fail ở `tests/proposals-ep03.test.mjs` (fake Prisma thiếu `proposalDecision.findFirst`), không liên quan diff này.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 0 | advisor | Lượt render đầu (`drafts` còn null) coi PI là người đóng góp | low | Patch: `contributor`/`uploadable` theo `dossier.readOnly` của server. |
| 1 | blind+edge | Gõ tiếp trong lúc đang lưu mục thì mất phần gõ thêm | low | Cùng khuôn hồ sơ đạo đức; hiếm khi gặp, sửa cần thêm nhánh. Bỏ qua. |
| 2 | blind | "Tải lại" giữ bản sửa dở có thể ghi đè bản người khác | false | Hành vi cố ý theo Always (giữ phần sửa dở); người dùng thấy cảnh báo trước khi lưu lại. |
| 3 | blind | `refresh()` không xóa thông báo/danh sách thiếu cũ | low | Patch: xóa `notice` và `missing` khi tải lại thành công. |
| 4 | blind | `canDelete` sao luật của `files.service` | low | Test DB khẳng định cho PI, người đóng góp, CV và sau khi nộp. Bỏ qua. |
| 5 | blind | Helper tên `ethics*` dùng chung | low | Không có tác hại cụ thể; giữ để diff nhỏ. Bỏ qua. |
| 6 | blind | `permission-matrix.md` thiếu luật hồ sơ nghiệm thu | false | Dòng 269 đã có "nộp nghiệm thu"; luật tệp có từ phần 1, diff này không đổi quyền. |
| 7 | blind+vgap | Không có test web cho wrapper upload và phân nhánh workspace | medium | Pre-verified (vgap). Repo không có hạ tầng chạy web; kiểm bằng trình duyệt. Defer. |
| 8 | blind | PI có ô tải "Tệp đóng góp" | false | Backend cho PI mọi purpose (spec phần 1). |
| 9 | blind | Bảng phiên bản không mở được snapshot | low | Ngoài phạm vi, giống 10.3. Bỏ qua. |
| 10 | blind | Lịch sử tệp không ghi tên tệp | low | Hành vi backend phần 1. Bỏ qua. |
| 11 | blind | Dòng sản phẩm dùng index làm key | low | Ảnh hưởng nhỏ khi xóa dòng giữa; sửa cần thêm id. Bỏ qua. |
| 12 | blind | Test `canDelete` phụ thuộc số tệp, thiếu ca tệp người khác | false | Fixture xác định; `memberView[evidence.id] === false` là tệp của PI. |
| 13 | edge | Tải lại lỗi thì `setView(null)` mất bản sửa dở | low | Cần lỗi mạng đúng lúc; như hồ sơ đạo đức. Bỏ qua. |
| 14 | edge | Tải tệp thành công nhưng GET sau đó lỗi → báo lỗi | low | Hiếm; bỏ qua. |
| 15 | edge | Bấm "Tải lại" liên tục khi đang tải | low | Patch: khóa nút khi `loading`. |
| 16 | edge | CV vẫn thấy nút "Nộp hồ sơ" (bị khóa), lệch ma trận I/O | medium | Patch: chỉ hiện nút khi có `acceptance-dossier.submit`; người khác thấy lý do. |

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && DATABASE_URL=… node --test tests/acceptance-dossier-db.test.mjs` -- expected: PASS.

**Manual checks:**
- Preview với PI, thư ký/thành viên phụ trách mốc và CV phụ trách theo ma trận I/O.
