# Báo cáo QA độc lập vòng 2 — Hội đồng thẩm định

- Ngày kiểm: 24/10/2026, giờ Việt Nam. Căn cứ: `pm-triage.md` §5 và `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §14.
- **Kết quả 9 kịch bản chạy lại: 8 PASS · 1 FAIL · 0 BLOCKED.** K15 FAIL ở yêu cầu hiện nút chốt khóa khi thiếu phiếu; phần đủ phiếu → chốt → trình đã thành công. Không cộng kết quả vòng 1 hoặc các kiểm tra bổ sung vào tổng này.
- Hồ sơ 01 đã sang `ready_for_approval` — **Chờ phê duyệt**. Hồ sơ 02 đã được `vndinh` ký thành lập hội đồng. Còn U03 và ba phát hiện mới cần xử lý; không xác nhận toàn bộ tính năng đạt nghiệm thu.

## Môi trường và giới hạn thao tác

Web `http://localhost:3001`, API `http://localhost:4001/api/v1`, `/health` = 200 ([bằng chứng](environment-vong-2.json)). Dùng database QA `docmans_council_qa` theo môi trường người dùng cung cấp; không truy cập SQL, không đổi kết nối, không migrate/seed, không khởi động lại dịch vụ. Không xác minh độc lập tên database phía máy chủ hoặc hash bản build đang chạy.

Playwright ngoài repo: `/Users/Super/Drdo2/node_modules/playwright`, Chrome headless; desktop **1440×1000**, mobile **390×844**. Thao tác nghiệp vụ qua UI, trừ POST kiểm mã lỗi K4 được PM yêu cầu; API GET dùng đối chiếu quyền, tiến độ, audit và danh sách ứng viên. Không dùng API vượt bước nghiệp vụ.

Không sửa mã nguồn, không commit, không xóa dữ liệu. Sáu file tracked đã thay đổi từ trước vẫn được giữ nguyên. Chỉ tạo file bằng chứng tại thư mục này và script tại `/private/tmp/claude-501/qa/pw/`. Không lưu mật khẩu/session cookie trong báo cáo.

| Dữ liệu thử | ID | Trạng thái cuối |
| --- | --- | --- |
| Hồ sơ 01 | `1cfa5ab5-ac66-4eca-8a8f-0b33107b7118` | Chờ phê duyệt; 6/6 phiếu; tổng hợp đã chốt và trình |
| Hồ sơ 02 | `e00f26a6-ee96-4889-a5d5-53a668458336` | Đang đánh giá; hội đồng đã thành lập, đủ 7 người nhận lời; có bản nháp thư ký |
| Nháp bổ sung do QA vòng 2 tạo | `c5ad230b-9b6f-461f-b47b-711a7778727c` | `QA-CODEX-HDTD-V2-DRAFT-ACCESS`, chưa nộp; dùng kiểm GĐ/PGĐ-KH bị chặn |

Trên hồ sơ 02 đã thu hồi `test_external10`, mời mới `test_external09` để kiểm từ chối rồi thu hồi với lý do. Hội đồng cuối: Chủ tịch `test_internal06`; Phản biện `test_internal07`, `test_external04`; Ủy viên `tvtien`, `test_internal08`, `test_external05`; Thư ký `test_internal09`. Không thay đổi cấu hình Admin.

## Kết quả từng kịch bản

PASS chỉ áp dụng các bước/kỳ vọng §14 được nêu dưới đây; lỗi mở rộng vẫn ghi riêng. Không coi request thành công hoặc việc bấm nút là bằng chứng duy nhất: đã tải lại trang/đối chiếu GET ở các điểm trạng thái cuối.

| Kịch bản | Kết quả | Kết quả thực tế | Bằng chứng |
| --- | --- | --- | --- |
| K4 | PASS | UI không có `nmtrung` ở Ủy viên; POST trực tiếp trả **400 `ROUTING_ACTOR_UNAVAILABLE`**, đúng tên TB duy nhất. Năm tài khoản xung đột không có trong GET ứng viên Phản biện. Một số lần tìm UI năm tài khoản được chụp khi còn “Đang tìm...”, nên không dùng các ảnh chờ đó làm bằng chứng hoàn tất tìm kiếm. | [UI và POST](K4-routing-vong-2.json), [GET 5 tài khoản](K4-conflicts-api-vong-2.json), [ảnh](shots/vong-2/K4-nmtrung-bi-loai.png) |
| K7 | PASS | Lời mời cũ `test_external10` còn dòng **Đã từ chối**, không có nút trả lời hay link hồ sơ; mở thẳng bị 403. Lời mời mới `test_external09`: lý do trống khóa gửi; nhập lý do, gửi và reload vẫn thấy Đã từ chối. TP thấy badge/lý do/blocker; sau thu hồi dòng biến mất. | [lời mời cũ](K7-old-declined-vong-2.json), [mới](K7-new-declined-vong-2.json), [TP](K7-head-vong-2.json), [sau thu hồi](K7-after-revoke-vong-2.json), [ảnh mobile](shots/vong-2/K7-mobile-da-tu-choi-moi.png) |
| K10 | PASS | TB đọc/chuyển được; TP trả lại trống lý do bị báo **Nhập lý do trả lại**. Có lý do → Bị trả lại, hội đồng sẵn sàng trình; CV lập lại → TB chuyển → TP duyệt → Chờ BGĐ ký. Reload thấy cả lịch sử tờ trình cũ và mới. | [trống](K10-return-empty-vong-2.json), [trả lại](K10-returned-vong-2.json), [cuối](K10-complete-vong-2.json), [ảnh](shots/vong-2/K10-cho-bgdk.png) |
| K11 | PASS | `ndbac`, `dnbinh`, `nmtrung` đều mở được hồ sơ; không có nút Ký thành lập hội đồng. PP/TB được kiểm thêm GET = 200, không chấm nhầm việc thiếu nút ký là đã có quyền đọc. | [PGĐ-TD](K11-ndbac-vong-2.json), [PP](K11-dnbinh-vong-2.json), [TB](K11-nmtrung-vong-2.json), [ảnh PP](shots/vong-2/K11-dnbinh-doc-khong-ky.png) |
| K12 | PASS | `vndinh` mở được, ký và xác nhận; hiện **Đã thành lập ngày 24/10/2026**. GET tiến độ = 200. Audit có `establish-evaluation-council`, actor `vndinh`, result `success`, đúng ID cả hai hồ sơ. | [đã ký](K12-signed-vong-2.json), [quyền/tiến độ](READ-vndinh-vong-2.json), [audit](K12-audit-vong-2.json), [ảnh](shots/vong-2/K12-da-thanh-lap.png) |
| K13 | PASS | `test_internal02` mở từ /my-reviews, tiêu đề **Phiếu đánh giá — Phản biện**; chấm 25/20/20/15 = 80/100, nhận xét/kết luận, xác nhận gửi. Reload: chế độ chỉ đọc, trường điểm khóa. Có ảnh mobile form thật và phần phiếu đã gửi. | [phiếu khóa](K13-submitted-vong-2.json), [desktop](shots/vong-2/K13-phieu-khoa.png), [mobile form](shots/vong-2/K13-mobile-phieu-that.png), [mobile phần cuối](shots/vong-2/K13-mobile-phieu-da-khoa.png) |
| K14 | PASS | Theo bước §14: thư ký có **Soạn biên bản**, không có Chấm phiếu; thấy **Phiếu 1** không tên người chấm, lưu nháp thành công, không có Chốt/Trình. GET bằng TP chứng minh bản nháp đã lưu. **Ngoài các bước này, tải lại bị mất nội dung hiển thị — N01 bên dưới.** | [queue](K14-queue-vong-2.json), [phiếu ẩn danh](K14-draft-vong-2.json), [lưu thành công](K14-before-reload-vong-2.json), [bản đã lưu](K14-stored-summary-vong-2.json), [ảnh](shots/vong-2/K14-an-danh-luu-nhap.png) |
| K15 | FAIL | Mẫu số đúng 1/6 rồi 6/6; thư ký không tính vào phiếu chờ. **Thiếu phiếu: có “Còn N phiếu chưa gửi” nhưng nút Chốt bị ẩn, không hiện khóa như §14.** Sau đủ 6, lưu lại nháp để cập nhật snapshot phiếu → chốt → lập tờ trình thành công, hồ sơ `ready_for_approval`. | [thiếu 5](K15-before-vong-2.json), [thiếu 6, có nháp](K15-p2-before-vong-2.json), [đủ 6](K15-all-six-vong-2.json), [cuối](K15-complete-vong-2.json), [ảnh thiếu](shots/vong-2/K15-thieu-6-khong-co-nut-chot.png), [đã trình](shots/vong-2/K15-da-trinh.png) |
| K16 | PASS | Mời `tvtien` Ủy viên, đủ 7 người nhận lời, CV lập → TB chuyển → TP duyệt. GĐ thấy nút ký disabled và lý do đang được phân công đánh giá; `vndinh` ký được, hiện Đã thành lập. | [nhận lời](K16-accepted-vong-2.json), [xung đột](K16-conflict-vong-2.json), [đã ký](K16-signed-vong-2.json), [ảnh GĐ](shots/vong-2/K16-gd-xung-dot-khoa-ky.png), [ảnh PGĐ-KH](shots/vong-2/K16-pgd-kh-ky-thanh-cong.png) |

## Trạng thái lỗi vòng 1

| Mã | Trạng thái | Căn cứ vòng 2 |
| --- | --- | --- |
| L01 | ĐÃ SỬA | TB mở hồ sơ, readiness, tiến độ = 200 và chuyển tờ trình được: [READ-nmtrung](READ-nmtrung-vong-2.json), K10. |
| L02 | ĐÃ SỬA | PGĐ-KH đọc/ký được: K12. Nhánh L02b tiến độ cũng = 200: [READ-vndinh](READ-vndinh-vong-2.json). |
| L03 | ĐÃ SỬA | Cả lời mời đã từ chối từ vòng 1 và lời mời mới đều còn dòng, không hành động; thu hồi mới biến mất: K7. |
| L04 | ĐÃ SỬA | PP mở hồ sơ/readiness/tiến độ = 200, không có nút ký: [READ-dnbinh](READ-dnbinh-vong-2.json), K11. |
| U01 | ĐÃ SỬA | 0/6, 1/6, 6/6; còn chờ tương ứng 6, 5, 0; thư ký không chấm: K12–K15. |
| U02 | ĐÃ SỬA | Hai bề mặt bị báo lỗi đã có thẻ mobile, nút Thu hồi/Chấp nhận/Từ chối hiện trực tiếp. `scrollWidth = innerWidth = 390`: [panel](U02-council-vong-2.json), [lời mời](U02-invitation-vong-2.json). Lỗi tràn Admin ghi riêng N03. |
| U03 | VẪN LỖI | Chi tiết còn `TEAM MEMBERS`, `Staff`, `readiness`: [K10-before](K10-before-vong-2.json). Phiếu ẩn danh còn nhãn tiêu chí `feasibility`, `practical impact`...: [K14](K14-draft-vong-2.json). |
| D01 | ĐÃ SỬA | `tvtien` xuất hiện và mời/nhận lời được; `nmtrung` trả mã routing, không còn `CANDIDATE_NOT_ELIGIBLE`: K4, K16. Xác minh bằng hành vi, không truy vấn bảng lý lịch trực tiếp. |

Kiểm riêng hồ sơ nháp: `patuan` tạo nháp trong `org-khti`; `tvtien` và `vndinh` mở URL trực tiếp đều bị chặn, GET chi tiết/readiness = 403: [GĐ](draft-denied-tvtien-vong-2.json), [PGĐ-KH](draft-denied-vndinh-vong-2.json). Kiểm trong scope không thay thế kiểm ngoài scope.

## Phát hiện mới

### N01 — LOGIC — Trung bình: thư ký không nạp lại bản nháp và trạng thái đã chốt

- Tái hiện: `test_internal09` → hồ sơ 02 → nhập biên bản/kết luận → Lưu nháp → thấy **Đã lưu bản nháp** → reload.
- Thực tế: ô nội dung và kết luận trống. GET `/research-proposals/:id/review-progress` bằng thư ký trả 403; cùng GET bằng TP = 200, có đúng nội dung và `createdById = user-test_internal09`. **Không phải dữ liệu đã bị xóa**, nhưng người soạn không đọc/tiếp tục bản nháp sau reload được.
- Kiểm thêm hồ sơ 01 đã chốt/trình: thư ký mở lại vẫn thấy ô trống cho phép nhập và nút Lưu nháp, không thể hiện chỉ đọc. Không thử ghi đè bản đã chốt.
- Bằng chứng: [trước reload](K14-before-reload-vong-2.json), [sau reload/403](K14-after-reload-vong-2.json), [bản lưu phía TP](K14-stored-summary-vong-2.json), [đã chốt](K14-finalized-reload-vong-2.json); [ảnh trống](shots/vong-2/K14-tai-lai-mat-noi-dung.png), [ảnh đã chốt vẫn cho nhập](shots/vong-2/K14-da-chot-van-form-trong.png).
- Nguyên nhân nghi ngờ: `council-secretary-panel.tsx` lấy bản nháp/trạng thái từ `loadProposalReviewProgress(...).catch(() => null)`; thư ký không có quyền tiến độ nên thiếu `summary`, `locked` không phản ánh trạng thái đã chốt. Đây là suy luận từ code và phản hồi, không phải bản sửa đã kiểm chứng.

### N02 — UI-UX — Thấp: K15 ẩn nút chốt thay vì khóa

- Tái hiện: TP mở hồ sơ 02 đã thành lập, có bản nháp thư ký, chưa đủ phiếu (0/6); tương tự hồ sơ 01 lúc 1/6.
- Thực tế: hiện “Còn 6/5 phiếu chưa gửi”, không có nút Chốt bản tổng hợp. §14 K15 yêu cầu nút khóa kèm lý do. Không quan sát được chốt sớm; sau đủ phiếu chốt/trình được.
- Bằng chứng: [nội dung và danh sách nút](K15-p2-before-vong-2.json), [ảnh toàn panel](shots/vong-2/K15-thieu-6-khong-co-nut-chot.png).
- Nguyên nhân nghi ngờ: `proposal-evaluation-panel.tsx` render nút theo `canFinalize`, trong khi capability chỉ được cấp khi đủ phiếu. Đây là sai lệch hiển thị, không kết luận lỗi bảo vệ backend.

### N03 — UI-UX — Trung bình: phần tham số Admin tràn ngang trên mobile

- Tái hiện: `admin` → `/system-settings` → viewport 390×844 → cuộn xuống **Tham số hệ thống**, dòng `council_formation.EVALUATION`.
- Thực tế: `document.documentElement.scrollWidth = 717`, `innerWidth = 390`; JSON cấu hình không ngắt dòng, nhãn bên trái bị ép thành từng ký tự. Thẻ cấu hình hội đồng phía trên vẫn đọc và thấy Lưu được. Vòng 1 không có đủ bằng chứng vùng tham số này, nên chỉ gọi là phát hiện mới, chưa kết luận hồi quy.
- Bằng chứng: [đo phần tử](U02-admin-overflow-vong-2.json), [ảnh tràn](shots/vong-2/K2-mobile-admin-tran-ngang.png), [thẻ cấu hình/số lượng/Lưu](shots/vong-2/K2-mobile-admin-co-cau-luu.png).
- Nguyên nhân nghi ngờ: `.setting-row` chứa JSON dài không có quy tắc ngắt hoặc giới hạn chiều rộng phù hợp.

## Mobile và log lỗi

Đã chụp PNG viewport tại `shots/vong-2/`, không dùng ảnh trang bị chặn thay cho form chấm:

- Panel hội đồng: [thẻ, trạng thái, Thu hồi](shots/vong-2/K7-mobile-panel-hoi-dong.png).
- `/my-reviews`: [Chấp nhận/Từ chối](shots/vong-2/K7-mobile-loi-moi-moi.png), [Đã từ chối](shots/vong-2/K7-mobile-da-tu-choi-moi.png).
- Phiếu thật: [điểm](shots/vong-2/K13-mobile-phieu-that.png), [tiêu chí thứ tư](shots/vong-2/K13-mobile-phieu-tieu-chi-4.png), [phiếu đã khóa](shots/vong-2/K13-mobile-phieu-da-khoa.png).
- Admin: [đầu thẻ](shots/vong-2/K2-mobile-admin-cau-hinh.png), [cơ cấu/Lưu](shots/vong-2/K2-mobile-admin-co-cau-luu.png), lỗi N03 phía dưới.

[Log thô](network-console-vong-2.json), [tổng hợp](network-console-summary-vong-2.json). Tại thời điểm chốt: **185 console error tương ứng 185 phản hồi HTTP lỗi của trang; 0 JavaScript pageerror; 0 HTTP 5xx**. APIRequestContext bổ sung không qua listener trang, được lưu trong JSON riêng (đặc biệt POST 400 K4).

- 401 `/auth/me` xảy ra khi QA xóa cookie/đổi tài khoản; không phân loại lỗi nghiệp vụ.
- 403 khi người từ chối/GĐ/PGĐ-KH mở nháp là kết quả mong đợi. Một số panel tự gọi `my-review`, `evaluation-council`, `approval-submissions/subject`, `review-progress` với vai trò không được đọc; UI phần tương ứng ẩn nhưng console vẫn có lỗi. Riêng 403 tiến độ thư ký gây N01.
- 400 `/evaluation-summary/finalize` sau khi thêm phiếu: yêu cầu lưu lại nháp tổng hợp để cập nhật snapshot; đã làm và chốt được, không coi là lỗi mới.
- 404 `/research-proposals/new` và `/readiness` do QA dò nhầm URL tạo nháp; URL đúng `/my-proposals/new`, không báo lỗi sản phẩm.

## Chưa kiểm được

- Không kiểm trực tiếp SQL, ngoài scope hoặc mọi tổ hợp phân quyền; quyền trong scope và chặn hồ sơ nháp đã kiểm như trên.
- Không chạy lại K1–K3, K5–K6, K8–K9 thành bộ riêng theo PM; các bước chuẩn bị tương ứng có lặp trong K7/K10/K16. Không xác nhận lại mọi tiêu chí của chúng.
- Năm tài khoản xung đột K4 có GET ổn định; một số lần tìm UI được thu khi đang tải, chưa chứng minh hoàn tất cả năm lượt UI. Riêng `nmtrung` có UI ổn định và POST đúng mã.
- Chưa thử ghi đè bản tổng hợp đã chốt từ thư ký, không khẳng định dữ liệu chốt có thể bị sửa. Chưa kiểm tải tệp, xuất biên bản, gửi email, notification đầu cuối.
- Chưa kiểm thiết bị thật/Safari, screen reader/focus trap đầy đủ, mạng chậm/mất mạng/5xx hoặc thao tác đồng thời.
- Không chạy build, typecheck hoặc bộ test của repository; đây là QA trên dịch vụ đã chạy. Script `node /private/tmp/claude-501/qa/pw/verify-v2.cjs` kiểm tra nhất quán bằng chứng **PASS**, không phải chạy lại thao tác nghiệp vụ và không có nghĩa sản phẩm không còn lỗi.

## Kết luận

- Đã thực hiện trọn 9 kịch bản chạy lại, không còn chuỗi BLOCKED: **8 PASS · 1 FAIL · 0 BLOCKED** ([kết quả máy đọc](results-vong-2.json)).
- Các lỗi L01–L04, U01, U02, D01 có bằng chứng hành vi đã sửa. U03 vẫn lỗi. N01 ảnh hưởng tiếp tục soạn bản nháp; N02 là sai lệch K15; N03 ảnh hưởng màn Admin mobile.
- Bước tiếp theo trong phạm vi QA: xử lý các lỗi được ghi nhận rồi kiểm lại đúng các bề mặt tương ứng. Không sửa nguồn trong vòng QA này.
