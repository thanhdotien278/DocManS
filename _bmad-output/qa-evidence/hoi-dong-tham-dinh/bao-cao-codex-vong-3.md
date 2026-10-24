# Báo cáo QA độc lập vòng 3 — Hội đồng thẩm định

- Ngày kiểm: 24/10/2026. **4 PASS · 1 FAIL · 0 BLOCKED**, tính theo đúng 5 nhóm yêu cầu ([JSON](results-vong-3.json)). N02 vẫn lỗi; không xác nhận nghiệm thu toàn bộ tính năng.
- Web `localhost:3001`, API `localhost:4001`; Chrome headless, desktop 1440×1000, mobile 390×844. Tái sử dụng driver vòng 2 thành `driver-v3.cjs` trong `/private/tmp/claude-501/qa/pw/`.
- Không sửa nguồn, commit, restart, migrate/seed. Chỉ thêm một dòng nháp hồ sơ 02, giữ nguyên nội dung cũ; không chốt/trình/thu hồi hay sửa cấu hình.

## Kết quả từng điểm

| Điểm | Kết quả | Quan sát thực tế và bằng chứng |
| --- | --- | --- |
| 1 — N01 | PASS | Hồ sơ 02: nháp vòng 2 và kết luận `approve` nạp lại đúng; thêm nội dung → Lưu nháp → reload vẫn nguyên ([trước](N01-p2-before-vong-3.json), [sau](N01-p2-reloaded-vong-3.json), [ảnh](shots/vong-3/N01-p2-bo-sung-da-luu.png)). Hồ sơ 01: textarea/select khóa, không Lưu nháp/Chấm/Chốt/Trình, hiện “Đã chuyển chờ phê duyệt… chỉ đọc” ([JSON](N01-p1-readonly-vong-3.json), [ảnh khóa](shots/vong-3/N01-p1-trang-thai-khoa.png)). Sáu “Phiếu N” không hiện tên người chấm; bốn tiêu chí tiếng Việt ([JSON](N01-anonymous-vong-3.json), [ảnh](shots/vong-3/N01-p1-phieu-an-danh-tieng-viet.png)). |
| 2 — N02 | FAIL | TP `nmphuong`: 0/6, có “Còn 6 phiếu chưa gửi.” nhưng **không có nút Chốt bản tổng hợp**, cả sau reload ([JSON](N02-tp-recheck-vong-3.json), [DOM](N02-tp-dom-vong-3.json), [ảnh](shots/vong-3/N02-tp-reload-van-thieu-nut.png)). `ndbac`, `dnbinh` không thấy nút: nhánh này PASS ([PGĐ](N02-ndbac-vong-3.json), [PP](N02-dnbinh-vong-3.json)). Không cưỡng ép thao tác. |
| 3 — N03 | PASS | Mobile: `scrollWidth = innerWidth = 390`, nhãn đọc theo dòng, không ép từng ký tự ([JSON](N03-mobile-vong-3.json), [ảnh](shots/vong-3/N03-admin-mobile.png)). Desktop vẫn bố cục hai cột danh sách/form cập nhật; không tràn ngang ([JSON](N03-desktop-vong-3.json), [ảnh](shots/vong-3/N03-admin-desktop.png)). |
| 4 — U03 | PASS | Chi tiết cả hai hồ sơ dưới TP không còn `TEAM MEMBERS`, `Staff`, `readiness`; thay bằng tiếng Việt ([01](U03-p1-vong-3.json), [02](U03-p2-vong-3.json), [ảnh](shots/vong-3/U03-p2-tieng-viet.png)). |
| 5 — Hồi quy nhanh | PASS | Hồ sơ 02 vẫn đủ 7 thành viên, Đã thành lập; desktop có bảng, mobile có thẻ ([desktop JSON](hoi-dong-desktop-vong-3.json), [mobile JSON](hoi-dong-mobile-vong-3.json), [ảnh desktop](shots/vong-3/hoi-dong-desktop.png), [ảnh mobile](shots/vong-3/hoi-dong-mobile.png)). Không có JavaScript `pageerror` hoặc HTTP 5xx trong các lượt kiểm. |

**Điều chỉnh tài khoản có căn cứ:** thư ký hồ sơ 01 là `test_internal05`, đúng bằng chứng `K14-finalized-reload-vong-2.json`; dùng tài khoản này để kiểm chỉ đọc/ẩn danh. `test_internal09` chỉ là thư ký hồ sơ 02, mở 01 bị 403 ([bằng chứng](N01-p1-access-vong-3.json)); không coi đây là lỗi mới.

## Lỗi còn tồn tại / lỗi mới

- **N02 — UI-UX — Thấp — chưa sửa:** đăng nhập `nmphuong` → `/proposals/e00f26a6-ee96-4889-a5d5-53a668458336` → “Tổng hợp và trình phê duyệt” → thấy lý do thiếu 6 phiếu nhưng không có nút chốt khóa. Kỳ vọng: nút hiện disabled kèm lý do. Reload tái hiện như cũ; không kết luận lỗi cho phép chốt sớm ở backend.
- Không phát hiện lỗi mới trong phạm vi vòng này.

## Log và kiểm chứng

- [Log thô](network-console-vong-3.json), [tổng hợp](network-console-summary-vong-3.json): **0 pageerror, 0 HTTP 5xx**; 44 console error do HTTP lỗi, phân bố HTTP {'401': 8, '403': 36}. 401 xuất hiện khi đổi tài khoản; các 403 gồm mở hồ sơ 01 bằng thư ký 02 và request panel không được cấp quyền. Không gọi toàn bộ console là sạch.

- `node /private/tmp/claude-501/qa/pw/verify-v3.cjs`: kiểm tra nhất quán dữ liệu đã thu và liên kết báo cáo, kết quả ghi ở [verification](verification-vong-3.json); không thay thế lượt chạy UI.

## Chưa kiểm được

- Không đối chiếu hash code đang phục vụ hoặc tên database bằng SQL. Không có ảnh baseline Admin desktop đúng cùng vị trí để so pixel; chỉ xác nhận cấu trúc hiện tại.
- Không thử ghi đè bản đã chốt, cưỡng ép nút khóa, chốt/trình lại hay toàn bộ ma trận quyền. Không kiểm thiết bị thật/Safari, đồng thời, mất mạng; không chạy build/typecheck/full test.
- Chỉ kết luận theo các tài khoản, hai hồ sơ và bề mặt đã kiểm ở trên; không mở rộng thành xác nhận toàn hệ thống.
