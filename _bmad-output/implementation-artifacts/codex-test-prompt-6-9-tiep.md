# Prompt cho Codex: kiểm thử tiếp Story 6.9 — Hội đồng nghiệm thu (vòng 2)

> Dán toàn bộ phần dưới đây cho Codex. Codex chỉ **kiểm thử và báo cáo**, không sửa code.

---

## Bối cảnh

Vòng 1 (báo cáo `/tmp/codex-6-9-test-report.md`) mới kiểm phần đầu luồng: không có ca nào đạt đầy đủ, 35/36 ca còn dang dở, 1 lỗi (C4: nút "Gửi lời mời" bị khóa mà không có lý do). C4 đã được sửa ở commit `3b097d6`. Vòng này phải **chạy hết luồng qua giao diện**, từ mời thành viên tới đóng đề tài, và chốt từng ca là **Đạt** hoặc **Lỗi**. Hạn chế tối đa ca "chưa hoàn tất".

Repo `/Users/Super/DocManS`, nhánh `feat/6-9-quyet-dinh-nghiem-thu` (HEAD từ `3b097d6` trở đi).

## Làm như vòng 1

Đọc `_bmad-output/implementation-artifacts/codex-test-prompt-6-9.md` và làm theo nguyên các mục **Vai trò và mục tiêu**, **Luồng nghiệp vụ cần hiểu**, **Chuẩn bị môi trường** (DB riêng `docmans_codex69`, script fixture tạo đề tài A và B, API :4005, web :3005) và **Tài khoản theo vai trò**. Riêng mục D (test tự động) dùng `DATABASE_URL="$DB69"`.

Quy tắc giữ nguyên: không sửa code, không commit, không dùng DB dev chung, xóa DB tạm khi xong.

Để vòng này đủ dữ liệu, chạy fixture **hai lần** (sửa `code` của đợt thành `DOT-CODEX-69B` ở lần 2). Như vậy có 4 đề tài: A1, A2 (luồng Đạt và thanh lý), B1, B2 (luồng Không đạt, trả lại, từ chối, xung đột). Ghi lại id từng đề tài.

## Cách làm và cách tính

- Thao tác **qua giao diện** (Playwright hoặc trình duyệt) cho mọi bước có nút trên UI. Chỉ dùng API trực tiếp để: kiểm mã lỗi khi UI đã ẩn nút, tạo trạng thái khó dựng (sửa DB), hoặc kiểm tra chéo.
- Mỗi ca ghi **Đạt** hoặc **Lỗi**, kèm bằng chứng: ảnh chụp, HTTP code + body, hoặc truy vấn DB. Chỉ ghi "Không chạy được" khi có lý do kỹ thuật cụ thể (ghi rõ lý do).
- Ảnh chụp lưu ở `/tmp/codex69b-shots/`, đặt tên theo mã ca (vd. `E3-ky-thanh-lap.png`).
- Muốn chuyển nhanh tài khoản thì gọi `POST /api/v1/auth/logout` rồi `POST /api/v1/auth/login`; cookie dùng chung cho `localhost`.

## E. Hành trình đầu-cuối qua giao diện (đề tài A1)

| Ca | Ai | Thao tác trên UI | Đạt khi |
|---|---|---|---|
| E1 | `nmtrung` (TB, cấu hình gồm TP/TB/CV) | Vào trang đề tài A1 → thẻ "Hội đồng nghiệm thu" → mời `int2` làm Chủ tịch, `int3` làm Thư ký, `ex1` làm Ủy viên | 3 dòng "Chờ phản hồi"; tiến độ 0/1 mỗi vị trí; nút "Lập tờ trình" khóa kèm lý do; khi chưa chọn gì, nút "Gửi lời mời" hiện lý do (kiểm lại C4) |
| E2 | `int2`, `int3`, `ex1` | Vào `/my-reviews` → "Xem lời mời" → "Nhận lời" | Dòng chuyển "Đã nhận lời"; thông báo của người mời có loại `accepted`, link trỏ `/projects/:id/acceptance-council` |
| E3 | `hdtien1` (CV phụ trách) | Mở trang hội đồng A1 → "Lập tờ trình thành lập hội đồng" có ghi chú | Phụ đề "Đang trình · Chờ Trưởng ban…"; danh sách bị khóa; mục "Tờ trình qua Phòng KHQS" hiện |
| E4 | `nmtrung` | Mở thông báo tờ trình (kiểm link) → chuyển bước trong mục "Tờ trình qua Phòng KHQS" | Bước sang "Chờ Trưởng phòng" |
| E5 | `nmphuong` | Như E4 | Bước sang "Chờ Ban giám đốc ký" |
| E6 | `tvtien` (GĐ) | Mở thông báo → "Ký thành lập" → xác nhận | Huy hiệu "Đã thành lập"; ngày thành lập đúng giờ Việt Nam; thành viên nhận thông báo `established` |
| E7 | `ex1` (Ủy viên) | Trang hội đồng → "Mở hồ sơ nghiệm thu" | Xem được 4 mục và tệp ở chế độ chỉ đọc; không có ô sửa, ô tải, nút nộp; không có khu ghi kết quả |
| E8 | `int2` (Chủ tịch) | Khu "Ghi kết quả": tải biên bản PDF → xóa → tải lại → nhập nhận xét → chọn Đạt → xác nhận | Nút ghi kết quả khóa kèm lý do cho tới khi đủ ba điều kiện; hộp xác nhận ghi "Không hoàn tác"; sau đó thẻ "Kết quả nghiệm thu" chỉ đọc, có link tải biên bản |
| E9 | `hdtien1` | Trang chi tiết đề tài A1 | Trạng thái "Đã nghiệm thu"; lịch sử có các mục hội đồng với nhãn tiếng Việt; thẻ thanh lý mở |
| E10 | `hdtien1` → `tvtien` | Lập biên bản thanh lý → trình → GĐ ký (theo luồng thanh lý hiện có) | Đề tài `closed` |
| E11 | `int2`, `int3`, `ex1` | `/my-reviews` sau khi có kết quả | Mục "Hội đồng nghiệm thu" không còn đề tài A1 |
| E12 | `patuan` (PI) | Trang đề tài và trang hội đồng A1 | Thấy kết quả và thông báo kết quả; không có nút thao tác hội đồng nào |

## F. Nhánh rẽ và chặn

| Ca | Đề tài | Thao tác | Đạt khi |
|---|---|---|---|
| F1 | B1 | Mời đủ 3 người; một người **từ chối** có lý do qua UI | Người từ chối thấy màn "Bạn đã từ chối…", không có lỗi 403; người mời nhận thông báo `declined`; dòng hiện lý do; "Lập tờ trình" khóa với blocker "đã từ chối: thu hồi và mời người khác" |
| F2 | B1 | Người lập thu hồi người từ chối (lý do bắt buộc), mời người khác | Ô ứng viên cập nhật sau khi thu hồi; người bị thu hồi không còn ghế trên `/my-reviews` và không còn thấy thông báo hội đồng |
| F3 | B1 | Trình; **TB trả lại** qua UI có lý do | Danh sách giữ nguyên; mời/thu hồi mở lại; "Ghi chú gần nhất" hiện lý do |
| F4 | B1 | Trình lại tới GĐ; **GĐ từ chối** qua UI (thử để trống lý do trước) | Nút xác nhận khóa khi chưa có lý do; sau đó tờ trình bị từ chối, danh sách giữ nguyên, đề tài vẫn "Chờ nghiệm thu"; người trình và CV nhận thông báo `rejected` |
| F5 | B1 | Trình lại, ký; Chủ tịch ghi **Không đạt** | Đề tài `failed`; thanh lý mở |
| F6 | B2 | Mời `vndinh` (PGĐ-KH) làm Ủy viên, đủ cơ cấu, trình tới Ban giám đốc | `vndinh` không thấy nút ký (API: không có `acceptance-council.sign`; gọi approve → `403 APPROVAL_CONFLICT`); `tvtien` vẫn ký được |
| F7 | B2 | Thêm một ghế `accepted` cho `nmtrung` bằng DB khi tờ trình đang ở bước TB | `nmtrung` chuyển bước → `403 APPROVAL_CONFLICT`, UI hiện lỗi tiếng Việt; xóa ghế đó sau khi kiểm |
| F8 | B2 | Sau khi ký, thêm Chủ tịch vào `approved_project_members` (ACTIVE) bằng DB | Chủ tịch ghi kết quả bị chặn (`403`); trả DB về như cũ sau khi kiểm |
| F9 | B2 | Trước khi ký: cho một thành viên đã nhận lời trở thành thành viên đề tài (DB) | GĐ ký → `400 COUNCIL_MEMBER_INELIGIBLE`, UI hiện thông báo; trả DB về như cũ |
| F10 | B2 | Các vai trò không có quyền mở trang hội đồng B2: `hdtien2`, `dnbinh`, `ndbac`, `int1`, `admin`, và một nhà nghiên cứu không có ghế ở B2 (vd. `ex3`) | Hoặc chỉ đọc (người đọc được đề tài, không có nút) hoặc thông báo "không có quyền" (người không đọc được); không ai có nút thao tác ngoài quyền |
| F11 | B2 | Đổi cấu hình `council_formation.ACCEPTANCE` về mặc định (xóa dòng `system_parameters`) | `hdtien1` không còn form mời (nút ẩn hoặc lý do); API → `403 COUNCIL_FORMATION_DENIED`; TP/TB vẫn mời được |
| F12 | bất kỳ | Mở trang hội đồng ở 2 tab; thao tác ở tab 1 rồi thao tác ở tab 2 | Tab 2 báo lỗi kèm nút "Tải lại", nội dung đang nhập (nhận xét, ghi chú trình) không mất |
| F13 | bất kỳ | Hai người cùng bấm nhận lời / hai lần bấm ký thật nhanh (gửi song song qua API) | Không có trạng thái lệch: không trùng lịch sử, tờ trình đóng một lần |
| F14 | bất kỳ | PI hoặc Ủy viên gọi `DELETE /files/:id` với biên bản trước khi có kết quả; Chủ tịch xóa sau khi có kết quả | `403` và `400 WORKFLOW_STATE_DENIED` |

## G. UI/UX trên toàn hành trình

Chạy lại ở **375px** và **1280px** cho mỗi trạng thái: Đang lập, Đang trình, Đã thành lập (góc nhìn Chủ tịch), Đã có kết quả, Đã từ chối lời mời.

1. Không tràn ngang (`scrollWidth` bằng viewport); bảng ở desktop, thẻ ở mobile.
2. Mọi hộp thoại (thu hồi, từ chối lời mời, ký, từ chối ký, ghi kết quả): focus vào ô đầu, Esc/Hủy đóng được, nút xác nhận khóa khi thiếu lý do bắt buộc.
3. Điều hướng toàn bộ bằng bàn phím (Tab/Shift+Tab/Enter/Space) qua form mời, các nút, các hộp thoại; thấy rõ focus.
4. Không lộ mã kỹ thuật (`COUNCIL_NOT_READY`, `undefined`, id thô) trong text người dùng thấy.
5. Ngày giờ: thao tác trong khoảng 0h–7h giờ Việt Nam không bị lùi một ngày (đổi giờ máy hoặc sửa `invited_at`/`council_established_at` trong DB thành `23:30 UTC`).
6. Console không có lỗi ngoài 401 do đổi tài khoản; không có request 5xx.
7. Đối chiếu `docs/ux-design-guidelines.md`: màu, khoảng cách, huy hiệu trạng thái, không gradient/hero/emoji.

## H. Test tự động

```bash
export DATABASE_URL="$DB69"
npm run typecheck
npm test
```

## Báo cáo

Ghi đè `/tmp/codex-6-9-test-report.md` bằng báo cáo tiếng Việt gồm:

1. Tóm tắt: tổng số ca E/F/G, số Đạt, Lỗi, Không chạy được (kèm lý do).
2. Bảng phát hiện, sắp theo mức độ: `# | Mức độ | Nhóm | Ca | Vai trò | Các bước tái hiện | Mong đợi | Thực tế | Bằng chứng`.
3. Bảng kết quả từng ca: `Ca | Kết quả | Bằng chứng ngắn`.
4. Điểm spec mơ hồ hoặc mâu thuẫn với `docs/permission-matrix.md`.

Chỉ ghi điều đã tận mắt tái hiện; ca nào chỉ suy luận từ code thì ghi rõ. Khi xong: dừng các tiến trình và chạy

```bash
docker exec docmans-postgres-1 psql -U docmansystem -d postgres -c "DROP DATABASE docmans_codex69"
```
