# User Flow — Vai trò và nghiệp vụ cốt lõi

> Baseline: [`authorization-core-business-baseline.md`](./authorization-core-business-baseline.md)
> Ma trận quyền: [`permission-matrix.md`](./permission-matrix.md)

Khi có khác biệt, baseline là quyết định sản phẩm mới nhất; permission matrix
là ma trận chi tiết để triển khai và kiểm thử.

Tài liệu này mô tả luồng người dùng đã chốt ở mức nghiệp vụ. Mọi nhánh đều
phải đi qua kiểm tra authorization ở backend; quyền hiển thị trên UI không thay
thế kiểm tra đó.

## Diagram index

- [Overview](./diagrams/overview.md)
- [Authentication](./diagrams/authentication.md)
- [Document creation](./diagrams/document-creation.md)
- [Document viewing](./diagrams/document-viewing.md)
- [Document editing](./diagrams/document-editing.md)
- [Approval](./diagrams/approval.md)
- [Authorization](./diagrams/authorization.md)
- [Search and filtering](./diagrams/search.md)
- [Document lifecycle](./diagrams/document-lifecycle.md)
- [Version management](./diagrams/version-management.md)
- [Notifications](./diagrams/notifications.md)
- [Audit log](./diagrams/audit-log.md)

## 1. Mô hình vai trò

Mỗi tài khoản chỉ có một `system role` đang hoạt động. PI, thành viên, thư ký,
phản biện, hội đồng và người được giao việc là quan hệ/assignment theo đúng
bản ghi, không phải quyền toàn hệ thống.

```mermaid
flowchart LR
  account["Tài khoản<br/>1 system role active"] --> admin["SYSTEM_ADMIN<br/>Nền tảng, tài khoản, scope"]
  account --> staff["SCIENTIFIC_MANAGEMENT_STAFF<br/>Vận hành nghiệp vụ"]
  account --> leader["LEADERSHIP_APPROVAL_AUTHORITY<br/>Quyết định trong thẩm quyền"]
  account --> internal["RESEARCHER_INTERNAL_USER<br/>Bản ghi của mình / quan hệ hợp lệ"]
  account --> external["EXTERNAL_RESEARCHER_USER<br/>Chỉ bản ghi được cấp"]

  record["Một proposal / project / review / task"] --> pi["PI / member / co-investigator"]
  record --> secretary["Scientific secretary"]
  record --> reviewer["Reviewer / council member"]
  record --> assignee["Task assignee / collaborator"]

  account -. "quyền account" .-> record
  account -. "được gắn quan hệ cụ thể" .-> pi
  account -. "được gắn assignment cụ thể" .-> reviewer
  account -. "được gắn assignment cụ thể" .-> assignee
```

## 2. Cổng kiểm tra chung cho mọi hành động

List, search, count, facet, dashboard, export, notification và file metadata
cũng đi qua cùng cổng này; thiếu hoặc mơ hồ context thì từ chối an toàn.

```mermaid
flowchart TD
  start([Người dùng yêu cầu hành động]) --> resolve["Backend resolve context hiện tại"]
  resolve --> role["System role + trạng thái tài khoản"]
  role --> scope["Organization / unit / record scope"]
  scope --> relation["Participation / assignment / delegation"]
  relation --> state["Workflow state + action hợp lệ"]
  state --> conflict{"Có xung đột lợi ích?"}
  conflict -- "Có" --> deny["Từ chối + nêu lý do nếu phù hợp"]
  conflict -- "Không" --> allow["Cho phép hành động"]
  resolve -. "Thiếu, cũ hoặc mơ hồ" .-> deny
  allow --> audit["Audit bất biến nếu là hành động cần ghi nhận"]
  allow -. "Áp dụng cả list/search/count/facet/dashboard/export/file" .-> filtered["Kết quả đã lọc theo quyền"]
  deny --> end([Kết thúc])
  audit --> end
  filtered --> end
```

## 3. Luồng chính: đề xuất đến đề tài

```mermaid
flowchart LR
  subgraph staff["Quản lý khoa học / Thư ký được giao"]
    open["Tạo và mở đợt tiếp nhận"]
    check["Kiểm tra đầy đủ / thủ tục"]
    assign["Phân công phản biện / hội đồng<br/>+ conflict check"]
    consolidate["Tổng hợp đánh giá"]
    create_project["Chủ động tạo đề tài<br/>từ đề xuất đã duyệt"]
  end

  subgraph pi_lane["PI / Nhà nghiên cứu nội bộ"]
    draft["Tạo bản nháp"]
    edit["Sửa bản nháp + tệp"]
    submit["Nộp chính thức"]
    supplement["Bổ sung / chỉnh sửa theo yêu cầu"]
    resubmit["Duyệt nội dung cuối và nộp lại"]
  end

  subgraph review_lane["Phản biện / Hội đồng được phân công"]
    review["Xem đúng gói được giao"]
    score["Chấm / nhận xét / khuyến nghị"]
  end

  subgraph leader_lane["Lãnh đạo / Approval authority"]
    decide{"Phê duyệt hoặc<br/>không phê duyệt?"}
  end

  open --> draft --> edit --> submit --> check
  check --> complete{"Hồ sơ đủ điều kiện?"}
  complete -- "Chưa đủ" --> request["Yêu cầu bổ sung<br/>nêu lý do + hạn"] --> supplement --> resubmit --> check
  complete -- "Đủ" --> assign --> review --> score --> consolidate --> ready["Chờ quyết định"] --> decide
  decide -- "Không phê duyệt" --> rejected["Không phê duyệt<br/>giữ lịch sử"] --> proposal_archive["Đóng / lưu trữ"]
  decide -- "Phê duyệt" --> approved["Đã phê duyệt"] --> create_project --> project["Đề tài được tạo<br/>PI/thành viên là quan hệ mới"]
```

Quy tắc cố định trong flow:

- Đợt đóng chặn hồ sơ mới nhưng không dừng hồ sơ đã nộp.
- PI là người chịu trách nhiệm nội dung và nộp; chỉ delegation `proposal.submit`
  hợp lệ mới cho phép người nhận nộp thay.
- Reviewer chỉ thấy proposal/assignment được giao; gửi review xong thì review
  bị khóa, sửa lỗi bằng phiên bản nhận xét mới.
- Lãnh đạo chỉ quyết định ở trạng thái `Chờ quyết định`/`ready_for_approval`;
  không sửa nội dung và không tự quyết bản ghi có xung đột.
- Phê duyệt không tự động sinh project; Quản lý khoa học phải tạo và xác nhận.

## 4. Luồng đề tài đã được duyệt

```mermaid
flowchart TD
  approved["Đề xuất đã phê duyệt"] --> prepare["Quản lý tạo đề tài<br/>copy PI/thành viên thành quan hệ mới"]
  prepare --> active["Chuẩn bị triển khai → Đang thực hiện"]
  active --> work["Mốc / task / evidence / báo cáo<br/>theo participant hoặc assignee scope"]
  work --> report["PI hoặc người được phép<br/>nộp báo cáo / kết quả"]
  report --> staff_review["Quản lý thẩm định và theo dõi"]
  staff_review --> delayed{"Quá hạn hoặc<br/>cần điều chỉnh?"}
  delayed -- "Quá hạn" --> reminder["Đánh dấu + nhắc việc / escalation"] --> work
  delayed -- "Điều chỉnh / gia hạn" --> request["PI gửi yêu cầu"] --> review_request["Quản lý thẩm định"]
  review_request --> authority{"Cần lãnh đạo<br/>xác nhận?"}
  authority -- "Có" --> leader_decision["Lãnh đạo phê duyệt / từ chối"] --> work
  authority -- "Không" --> work
  delayed -- "Không" --> final["Nộp kết quả cuối<br/>khóa phiên bản"]
  active -. "Tạm dừng / tiếp tục theo action hợp lệ" .-> paused["Tạm dừng"]
  paused -. "Tiếp tục" .-> active
  final --> acceptance["Quản lý phân công hội đồng / phản biện"]
  acceptance --> acceptance_review["Đánh giá nghiệm thu được giao"]
  acceptance_review --> acceptance_summary["Quản lý tổng hợp"]
  acceptance_summary --> accept_decision{"Lãnh đạo xác nhận<br/>khi thuộc thẩm quyền"}
  accept_decision -- "Đạt" --> accepted["Đã nghiệm thu"] --> archive["Đóng / lưu trữ"]
  accept_decision -- "Không đạt" --> not_achieved["Không đạt"] --> archive
```

## 5. Luồng ngoại lệ và kiểm soát nghiệp vụ

### 5.1. Chỉnh sửa sau khi đã nộp

```mermaid
flowchart LR
  pi_req["PI gửi yêu cầu chỉnh sửa sau nộp"] --> staff_approval["Quản lý có scope hoặc<br/>Thư ký đề xuất được giao phê duyệt"]
  staff_approval --> approved_edit{"Được phê duyệt?"}
  approved_edit -- "Không" --> keep["Giữ bản đã khóa"]
  approved_edit -- "Có" --> revision["Hệ thống tạo revision mới<br/>từ bản khóa"]
  revision --> pi_edit["PI sửa trong revision"]
  pi_edit --> pi_submit["PI duyệt nội dung cuối và nộp lại"]
  pi_submit --> review_again["Quay lại luồng kiểm tra / đánh giá"]
  revision -. "Bản cũ không bị ghi đè" .-> immutable["Giữ nguyên chứng cứ, tệp,<br/>review và lịch sử"]
  substantive["Đổi mục tiêu / kinh phí / nhân sự /<br/>thời hạn / kết quả"] -. "Không dùng flow này" .-> formal["Yêu cầu điều chỉnh chính thức"]
```

### 5.2. Rút hồ sơ và ủy quyền nộp

```mermaid
flowchart TD
  withdraw_start["PI muốn rút hồ sơ"] --> draft_state{"Còn ở Nháp?"}
  draft_state -- "Có" --> withdraw_now["PI rút theo action của Nháp"]
  draft_state -- "Không" --> withdraw_request["PI gửi Yêu cầu rút"]
  withdraw_request --> withdraw_review["Quản lý / Thư ký được giao xem xét"]
  withdraw_review --> withdraw_decision{"Phê duyệt?"}
  withdraw_decision -- "Có" --> withdrawn["Đã rút + audit"]
  withdraw_decision -- "Không" --> continue["Tiếp tục workflow"]

  delegate_start["PI tạo delegation<br/>proposal.submit cho một bản ghi"] --> staff_approve["Quản lý khoa học có scope phê duyệt"]
  staff_approve --> delegate_valid{"Đủ action, thời hạn,<br/>lý do và không xung đột?"}
  delegate_valid -- "Không" --> delegate_denied["Từ chối / fail closed"]
  delegate_valid -- "Có" --> delegate_active["Người nhận được nộp thay<br/>trong thời hạn"]
  delegate_active --> delegate_end["Hết hạn hoặc thu hồi → mất quyền"]
```

Chỉ `proposal.submit` được ủy quyền. Không ủy quyền phân công, chấm điểm,
tiết lộ danh tính phản biện, đổi thành viên, phê duyệt/từ chối, mở lại hoặc
ủy quyền tiếp.

### 5.3. Hồ sơ nhà khoa học, tài khoản và assignment

```mermaid
flowchart LR
  subgraph profile_staff["Quản lý / Thư ký có scope"]
    create_profile["Tạo / cập nhật hồ sơ nhà khoa học"]
    verify["Xác minh cảnh báo trùng"]
    link["Liên kết một account active"]
    external_user["Tạo / quản lý external researcher"]
    assignment["Tạo / thu hồi quan hệ hoặc assignment"]
  end

  subgraph admin_lane["System admin"]
    account_admin["Tạo / khóa account<br/>gán system role + scope"]
  end

  create_profile --> verify --> merge_decision{"Có trùng?"}
  merge_decision -- "Không" --> link
  merge_decision -- "Có" --> merge["Quản lý khoa học phê duyệt gộp<br/>giữ lịch sử"] --> link
  account_admin --> link
  link --> relation["Gắn quan hệ đúng proposal/project/review/task"]
  external_user --> relation
  relation --> assignment
  account_admin --> locked{"Account bị khóa / inactive?"}
  locked -- "Có" --> revoke["Mất quyền ngay; giữ profile,<br/>quan hệ và lịch sử"]
```

`Profile INACTIVE` không nhận assignment mới. Thư ký là `SCIENTIFIC_MANAGEMENT_STAFF`
ở cấp tài khoản và chỉ có thao tác theo scope/assignment; không có system role
“scientific secretary” riêng và không có quyền phê duyệt cuối.

### 5.4. Xung đột, tệp, thông báo và audit

```mermaid
flowchart TD
  action["Assignment / decision / file action"] --> conflict_check{"Actor có vai trò<br/>xung đột trên cùng record?"}
  conflict_check -- "PI/member tự phản biện hoặc nghiệm thu" --> blocked["Chặn"]
  conflict_check -- "Reviewer đã chấm tự quyết định" --> blocked
  conflict_check -- "Authority là PI/member/reviewer" --> blocked
  conflict_check -- "Không" --> file_check["Kiểm tra quyền trên record<br/>ở mọi lần xem/tải/tải lên/thay"]
  file_check --> action_ok["Thực hiện action"]
  action_ok --> version["Tệp thay thế tạo version mới;<br/>không ghi đè chứng cứ"]
  action_ok --> notify["Thông báo trạng thái / giao việc /<br/>bổ sung / hạn / quyết định"]
  action_ok --> immutable_audit["Audit actor, thời điểm, đối tượng,<br/>action, lý do khi cần"]
  notify -. "Thông báo không cấp quyền<br/>và không chứa dữ liệu nhạy cảm" .-> end([Kết thúc])
  version --> end
  immutable_audit --> end
  blocked --> end
```

## 6. Trạng thái cốt lõi

### Đề xuất

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Submitted: PI nộp
  Submitted --> UnderReview: bắt đầu thẩm định/đánh giá
  UnderReview --> SupplementRequested: yêu cầu bổ sung
  SupplementRequested --> Resubmitted: PI nộp lại
  Resubmitted --> UnderReview: kiểm tra lại
  UnderReview --> ReadyForApproval: tổng hợp đủ
  ReadyForApproval --> Approved: lãnh đạo phê duyệt
  ReadyForApproval --> Rejected: lãnh đạo không phê duyệt
  Approved --> Archived: đóng/lưu trữ
  Rejected --> Archived: đóng/lưu trữ
```

### Đề tài

```mermaid
stateDiagram-v2
  [*] --> Preparation
  Preparation --> InProgress: bắt đầu thực hiện
  InProgress --> Suspended: tạm dừng
  Suspended --> InProgress: tiếp tục
  InProgress --> AwaitingAcceptance: nộp kết quả cuối
  AwaitingAcceptance --> Accepted: nghiệm thu đạt
  AwaitingAcceptance --> NotAchieved: nghiệm thu không đạt
  Accepted --> Archived: đóng/lưu trữ
  NotAchieved --> Archived: đóng/lưu trữ
```

Quá hạn là cờ theo dõi/nhắc việc, không tự động từ chối, đóng hoặc chuyển
trạng thái. Không dùng cập nhật trạng thái trực tiếp để bypass các action trên.

## 7. Các giới hạn không được suy diễn từ flow

- `SYSTEM_ADMIN` không mặc nhiên xem/sửa dữ liệu nghiệp vụ, phản biện, phê
  duyệt hoặc mở lại hồ sơ.
- Có cùng đơn vị, có chức danh hiển thị hoặc có quan hệ ở bản ghi khác không
  tự cấp quyền cho bản ghi hiện tại.
- Nhà nghiên cứu không tham gia không thấy hồ sơ chỉ vì cùng đơn vị.
- `EXTERNAL_RESEARCHER_USER` không tạo/nộp đề xuất và chỉ sửa phần đóng góp
  được phân công trong bản nháp.
- Mọi bản ghi, phiên bản, quan hệ, quyết định và audit được giữ lịch sử; không
  xóa cứng.
