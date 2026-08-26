---
title: "DocManS — Baseline vai trò, quyền theo bản ghi và nghiệp vụ cốt lõi"
type: normative-product-decision
status: approved
version: 1.0
approved: 2026-08-26
audience:
  - product
  - UX/UI
  - architecture
  - backend
  - frontend
  - QA
---

# Mục đích và hiệu lực

Đây là mốc quyết định sản phẩm đã được chốt để vẽ user flow, thiết kế UX/UI,
viết story và triển khai code DocManS. Code không được tự suy diễn quyền từ
giao diện, chức danh hiển thị hoặc quan hệ ở một bản ghi khác.

`_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`
tiếp tục là contract kỹ thuật cho context, version, fail-closed, delegation,
disclosure và audit. Tài liệu này là nguồn quyết định sản phẩm mới nhất cho
role, scope, workflow và hành vi nghiệp vụ. Khi triển khai, phải đồng bộ cả
hai nguồn và cập nhật `packages/permissions` cùng các test contract.

## Nguyên tắc không thay đổi

1. System role và quan hệ theo bản ghi là hai lớp độc lập.
2. Có system role không tự cấp quyền trên mọi bản ghi.
3. Có quan hệ trên một bản ghi không cấp quyền trên bản ghi khác.
4. Backend là nguồn quyết định cuối; list, search, count, facet, dashboard,
   export, notification và file metadata đều phải lọc theo cùng authorization.
5. Thiếu, cũ hoặc mơ hồ về context thì fail closed.
6. Mọi thay đổi quan trọng phải có actor, thời điểm, đối tượng, hành động,
   lý do khi cần và audit an toàn.
7. Không xóa cứng dữ liệu nghiệp vụ, phiên bản, quan hệ, quyết định hoặc audit.

# 1. System role cấp tài khoản

Mỗi tài khoản chỉ có **một system role đang hoạt động tại một thời điểm**.
`SYSTEM_ADMIN` cấp, thay đổi và thu hồi role; thay đổi có audit. Một user có
system role lãnh đạo hoặc quản lý vẫn có thể đồng thời là PI/thành viên thông
qua quan hệ theo bản ghi.

| System role | Phạm vi mặc định | Quyền/trách nhiệm chính | Giới hạn bắt buộc |
| --- | --- | --- | --- |
| `SYSTEM_ADMIN` | Toàn hệ thống cho dữ liệu nền tảng | Tài khoản, trạng thái tài khoản, system role, đơn vị/scope, danh mục nền tảng, cấu hình kỹ thuật, hỗ trợ truy vết vận hành | Không mặc nhiên xem/sửa dữ liệu nghiệp vụ, không phản biện, không phê duyệt, không mở lại hồ sơ |
| `SCIENTIFIC_MANAGEMENT_STAFF` | **Toàn Học viện**, gồm mọi khoa, phòng ban, bộ môn | Vận hành đợt tiếp nhận, kiểm tra hồ sơ, yêu cầu bổ sung/chỉnh sửa, phân công, tổng hợp đánh giá, quản lý dự án được duyệt, hồ sơ nhà khoa học, nhắc việc và báo cáo nghiệp vụ | Không bỏ qua workflow, xung đột lợi ích hoặc quyết định lãnh đạo; không tự phê duyệt quyết định cuối nếu policy yêu cầu lãnh đạo |
| `LEADERSHIP_APPROVAL_AUTHORITY` | Hồ sơ được trình và phạm vi quyết định được cấp; mặc định phù hợp vai trò lãnh đạo Học viện | Xem hồ sơ đủ điều kiện, xem kết quả đánh giá và xác nhận/phê duyệt/từ chối cuối cùng khi quy trình yêu cầu | Không sửa nội dung hồ sơ, không bỏ qua phản biện/tổng hợp, không tự quyết hồ sơ mình là PI/thành viên/phản biện |
| `RESEARCHER_INTERNAL_USER` | Các bản ghi do chính user tạo hoặc có quan hệ hợp lệ | Tạo bản nháp đề xuất, sửa bản nháp, nộp đề xuất, phản hồi bổ sung, tham gia đề tài và nộp báo cáo theo quan hệ | Không xem bản ghi không liên quan, không tự phân công phản biện/thư ký, không quyết định cuối |
| `EXTERNAL_RESEARCHER_USER` | Chỉ các bản ghi có quan hệ được cấp | Xem, sửa phần đóng góp được phân công trong bản nháp và phản biện đề tài liên quan | Không tạo/nộp đề xuất, không sửa phiên bản đã nộp, không đổi PI/thành viên/kinh phí/mục tiêu/trạng thái, không phân công hoặc quyết định cuối |

`EXTERNAL_RESEARCHER_USER` được tạo/quản lý bởi Quản lý khoa học hoặc Thư ký
khoa học có scope. Tài khoản bị khóa thì mất quyền ngay; quan hệ cũ chỉ còn
lịch sử.

# 2. Quan hệ và assignment theo từng bản ghi

Các role sau **không phải system role** và chỉ có hiệu lực trong đúng aggregate
được ghi trong bảng. Mỗi quan hệ có trạng thái, thời gian hiệu lực, người tạo/
thu hồi và audit; quan hệ inactive/expired/revoked mất quyền ngay.

| Quan hệ | Bản ghi | Quyền cốt lõi | Giới hạn |
| --- | --- | --- | --- |
| PI / `PROPOSAL_PI` | Một đề xuất | Sở hữu bản nháp, sửa/nộp, phản hồi bổ sung, yêu cầu rút/chỉnh sửa | Không phản biện, không tự phê duyệt, không sửa phiên bản đã khóa |
| Co-investigator/member / `PROPOSAL_CO_INVESTIGATOR`, `PROPOSAL_MEMBER` | Một đề xuất | Xem phần được phép, đóng góp theo phân công | Không là người chịu trách nhiệm nộp; không tự đổi thành viên/quyền |
| Thư ký đề xuất / `PROPOSAL_SCIENTIFIC_SECRETARY` | Một đề xuất | Thao tác hành chính được cấp, xử lý yêu cầu chỉnh sửa sau nộp nếu được giao | Không phản biện chấm điểm, không quyết định cuối |
| PI/member / `PROJECT_PI`, `PROJECT_CO_INVESTIGATOR`, `PROJECT_MEMBER` | Một đề tài đã duyệt | Xem và thực hiện công việc/báo cáo theo phân công | Không truy cập đề tài ngoài quan hệ; không tự thay đổi quyền |
| Thư ký đề tài / `PROJECT_SCIENTIFIC_SECRETARY` | Một đề tài | Theo dõi, hồ sơ, biên bản, tác vụ và hành động hành chính được cấp | Không phê duyệt cuối nếu không có authority riêng |
| Phản biện / `REVIEWER_ASSIGNMENT` | Một assignment/vòng đánh giá | Xem đúng gói được giao, nhập và gửi điểm/nhận xét | Không xem hồ sơ chưa được giao, không sửa bài của phản biện khác, không quyết định cuối |
| Hội đồng / `COUNCIL_MEMBER` | Một hội đồng/hồ sơ được giao | Tham gia đánh giá trong phạm vi hội đồng | Không truy cập council/hồ sơ ngoài assignment |
| Thư ký hội đồng / `COUNCIL_SCIENTIFIC_SECRETARY` | Một hội đồng | Hành chính hội đồng, tài liệu và tổng hợp được cấp | Không tự chấm/ra quyết định nếu không có assignment/authority riêng |
| Phản biện đạo đức / `ETHICS_REVIEWER_ASSIGNMENT` | Một hồ sơ đạo đức/assignment | Đánh giá đúng assignment | Không truy cập assignment khác |
| Người được giao việc / `TASK_ASSIGNEE` | Một task gắn bản ghi | Cập nhật task và evidence được giao | Quyền task không vượt quyền trên bản ghi liên kết |

Các quan hệ cộng dồn quyền được phép, nhưng mọi điều kiện từ system role,
scope, trạng thái, delegation và conflict đều phải đạt. Không có khái niệm
“quan hệ cao nhất” để thay thế hoặc làm mất quan hệ khác.

# 3. Quy tắc scope, xung đột và ủy quyền

- `SCIENTIFIC_MANAGEMENT_STAFF` có quyền quản lý nghiệp vụ trên toàn bộ khoa,
  phòng ban và bộ môn thuộc Học viện.
- Thư ký khoa học chỉ thao tác hồ sơ nhà khoa học trong đơn vị có scope và
  đợt/bản ghi được phân công. Thư ký được cấp quyền hồ sơ nhà khoa học không
  biến thành system role mới.
- Đợt tiếp nhận có phạm vi `Toàn Học viện` hoặc `Chọn đơn vị`. Đợt mặc định là
  `Toàn Học viện`; khi chọn đơn vị, chỉ các đơn vị được chọn được nộp.
- Mọi đơn vị được phép tạo/nộp đề xuất trong đợt áp dụng; PI chọn đơn vị quản
  lý chính phù hợp với scope của mình.
- Một bản ghi có đúng một đơn vị quản lý chính. Đơn vị phối hợp, nơi công tác
  hoặc liên kết ngoài không tự mở quyền; chia sẻ xuyên đơn vị phải cấp tường
  minh theo bản ghi.
- Không tự động kế thừa scope cha/con. Nếu scope `Học viện` bao phủ đơn vị con,
  đó là scope được cấp rõ ràng.
- Không cho người dùng tự cấp quyền cho mình. Người phân công phải có quyền
  quản lý trong phạm vi bản ghi và phải kiểm tra xung đột lợi ích.
- PI/thành viên không được phản biện, nghiệm thu hoặc quyết định chính hồ sơ
  của mình. Người phản biện không được quyết định cuối cùng cùng hồ sơ/vòng.
- Ủy quyền chỉ theo một bản ghi, có người ủy quyền/nhận, action, thời hạn, lý
  do, trạng thái, phê duyệt và thu hồi. Chỉ hành động nộp đề xuất được phép
  ủy quyền; không ủy quyền phân công, chấm điểm, tiết lộ danh tính phản biện,
  đổi thành viên, phê duyệt/từ chối, mở lại hoặc ủy quyền tiếp.
- Người nhận chỉ dùng quyền sau khi được Quản lý khoa học có scope phê duyệt;
  người phê duyệt khác người ủy quyền/nhận.
- Tài khoản inactive/locked mất quyền ngay; quan hệ và lịch sử cũ không bị xóa.

# 4. Ma trận quyền theo bản ghi và nghiệp vụ

## 4.1. Hồ sơ nhà khoa học

| Hành động | Quyền |
| --- | --- |
| Tạo/cập nhật/kích hoạt/ngừng hoạt động | `SCIENTIFIC_MANAGEMENT_STAFF` toàn Học viện; Thư ký khoa học có scope đơn vị và assignment chức năng phù hợp |
| Xác minh/gộp hồ sơ trùng | Quản lý hoặc Thư ký có scope cảnh báo/xác minh; chỉ Quản lý khoa học phê duyệt gộp |
| Liên kết tài khoản | Quản lý/Thư ký có scope; một hồ sơ chỉ một account active tại một thời điểm và một account không liên kết nhiều hồ sơ |
| Xem dữ liệu định danh/liên hệ | Chỉ người có scope quản lý hoặc quan hệ nghiệp vụ cần thiết; danh sách/search/notification dùng dữ liệu tối thiểu |
| Tham gia đề tài/phản biện | Chỉ qua quan hệ/assignment riêng trên từng bản ghi |

Hồ sơ có thể tồn tại trước tài khoản. Hồ sơ `INACTIVE` không được chọn cho
assignment mới nhưng lịch sử quan hệ cũ vẫn giữ.

## 4.2. Đợt tiếp nhận

| Hành động | Quyền |
| --- | --- |
| Tạo, sửa, mở, đóng đợt | Quản lý khoa học toàn Học viện; Thư ký khoa học được phân công cho đợt |
| Chọn phạm vi | `Toàn Học viện` hoặc `Chọn đơn vị`; mặc định toàn Học viện |
| Quá hạn | Chỉ đánh dấu quá hạn và nhắc; không tự từ chối/đóng/chuyển trạng thái |
| Sau khi đóng | Chặn đề xuất mới; hồ sơ đã nộp tiếp tục xử lý |

## 4.3. Đề xuất nghiên cứu

| Hành động | Quyền |
| --- | --- |
| Tạo bản nháp | PI là `RESEARCHER_INTERNAL_USER` có scope đơn vị; external không được |
| Sửa bản nháp | PI; external/member chỉ sửa phần đóng góp được phân công trong bản nháp |
| Thêm thành viên | PI đề xuất; thay đổi quan hệ phải qua kiểm tra và quyền quản lý |
| Nộp chính thức | PI chịu trách nhiệm duy nhất về nội dung cuối và việc nộp; delegation `proposal.submit` chỉ có hiệu lực khi được phê duyệt theo contract |
| Kiểm tra đầy đủ/yêu cầu bổ sung | Quản lý khoa học hoặc Thư ký được giao; yêu cầu phải nêu lý do và hạn |
| Phản hồi và nộp lại | PI; người được ủy quyền chỉ khi delegation hợp lệ |
| Phân công/thay đổi phản biện, hội đồng | Quản lý khoa học, có conflict check |
| Chấm điểm/nhận xét | Chỉ reviewer được assignment; gửi xong thì khóa; sửa lỗi bằng phiên bản nhận xét mới được duyệt |
| Tổng hợp đánh giá | Quản lý khoa học |
| Phê duyệt/từ chối cuối | `LEADERSHIP_APPROVAL_AUTHORITY` khi hồ sơ ở trạng thái đủ điều kiện |
| Rút hồ sơ | PI chỉ rút khi còn nháp; sau nộp gửi yêu cầu, Quản lý/Thư ký được giao phê duyệt và chuyển `Đã rút` |
| Chỉnh sửa sau nộp | PI gửi yêu cầu; Quản lý hoặc Thư ký đề xuất được giao phê duyệt; hệ thống tạo bản làm việc mới, giữ bản đã khóa |
| Mở lại | Chỉ Quản lý khoa học; bắt buộc lý do và audit |

Mọi phiên bản đã nộp, review, quyết định và tệp dùng để thẩm định được giữ
nguyên. Không ghi đè bản cũ.

### Chỉnh sửa sau nộp

1. PI gửi `Yêu cầu chỉnh sửa sau nộp`.
2. Quản lý khoa học có scope hoặc Thư ký khoa học được phân công phê duyệt.
3. Hệ thống tạo revision mới từ bản khóa; PI sửa trong revision.
4. PI duyệt nội dung cuối và nộp lại; bản cũ vẫn là chứng cứ.
5. Lỗi câu chữ/định dạng dùng flow này; thay đổi mục tiêu, kinh phí, nhân sự,
   thời hạn hoặc kết quả dùng `Yêu cầu điều chỉnh` chính thức.

### Ẩn danh phản biện

Mỗi đợt chọn `Không ẩn danh`, `Ẩn danh một chiều` hoặc `Ẩn danh hai chiều`; mặc
định là **ẩn danh một chiều**. Chỉ Quản lý khoa học và Thư ký được phân công
xem danh tính để vận hành. PI/thành viên không xem identity, điểm thô hoặc
nhận xét nội bộ trước khi chính sách công bố cho phép.

## 4.4. Đề tài đã được duyệt

| Hành động | Quyền |
| --- | --- |
| Tạo đề tài từ đề xuất | Quản lý khoa học chủ động tạo và xác nhận; không tự động sinh record |
| Sao chép PI/thành viên | Sao chép thành quan hệ mới của đề tài; thay đổi sau đó không sửa ngược đề xuất |
| Quản lý mốc, báo cáo, evidence, task | Quản lý khoa học và participant/assignee đúng scope |
| Yêu cầu điều chỉnh/gia hạn | PI tạo/gửi; Quản lý thẩm định; Lãnh đạo xác nhận khi thuộc thẩm quyền |
| Nộp kết quả cuối | PI hoặc delegation hợp lệ; sau nộp khóa phiên bản |
| Nghiệm thu | Quản lý phân công hội đồng/phản biện; Quản lý tổng hợp; Lãnh đạo xác nhận khi yêu cầu |
| Mở lại | Chỉ Quản lý khoa học; lý do + audit |

Trạng thái: `Chuẩn bị triển khai → Đang thực hiện → Tạm dừng → Chờ nghiệm thu
→ Đã nghiệm thu | Không đạt → Đóng/lưu trữ`.

## 4.5. Tệp, thông báo, dashboard và audit

- Tệp luôn gắn bản ghi và kiểm tra quyền ở **mọi lần** xem/tải/tải lên/thay
  thế. Thay tệp tạo version mới; không ghi đè tệp đã dùng thẩm định/nghiệm
  thu.
- Thông báo gửi khi được giao role, đổi trạng thái, yêu cầu bổ sung/chỉnh
  sửa, nhận xét cần xử lý, sắp hết hạn hoặc có quyết định. Thông báo không
  cấp quyền và không chứa dữ liệu nhạy cảm.
- Danh sách mặc định chỉ gồm Quản lý khoa học có phạm vi phù hợp và người có
  quan hệ trực tiếp. Nhà nghiên cứu cùng đơn vị nhưng không tham gia không
  thấy hồ sơ.
- Dữ liệu hiển thị theo ba lớp: tóm tắt nội bộ theo scope; nội dung/tệp/lịch
  sử cần thiết cho người có quan hệ; dữ liệu nhạy cảm/audit chỉ người được
  cấp đặc biệt. Search/count/facet/export dùng cùng filter.
- Audit bất biến cho create/update/soft-delete, chuyển trạng thái, phân công,
  delegation, truy cập/tải tệp nhạy cảm, quyết định, chỉnh sửa sau nộp,
  mở lại, rút hồ sơ, liên kết hồ sơ và thay đổi tài khoản/role/scope.

# 5. State machine cốt lõi

## Đề xuất

```text
Nháp
  → Đã nộp
  → Đang thẩm định
  → Yêu cầu bổ sung
  → Đã nộp lại / Đang đánh giá
  → Chờ quyết định
  → Đã phê duyệt | Không phê duyệt
  → Đóng/lưu trữ
```

Quá hạn chỉ là cờ theo dõi và nhắc việc. Ngoại lệ dùng `Yêu cầu bổ sung`,
`Yêu cầu chỉnh sửa`, `Yêu cầu rút`, hoặc `Mở lại`; không có nút bypass trạng
thái chung.

## Đề tài

```text
Chuẩn bị triển khai → Đang thực hiện → Tạm dừng → Chờ nghiệm thu
→ Đã nghiệm thu | Không đạt → Đóng/lưu trữ
```

## Hồ sơ nhà khoa học và tài khoản

```text
ResearcherProfile: ACTIVE ↔ INACTIVE
Account: ACTIVE ↔ LOCKED/INACTIVE
```

Account bị khóa không xóa profile hoặc lịch sử quan hệ. Profile inactive không
được nhận assignment mới.

# 6. Chuỗi nghiệp vụ chuẩn để vẽ user flow

```text
Mở đợt tiếp nhận
  → PI tạo bản nháp
  → PI sửa và nộp
  → Quản lý/Thư ký kiểm tra
  → (bổ sung/chỉnh sửa sau nộp nếu cần)
  → Phân công phản biện/hội đồng
  → Phản biện chấm và gửi
  → Quản lý tổng hợp
  → Lãnh đạo phê duyệt/từ chối
  → Quản lý tạo đề tài và xác nhận PI/thành viên
  → Theo dõi mốc, báo cáo, điều chỉnh/gia hạn
  → Nộp kết quả
  → Nghiệm thu
  → Đóng/lưu trữ
```

Các luồng phụ bắt buộc: tạo/quản lý hồ sơ nhà khoa học; liên kết tài khoản;
tạo user external; phân công/thu hồi; delegation; rút hồ sơ; quá hạn; xung
đột lợi ích; khóa tài khoản; xem/tải tệp; thông báo; audit.

# 7. Quy tắc thay đổi baseline

Mọi thay đổi role, scope, relationship, workflow state, decision authority,
disclosure, versioning hoặc retention phải:

1. cập nhật tài liệu này và `docs/permission-matrix.md` trong cùng change set;
2. cập nhật contract/fixture trong `packages/permissions` nếu chạm authorization;
3. bổ sung acceptance tests cho đường cho phép và đường bị từ chối;
4. ghi rõ migration/compatibility impact trước khi code.

