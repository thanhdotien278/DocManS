---
title: 'Dashboard Thống kê Phân tích, Drill-down & Ảnh chụp Sức khoẻ Đề tài'
type: 'feature'
created: '2026-11-19'
status: 'done'
route: 'dispatch'
baseline_commit: '9f2d57234382991ac8f8948c99ac89a92b9fa744'
review_loop_iteration: 0
context:
  - '{project-root}/CONTEXT.md'
  - '{project-root}/docs/permission-matrix.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trang `/dashboard` hiện tại chỉ hiển thị danh sách việc cần xử lý đơn giản (`WorkspaceHome` cho lãnh đạo, `ManagementDashboardPanel` phía client cho quản lý KHQS), thiếu biểu đồ xu hướng sức khoẻ đề tài theo tuần, đường cong S, bản đồ nhiệt đơn vị, phân tích kinh phí, drill-down, Gantt và xuất Excel.

**Approach:** Bổ sung bảng bất biến `project_health_snapshots` cùng dịch vụ chụp sức khoẻ đề tài hằng tuần, triển khai `DashboardModule` tại `/api/v1/dashboard/*` tuân thủ phân quyền theo bản ghi và che kinh phí theo vai trò, đồng thời xây dựng giao diện `DashboardAnalytics` (bộ lọc đồng bộ URL, biểu đồ SVG/HTML, modal drill-down kèm Gantt và xuất `.xlsx`).

## Boundaries & Constraints

**Always:**
- Số liệu tổng hợp, biểu đồ, drill-down và `.xlsx` chỉ tính trên tập bản ghi người xem được phép đọc (`canReadProposal`, `ApprovedProjectsService.listProjects`, `canViewFunding`); `RESEARCH_OVERSIGHT_AUTHORITY` chỉ thấy tổng kinh phí, cột kinh phí từng dòng là `null`.
- `SYSTEM_ADMIN` và `STUDENT_USER` nhận `403` tại `/api/v1/dashboard/*`; trên `/dashboard` giữ nguyên `AdminDashboardPanel` và `StudentResearchPanel`.
- Kiểm tra query theo whitelist (`parseDashboardQuery`): khoá lạ, lặp hoặc sai định dạng trả `400 DASHBOARD_QUERY_INVALID`.
- Bảng `project_health_snapshots` chỉ ghi thêm (trigger chặn `UPDATE`), idempotent theo `(project_id, snapshot_date)`, tắt được qua `HEALTH_SNAPSHOTS_ENABLED=false`.
- Dùng đúng schema hiện hành: `ResearchProposal.proposalNatureCode`, `ProjectFundingRecord` (`GRANT` / `DISBURSEMENT` / `SETTLEMENT`), `readApprovedBudget`, và sản phẩm từ `AcceptanceDossier.sections.products` (khi người xem có quyền `acceptance-dossier.read`).
- Trên `/dashboard` (với mọi vai trò ngoài `SYSTEM_ADMIN` và `STUDENT_USER`), bố trí **2 tab**: Tab mặc định **"Thống kê & Phân tích"** (`DashboardAnalytics` + nút tải Excel) và Tab **"Việc cần xử lý"** (giữ lại `ManagementDashboardPanel` cho `RESEARCH_MANAGEMENT_HEAD` / `RESEARCH_BOARD_HEAD` / `RESEARCH_MANAGEMENT_STAFF`, hoặc `WorkspaceHome` cho các vai trò còn lại).
- Mục **Sản phẩm** trên Dashboard tổng hợp và hỗ trợ drill-down trực tiếp từ `AcceptanceDossier.sections.products` (theo loại sản phẩm & trạng thái nghiệm thu); không hiển thị mục *Hội nghị khoa học* vì hệ thống chưa có phân hệ này.

**Never:**
- Không suy diễn quyền ở frontend; lọc `unitId` ngoài phạm vi trả về `0` bản ghi thay vì `403`.
- Không ghi chú nguồn gốc từ kho mã khác trong code, comment, migration hay test; không sửa migration lịch sử.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Phân bố theo quyền | `GET /api/v1/dashboard/distribution?subject=projects&year=2026` (`rmhead` / `director`) | Trả `totals`, `byUnit`, `byLevel`, `byField`, `byStatus`, `byScope`, `byOfficer`, `byYear`, `byHealth`, `byUnitHealth` trong phạm vi xem | `401` chưa đăng nhập; `403` với `SYSTEM_ADMIN` / `STUDENT_USER` |
| Query sai / lặp | `?subject=projects&unknown=1` hoặc `?unitId=a&unitId=b` | Chặn truy vấn | `400` `{ code: "DASHBOARD_QUERY_INVALID", field }` |
| Che kinh phí giám sát | `RESEARCH_OVERSIGHT_AUTHORITY` gọi `distribution` vs `drill-down?metric=projects` | `totals` có tổng kinh phí; từng dòng `drill-down` và Excel có `totalBudget: null`, `totalDisbursed: null` | N/A |
| Thống kê sản phẩm hồ sơ nghiệm thu | `GET /api/v1/dashboard/products` & `drill-down?metric=products` | Chỉ tính sản phẩm từ `AcceptanceDossier` của đề tài người xem có quyền `acceptance-dossier.read` | `400` nếu bộ lọc `type` / `productStatus` sai định dạng |
| Xu hướng khi DB mới | `GET /api/v1/dashboard/trends` khi chưa có snapshot | Luôn có điểm cuối `live: true` cho hôm nay (`UTC+7`) | `400` nếu `from > to` hoặc khoảng > 3 năm |
| Chụp snapshot hằng tuần | Chủ nhật `23:55` hoặc cách lần chụp cuối >= 7 ngày; gọi lặp cùng ngày | Chỉ chèn dòng thiếu (`skipDuplicates`); đề tài đã nghiệm thu/đóng có `maxDaysOverdue = 0`, `lateReports = 0`; `UPDATE` bị trigger chặn | Log lỗi, không làm sập API |
| Xuất Excel | `GET /api/v1/dashboard/export-proposals` & `drill-down/export` | Trả `.xlsx` khớp bộ lọc, chống formula injection (`=`, `+`, `-`, `@`), ghi `AuditLog` | `400` nếu sai `metric` hoặc bộ lọc |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` & `apps/api/prisma/migrations/20261120000000_project_health_snapshots/migration.sql` -- Model `ProjectHealthSnapshot` và trigger append-only.
- `apps/api/src/approved-projects/project-progress.ts` & `approved-projects.service.ts` -- Tính `plannedPercent`, `actualPercent`, `spi`, `health` và mở rộng dữ liệu đọc dự án (kinh phí theo `canViewFunding`, `proposalNatureCode`, `skipUnresolved`).
- `apps/api/src/proposals-shared/proposal-access.ts` -- Helper `readableProposalCandidatesWhere`.
- `apps/api/src/dashboard/*` & `apps/api/src/app.module.ts` -- `dashboard-query.ts`, `project-health-snapshot.service.ts`, `dashboard.service.ts`, `dashboard-analytics.service.ts`, `dashboard-export.service.ts` (OOXML `.xlsx` qua `node:zlib`), `dashboard.controller.ts`, `dashboard.module.ts`.
- `apps/web/src/lib/dashboard-api.ts` & `apps/web/src/components/dashboard/*` -- Client API, `viz.tsx`, `unit-health-heatmap.tsx`, `project-gantt.tsx`, `drill-down-panel.tsx`, `dashboard-analytics.tsx`.
- `apps/web/src/app/dashboard/page.tsx` & `apps/web/src/app/globals.css` -- Tích hợp giao diện mới và bộ CSS `.viz-root`, `.dash-*`, `.chart-card`, `.heatmap`, `.drill-*`, `.gantt`.
- `tests/dashboard-analytics.test.mjs` -- Kiểm thử phân quyền, che kinh phí, whitelist query, snapshot và xuất `.xlsx`.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/prisma/schema.prisma` & `apps/api/prisma/migrations/20261120000000_project_health_snapshots/migration.sql` -- Thêm `ProjectHealthSnapshot` và migration append-only -- Lưu chuỗi sức khoẻ theo tuần.
- [x] `apps/api/src/approved-projects/project-progress.ts` & `approved-projects.service.ts` -- Thêm `computeProjectProgress` và trả kèm tóm tắt tiến độ/kinh phí theo quyền -- Thống nhất công thức giữa danh sách đề tài, snapshot và Dashboard.
- [x] `apps/api/src/proposals-shared/proposal-access.ts` -- Thêm `readableProposalCandidatesWhere` -- Chặn `SYSTEM_ADMIN` / `STUDENT_USER` và thu hẹp ứng viên DB.
- [x] `apps/api/src/dashboard/*` & `apps/api/src/app.module.ts` -- Tạo `DashboardModule` với các API `stats`, `trends`, `distribution`, `drill-down`, xuất `.xlsx` và lịch chụp snapshot -- Cung cấp dữ liệu backend có thẩm quyền.
- [x] `apps/web/src/lib/dashboard-api.ts` & `apps/web/src/components/dashboard/*` -- Xây dựng các biểu đồ SVG/HTML, heatmap, Gantt và bảng trượt drill-down -- Hiển thị phân tích trực quan.
- [x] `apps/web/src/app/dashboard/page.tsx` & `apps/web/src/app/globals.css` -- Gắn `DashboardAnalytics` vào `/dashboard` và thêm CSS -- Hoàn thiện giao diện cho `rmhead`, `director` và các vai trò nghiệp vụ.
- [x] `tests/dashboard-analytics.test.mjs` -- Kiểm thử toàn bộ kịch bản trong ma trận I/O -- Chống rò rỉ dữ liệu và sai lệch số liệu.

**Acceptance Criteria:**
- Given `rmhead` hoặc `director` mở `/dashboard`, when trang tải xong, then hiển thị bộ lọc URL, KPI, biểu đồ sức khoẻ tuần, đường cong S, heatmap Đơn vị × Sức khoẻ, kinh phí theo đơn vị, chuyên viên phụ trách và hồ sơ đề xuất.
- Given người dùng bấm vào KPI, thanh biểu đồ hoặc ô heatmap, when `DrillDownPanel` mở ra, then hiển thị danh sách bản ghi khớp bộ lọc kèm chế độ xem Gantt (cho đề tài) và tải `.xlsx`.
- Given `SYSTEM_ADMIN` hoặc `STUDENT_USER` mở `/dashboard`, when tải trang, then giữ nguyên `AdminDashboardPanel` / `StudentResearchPanel`; gọi thẳng `/api/v1/dashboard/*` trả `403`.

## Implementation Notes

- Triển khai bảng bất biến `project_health_snapshots` với trigger PostgreSQL chặn `UPDATE`/`DELETE`, ràng buộc duy nhất `(project_id, snapshot_date)` và lịch kiểm tra `setInterval` (`unref`) chạy Chủ nhật `23:55` giờ Việt Nam (`UTC+7`) hoặc khi cách lần chụp gần nhất từ 7 ngày trở lên (`HEALTH_SNAPSHOTS_ENABLED=false` để tắt).
- Thống nhất `computeProjectProgress` và `summarizeProjectFunding` giữa `ApprovedProjectsService`, `ProjectHealthSnapshotService` và `DashboardModule`; bảo đảm đề tài đã nghiệm thu/đóng có `maxDaysOverdue = 0`, `lateReports = 0`, và che kinh phí từng dòng (`totalBudget: null`, `totalDisbursed: null`) đối với `RESEARCH_OVERSIGHT_AUTHORITY` trong khi vẫn giữ tổng kinh phí trên biểu đồ tổng hợp.
- Xây dựng bộ sinh tệp OOXML `.xlsx` thuần Node (`node:zlib`) không thêm gói phụ thuộc mới, hỗ trợ tiêu đề in đậm, cố định dòng tiêu đề (`frozen`), `autoFilter`, định dạng `#,##0`, chống formula injection (`=`, `+`, `-`, `@`) và ghi `AuditLog`.

## Spec Change Log

## Review Triage Log

| # | Layer | Finding | Verdict | Route | Evidence |
|---|-------|---------|---------|-------|----------|
| 1 | `blind-hunter` | Sắp xếp `metric=funding` lộ thứ tự kinh phí của `RESEARCH_OVERSIGHT_AUTHORITY` và lộ kinh phí dòng đề xuất với `PP` / phản biện | `medium` | `patch` | `resolveDrillDownRows` sắp xếp theo `aggregateFunding.approvedBudget` trước khi che `null`, và `loadAuthorizedProposals` đặt `canViewRowFunding: !oversight` nên `PP` không tham gia và phản biện ẩn danh vẫn nhận `rawBudget` trên từng dòng. |
| 2 | `blind-hunter` | Lệch cách tính quá hạn trên đề tài `pending_acceptance` giữa 2 tab Dashboard | `medium` | `patch` | `ApprovedProjectsService.toProjectResponse` chỉ bật `overdue` cho `[preparing, executing, paused]`, trong khi `computeProjectProgress` vẫn tính `maxDaysOverdue > 0` và `health = "delayed"` cho `pending_acceptance`. |
| 3 | `blind-hunter` | Nhánh `dossierReader` trong `loadAuthorizedProducts` gán cứng `emptyProgress` (`on_track`), `"Chưa phân công"` và lọc `TOPIC_PI` thiếu `isRelationshipActiveAt` | `medium` | `patch` | Đề tài `accepted` đọc qua ghế `AcceptanceCouncilMember` bị gán `health: "on_track"`, làm bộ lọc `?health=completed` trả `0` sản phẩm và thiếu ràng buộc hiệu lực thời gian trên `TOPIC_PI`. |
| 4 | `blind-hunter` | Lịch chụp snapshot Chủ nhật `23:55–23:59` quét lặp mỗi phút dù đã có bản ghi ngày hôm nay và thiếu cờ chống chồng chéo | `low` | `patch` | `shouldCapture` trả `true` suốt 5 phút Chủ nhật mà chưa kiểm tra `latest.snapshotDate >= vn.snapshotDate` và `runScheduledCheck` chưa có cờ `inFlight`; nhánh trả `false` khi DB mới ngày thường là hành vi đúng theo ma trận. |
| 5 | `blind-hunter` | Vòng lặp `loadAuthorized` N+1 theo từng đề tài trong `ApprovedProjectsService.listProjects` | `low` | `defer` | Vòng lặp `for` gọi `loadAuthorized` cho từng dòng trong `ApprovedProjectsService.listProjects` (`apps/api/src/approved-projects/approved-projects.service.ts:190-192`) là cấu trúc có sẵn trước `baseline_commit`. |
| 6 | `blind-hunter` | Ngưỡng trần `spi <= 999` làm méo `avgSpi` danh mục khi đề tài mới mở có `plannedPercent` rất nhỏ | `medium` | `patch` | Đề tài vừa bắt đầu (`plannedPercent < 1%`) hoàn thành sớm 1 mốc sinh `spi = 999`, kéo lệch trung bình cộng `sumSpi / n` trên `getStats` và `getTrends`. |
| 7 | `blind-hunter` | `getTrends` lọc snapshot lịch sử theo `health`/`status` hiện tại và chưa khớp khoảng ngày khi chọn `year` quá khứ | `medium` | `patch` | `getTrends` lọc `projects` theo `health`/`status` hiện hành trước khi đọc `ProjectHealthSnapshot` thay vì lọc trên cột `row.health`/`row.projectStatus`, đồng thời chưa suy ra `[from, to]` theo `query.year` thuộc năm trước. |
| 8 | `blind-hunter` | `parseDashboardQuery` chấp nhận `type`/`productStatus` trên `drill-down` khác `products` | `low` | `patch` | Khi `metric !== "products"`, truyền `type` hoặc `productStatus` trên `drill-down` và `drill-down/export` chưa bị từ chối `400 DASHBOARD_QUERY_INVALID` (riêng `matchesProposalFilters` bỏ qua `health` là chủ đích để không làm rỗng đề xuất khi lọc sức khoẻ đề tài). |
| 9 | `blind-hunter` | `exportDrillDown` thiếu một số cột sẵn có (`intakeTitle` cho đề xuất; `fieldLabel`, `overdueMilestones`, `lateReports` cho đề tài) | `low` | `patch` | Các trường này đã có sẵn trên `DrillDownProposalRow` và `DrillDownProjectRow` nhưng chưa đưa vào cột `.xlsx` của `exportDrillDown` (riêng `readApprovedBudget` giữ nguyên theo ràng buộc đặc tả). |
| 10 | `blind-hunter` | Lệch ngày `UTC` so với `UTC+7` trong `formatDateCell` và `formatShortDate` với mốc thời gian `00:00–06:59` giờ Việt Nam | `low` | `patch` | `iso.slice(0, 10)` cắt theo `UTC` nên mốc `submittedAt` đầu ngày giờ Việt Nam bị lùi 1 ngày so với `vnYearFromDate`. |
| 11 | `blind-hunter` | Đua bất đồng bộ trong `DashboardAnalytics.refresh` khi đổi nhanh bộ lọc và giữ cố định `cachedOptions` | `medium` | `patch` | `refresh()` trong `useEffect` không có bộ đếm huỷ phản hồi cũ nên gói `Promise.all` trước có thể ghi đè gói mới, và `cachedOptions` không cập nhật lại khi làm mới không lọc. |
| 12 | `blind-hunter` | Chấm mốc `ProjectGantt` đè lên chữ `"Chưa đặt thời gian bắt đầu / kết thúc"` khi thiếu khoảng ngày đề tài và thiếu `aria-label` | `low` | `patch` | Khi `!hasRange` nhưng đề tài có mốc mang `dueDate`, `.gantt-milestone` (`position: absolute`) vẽ chồng lên `.gantt-no-dates` và thiếu nhãn đọc màn hình. |
| 13 | `blind-hunter` | `.viz-stack-columns` cắt mất tooltip dọc do `overflow-x: auto`, dùng `role="img"` bọc `<button>`, thiếu `aria-controls`/`tabpanel`, biên OOXML & test `DELETE` snapshot | `medium` | `patch` | `overflow-x: auto` ép `overflow-y: auto` làm cắt `.viz-stack-tooltip`, `role="img"` che các nút phân đoạn sức khoẻ khỏi cây trợ năng, `buildXlsxBuffer` chưa lọc ký tự XML 1.0 đặc biệt / `<cols>` rỗng và test chưa kiểm chứng `DELETE` trên trigger. |
| 14 | `edge-case-hunter` | Đổi `DrillDownPanel` từ `proposals`/`products` sang `projects` gây lỗi `TypeError` (`row.actualPercent.toFixed`) ở lần render đồng bộ đầu tiên | `high` | `patch` | `DrillDownPanel` vẫn giữ `data` cũ trong state trước khi `useEffect` chạy nên khi mở lại với `metric: "projects"`, `ProjectsTable` đọc `actualPercent` (`undefined`) trên dòng đề xuất/sản phẩm cũ và làm sập trang. |
| 15 | `edge-case-hunter` | Đổi bộ lọc liên tiếp làm phản hồi `DashboardAnalytics.refresh` cũ ghi đè dữ liệu mới | `medium` | `patch` | Xác nhận trùng nguyên nhân gốc với mục #11 (`DashboardAnalytics.refresh` thiếu khoá thứ tự yêu cầu). |
| 16 | `edge-case-hunter` | Thành viên hội đồng nghiệm thu lọc sản phẩm theo `health` bị sai do `emptyProgress` gán cứng `on_track` | `medium` | `patch` | Xác nhận trùng nguyên nhân gốc với mục #3 trong `DashboardService.loadAuthorizedProducts`. |
| 17 | `edge-case-hunter` | `redactsAsReviewer` trong `DashboardService.loadAuthorizedProposals` chưa kiểm tra `rev?.conflictUnresolved` | `low` | `patch` | Khi `ProposalReviewAccessService.resolveForProposals` trả `conflictUnresolved: true` do lỗi truy vấn, thiếu điều kiện `rev?.conflictUnresolved` sẽ làm lộ `piName` thay vì fail-closed như `ResearchProposalsService`. |
| 18 | `edge-case-hunter` | `GET /dashboard/trends` với `to` cách hôm nay >84 ngày về tương lai và bỏ trống `from` vẫn chèn điểm `todayVn` ngoài `[from, to]` | `low` | `patch` | `dashboard-analytics.service.ts` kiểm tra `!query.from` thay vì biến `from` đã suy diễn (`shiftIsoDays(to, -84)`), dẫn tới chèn điểm `todayVn < from`. |
| 19 | `edge-case-hunter` | Bản nháp báo cáo sửa đổi thay thế báo cáo có `responseDeadline = null` làm mất cờ quá hạn | `false` | `rejected` | Bác bỏ: tại `apps/api/src/approved-projects/approved-projects.service.ts:559-561` và `609`, `supersedesReportId` chỉ sinh từ báo cáo `supplement_requested`, mà `requestReportSupplement` bắt buộc `input.responseDeadline` ở tương lai nên `source.responseDeadline` không bao giờ `null`. |
| 20 | `edge-case-hunter` | Đề tài `pending_acceptance` có mốc cũ quá hạn bị lệch giữa `computeProjectProgress` và `milestone.overdue` trên Gantt | `medium` | `patch` | Xác nhận trùng nguyên nhân gốc với mục #2 (`pending_acceptance` không còn tính quá hạn thực hiện). |
| 21 | `edge-case-hunter` | Người đọc chỉ qua ghế hội đồng nghiệm thu nhận `filterOptions.years` và `units` rỗng trên `getStats` | `low` | `patch` | `getStats` chỉ gom `unitOptionMap` và `yearSet` từ `allProjects` và `allProposals`, bỏ sót đơn vị/năm của sản phẩm đọc qua `acceptanceCouncilMember`. |
| 22 | `edge-case-hunter` | `buildXlsxBuffer` sinh thẻ `<cols></cols>` rỗng khi `columns` trống, trái chuẩn OOXML | `low` | `patch` | Xác nhận trùng nguyên nhân gốc với mục #13c trong `apps/api/src/dashboard/dashboard-export.service.ts`. |
| 23 | `edge-case-hunter` | Tải `.xlsx` khác cổng (`localhost:3000` → `localhost:4000`) mất tên tệp do thiếu `Access-Control-Expose-Headers: Content-Disposition` và thu hồi sớm Blob URL | `medium` | `patch` | `main.ts` bật CORS mặc định không phơi bày `Content-Disposition`, còn `triggerExcelDownload` gọi `URL.revokeObjectURL` đồng bộ ngay sau `anchor.click()`. |
| 24 | `edge-case-hunter` | `listProjects({ overdue })` và Dashboard chưa thống nhất điều kiện quá hạn với báo cáo bổ sung và `pending_acceptance` | `medium` | `patch` | Xác nhận trùng nguyên nhân gốc với mục #2 & #20 giữa `ApprovedProjectsService.toProjectResponse` và `computeProjectProgress`. |
| 25 | `verification-gap` | `GET /api/v1/dashboard/stats` chưa có kiểm thử đường thành công `200` sau bước kiểm tra quyền | `high` | `patch` | Lỗ hổng kiểm thử đã xác minh: `tests/dashboard-analytics.test.mjs` mới chỉ gọi `/dashboard/stats` ở nhánh `403` và `400`, chưa kiểm chứng thân hàm `getStats`. |
| 26 | `verification-gap` | Chưa kiểm thử che kinh phí từng dòng đề xuất của `RESEARCH_OVERSIGHT_AUTHORITY` khi xuất `.xlsx` | `medium` | `patch` | Lỗ hổng kiểm thử đã xác minh: chưa có bài test gọi `/dashboard/export-proposals` và `/dashboard/drill-down/export?metric=proposals` dưới tài khoản `oversight`. |
| 27 | `verification-gap` | Chưa có kiểm thử ẩn danh `piName === "—"` cho phản biện đề xuất trên Dashboard và `.xlsx` | `medium` | `patch` | Lỗ hổng kiểm thử đã xác minh: chưa tạo `proposalReviewAssignment` trong `tests/dashboard-analytics.test.mjs` để xác nhận ẩn tên chủ nhiệm. |
| 28 | `verification-gap` | Chưa kiểm thử `metric=overdue_projects`, sắp xếp `metric=funding` và phân trang `page`/`pageSize` trên `drill-down` | `medium` | `patch` | Lỗ hổng kiểm thử đã xác minh: các tham số này chưa được gọi trong `tests/dashboard-analytics.test.mjs`. |
| 29 | `verification-gap` | Chưa có kiểm thử đơn vị cho các nhánh `at_risk`, `failed` và `lateReports` của `computeProjectProgress` | `medium` | `patch` | Lỗ hổng kiểm thử đã xác minh: dữ liệu mồi hiện chỉ đi qua nhánh `delayed` (do mốc trễ) và `completed` (`accepted`). |
| 30 | `verification-gap` | Chưa kiểm thử hành vi bỏ qua đề tài có ngữ cảnh chuyên viên mơ hồ (`skipUnresolved: true`) | `medium` | `patch` | Lỗ hổng kiểm thử đã xác minh: chưa có bài test tạo 2 `ProjectManagementOfficer` hiệu lực để đối chiếu `/projects` (`409`) với `/dashboard/*` (`200`, loại trừ bản ghi mơ hồ). |
| 31 | `verification-gap` | Vòng đời `onModuleInit` / `onModuleDestroy` và đăng ký DI của `ProjectHealthSnapshotService` bị bỏ qua trong test | `medium` | `patch` | Lỗ hổng kiểm thử đã xác minh: test đặt `HEALTH_SNAPSHOTS_ENABLED="false"` trước khi khởi tạo `AppModule` và tự `new ProjectHealthSnapshotService(db)` thay vì lấy từ container NestJS. |
| 32 | `verification-gap` | Logic định tuyến tab `DashboardPage`, helper `dashboard-api.ts` và kết xuất component mới chỉ kiểm tra regex mã nguồn | `medium` | `patch` | Lỗ hổng kiểm thử đã xác minh: Test 9 chỉ đọc chuỗi mã nguồn mà chưa thực thi các hàm helper hay kết xuất tĩnh `renderToStaticMarkup` cho các vai trò và bảng drill-down. |
| 33 | `verification-gap` (other) | `SAFE_PRODUCT_TYPE_PATTERN` chặn ký tự `/ . ( ) , :` và độ dài `>80` hợp lệ trong `AcceptanceDossier`, đồng thời `byType` gom nhóm phân biệt hoa thường | `medium` | `patch` | `readAcceptanceSection` cho phép `type` tự do tới 200 ký tự nên bấm thanh loại sản phẩm chứa `/` hoặc `()` trên UI sẽ bị `400 DASHBOARD_QUERY_INVALID`, và `getProducts` gom `byType` phân biệt hoa thường lệch với bộ lọc `toLowerCase()`. |
| 34 | `verification-gap` (other) | Nhánh `dossierReader` trong `loadAuthorizedProducts` gán cứng `emptyProgress` và `getStats` thiếu `filterOptions` cho ghế hội đồng nghiệm thu | `medium` | `patch` | Xác nhận trùng nguyên nhân gốc với mục #3, #16 và #21 trong `apps/api/src/dashboard/dashboard.service.ts`. |

## Design Notes

So sánh 3 phương án cho lập lịch snapshot & xuất `.xlsx`: (1) cài thêm `@nestjs/schedule` + `exceljs` (~50 gói mới); (2) hạ xuống `.csv` (mất đóng băng tiêu đề và định dạng tiền); (3) **chọn**: dùng `setInterval` chuẩn Node trong `OnModuleInit`/`OnModuleDestroy` + bộ tạo `.xlsx` OOXML gọn nhẹ qua `node:zlib` (`deflateRawSync`, CRC32, tiêu đề đậm, `frozen`, `autoFilter`, `#,##0`, chống formula injection) để không thêm bất kỳ dependency nào vào `package.json`.

## Verification

**Commands:**
- `npm run typecheck` -- expected: pass cả `web` và `api`
- `npm run build:api && node --test tests/dashboard-analytics.test.mjs` -- expected: pass toàn bộ test Dashboard
- `npm run build` -- expected: build thành công cả `web` và `api`
