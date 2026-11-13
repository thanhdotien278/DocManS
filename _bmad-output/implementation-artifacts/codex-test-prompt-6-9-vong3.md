# Prompt cho Codex: kiểm thử Story 6.9 — vòng 3 (13 ca còn dang dở + chạy lại E12)

> Dán toàn bộ phần dưới đây cho Codex. Codex chỉ **kiểm thử và báo cáo**, không sửa code.

---

## Bối cảnh

Vòng 2 (`/tmp/codex-6-9-test-report.md`) có 19/33 ca Đạt và 13 ca chưa hoàn tất: **E4, E5, E7, E8, F7, F10, F13, G1, G2, G3, G4, G6, G7**. Lỗi E12 (PI không xem được đề tài) là do dữ liệu mẫu đặt đơn vị chủ trì ngoài phạm vi PI. Fixture đã được sửa sang `org-khti` ở commit `9f74b58`, nên E12 cần chạy lại.

Vòng này chỉ làm **14 ca** đó. Mỗi ca phải chốt **Đạt** hoặc **Lỗi**. "Không chạy được" chỉ dùng khi có lý do kỹ thuật cụ thể, không dùng cho "chưa làm kịp".

Repo `/Users/Super/DocManS`, nhánh `feat/6-9-quyet-dinh-nghiem-thu` (PR #33). Ghi lại commit HEAD lúc bắt đầu. Nếu HEAD đổi trong lúc chạy thì build lại API và ghi vào báo cáo.

## Chuẩn bị

Làm theo các mục **Vai trò và mục tiêu**, **Chuẩn bị môi trường** và **Tài khoản theo vai trò** trong `_bmad-output/implementation-artifacts/codex-test-prompt-6-9.md`. Dùng script fixture **mới** (đơn vị `org-khti`). Chạy fixture hai lần (lần 2 đổi `code` đợt thành `DOT-CODEX-69B`) để có 4 đề tài A1, A2, B1, B2. DB riêng `docmans_codex69`, API `:4005`, web `:3005`.

Riêng ca E7 cần hồ sơ có tệp. Sau khi chạy fixture, tải 2 tệp PDF vào hồ sơ nghiệm thu của **A1** trước khi lập hội đồng. Cách làm: sửa tạm `acceptance_dossiers.status` của A1 về `draft`, đăng nhập `patuan`, tải "Báo cáo tổng kết" và "Minh chứng sản phẩm" qua `/projects/{A1}/acceptance-dossier`, rồi đặt lại `status = 'submitted'`. Ghi lại các bước này trong báo cáo.

Ảnh chụp lưu ở `/tmp/codex69c-shots/`, đặt tên theo mã ca. Quy tắc giữ nguyên: không sửa code, không commit, không dùng DB dev chung, xóa DB tạm và object MinIO thử nghiệm khi xong.

## Thứ tự gợi ý

Đi một luồng trên A1 tới khi có kết quả Đạt. Trong lúc đi, chụp đủ các trạng thái cho G1–G4, G6, G7. Sau đó làm F7, F13 trên B1/B2 và F10 trên B2.

## Các ca

### E4, E5 — Mở thông báo tờ trình để chuyển bước (A1)

1. `hdtien1` lập tờ trình hội đồng A1.
2. Đăng nhập `nmtrung`. Mở chuông thông báo (hoặc `/notifications`) và **bấm** vào thông báo tờ trình hội đồng nghiệm thu.
3. Đạt khi: trình duyệt đến `/projects/{A1}/acceptance-council`, thấy mục "Tờ trình qua Phòng KHQS" có nút chuyển bước, và chuyển bước được ngay trên trang đó.
4. Làm lại với `nmphuong` (E5), rồi với `tvtien`: bấm thông báo thì vào trang có nút "Ký thành lập".

### E7 — Ủy viên đọc hồ sơ có tệp (A1)

1. Sau khi GĐ ký, đăng nhập `ex1` (Ủy viên). Từ trang hội đồng bấm "Mở hồ sơ nghiệm thu".
2. Đạt khi:
   - Thấy 4 mục và 2 tệp đã tải ở bước chuẩn bị, và **tải về được** cả 2 tệp (HTTP 200, đúng tên tệp).
   - Không có ô sửa, ô tải lên, nút xóa hay nút nộp.
   - `DELETE /files/{id}` của `ex1` với các tệp đó trả `403`.

### E8 — Lý do khóa khi chưa chọn kết quả (A1)

1. Đăng nhập `int2` (Chủ tịch). Tải biên bản, nhập nhận xét, **chưa** chọn kết quả.
2. Đạt khi: nút "Ghi kết quả nghiệm thu" bị khóa, có dòng lý do "Chọn kết quả Đạt hoặc Không đạt.", và có `title` trên nút.
3. Chọn Đạt thì nút mở. Ghi kết quả để hoàn tất luồng A1.

### E12 — Chạy lại: PI xem kết quả (A1 sau khi Đạt, B1 sau khi Không đạt)

1. Đăng nhập `patuan`. Mở `/projects/{A1}`, `/projects/{A1}/acceptance-council` và `/notifications`.
2. Đạt khi:
   - Trang đề tài hiện "Đã nghiệm thu".
   - Trang hội đồng hiện thẻ "Kết quả nghiệm thu" ở chế độ chỉ đọc, không có nút thao tác.
   - Thông báo "Đề tài đạt nghiệm thu" hiển thị và bấm vào thì mở đúng trang hội đồng.
3. Làm lại với B1 sau khi Chủ tịch ghi Không đạt.

### F7 — TB có ghế không chuyển bước được (B2)

1. Trình tờ trình hội đồng B2, đang ở bước TB.
2. Thêm ghế cho `nmtrung` bằng DB: `INSERT` một dòng `acceptance_council_members` với `invitation_status = 'accepted'`, `council_role = 'committee_member'`, `project_id` = B2.
3. Gọi `POST /api/v1/approval-submissions/{id}/advance` với tài khoản `nmtrung`, body `{"expectedStage":"BOARD_REVIEW","note":"x"}`.
4. Đạt khi: nhận `403 APPROVAL_CONFLICT`, và trên UI (nếu nút còn hiện) bấm chuyển bước thì hiện lỗi tiếng Việt, không có mã kỹ thuật. Xóa dòng ghế đã thêm sau khi kiểm.

### F10 — Vai trò không có quyền trên B2

Mở `/projects/{B2}/acceptance-council` và gọi `GET /api/v1/projects/{B2}/acceptance-council` với từng tài khoản sau: `hdtien2`, `dnbinh`, `ndbac`, `int1`, `admin`, `ex3` (không có ghế ở B2).

Đạt khi mỗi tài khoản rơi vào đúng một trong hai trường hợp:
- Đọc được đề tài: xem ở chế độ chỉ đọc, `allowedActions` rỗng, không có nút nào.
- Không đọc được: UI báo "Bạn không có quyền xem hội đồng nghiệm thu…", API trả `403`.

Ghi bảng: tài khoản, HTTP code, `allowedActions`, ảnh chụp.

### F13 — Thao tác song song

1. **Nhận lời song song:** đã chạy ở vòng 2 (201 + 409). Lần này đối chiếu thêm `project_history` và `audit_logs` của đề tài: chỉ có một dòng `acceptance-council.accept` cho người đã nhận lời thành công, không có dòng thừa.
2. **Ký song song (B1 hoặc B2 ở bước Ban giám đốc):** gửi đồng thời 2 request `POST /api/v1/projects/{id}/acceptance-council/approve` của `tvtien`, cùng `contextVersion`.
3. **Ghi kết quả song song:** gửi đồng thời 2 request `POST .../result` của Chủ tịch (một Đạt, một Không đạt).
4. Đạt khi:
   - Mỗi nhóm request chỉ có một request thành công; request còn lại nhận 409 hoặc 400.
   - `approval_submissions` chỉ đóng một lần.
   - Chỉ có một dòng lịch sử `acceptance-council.establish` và một dòng `project.acceptance.result`.
   - Trạng thái đề tài khớp với request thành công.
   - Mỗi bước chỉ có một thông báo cho mỗi người.

### G1 — Bố cục ở 375px và 1280px, đủ 5 trạng thái

Các trạng thái: Đang lập (A1 trước khi trình), Đang trình (A1 ở bước TB), Đã thành lập (góc nhìn Chủ tịch A1), Đã có kết quả (A1), Đã từ chối lời mời (màn của `ex1` ở F1 vòng trước; dựng lại trên B2 nếu cần).

Đạt khi ở cả 10 tổ hợp:
- `document.documentElement.scrollWidth` bằng chiều rộng viewport.
- Desktop hiện bảng, mobile hiện thẻ.
- Không có chữ bị cắt hoặc nút chồng lên nhau.

### G2 — Mọi hộp thoại

5 hộp thoại: thu hồi, từ chối lời mời, ký thành lập, từ chối ký, ghi kết quả. Với mỗi hộp, đạt khi:
- Focus vào ô lý do, hoặc vào nút đầu tiên nếu hộp không có ô lý do.
- Esc đóng được, Hủy đóng được, và focus quay lại nút đã mở hộp.
- Nút xác nhận khóa khi thiếu lý do bắt buộc.
- Tab không thoát ra ngoài hộp thoại.

### G3 — Bàn phím toàn hành trình

Chỉ dùng Tab, Shift+Tab, Enter, Space, phím mũi tên và Esc để làm hết các việc sau, mỗi lần đăng nhập đúng vai trò:
- mời một thành viên (chọn vị trí, gõ tìm, chọn người, gửi);
- nhận lời;
- lập tờ trình;
- ký;
- tải biên bản (chọn tệp bằng bàn phím);
- ghi kết quả.

Đạt khi làm xong mà không cần chuột, vòng focus luôn nhìn thấy được, và thứ tự Tab hợp lý. Ghi bước nào bị kẹt.

### G4 — Không lộ mã kỹ thuật

Ở mọi trạng thái và vai trò đã mở trong vòng này, kể cả các lỗi cố ý (F7, F10, F13, nộp thiếu biên bản hoặc nhận xét, `contextVersion` cũ), quét `document.body.innerText`. Đạt khi không có:
- mã lỗi in hoa có gạch dưới, ví dụ `COUNCIL_NOT_READY`, `APPROVAL_CONFLICT`;
- `undefined`, `null` hay `[object Object]`;
- UUID thô, ngoài URL.

### G6 — Console và network toàn hành trình

Ghi lại console và network trong suốt luồng A1, từ lúc mời tới khi ghi kết quả. Đạt khi:
- không có lỗi JS (uncaught, React warning về key hay hydration);
- không có request 5xx;
- các request 4xx chỉ là lỗi cố ý của các ca chặn, hoặc 401 do đổi tài khoản.

Lỗi `ERR_BLOCKED_BY_ORB` của ảnh đại diện ghi riêng là "ngoài phạm vi 6.9", kèm URL, không tính vào kết quả ca này.

### G7 — Đối chiếu `docs/ux-design-guidelines.md`

Đọc hướng dẫn rồi so với ảnh ở G1. Đạt khi:
- màu dùng token xanh định chế, huy hiệu trạng thái đúng tông (thành công / cảnh báo / thông tin / nguy hiểm);
- không có gradient, hero banner hay emoji;
- khoảng cách và kiểu chữ đồng nhất với trang hồ sơ nghiệm thu và trang hội đồng đề xuất.

Mỗi điểm lệch ghi kèm ảnh và dòng tương ứng trong guideline.

## Test tự động

```bash
export DATABASE_URL="$DB69"
npm run typecheck
npm test
```

## Báo cáo

Ghi đè `/tmp/codex-6-9-test-report.md` bằng báo cáo tiếng Việt gồm:

1. Tóm tắt: HEAD đã test, 14 ca: số Đạt, Lỗi, Không chạy được (kèm lý do).
2. Bảng phát hiện, sắp theo mức độ: `# | Mức độ | Nhóm | Ca | Vai trò | Các bước tái hiện | Mong đợi | Thực tế | Bằng chứng`.
3. Bảng kết quả từng ca: `Ca | Kết quả | Bằng chứng ngắn`.
4. Ghi chú ngoài phạm vi (ví dụ lỗi ảnh đại diện).

Chỉ ghi điều đã tận mắt tái hiện. Khi xong: dừng các tiến trình, xóa object MinIO thử nghiệm và chạy

```bash
docker exec docmans-postgres-1 psql -U docmansystem -d postgres -c "DROP DATABASE docmans_codex69"
```
