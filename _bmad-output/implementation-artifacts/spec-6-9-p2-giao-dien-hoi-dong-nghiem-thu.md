---
title: 'Story 6.9 phần 2 — Giao diện hội đồng nghiệm thu'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_commit: '29f01e328256d6bf0eceeecda6e4d7ed2ec7e183'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/spec-6-9-hoi-dong-va-ket-qua-nghiem-thu.md'
  - '{project-root}/docs/ux-design-guidelines.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Backend hội đồng nghiệm thu đã có (6.9 phần 1), nhưng chưa có giao diện. Người lập hội đồng chưa mời được, người được mời chưa nhận lời được, GĐ/PGĐ-KH chưa ký được, chủ tịch chưa ghi được kết quả. Link thông báo mời đang trỏ trang đề tài, người được mời ở đơn vị khác mở ra bị 403.

**Approach:** Thêm trang `/projects/[id]/acceptance-council`, chỉ gọi `GET :id/acceptance-council` (không tải đề tài), nên người chỉ có ghế cũng mở được. Panel theo khuôn `ProposalCouncilPanel`: tiến độ theo vị trí, bảng thành viên, form mời, điều kiện trình, nút trình, ký/từ chối, ô nhận lời/từ chối cho người được mời, và khu chủ tịch tải biên bản rồi ghi kết quả. Trang chi tiết đề tài có thẻ dẫn vào. Mọi link thông báo hội đồng trỏ về trang này.

## Boundaries & Constraints

**Always:**
- Nút hiện theo `allowedActions`/`blockedActions` (`acceptance-council.*`) của view; nút bị khóa hiện lý do từ backend. Không suy quyền từ vai trò.
- Mỗi thao tác ghi gửi `contextVersion` mới nhất rồi tải lại view. `CONTEXT_VERSION_MISMATCH` hiện "Tải lại". `COUNCIL_NOT_READY`/`READINESS_INCOMPLETE` hiện danh sách `blockers`/`missing` bằng tiếng Việt.
- Thu hồi, từ chối lời mời và GĐ từ chối ký bắt buộc lý do; ký và ghi kết quả có hộp xác nhận ghi rõ không hoàn tác. Dùng lại `ReasonDialog`.
- Người được mời: thấy vị trí của mình và nút "Nhận lời"/"Từ chối". Từ chối xong hiện thông báo đã từ chối (response không còn view).
- Chủ tịch (có `acceptance-council.record-result`): tải/xóa biên bản (`ACCEPTANCE_MINUTES`), nhập nhận xét, chọn Đạt/Không đạt. Nút ghi kết quả khóa khi chưa có biên bản hoặc nhận xét.
- Sau khi có kết quả: hiện kết quả, nhận xét, ngày ghi và link tải biên bản; không còn ô thao tác.
- Hội đồng đã thành lập: thành viên đã nhận lời có link sang `/projects/{id}/acceptance-dossier`.
- Trạng thái loading/empty/error/ẩn (401/403 thì không hiện panel) như panel đề xuất. Bố cục bảng + `mobile-list` trên màn nhỏ.

**Never:** đổi luật quyền hay luồng backend; thêm thư viện; thêm chức năng yêu cầu bổ sung hồ sơ.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected |
|---|---|---|
| CV phụ trách / TP được tick, đang lập | `pending_acceptance`, chưa trình | Form mời theo vị trí còn trống, tìm ứng viên; nút thu hồi từng dòng |
| Đủ cơ cấu, mọi người nhận lời | — | Nút "Lập tờ trình thành lập hội đồng" bật |
| Còn người chưa nhận lời | — | Danh sách điều kiện trình; nút trình khóa kèm lý do |
| Đang trình (TB/TP) | tờ trình PENDING | "Danh sách bị khóa khi trình ký"; TB/TP chuyển bước ở `RoutingStatus` |
| GĐ/PGĐ-KH ở bước Ban giám đốc | `acceptance-council.sign` | Nút "Ký thành lập" và "Từ chối" |
| Người được mời mở link thông báo | ghế `invited`, không đọc được đề tài | Trang mở được; chỉ thấy ghế của mình và nút nhận lời/từ chối |
| Chủ tịch sau khi thành lập | chưa có kết quả | Khu biên bản + nhận xét + Đạt/Không đạt |
| Đã có kết quả | `accepted`/`failed` | Chỉ đọc kết quả và biên bản |
| Người không liên quan | 403 | Không hiện panel, hiện thông báo không có quyền |

## Quyết định (người dùng chốt 2026-11-12)

- Người được mời tìm lời mời ở `/my-reviews`: thêm mục "Hội đồng nghiệm thu" liệt kê ghế `invited`/`accepted` (chưa thu hồi) của người xem, mỗi dòng có tên đề tài, vị trí, trạng thái và link sang trang hội đồng. Thêm API `GET /projects/acceptance-council/my-seats` (chỉ trả ghế của chính người xem), kèm test.

</frozen-after-approval>

## Code Map

- `apps/web/src/lib/projects-api.ts` -- kiểu `AcceptanceCouncilView` (khớp `view()` ở `acceptance-council.service.ts:224`), nhãn trạng thái lời mời/kết quả, hàm `get/candidates/invite/revoke/respond/submit/approve/reject/recordResult` gọi `/projects/:id/acceptance-council/...`. Dùng lại `json()`, `uploadAcceptanceFile`, `deleteEthicsFile`, `projectFileUrl`. Thêm nhãn lịch sử `acceptance-council.*` và `project.acceptance.result` vào `HISTORY_ACTION_LABELS`.
- `apps/web/src/components/projects/acceptance-council-panel.tsx` (mới) -- khuôn `components/research-proposals/proposal-council-panel.tsx`; import `ReasonDialog` từ đó. Biên bản: lấy danh sách tệp `ACCEPTANCE_MINUTES` từ `getAcceptanceDossier` (chủ tịch đọc được hồ sơ sau khi thành lập).
- `apps/web/src/app/projects/[id]/acceptance-council/page.tsx` (mới) -- như `acceptance-dossier/page.tsx`.
- `apps/web/src/components/projects/project-detail.tsx` (`:141`) -- thẻ "Hội đồng nghiệm thu" khi đề tài `pending_acceptance|accepted|failed` và có hồ sơ đã nộp.
- `apps/web/src/components/projects/acceptance-dossier-workspace.tsx` -- hiện nhóm "Biên bản họp hội đồng" chỉ đọc (tải về) khi có tệp `ACCEPTANCE_MINUTES`.
- `apps/api/src/approved-projects/acceptance-council.service.ts` -- mọi link thông báo đổi về `/projects/{id}/acceptance-council`.
- `apps/api/src/approved-projects/acceptance-dossiers.service.ts:183` -- `canDelete` của tệp `ACCEPTANCE_MINUTES` = người xem có `acceptance-council.record-result` (hiện luôn false với chủ tịch).
- `apps/api/src/approved-projects/acceptance-council.service.ts` + controller -- `mySeats(actor)`: ghế `invited|accepted` của actor, kèm `projectId`, tên đề tài, trạng thái đề tài, vị trí, `establishedAt`. Route tĩnh phải khai báo trước `@Get(":id")` trong controller để không bị bắt nhầm.
- `apps/web/src/components/research-proposals/reviewer-queue-panel.tsx` hoặc `app/my-reviews/page.tsx` -- thêm `SectionCard` "Hội đồng nghiệm thu" (component mới nhỏ trong `components/projects/`), rỗng thì ẩn.
- `tests/acceptance-council-db.test.mjs` -- test `mySeats` (chỉ ghế của mình, không gồm ghế đã thu hồi/từ chối); assert link thông báo mới và `canDelete` biên bản với chủ tịch.

## Tasks & Acceptance

**Execution:**
- [x] `projects-api.ts` -- kiểu, nhãn, hàm API.
- [x] `acceptance-council-panel.tsx` + `page.tsx` -- panel và route.
- [x] `project-detail.tsx`, `acceptance-dossier-workspace.tsx` -- thẻ lối vào, nhóm biên bản.
- [x] `mySeats` API + mục ở `/my-reviews`.
- [x] backend link thông báo + `canDelete` biên bản + test.

**Acceptance Criteria:**
- Given thông báo lời mời, when người được mời ở đơn vị khác bấm, then mở được trang hội đồng và nhận lời được.
- Given chủ tịch ghi Đạt, when quay lại trang đề tài (người đọc được đề tài), then trạng thái "Đã nghiệm thu" và thẻ thanh lý mở được.

## Implementation Notes

- Preview trên DB riêng `docmans_69p2` (migrate + seed + script fixture trong scratchpad), API :4003, web :3004. Đã chạy: CV mời qua UI; int2 (đơn vị khác) thấy lời mời ở `/my-reviews`, mở trang, nhận lời; TB/TP chuyển bước qua API routing; GĐ ký qua UI; chủ tịch tải biên bản, ghi Đạt; CV thấy `accepted`, thanh lý mở. Kiểm màn 375px.

## Spec Change Log

## Review Triage Log

| # | Nguồn | Phát hiện | Verdict | Bằng chứng / hướng xử lý |
|---|---|---|---|---|
| 1 | preview | Ngày định dạng theo UTC, giờ VN sáng 12/11 hiện 11/11 | medium | Thấy trực tiếp trên preview. Patch: múi giờ Asia/Ho_Chi_Minh. |
| 2 | preview | Danh sách ứng viên có chính người mời (backend chặn tự mời) | low | Thấy trên preview; sửa một điều kiện. Patch. |
| 3 | blind+edge | Lỗi tải hồ sơ làm rỗng biên bản, khóa nút ghi kết quả | medium | `.catch(() => null)`. Patch: hiện lỗi, giữ danh sách cũ. |
| 4 | blind+edge | `userId` cũ còn chọn sau khi tìm lại | low | Sửa trực tiếp. Patch. |
| 5 | blind+edge | Thu hồi không chạy lại tìm ứng viên (deps theo `members.length`) | low | Đổi deps. Patch. |
| 6 | edge | Cắt 50 ứng viên không báo | low | Thêm một dòng gợi ý. Patch. |
| 7 | blind+edge | `mySeats` giữ hội đồng đã xong, `/my-reviews` phình mãi | medium | Patch: chỉ đề tài `pending_acceptance`. |
| 8 | edge | Thông báo tờ trình ACCEPTANCE_COUNCIL trỏ trang đề tài, nút ký ở trang hội đồng | low | Lệch "mọi link hội đồng"; sửa trực tiếp. Patch. |
| 9 | blind | Thông báo cũ giữ link cũ, không backfill | false | Backend 6.9 chưa phát hành, không có dữ liệu thật. |
| 10 | blind | Chuỗi `ACCEPTANCE_MINUTES` lặp, thiếu nhãn | low | Patch: một hằng + nhãn. |
| 11 | blind | Ép kiểu `as any` trong `mySeats` | low | Cùng mẫu file hiện có. Bỏ qua. |
| 12 | blind | Thẻ trên trang đề tài không kiểm `allowed()` | false | Người đọc đề tài đọc được view hội đồng; đúng thiết kế. |
| 13 | blind | Câu nhắc tên mục "Tờ trình qua Phòng KHQS" viết cứng | low | Bỏ qua. |
| 14 | blind | `accept` loại tệp viết cứng | low | Cùng mẫu workspace hiện có. Bỏ qua. |
| 15 | blind | Ma trận quyền chưa ghi `canDelete` biên bản | false | Ma trận đã ghi "chỉ chủ tịch tải/xóa". |
| 16 | blind | Ghi đè view khi refresh chồng nhau; refresh 403 sau thao tác | low | Hiếm. Bỏ qua. |
| 17 | vgap | `mySeats` ghế accepted/`establishedAt` chưa test | medium | Pre-verified. Patch test. |
| 18 | vgap | Link thông báo established/declined chưa test | medium | Pre-verified. Patch test. |
| 19 | vgap | `readsProject` chưa test | medium | Pre-verified. Patch test. |
| 20 | vgap | Web và route `my-seats` không có test tự động | low | Không có harness web; đã chạy preview nhiều vai trò (CV, int2, TB/TP qua API, GĐ, chủ tịch), route `my-seats` chạy thật. |
| 21 | vgap | `/my-reviews` nuốt lỗi tải ghế | low | Patch: hiện lỗi. |
| 22 | preview | Breadcrumb "Chi tiết đề tài" với người chỉ có ghế dẫn tới trang 403 | low | Trang server không biết quyền; bỏ qua. |
| 23 | codex vòng 3 (G6) | PI mở trang hội đồng gọi `approval-submissions/subject` bị 403 | medium | Đã sửa ở `65b3591` (cờ `readsApproval`). Kiểm lại 14/11/2026: tải trang của PI không còn gọi request này. |
| 24 | codex vòng 3 (G2) | Tab trong hộp ký đi Hủy → Ký → `BODY` → Hủy | false | Hành vi gốc của `showModal()`: focus qua thanh trình duyệt, trang phía sau vẫn inert; guideline không đòi bẫy focus. Không sửa `ui/dialog.tsx`. |
| 25 | kiểm 14/11 (G3) | Chuyển bước/trả lại ở "Tờ trình qua Phòng KHQS" làm focus rơi về `BODY`, không có thông báo thành công | medium | Patch `routing-status.tsx`: thêm thông báo `role="status"` và đưa focus về đó, cùng khuôn với panel hội đồng; test nguồn. |

## Verification

**Commands:**
- `npm run typecheck` -- expected: không lỗi.
- `npm run build:api && node --test tests/acceptance-council-db.test.mjs tests/smoke.test.mjs` (có `DATABASE_URL`) -- expected: PASS.

**Manual checks:**
- Preview trên DB riêng: chạy hết luồng bằng các tài khoản CV phụ trách, người được mời, TB, TP, GĐ, chủ tịch; chụp màn hình mỗi vai trò.
- Kiểm 14/11/2026 trên DB tạm `docmans_qa69` (đã xoá): G3 chỉ bàn phím TB chuyển, TP trình, GĐ ký (Esc đóng hộp, focus về nút mở), chủ tịch ghi kết quả — PASS sau patch #25; ô `<select>` kết quả đặt bằng `form_input` vì popup gốc macOS không nhận phím giả lập. G4: không có 4xx ngoài 401 sau logout cố ý; `ERR_BLOCKED_BY_ORB` của avatar là lỗi có sẵn ngoài 6.9. G1: 375px không tràn, không cắt chữ ở trạng thái đã có kết quả. G7 chưa rà từng dòng guideline.
