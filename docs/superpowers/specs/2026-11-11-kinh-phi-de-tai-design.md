# Theo dõi kinh phí đề tài — thiết kế và stories (6.13)

Ngày: 2026-11-11. Nhánh dự kiến: `feat/6-13-kinh-phi-de-tai`. Nguồn AC: FR74, `docs/permission-matrix.md` §7, Story 6.12.

## Bối cảnh và kết luận rà soát

- Báo cáo "Kinh phí đề tài DocManS.html" mô tả fork `tuanp83/DocManS` (commit 55a02bb), **không phải** mã hiện tại.
  Fork dùng mô hình đợt giải ngân + khoản chi, ghi đè toàn bộ mỗi lần lưu, và có 3 lỗi thiết kế
  (hai số "đã quyết toán" không ràng buộc, lịch sử chỉ ghi tổng, không kiểm tra tổng phân bổ/tỷ lệ).
- Repo này đã có Story 6.12 (`review`): `project_funding_records` (sổ ghi append-only, GRANT / DISBURSEMENT /
  SETTLEMENT, có version) và `project_liquidations` + tờ trình LIQUIDATION (TB → TP → GĐ ký).
- Quyết định: **giữ mô hình sổ ghi 6.12, bổ sung** các phần còn thiếu dưới đây. Không port mô hình fork.

Thiếu sót của 6.12 phải xử lý: (1) chưa có UI; (2) kinh phí duyệt không được chốt khi GĐ duyệt;
(3) không ràng buộc giải ngân ≤ cấp, quyết toán ≤ giải ngân; (4) thanh lý không có thu hồi, cân đối, số biên bản;
(5) người ghi kinh phí không upload được chứng từ; (6) không thông báo.

## Ngoài phạm vi

Tổng hợp theo năm/đơn vị và dashboard (12.6); email (11.2); đợt giải ngân 40/40/20 và khoản chi;
sổ cái, thanh toán, tích hợp kế toán (D-033). Rủi ro: 6.9 còn backlog nên thanh lý chỉ chạy được
trong test tới khi có quyết định nghiệm thu.

## Quy tắc nghiệp vụ

- Kinh phí được duyệt = `budgetMetadata.approvedAmount` nếu có, nếu không là `budgetMetadata.amount`; không có thì 0.
- Số tiền: số không âm, ≤ 10^13 đồng, làm tròn đến đồng (lưu Decimal(18,2)).
- Tổng tính trên bản mới nhất của mỗi `entryId`. Bất biến sau mọi lần ghi/sửa:
  `ΣDISBURSEMENT ≤ ΣGRANT` và `ΣSETTLEMENT ≤ ΣDISBURSEMENT`. Vi phạm → 400 `FUNDING_INVALID`.
- Thanh lý: CV nhập `recoveredAmount ≤ ΣDISBURSEMENT` khi lập. GĐ ký: tính lại từ sổ ghi;
  nếu `ΣSETTLEMENT + recoveredAmount ≠ ΣDISBURSEMENT` → 400 `LIQUIDATION_UNBALANCED` kèm ba con số.
  Cân → chốt 4 số vào biên bản, cấp `liquidationNumber` = `${n}/BBTL-HVQY/${năm}` (n = số biên bản SIGNED
  trong năm + 1), đóng đề tài như hiện nay. Đề tài Closed → sổ ghi khoá (đã có).
- Quyền giữ nguyên ma trận §7: xem GĐ/PGĐ-KH/TP/TB toàn Học viện, CV phụ trách, PP/PI/thành viên đề tài mình;
  PGĐ-TD chỉ tổng hợp; ghi GĐ, TP, TB, CV phụ trách; người trong đề tài không tự ghi.

## Thay đổi kỹ thuật

| Khu vực | Thay đổi |
| --- | --- |
| `proposal-decisions.service.ts`, `proposal-evaluations.dto.ts` | `approve` nhận `approvedAmount?` → ghi `budgetMetadata.approvedAmount`, audit before/after. |
| `approved-projects.service.ts` create | Tạo GRANT v1 từ kinh phí được duyệt nếu > 0 (`recordedOn` = ngày tạo, note "Kinh phí được phê duyệt"). |
| `approved-projects.service.ts` recordFunding | Kiểm tra bất biến tổng sau thay đổi; chỉ nhận tệp purpose `FUNDING_VOUCHER`. |
| `files.dto.ts`, `files.service.ts` | Purpose `FUNDING_VOUCHER` cho `approved_project`; gate = `canWriteFunding` (tách thành helper dùng chung). |
| Prisma + migration | `project_liquidations` thêm `recovered_amount Decimal(18,2) default 0`, `approved_budget`, `total_disbursed`, `total_settled` (Decimal, nullable, chốt khi ký), `liquidation_number text unique nullable`. |
| submitLiquidation / decideLiquidation | Nhận và kiểm tra `recoveredAmount`; kiểm tra cân đối và cấp số khi approve. |
| `getProject` / capability | `liquidation.current` trả thêm `recoveredAmount`, 4 số chốt, `liquidationNumber`, và bảng cân đối hiện thời (`balance`). |
| Thông báo | `notifyUsers` trong cùng tx: PI khi có DISBURSEMENT/SETTLEMENT mới; PI + CV khi ký/từ chối thanh lý. `idempotencyKey` theo entryId:version và liquidationId:status. |
| Web | `projects-api.ts` thêm `getFunding`, `recordFunding`, `submitLiquidation`, `decideLiquidation`; `project-detail.tsx` thêm SectionCard "Kinh phí" và "Thanh lý". Dùng class global sẵn có, không CSS mới. |
| Docs | `docs/permission-matrix.md` (dòng chứng từ kinh phí; quy tắc cân đối ở Liquidation), `docs/contracts/project-execution.md`, `sprint-status.yaml`. |

## Stories

### 6-13-1 Chốt kinh phí được duyệt và GRANT tự động
AC: GĐ approve với `approvedAmount` hợp lệ → lưu vào `budgetMetadata.approvedAmount`, audit có before/after;
bỏ trống → giữ `amount`. Tạo đề tài từ đề xuất có kinh phí > 0 → có đúng một GRANT v1 bằng số đó; = 0 → không tạo.
Test: `tests/approval-routing-db.test.mjs` (mở rộng fixture 6.12).

### 6-13-2 Ràng buộc tổng sổ ghi
AC: ghi DISBURSEMENT làm ΣDISBURSEMENT > ΣGRANT → 400 `FUNDING_INVALID`; ghi SETTLEMENT vượt ΣDISBURSEMENT → 400;
sửa phiên bản GRANT xuống dưới ΣDISBURSEMENT → 400; số > 10^13 hoặc âm → 400. Test service (fake Prisma) cho hàm thuần kiểm tra.

### 6-13-3 Chứng từ kinh phí
AC: GĐ/TP/TB/CV phụ trách upload `FUNDING_VOUCHER` lên đề tài đang thực hiện → 201, có projectHistory;
PI/thành viên/PGĐ-KH → 403; recordFunding với tệp purpose khác → 400 `EVIDENCE_WRONG_RECORD`.
Test: `tests/files-route.test.mjs`.

### 6-13-4 Thanh lý cân đối, chốt số, cấp số BBTL
AC: lập với `recoveredAmount` > ΣDISBURSEMENT → 400; GĐ ký khi lệch → 400 `LIQUIDATION_UNBALANCED`, biên bản vẫn SUBMITTED,
đề tài không đổi; cân → SIGNED, 4 số chốt, `liquidationNumber` dạng `1/BBTL-HVQY/2026`, hai biên bản cùng năm không trùng số;
từ chối không cấp số. Migration áp dụng được lên dữ liệu cũ (default 0 / null). Cập nhật `smoke.test.mjs` nếu đổi model.

### 6-13-5 Giao diện Kinh phí và Thanh lý
AC: trang chi tiết đề tài hiện mục "Kinh phí" (ba tổng, còn lại = cấp − giải ngân, bảng bản ghi mới nhất có tệp,
form thêm/sửa chỉ khi `canWrite`, chọn chứng từ đã upload); PGĐ-TD không thấy mục này; mục "Thanh lý" hiện biên bản,
bảng cân đối (giải ngân / quyết toán / thu hồi / chênh lệch), form lập cho CV, nút Ký/Từ chối cho GĐ khi `canSign`,
thông báo lỗi `LIQUIDATION_UNBALANCED` hiển thị nguyên văn. `npm run typecheck` qua; không dùng từ cấm của smoke test.

### 6-13-6 Thông báo kinh phí và thanh lý
AC: ghi DISBURSEMENT/SETTLEMENT → PI nhận 1 thông báo link `/projects/:id`, không gửi cho người ghi; ký/từ chối thanh lý →
PI và CV phụ trách nhận; ghi lại cùng entry không tạo trùng (idempotencyKey). Test: mở rộng test DB 6.12.

## Kiểm chứng chung

`npm run typecheck`, `npm test` (gồm DB test với `DATABASE_URL`), đi tay trên UI với `admin`/`patuan`/`nmphuong`.
