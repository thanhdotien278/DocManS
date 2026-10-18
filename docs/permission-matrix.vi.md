# Ma trận phân quyền - DocManSystem / RTMS

> **Bản tiếng Việt** của [`permission-matrix.md`](./permission-matrix.md). Khi hai bản
> lệch nhau, bản tiếng Anh là bản gốc và phải sửa cả hai trong cùng một thay đổi.

> **Cập nhật 18/10/2026 — 10 vai trò hệ thống.** Nguồn quyết định hiện hành là
> `docs/Ma_tran-phan-qquyen-DocManS.pdf` (ma trận đối chiếu code API ngày 15/10/2026)
> và tài liệu thiết kế `docs/design/phan-cap-va-trinh-duyet.md` (hiện nằm trên nhánh
> `tuan/DocManS`, chưa merge vào `DocManS`). Khi mâu thuẫn, mục 7 của tài liệu này thắng.
>
> Các tài liệu liên quan trong `docs/` đã được đồng bộ sang mô hình 10 vai trò ngày
> 18/10/2026. Riêng code và seed trên nhánh `DocManS` vẫn chạy 7 vai trò cũ cho đến khi
> merge `tuan/DocManS` (xem [`development/auth-seed-users.md`](development/auth-seed-users.md)).

## 1. Mục đích

Tài liệu này là ma trận phân quyền chi tiết giai đoạn 1 của DocManSystem / RTMS. Nó định
nghĩa kỳ vọng về quyền theo vai trò, phạm vi dữ liệu, trạng thái và audit cho việc triển
khai, review, kiểm thử và QA.

Dùng tài liệu này làm nguồn chuẩn khi triển khai policy backend, guard API, hiển thị
thao tác trên UI, truy vấn dashboard, truy vấn xuất dữ liệu, luồng truy cập file, chuyển
trạng thái workflow và test case phân quyền.

Nếu PRD, yêu cầu, phạm vi story, vai trò hoặc trạng thái workflow thay đổi, tài liệu này
phải được cập nhật trong cùng change set.

## 2. Vai trò hệ thống chuẩn

Mỗi tài khoản có **đúng một** vai trò hệ thống. Quyền thực tế còn phụ thuộc phạm vi tổ
chức/đơn vị của người dùng và quan hệ của người dùng với từng hồ sơ/đề tài (11 loại quan
hệ theo hồ sơ; 83 mã hành động phân quyền V1 theo đợt đối chiếu code 15/10/2026).

| Viết tắt | Chức danh | Mã vai trò hệ thống | Nhóm |
| --- | --- | --- | --- |
| QT | Quản trị hệ thống | `SYSTEM_ADMIN` | Nền tảng |
| GĐ | Giám đốc Học viện | `LEADERSHIP_APPROVAL_AUTHORITY` | Ban giám đốc (BGĐ) |
| PGĐ-KH | Phó Giám đốc phụ trách Khoa học | `SCIENCE_DEPUTY_DIRECTOR` | Ban giám đốc |
| PGĐ-TD | Phó Giám đốc khác, chỉ theo dõi | `RESEARCH_OVERSIGHT_AUTHORITY` | Ban giám đốc |
| TP | Trưởng phòng KHQS | `RESEARCH_MANAGEMENT_HEAD` | Phòng KHQS |
| PP | Phó phòng KHQS | `RESEARCH_MANAGEMENT_DEPUTY_HEAD` | Phòng KHQS |
| TB | Trưởng ban QLKH (một người) | `RESEARCH_BOARD_HEAD` | Phòng KHQS |
| CV | Chuyên viên QLKH | `RESEARCH_MANAGEMENT_STAFF` | Phòng KHQS |
| NCV | Nhà nghiên cứu nội bộ | `RESEARCHER_INTERNAL_USER` | Nhà nghiên cứu |
| NNB | Nhà nghiên cứu bên ngoài | `EXTERNAL_RESEARCHER_USER` | Nhà nghiên cứu |

Đổi tên so với mô hình 7 vai trò cũ: `SCIENTIFIC_MANAGEMENT_HEAD` →
`RESEARCH_MANAGEMENT_HEAD`, `SCIENTIFIC_MANAGEMENT_STAFF` → `RESEARCH_MANAGEMENT_STAFF`.
Vai trò mới: `SCIENCE_DEPUTY_DIRECTOR`, `RESEARCH_MANAGEMENT_DEPUTY_HEAD`,
`RESEARCH_BOARD_HEAD`. `RESEARCH_OVERSIGHT_AUTHORITY` nay chỉ là các Phó Giám đốc khác
làm nhiệm vụ theo dõi, không còn là Phó GĐ phụ trách Khoa học.

### QT — Quản trị hệ thống

- Chỉ quản trị nền tảng: tài khoản, vai trò, đơn vị, danh mục, cấu hình, cấp/liên kết
  tài khoản cho hồ sơ nhà khoa học, quản lý văn bản khoa học.
- Không có lý lịch khoa học, không có dashboard nghiệp vụ, không được phân công làm phản
  biện, thành viên hội đồng hoặc IRB, không có quyền quyết định nghiệp vụ.

### GĐ — Giám đốc Học viện

- Vai trò duy nhất phê duyệt đề tài (hồ sơ đề xuất) cùng kinh phí, và phê duyệt thanh lý
  hợp đồng.
- Ký được mọi thủ tục PGĐ-KH ký: thành lập hội đồng đánh giá/nghiệm thu/IRB, cấp giấy
  IRB, gia hạn và điều chỉnh đề tài.
- Xem mọi đề tài trong Học viện và kinh phí từng đề tài; quản lý kinh phí, giải ngân,
  quyết toán.

### PGĐ-KH — Phó Giám đốc phụ trách Khoa học

- Ký thành lập hội đồng (đánh giá, nghiệm thu, IRB), cấp giấy IRB, gia hạn và điều chỉnh
  đề tài (kể cả điều chỉnh có đổi kinh phí).
- Không phê duyệt đề tài, kinh phí đề tài, thanh lý; không quản lý kinh phí.
- Xem mọi đề tài trong Học viện và kinh phí từng đề tài.

### PGĐ-TD — Phó Giám đốc khác, chỉ theo dõi

- Chỉ theo dõi: tiến độ, số lượng và báo cáo kinh phí **tổng hợp** (ghi chú 7).
- Không xem kinh phí từng hồ sơ/đề tài và không ký gì.

### TP — Trưởng phòng KHQS

- Duyệt mọi tờ trình trước khi lên BGĐ.
- Giao mảng đề tài cho CV, giao/đổi/thu hồi chuyên viên phụ trách hồ sơ và đề tài, điều
  phối mọi hồ sơ trong phạm vi đơn vị.
- Có thể làm cả việc đánh giá ở mức CV (phân công phản biện/hội đồng, tổng hợp, hội đồng
  IRB, lập tờ trình) trong phạm vi đơn vị.
- Xem mọi đề tài trong Học viện; quản lý kinh phí toàn Học viện.
- Không kiểm tra đầy đủ và không yêu cầu bổ sung hồ sơ.

### PP — Phó phòng KHQS

- Chỉ theo dõi (tiến độ, số lượng) trong phạm vi đơn vị. Không có bước nào trong luồng
  tờ trình và không duyệt, kể cả khi TP vắng.
- Chỉ xem kinh phí của đề tài mà PP là chủ nhiệm/thành viên (ghi chú 4).

### TB — Trưởng ban QLKH

- Rà soát tờ trình do CV lập, rồi trình TP hoặc trả lại người lập.
- Giao/thu hồi chuyên viên phụ trách trong phạm vi đơn vị; làm kiểm tra đầy đủ, yêu cầu
  bổ sung, phân công phản biện/hội đồng, tổng hợp, hội đồng IRB và lập tờ trình trong
  phạm vi đơn vị.
- Xem mọi đề tài trong Học viện; quản lý kinh phí toàn Học viện.

### CV — Chuyên viên QLKH

- Chỉ làm việc trên hồ sơ/đề tài mà mình đang được phân công phụ trách (ghi chú 3): kiểm
  tra đầy đủ, yêu cầu bổ sung, mời phản biện/hội đồng, tổng hợp, hội đồng IRB, lập tờ
  trình, nghiệp vụ đề tài hằng ngày (thiết lập mốc, xét báo cáo, thẩm định điều chỉnh/gia
  hạn, nghiệm thu, sản phẩm, lập thanh lý, đóng đề tài), kinh phí trong phạm vi phụ trách.
- Tạo/mở/đóng đợt tiếp nhận; quản lý hồ sơ nhà khoa học trong phạm vi đơn vị; quản lý đề
  tài sinh viên NCKH trong phạm vi đơn vị.
- Không bao giờ thao tác trên hồ sơ do CV khác phụ trách.

### NCV — Nhà nghiên cứu nội bộ

- Tạo, sửa, nộp đề xuất với tư cách chủ nhiệm; làm việc của chủ nhiệm và thành viên trên
  đề tài của mình.
- Chỉ là phản biện, thành viên/thư ký hội đồng hoặc thành viên IRB khi được phân công
  (ghi chú 5, 6).
- Đăng ký đề tài sinh viên NCKH với tư cách giảng viên hướng dẫn.

### NNB — Nhà nghiên cứu bên ngoài

- Không tạo đề xuất, không xem đợt tiếp nhận, không làm chủ nhiệm.
- Chỉ tham gia với tư cách phản biện, thành viên hội đồng/IRB, thư ký hội đồng hoặc thành
  viên đề tài thông qua quan hệ tường minh với hồ sơ.

### Vai trò tham gia và phân công theo hồ sơ

Các vai trò công việc khoa học như `PROPOSAL_PI`, `TOPIC_PI`, `TOPIC_SECRETARY`,
`TOPIC_MEMBER`, phản biện, chủ tịch/thư ký/thành viên hội đồng, thành viên/thư ký IRB và
chuyên viên phụ trách phải được xác định trong ngữ cảnh của một hồ sơ đề xuất, đề tài đã
duyệt, hội đồng, hồ sơ IRB, phiếu đánh giá, task hoặc bản ghi nghiệp vụ cụ thể. Một hồ sơ
đề xuất có một `PROPOSAL_PI` suy ra từ `ownerId`; nhóm đề tài chỉ gồm `TOPIC_SECRETARY` và
`TOPIC_MEMBER`.

Không cấp quyền toàn cục bằng cách gán nhãn tham gia trực tiếp cho tài khoản. Backend tính
quyền thực tế từ vai trò hệ thống, phạm vi tổ chức/đơn vị, quan hệ với hồ sơ, phân công,
trạng thái workflow và chính sách xung đột.

| Loại vai trò | Ví dụ | Phạm vi | Giới hạn quan trọng |
| --- | --- | --- | --- |
| Trách nhiệm quản lý | `PROPOSAL_MANAGEMENT_OFFICER`, `PROJECT_MANAGEMENT_OFFICER` (một CV) | Một hồ sơ/đề tài | Tối đa một CV phụ trách hiện hành mỗi bản ghi; tự giao theo mảng khi nộp, hoặc do TP/TB giao; giữ lịch sử/audit. |
| Tham gia hồ sơ đề xuất | `PROPOSAL_PI`, `TOPIC_SECRETARY`, `TOPIC_MEMBER` | Một hồ sơ | Không truy cập hồ sơ không liên quan; PI suy ra từ `ownerId`. |
| Tham gia đề tài đã duyệt | `TOPIC_PI`, `TOPIC_SECRETARY`, `TOPIC_MEMBER` | Một đề tài | Phụ thuộc quan hệ đang hiệu lực và trạng thái workflow. |
| Phân công đánh giá | Phản biện / thành viên hội đồng đánh giá | Một hồ sơ | Mời từ mọi tài khoản có lý lịch khoa học (mọi vai trò trừ QT, kể cả GĐ, PGĐ, TP, PP, TB, CV); phải nhận lời; chấm phiếu; đọc được hồ sơ ngoài đơn vị. |
| Thành viên hội đồng / IRB | Chủ tịch, thư ký, thành viên, thành viên IRB, thư ký IRB | Một hội đồng / hồ sơ IRB | Thành viên IRB mời từ mọi tài khoản có lý lịch khoa học; thư ký hội đồng lập tổng hợp/biên bản nhưng không chấm phiếu. |
| Phân công task | Chủ task, người thực hiện, người phối hợp | Một task và bản ghi liên kết | Quyền với task vẫn phụ thuộc quyền với bản ghi liên kết. |

## 3. Quy tắc bổ sung cho Nhà nghiên cứu bên ngoài

Áp dụng lớp quy tắc này cho mọi dòng, bên cạnh ma trận vai trò hệ thống:

| Năng lực | Quy tắc cho `EXTERNAL_RESEARCHER_USER` |
| --- | --- |
| Xác thực và ngữ cảnh tài khoản | Chỉ đăng nhập khi tài khoản đang hoạt động; phiên làm việc thể hiện vai trò bên ngoài và không tự sinh quyền PI/thành viên/phản biện. |
| Quản trị hồ sơ và tài khoản | Không quản lý người dùng, vai trò, phạm vi, hồ sơ, liên kết tài khoản, danh mục hay cấu hình. Chỉ tự cập nhật lý lịch khoa học của mình. |
| Đợt tiếp nhận | Không xem đợt tiếp nhận. |
| Tìm và xem hồ sơ đề xuất | Chỉ đọc hồ sơ có phân công phản biện/hội đồng/IRB hoặc quan hệ thành viên đề tài đang hiệu lực. Cùng đơn vị, cùng tên hay quan hệ với hồ sơ khác không cấp quyền. |
| Nháp và nộp đề xuất | Không tạo, sửa, nộp hoặc nộp lại; không bao giờ là PI. |
| Công việc đánh giá | Chỉ đọc và nộp gói đánh giá được phân công và đã nhận lời; nếu là thư ký hội đồng của hồ sơ thì được lập tổng hợp/biên bản (ghi chú 6). |
| Đề tài, task và file | Chỉ cập nhật tiến độ mốc (thành viên) và đọc khi quan hệ đang hiệu lực cấp đúng thao tác đó. |
| Dashboard, tìm kiếm, xuất dữ liệu, thông báo, lịch sử | Chỉ gồm bản ghi đã thấy được qua cùng chính sách quan hệ/phân công. |

Backend kiểm tra lại vai trò, phạm vi, quan hệ/phân công, trạng thái workflow, xung đột và
hợp đồng ủy quyền (nếu có) tại thời điểm thay đổi dữ liệu. Tạo, nộp và nộp lại đề xuất
không bao giờ dùng ủy quyền. Dữ liệu capability trên UI tự nó không cấp quyền.

## 4. Chú giải quyền

| Ký hiệu / Quyền | Ý nghĩa |
| --- | --- |
| ✓ | Được phép (số mũ = ghi chú điều kiện). |
| ◐n | Có điều kiện, xem ghi chú n. |
| Xem / Read | Chỉ xem. |
| — / None | Không được. |
| Create / Update / Submit | Tạo, sửa hoặc nộp chính thức ở trạng thái workflow cho phép. |
| Review | Xem xét tính đầy đủ, tiến độ, minh chứng, điểm hoặc bối cảnh nghiệp vụ. |
| Assign | Phân công phản biện, thành viên hội đồng, chuyên viên phụ trách, chủ task hoặc người phối hợp. |
| Approve/Reject / Ký | Quyết định có thẩm quyền làm thay đổi kết quả workflow. |
| Manage | Toàn quyền nghiệp vụ trong phạm vi cho phép. |
| Export | Tạo hoặc tải báo cáo/xuất dữ liệu trong phạm vi cho phép. |
| Audit/View History | Xem lịch sử workflow, nhật ký audit hoặc dòng thời gian khi được phép. |

## 5. Quy tắc phạm vi

| Quy tắc phạm vi | Định nghĩa |
| --- | --- |
| Phạm vi nền tảng | Chỉ dữ liệu quản trị của QT; không bao giờ là bản ghi nghiệp vụ. |
| Phạm vi đơn vị (ghi chú 1) | Giới hạn trong phạm vi tổ chức/đơn vị được cấp. Hồ sơ đề xuất luôn theo phạm vi đơn vị. |
| Đã nộp trong đơn vị (ghi chú 2) | Hồ sơ đã vào luồng xử lý (đã nộp trở đi) trong phạm vi đơn vị. |
| Đề tài toàn Học viện | BGĐ (GĐ, PGĐ-KH), TP và TB xem mọi đề tài trong Học viện; TP và TB quản lý kinh phí toàn Học viện. Các thao tác khác với đề tài vẫn theo phạm vi đơn vị. |
| Chuyên viên được phân công (ghi chú 3) | Chỉ bản ghi mà CV đang là người phụ trách hiện hành; từng phụ trách trước đây không cấp quyền. |
| Tham gia của chính mình (ghi chú 4) | Chỉ bản ghi mà người dùng là chủ nhiệm hoặc thành viên. PP chỉ xem kinh phí từng đề tài với những đề tài này. |
| Phân công phản biện / hội đồng / IRB (ghi chú 5) | Chỉ khi được phân công phản biện, thành viên hội đồng hoặc IRB; đọc được hồ sơ ngoài đơn vị. |
| Thư ký hội đồng (ghi chú 6) | Thư ký hội đồng của chính hồ sơ: lập tổng hợp và biên bản, không chấm phiếu. |
| Chỉ số liệu tổng hợp (ghi chú 7) | Dashboard của PGĐ-TD: số liệu tổng; cột kinh phí từng đề tài/hồ sơ để trống. |
| Chính sách xung đột | Từ chối khi người thao tác có quan hệ xung đột trên cùng bản ghi (xem §7.3). |

## 6. Quy tắc trạng thái

| Trạng thái | Ý nghĩa phân quyền |
| --- | --- |
| Nháp | Nội dung nháp chỉ do chủ nhiệm hiện hành tạo/sửa (mọi vai trò trừ QT/NNB); thành viên, thư ký, người được ủy quyền hay người quản lý không sửa hoặc nộp thay. |
| Đợt đang mở | Đợt do TP hoặc CV tạo/mở/đóng; mọi vai trò trừ QT và NNB đều xem được. |
| Đợt đã đóng | Chặn nộp mới; quyền đọc vẫn theo phạm vi. |
| Đã nộp | Khóa sửa nháp; hệ thống tự giao CV phụ trách theo mảng (cấp + tính chất); hồ sơ không khớp hiện "Chưa có người phụ trách" để TP giao. |
| Cần bổ sung | Chủ nhiệm chỉ sửa nội dung hoặc file được yêu cầu theo workflow. |
| Đã nộp lại | Quay về luồng xử lý của CV phụ trách. |
| Đang đánh giá | Người được phân công và đã nhận lời thực hiện đánh giá; người không liên quan không xem được tài liệu đánh giá. |
| Tờ trình đang luân chuyển | CV lập → TB rà soát → TP duyệt → BGĐ ký. Trả lại ở bước nào cũng về người lập, bắt buộc ghi lý do. |
| Chờ phê duyệt | Chỉ GĐ quyết định phê duyệt đề tài + kinh phí. |
| Đã duyệt / Bị từ chối | Có thể bắt đầu tạo đề tài đã duyệt; lịch sử quyết định vẫn xem được theo phạm vi. |
| Đề tài đang thực hiện | CV phụ trách làm nghiệp vụ hằng ngày; chủ nhiệm và thành viên thao tác theo quan hệ. |
| Chờ nộp báo cáo (cờ suy ra) | Chủ nhiệm nộp báo cáo chính thức; thành viên chỉ cập nhật mốc mình phụ trách. |
| Báo cáo đang xét | CV phụ trách xét, chấp nhận hoặc yêu cầu bổ sung (không qua tờ trình). |
| Chờ điều chỉnh / gia hạn | Chủ nhiệm nộp; CV phụ trách thẩm định và lập tờ trình; TB → TP → GĐ hoặc PGĐ-KH ký. Tên trạng thái trong code `under_staff_review`, `under_staff_validation`, `ready_for_head_decision` thuộc luồng cũ và cần đồng bộ với code. |
| Thanh lý | CV lập biên bản thanh lý → TB → TP → chỉ GĐ ký. |
| Hoàn thành/đã nghiệm thu | Chủ yếu chỉ đọc, trừ lịch sử, báo cáo và thao tác lưu trữ được phép. |
| Task mở/đang làm/hoàn thành/hủy | Phụ thuộc trạng thái task, phạm vi người thực hiện/phối hợp và quyền với bản ghi liên kết. |

## 7. Ma trận vai trò hệ thống (chuẩn)

Nguồn: `docs/Ma_tran-phan-qquyen-DocManS.pdf`. `—` là không được; quan hệ với hồ sơ không
bao giờ tạo ra vai trò hệ thống mới.

### 7.1 Chức năng × vai trò

| Chức năng | QT | GĐ | PGĐ-KH | PGĐ-TD | TP | PP | TB | CV | NCV | NNB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Quản trị và tài khoản** | | | | | | | | | | |
| Quản lý tài khoản, vai trò, đơn vị, danh mục, cấu hình | ✓ | — | — | — | — | — | — | — | — | — |
| Quản lý hồ sơ nhà khoa học (tạo, cấp hoặc liên kết tài khoản) | ✓ | — | — | — | ✓¹ | — | — | ✓¹ | — | — |
| Có lý lịch khoa học, tự cập nhật | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Quản lý văn bản khoa học | ✓ | — | — | — | ✓ | — | ✓ | ✓ | — | — |
| **Đợt tiếp nhận** | | | | | | | | | | |
| Tạo, mở, đóng đợt | — | — | — | — | ✓ | — | — | ✓ | — | — |
| Xem đợt đang mở | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **Hồ sơ đề xuất** | | | | | | | | | | |
| Tạo, sửa, nộp đề xuất (tư cách chủ nhiệm) | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Xem hồ sơ | — | Xem² | Xem² | Xem¹ | Xem¹ | Xem¹ | Xem¹ | ◐3 | ◐4 | ◐5 |
| Giao hoặc thu hồi chuyên viên phụ trách hồ sơ, phân mảng | — | — | — | — | ✓¹ | — | ✓¹ | — | — | — |
| Kiểm tra đầy đủ, yêu cầu bổ sung | — | — | — | — | — | — | ✓¹ | ◐3 | — | — |
| Phân công phản biện, lập hội đồng đánh giá | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | — | — |
| Chấm phiếu đánh giá | — | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 |
| Tổng hợp, chốt, trình kết quả đánh giá | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | ◐6 | ◐6 |
| Xem tiến độ đánh giá | — | Xem¹ | Xem¹ | Xem¹ | Xem¹ | Xem¹ | Xem¹ | ◐3 | — | — |
| Lập hội đồng IRB (mời thành viên), trình kết luận IRB | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | — | — |
| Nhận xét IRB (thành viên), lập kết luận IRB (thư ký) | — | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 |
| **Tờ trình qua Phòng KHQS** | | | | | | | | | | |
| Lập tờ trình | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | — | — |
| Rà soát, trình Trưởng phòng (bước Trưởng ban) | — | — | — | — | — | — | ✓¹ | — | — | — |
| Duyệt, trình Ban giám đốc (bước Trưởng phòng) | — | — | — | — | ✓¹ | — | — | — | — | — |
| Ký thành lập hội đồng đánh giá, IRB, nghiệm thu; cấp giấy IRB; gia hạn, điều chỉnh | — | ✓ | ✓ | — | — | — | — | — | — | — |
| Phê duyệt đề tài và kinh phí; phê duyệt thanh lý | — | ✓ | — | — | — | — | — | — | — | — |
| **Đề tài đang thực hiện** | | | | | | | | | | |
| Xem và theo dõi đề tài | — | ✓ | ✓ | Xem¹ | Xem | Xem¹ | Xem | Xem¹ | ◐4 | ◐4 |
| Xem chi tiết kinh phí từng đề tài | — | ✓ | ✓ | — | ✓ | ◐4 | ✓ | ◐3 | ◐4 | ◐4 |
| Quản lý kinh phí, giải ngân, quyết toán | — | ✓ | — | — | ✓ | — | ✓ | ◐3 | — | — |
| Giao hoặc thu hồi chuyên viên phụ trách đề tài | — | — | — | — | ✓¹ | — | ✓¹ | — | — | — |
| Nghiệp vụ hằng ngày: thiết lập mốc, xét báo cáo, thẩm định điều chỉnh, gia hạn, nghiệm thu, sản phẩm, lập thanh lý, đóng đề tài | — | — | — | — | — | — | — | ◐3 | — | — |
| Việc của chủ nhiệm: báo cáo, xin điều chỉnh hoặc gia hạn, nộp nghiệm thu, nộp sản phẩm | — | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | ◐4 | — |
| Cập nhật tiến độ mốc mình phụ trách (thành viên) | — | — | — | — | — | — | — | — | ◐4 | ◐4 |
| **Đề tài sinh viên NCKH** | | | | | | | | | | |
| Đăng ký đề tài (giảng viên hướng dẫn) | — | — | — | — | — | — | — | ✓ | ✓ | — |
| Duyệt, quản lý, hoàn thành | — | — | — | — | — | — | — | ✓¹ | — | — |
| **Tổng quan** | | | | | | | | | | |
| Dashboard nghiệp vụ, xuất Excel | — | ✓ | ✓ | ✓⁷ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### 7.2 Ghi chú điều kiện

1. Chỉ trong phạm vi đơn vị của người dùng.
2. Hồ sơ đã vào luồng xử lý (đã nộp trở đi), trong phạm vi đơn vị.
3. Chỉ hồ sơ hoặc đề tài mà chuyên viên đang được phân công phụ trách.
4. Chỉ hồ sơ hoặc đề tài mà người đó là chủ nhiệm hoặc thành viên. Phó phòng chỉ xem kinh
   phí đề tài mình tham gia.
5. Chỉ khi được phân công phản biện, thành viên hội đồng hoặc IRB; đọc được hồ sơ ngoài
   đơn vị. Phản biện/thành viên hội đồng đánh giá và thành viên IRB được mời từ mọi tài
   khoản có lý lịch khoa học (mọi vai trò trừ QT); ai được mời vào hội đồng đánh giá đều
   chấm phiếu. Người tham gia đề tài không được mời. Thành viên hội đồng hoặc phản biện
   không được ký hay quyết định trên chính hồ sơ đó (§7.3, §8).
   *Thay đổi ngày 18/10/2026 theo quyết định nghiệp vụ; PDF trước đó giới hạn phản biện
   hội đồng đánh giá ở NCV/NNB và quyền chấm phiếu ở CV/NCV/NNB.*
6. Thư ký hội đồng của chính hồ sơ: lập tổng hợp, ghi biên bản, không chấm phiếu.
7. Chưa được định nghĩa trong chú giải của PDF. Theo `docs/design/phan-cap-va-trinh-duyet.md`
   §5: PGĐ-TD chỉ thấy số liệu tổng hợp; kinh phí từng đề tài/hồ sơ để trống.

### 7.3 Quy tắc chung

- **Xung đột lợi ích.** Chủ nhiệm, thành viên hoặc phản biện của một hồ sơ/đề tài không
  dùng quyền quản lý trên chính hồ sơ/đề tài đó (phân công, kiểm tra, tổng hợp, quyết
  định, kinh phí).
- **Ẩn danh hai chiều.** Chủ nhiệm và phản biện không xem nhật ký hành động của hồ sơ.
- **Luồng tờ trình.** CV lập → TB rà soát → TP duyệt → BGĐ ký. Tờ trình do TB lập đi thẳng
  lên TP; tờ trình do TP lập vẫn qua bước TB. Trả lại ở bước nào cũng về người lập (bắt
  buộc ghi lý do). TB/TP không tự rà soát tờ trình mình lập và chỉ xử lý tờ trình trong
  phạm vi đơn vị của mình.
- **Chữ ký.** Chỉ GĐ ký phê duyệt đề tài, kinh phí và thanh lý. GĐ hoặc PGĐ-KH ký thành
  lập hội đồng đánh giá/nghiệm thu/IRB, cấp giấy IRB, gia hạn và điều chỉnh (kể cả điều
  chỉnh có đổi kinh phí).
- **Rút hồ sơ, chỉnh sửa sau nộp, mở lại.** Sau khi nộp, chủ nhiệm gửi yêu cầu; CV phụ
  trách³ phê duyệt hoặc từ chối. Mở lại do CV³ thực hiện, bắt buộc lý do. Tất cả có audit.
- **Hồ sơ nhà khoa học trùng.** Cảnh báo trùng (do QT, TP¹ hoặc CV¹ phát hiện) được thông
  báo đến TB¹ và TP¹; TB/TP quyết định gộp, giữ lịch sử.
- **Danh tính phản biện.** TB¹ và TP¹ được xem danh tính phản biện của hồ sơ; chủ nhiệm,
  thành viên và phản biện khác không được xem.
- **Yêu cầu điều chỉnh/gia hạn không xử lý được.** Nếu không có TB/TP đủ điều kiện hoặc
  người ký không xung đột, chủ nhiệm rút yêu cầu để gỡ chặn đề tài.
- **Phạm vi xem đề tài.** BGĐ, TP và TB xem mọi đề tài trong Học viện; TP và TB quản lý
  kinh phí toàn Học viện; các thao tác khác với đề tài chỉ trong đơn vị. Hồ sơ đề xuất
  luôn theo phạm vi đơn vị.
- **PP** chỉ theo dõi, không có bước nào trong luồng tờ trình.
- **NNB** không tạo đề xuất, không xem đợt tiếp nhận; tham gia với tư cách phản biện,
  thành viên IRB hoặc thành viên đề tài.
- **QT** chỉ quản trị nền tảng: không có lý lịch khoa học, không vào dashboard nghiệp vụ,
  không được phân công phản biện.
- Chức danh đơn vị (Trưởng khoa, Chủ nhiệm Bộ môn, …) chỉ để hiển thị, không cấp quyền.
- Cấp trên xem được những gì cấp dưới xem được; cấp dưới không thay đổi quyết định của cấp
  trên. Backend kiểm tra mọi quyền.

### 7.4 Thủ tục qua tờ trình

| Thủ tục | Bắt đầu từ | Người ký ở BGĐ |
| --- | --- | --- |
| Thành lập hội đồng đánh giá | Tờ trình hội đồng sau khi mọi thành viên nhận lời | GĐ hoặc PGĐ-KH |
| Phê duyệt đề tài và kinh phí | Gói đánh giá đã chốt | Chỉ GĐ |
| Hội đồng IRB / cấp giấy IRB | Đề xuất hội đồng IRB / kết luận IRB | GĐ hoặc PGĐ-KH |
| Hội đồng nghiệm thu | Đề xuất hội đồng nghiệm thu | GĐ hoặc PGĐ-KH |
| Gia hạn đề tài | CV thẩm định đề nghị gia hạn | GĐ hoặc PGĐ-KH |
| Điều chỉnh đề tài (có hoặc không đổi kinh phí) | CV thẩm định đề nghị điều chỉnh | GĐ hoặc PGĐ-KH |
| Thanh lý hợp đồng | Dự thảo biên bản thanh lý | Chỉ GĐ |

Việc nhỏ CV tự làm, không qua tờ trình: xác nhận hồ sơ đầy đủ, yêu cầu bổ sung, phân công
phản biện, theo dõi lời mời, xét báo cáo tiến độ.

## 8. Ma trận theo ngữ cảnh (viết tắt theo vai trò trong hồ sơ)

Các cột được nhóm theo vai trò; đối chiếu với §7 trước. "Phòng KHQS" nghĩa là TP¹/TB¹ cho
việc điều phối và CV³ cho thao tác trên hồ sơ, trừ khi ô ghi rõ vai trò. "BGĐ" là người ký
theo §7.4. Ô không có hoặc bị từ chối là `Không` tường minh.

| Nhóm chức năng | QT | Phòng KHQS (TP / TB / CV) | BGĐ (GĐ / PGĐ-KH / PGĐ-TD) | Chủ nhiệm | Nhóm đề tài (Thư ký / Thành viên) | Phản biện / Hội đồng / IRB | Phạm vi | Trạng thái | Audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Quản trị người dùng, vai trò, tổ chức | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Mọi | Có |
| Danh mục dùng chung và cấu hình | Quản lý | Xem | Xem | Xem khi cần | Xem khi cần | Xem khi cần | Nền tảng | Mọi | Có khi thay đổi |
| Quản lý đợt tiếp nhận | Không | TP, CV: Quản lý; TB, PP: Xem | Xem đợt đang mở | Xem đợt áp dụng | Không | Không | Đơn vị | Nháp, đang mở, đã đóng | Có |
| Tạo và sửa nháp đề xuất | Không | Không từ vai trò quản lý | Không từ vai trò quản lý | Tạo/Sửa của mình (mọi vai trò trừ QT/NNB) | Không | Không | Hồ sơ của mình | Nháp | Có |
| Tải lên/xem/tải về file đính kèm đề xuất | Không | Xem (TP/TB/PP¹, CV³) | Xem (GĐ/PGĐ-KH², PGĐ-TD¹) | Tạo/Xem của mình | Thư ký: Tạo/Xem; Thành viên: Xem | Xem hồ sơ được phân công | Theo bản ghi | Nháp, cần bổ sung, đang đánh giá | Có với thao tác file quan trọng |
| Nộp đề xuất chính thức | Không | Không | Không | Nộp của mình | Không | Không | Hồ sơ của mình | Nháp, đợt đang mở | Có |
| Kiểm tra đầy đủ | Không | TB¹, CV³: Xem xét | Không | Xem của mình | Xem nếu tham gia | Không | Đơn vị / CV phụ trách | Đã nộp, đã nộp lại | Có |
| Yêu cầu bổ sung | Không | TB¹, CV³: Gửi yêu cầu | Không | Xem/phản hồi | Xem nếu tham gia | Không | Đơn vị / CV phụ trách | Đã nộp, cần bổ sung | Có |
| Nộp lại đề xuất | Không | Xem | Xem | Nộp của mình | Không | Không | Hồ sơ của mình | Cần bổ sung | Có |
| Phân công phản biện/hội đồng | Không | TP¹, TB¹, CV³: Phân công có kiểm tra xung đột | Theo dõi tiến độ¹ | Không | Không | Nhận/từ chối lời mời | Đơn vị, CV phụ trách, xung đột | Đã nộp, đã nộp lại, đang đánh giá | Có |
| Chấm điểm và nhận xét | Không | Chỉ qua phân công hội đồng/phản biện của chính mình⁵ | Chỉ qua phân công hội đồng/phản biện của chính mình⁵ | Không | Không | Xem xét/Nộp phần được phân công (mọi vai trò trừ QT) | Phân công đánh giá | Đang đánh giá | Có |
| Tổng hợp đánh giá / Trình kết quả | Không | TP¹, TB¹, CV³: Xem xét/Cập nhật/Trình | Theo dõi tiến độ¹ | Không | Không | Thư ký hội đồng: tổng hợp/biên bản (ghi chú 6) | Đơn vị, xung đột | Đang đánh giá | Có |
| Phê duyệt/từ chối đề tài và kinh phí | Không | Chỉ luân chuyển (TB → TP) | Chỉ GĐ: Phê duyệt/Từ chối | Xem kết quả | Xem kết quả nếu tham gia | Không | Đơn vị, xung đột | Chờ phê duyệt | Có |
| Thành lập hội đồng / IRB / nghiệm thu | Không | Lập và luân chuyển | GĐ hoặc PGĐ-KH: Ký | Không | Không | Thành viên IRB nhận xét, thư ký IRB lập kết luận | Đơn vị, phân công IRB | Tùy trạng thái | Có |
| Tạo và thiết lập đề tài đã duyệt | Không | CV³: Tạo/Thiết lập; TP¹/TB¹ giao chuyên viên | Xem | Xem của mình | Xem nếu tham gia | Không | Đơn vị | Đã duyệt | Có |
| Quản lý mốc/điểm kiểm tra | Không | CV³: Quản lý | Xem | Xem/Sửa mục được phép của mình | Thành viên: cập nhật tiến độ mốc của mình | Không | Đơn vị / tham gia | Đang thực hiện | Có khi thay đổi |
| Nộp báo cáo tiến độ | Không | Xem | Xem | Nộp của mình | Chỉ đóng góp | Không | Đề tài của mình | Chờ báo cáo, đang thực hiện | Có |
| Xét/theo dõi báo cáo tiến độ | Không | CV³: Xem xét/Chấp nhận/Yêu cầu bổ sung | Xem/Theo dõi | Xem/phản hồi | Xem phần được giao | Không | CV phụ trách | Báo cáo đã nộp, đề tài chậm | Có |
| Đề nghị điều chỉnh / gia hạn | Không | CV³: Thẩm định và lập tờ trình; luân chuyển TB → TP | GĐ hoặc PGĐ-KH: Ký | Tạo/Nộp/Rút của mình | Không | Không | Đề tài của mình; CV phụ trách | Đang thực hiện | Có |
| Nghiệm thu/xét cuối | Không | CV³: Chuẩn bị; luân chuyển tờ trình | GĐ hoặc PGĐ-KH: Ký thành lập hội đồng | Nộp hồ sơ nghiệm thu | Xem phần được giao | Đánh giá nếu được phân công | Đơn vị, phân công đánh giá, xung đột | Chờ quyết định, hoàn thành/đã nghiệm thu | Có |
| Xem kinh phí (từng đề tài) | Không | TP, TB: tất cả; CV³; PP⁴ | GĐ, PGĐ-KH: tất cả; PGĐ-TD: chỉ tổng hợp | Xem của mình⁴ | Xem⁴ | Không | Toàn Học viện / phụ trách / của mình | Mọi | Không với thao tác xem |
| Quản lý kinh phí, giải ngân, quyết toán | Không | TP, TB: toàn Học viện; CV³ | GĐ: Quản lý | Không | Không | Không | Toàn Học viện / phụ trách | Đang thực hiện | Có |
| Thanh lý | Không | CV³: Lập; luân chuyển | Chỉ GĐ: Ký | Xem | Xem | Không | CV phụ trách | Hoàn thành | Có |
| Tạo và phân công task | Không | Tạo/Phân công trong phạm vi | Không | Tạo trong đề tài của mình | Không, trừ khi được phân công | Không | Task / bản ghi liên kết, xung đột | Các trạng thái task | Có |
| Cập nhật trạng thái/tiến độ task | Không | Cập nhật trong phạm vi | Xem | Cập nhật của mình/được giao | Cập nhật phần được giao | Không | Người thực hiện/phối hợp | Các trạng thái task | Có |
| Xem lịch sử/dòng thời gian workflow | Audit/Xem lịch sử | Theo phạm vi | Theo phạm vi | Không (ẩn danh hai chiều) | Xem nếu tham gia | Không (ẩn danh hai chiều) | Như bản ghi gốc | Mọi | Không với thao tác xem |
| Tìm/xem nhật ký audit | Audit/Xem lịch sử | Nếu được cấp | Nếu được cấp | Không | Không | Không | Nền tảng / đơn vị | Mọi | Không với thao tác xem |
| Thông báo | Quản lý mẫu | Xem của mình; phát sinh theo workflow | Xem của mình | Xem của mình | Xem của mình | Xem của mình | Theo người dùng | Mọi | Không với thao tác xem |
| Dashboard / xuất Excel | Không | Dashboard theo phạm vi | GĐ, PGĐ-KH: dashboard thẩm quyền; PGĐ-TD: tổng hợp⁷ | Dashboard của mình | Dashboard của mình | Dashboard của mình | Vai trò và phạm vi dữ liệu | Mọi | Có khi xuất |
| Tìm kiếm/lọc | Chỉ dữ liệu quản trị | Theo phạm vi | Theo phạm vi | Của mình | Nếu tham gia | Được phân công | Vai trò và phạm vi dữ liệu | Mọi | Không với thao tác xem |

Một người tham gia không được đồng thời là chuyên viên phụ trách, phản biện, thành viên hội
đồng, người rà soát/duyệt tờ trình hoặc người ký cuối trên cùng bản ghi. Phản biện và quyết
định cuối trong cùng vòng, và các vị trí loại trừ nhau trong hội đồng, cũng bị từ chối. Kiểm
tra khi tạo/đổi phân công, khi đổi người tham gia và lại khi thực hiện thao tác được bảo vệ.
Đổi người phụ trách phải kết thúc người cũ một cách nguyên tử, giữ lịch sử/audit và ngăn hai
người phụ trách cùng lúc. Không có người phụ trách là trạng thái hợp lệ; không xác định được
người phụ trách là lỗi và phải từ chối (fail closed).

Kiểm thử phải bao phủ TP/TB trong/ngoài phạm vi, CV được giao/chưa giao/đã thu hồi, CV chỉ
có quan hệ tham gia, PP chỉ xem, PGĐ-TD chỉ tổng hợp, cả hai thứ tự của phân công xung đột,
đổi người phụ trách đồng thời, xung đột quyết định cùng vòng, bỏ bước và tự rà soát tờ trình,
và lọc giống hệt nhau trên danh sách/chi tiết/số đếm/file/lịch sử.

## 9. Ma trận chi tiết theo phân hệ

Các bảng phân hệ dùng cùng nhóm cột như §8. Khi một dòng ở đây mâu thuẫn với §7, §7 thắng.

### 9.1 Định danh, vai trò, tổ chức

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tạo/sửa tài khoản | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Có | FR1, Story 1.3 |
| Kích hoạt/vô hiệu hóa hoặc khóa tài khoản | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Có | FR1, Story 1.3 |
| Gán vai trò (đúng một mỗi tài khoản) | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Có | FR2, Story 1.3 |
| Gán phạm vi tổ chức/đơn vị | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Có | FR3, FR6, Story 1.3 |
| Gán chức danh đơn vị (chỉ hiển thị) | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Có | Role hierarchy GĐ1 |
| Giao mảng đề tài cho CV | Không | TP | Không | Không | Không | Không | Đơn vị | Có | Role hierarchy GĐ1 |
| Nạp ngữ cảnh phiên theo vai trò | Xem của mình | Xem của mình | Xem của mình | Xem của mình | Xem của mình | Xem của mình | Người dùng hiện tại | Không | FR4, FR5, FR6 |

### 9.2 Danh mục và cấu hình

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Xem danh mục dùng chung | Xem | Xem | Xem | Xem khi cần | Xem khi cần | Xem khi cần | Vai trò và phạm vi dữ liệu | Không | FR7, Story 1.4 |
| Tạo/sửa/xóa mềm mục danh mục | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Có | FR7, Story 1.4 |
| Cấu hình tham số hệ thống / mẫu thông báo | Quản lý | Không | Không | Không | Không | Không | Nền tảng | Có | FR8, FR41-FR43, Story 1.4 |
| Quản lý văn bản khoa học | Quản lý | TP, TB, CV: Quản lý | Không | Không | Không | Không | Theo vai trò | Có | §7.1 |
| Đánh giá primitive phân quyền | Xem kết quả policy | Xem kết quả policy | Xem kết quả policy | Xem kết quả policy | Xem kết quả policy | Xem kết quả policy | Vai trò, phạm vi và trạng thái | Không | FR6, FR6a, NFR7, NFR8, Story 1.4 |

### 9.3 Tiếp nhận và nộp đề xuất

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Trạng thái | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tạo/sửa/mở/đóng đợt tiếp nhận | Không | TP, CV | Không | Không | Không | Không | Đơn vị | Nháp, đang mở | Có | FR9, Story 2.1 |
| Liệt kê đợt đang mở | Không | Xem | Xem | Xem đợt áp dụng (trừ NNB) | Không | Không | Đơn vị | Đang mở | Không | FR9, Story 2.1 |
| Tạo/sửa nháp đề xuất | Không | Không từ vai trò quản lý | Không từ vai trò quản lý | Của mình (mọi vai trò trừ QT/NNB) | Không | Không | Hồ sơ của mình | Đang mở, nháp | Có | FR10, FR11, Story 2.2 |
| Tải lên file đính kèm đề xuất | Không | Không | Không | Tạo của mình | Thư ký: Tạo; Thành viên: Không | Không | Quan hệ với hồ sơ | Nháp, cần bổ sung | Có | FR12, FR36, Story 2.3 |
| Xem/tải về file đính kèm đề xuất | Không | TP/TB/PP¹, CV³ | GĐ/PGĐ-KH², PGĐ-TD¹ | Xem của mình | Xem nếu tham gia | Xem được phân công⁵ | Theo bản ghi | Mọi trạng thái cho phép | Có khi tải file quan trọng | FR12, FR36, Story 2.3 |
| Kiểm tra sẵn sàng nộp | Không | Không | Không | Xem của mình | Xem nếu tham gia | Không | Hồ sơ của mình | Nháp | Không | FR13, Story 2.3 |
| Nộp đề xuất chính thức | Không | Không | Không | Nộp của mình | Không | Không | Hồ sơ của mình; ẩn mục nộp với người không phải chủ nhiệm | Nháp, đợt đang mở | Có | FR14, FR22, Story 2.4 |
| Tự giao CV phụ trách | Hệ thống | TP: giao hồ sơ không khớp mảng | Không | Không | Không | Không | Khớp mảng | Đã nộp, đã nộp lại | Có | Role hierarchy GĐ1 |
| Xem lịch sử nộp | Không | Theo phạm vi | Theo phạm vi | Xem của mình | Xem nếu tham gia | Không | Như phạm vi hồ sơ | Đã nộp trở đi | Không | FR14, FR38, Story 2.4 |

### 9.4 Đánh giá, bổ sung và phê duyệt đề xuất

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Trạng thái | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kiểm tra đầy đủ hồ sơ | Không | TB¹, CV³ | Không | Xem của mình | Xem nếu tham gia | Không | Đơn vị / CV phụ trách | Đã nộp, đã nộp lại | Có | FR15, Story 3.1 |
| Yêu cầu bổ sung | Không | TB¹, CV³ | Không | Xem yêu cầu của mình | Xem nếu tham gia | Không | Đơn vị / CV phụ trách | Đã nộp, cần bổ sung | Có | FR15, Story 3.1 |
| Phản hồi yêu cầu bổ sung | Không | Xem | Không | Sửa/Nộp của mình | Không | Không | Hồ sơ của mình | Cần bổ sung | Có | FR16, Story 3.1 |
| Mời/phân công/thu hồi phản biện hoặc thành viên hội đồng | Không | TP¹, TB¹, CV³ có kiểm tra xung đột | Theo dõi tiến độ¹ | Không | Không | Nhận hoặc từ chối (bắt buộc ghi lý do) | Đơn vị, CV phụ trách, xung đột | Đã nộp, đã nộp lại, đang đánh giá | Có | FR17, FR67a, Story 3.2 |
| Truy cập gói đánh giá được phân công | Không | Chỉ qua phân công của chính mình | Chỉ qua phân công của chính mình | Không | Không | Trước khi nhận lời: tên đề tài/vai trò/hạn; sau khi nhận lời: toàn bộ gói | Phân công đánh giá | Đang đánh giá | Không | FR18, Story 3.2 |
| Nộp điểm/nhận xét/kiến nghị | Không | Chỉ qua phân công của chính mình⁵ | Chỉ qua phân công của chính mình⁵ | Không | Không | Xem xét/Nộp phần được phân công | Phân công đánh giá | Đang đánh giá | Có | FR18, Story 3.3 |
| Tổng hợp, chốt, trình kết quả đánh giá | Không | TP¹, TB¹, CV³ không xung đột | Theo dõi tiến độ¹ | Không | Không | Thư ký hội đồng⁶ | Đơn vị | Đang đánh giá, chờ phê duyệt | Có | FR19, Story 3.4 |
| Luân chuyển gói đánh giá / tờ trình hội đồng | Không | CV lập → TB → TP | Không | Không | Không | Không | Đơn vị | Chờ phê duyệt | Có | Role hierarchy GĐ2–GĐ3 |
| Ký thành lập hội đồng đánh giá | Không | Không | GĐ hoặc PGĐ-KH | Không | Không | Không | Đơn vị, xung đột | Tờ trình ở BGĐ | Có | Role hierarchy GĐ3 |
| Phê duyệt/từ chối đề tài và kinh phí | Không | Không | Chỉ GĐ, có kiểm tra xung đột | Xem kết quả | Xem kết quả nếu tham gia | Không | Đơn vị, xung đột | Chờ phê duyệt | Có | FR21, FR22, FR67a, Story 3.5 |

Các ô phân công và quyết định kế thừa ma trận tương thích/số lượng và mã lý do trong
`docs/authorization-core-business-baseline.md#evaluation-position-compatibility-and-multiplicity`
Ghi đơn lẻ, hàng loạt, import, gọi API trực tiếp và ghi từ quản
trị đều phải đánh giá lại policy đó bên trong mutation sở hữu dữ liệu.

`submitted` và `resubmitted` phải có bằng chứng kiểm tra đầy đủ hiện hành trước khi phân
công đầu tiên mở `under_review`. Ngữ cảnh không hợp lệ hoặc không xác định thì từ chối.

#### 9.4.1 Hợp đồng phạm vi đọc

Bảng này là hợp đồng, không phải tuyên bố đã hoàn thành; xem
[kế hoạch Proposal Review & Approval](../_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md)
về các phần chưa triển khai.

| Quy tắc | Quyết định | Vị trí |
| --- | --- | --- |
| Phản biện đọc hồ sơ | Chỉ được cấp bởi phân công phản biện/hội đồng/IRB đã nhận lời trên đúng hồ sơ đó, khi hồ sơ đang trong luồng chính thức; phân công bị thu hồi thì mất quyền ngay. Trước khi nhận lời chỉ thấy tên đề tài, vai trò, hạn và người mời. | `canReadProposal`, `ProposalReviewAccessService` |
| Phản biện đọc file | Dùng cùng phép tra phân công như đọc hồ sơ. Tải lên vẫn yêu cầu là chủ hồ sơ. | `FilesService.assertCanRead` |
| BGĐ đọc hồ sơ | GĐ/PGĐ-KH: hồ sơ đã nộp trở đi trong phạm vi đơn vị (ghi chú 2); PGĐ-TD: chỉ xem trong phạm vi đơn vị, không xem kinh phí từng bản ghi. | Phân quyền dùng chung cho hồ sơ/đánh giá/file |
| Quyết định đề tài | `LEADERSHIP_APPROVAL_AUTHORITY` cộng phạm vi, bản ghi đã luân chuyển qua TB và TP, trạng thái sẵn sàng và không xung đột. PGĐ-KH, QT và phản biện không có quyền quyết định đề tài. | Mutation quyết định dùng chung |
| Thao tác đánh giá của quản lý | TP/TB trong phạm vi đơn vị; CV chỉ trên hồ sơ được giao; kiểm tra đầy đủ chỉ TB/CV; không xung đột. | Kiểm tra capability dùng chung |
| Xung đột quyết định/tổng hợp | Xung đột tham gia và phản biện thắng vai trò/phạm vi; phiếu đánh giá đã lưu giữ nguyên xung đột sau khi phân công bị thu hồi. | Bộ phân giải xung đột dùng chung |

UI chi tiết hồ sơ chỉ hiển thị các mục đánh giá/phê duyệt theo kết quả capability/phân công
của hồ sơ hiện tại: `ACTION_NOT_GRANTED` thì ẩn mục, bị từ chối do xung đột/trạng thái thì
vẫn hiện nhưng vô hiệu kèm lý do từ backend. Hạn bổ sung và ngày phân công đánh giá nhập
theo nguyên ngày lịch Việt Nam. Chủ nhiệm nhận không gian sửa/nộp; vai trò quản lý nhận bản
tóm tắt chỉ đọc. Trạng thái cho phép của từng thao tác khai báo một lần trong
`apps/api/src/proposals-shared/proposal-workflow.ts`. Trang hồ sơ nhà khoa học không bao
giờ chứa các mục workflow của đề xuất.

### 9.5 Theo dõi đề tài đã duyệt

Chủ nhiệm là `TOPIC_PI` đang hiệu lực. CV là chuyên viên phụ trách đề tài hiện hành; quyền
của chuyên viên phụ trách hồ sơ đề xuất không phải quyền với đề tài. Mọi quyền còn yêu cầu
tài khoản đang hoạt động, ngữ cảnh hiện hành, đúng phạm vi, kiểm tra workflow và xung đột.
Chi tiết triển khai nghiệm thu/hội đồng nằm trong các story tương ứng.

| Thao tác | Chủ nhiệm | CV phụ trách | TP / TB | PP | GĐ / PGĐ-KH | PGĐ-TD | Trạng thái / bất biến |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tạo/xác nhận đề tài | Không | CV phụ trách hồ sơ tạo; CV phụ trách đề tài được giao độc lập xác nhận thiết lập | Giao CV phụ trách đề tài¹ riêng | Không | Không | Không | Nguồn đã duyệt bất biến; không tự sao chép người phụ trách |
| Giao/đổi/thu hồi CV phụ trách đề tài | Không | Không | Trong phạm vi¹, không xung đột | Không | Không | Không | Một người phụ trách hiện hành; giữ lịch sử |
| Xem đề tài/mốc/lịch sử | Của mình | Xem trong đơn vị¹; chỉ thao tác nếu được giao³ | Tất cả trong Học viện | Trong đơn vị¹ | Tất cả trong Học viện | Trong đơn vị¹ | Cùng bộ lọc cho danh sách/chi tiết/số đếm/file |
| Theo dõi hạn | Của mình | Được giao³ | Theo phạm vi | Theo phạm vi¹ | Theo phạm vi | Theo phạm vi¹ | Quá hạn/đến hạn báo cáo là cờ suy ra, không phải trạng thái workflow |
| Xem kinh phí từng đề tài | Của mình⁴ | Được giao³ | Tất cả | Chỉ đề tài mình tham gia⁴ | Tất cả | Chỉ tổng hợp | — |
| Quản lý kinh phí, giải ngân, quyết toán | Không | Được giao³ | Toàn Học viện | Không | Chỉ GĐ | Không | Có audit |
| Lập kế hoạch mốc/thành viên khi thiết lập | Xem | `project.setup.configure` cho mốc/điểm kiểm tra/trách nhiệm ban đầu; xác nhận | Xem | Xem | Xem | Xem | Xác nhận thiết lập trước khi thực hiện |
| Cập nhật tiến độ mốc của mình | Của mình | Xem | Xem | Xem | Xem | Xem | Thành viên (NCV/NNB) trên mốc mình phụ trách⁴ |
| Tải lên minh chứng | Đúng quyền file của mình | Không ghi đè nội dung của chủ nhiệm | Không ghi đè nội dung của chủ nhiệm | Chỉ metadata | Chỉ metadata | Chỉ metadata | `project.evidence.contribute` cho thành viên/thư ký đang hiệu lực, phụ trách mốc đang mở; chỉ file chưa nộp của mình; liên kết đã nộp bất biến |
| Tạo/sửa/nộp/nộp lại báo cáo tiến độ | Của mình | Xem bản đã nộp | Xem | Xem | Xem | Xem | Phiên bản/minh chứng đã nộp bị khóa; trả lại cho phép tạo phiên bản mới |
| Xét báo cáo / chấp nhận / yêu cầu bổ sung | Xem/phản hồi | Xem xét; chấp nhận hoặc yêu cầu bổ sung | Xem | Xem | Xem | Xem | Không cần tờ trình; chấp nhận báo cáo không phải nghiệm thu đề tài và không đổi kế hoạch |
| Lập/nộp đề nghị điều chỉnh hoặc gia hạn | Của mình | Không | Không | Không | Không | Không | Ngày kết thúc gia hạn phải muộn hơn |
| Thẩm định điều chỉnh/gia hạn, lập tờ trình | Không | Được giao³ | Xem | Xem | Xem | Xem | Tự nó không áp dụng thay đổi |
| Rà soát tờ trình (bước TB) / duyệt lên BGĐ (bước TP) | Không | Không | TB rồi TP¹; trả lại người lập kèm lý do | Không | Không | Không | Không bỏ bước; không tự rà soát |
| Ký gia hạn / điều chỉnh (có hoặc không đổi kinh phí) | Xem kết quả | Xem kết quả | Xem kết quả | Xem | GĐ hoặc PGĐ-KH, không xung đột | Không | Chữ ký áp dụng thay đổi một cách nguyên tử |
| Rút đề nghị điều chỉnh / gia hạn (`project.adjustment.withdraw`, `project.extension.withdraw`) | Chỉ đề nghị của mình, chủ nhiệm đang hiệu lực là người đề nghị, bắt buộc ghi lý do | Từ chối | Từ chối | Từ chối | Từ chối | Từ chối | Đề tài `executing`/`paused`; đề nghị chưa kết thúc → trạng thái cuối `withdrawn`; thành viên bị từ chối |
| Hội đồng nghiệm thu, sản phẩm, dự thảo thanh lý, đóng đề tài | Nộp hồ sơ nghiệm thu/sản phẩm | Chuẩn bị và lập dự thảo | Luân chuyển¹ | Xem | Hội đồng nghiệm thu: GĐ hoặc PGĐ-KH; thanh lý: chỉ GĐ | Xem | Qua luồng tờ trình |

Mọi thay đổi dữ liệu ở trên đều có audit. FR23–30b tương ứng Epic 6, story 6.1–6.7 và
6.10; đóng góp của thành viên vẫn tách khỏi việc chủ nhiệm nộp chính thức theo Story 6.4.
Thay đổi kế hoạch/thành viên sau khi kích hoạt chỉ đi qua đề nghị điều chỉnh có kiểu, không
sửa trực tiếp. Tên trạng thái trong code của Golden Flow 4 cũ (`under_staff_review`,
`under_staff_validation`, `ready_for_head_decision`) cần đối chiếu với luồng tờ trình đã
triển khai trên `tuan/DocManS`.

### 9.6 Đề tài sinh viên NCKH

| Thao tác | CV | NCV | Vai trò khác | Phạm vi | Audit |
| --- | --- | --- | --- | --- | --- |
| Đăng ký đề tài với tư cách giảng viên hướng dẫn | ✓ | ✓ | Không | Đăng ký của mình | Có |
| Duyệt, quản lý, hoàn thành | ✓¹ | Không | Không | Đơn vị | Có |

### 9.7 Task

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tạo task (độc lập hoặc liên kết) | Không | Tạo trong phạm vi | Không | Tạo trong đề tài của mình | Không, trừ khi được ủy quyền | Không | Bản ghi liên kết | Có | FR31, Story 5.1 |
| Phân công chủ task/người phối hợp | Không | Phân công trong phạm vi | Không | Trong đề tài của mình nếu được phép | Không, trừ khi được ủy quyền | Không | Bản ghi liên kết, xung đột | Có | FR32, Story 5.1 |
| Cập nhật trạng thái/tiến độ/ghi chú, đính kèm minh chứng | Không | Cập nhật trong phạm vi | Xem | Cập nhật của mình/được giao | Cập nhật phần được giao | Không, trừ khi được giao task | Người thực hiện/phối hợp | Có | FR33, FR36, Story 5.2 |
| Xem task quá hạn/sắp đến hạn | Không | Xem trong phạm vi | Xem trong phạm vi | Xem của mình/được giao | Xem phần được giao | Xem phần được giao nếu có | Vai trò và phạm vi dữ liệu | Không | FR34 |

### 9.8 File

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Tải lên/thay thế file nghiệp vụ quan trọng | Không | Trong phạm vi khi workflow cho phép | Không | File được phép của mình | File được phép được giao | File đánh giá được giao nếu workflow cho phép | Theo bản ghi | Có | FR36, FR37 |
| Xem metadata / tải về | Không | Theo phạm vi | Theo phạm vi (PGĐ-TD: không xem chi tiết kinh phí) | Của mình | Nếu tham gia | Được phân công | Theo bản ghi | Có khi tải về | FR36, FR37 |
| Xóa mềm file | Không | Trong phạm vi nếu policy cho phép | Không | File được phép của mình | Không, trừ khi được ủy quyền | Không | Theo bản ghi | Có | FR36, FR37 |

### 9.9 Nhật ký audit và lịch sử workflow

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Xem nhật ký hành động / lịch sử workflow của bản ghi | Audit/Xem lịch sử | Theo phạm vi | Theo phạm vi | Không (ẩn danh hai chiều) | Xem nếu tham gia | Không (ẩn danh hai chiều) | Như bản ghi gốc | Không | FR38, FR40 |
| Xem lịch sử các bước tờ trình | Không | Theo phạm vi | Theo phạm vi | Xem bản ghi của mình | Xem nếu tham gia | Không | Như bản ghi gốc | Không | Role hierarchy GĐ2–GĐ3 |
| Tìm/xuất nhật ký audit | Audit/Xuất | Nếu được cấp | Nếu được cấp | Không | Không | Không | Nền tảng / đơn vị | Có hoặc vết vận hành | FR39, FR40 |
| Tạo bản ghi audit từ thao tác nghiệp vụ | Hệ thống tạo | Hệ thống tạo | Hệ thống tạo | Hệ thống tạo | Hệ thống tạo | Hệ thống tạo | Như thao tác gốc | Có | Audit-Log Requirements |

### 9.10 Thông báo, nhắc việc và hàng đợi công việc

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nhận thông báo trong ứng dụng/email | Xem của mình | Xem của mình (gồm bước tờ trình tiếp theo) | Xem của mình (tờ trình chờ ký) | Xem của mình | Xem của mình | Xem của mình (lời mời) | Theo quyền người nhận | FR41, FR42 |
| Cấu hình mẫu / job nhắc việc | Quản lý | Không | Không | Không | Không | Không | Nền tảng | FR41-FR43 |
| Xem hàng đợi công việc | Không | TB: hàng chờ rà soát; TP: hàng chờ duyệt; CV: hồ sơ được giao | Chờ phê duyệt/ký | Của mình | Của mình/được giao | Hàng chờ đánh giá được giao | Vai trò, phạm vi, phân công | FR44 |

### 9.11 Dashboard, tìm kiếm, báo cáo và xuất dữ liệu

| Thao tác | QT | Phòng KHQS | BGĐ | Chủ nhiệm | Nhóm đề tài | Phản biện / Hội đồng | Phạm vi | Audit | Nguồn yêu cầu |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Xem dashboard nghiệp vụ | Không | Theo phạm vi; chia theo tính chất (Quân sự/Dân sự) và CV phụ trách | GĐ/PGĐ-KH: theo phạm vi; PGĐ-TD: chỉ tổng hợp⁷ | Của mình | Của mình | Của mình | Vai trò và phạm vi dữ liệu | Không | FR45, Story 7.2 |
| Xem chi tiết / tìm kiếm / lọc | Chỉ dữ liệu quản trị | Theo phạm vi | Theo phạm vi | Của mình | Nếu tham gia | Được phân công | Như phạm vi bản ghi đích | Không | FR46, FR47 |
| Xem báo cáo | Không | Theo phạm vi | Theo phạm vi (PGĐ-TD: chỉ kinh phí tổng hợp) | Của mình nếu báo cáo hỗ trợ | Của mình nếu báo cáo hỗ trợ | Được phân công nếu báo cáo hỗ trợ | Vai trò và phạm vi dữ liệu | Không | FR49, Story 7.3 |
| Xuất Excel/PDF | Không | Theo phạm vi | Theo phạm vi (PGĐ-TD: không có kinh phí từng bản ghi) | Của mình nếu được phép | Của mình nếu được phép | Được phân công nếu được phép | Vai trò và phạm vi dữ liệu | Có | FR48, Story 7.3 |

## 10. Quy tắc cấm quan trọng

- Phân quyền chỉ ở frontend là không đủ; backend kiểm tra mọi thao tác được bảo vệ.
- Mỗi tài khoản có đúng một vai trò hệ thống; quan hệ với hồ sơ không bao giờ tạo vai trò hệ thống.
- QT không bao giờ có quyền với bản ghi nghiệp vụ, lý lịch khoa học, dashboard nghiệp vụ hay phân công phản biện.
- `EXTERNAL_RESEARCHER_USER` không bao giờ là chủ nhiệm, không xem đợt tiếp nhận, không tạo đề xuất.
- PP và PGĐ-TD không bao giờ duyệt, ký hay luân chuyển; PGĐ-TD không xem kinh phí từng bản ghi.
- PGĐ-KH không bao giờ phê duyệt đề tài, kinh phí đề tài hay thanh lý.
- TP không kiểm tra đầy đủ và không yêu cầu bổ sung.
- CV không bao giờ thao tác trên hồ sơ/đề tài do CV khác phụ trách.
- Không tờ trình nào được bỏ bước; TB/TP không rà soát tờ trình do chính mình lập.
- Chủ nhiệm và phản biện không bao giờ xem nhật ký hành động của hồ sơ.
- Người dùng không được xem dữ liệu hồ sơ khác đơn vị nếu không được cấp tường minh.
- Phản biện, thành viên hội đồng và IRB không được truy cập hồ sơ không được phân công.
- Từ chối phân công chuyên viên phụ trách, phản biện, hội đồng hoặc IRB khi ứng viên là
  chủ nhiệm, người tham gia, `TOPIC_SECRETARY` hoặc vai trò bị loại trừ khác trên cùng bản ghi.
- Chủ nhiệm, thành viên hoặc phản biện không bao giờ dùng quyền quản lý (phân công, kiểm
  tra, tổng hợp, quyết định, kinh phí) trên cùng bản ghi.
- Chủ nhiệm không được sửa đề xuất đã nộp trừ khi workflow cho phép bổ sung hoặc nộp lại.
- Không cấp quyền truy cập file chỉ dựa vào object key.
- Cấm sửa trạng thái trực tiếp; chuyển trạng thái phải qua thao tác nghiệp vụ tường minh.
- Thao tác nhạy cảm phải từ chối (fail closed) khi không xác định an toàn được vai trò,
  phạm vi, quan hệ, phân công, xung đột hoặc trạng thái.
- Kết quả tìm kiếm, tổng số trên dashboard, file xuất, thông báo, màn hình audit và metadata
  file không được làm lộ bản ghi không có quyền.

## 11. Yêu cầu audit theo thao tác

| Thao tác | Cần audit | Ngữ cảnh tối thiểu |
| --- | --- | --- |
| đăng nhập / đăng xuất | Có | người thao tác, username, thời điểm, kết quả, ngữ cảnh request/phiên |
| tạo/sửa/vô hiệu hóa người dùng | Có | người thao tác, người dùng đích, thao tác, trạng thái trước/sau nếu khả thi |
| gán vai trò/phạm vi/chức danh đơn vị | Có | người thao tác, người dùng đích, vai trò, phạm vi, chức danh, thời điểm |
| giao mảng cho CV | Có | người thao tác, CV, mảng (cấp/tính chất), thời điểm |
| tạo/sửa/mở/đóng đợt tiếp nhận | Có | người thao tác, id/mã đợt, trạng thái từ/đến, thời điểm |
| tạo/sửa nháp đề xuất | Có | người thao tác, id hồ sơ, phần thay đổi hoặc tóm tắt an toàn, thời điểm |
| tải lên/tải về/thay thế file quan trọng | Có | người thao tác, id file, thực thể đích, thao tác, thời điểm, metadata an toàn |
| nộp / nộp lại đề xuất | Có | người thao tác, id hồ sơ, trạng thái từ/đến, thời điểm |
| yêu cầu bổ sung | Có | người thao tác, id hồ sơ, lý do, hạn, thời điểm |
| giao/đổi/thu hồi CV phụ trách (thủ công hoặc tự động) | Có | người thao tác hoặc hệ thống, bản ghi, người phụ trách cũ/mới, mảng khớp, thời điểm, lý do |
| mời/nhận lời/từ chối/thu hồi phản biện, hội đồng hoặc IRB | Có | người thao tác, bản ghi, thành viên, vai trò, quyết định, lý do, thời điểm |
| nộp điểm/nhận xét | Có | người thao tác, id hồ sơ, id phiếu, trạng thái đã nộp, thời điểm |
| tổng hợp đánh giá | Có | người thao tác, id hồ sơ, id bản tổng hợp, thời điểm |
| trình/chuyển/trả lại/duyệt/ký tờ trình | Có | người thao tác, id tờ trình, loại thủ tục, bước, quyết định, lý do, thời điểm |
| phê duyệt/từ chối đề tài và kinh phí | Có | người thao tác, bản ghi đích, quyết định, trạng thái từ/đến, thời điểm, ghi chú |
| tạo đề tài đã duyệt / thay đổi mốc | Có | người thao tác, id đề tài, id mốc, trạng thái trước/sau nếu khả thi |
| nộp báo cáo tiến độ | Có | người thao tác, id đề tài, id báo cáo, kỳ báo cáo, thời điểm |
| tạo/rút đề nghị điều chỉnh/gia hạn | Có | người thao tác, id đề tài, id đề nghị, loại đề nghị, lý do, thời điểm |
| ký điều chỉnh/gia hạn | Có | người thao tác, id đề tài, id đề nghị, quyết định, thời điểm |
| giải ngân/quyết toán kinh phí, thanh lý | Có | người thao tác, id đề tài, số tiền/văn bản, quyết định, thời điểm |
| tạo/phân công task, cập nhật trạng thái task | Có | người thao tác, id task, người được giao, bản ghi liên kết, trạng thái từ/đến, thời điểm |
| xuất báo cáo | Có | người thao tác, loại báo cáo, bộ lọc, phạm vi, định dạng xuất, thời điểm |

## 12. Ghi chú triển khai

- Tài liệu này là nguồn chuẩn cho việc triển khai phân quyền; §7 thắng khi mâu thuẫn.
- Mười mã vai trò hệ thống là các mã ở §2 (`packages/permissions/src/system-roles.js` trên
  `tuan/DocManS`). Nhánh `DocManS` vẫn dùng bảy vai trò cũ cho đến khi phần đó được merge.
- Policy backend kết hợp vai trò hệ thống, phạm vi đơn vị, quan hệ với hồ sơ, phân công,
  trạng thái workflow, bước tờ trình và chính sách xung đột.
- Vai trò tham gia (`PROPOSAL_PI`, `TOPIC_PI`, `TOPIC_MEMBER`, `TOPIC_SECRETARY`, phản
  biện, thành viên/thư ký hội đồng, thành viên/thư ký IRB, chuyên viên phụ trách) lưu trên
  bản ghi quan hệ hoặc phân công tương ứng, không bao giờ suy ra từ vai trò tài khoản.
- Quan hệ tham gia phải truy được từ bản ghi tới tài khoản người dùng; mục chỉ có chữ mô tả
  không dùng để đánh giá chính sách xung đột được.
- Quan hệ thực tế của người dùng hiện tại với bản ghi được trả về cùng bản ghi; UI không suy
  ra nó từ vai trò hệ thống.
- Khi chính sách xung đột từ chối một thao tác, lý do từ chối phải có sẵn cho UI.
- Ẩn/hiện nút trên UI chỉ là gợi ý UX; kiểm tra ở backend mới có hiệu lực.
- Test API và QA thủ công gồm cả trường hợp được phép và bị từ chối cho mọi năng lực được
  bảo vệ, và test rò rỉ chéo phạm vi cho số liệu tổng hợp, tìm kiếm, xuất dữ liệu, thông báo
  và metadata file.
- Vai trò cũ đã bỏ: ADM, LD, VT, TBP, CB, HD, BC, cùng hai mã cũ
  `SCIENTIFIC_MANAGEMENT_HEAD` / `SCIENTIFIC_MANAGEMENT_STAFF`.

## Hợp đồng phân công từ tài khoản người dùng

Phân công phản biện, hội đồng và IRB (`proposal.review.assign`, kể cả thu hồi) tuân theo các
quy tắc sau.

| Thao tác | Kiểm tra bắt buộc | Bằng chứng / công bố |
| --- | --- | --- |
| Tìm tài khoản đủ điều kiện | TP¹/TB¹ hoặc CV phụ trách³; trạng thái cho phép phân công; có bằng chứng kiểm tra đầy đủ hiện hành; ứng viên đang hoạt động; phản biện/thành viên hội đồng đánh giá và thành viên IRB lấy từ mọi tài khoản có lý lịch khoa học (không bao giờ là QT); không xung đột chủ nhiệm/nhóm, không trùng phân công đang hiệu lực | ID tài khoản, tên hiển thị, username, chức danh đơn vị (chỉ hiển thị) |
| Mời cho một trong hai nhiệm vụ | Kiểm tra lại điều kiện, ngữ cảnh hồ sơ, ngày hiệu lực/hạn | Lời mời và audit nguyên tử |
| Nhận lời / từ chối | Chỉ người được mời; từ chối bắt buộc ghi lý do; tờ trình hội đồng chỉ được luân chuyển khi mọi thành viên đã nhận lời | Trước khi nhận lời chỉ thấy tên đề tài, vai trò, hạn và người mời |
| Đọc gói/file hoặc nộp phiếu của mình | Phân công đã nhận lời, không xung đột tham gia, trạng thái và quy tắc công bố phù hợp; được vượt ranh giới đơn vị | Chỉ phân công và phiếu của mình |
| Thu hồi một trong hai nhiệm vụ | TP¹/TB¹ hoặc CV phụ trách³, người thao tác không xung đột, trạng thái cho phép, lý do không để trống | Giữ lịch sử và phiếu đã nộp; chấm dứt quyền truy cập ngay |

Thành viên hội đồng đã nhận lời chỉ đọc được hồ sơ sau khi BGĐ ký quyết định thành lập hội
đồng.

## Hoàn thiện hồ sơ nhà khoa học — 15/09/2026

[Hợp đồng Researcher Profile / Account / My Profile](contracts/researcher-profile-access.md)
vẫn là nguồn cho trường API/dữ liệu, gửi thông tin đăng nhập, tương thích migration và lưu
lịch sử.

- QT (nền tảng) và TP¹/CV¹ (phạm vi đơn vị) quản lý hồ sơ nội bộ/bên ngoài độc lập với tài
  khoản. Kích hoạt hồ sơ và kích hoạt tài khoản vẫn là hai thao tác riêng.
- Mọi vai trò trừ QT đều có lý lịch khoa học và tự cập nhật qua My Profile.
- Cấp tài khoản tạo tài khoản nhà nghiên cứu liên kết ở trạng thái `PENDING_ACTIVATION`: hồ
  sơ INTERNAL mặc định được cấp và bắt buộc có email; hồ sơ EXTERNAL chỉ được cấp khi người
  quản lý chọn `Tạo tài khoản truy cập hệ thống`.
- Kích hoạt dùng token băm dùng một lần, hết hạn đúng sau 48 giờ và chỉ gửi đường dẫn đặt
  mật khẩu. Không tạo, gửi email, lưu, trả về cho cán bộ hay ghi vào audit bất kỳ mật khẩu
  tạm nào.
- Đăng nhập bằng username đã cấu hình hoặc email tài khoản. Username không bắt buộc khi cấp,
  là duy nhất khi người dùng liên kết đặt sau, và không bao giờ suy ra từ email.
- My Profile dùng liên kết hiện hành của tài khoản đang hoạt động. Chỉ sửa được trường cá
  nhân/khoa học và username của mình; loại, trạng thái, liên kết, email nhận thông tin đăng
  nhập và vai trò/phạm vi vẫn thuộc quản trị.
- Audit hồ sơ/liên kết/tài khoản/kích hoạt/username/trạng thái tài khoản được giữ với các dữ
  kiện thay đổi an toàn trong giao dịch.

### Ma trận thao tác hồ sơ nhà khoa học

| Thao tác | QT / TP¹ / CV¹ | Tài khoản liên kết đang hoạt động (mọi vai trò trừ QT) | Tài khoản khác |
| --- | --- | --- | --- |
| Danh bạ/tạo/xem/sửa/trạng thái | Đúng phạm vi được cấp | Không có danh bạ; hồ sơ của mình qua My Profile | Từ chối |
| Sửa công bố/quá trình tham gia | Đúng phạm vi được cấp | Chỉ hồ sơ của mình | Từ chối |
| Tạo/liên kết/hủy liên kết tài khoản, gửi lại kích hoạt | Trong phạm vi, đúng tài khoản nhà nghiên cứu; email/ngữ cảnh/lý do theo yêu cầu | Từ chối | Từ chối |
| Đổi username của mình | Từ chối trừ khi qua luồng hỗ trợ tường minh | Chỉ tài khoản liên kết đang hoạt động của mình | Từ chối |
| Xem/sửa hồ sơ của mình | — | Hồ sơ liên kết đang hoạt động; danh sách trường cá nhân cho phép | Từ chối |
| Lịch sử | Lịch sử hồ sơ lọc theo phạm vi | Chỉ thay đổi khoa học/hồ sơ của mình | Từ chối |
| Tính năng thông thường trước khi đổi bắt buộc | Từ chối | Từ chối | Từ chối |

Các quyền về hồ sơ này không mở rộng bất kỳ quyền nào với bản ghi nghiệp vụ trong ma trận.

### Phạm vi triển khai

Trên `DocManS`, mô hình này đã triển khai cho các chức năng đề xuất, tiếp nhận, hồ sơ nhà
khoa học, file và đánh giá hiện có. Đề tài đã duyệt, vòng đời hội đồng/IRB, dashboard toàn
Học viện, tìm kiếm/báo cáo/xuất dữ liệu chung và backend thông báo/My Work vẫn đang lên kế
hoạch nếu chưa có nguồn dữ liệu vận hành (luồng tờ trình, lời mời hội đồng và phân tích
dashboard đã có trên `tuan/DocManS`). `PROJECT_MANAGEMENT_OFFICER` là quan hệ theo hợp đồng,
không phải bản ghi phân công lưu riêng lẻ.
Dữ liệu showcase trên dashboard không phải báo cáo chính thức hay bằng chứng phân quyền. Các
miền dữ liệu nguồn sau này phải áp cùng kiểm tra phạm vi, quan hệ, xung đột và công bố trước
khi tổng hợp hoặc cho xem chi tiết. Bộ lọc dashboard gồm năm, đơn vị, cấp, lĩnh vực và tính
chất (Quân sự / Dân sự / Chưa phân loại), có phân tích theo CV phụ trách và nhóm "Chưa có
người phụ trách". Chỉ GĐ có hàng chờ quyết định đề tài/kinh phí; GĐ và PGĐ-KH có hàng chờ
ký; TB có hàng chờ rà soát tờ trình và TP có hàng chờ duyệt. Kinh phí đề xuất hiện chỉ có
`budgetMetadata.amount` (kinh phí đề nghị); không suy ra chi tiêu và không thêm sổ cái, thanh
toán, ngân hàng, hóa đơn hay tích hợp ERP.
