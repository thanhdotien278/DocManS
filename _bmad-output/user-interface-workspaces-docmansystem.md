# Đề xuất User Interface cho DocManSystem / RTMS

**Cập nhật 2026-10-18 (mô hình 10 vai trò):** Nguồn thẩm quyền là `docs/permission-matrix.md`
(§7 thắng khi mâu thuẫn). Mỗi tài khoản có đúng một system role trong 10 role: QT, GĐ, PGĐ-KH,
PGĐ-TD, TP, PP, TB, CV, NCV, NNB. Giao diện vẫn là một ứng dụng web; workspace Phòng KHQS tách
theo TP / PP / TB / CV và dashboard BGĐ tách theo GĐ / PGĐ-KH / PGĐ-TD, đều dùng capability
backend. CV chỉ vận hành hồ sơ đang được phân công làm chuyên viên phụ trách. Tờ trình đi theo
chuỗi CV → TB → TP → BGĐ (GĐ hoặc PGĐ-KH ký; chỉ GĐ duyệt đề tài + kinh phí và thanh lý).
Kinh phí chỉ là metadata có audit, không có sổ cái, thanh toán hay ERP. Hội thảo giữ nguyên.
Áp dụng cùng một bộ lọc cho list/detail/search/count/dashboard/report/export/notification/
files/history. Code trên nhánh `DocManS` hiện vẫn chạy mô hình 7 vai trò; UI này là đích.

## 1. Kết luận thiết kế

Hệ thống **không chỉ cần giao diện cho Admin, Lãnh đạo và Nhà khoa học**. Nếu chỉ chia như vậy thì sẽ thiếu nhóm vận hành quan trọng nhất là **Phòng KHQS (TP, PP, TB, CV)** và nhóm **reviewer / hội đồng / IRB**.

Đề xuất thiết kế hệ thống theo mô hình:

```text
1. Admin Console (QT)
2. Phòng KHQS Workspace (TP / PP / TB / CV)
3. BGĐ Decision Dashboard (GĐ / PGĐ-KH / PGĐ-TD)
4. Researcher Workspace
5. Reviewer / Council / IRB Workspace
6. My Work - Công việc của tôi, dùng chung cho mọi user (trừ QT)
```

Trong đó, **My Work** không phải là một role riêng, mà là màn hình cá nhân dùng chung cho mọi người dùng nghiệp vụ sau khi đăng nhập (QT không có hàng đợi nghiệp vụ).

Không cần xây dựng giao diện riêng cho **khoa / bộ môn** trong giai đoạn hiện tại.

---

## 2. Nguyên tắc chung

Nên thiết kế **một web application duy nhất**, không tách thành nhiều app riêng. Sau khi người dùng đăng nhập, hệ thống hiển thị menu, dashboard, hành động và dữ liệu theo quyền thực tế của người đó.

Nguyên tắc quan trọng:

```text
Ẩn menu trên frontend chỉ là hỗ trợ UX.
Backend vẫn phải kiểm tra quyền ở mọi API, mọi file, mọi dashboard, mọi export và mọi workflow action.
```

Mỗi tài khoản có đúng **một system role**; quan hệ với bản ghi không tạo ra role hệ thống mới. Quyền của người dùng nên được tính theo:

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
- Thư ký đề tài C (`TOPIC_SECRETARY`)
- Reviewer hồ sơ D
- Thành viên hội đồng E
```

Vì vậy không nên coi “nhà khoa học” là một quyền duy nhất; ngoài system role, UI luôn dựa vào quan hệ với từng bản ghi do backend trả về. Nên coi đó là một nhóm người dùng có nhiều ngữ cảnh nghiệp vụ khác nhau.

---

## 3. Admin Console

### 3.1. Đối tượng sử dụng

Dành cho **quản trị hệ thống (QT, `SYSTEM_ADMIN`)**.

QT là người quản lý nền tảng kỹ thuật và dữ liệu nền. Admin không mặc định có quyền phê duyệt đề tài, chấm điểm đề tài hoặc quyết định nghiệp vụ khoa học.

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
| Quản lý người dùng | Tạo tài khoản, cập nhật tài khoản, khóa/mở tài khoản, gửi lại link đặt mật khẩu (xem §14) |
| Quản lý vai trò | Gán đúng một trong 10 role hệ thống cho user |
| Quản lý đơn vị | Quản lý khoa, bộ môn, phòng ban, đơn vị trực thuộc |
| Quản lý danh mục | Lĩnh vực nghiên cứu, loại đề tài, tiêu chí chấm điểm, trạng thái, mức ưu tiên |
| Cấu hình hệ thống | Tham số hệ thống, mẫu thông báo, cấu hình cơ bản |
| Audit log | Xem nhật ký hệ thống theo thẩm quyền |

### 3.4. Những việc Admin không nên làm mặc định

```text
- Không mặc định được phê duyệt đề tài
- Không mặc định được chấm điểm đề tài
- Không xem hồ sơ nghiệp vụ (QT chỉ làm việc với dữ liệu quản trị)
- Không được bypass workflow chỉ vì là admin
```

QT không có lý lịch khoa học, không có dashboard nghiệp vụ, không làm reviewer/thành viên hội đồng/IRB. QT chỉ can thiệp kỹ thuật và cấu hình; quyết định nghiệp vụ thuộc CV/TB/TP hoặc BGĐ tùy quy trình.

---

## 4. Phòng KHQS Workspace (TP / PP / TB / CV)

### 4.1. Đối tượng sử dụng

Dành cho Phòng KHQS: **TP** (Trưởng phòng), **PP** (Phó phòng), **TB** (Trưởng ban QLKH, một người) và **CV** (chuyên viên QLKH). Đây là workspace quan trọng nhất đối với vận hành hằng ngày. Một workspace, hiển thị theo system role; không có hồ sơ ngoài scope hay ngoài phân công.

### 4.2. Phân chia theo vai trò

| Vai trò | Việc chính | Không được làm |
|---|---|---|
| TP | Duyệt mọi tờ trình trước khi trình BGĐ; phân mảng cho CV; giao/thu hồi CV phụ trách hồ sơ và đề tài; xử lý hồ sơ "Chưa có người phụ trách"; điều phối trong scope đơn vị; xem mọi đề tài toàn Học viện; quản lý kinh phí toàn Học viện; có thể làm việc cấp CV (phân công phản biện, lập hội đồng, tổng hợp, lập tờ trình) | Kiểm tra đầy đủ, yêu cầu bổ sung; duyệt tờ trình do chính mình lập |
| PP | Chỉ theo dõi (tiến độ, số liệu) trong scope đơn vị; xem kinh phí chỉ với đề tài mình tham gia | Mọi bước tờ trình và phê duyệt, kể cả khi TP vắng |
| TB | Rà soát tờ trình do CV lập rồi trình TP hoặc trả về tác giả; giao/thu hồi CV; kiểm tra đầy đủ, yêu cầu bổ sung, phân công phản biện/hội đồng, tổng hợp, IRB, lập tờ trình trong scope; xem mọi đề tài toàn Học viện; quản lý kinh phí toàn Học viện | Rà soát tờ trình do chính mình lập |
| CV | Chỉ trên hồ sơ/đề tài đang được giao: kiểm tra đầy đủ, yêu cầu bổ sung, mời phản biện/hội đồng, tổng hợp, IRB, lập tờ trình, thiết lập mốc, xét báo cáo, thẩm định điều chỉnh/gia hạn, nghiệm thu, sản phẩm, lập thanh lý, đóng đề tài, kinh phí trong phạm vi giao; duyệt/từ chối yêu cầu rút/sửa sau nộp và mở lại hồ sơ (có lý do); tạo/mở/đóng đợt tiếp nhận; quản lý hồ sơ nhà khoa học và đề tài sinh viên NCKH trong scope | Thao tác trên hồ sơ của CV khác |

TP và CV tạo/mở/đóng đợt tiếp nhận; TB và PP chỉ xem.

### 4.3. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Đợt tiếp nhận | TP, CV: tạo, mở, đóng, cấu hình đợt; TB, PP: xem |
| Kiểm tra hồ sơ | TB, CV (hồ sơ được giao): kiểm tra đầy đủ, trạng thái, file đính kèm; TP không làm bước này |
| Yêu cầu bổ sung | TB, CV: gửi yêu cầu, lý do, hạn phản hồi |
| Phân công chuyên viên / mảng | TP, TB: giao, đổi, thu hồi CV phụ trách (giữ lịch sử); TP: phân mảng cho CV; hệ thống tự gán CV khi nộp/nộp lại |
| Phân công reviewer/hội đồng | TP, TB, CV: mời từ mọi tài khoản có lý lịch khoa học (trừ QT), có kiểm tra xung đột; theo dõi chấp nhận/từ chối |
| Theo dõi đánh giá | Xem ai đã chấm, ai chưa chấm, hồ sơ nào quá hạn |
| Tổng hợp kết quả | TP, TB, CV: tổng hợp điểm, nhận xét, kiến nghị; thư ký hội đồng soạn dự thảo tổng hợp/biên bản, không chấm điểm |
| Tờ trình | CV lập → TB rà soát → TP duyệt → BGĐ ký (xem §15); trả về tác giả phải có lý do |
| Theo dõi đề tài được duyệt | CV phụ trách: mốc, báo cáo định kỳ, thẩm định điều chỉnh/gia hạn, nghiệm thu, thanh lý; TP/TB/PP/GĐ/PGĐ-KH xem toàn Học viện |
| Kinh phí | Siêu dữ liệu có audit: phân bổ, giải ngân, quyết toán, tài liệu; TP, TB quản lý toàn Học viện, CV trong phạm vi giao; không sổ cái/thanh toán/ERP |
| Hội thảo / SV NCKH | Hội thảo giữ nguyên; đề tài sinh viên NCKH: CV, NCV đăng ký (giảng viên hướng dẫn), CV duyệt/quản lý/hoàn thành trong scope |
| Văn bản liên quan | TP, TB, CV (và QT): đăng ký, phân loại, liên kết, quản lý hiệu lực |
| Hội đồng / IRB | TP, TB, CV: lập hội đồng, mời thành viên, trình kết luận IRB |
| Hồ sơ nhà khoa học | TP, CV (scope đơn vị): quản lý hồ sơ, xử lý cảnh báo trùng (xem §13) |
| Báo cáo | Xuất Excel/PDF, thống kê theo đơn vị, lĩnh vực, cấp, tính chất (Quân sự / Dân sự / Chưa phân loại) |

### 4.4. Dashboard theo vai trò

Dashboard riêng, tập trung vào việc cần xử lý (matrix §9.10, §9.11):

```text
CV (hồ sơ được giao):
- Hồ sơ mới nộp cần kiểm tra; hồ sơ chờ bổ sung; hồ sơ đã bổ sung lại
- Hồ sơ cần phân công reviewer; reviewer quá hạn chấm
- Hồ sơ đã đủ đánh giá cần tổng hợp; tờ trình đang soạn hoặc bị trả về
- Đề tài chậm báo cáo; yêu cầu điều chỉnh/gia hạn cần thẩm định
- Yêu cầu rút/sửa sau nộp cần duyệt
TB: hàng đợi rà soát tờ trình (bước Trưởng ban); hồ sơ cần kiểm tra/giao CV
TP: hàng đợi duyệt tờ trình (bước Trưởng phòng); hồ sơ "Chưa có người phụ trách";
    khối lượng việc theo CV; bộ lọc chuyên viên phụ trách/chưa phân công
PP: chỉ theo dõi tiến độ và số liệu, không có hàng đợi xử lý
Bộ lọc chung: năm, đơn vị, cấp, lĩnh vực, tính chất; phân tích theo CV phụ trách với nhóm "chưa phân công"
```

### 4.5. Lưu ý phân quyền

TP/TB chỉ xử lý dữ liệu trong scope đơn vị, trừ phạm vi xem đề tài và quản lý kinh phí toàn Học viện; hồ sơ đề xuất luôn theo scope đơn vị. CV chỉ thấy khả năng thao tác trên hồ sơ đang phụ trách; quyền quá khứ không còn hiệu lực. Danh sách, tìm kiếm, export, file và lịch sử đều tuân thủ cùng scope. Chức danh đơn vị (Trưởng khoa, Chủ nhiệm Bộ môn...) chỉ để hiển thị, không cấp quyền.

---

## 5. BGĐ Decision Dashboard (GĐ / PGĐ-KH / PGĐ-TD)

### 5.1. Đối tượng sử dụng

Dành cho Ban giám đốc (BGĐ), một dashboard theo system role:

| Vai trò | Nội dung |
|---|---|
| GĐ | Duyệt đề tài + kinh phí; duyệt thanh lý (chỉ GĐ); cũng ký mọi thứ PGĐ-KH ký; xem mọi đề tài và kinh phí từng đề tài; quản lý kinh phí, giải ngân, quyết toán |
| PGĐ-KH | Ký quyết định thành lập hội đồng (đánh giá, nghiệm thu, IRB), giấy IRB, gia hạn, điều chỉnh (kể cả đổi kinh phí); xem mọi đề tài và kinh phí; không duyệt đề tài/kinh phí đề tài/thanh lý |
| PGĐ-TD | Chỉ theo dõi: tiến độ, số lượng, báo cáo kinh phí tổng hợp; không xem kinh phí từng bản ghi, không ký |

### 5.2. Mục tiêu giao diện

BGĐ không cần giao diện nhập liệu phức tạp như Phòng KHQS. Giao diện tập trung vào:

```text
- Xem tổng quan
- Nhận biết việc cần quyết định hoặc ký
- Drill-down vào hồ sơ
- Xem tờ trình, lịch sử các bước (TB, TP), file, điểm, nhận xét, tổng hợp
- GĐ: duyệt/từ chối đề tài + kinh phí; GĐ hoặc PGĐ-KH: ký; trả về kèm lý do
```

### 5.3. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Dashboard điều hành | Hồ sơ chờ duyệt, đề tài chậm tiến độ, việc quá hạn (theo role) |
| Hàng đợi quyết định (GĐ) | Tờ trình đề tài + kinh phí, thanh lý chờ quyết định |
| Hàng đợi ký (GĐ, PGĐ-KH) | Thành lập hội đồng đánh giá/IRB/nghiệm thu, giấy IRB, điều chỉnh, gia hạn chờ ký |
| Xem hồ sơ | Tóm tắt, lịch sử xử lý, file, điểm đánh giá, tổng hợp (PGĐ-TD không xem kinh phí từng bản ghi) |
| Báo cáo tổng hợp | Theo đơn vị, lĩnh vực, cấp, tính chất, trạng thái, thời gian; PGĐ-TD chỉ số liệu tổng hợp |

### 5.4. Dashboard theo vai trò

```text
GĐ / PGĐ-KH (phạm vi theo quyền):
- Tờ trình chờ quyết định (GĐ) hoặc chờ ký (GĐ, PGĐ-KH)
- Hồ sơ quá hạn xử lý; đề tài chậm tiến độ; báo cáo chưa nộp
- Đề tài sắp đến hạn nghiệm thu; kinh phí từng đề tài
- Thống kê theo đơn vị, lĩnh vực, cấp, tính chất
PGĐ-TD: khối số liệu tổng hợp, cột kinh phí từng bản ghi để trống
```

### 5.5. Lưu ý phân quyền

Chỉ GĐ duyệt đề tài + kinh phí và thanh lý. Người ký không được là thành viên tham gia, reviewer hay bước tờ trình trên cùng bản ghi (chống xung đột lợi ích, kể cả PI là lãnh đạo). Nếu không có người xử lý/ký hợp lệ cho điều chỉnh hoặc gia hạn, PI rút yêu cầu để gỡ vướng. Khi BGĐ trả tờ trình về tác giả, lý do là bắt buộc.

---

## 6. Researcher Workspace

### 6.1. Đối tượng sử dụng

Dành cho **mọi vai trò có thể là chủ nhiệm (mọi role trừ QT/NNB)** và **nhà khoa học** (NCV, NNB), bao gồm:

```text
- Chủ nhiệm đề tài
- Thành viên đề tài
- Thư ký đề tài
- Người tham gia hội thảo / sinh viên NCKH nếu có tài khoản
- Người có hồ sơ nhà khoa học trong hệ thống
```

NNB không bao giờ là PI, không tạo đề xuất và không thấy đợt tiếp nhận. Không nên tách thành nhiều app riêng cho PI, thành viên và thư ký. Nên dùng một **Researcher Workspace**, trong đó chức năng thay đổi theo vai trò của người đó trong từng hồ sơ cụ thể.

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
| Tôi làm thư ký | Đề tài/hội đồng mà tôi được phân công làm thư ký |
| Hồ sơ cần bổ sung | Các proposal/project bị yêu cầu bổ sung |
| Báo cáo cần nộp | Báo cáo định kỳ, minh chứng, hồ sơ nghiệm thu cần nộp |
| Công việc của tôi | Task được giao hoặc cần cập nhật |
| Lịch sử tham gia | Các đề tài, hội đồng, nhiệm vụ đã tham gia |
| Hồ sơ cá nhân khoa học | Thông tin học hàm, học vị, đơn vị, lĩnh vực, chuyên môn |

### 6.4. Quyền của Chủ nhiệm đề tài

Sau khi nộp, PI gửi yêu cầu rút/sửa; CV phụ trách duyệt hoặc từ chối, và mở lại hồ sơ khi cần (có lý do, có audit). Chủ nhiệm đề tài nên có quyền:

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
- Tự gán reviewer chính thức nếu đó là quyền của TP/TB/CV
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
- Submit proposal chính thức thay PI
- Request adjustment/gia hạn thay PI nếu không được ủy quyền
- Thay đổi danh sách thành viên chính thức
- Phê duyệt báo cáo hoặc đề tài
```

### 6.6. Quyền của Thư ký (đề tài / hội đồng)

Thư ký là vai trò theo từng đề tài hoặc hội đồng, không phải role quản trị toàn hệ thống.

Thư ký nên có quyền:

| Nhóm chức năng | Quyền |
|---|---|
| Hồ sơ hành chính | Cập nhật thông tin hành chính được ủy quyền |
| Tài liệu | Upload biên bản, tài liệu họp, tài liệu hoàn thiện |
| Hội đồng | Chuẩn bị danh sách tài liệu, lịch họp, biên bản |
| Task | Tạo/cập nhật task trong phạm vi đề tài/hội đồng nếu được giao |
| Theo dõi | Xem trạng thái xử lý, deadline, yêu cầu bổ sung |
| Tổng hợp | Nhập dự thảo biên bản/tổng hợp nếu được giao |

Thư ký không nên có quyền:

```text
- Approve/reject proposal
- Approve/reject ethics dossier
- Thay reviewer/hội đồng nếu không phải TP/TB/CV có thẩm quyền
- Xem dữ liệu ngoài đề tài/hội đồng được phân công
- Chấm điểm với tư cách thư ký hội đồng (chỉ soạn tổng hợp/biên bản)
- Quyết định thay BGĐ
```

---

## 7. Reviewer / Council / IRB Workspace

### 7.1. Đối tượng sử dụng

Dành cho:

```text
- Reviewer đề tài
- Thành viên hội đồng
- Chủ tịch hội đồng
- Thư ký hội đồng
- Thành viên IRB
- Thư ký IRB
```

Reviewer, thành viên hội đồng và thành viên IRB được mời từ **mọi tài khoản có lý lịch khoa học (mọi role trừ QT)**, kể cả GĐ, PGĐ, TP, PP, TB, CV. Người được mời phải **chấp nhận hoặc từ chối (từ chối phải có lý do)**. Người tham gia bản ghi không được mời. Nhóm này không nên bị gộp vào giao diện nhà khoa học thông thường, vì nhiệm vụ của họ là đánh giá độc lập, chấm điểm, nhận xét và đưa ra kiến nghị.

### 7.2. Mục tiêu giao diện

```text
- Xem lời mời; chấp nhận hoặc từ chối kèm lý do
- Xem danh sách hồ sơ được giao
- Xem tài liệu cần đánh giá
- Nhập điểm theo tiêu chí (mọi người được mời vào hội đồng đánh giá đều chấm)
- Nhập nhận xét, kiến nghị; submit review
- Thành viên IRB nhận xét; thư ký IRB lập kết luận IRB
- Thư ký hội đồng soạn tổng hợp/biên bản, không chấm điểm
```

### 7.3. Chức năng chính

| Nhóm chức năng | Mô tả |
|---|---|
| Lời mời | Trước khi chấp nhận chỉ thấy tiêu đề, vai trò, hạn, người mời |
| Hồ sơ được phân công | Chỉ thấy proposal, hồ sơ IRB, hội đồng được giao và đã chấp nhận |
| Tài liệu đánh giá | Thành viên hội đồng chỉ đọc hồ sơ sau khi BGĐ ký quyết định thành lập |
| Chấm điểm / Nhận xét | Điểm theo tiêu chí, nhận xét chuyên môn, kiến nghị |
| Submit review | Gửi kết quả đánh giá chính thức |
| Lịch sử đánh giá | Xem các đánh giá đã nộp theo chính sách quyền |

### 7.4. Lưu ý phân quyền

Reviewer chỉ truy cập hồ sơ được phân công. Không thấy toàn bộ danh sách đề tài, không xem review của người khác, không sửa hồ sơ của PI, không ký hay quyết định trên cùng bản ghi. Ẩn danh hai chiều: PI và reviewer không xem nhật ký hành động của bản ghi; chỉ TB và TP được xem danh tính reviewer. Hội đồng chỉ được trình BGĐ khi mọi thành viên đã chấp nhận.

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

QT không có hàng đợi nghiệp vụ và không dùng My Work nghiệp vụ.

| Người dùng | My Work nên hiển thị |
|---|---|
| CV | Hồ sơ mới nộp được giao, hồ sơ cần kiểm tra, reviewer quá hạn, báo cáo chờ rà soát, tờ trình bị trả về, yêu cầu rút/sửa cần duyệt |
| TB | Hàng đợi rà soát tờ trình, hồ sơ cần kiểm tra và giao CV |
| TP | Hàng đợi duyệt tờ trình, hồ sơ "Chưa có người phụ trách", cảnh báo hồ sơ nhà khoa học trùng |
| PP | Số liệu theo dõi, không có hàng đợi xử lý |
| GĐ | Tờ trình chờ quyết định và chờ ký (đề tài + kinh phí, thanh lý, hội đồng, điều chỉnh, gia hạn) |
| PGĐ-KH | Tờ trình chờ ký (hội đồng, giấy IRB, điều chỉnh, gia hạn) |
| PGĐ-TD | Số liệu tổng hợp |
| PI | Proposal cần bổ sung, báo cáo sắp hạn, task trong đề tài |
| Project Member | Task được giao, evidence cần nộp, deadline phần việc |
| Reviewer / thành viên hội đồng / IRB | Lời mời chờ phản hồi, hồ sơ cần chấm, review sắp hạn, review đã lưu nháp |

---

## 9. Có cần giao diện riêng cho sinh viên không?

Trong Phase 1, **chưa cần giao diện riêng cho sinh viên**.

Module “sinh viên nghiên cứu khoa học” (đề tài sinh viên NCKH) do CV và NCV đăng ký với tư cách giảng viên hướng dẫn; CV duyệt, quản lý và hoàn thành trong scope đơn vị (matrix §9.6). Các nghiệp vụ chính gồm:

```text
- Đăng ký đề tài (CV, NCV là giảng viên hướng dẫn)
- Duyệt, quản lý, hoàn thành (CV trong scope)
- Quản lý kế hoạch và văn bản
- Theo dõi điều chỉnh
- Theo dõi kinh phí (siêu dữ liệu)
- Theo dõi sản phẩm và kết quả
```

Hội thảo giữ nguyên, chưa thay đổi theo mô hình 10 vai trò.

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
Tờ trình
Kinh phí
Phân mảng
Báo cáo tiến độ
Hội thảo / Sinh viên NCKH
Hội đồng / IRB
Văn bản liên quan
Nhà khoa học
Reviewer Workspace
Báo cáo - Thống kê
Quản trị hệ thống
```

Hiển thị theo role: "Tờ trình" cho CV (lập), TB (rà soát), TP (duyệt), GĐ/PGĐ-KH (ký); "Kinh phí" cho GĐ, PGĐ-KH, TP, TB, CV (phạm vi giao) và người tham gia theo quyền xem riêng; "Phân mảng" chỉ TP (TB xem *(cần xác nhận)*); "Công việc của tôi" không có cho QT.

Người dùng không có quyền thì không thấy menu tương ứng. Tuy nhiên backend vẫn phải kiểm tra quyền ở API.

---

## 11. Bảng tổng hợp các UI cần có

| Nhóm UI | Bắt buộc MVP | Đối tượng | Lý do |
|---|---:|---|---|
| Admin Console | Có | QT | Quản lý user, role, đơn vị, danh mục, cấu hình, link kích hoạt tài khoản |
| Phòng KHQS Workspace | Có | TP, PP, TB, CV | TP duyệt tờ trình và phân mảng; PP theo dõi; TB rà soát tờ trình; CV vận hành hồ sơ được giao |
| BGĐ Decision Dashboard | Có | GĐ, PGĐ-KH, PGĐ-TD | GĐ quyết định/ký; PGĐ-KH ký; PGĐ-TD theo dõi tổng hợp |
| Researcher Workspace | Có | Mọi role trừ QT/NNB (PI), thành viên, thư ký đề tài | Nộp hồ sơ, theo dõi đề tài, nộp báo cáo, xử lý task |
| Reviewer / Council / IRB Workspace | Có | Mọi tài khoản có lý lịch khoa học (trừ QT) khi được mời | Chấp nhận/từ chối, chấm điểm, nhận xét hồ sơ được phân công |
| My Work | Có | Mọi user trừ QT | Hàng đợi việc cá nhân theo role, notification, deadline |
| Hộp tờ trình và Hồ sơ chưa phân công | Có | CV, TB, TP, GĐ, PGĐ-KH | Xem §15, §16 |
| Student Portal | Để sau | Sinh viên | Chưa cần cho MVP |
| External Public Portal | Không | Người ngoài hệ thống | Phase 1 là hệ thống nội bộ, không phải cổng công khai |

---

## 12. Kết luận cuối cùng

Giai đoạn hiện tại nên thiết kế **5 workspace chính + 1 màn hình My Work dùng chung**:

```text
1. Admin Console (QT)
2. Phòng KHQS Workspace (TP / PP / TB / CV)
3. BGĐ Decision Dashboard (GĐ / PGĐ-KH / PGĐ-TD)
4. Researcher Workspace
5. Reviewer / Council / IRB Workspace
6. My Work - Công việc của tôi
```

Không cần giao diện riêng cho khoa/bộ môn trong giai đoạn hiện tại.

Không cần giao diện riêng cho sinh viên trong MVP.

Không cần external public portal trong Phase 1.

Điểm quan trọng nhất là: mỗi tài khoản có đúng một system role, và quyền thực tế còn được tính theo quan hệ với từng bản ghi nghiệp vụ. Một nhà khoa học có thể là chủ nhiệm ở đề tài này, thành viên ở đề tài khác, thư ký ở hội đồng khác, và reviewer ở một hồ sơ khác; quan hệ với bản ghi không bao giờ tạo thêm system role.

Do đó UI phải linh hoạt theo ngữ cảnh, còn backend phải luôn enforce quyền theo:

```text
User account
+ System role (một trong 10)
+ Organization/data scope
+ Record relationship / participation role
+ Assignment scope
+ Workflow state (kể cả bước tờ trình)
+ Conflict policy
```

---

## 13. Cảnh báo hồ sơ nhà khoa học trùng và quyết định gộp

- QT, TP hoặc CV (trong scope) tạo cảnh báo khi thấy hồ sơ trùng.
- Cảnh báo gửi thông báo tới TB và TP, hai vai trò này quyết định gộp hoặc giữ riêng.
- Màn hình quyết định cho xem hai hồ sơ cạnh nhau, lý do cảnh báo; thao tác gộp có xác nhận và lịch sử được giữ.
- CV và QT chỉ cảnh báo, không quyết định gộp.

## 14. Email link kích hoạt tài khoản

- Khi QT, TP hoặc CV cấp tài khoản cho hồ sơ nhà khoa học, người dùng nhận email chứa link đặt mật khẩu dùng một lần, hết hạn sau 48 giờ.
- Người dùng tự đặt mật khẩu qua link; không có mật khẩu do hệ thống cấp. Trước khi kích hoạt chưa dùng được tính năng thường.
- Người quản lý có thao tác "Gửi lại link kích hoạt" khi link hết hạn hoặc gửi lỗi/chưa chắc đã tới; mọi lần gửi được audit, không hiển thị link hay mật khẩu cho người quản lý.

## 15. Hộp tờ trình (approval routing inbox)

- Hộp tờ trình hiển thị theo bước hiện tại của người dùng: TB (rà soát), TP (duyệt), GĐ hoặc PGĐ-KH (ký, theo loại thủ tục), CV (soạn và bị trả về).
- Mỗi dòng cho biết loại thủ tục, bản ghi liên quan, bước hiện tại, tác giả và hạn.
- Hành động: chuyển bước tiếp theo (TB → TP → BGĐ), duyệt/ký, hoặc trả về tác giả kèm lý do bắt buộc. Không có hành động bỏ qua bước; người dùng không rà soát tờ trình do chính mình lập.
- Chi tiết tờ trình có lịch sử các bước (TB, TP, BGĐ); PI và reviewer không thấy nhật ký hành động.

## 16. Hồ sơ chưa có người phụ trách

- TP (và TB) có danh sách hồ sơ/đề tài hiển thị "Chưa có người phụ trách" khi hệ thống không tự gán được CV theo mảng.
- Từ danh sách, TP/TB giao CV phụ trách (kiểm tra xung đột); thay đổi và thu hồi được lưu lịch sử.
- Danh sách chỉ hiện hồ sơ trong scope của người xem.
