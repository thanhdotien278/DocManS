# Epic 4 Context: Tiếp nhận và nộp đề xuất nghiên cứu

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

TP và CV mở và quản lý đợt tiếp nhận đề xuất. Chủ nhiệm (PI, mọi vai trò trừ QT/NNB) lập hồ sơ nháp, khai báo nhóm, nhập thông tin có cấu trúc, đính kèm tệp, kiểm tra mức sẵn sàng rồi nộp chính thức với lịch sử nộp bất biến. Mỗi đợt có đúng một CV phụ trách (D-038): hồ sơ nộp trong đợt thuộc CV đó ngay khi nộp. CV phụ trách cũng xử lý yêu cầu rút, sửa sau nộp và mở lại hồ sơ. Epic này là đầu vào của luồng kiểm tra, đánh giá và phê duyệt (Epic 5). Nếu thiếu nó, không hồ sơ nào vào được quy trình chính thức.

## Stories

- Story 4.1: Tạo và quản lý đợt tiếp nhận đề xuất
- Story 4.2: Tạo đề xuất nháp và thiết lập quan hệ tham gia
- Story 4.3: Nhập và cộng tác trên thông tin đề xuất có cấu trúc
- Story 4.4: Đính kèm và quản lý tệp đề xuất
- Story 4.5: Kiểm tra mức độ sẵn sàng trước khi nộp
- Story 4.6: Nộp chính thức và xem lịch sử nộp đề xuất
- Story 4.7: Giao CV phụ trách cho đợt tiếp nhận và áp dụng cho hồ sơ trong đợt
- Story 4.8: Rút, sửa sau nộp và mở lại do CV phụ trách

## Requirements & Constraints

- **Đợt tiếp nhận:** chỉ TP và CV trong scope được tạo, mở, đóng hoặc sửa đợt. Đợt có tên, thời gian (start < end), phạm vi (mặc định toàn Học viện hoặc chọn đơn vị cụ thể), loại đề xuất, checklist và gói tệp bắt buộc không rỗng. Đợt đang mở hiển thị cho mọi vai trò trừ QT/NNB; QT/NNB không thấy đợt nào. Quyền quản lý đợt **không** cấp quyền xem hay quản lý hồ sơ trong đợt; hồ sơ luôn theo unit scope (TP/TB/PP), CV phụ trách hoặc quan hệ tham gia.
- **PI:** PI do hệ thống suy ra từ người tạo và không đổi được. Chỉ PI hiện tại được nộp hoặc nộp lại. Delegate, thư ký, thành viên, cán bộ quản lý không phải PI và NNB đều bị từ chối trước khi có mutation. Hồ sơ đề xuất không có hành động nào được ủy quyền.
- **Đóng góp giới hạn:** `TOPIC_MEMBER` và NNB chỉ sửa đúng section/field hoặc loại tệp được cấp. `TOPIC_SECRETARY` chỉ cập nhật dữ liệu hành chính được cấp; không đổi roster nhạy cảm, không nộp thay. Quyền tệp không mở rộng quyền đọc, sửa hay nộp.
- **Readiness:** backend tính dựa trên field bắt buộc, roster, checklist, loại và phiên bản tệp, trạng thái đợt theo cấu hình hiện hành; không dùng kết quả cache. Thiếu điều kiện thì nộp bị từ chối atomically, hồ sơ giữ trạng thái nháp và trả lỗi gắn với section hoặc tệp cụ thể.
- **Lịch sử nộp:** mỗi lần nộp tạo submission event bất biến gồm actor, thời điểm, version hồ sơ, bộ tệp và context authorization. Sau khi nộp, mọi thay đổi đi qua yêu cầu hoặc action tường minh, không ghi đè bản đã nộp. Khi có request nộp đồng thời, chỉ một request thành công; request còn lại nhận lỗi state/version mismatch.
- **CV phụ trách (D-038, cập nhật 2026-11-01):**
  - Mỗi đợt có tối đa một CV phụ trách active, mỗi hồ sơ có tối đa một CV phụ trách hiện hành.
  - TP mở đợt chưa có CV thì bị chặn. CV mở đợt chưa có CV thì hệ thống gán chính CV đó làm CV của đợt trong cùng transaction với việc mở (audit actor `System`, ghi người mở); gán thất bại thì đợt không mở. Chỉ hành động mở kích hoạt quy tắc này, việc tạo đợt thì không. Đợt đã có CV thì mở hoặc mở lại không đổi CV.
  - Khi nộp thành công, CV của đợt trở thành `PROPOSAL_MANAGEMENT_OFFICER` của hồ sơ trong cùng transaction (service-only, audit actor `System`). Khi nộp lại, hồ sơ giữ CV hiện tại.
  - TP đổi CV của cả đợt (áp dụng cho các hồ sơ trong đợt) hoặc của từng hồ sơ. TB giao, chuyển, thu hồi CV theo từng hồ sơ, không đổi được CV của cả đợt. Các vai trò khác bị từ chối.
  - CV cũ mất quyền ngay; phân công trong quá khứ không cấp quyền nào.
  - "Chưa có người phụ trách" chỉ xuất hiện khi TP/TB thu hồi CV mà chưa giao lại.
  - Không triển khai mảng/segment hay tự giao CV theo mảng.
  - TP/PP/TB/CV có thể là PI hoặc thành viên, kể cả CV trong chính đợt mình phụ trách; việc giao CV không bị chặn vì lý do này.
- **Rút/sửa/mở lại:** PI gửi yêu cầu kèm lý do. Chỉ CV phụ trách duyệt hoặc từ chối, và mở lại với lý do bắt buộc. TP/TB/PP/BGĐ/QT, CV không phụ trách, thành viên và reviewer đều bị từ chối. CV phụ trách là PI hoặc thành viên của chính hồ sơ cũng bị từ chối do conflict. Hồ sơ mở lại quay về bước 2 (D-034); nộp lại thì vào lại bước 3. PI nhận thông báo kết quả.
- **Điểm còn "cần xác nhận"** (chưa chốt, không tự quyết):
  - Đổi CV cả đợt có ghi đè hồ sơ đã được giao riêng cho CV khác hay không.
  - Hồ sơ đã bị thu hồi CV có giữ trạng thái "Chưa có người phụ trách" khi nộp lại hay không.
  - Yêu cầu rút/sửa trên hồ sơ chưa có CV có chờ đến khi TP/TB giao CV hay không.
- **NFR liên quan:** authorization ở backend và fail closed khi context chưa xác định được; mutation nghiệp vụ hoàn tất trọn vẹn hoặc không lưu gì; list/detail p95 ≤ 2s; mọi thay đổi schema qua Prisma migration; WCAG AA; trạng thái không chỉ dựa vào màu.

## Technical Decisions

- **Module:** `research-proposals`, `proposal-intake-periods`, `files`, `audit-logs`, `notifications` (modular monolith). Logic nghiệp vụ nằm ở service backend. PostgreSQL là nguồn sự thật. MinIO chỉ truy cập qua files module.
- **Dữ liệu:** `proposal_intake_periods` có thêm CV phụ trách của đợt, dạng quan hệ có version và hiệu lực. Bảng này thay cho `management_portfolios`, không được tạo lại. Lịch sử officer thuộc về hồ sơ (proposal-owned).
- **State machine:** `Draft → Submitted → (SupplementRequested → Resubmitted) → UnderCompletenessReview …`. Mọi transition là operation backend có tên; không PATCH trực tiếp status. Ánh xạ D-033: bước 1 là đợt tiếp nhận (không phải state của proposal); bước 2 = `Draft`/`SupplementRequested`; bước 3 = `Submitted`/`Resubmitted`/`UnderCompletenessReview`.
- **Capability:** DTO trả `ViewerAuthorizationV1` gồm `viewerRelationships`, `allowedActions`, `blockedActions` kèm code/lý do, `policyVersion`, `evaluatedContextVersions`. UI không suy ra quyền và không chọn "vai trò cao nhất". Trạng thái CV hoặc "chưa có người phụ trách" chỉ lộ qua management projection cho TP/TB trong scope (và GĐ/PGĐ-KH).
- **AD-13:** authorize và mutate trong cùng transaction, hoặc validate `ContextVersionTokenV1` atomically. Submit gửi kèm context token.
- **Vòng đời quan hệ:** dùng UTC của database server, khoảng nửa mở `effectiveFrom <= asOf < effectiveUntil`. Thu hồi có hiệu lực ngay. Lịch sử bất biến, sửa bằng bản ghi kế tiếp. Từ chối quan hệ active chồng lấn cùng loại. Mỗi request dùng một `asOf` duy nhất.
- **Audit:** mọi tạo, sửa, chuyển trạng thái, giao/đổi CV và từ chối đều được audit (before/after, context version). Audit từ chối không lộ dữ liệu ngoài phạm vi. Gọi trực tiếp metadata hoặc download tệp ngoài quyền thì fail closed, không lộ tên tệp hay object key.
- **Tra cứu thành viên (D-039):** `GET /api/v1/research-proposals/member-candidates?keyword=` chỉ khớp họ tên, từ khóa tối thiểu 2 ký tự, tối đa 20 kết quả, chỉ hồ sơ `ACTIVE`. Server ghi đè họ tên, đơn vị và `userId` theo `researcherProfileId`. `GET /researcher-profiles` vẫn đóng với người tạo hồ sơ.

## UX & Interaction Patterns

- **Màn hình:** `/intakes`, `/proposals`, `/my-proposals`, `/proposals/new`, `/proposals/:id`, `/proposals/:id/edit`, `/proposals/:id/submit`.
- **Đợt tiếp nhận:**
  - Nút "Tạo đợt tiếp nhận" chỉ hiện khi có quyền.
  - Đợt đã đóng chỉ đọc và chặn hồ sơ mới.
  - TP mở đợt chưa có CV thì bị chặn kèm lý do.
  - CV mở đợt chưa có CV thì hộp xác nhận báo trước rằng CV sẽ thành CV phụ trách của đợt.
- **Form hồ sơ:** chia theo section (đợt, tiêu đề/loại/lĩnh vực, đơn vị, PI/nhóm, thời gian, mục tiêu/nội dung, kinh phí, tệp, readiness). Lưu nháp bất cứ lúc nào; section có chỉ báo hoàn thành. Bản đã nộp hoặc đã khóa mở ở chế độ chỉ đọc. Người không phải PI chỉ xem.
- **Xác nhận nộp:** hiển thị checklist readiness, số version, hạn đợt, tóm tắt tệp và cảnh báo version sẽ bị khóa. Nộp thất bại thì giữ bản nháp và liệt kê lỗi cần sửa.
- **Detail:** PI thấy workspace chỉnh sửa và nộp; vai trò quản lý thấy bảng chỉ đọc. Hành động bị chặn hiện ở trạng thái disabled kèm lý do từ backend. PI và reviewer không thấy tab action log. Context cũ thì gợi ý tải lại.
- **Danh sách:** filter lưu trên URL, tìm kiếm phía server. Phân biệt "không có kết quả khớp" với "không có hồ sơ được phép xem".
- **Stepper D-033:** hiển thị chữ kèm icon; không báo transition đã xảy ra trước khi backend xác nhận.

## Cross-Story Dependencies

- Thứ tự thực hiện tuần tự: 4.1 → 4.8.
- 4.7 phụ thuộc 4.1 (đợt và hành động mở) và 4.6 (gán CV trong transaction nộp).
- 4.8 phụ thuộc 4.6 và 4.7.
- 4.2 không gán CV khi tạo nháp; CV chưa được gán thì không có quyền quản lý hồ sơ.
- Phụ thuộc Epic 1 (vai trò, scope, `ViewerAuthorizationV1`, policy evaluator), Epic 2 (hồ sơ nhà khoa học, liên kết tài khoản) và Epic 3 (files module, audit).
- Epic 5 dùng CV phụ trách do 4.7 gán. TB hoặc CV phụ trách là PI/thành viên vẫn được kiểm tra đầy đủ và yêu cầu bổ sung (không trả `CONFLICT_DENIED`); TP không làm hai thao tác này. Các kiểm tra conflict khác giữ nguyên.
- Story 1.12 (giao mảng) đã bị D-038 thay thế. Tên story 4.7 trong `epic-04-proposal-intake-and-submission/sprint-plan.md` vẫn ghi cơ chế mảng cũ; `epics.md` là nguồn chuẩn.
