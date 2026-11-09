---
title: 'Story 10.3 (phần 2: giao diện) — Hồ sơ đạo đức (IRB)'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: 'de2dd43'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-10-3-tao-hoan-thien-va-nop-ho-so-dao-duc.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Backend hồ sơ đạo đức đã có (phần 1), nhưng người dùng chưa có giao diện để tạo, soạn và nộp hồ sơ.

**Approach:** Thêm vào trang chi tiết đề tài một mục "Hồ sơ đạo đức", dẫn tới trang `/projects/[id]/ethics-dossier`. Trang này gồm 6 thẻ mục, một thẻ tệp đính kèm có danh sách còn thiếu, và nút nộp có hộp xác nhận; sau khi nộp chỉ còn chế độ xem (D-042).

## Boundaries & Constraints

**Always:**
- Hiển thị và cho phép thao tác theo `allowedActions` / `blockedActions` của `GET /api/v1/projects/:id/ethics-dossier` (`ethics-dossier.create|edit|submit`). Nút bị khóa phải hiện lý do (`blockedActions[].reason`).
- Mỗi thao tác ghi gửi `contextVersion` mới nhất. Sau mỗi lần ghi mục, lấy dữ liệu từ response; sau mỗi thao tác tệp, gọi lại `GET …/ethics-dossier`. Lý do: mọi thao tác ghi đều tăng version của đề tài.
- Mục 6 (cam kết) chỉ hiện checkbox khi người xem là PI (hồ sơ có `applicant.id` trùng tài khoản đang đăng nhập). Người khác chỉ thấy trạng thái đã tích hay chưa, kèm ghi chú: khi người khác PI sửa nội dung hoặc tệp, cam kết tự bỏ tích.
- Lỗi `READINESS_INCOMPLETE` hiển thị danh sách mục và tệp còn thiếu bằng nhãn tiếng Việt. Thẻ tệp luôn hiện danh sách tệp còn thiếu, lấy từ `readiness.missingFiles`.
- Thông báo tới `/projects/[id]/ethics-dossier` mở đúng trang.

**Never:** sửa backend (trừ khi gặp lỗi chặn, phải ghi lại); chức năng hủy nháp; chức năng kiểm tra đầy đủ của 10.4; thêm thư viện mới.

</frozen-after-approval>

## Code Map

- `apps/web/src/lib/projects-api.ts`:
  - Đã có `json()`, `getApiBaseUrl`, `projectFileUrl` và mẫu upload `uploadProjectFile` (gửi `relatedEntityType`/`filePurpose`/`contextVersion` qua FormData). Không dùng lại `uploadProjectFile` vì hàm này cố định `approved_project`.
  - Cần thêm: kiểu `EthicsDossierView`, `getEthicsDossier`, `createEthicsDossier`, `saveEthicsSection`, `submitEthicsDossier`, `uploadEthicsFile`, `deleteEthicsFile` (`DELETE /files/:id` có body `{contextVersion}`), nhãn tiếng Việt cho mục, loại tệp và đối tượng. Thêm vào `HISTORY_ACTION_LABELS` hai nhãn `ethics-dossier.create` ("Tạo hồ sơ đạo đức") và `ethics-dossier.submit` ("Nộp hồ sơ đạo đức").
  - `json()` hiện bỏ mất các trường phụ của body lỗi. Cần giữ `missingSections`/`missingFiles` cho lỗi readiness, ví dụ gắn body vào Error.
- `apps/web/src/components/projects/project-detail.tsx`:
  - Thêm `SectionCard` "Hồ sơ đạo đức" trước "Lịch sử đề tài" (dòng ~137), chỉ hiện khi `project.ethicsDossier` khác null hoặc người xem có quyền `ethics-dossier.create`. Nội dung: trạng thái (Nháp/Đã nộp, ngày nộp) và link "Mở hồ sơ" hoặc "Tạo hồ sơ" tới trang mới.
  - Thêm `ethicsDossier` vào `ProjectRecord`.
- `apps/web/src/app/projects/[id]/ethics-dossier/page.tsx` (mới): theo mẫu `app/projects/[id]/page.tsx` (`Breadcrumb`, `PageHeader`).
- `apps/web/src/components/projects/ethics-dossier-workspace.tsx` (mới, client):
  - Khi chưa có hồ sơ: nút "Tạo hồ sơ đạo đức".
  - Khi đã có: 6 `SectionCard`, mỗi thẻ có nút "Lưu mục" riêng.
    - Mục 1: checkbox loại đối tượng (`human` Người, `animal` Động vật, `biospecimen` Mẫu sinh phẩm, `secondary_data` Dữ liệu thứ cấp), ô cỡ mẫu (số nguyên hoặc để trống), ô mô tả.
    - Mục 4: chọn hình thức "Có xin chấp thuận" / "Miễn chấp thuận" kèm nội dung.
    - Mục 6: checkbox cam kết.
  - Thẻ tệp: mỗi loại `ETHICS_APPLICATION`, `ETHICS_PROTOCOL`, `ETHICS_CONSENT`, `ETHICS_DATA_TOOL`, `ETHICS_OTHER` có ô chọn tệp, danh sách tệp đã tải (link tải xuống) và nút xóa (khi `canDelete`).
  - Thẻ nộp: readiness, nút "Nộp hồ sơ" có `window.confirm`.
  - Khi `readOnly`: hiện nội dung chỉ đọc và bảng các phiên bản đã nộp.
  - Dùng các class có sẵn: `field`, `form-grid two`, `button primary`, `button-row`.
- `tests/` -- cập nhật `tests/files-route.test.mjs` hoặc các test kiểm tra mã nguồn web chỉ khi chúng kiểm tra đúng những file vừa sửa; không thêm test e2e.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/lib/projects-api.ts` -- helper và nhãn.
- [x] `apps/web/src/components/projects/project-detail.tsx` -- mục tóm tắt.
- [x] `apps/web/src/app/projects/[id]/ethics-dossier/page.tsx` + `ethics-dossier-workspace.tsx` -- trang soạn và nộp.

**Acceptance Criteria:**
- Given PI mở đề tài `executing` chưa có hồ sơ, when bấm "Tạo hồ sơ" rồi lưu đủ 6 mục, tải đủ tệp bắt buộc và xác nhận nộp, then trang chuyển sang chỉ đọc, hiện "Đã nộp" và phiên bản 1.
- Given thư ký mở hồ sơ nháp, then thư ký sửa được mục 1–5 và tệp, không thấy checkbox cam kết, và nút "Nộp hồ sơ" bị khóa kèm lý do.
- Given nộp khi còn thiếu, then trang hiện danh sách mục và tệp còn thiếu bằng tiếng Việt.

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.

**Manual checks:**
- Chạy app (web + api), đăng nhập bằng tài khoản seed của PI và thư ký, đi hết các AC trên trình duyệt.
