# Đề xuất User Interface cho DocManSystem / RTMS

## 1. Kết luận thiết kế

Hệ thống **không chỉ cần giao diện cho Admin, Leader và Nhà khoa học**. Nếu chỉ chia như vậy thì sẽ thiếu nhóm vận hành quan trọng nhất là **chuyên viên quản lý khoa học / staff** và nhóm **reviewer / hội đồng / y đức**.

Đề xuất thiết kế hệ thống theo mô hình:

```text
1. Admin Console
2. Staff Operations Workspace
3. Leadership Decision Dashboard
4. Researcher Workspace
5. Reviewer / Council / Ethics Workspace
6. My Work - Công việc của tôi, dùng chung cho mọi user
```

Trong đó, **My Work** không phải là một role riêng, mà là màn hình cá nhân dùng chung cho tất cả người dùng sau khi đăng nhập.

Không cần xây dựng giao diện riêng cho **khoa / bộ môn** trong giai đoạn hiện tại.

---

## 2. Nguyên tắc chung

Nên thiết kế **một web application duy nhất**, không tách thành nhiều app riêng. Sau khi người dùng đăng nhập, hệ thống hiển thị menu, dashboard, hành động và dữ liệu theo quyền thực tế của người đó.

Nguyên tắc quan trọng:

```text
Ẩn menu trên frontend chỉ là hỗ trợ UX.
Backend vẫn phải kiểm tra quyền ở mọi API, mọi file, mọi dashboard, mọi export và mọi workflow action.
```

Quyền của người dùng nên được tính theo:

```text
System role
+ Organization/data scope
+ Participation role trong từng đề tài/hội đồng
+ Assignment scope
+ Workflow state
+ Conflict policy
```

Ví dụ một nhà khoa học có thể đồng thời là:

```text
- Chủ nhiệm đề tài A
- Thành viên đề tài B
- Thư ký khoa học đề tài C
- Reviewer hồ sơ D
- Thành viên hội đồng E
```

Vì vậy không nên coi “nhà khoa học” là một quyền duy nhất. Nên coi đó là một nhóm người dùng có nhiều ngữ cảnh nghiệp vụ khác nhau.

---

## 3. Admin Console

### 3.1. Đối tượng sử dụng

Dành cho **quản trị hệ thống**.

Admin là người quản lý nền tảng kỹ thuật và dữ liệu nền. Admin không mặc định có quyền phê duyệt đề tài, chấm điểm đề tài hoặc quyết định nghiệp vụ khoa học.

### 3.2. Mục tiêu giao diện

Giúp quản trị viên kiểm soát:

```text
- Người dùng
- Vai trò
- Đơn vị
- Danh mục dùng chung
- Cấu hình hệ thống
- Nhật ký/audit hệ thống
```

### 3.3. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Quản lý người dùng | Tạo tài khoản, cập nhật tài khoản, khóa/mở tài khoản, reset mật khẩu |
| Quản lý vai trò | Gán role hệ thống cho user |
| Quản lý đơn vị | Quản lý khoa, bộ môn, phòng ban, đơn vị trực thuộc |
| Quản lý danh mục | Lĩnh vực nghiên cứu, loại đề tài, tiêu chí chấm điểm, trạng thái, mức ưu tiên |
| Cấu hình hệ thống | Tham số hệ thống, mẫu thông báo, cấu hình cơ bản |
| Audit log | Xem nhật ký hệ thống theo thẩm quyền |

### 3.4. Những việc Admin không nên làm mặc định

```text
- Không mặc định được phê duyệt đề tài
- Không mặc định được chấm điểm đề tài
- Không mặc định được xem toàn bộ hồ sơ nhạy cảm nếu không có quyền nghiệp vụ
- Không được bypass workflow chỉ vì là admin
```

Admin chỉ nên có quyền can thiệp kỹ thuật và cấu hình, còn quyết định nghiệp vụ phải thuộc Staff hoặc Leadership tùy quy trình.

---

## 4. Staff Operations Workspace

### 4.1. Đối tượng sử dụng

Dành cho **chuyên viên quản lý khoa học**, ví dụ Ban Quản lý KHQS hoặc cán bộ phụ trách vận hành quy trình đề tài.

Đây là workspace quan trọng nhất đối với vận hành hằng ngày của hệ thống.

### 4.2. Mục tiêu giao diện

Giúp staff điều phối toàn bộ quy trình quản lý khoa học:

```text
- Mở đợt tiếp nhận
- Kiểm tra hồ sơ
- Yêu cầu bổ sung
- Phân công reviewer/hội đồng
- Theo dõi tiến độ đánh giá
- Tổng hợp kết quả
- Trình phê duyệt
- Theo dõi đề tài được duyệt
- Quản lý báo cáo tiến độ
- Quản lý hội thảo, sinh viên NCKH
- Quản lý văn bản liên quan
- Quản lý hội đồng và hồ sơ y đức
```

### 4.3. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Đợt tiếp nhận | Tạo, mở, đóng, cấu hình đợt tiếp nhận hồ sơ |
| Kiểm tra hồ sơ | Kiểm tra tính đầy đủ, trạng thái hồ sơ, file đính kèm |
| Yêu cầu bổ sung | Gửi yêu cầu bổ sung, lý do, hạn phản hồi |
| Phân công reviewer/hội đồng | Gán reviewer, thành viên hội đồng, thư ký hội đồng nếu có |
| Theo dõi đánh giá | Xem ai đã chấm, ai chưa chấm, hồ sơ nào quá hạn |
| Tổng hợp kết quả | Tổng hợp điểm, nhận xét, kiến nghị |
| Trình lãnh đạo | Chuyển hồ sơ đủ điều kiện sang hàng đợi phê duyệt |
| Theo dõi đề tài được duyệt | Quản lý milestone, báo cáo định kỳ, điều chỉnh, gia hạn, nghiệm thu |
| Hội thảo / SV NCKH | Quản lý kế hoạch, văn bản, kinh phí, sản phẩm, kết quả |
| Văn bản liên quan | Đăng ký, phân loại, liên kết và quản lý hiệu lực văn bản |
| Hội đồng / Y đức | Tạo hội đồng, quản lý hồ sơ y đức, tổng hợp đánh giá |
| Báo cáo | Xuất Excel/PDF, xem thống kê theo đơn vị, lĩnh vực, trạng thái |

### 4.4. Dashboard cho Staff

Staff nên có dashboard riêng, tập trung vào việc cần xử lý:

```text
- Hồ sơ mới nộp cần kiểm tra
- Hồ sơ đang chờ bổ sung
- Hồ sơ đã bổ sung lại cần kiểm tra
- Hồ sơ cần phân công reviewer
- Reviewer quá hạn chấm điểm
- Hồ sơ đã đủ đánh giá cần tổng hợp
- Hồ sơ chờ trình lãnh đạo
- Đề tài chậm báo cáo tiến độ
- Task quá hạn
- Hồ sơ y đức chờ xử lý
```

### 4.5. Lưu ý phân quyền

Staff chỉ nên thấy và xử lý dữ liệu trong phạm vi được cấp. Nếu staff thuộc đơn vị/phòng ban cụ thể thì dashboard, danh sách, tìm kiếm, export và file đều phải tuân thủ scope đó.

---

## 5. Leadership Decision Dashboard

### 5.1. Đối tượng sử dụng

Dành cho **lãnh đạo / người có thẩm quyền phê duyệt / approval authority**.

### 5.2. Mục tiêu giao diện

Leadership không cần giao diện nhập liệu phức tạp như staff. Giao diện của lãnh đạo nên tập trung vào:

```text
- Xem tổng quan
- Nhận biết việc cần quyết định
- Drill-down vào hồ sơ
- Xem lịch sử, file, điểm, nhận xét, tổng hợp
- Approve / reject / yêu cầu xem xét lại
```

### 5.3. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Dashboard điều hành | Số hồ sơ chờ duyệt, đề tài chậm tiến độ, việc quá hạn |
| Hàng đợi phê duyệt | Proposal, điều chỉnh, gia hạn, nghiệm thu, y đức chờ quyết định |
| Xem hồ sơ | Xem tóm tắt, lịch sử xử lý, file, điểm đánh giá, tổng hợp |
| Ra quyết định | Approve, reject, yêu cầu xem xét lại hoặc ghi ý kiến chỉ đạo |
| Báo cáo tổng hợp | Xem thống kê theo đơn vị, lĩnh vực, trạng thái, thời gian |

### 5.4. Dashboard cho Leadership

Nên có các khối:

```text
- Hồ sơ chờ phê duyệt
- Hồ sơ quá hạn xử lý
- Đề tài chậm tiến độ
- Báo cáo tiến độ chưa nộp
- Đề tài sắp đến hạn nghiệm thu
- Hồ sơ y đức chờ quyết định
- Thống kê theo đơn vị
- Thống kê theo lĩnh vực nghiên cứu
```

### 5.5. Lưu ý phân quyền

Leadership chỉ được quyết định trong phạm vi thẩm quyền. Nếu một lãnh đạo đồng thời là PI của một đề tài thì hệ thống phải có rule chống xung đột lợi ích, ví dụ không cho tự phê duyệt hồ sơ của chính mình.

---

## 6. Researcher Workspace

### 6.1. Đối tượng sử dụng

Dành cho **nhà khoa học**, bao gồm:

```text
- Chủ nhiệm đề tài
- Thành viên đề tài
- Thư ký khoa học
- Người tham gia hội thảo / sinh viên NCKH nếu có tài khoản
- Người có hồ sơ nhà khoa học trong hệ thống
```

Không nên tách thành nhiều app riêng cho PI, thành viên và thư ký. Nên dùng một **Researcher Workspace**, trong đó chức năng thay đổi theo vai trò của người đó trong từng hồ sơ cụ thể.

### 6.2. Mục tiêu giao diện

Giúp nhà khoa học xử lý các việc liên quan đến hồ sơ và đề tài của mình:

```text
- Tạo và nộp proposal
- Upload tài liệu
- Xem trạng thái xử lý
- Phản hồi yêu cầu bổ sung
- Theo dõi đề tài đã được duyệt
- Nộp báo cáo tiến độ
- Upload minh chứng
- Gửi yêu cầu điều chỉnh/gia hạn
- Xem task được giao
- Xem lịch sử tham gia
```

### 6.3. Cấu trúc tab đề xuất

| Tab | Mô tả |
|---|---|
| Đề tài tôi chủ nhiệm | Các proposal/project mà tôi là PI |
| Đề tài tôi tham gia | Các đề tài tôi là thành viên |
| Tôi làm thư ký | Đề tài/hội đồng mà tôi được phân công làm thư ký khoa học |
| Hồ sơ cần bổ sung | Các proposal/project bị yêu cầu bổ sung |
| Báo cáo cần nộp | Báo cáo định kỳ, minh chứng, hồ sơ nghiệm thu cần nộp |
| Công việc của tôi | Task được giao hoặc cần cập nhật |
| Lịch sử tham gia | Các đề tài, hội đồng, nhiệm vụ đã tham gia |
| Hồ sơ cá nhân khoa học | Thông tin học hàm, học vị, đơn vị, lĩnh vực, chuyên môn |

### 6.4. Quyền của Chủ nhiệm đề tài

Chủ nhiệm đề tài nên có quyền:

| Nhóm chức năng | Quyền |
|---|---|
| Proposal | Tạo nháp, sửa nháp, upload file, nộp hồ sơ |
| Bổ sung hồ sơ | Xem yêu cầu bổ sung, chỉnh sửa, nộp lại |
| Project sau duyệt | Xem project, milestone, tiến độ |
| Báo cáo | Nộp báo cáo định kỳ, upload minh chứng |
| Điều chỉnh/gia hạn | Gửi yêu cầu điều chỉnh hoặc gia hạn |
| Nghiệm thu | Gửi hồ sơ nghiệm thu nếu quy trình yêu cầu |
| Task | Nhận/giao/cập nhật task trong phạm vi đề tài nếu được cấp quyền |

Chủ nhiệm đề tài không nên có quyền:

```text
- Tự phê duyệt đề tài của mình
- Tự chấm điểm đề tài của mình
- Tự gán reviewer chính thức nếu đó là quyền của staff
- Xem review nội bộ nếu chính sách chưa cho phép
```

### 6.5. Quyền của Thành viên đề tài

Thành viên đề tài nên có quyền:

| Nhóm chức năng | Quyền |
|---|---|
| Xem đề tài | Xem thông tin cơ bản, milestone, trách nhiệm được giao |
| Task | Cập nhật task của mình |
| Evidence | Upload minh chứng/phần việc nếu được cấp quyền |
| Báo cáo | Có thể nhập phần đóng góp, nhưng không nhất thiết được nộp báo cáo chính thức |
| File | Xem/tải file được cấp quyền |

Thành viên đề tài không nên có quyền:

```text
- Submit proposal chính thức thay PI nếu không được ủy quyền
- Request adjustment/gia hạn thay PI nếu không được ủy quyền
- Thay đổi danh sách thành viên chính thức
- Phê duyệt báo cáo hoặc đề tài
```

### 6.6. Quyền của Thư ký khoa học

Thư ký khoa học nên là vai trò theo từng đề tài hoặc hội đồng, không phải role quản trị toàn hệ thống.

Thư ký khoa học nên có quyền:

| Nhóm chức năng | Quyền |
|---|---|
| Hồ sơ hành chính | Cập nhật thông tin hành chính được ủy quyền |
| Tài liệu | Upload biên bản, tài liệu họp, tài liệu hoàn thiện |
| Hội đồng | Chuẩn bị danh sách tài liệu, lịch họp, biên bản |
| Task | Tạo/cập nhật task trong phạm vi đề tài/hội đồng nếu được giao |
| Theo dõi | Xem trạng thái xử lý, deadline, yêu cầu bổ sung |
| Tổng hợp | Nhập dự thảo biên bản/tổng hợp nếu được giao |

Thư ký khoa học không nên có quyền:

```text
- Approve/reject proposal
- Approve/reject ethics dossier
- Thay reviewer/hội đồng nếu không phải staff được ủy quyền
- Xem dữ liệu ngoài đề tài/hội đồng được phân công
- Quyết định thay lãnh đạo
```

---

## 7. Reviewer / Council / Ethics Workspace

### 7.1. Đối tượng sử dụng

Dành cho:

```text
- Reviewer đề tài
- Thành viên hội đồng
- Chủ tịch hội đồng
- Thư ký hội đồng
- Reviewer hồ sơ y đức
- Thành viên hội đồng y đức
```

Nhóm này không nên bị gộp hoàn toàn vào giao diện nhà khoa học thông thường, vì nhiệm vụ của họ là đánh giá độc lập, chấm điểm, nhận xét và đưa ra kiến nghị.

### 7.2. Mục tiêu giao diện

Giúp reviewer/hội đồng xử lý các hồ sơ được phân công:

```text
- Xem danh sách hồ sơ được giao
- Xem tài liệu cần đánh giá
- Nhập điểm theo tiêu chí
- Nhập nhận xét
- Đưa ra kiến nghị
- Submit review
- Xem lại review đã nộp theo policy
```

### 7.3. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Hồ sơ được phân công | Chỉ thấy proposal, hồ sơ y đức, hội đồng được giao |
| Tài liệu đánh giá | Xem/tải file cần thiết để đánh giá |
| Chấm điểm | Nhập điểm theo bộ tiêu chí |
| Nhận xét | Nhập nhận xét chuyên môn, kiến nghị |
| Submit review | Gửi kết quả đánh giá chính thức |
| Lịch sử đánh giá | Xem các đánh giá đã nộp theo chính sách quyền |

### 7.4. Lưu ý phân quyền

Reviewer chỉ được truy cập hồ sơ được phân công. Không được thấy toàn bộ danh sách đề tài, không được xem review của người khác nếu policy chưa cho phép, không được sửa hồ sơ của PI và không được phê duyệt cuối cùng.

---

## 8. My Work - Công việc của tôi

### 8.1. Đối tượng sử dụng

Dùng chung cho tất cả user sau khi đăng nhập.

Đây là màn hình cá nhân hóa, giúp mỗi người biết ngay hôm nay mình cần làm gì.

### 8.2. Mục tiêu giao diện

Biến hệ thống thành nơi điều hành công việc, không chỉ là nơi lưu hồ sơ.

### 8.3. Nội dung nên hiển thị

```text
- Việc cần tôi xử lý hôm nay
- Hồ sơ chờ tôi bổ sung
- Hồ sơ chờ tôi chấm
- Hồ sơ chờ tôi phê duyệt
- Báo cáo sắp đến hạn
- Task quá hạn
- Thông báo mới
- File hoặc tài liệu cần xử lý
- Lời nhắc deadline
```

### 8.4. Ví dụ theo từng nhóm người dùng

| Người dùng | My Work nên hiển thị |
|---|---|
| Staff | Hồ sơ mới nộp, hồ sơ cần kiểm tra, reviewer quá hạn, báo cáo chờ rà soát |
| Leadership | Hồ sơ chờ phê duyệt, đề tài chậm tiến độ, quyết định cần xử lý |
| PI | Proposal cần bổ sung, báo cáo sắp hạn, task trong đề tài |
| Project Member | Task được giao, evidence cần nộp, deadline phần việc |
| Reviewer | Hồ sơ cần chấm, review sắp hạn, review đã lưu nháp |
| Admin | Yêu cầu hỗ trợ tài khoản, audit/security warning, cấu hình cần kiểm tra |

---

## 9. Có cần giao diện riêng cho sinh viên không?

Trong Phase 1, **chưa cần giao diện riêng cho sinh viên**.

Module “sinh viên nghiên cứu khoa học” hiện nên do staff hoặc cán bộ phụ trách quản lý. Các nghiệp vụ chính gồm:

```text
- Tạo hoặc import hoạt động sinh viên NCKH đã được duyệt
- Quản lý kế hoạch
- Quản lý văn bản
- Theo dõi điều chỉnh
- Theo dõi kinh phí
- Theo dõi sản phẩm và kết quả
```

Sau này nếu hệ thống mở rộng, có thể thêm Student Portal.

### Student Portal trong tương lai có thể gồm

```text
- Sinh viên nộp sản phẩm
- Upload minh chứng
- Xem lịch hội nghị
- Theo dõi đề tài sinh viên
- Nhận thông báo phản hồi
```

Nhưng không nên đưa vào MVP nếu muốn kiểm soát phạm vi triển khai.

---

## 10. Navigation tổng thể đề xuất

Nên xây dựng sidebar/menu động theo quyền.

Menu tổng thể có thể gồm:

```text
Dashboard
Công việc của tôi
Hồ sơ đề tài
Đề tài được duyệt
Báo cáo tiến độ
Hội thảo / Sinh viên NCKH
Hội đồng / Y đức
Văn bản liên quan
Nhà khoa học
Reviewer Workspace
Báo cáo - Thống kê
Quản trị hệ thống
```

Người dùng không có quyền thì không thấy menu tương ứng. Tuy nhiên backend vẫn phải kiểm tra quyền ở API.

---

## 11. Bảng tổng hợp các UI cần có

| Nhóm UI | Bắt buộc MVP | Đối tượng | Lý do |
|---|---:|---|---|
| Admin Console | Có | System Admin | Quản lý user, role, đơn vị, danh mục, cấu hình |
| Staff Operations Workspace | Có | Chuyên viên quản lý khoa học | Vận hành toàn bộ quy trình quản lý khoa học |
| Leadership Decision Dashboard | Có | Lãnh đạo / approval authority | Phê duyệt, xem dashboard điều hành, xử lý quyết định |
| Researcher Workspace | Có | Nhà khoa học, PI, thành viên, thư ký khoa học | Nộp hồ sơ, theo dõi đề tài, nộp báo cáo, xử lý task |
| Reviewer / Council / Ethics Workspace | Có | Reviewer, hội đồng, y đức | Chấm điểm, nhận xét, đánh giá hồ sơ được phân công |
| My Work | Có | Tất cả user | Hàng đợi việc cá nhân, notification, deadline |
| Student Portal | Để sau | Sinh viên | Chưa cần cho MVP |
| External Public Portal | Không | Người ngoài hệ thống | Phase 1 là hệ thống nội bộ, không phải cổng công khai |

---

## 12. Kết luận cuối cùng

Giai đoạn hiện tại nên thiết kế **5 workspace chính + 1 màn hình My Work dùng chung**:

```text
1. Admin Console
2. Staff Operations Workspace
3. Leadership Decision Dashboard
4. Researcher Workspace
5. Reviewer / Council / Ethics Workspace
6. My Work - Công việc của tôi
```

Không cần giao diện riêng cho khoa/bộ môn trong giai đoạn hiện tại.

Không cần giao diện riêng cho sinh viên trong MVP.

Không cần external public portal trong Phase 1.

Điểm quan trọng nhất là: hệ thống không nên phân quyền theo kiểu một user chỉ có một vai trò cố định. Thay vào đó, hệ thống cần tính quyền theo từng bản ghi nghiệp vụ. Một nhà khoa học có thể là chủ nhiệm ở đề tài này, thành viên ở đề tài khác, thư ký khoa học ở hội đồng khác, và reviewer ở một hồ sơ khác.

Do đó UI phải linh hoạt theo ngữ cảnh, còn backend phải luôn enforce quyền theo:

```text
User account
+ System role
+ Organization/data scope
+ Participation role
+ Assignment scope
+ Workflow state
+ Conflict policy
```
