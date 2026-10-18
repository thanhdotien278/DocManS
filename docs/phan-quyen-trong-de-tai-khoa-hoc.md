# Phân quyền trong đề tài khoa học khi một nhà khoa học có nhiều vai trò

**Đồng bộ 18/10/2026 — 10 vai trò hệ thống:** Đây là giải thích domain. Ma trận
quyết định là `docs/permission-matrix.md` §7 (theo `docs/Ma_tran-phan-qquyen-DocManS.pdf`).
Mỗi tài khoản có đúng một vai trò hệ thống; quyền thực tế còn phụ thuộc phạm vi đơn vị và
quan hệ của người dùng với từng hồ sơ, đề tài. Phòng KHQS phân cấp Trưởng phòng → Trưởng ban
QLKH → Chuyên viên; Phó phòng chỉ theo dõi. Chuyên viên chỉ thao tác trên hồ sơ/đề tài mình
đang được phân công phụ trách (hệ thống tự giao theo mảng: cấp đề tài + tính chất Quân sự/Dân
sự; Trưởng phòng hoặc Trưởng ban giao/thu hồi). Mọi thủ tục lên Ban giám đốc đi qua tờ trình:
Chuyên viên lập → Trưởng ban rà soát → Trưởng phòng duyệt → Ban giám đốc ký. Chỉ Giám đốc phê
duyệt đề tài, kinh phí, thanh lý; Giám đốc hoặc Phó GĐ phụ trách Khoa học ký hội đồng, IRB,
nghiệm thu, gia hạn, điều chỉnh.

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
ROLE_TOPIC_MEMBER
ROLE_TOPIC_SECRETARY
```

rồi gán trực tiếp vào user. Cách này nguy hiểm vì nếu user có `ROLE_PI`, hệ thống dễ hiểu nhầm người đó là chủ nhiệm của mọi đề tài.

Nên tách thành 2 lớp:

```text
System role (mỗi tài khoản đúng một vai trò):
- `SYSTEM_ADMIN` (QT, Quản trị hệ thống)
- `LEADERSHIP_APPROVAL_AUTHORITY` (GĐ, Giám đốc Học viện)
- `SCIENCE_DEPUTY_DIRECTOR` (PGĐ-KH, Phó GĐ phụ trách Khoa học)
- `RESEARCH_OVERSIGHT_AUTHORITY` (PGĐ-TD, Phó GĐ khác, chỉ theo dõi)
- `RESEARCH_MANAGEMENT_HEAD` (TP, Trưởng phòng KHQS)
- `RESEARCH_MANAGEMENT_DEPUTY_HEAD` (PP, Phó phòng KHQS)
- `RESEARCH_BOARD_HEAD` (TB, Trưởng ban QLKH)
- `RESEARCH_MANAGEMENT_STAFF` (CV, Chuyên viên QLKH)
- `RESEARCHER_INTERNAL_USER` (NCV, Nhà nghiên cứu nội bộ)
- `EXTERNAL_RESEARCHER_USER` (NNB, Nhà nghiên cứu bên ngoài)

Proposal/topic participation role:
- `PROPOSAL_PI` or `TOPIC_PI` (owner-derived)
- `TOPIC_MEMBER`
- `TOPIC_SECRETARY`
- Reviewer
- Council Member
- Ethics Reviewer (thành viên/thư ký IRB)
- Chuyên viên phụ trách (`PROPOSAL_MANAGEMENT_OFFICER` / `PROJECT_MANAGEMENT_OFFICER`)
```

Chức danh đơn vị (Trưởng khoa, Chủ nhiệm Bộ môn, …) chỉ để hiển thị, không cấp quyền.
Mọi vai trò trừ QT và NNB đều có thể làm chủ nhiệm đề tài: Giám đốc hay Trưởng phòng nộp đề
xuất với tư cách chủ nhiệm, và khi đó không được dùng quyền quản lý trên chính hồ sơ đó.

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
  - TOPIC_PI (owner-derived; never a team row)
  - TOPIC_MEMBER
  - TOPIC_SECRETARY
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
  - PROPOSAL_PI (owner-derived; never a team row)
  - TOPIC_MEMBER
  - TOPIC_SECRETARY
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
A có system role: `RESEARCHER_INTERNAL_USER`
A có owner-derived relationship trong DT-001: `PROPOSAL_PI`
DT-001 đang ở trạng thái: DRAFT
=> A được sửa hồ sơ, upload file, submit proposal; non-PI submit paths are denied
```

Nhưng khi A mở đề tài DT-002:

```text
A có system role: `RESEARCHER_INTERNAL_USER`
A có participation role trong DT-002: `TOPIC_MEMBER`
DT-002 đang approved/active
=> A được xem phần được phép, upload evidence nếu được giao, không được submit thay PI
```

Khi A mở đề tài DT-003:

```text
A có participation role: `TOPIC_SECRETARY`
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
- tự gán reviewer, hội đồng cho hồ sơ của mình (kể cả khi người đó là TP/TB/CV)
- xem review nội bộ nếu chính sách chưa cho phép
- xem nhật ký hành động của hồ sơ (giữ ẩn danh hai chiều với phản biện)
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
- request adjustment/gia hạn thay PI
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
- thay reviewer/hội đồng (việc của TP, TB hoặc chuyên viên phụ trách)
- xem dữ liệu ngoài đề tài/hội đồng mà họ được phân công
- quyết định thay lãnh đạo
```

Nếu thư ký khoa học là thư ký hội đồng thì nên quản lý qua:

```text
council_memberships.council_role = SECRETARY
```

Nếu là thư ký của đề tài thì quản lý qua:

```text
project_participations.participation_role = TOPIC_SECRETARY
```

### 4.4. Reviewer / thành viên hội đồng

Reviewer là assignment-scoped role.

Nên có quyền:

```text
- nhận hoặc từ chối lời mời (từ chối phải ghi lý do); trước khi đồng ý chỉ thấy tên đề tài, vai trò, hạn, người mời
- chỉ xem proposal/hồ sơ y đức/hồ sơ hội đồng được phân công, kể cả hồ sơ ngoài đơn vị
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
- xem nhật ký hành động của hồ sơ
```

Nguồn mời: phản biện, thành viên hội đồng đánh giá và thành viên IRB mời từ mọi tài khoản có
lý lịch khoa học (mọi vai trò trừ QT, kể cả GĐ, PGĐ, TP, PP, TB, CV). Ai được mời vào hội đồng
đánh giá đều chấm phiếu, nhưng không được ký hay quyết định trên chính hồ sơ đó. Người tham gia đề tài không được mời. Thư ký hội đồng của
chính hồ sơ lập tổng hợp, ghi biên bản, không chấm phiếu.

---

## 5. Cần có luật chống xung đột vai trò

Vì một nhà khoa học có thể giữ nhiều vai trò, hệ thống cần kiểm tra conflict.

Nên có rule như sau:

| Tình huống | Nên xử lý |
|---|---|
| Người A là PI của đề tài DT-001 | Không được làm reviewer của chính DT-001 |
| Người A là thành viên DT-001 | Không được chấm độc lập DT-001 nếu quy định không cho phép |
| Người A là thư ký khoa học DT-001 | Không được approve/reject DT-001 |
| Người A là reviewer DT-002 và PI DT-003 | Hợp lệ vì khác đề tài |
| Người A là thư ký hội đồng của council X | Chỉ có quyền secretary trong council X, không lan sang council khác |
| Người A là Chuyên viên/Trưởng ban/Trưởng phòng và là PI, thành viên hoặc phản biện DT-001 | Không phân công, kiểm tra, tổng hợp, quyết định hay xử lý kinh phí trên DT-001 |
| Người A là Giám đốc/Phó GĐ KH và là PI DT-001 | Không tự ký/phê duyệt DT-001 |
| Người A là Trưởng ban/Trưởng phòng và tự lập tờ trình | Không tự rà soát/duyệt tờ trình của mình |
| Người A là PI hoặc phản biện DT-001 | Không xem nhật ký hành động của DT-001 (ẩn danh hai chiều) |

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
Vai trò hệ thống: Nhà nghiên cứu nội bộ
Công việc hiện tại:
- 2 đề tài chủ nhiệm
- 4 đề tài tham gia
- 1 đề tài làm thư ký
- 3 hồ sơ cần review
```

---

## 7. Ma trận quyền gợi ý

Bảng 7.1 so sánh vai trò trong hồ sơ (persona), không phải vai trò hệ thống. Bảng 7.2 tóm tắt
10 vai trò hệ thống; ma trận đầy đủ kèm ghi chú điều kiện ở `docs/permission-matrix.md` §7.

### 7.1. Theo vai trò trong hồ sơ

| Chức năng | PI | Thành viên | Thư ký đề tài | Reviewer / HĐ / IRB | Chuyên viên phụ trách | Ban giám đốc |
|---|---:|---:|---:|---:|---:|---:|
| Tạo, sửa, nộp proposal | Có | Không | Không | Không | Không | Không |
| Upload file đề tài | Có | Có giới hạn | Có | Chỉ file review | Theo nghiệp vụ được giao | Không |
| Xem project | Có | Có | Có | Không | Có (hồ sơ được giao) | Có theo scope |
| Nộp báo cáo tiến độ | Có | Không, chỉ cập nhật mốc mình phụ trách | Theo assignment | Không | Xét, chấp nhận, yêu cầu bổ sung | Không |
| Gửi điều chỉnh/gia hạn | Có | Không | Không | Không | Thẩm định, lập tờ trình | GĐ hoặc PGĐ-KH ký |
| Chấm điểm proposal | Không | Không | Không | Có nếu được mời và đã nhận lời | Chỉ khi chính họ được mời | Chỉ khi chính họ được mời (khi đó không ký/quyết định hồ sơ này) |
| Tổng hợp đánh giá | Không | Không | Không | Thư ký hội đồng của chính hồ sơ | Có | Không |
| Phê duyệt đề tài, kinh phí, thanh lý | Không | Không | Không | Không | Không | Chỉ GĐ |
| Ký hội đồng, IRB, nghiệm thu | Không | Không | Không | Không | Lập tờ trình | GĐ hoặc PGĐ-KH |
| Xem nhật ký hành động hồ sơ | Không | Theo quan hệ | Theo quan hệ | Không | Có | Có theo scope |

### 7.2. Theo vai trò hệ thống

| Chức năng | QT | GĐ | PGĐ-KH | PGĐ-TD | TP | PP | TB | CV | NCV | NNB |
|---|---|---|---|---|---|---|---|---|---|---|
| Quản trị tài khoản, đơn vị, danh mục, cấu hình | ✓ | — | — | — | — | — | — | — | — | — |
| Quản lý hồ sơ nhà khoa học | ✓ | — | — | — | ✓¹ | — | — | ✓¹ | — | — |
| Có lý lịch khoa học, tự cập nhật | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tạo, mở, đóng đợt tiếp nhận | — | — | — | — | ✓ | — | — | ✓ | — | — |
| Tạo, sửa, nộp đề xuất (tư cách chủ nhiệm) | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Giao chuyên viên phụ trách, phân mảng | — | — | — | — | ✓¹ | — | ✓¹ | — | — | — |
| Kiểm tra đầy đủ, yêu cầu bổ sung | — | — | — | — | — | — | ✓¹ | ◐3 | — | — |
| Phân công phản biện, lập hội đồng đánh giá, hội đồng IRB | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | — | — |
| Tổng hợp, chốt, trình kết quả đánh giá | — | — | — | — | ✓¹ | — | ✓¹ | ◐3 | ◐6 | ◐6 |
| Chấm phiếu đánh giá, nhận xét IRB | — | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 | ◐5 |
| Tờ trình: lập / rà soát / duyệt | — | — | — | — | Duyệt¹, lập¹ | — | Rà soát¹, lập¹ | Lập³ | — | — |
| Ký hội đồng, IRB, nghiệm thu, gia hạn, điều chỉnh | — | ✓ | ✓ | — | — | — | — | — | — | — |
| Phê duyệt đề tài, kinh phí, thanh lý | — | ✓ | — | — | — | — | — | — | — | — |
| Xem đề tài | — | ✓ | ✓ | Xem¹ | Xem | Xem¹ | Xem | Xem¹ | ◐4 | ◐4 |
| Quản lý kinh phí, giải ngân, quyết toán | — | ✓ | — | — | ✓ | — | ✓ | ◐3 | — | — |
| Nghiệp vụ đề tài hằng ngày | — | — | — | — | — | — | — | ◐3 | — | — |
| Dashboard nghiệp vụ, xuất Excel | — | ✓ | ✓ | ✓⁷ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Ghi chú: ¹ trong phạm vi đơn vị; ³ chỉ hồ sơ/đề tài chuyên viên đang phụ trách; ⁴ chỉ hồ sơ/đề
tài mình là chủ nhiệm hoặc thành viên; ⁵ chỉ khi được phân công phản biện, hội đồng hoặc IRB;
⁶ thư ký hội đồng của chính hồ sơ; ⁷ PDF chưa định nghĩa ghi chú này — theo tài liệu thiết kế
`docs/design/phan-cap-va-trinh-duyet.md` §5: chỉ số liệu tổng hợp, không xem kinh phí từng đề tài.

---

## 8. Kết luận thiết kế

Nên thiết kế theo nguyên tắc:

```text
User account: để đăng nhập
Researcher profile: hồ sơ nhà khoa học
System role: quyền nền của tài khoản (đúng một trong 10 vai trò)
Participation role: vai trò của nhà khoa học trong từng proposal/project/council
Assignment: phân công chuyên viên phụ trách/reviewer/hội đồng/IRB/task cụ thể
Tờ trình: CV lập → TB rà soát → TP duyệt → Ban giám đốc ký
Permission policy: tính quyền tại thời điểm thao tác
Audit log: ghi lại mọi thay đổi quan trọng
```

Câu trả lời ngắn gọn cho bài toán là:

> **Một nhà khoa học được phép tham gia nhiều đề tài với nhiều vai trò khác nhau. Không gán vai trò “Chủ nhiệm”, “Thành viên”, “Thư ký” như quyền toàn hệ thống. Hãy gán các vai trò đó ở bảng liên kết giữa nhà khoa học và từng đề tài/hội đồng. Khi thao tác, backend tính quyền theo bản ghi cụ thể, trạng thái workflow, phạm vi đơn vị và luật xung đột vai trò.**
