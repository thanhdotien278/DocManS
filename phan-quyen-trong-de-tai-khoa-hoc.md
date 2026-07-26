# Phân quyền trong đề tài khoa học khi một nhà khoa học có nhiều vai trò

Nên xử lý theo mô hình **một người nhiều vai trò, nhưng vai trò được gắn theo từng ngữ cảnh đề tài**, không gán cứng một người chỉ là “PI” hoặc chỉ là “thành viên”.

Tức là:

> **Nhà khoa học là một hồ sơ nhân sự/học thuật dùng chung.  
> Tài khoản đăng nhập là một định danh truy cập.  
> Vai trò hệ thống là quyền nền.  
> Vai trò trong đề tài là quyền theo từng đề tài cụ thể.**

Cách này phù hợp với định hướng hiện tại của DocManSystem vì hệ thống cần quản lý hồ sơ nhà khoa học dùng chung, liên kết với tài khoản, liên kết với proposal/project/council/review/task, đồng thời phân quyền theo role, scope và state.

---

## 1. Không nên coi “Chủ nhiệm đề tài” là role global

Sai lầm hay gặp là tạo role kiểu:

```text
ROLE_PI
ROLE_PROJECT_MEMBER
ROLE_SCIENTIFIC_SECRETARY
```

rồi gán trực tiếp vào user. Cách này nguy hiểm vì nếu user có `ROLE_PI`, hệ thống dễ hiểu nhầm người đó là chủ nhiệm của mọi đề tài.

Nên tách thành 2 lớp:

```text
System role:
- System Admin
- Scientific Management Staff
- Leadership / Approval Authority
- Researcher / Internal User

Project participation role:
- Principal Investigator
- Co-Investigator / Project Member
- Scientific Secretary
- Reviewer
- Council Member
- Ethics Reviewer
```

Ví dụ cùng một người là **PGS.TS Nguyễn Văn A**:

| Đề tài | Vai trò của người A |
|---|---|
| DT-001 | Chủ nhiệm đề tài |
| DT-002 | Thành viên đề tài |
| DT-003 | Thư ký khoa học |
| DT-004 | Reviewer |
| DT-005 | Thành viên hội đồng |

Như vậy quyền của A sẽ thay đổi theo từng đề tài.

---

## 2. Mô hình dữ liệu nên thiết kế như sau

Nên có các bảng/khái niệm chính:

```text
users
researcher_profiles
research_proposals
approved_projects
project_participations
proposal_participations
council_memberships
review_assignments
```

Trong đó `researcher_profiles` là hồ sơ nhà khoa học độc lập, không bắt buộc luôn phải là tài khoản đăng nhập.

Gợi ý bảng quan trọng nhất:

```text
project_participations
- id
- project_id
- researcher_profile_id
- user_id nullable
- participation_role
  - PRINCIPAL_INVESTIGATOR
  - PROJECT_MEMBER
  - SCIENTIFIC_SECRETARY
  - CO_INVESTIGATOR
- responsibility_description
- start_date
- end_date
- is_active
- created_by
- created_at
```

Tương tự với giai đoạn proposal:

```text
proposal_participations
- id
- proposal_id
- researcher_profile_id
- user_id nullable
- participation_role
  - PRINCIPAL_INVESTIGATOR
  - PROPOSAL_MEMBER
  - SCIENTIFIC_SECRETARY
```

Với reviewer/hội đồng nên tách riêng, vì reviewer không đơn thuần là thành viên đề tài:

```text
review_assignments
- id
- proposal_id
- reviewer_profile_id
- reviewer_user_id
- assignment_role
  - REVIEWER
  - COMMITTEE_MEMBER
- status
- due_date
```

```text
council_memberships
- id
- council_id
- researcher_profile_id
- user_id nullable
- council_role
  - CHAIR
  - SECRETARY
  - MEMBER
  - REVIEWER
```

Phần EP-11 nên chịu trách nhiệm quản lý hồ sơ nhà khoa học, liên kết hồ sơ nhà khoa học với tài khoản người dùng, và liên kết hồ sơ nhà khoa học với các bản ghi nghiệp vụ.

---

## 3. Cách tính quyền: không hỏi “user này là role gì?”, mà hỏi “user này là ai trong bản ghi này?”

Khi người dùng mở một đề tài, backend nên tính quyền theo công thức:

```text
effectivePermission =
  systemRole
  + organizationScope
  + recordParticipationRole
  + assignmentScope
  + workflowState
```

Ví dụ user A mở đề tài DT-001:

```text
A có system role: Researcher
A có participation role trong DT-001: PRINCIPAL_INVESTIGATOR
DT-001 đang ở trạng thái: DRAFT
=> A được sửa hồ sơ, upload file, submit proposal
```

Nhưng khi A mở đề tài DT-002:

```text
A có system role: Researcher
A có participation role trong DT-002: PROJECT_MEMBER
DT-002 đang approved/active
=> A được xem phần được phép, upload evidence nếu được giao, không được submit adjustment thay PI
```

Khi A mở đề tài DT-003:

```text
A có participation role: SCIENTIFIC_SECRETARY
=> A được hỗ trợ cập nhật biên bản, tài liệu, task, lịch họp, báo cáo theo quyền được cấp
=> Không được ký quyết định/phê duyệt thay lãnh đạo
```

Nguyên tắc quan trọng là authorization phải kết hợp **role-based**, **organization-scoped**, **assignment-scoped** và **state-based authorization** trên proposals, projects, councils, tasks, files, dashboards và reports.

---

## 4. Phân quyền chức năng đề xuất

### 4.1. Chủ nhiệm đề tài

Chủ nhiệm đề tài là người chịu trách nhiệm chính với proposal/project cụ thể.

Nên có quyền:

| Nhóm chức năng | Quyền |
|---|---|
| Hồ sơ đề xuất | Tạo nháp, sửa nháp, upload file, nộp hồ sơ |
| Bổ sung hồ sơ | Xem yêu cầu bổ sung, chỉnh sửa, nộp lại |
| Sau khi được duyệt | Xem project, milestone, tiến độ |
| Báo cáo | Nộp báo cáo định kỳ, upload minh chứng |
| Điều chỉnh/gia hạn | Gửi yêu cầu điều chỉnh, gia hạn |
| Nghiệm thu | Gửi hồ sơ nghiệm thu nếu quy trình yêu cầu |
| Task | Nhận/giao task trong phạm vi đề tài nếu được cho phép |

Không nên cho PI:

```text
- tự phê duyệt đề tài của mình
- tự chấm điểm đề tài của mình
- tự gán reviewer chính thức nếu đó là quyền của staff
- xem review nội bộ nếu chính sách chưa cho phép
```

### 4.2. Thành viên đề tài

Thành viên đề tài có quyền hẹp hơn PI.

Nên có quyền:

| Nhóm chức năng | Quyền |
|---|---|
| Xem đề tài | Xem thông tin cơ bản, milestone, nhiệm vụ được giao |
| Task | Cập nhật task của mình |
| Evidence | Upload minh chứng/phần việc nếu được cấp quyền |
| Báo cáo | Có thể nhập nội dung đóng góp, nhưng không nhất thiết được nộp báo cáo chính thức |
| File | Xem/tải file được cấp quyền |

Không nên cho thành viên:

```text
- submit proposal chính thức
- request adjustment/gia hạn thay PI nếu không được ủy quyền
- thay đổi danh sách thành viên chính thức
- phê duyệt báo cáo/đề tài
```

### 4.3. Thư ký khoa học

Thư ký khoa học nên là **vai trò theo từng đề tài/hội đồng**, không phải quyền quản trị toàn hệ thống.

Nên có quyền:

| Nhóm chức năng | Quyền |
|---|---|
| Hồ sơ hành chính | Cập nhật thông tin hành chính được ủy quyền |
| Tài liệu | Upload biên bản, tài liệu họp, tài liệu hoàn thiện |
| Hội đồng | Chuẩn bị danh sách tài liệu, lịch họp, biên bản |
| Task | Tạo/cập nhật task trong phạm vi đề tài/hội đồng nếu được giao |
| Theo dõi | Xem trạng thái xử lý, deadline, yêu cầu bổ sung |
| Tổng hợp | Nhập dự thảo biên bản/tổng hợp, không phải quyết định cuối |

Không nên cho thư ký khoa học:

```text
- approve/reject proposal
- approve/reject ethics dossier
- thay reviewer/hội đồng nếu không phải staff được ủy quyền
- xem dữ liệu ngoài đề tài/hội đồng mà họ được phân công
- quyết định thay lãnh đạo
```

Nếu thư ký khoa học là thư ký hội đồng thì nên quản lý qua:

```text
council_memberships.council_role = SECRETARY
```

Nếu là thư ký của đề tài thì quản lý qua:

```text
project_participations.participation_role = SCIENTIFIC_SECRETARY
```

### 4.4. Reviewer / thành viên hội đồng

Reviewer là assignment-scoped role.

Nên có quyền:

```text
- chỉ xem proposal/hồ sơ y đức/hồ sơ hội đồng được phân công
- xem file cần thiết để đánh giá
- nhập điểm, nhận xét, kiến nghị
- submit review
- xem lại review của mình theo policy
```

Không nên cho reviewer:

```text
- xem tất cả đề tài
- xem review của reviewer khác nếu chưa được phép
- sửa hồ sơ của PI
- phê duyệt cuối cùng
```

---

## 5. Cần có luật chống xung đột vai trò

Vì một nhà khoa học có thể giữ nhiều vai trò, hệ thống cần kiểm tra conflict.

Nên có rule như sau:

| Tình huống | Nên xử lý |
|---|---|
| Người A là PI của đề tài DT-001 | Không được làm reviewer của chính DT-001 |
| Người A là thành viên DT-001 | Không được chấm độc lập DT-001 nếu quy định không cho phép |
| Người A là thư ký khoa học DT-001 | Không được approve/reject DT-001 |
| Người A là leadership nhưng cũng là PI của DT-001 | Không được tự phê duyệt DT-001 |
| Người A là reviewer DT-002 và PI DT-003 | Hợp lệ vì khác đề tài |
| Người A là thư ký hội đồng của council X | Chỉ có quyền secretary trong council X, không lan sang council khác |

Nên có bảng hoặc service kiểm tra:

```text
ConflictPolicyService
- canAssignReviewer(user, proposal)
- canAssignCouncilMember(user, council, role)
- canApprove(user, record)
- canActAsSecretary(user, record)
```

Quy tắc quan trọng:

> **Một người có thể nhiều vai trò ở nhiều đề tài khác nhau, nhưng trong cùng một đề tài phải kiểm soát xung đột lợi ích và tách quyền quyết định.**

---

## 6. Giao diện nên hiển thị như thế nào?

Trong màn hình chi tiết nhà khoa học nên có các tab:

```text
Thông tin chung
Tài khoản liên kết
Đề tài chủ nhiệm
Đề tài tham gia
Vai trò thư ký khoa học
Hội đồng tham gia
Hồ sơ đang review
Task được giao
Lịch sử tham gia
Audit/history
```

Trong màn hình đề tài nên có box “Nhân sự & vai trò”:

```text
Chủ nhiệm đề tài:
- PGS.TS Nguyễn Văn A

Thư ký khoa học:
- ThS Trần Văn B

Thành viên:
- TS Lê Văn C
- ThS Phạm Văn D

Reviewer:
- PGS.TS Hoàng Văn E
- TS Nguyễn Văn F
```

Mỗi người nên có badge vai trò:

```text
[Chủ nhiệm]
[Thành viên]
[Thư ký khoa học]
[Reviewer]
[Chủ tịch hội đồng]
[Thư ký hội đồng]
```

Trong topbar hoặc profile menu của người dùng, có thể hiển thị:

```text
Vai trò hệ thống: Researcher
Công việc hiện tại:
- 2 đề tài chủ nhiệm
- 4 đề tài tham gia
- 1 đề tài làm thư ký
- 3 hồ sơ cần review
```

---

## 7. Ma trận quyền gợi ý

| Chức năng | PI | Thành viên | Thư ký khoa học | Reviewer | Staff | Leadership |
|---|---:|---:|---:|---:|---:|---:|
| Tạo proposal | Có | Không | Có nếu được ủy quyền | Không | Có nếu nhập thay | Không |
| Sửa draft proposal | Có | Hạn chế | Có nếu được ủy quyền | Không | Có theo scope | Không |
| Submit proposal | Có | Không | Có nếu được ủy quyền rõ | Không | Có nếu quy trình cho phép | Không |
| Upload file đề tài | Có | Có giới hạn | Có | Không hoặc chỉ file review | Có | Không thường xuyên |
| Xem project | Có | Có | Có | Không | Có theo scope | Có theo scope |
| Nộp báo cáo tiến độ | Có | Không hoặc đóng góp | Có nếu được ủy quyền | Không | Không | Không |
| Gửi điều chỉnh/gia hạn | Có | Không | Có nếu được ủy quyền | Không | Không hoặc nhập thay | Không |
| Chấm điểm proposal | Không | Không | Không | Có nếu assigned | Không | Không |
| Tổng hợp đánh giá | Không | Không | Có nếu là thư ký hội đồng/staff được giao | Không | Có | Không |
| Approve/reject | Không | Không | Không | Không | Tùy quy trình | Có |
| Quản lý hội đồng | Không | Không | Có trong council được phân công | Không | Có | Có theo quyền |
| Xem dashboard toàn đơn vị | Không | Không | Không | Không | Có theo scope | Có theo scope |

---

## 8. Kết luận thiết kế

Nên thiết kế theo nguyên tắc:

```text
User account: để đăng nhập
Researcher profile: hồ sơ nhà khoa học
System role: quyền nền của tài khoản
Participation role: vai trò của nhà khoa học trong từng proposal/project/council
Assignment: phân công reviewer/task cụ thể
Permission policy: tính quyền tại thời điểm thao tác
Audit log: ghi lại mọi thay đổi quan trọng
```

Câu trả lời ngắn gọn cho bài toán là:

> **Một nhà khoa học được phép tham gia nhiều đề tài với nhiều vai trò khác nhau. Không gán vai trò “Chủ nhiệm”, “Thành viên”, “Thư ký” như quyền toàn hệ thống. Hãy gán các vai trò đó ở bảng liên kết giữa nhà khoa học và từng đề tài/hội đồng. Khi thao tác, backend tính quyền theo bản ghi cụ thể, trạng thái workflow, phạm vi đơn vị và luật xung đột vai trò.**
