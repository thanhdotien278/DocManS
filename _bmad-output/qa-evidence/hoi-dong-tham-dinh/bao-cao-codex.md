# Báo cáo QA độc lập — Hội đồng thẩm định

- Ngày kiểm: 24/10/2026, múi giờ Việt Nam.
- Kết quả: **9 PASS · 2 FAIL · 5 BLOCKED** trên K1–K16. Chưa đủ điều kiện xác nhận hoàn thành tính năng.
- Căn cứ: `_bmad-output/specs/spec-hoi-dong-tham-dinh.md` §10, §11, §14; `docs/development/auth-seed-users.md`.
- Môi trường: Web `http://localhost:3001`, API `http://localhost:4001/api/v1`; `/health` trả `200`. Dùng dịch vụ QA do người dùng cung cấp; không kết nối SQL trực tiếp, không migrate/seed, không khởi động lại dịch vụ.
- Công cụ: Playwright có sẵn tại `/Users/Super/Drdo2/node_modules/playwright`, `chromium.launch({ channel: 'chrome', headless: true })`; desktop 1440×1000, mobile 390×844.
- Trạng thái báo cáo: hoàn thành việc chạy phần có thể tiếp cận và ghi nhận chuỗi bị chặn. Không đồng nghĩa toàn bộ nghiệp vụ đã được kiểm chứng.

## Dữ liệu thử và phạm vi thay đổi

| Hồ sơ do QA tạo | ID | Trạng thái cuối |
| --- | --- | --- |
| `QA-CODEX-HDTD-20261024-01` | `1cfa5ab5-ac66-4eca-8a8f-0b33107b7118` | Đang đánh giá; 7 người đã nhận lời; tờ trình chờ TB rà soát |
| `QA-CODEX-HDTD-20261024-02-K16` | `e00f26a6-ee96-4889-a5d5-53a668458336` | Đang đánh giá; chưa mời được `tvtien`; có lời mời `test_external10` đã từ chối dùng kiểm lại K7 |

Cả hai hồ sơ được tạo bằng `patuan`, đơn vị `org-khti`, thêm `int1` làm thành viên liên kết tài khoản, có hai PDF thử cho `proposal-form` và `budget-form`, nộp trong đợt đang mở, được `nmphuong` giao `hdtien1`, sau đó `hdtien1` xác nhận đầy đủ. Chỉ các bước chuẩn bị này dùng API. Chi tiết phản hồi nằm trong [setup.json](setup.json) và [setup-K16.json](setup-K16.json).

Các thao tác cấu hình, tìm/mời người, nhận/từ chối, thu hồi, lập tờ trình và kiểm quyền trong K1–K16 đều qua UI. Các API GET bổ sung chỉ phục vụ đối chiếu nguyên nhân. Không dùng API để vượt bước trình ký bị chặn. Hạn lời mời `07/11/2026` = ngày kiểm + 14 ngày.

Sau K2 đã trả cấu hình về **TP + TB, 7 thành viên**, CV/PP không tích; [final-config.json](final-config.json) ghi giá trị đọc lại từ UI. Không sửa mã nguồn, không commit, không xóa dữ liệu. Sáu file đã sửa từ trước phiên QA vẫn xuất hiện trong `git status`; QA không chạm các file đó. Chỉ tạo bằng chứng trong thư mục này và script tại `/private/tmp/claude-501/qa/pw/`.

## Kết quả K1–K16

PASS áp dụng cho kỳ vọng nghiệp vụ của kịch bản đã chạy; không có nghĩa mọi yêu cầu UI/UX chung đều đạt. FAIL có sai lệch quan sát được. BLOCKED nghĩa không đủ tiền điều kiện để chạy phần chính; không coi đó là PASS.

| Kịch bản | Kết quả | Thao tác và đối chiếu thực tế | Bằng chứng chính |
| --- | --- | --- | --- |
| K1 | PASS | `hdtien1` mở hồ sơ: panel Đang lập, không có form mời, có lý do vai trò chưa được cấu hình. | [UI](K1-ui.txt), [ảnh](shots/K1-cv-mac-dinh.png) |
| K2 | PASS | Mặc định TP/TB, số 7 và đúng cơ cấu. Bỏ hết vai trò: Lưu khóa với lý do. Nhập 4: Lưu khóa, hiện lỗi số lượng 5–15, không gửi cấu hình sai. Đặt 7 + CV, lưu thành công; CV thấy form. Sau đó bỏ CV và lưu. IRB/nghiệm thu có Chưa áp dụng. | [số sai](K2-invalid-count.json), [lưu](K2-config-saved.json), [CV](K2-cv-enabled.json), [ảnh](shots/K2-khong-chon-vai-tro.png) |
| K3 | PASS | `admin` mở thẳng hồ sơ: bị từ chối, không thao tác hội đồng/ký. | [UI](K3.json), [ảnh](shots/K3-admin-bi-chan.png) |
| K4 | PASS | TP chọn Phản biện và tìm lần lượt `patuan`, `int1`, `hdtien1`, `nmphuong`, `admin`: không có ứng viên. Chọn Ủy viên, tìm `nmtrung`: cũng không có. Nhánh gọi API mời trực tiếp là tùy chọn và không thực hiện. | [6 kết quả UI](K4-conflicts.json), [ảnh](shots/K4-loai-nmtrung.png) |
| K5 | PASS | UI gửi đủ 7 lời mời theo đúng cơ cấu, toàn bộ Chờ chấp nhận; số nhận lời đều 0; trạng thái hồ sơ Đang đánh giá; blocker 7 người chưa nhận lời. Form mời biến mất khi đủ 7 nên không thể mời người thứ 8 trên UI. | [UI và từng lần mời](K5.json), [ảnh](shots/K5-du-7-loi-moi.png) |
| K6 | PASS | `test_internal02` thấy tên đề tài, vị trí Phản biện, hạn và tên người mời TS. Nguyễn Minh Phương. Không có liên kết hồ sơ; mở thẳng hồ sơ bị từ chối. Người mời hiển thị tên đầy đủ, không phải username `nmphuong`. | [lời mời và links](K6-invitation.json), [từ chối truy cập](K6-denied.json), [mobile](shots/K6-mobile-loi-moi.png) |
| K7 | **FAIL** | Lý do trống bị khóa; nhập lý do thì từ chối được, TP thấy Đã từ chối + lý do + blocker đúng. Tuy nhiên trang thành viên mất hẳn dòng lời mời, chỉ còn 0 lời mời, không hiện Đã từ chối như kỳ vọng. Tái hiện trên hồ sơ 02 với `test_external10`, vẫn xảy ra sau reload. | [sau từ chối](K7-declined.json), [TP](K7-head.json), [kiểm lại sau reload](K7-recheck-after-reload.json), [ảnh](shots/K7-loi-moi-bien-mat-viewport.png) |
| K8 | PASS | TP thu hồi `test_external02`, dialog bắt buộc lý do; mời `test_external03`. Bảy người còn lại nhận lời bằng dialog trên UI. TP và CV đều thấy Sẵn sàng trình, điều kiện đã đủ và nút lập tờ trình. | [TP](K8-ready-head.json), [CV](K8-ready-cv.json), [ảnh](shots/K8-san-sang-trinh.png) |
| K9 | PASS | CV lập tờ trình, hiện Đang trình ký · Chờ Trưởng ban QLKH rà soát. TP không còn nút Thu hồi; có thông báo danh sách bị khóa và cần trả lại trước khi thay đổi. Không thử cưỡng ép nút hay gọi mutation API. | [CV trình](K9-submitted.json), [0 nút thu hồi](K9-locked.json), [ảnh viewport](shots/K9-panel-khoa-viewport.png) |
| K10 | **FAIL** | `nmtrung` mở hồ sơ để Chuyển: trang báo không có quyền, GET hồ sơ/readiness trả 403 dù có scope `org-khti`. Không thấy RoutingStatus/nút Chuyển. Các bước TP trả lại, kiểm lý do, lập lại và duyệt tới BGĐ chưa chạy được. | [UI + scope](K10-board-denied.json), [ảnh](shots/K10-tb-truoc-chuyen.png), [log](network-console.json) |
| K11 | PASS | `ndbac`, `dnbinh`, `nmtrung` đều không có nút ký. `ndbac` đọc được hồ sơ; hai tài khoản còn lại bị từ chối đọc. Riêng lỗi quyền của TB được ghi tại K10. | [ndbac](K11-ndbac.json), [dnbinh](K11-dnbinh.json), [nmtrung](K11-nmtrung.json), [ảnh](shots/K11-ndbac-khong-ky.png) |
| K12 | **BLOCKED** | Tờ trình chưa qua TB nên không đến BGĐ. Ngoài ra thử `vndinh` mở hồ sơ cũng gặp 403, là lỗi quyền độc lập. Chưa ký/xác nhận được; chưa kiểm audit thành lập. | [UI + tài khoản](K12.json), [ảnh](shots/K12-pgd-kh.png) |
| K13 | **BLOCKED** | Thành viên đã nhận lời vẫn thấy Chờ Ban giám đốc ký; mở thẳng hồ sơ bị từ chối trước khi hội đồng thành lập. Không tiếp cận form 4 tiêu chí, chưa gửi/chứng minh khóa phiếu. | [hàng chờ](K13-blocked.json), [403](K13-denied.json), [mobile trang bị chặn](shots/K13-mobile-trang-cham-bi-chan.png) |
| K14 | **BLOCKED** | Thư ký thấy đúng vai trò và Chờ Ban giám đốc ký; chưa có hồ sơ được phân công để mở. Chưa kiểm trang biên bản, ẩn danh phiếu và lưu nháp. | [UI](K14-blocked.json), [ảnh](shots/K14-thu-ky-cho-ky.png) |
| K15 | **BLOCKED** | TP thấy Còn 6 phiếu chưa gửi và thư ký được ghi không chấm phiếu. Tuy nhiên hội đồng chưa thành lập, chưa thể gửi 6 phiếu/chốt/trình. Phát hiện riêng dòng tiến độ dùng sai mẫu số 7. | [UI](K15-blocked.json), [ảnh](shots/K15-sai-mau-so-phieu.png) |
| K16 | **BLOCKED** | Đã tạo hồ sơ 02, TP chọn Ủy viên và tìm `tvtien`, không có ứng viên. Danh sách 28 lý lịch đọc bổ sung không có liên kết `tvtien`. Không tự thêm lý lịch cho tài khoản seed; chưa mời đủ người/trình đến BGĐ, chưa chứng minh nút ký khóa do xung đột hoặc `vndinh` ký thay. | [UI tìm](K16-director-candidate.json), [danh sách đọc](profiles-readonly.json), [ảnh](shots/K16-tim-giam-doc.png) |

## Lỗi và vấn đề đã phân loại

### L01 — LOGIC — Cao: TB không đọc được hồ sơ đang chờ chính TB rà soát

- Tái hiện: hoàn tất K8 → `hdtien1` lập tờ trình → đăng nhập `nmtrung` → mở `/proposals/1cfa5ab5-ac66-4eca-8a8f-0b33107b7118`.
- Mong đợi: đọc danh sách, RoutingStatus và Chuyển/Trả lại. Thực tế: thông báo không có quyền; GET `/research-proposals/:id` và `/readiness` trả 403. `auth/me` xác nhận `RESEARCH_BOARD_HEAD` có `org-khti`.
- Ảnh: [K10](shots/K10-tb-truoc-chuyen.png). Tác động: chặn K10 và chuỗi K12–K15.
- Nguyên nhân nghi ngờ: `apps/api/src/proposals-shared/proposal-access.ts:112`, `canReadProposal`, nhánh role đọc chỉ có TP/PGĐ-TD/GĐ, chưa bao gồm TB. Đây là đối chiếu mã đọc hiện tại, chưa xác minh bản build đang chạy.

### L02 — LOGIC — Cao: PGĐ-KH không tiếp cận panel ký

- Tái hiện: đăng nhập `vndinh` → mở cùng hồ sơ đang trình ký.
- Mong đợi theo S2/S5: xem được danh sách, nếu chưa đến bước BGĐ thì nút ký khóa kèm lý do. Thực tế: cả trang hồ sơ bị từ chối đọc, GET hồ sơ/readiness 403.
- Ảnh: [K12](shots/K12-pgd-kh.png). Đối chứng: `tvtien` đọc được và thấy nút ký khóa với lý do chưa đến BGĐ trong [K16-current-leadership.json](K16-current-leadership.json).
- Nguyên nhân nghi ngờ: cùng `canReadProposal`; nhánh đọc không gồm `SCIENCE_DEPUTY_DIRECTOR`. Chưa kết luận mutation ký có lỗi vì chưa đến được tiền điều kiện.

### L03 — LOGIC — Trung bình: lời mời bị từ chối biến mất khỏi trang thành viên

- Tái hiện: thành viên mở `/my-reviews` → Từ chối → nhập lý do → Gửi từ chối → tải lại.
- Mong đợi K7: còn dòng Đã từ chối. Thực tế: 0 lời mời, trang rỗng; không có xác nhận trạng thái cuối trong danh sách. TP vẫn thấy dữ liệu từ chối đúng, nên không phải mất dữ liệu từ chối ở phía quản lý.
- Đã tái hiện với `test_external02`/hồ sơ 01 và `test_external10`/hồ sơ 02.
- Ảnh: [sau gửi](shots/K7-loi-moi-bien-mat-viewport.png); bằng chứng [sau reload](K7-recheck-after-reload.json).
- Nguyên nhân nghi ngờ: `apps/api/src/proposal-evaluations/proposal-review-assignments.service.ts:468` loại bỏ `invitationStatus === "declined"` khỏi `listMyAssignments`.

### U01 — UI/UX — Trung bình: mẫu số phiếu tính cả thư ký

- Tái hiện: TP mở hồ sơ 01 có 7 thành viên, gồm 1 thư ký không chấm → xem Tiến độ phiếu đánh giá.
- Thực tế cùng màn hình có “Đã gửi 0/7 phiếu” và “Còn 6 phiếu chưa gửi”; mong đợi mẫu số chấm là 6. Không kết luận readiness backend sai, vì bộ đếm còn chờ đang là 6.
- Ảnh: [tiến độ](shots/K15-sai-mau-so-phieu.png). Nguyên nhân nghi ngờ: `apps/web/src/components/research-proposals/proposal-evaluation-panel.tsx` dùng tổng phân công thay vì số thành viên chấm.

### U02 — UI/UX — Trung bình: bảng hội đồng/lời mời chưa có bố cục mobile theo S2/S3

- Tái hiện: viewport 390×844 → TP mở panel hội đồng hoặc thành viên mở `/my-reviews`.
- Thực tế bảng vẫn rộng 680 px trong khung 334 px; tên tài khoản bị xuống dòng giữa chuỗi, trạng thái/người mời/nút trả lời nằm ngoài vùng thấy ban đầu. Có thể cuộn ngang để tiếp cận; không ghi nhận mất chức năng do tràn toàn trang. Chưa đạt dạng `data-table` + `mobile-list` yêu cầu ở §10.
- Ảnh: [panel](shots/K9-mobile-panel-dau.png), [cuộn ngang](shots/K9-mobile-panel-scroll-ngang.png), [lời mời](shots/K6-mobile-loi-moi.png), [nút trả lời sau cuộn](shots/K7-mobile-loi-moi-nut-tra-loi.png). Số đo: [UX-mobile-panel.json](UX-mobile-panel.json).
- Nguyên nhân nghi ngờ: bảng trong `proposal-council-panel.tsx` và `reviewer-queue-panel.tsx` giữ trình bày desktop ở mobile.

### U03 — UI/UX — Thấp: nhãn phụ còn tiếng Anh

- Tái hiện: mở chi tiết hồ sơ với CV/TP.
- Thực tế có `TEAM MEMBERS`, nội dung `readiness`, `Staff`; §10 yêu cầu nhãn tiếng Việt. Không cản thao tác nhưng giảm nhất quán.
- Bằng chứng: [K1-ui.txt](K1-ui.txt), ảnh [K1](shots/K1-cv-mac-dinh.png). Vị trí nghi ngờ: các section thông tin/tệp/yêu cầu bổ sung trong workspace hồ sơ.

### D01 — DATA — Trung bình: dữ liệu chuẩn bị thiếu lý lịch cho `tvtien` để chạy K16

- Tái hiện: TP mở hồ sơ 02 → chọn Ủy viên → tìm `tvtien` → không có ứng viên.
- Đối chiếu GET danh sách lý lịch với `pageSize=100`: đủ cả 28/28 bản ghi, không có tài khoản `tvtien` liên kết. Không sửa tài khoản seed hoặc thêm lý lịch để vượt giới hạn dữ liệu thử.
- Ảnh: [K16](shots/K16-tim-giam-doc.png), dữ liệu đọc: [profiles-readonly.json](profiles-readonly.json).
- Đây là thiếu dữ liệu thử, không kết luận bộ lọc ứng viên có lỗi. `nmtrung` cũng chưa có lý lịch trong danh sách; vì vậy K4 chỉ chứng minh bị loại trên UI, chưa chứng minh mã `ROUTING_ACTOR_UNAVAILABLE`.

## Đánh giá UI/UX và ảnh mobile

- Cấu hình Admin: có nhãn/checkbox, cơ cấu đọc được, lý do khóa Lưu rõ; thông báo lưu thành công và vùng `aria-live="polite"` được quan sát. Mobile không tràn toàn trang, có thể cuộn dọc đến trường số và Lưu: [đầu thẻ](shots/K2-mobile-admin-viewport.png), [phần lưu](shots/K2-mobile-admin-luu.png).
- Panel hội đồng: trạng thái, blocker, hạn và vị trí rõ; nút thu hồi biểu tượng có `title` và `aria-label` riêng từng người. Lý do khóa khi đủ người/đang trình rõ. Điểm yếu mobile ở U02.
- Dialog: từ chối/thu hồi có label textarea, bắt buộc lý do và nút gửi khóa; lỗi có vùng `role="alert"`, `aria-live="polite"`. Esc đóng được dialog từ chối. Đã thử Tab, chưa xác nhận focus trap đầy đủ qua mọi dialog/trình đọc màn hình; một nhịp Tab về BODY nên không chấm PASS toàn bộ yêu cầu focus trap.
- Trạng thái rỗng: panel chưa có thành viên có hướng dẫn; sau từ chối trang thành viên về rỗng không thể hiện trạng thái cuối (L03). Trạng thái lỗi truy cập có câu tiếng Việt nhưng gộp lỗi tải và lỗi quyền trong một thông báo chung.
- Loading đã gặp trong quá trình tải trang; chưa kiểm có kiểm soát mạng chậm, lỗi 5xx, mất mạng hoặc thao tác đồng thời.
- Trang chấm phiếu mobile: **không chụp được form thật** vì chưa thành lập hội đồng; chỉ chụp trang truy cập bị chặn ở [K13-mobile-trang-cham-bi-chan.png](shots/K13-mobile-trang-cham-bi-chan.png). Không dùng ảnh đó để khẳng định responsive của form chấm đã đạt.
- Một số PNG `fullPage` ban đầu bị lặp vùng sticky khi chụp trang dài. Giữ bản thô, nhưng ưu tiên ảnh `viewport`, ảnh mobile bổ sung và JSON nội dung UI để đối chiếu; không coi phần lặp trong ảnh dài là lỗi sản phẩm.

## Console và request lỗi

Log thô theo kịch bản: [network-console.json](network-console.json). Bảng gộp URL/status: [network-console-summary.json](network-console-summary.json). Không ghi nhận HTTP 5xx hoặc JavaScript `pageerror` trong phiên chạy. Các console error quan sát được đều là thông báo tải tài nguyên 401/403/404 tương ứng log HTTP.

| Kịch bản | Request bất thường và diễn giải |
| --- | --- |
| K1–K2 | `/my-review` 403 khi CV không phải người chấm: kiểm quyền phụ, không phải lỗi quyền thành lập hội đồng. |
| K3 | GET hồ sơ/readiness 403 với Admin: đúng kỳ vọng. |
| K4–K5 | Không có 4xx/5xx nghiệp vụ bất thường trong tìm/mời. |
| K6–K7 | K6 mở trực tiếp hồ sơ/readiness 403: đúng trước khi được đọc. Từ chối K7 không có request lỗi; sai lệch là danh sách UI sau thành công. |
| K8–K9 | Không có request nghiệp vụ lỗi khi thay thế/nhận lời/lập tờ trình; kiểm `/my-review` của CV có 403 dự kiến. |
| K10 | **Bất thường:** GET hồ sơ/readiness 403 với TB ở bước TB. |
| K11 | GET hồ sơ/readiness 403 với PP/TB; TB liên quan L01. PGĐ-TD có 403 ở panel hội đồng/approval-submissions do không có quyền thao tác này, panel bị ẩn. |
| K12 | **Bất thường:** GET hồ sơ/readiness 403 với PGĐ-KH. |
| K13–K14 | GET hồ sơ/readiness 403 với người đã nhận lời nhưng chưa được BGĐ ký: đúng tiền điều kiện đang bị chặn. |
| K15–K16 | Không có mutation lỗi nghiệp vụ; `tvtien` trên hồ sơ 01 có `/decision-package` 403 khi gói chưa đủ điều kiện. Tìm ứng viên K16 thành công nhưng rỗng. |

Các 401 `/auth/me` lúc xóa cookie/đổi tài khoản là do thiết lập phiên kiểm thử. 404 `/research-proposals/new` trong SETUP là lần thăm dò nhầm đường dẫn tạo hồ sơ của tester, không quy thành lỗi sản phẩm. Một số GET lặp hai lần ở chế độ dev; số request không tương đương số lần người dùng bấm.

## Chưa kiểm được

- K10: Chuyển TB, TP trả lại (trống/có lý do), hiển thị lịch sử Bị trả lại, lập lại, TP duyệt tới BGĐ.
- K12: xác nhận ký thật, ngày thành lập, audit `establish-evaluation-council`. Lỗi truy cập PGĐ-KH đã quan sát độc lập nhưng chưa kiểm được quyền ký ở bước LEADERSHIP.
- K13–K15: chấm bốn tiêu chí, khóa phiếu đã gửi, thư ký không chấm, ẩn danh response/phiếu, lưu nháp biên bản, khóa/chốt đủ sáu phiếu, trình gói sang Chờ phê duyệt.
- K16: xung đột người ký khi GĐ là thành viên; PGĐ-KH ký thay. Chưa mời đủ bảy người trên hồ sơ 02 vì ứng viên bắt buộc đã thiếu.
- Các điều kiện §11 ngoài đường đi đã tiếp cận: audit before/after cấu hình, kiểm mã lỗi API trực tiếp, cấu hình không phải Admin, CV không phụ trách, thay thế sau thành lập, hiệu lực người mới, cạnh tranh phiên/contextVersion. Không suy kết quả từ việc đọc mã nguồn.
- Chưa chạy `npm run typecheck`, `npm test`, `npm run build` (§11.14/§13). Phiên này là kiểm UI độc lập trên dịch vụ đang chạy, không build/restart hay chạy test có thể tạo/đụng database khác.
- Chưa kiểm toàn bộ accessibility, focus trap mọi dialog, trình đọc màn hình, lỗi mạng giả lập và responsive form chấm thật.

## Kiểm chứng và bàn giao

- Chạy UI bằng `node /private/tmp/claude-501/qa/pw/driver.cjs` và các lệnh CommonJS gửi qua `call.cjs`; chỉ dùng Playwright đã có. Các snapshot `.json` chứa nội dung hiển thị, URL và thời điểm lấy bằng chứng.
- `node /private/tmp/claude-501/qa/pw/verify-evidence.cjs`: **PASS** kiểm tra tính nhất quán bằng chứng đã lưu, cấu hình được trả lại, sáu kết quả lọc, bảy lời mời, quyền truy cập và tổng kết. Đây là kiểm tra hồ sơ bằng chứng, **không** thay cho chạy lại nghiệp vụ trên UI.
- Tổng máy đọc được: [results.json](results.json). Giữ nguyên dữ liệu thử để tái hiện.
- Ưu tiên xử lý L01/L02 để mở chuỗi trình ký, bổ sung dữ liệu K16 trong một lần chuẩn bị môi trường được cho phép, rồi chạy lại K10–K16. L03 cần kiểm lại cả trang thành viên và trang TP sau từ chối.
