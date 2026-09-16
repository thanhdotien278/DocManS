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
| `EXTERNAL_RESEARCHER_USER` | Chỉ các bản ghi có quan hệ được cấp | Xem bản ghi liên quan, phản biện được giao hoặc đóng góp đề tài/task theo assignment | Không tạo/sửa/nộp đề xuất, không đổi PI/team/kinh phí/mục tiêu/trạng thái, không phân công hoặc quyết định cuối |

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
| Nhóm đề xuất / `TOPIC_SECRETARY`, `TOPIC_MEMBER` | Một đề xuất | Xem hồ sơ; thư ký nội bộ được upload tệp đề xuất khi trạng thái cho phép | Không là PI, không tạo/sửa/nộp/nộp lại, không tự đổi thành viên/quyền |
| PI đề tài / `TOPIC_PI` | Một đề tài đã duyệt | Sở hữu và thực hiện công việc/báo cáo theo phân công | Không truy cập đề tài ngoài quan hệ; không tự thay đổi quyền |
| Nhóm đề tài / `TOPIC_SECRETARY`, `TOPIC_MEMBER` | Một đề tài đã duyệt | Theo dõi, hồ sơ, biên bản, tác vụ và hành động được cấp | Không phê duyệt cuối nếu không có authority riêng |
| Phản biện / `REVIEWER_ASSIGNMENT` | Một assignment/vòng đánh giá | Xem đúng gói được giao, nhập và gửi điểm/nhận xét | Không xem hồ sơ chưa được giao, không sửa bài của phản biện khác, không quyết định cuối |
| Hội đồng / `COUNCIL_MEMBER` | Một hội đồng/hồ sơ được giao | Tham gia đánh giá trong phạm vi hội đồng | Không truy cập council/hồ sơ ngoài assignment |
| Thư ký hội đồng / `COUNCIL_SCIENTIFIC_SECRETARY` | Một hội đồng | Hành chính hội đồng, tài liệu và tổng hợp được cấp | Không tự chấm/ra quyết định nếu không có assignment/authority riêng |
| Phản biện đạo đức / `ETHICS_REVIEWER_ASSIGNMENT` | Một hồ sơ đạo đức/assignment | Đánh giá đúng assignment | Không truy cập assignment khác |
| Người được giao việc / `TASK_ASSIGNEE` | Một task gắn bản ghi | Cập nhật task và evidence được giao | Quyền task không vượt quyền trên bản ghi liên kết |

Các quan hệ cộng dồn quyền được phép, nhưng mọi điều kiện từ system role,
scope, trạng thái, context và conflict đều phải đạt. Không có khái niệm
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
- PI/team member không được phản biện, nghiệm thu hoặc quyết định chính hồ sơ
  của mình. Người phản biện không được quyết định cuối cùng cùng hồ sơ/vòng.
- Proposal create, submit và resubmit là hành động riêng của PI nội bộ hiện
  tại; không có đường ủy quyền, delegate input hoặc capability mở rộng cho
  các hành động này. Những delegation contract khác (nếu domain tương lai cho
  phép) vẫn phải nêu rõ action, record, thời hạn, phê duyệt và thu hồi.
- Tài khoản inactive/locked mất quyền ngay; quan hệ và lịch sử cũ không bị xóa.

# 4. Ma trận quyền theo bản ghi và nghiệp vụ

## 4.1. Hồ sơ nhà khoa học

| Hành động | Quyền |
| --- | --- |
| Tạo/cập nhật/kích hoạt/ngừng hoạt động | `SYSTEM_ADMIN` và `SCIENTIFIC_MANAGEMENT_STAFF` trong scope tổ chức được cấp rõ ràng |
| Xác minh/gộp hồ sơ trùng | Quản lý hoặc Thư ký có scope cảnh báo/xác minh; chỉ Quản lý khoa học phê duyệt gộp |
| Liên kết tài khoản | `SYSTEM_ADMIN` và `SCIENTIFIC_MANAGEMENT_STAFF` có scope; một hồ sơ chỉ một liên kết account hiện hành, kể cả khi inactive và một account không liên kết nhiều hồ sơ |
| Xem dữ liệu định danh/liên hệ | Chỉ người có scope quản lý hoặc quan hệ nghiệp vụ cần thiết; danh sách/search/notification dùng dữ liệu tối thiểu |
| Tham gia đề tài/phản biện | Chỉ qua quan hệ/assignment riêng trên từng bản ghi |

Hồ sơ có thể tồn tại trước tài khoản. Hồ sơ `INACTIVE` không được chọn cho
assignment mới nhưng lịch sử quan hệ cũ vẫn giữ.

## 4.2. Đợt tiếp nhận

| Hành động | Quyền |
| --- | --- |
| Tạo, sửa, mở, đóng đợt | Quản lý khoa học toàn Học viện |
| Chọn phạm vi | `Toàn Học viện` hoặc `Chọn đơn vị`; mặc định toàn Học viện |
| Quá hạn | Chỉ đánh dấu quá hạn và nhắc; không tự từ chối/đóng/chuyển trạng thái |
| Sau khi đóng | Chặn đề xuất mới; hồ sơ đã nộp tiếp tục xử lý |

## 4.3. Đề xuất nghiên cứu

| Hành động | Quyền |
| --- | --- |
| Tạo bản nháp | PI là `RESEARCHER_INTERNAL_USER` có scope đơn vị; external không được |
| Sửa bản nháp | Chỉ PI nội bộ hiện tại |
| Thêm thành viên | PI đề xuất; thay đổi quan hệ phải qua kiểm tra và quyền quản lý |
| Nộp chính thức | Chỉ PI hiện tại có system role `RESEARCHER_INTERNAL_USER`; không ủy quyền; section nộp không hiển thị cho staff hoặc người không phải PI |
| Kiểm tra đầy đủ/yêu cầu bổ sung | Quản lý khoa học; mỗi phiên bản nộp/nộp lại chỉ được xác nhận đầy đủ một lần; yêu cầu bổ sung phải nêu lý do và hạn theo ngày |
| Phản hồi và nộp lại | Chỉ PI hiện tại có system role `RESEARCHER_INTERNAL_USER`; không delegation |
| Phân công/thay đổi phản biện, hội đồng | Quản lý khoa học, có conflict check |
| Chấm điểm/nhận xét | Chỉ reviewer được assignment; gửi xong thì khóa; sửa lỗi bằng phiên bản nhận xét mới được duyệt |
| Tổng hợp đánh giá | Quản lý khoa học |
| Trình phê duyệt | Quản lý khoa học khi vòng đánh giá hoàn tất và hồ sơ ở trạng thái cho phép; chỉ gửi hồ sơ tới lãnh đạo, không phải quyết định cuối |
| Phê duyệt/từ chối cuối | `LEADERSHIP_APPROVAL_AUTHORITY` khi hồ sơ ở trạng thái đủ điều kiện |
| Rút hồ sơ | PI chỉ rút khi còn nháp; sau nộp gửi yêu cầu, Quản lý khoa học phê duyệt và chuyển `Đã rút` |
| Chỉnh sửa sau nộp | PI gửi yêu cầu; Quản lý khoa học phê duyệt; hệ thống tạo bản làm việc mới, giữ bản đã khóa |
| Mở lại | Chỉ Quản lý khoa học; bắt buộc lý do và audit |

Mọi phiên bản đã nộp, review, quyết định và tệp dùng để thẩm định được giữ
nguyên. Không ghi đè bản cũ.


### Reviewer / Council Assignment from Scientist Profiles

Scientist Profiles are the existing `ResearcherProfile` records, not a new identity model.
Scientific Management Staff may assign or revoke `reviewer` or `committee_member`
duties on one eligible proposal in their explicitly granted organization scope.
The council-member duty is a proposal review assignment; it does not create a
council aggregate or account-level role.

Candidate selection starts from an `ACTIVE` profile in the staff member's scope.
For this authenticated review workflow the profile must already link to an active
internal or external researcher account with explicit scope on the proposal's
host unit. Unlinked profiles remain ineligible until an authorized account link
exists; assignment must not create or change profile/account links. The server derives
the assignee from the selected profile, never from an independent account picker.

Assignment is allowed in `submitted`, `resubmitted`, or `under_review`; the first
assignment requires completeness evidence for the current submission and opens
`under_review`. Revocation uses the same state boundary and requires a reason.
PI, active team secretary/member, self-assignment, unresolved conflict context,
inactive profile/account, missing scope, and duplicate non-revoked assignment
are denied. Both duty types use identical checks. The backend rechecks current
profile/account, role, scope, participation, workflow and proposal context version
in the mutation transaction; candidate search is advisory and grants no authority.

Each new assignment retains the source profile ID and linked account ID. Existing
assignments retain their history without guessing a historical profile link.
Assignment and revocation append actor/time/target/profile/account/role evidence
to audit atomically with the mutation. Revocation preserves the row and submitted
reviews, immediately removes its access grant, and permits a later new assignment
only through the same checks. Profile deactivation prevents new assignments;
this feature does not rewrite historical assignments or submitted evidence.
Existing identity/disclosure policy applies to both duty types on every surface.
Candidate conflict-rejected assignment attempts retain a failure audit without creating an
assignment or changing workflow state. The rejection must not roll back its own
audit evidence. Successful assignment/revocation and their audit remain atomic.

### Hiển thị workflow theo bản ghi

`Phiếu đánh giá của tôi`, `Phân công đánh giá` và `Hồ sơ trình phê duyệt` không
phải là nội dung toàn cục của trang hồ sơ nhà khoa học. Chúng chỉ được dựng
trong chi tiết proposal có context tương ứng. `Phiếu đánh giá của tôi` cần
assignment reviewer/council đang còn hiệu lực trên đúng proposal và vòng đánh
giá; role researcher, council hoặc assignment ở proposal khác không thay thế
điều kiện này. `Phân công đánh giá` cần capability của
`SCIENTIFIC_MANAGEMENT_STAFF` trên proposal và state cho phép. `Trình phê
duyệt` là action staff để chuyển hồ sơ hoàn tất sang lãnh đạo; action cuối
`Phê duyệt`/`Từ chối` chỉ thuộc `LEADERSHIP_APPROVAL_AUTHORITY`.

Backend capability là nguồn sự thật: action không được cấp (`ACTION_NOT_GRANTED`)
thì bỏ toàn bộ section; action bị chặn bởi conflict hoặc workflow state vẫn có
thể hiện dưới dạng disabled kèm lý do. Thiếu proposal/assignment context phải
fail closed. `SYSTEM_ADMIN` không được suy diễn quyền review hoặc approval.

### Chỉnh sửa sau nộp

1. PI gửi `Yêu cầu chỉnh sửa sau nộp`.
2. Quản lý khoa học có scope phê duyệt.
3. Hệ thống tạo revision mới từ bản khóa; PI sửa trong revision.
4. PI duyệt nội dung cuối và nộp lại; bản cũ vẫn là chứng cứ.
5. Lỗi câu chữ/định dạng dùng flow này; thay đổi mục tiêu, kinh phí, nhân sự,
   thời hạn hoặc kết quả dùng `Yêu cầu điều chỉnh` chính thức.

### Ẩn danh phản biện

Mỗi đợt chọn `Không ẩn danh`, `Ẩn danh một chiều` hoặc `Ẩn danh hai chiều`; mặc
định là **ẩn danh một chiều**. Chỉ Quản lý khoa học
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
  → Quản lý khoa học kiểm tra
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


## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](contracts/researcher-profile-access.md) is the current
source of truth for this feature, including API/data fields, authorization,
credential delivery, migration compatibility and history retention.

- Scoped SYSTEM_ADMIN and SCIENTIFIC_MANAGEMENT_STAFF manage internal/external
  profiles independently of Accounts, including academic/contact information,
  position, military rank, expertise, publications and self-reported project
  history (title, role, Academy/institutional/Ministry/other level, dates, status,
  notes). Profile activation and account activation remain separate actions.
- Account provisioning creates linked `PENDING_ACTIVATION` researcher accounts:
  INTERNAL profiles provision by default with required email; EXTERNAL profiles
  provision only when staff/admin checks `Tạo tài khoản truy cập hệ thống`.
- Activation uses hashed single-use tokens, expires exactly after 48 hours and
  sends only a setup-password link. No temporary password is generated, emailed,
  persisted, returned to staff or placed in audit.
- Login accepts either configured username or account email. Username is optional
  at provisioning, unique when set later by the linked researcher in My Profile,
  and never inferred from email.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields and own username are editable; type, status, linkage, email credential
  destination and role/scope remain administrative.
- Profile/link/account/activation/username/account-status audit is preserved with
  safe transactional change facts.
