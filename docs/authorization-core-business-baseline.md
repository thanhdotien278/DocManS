---
title: "DocManS — Baseline vai trò, quyền theo bản ghi và nghiệp vụ cốt lõi"
type: normative-product-decision
status: approved
version: 1.2
updated: 2026-09-21
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
| `SCIENTIFIC_MANAGEMENT_HEAD` | Tất cả proposal/project trong phạm vi Quản lý khoa học được cấp rõ ràng | Trưởng phòng: xem hồ sơ, chuyên viên phụ trách, hồ sơ chưa phân công; lọc/nhóm theo chuyên viên, theo dõi khối lượng, trạng thái và hạn; quyết định cuối Project Extension trong Golden Flow 4 | Không phải `LEADERSHIP_APPROVAL_AUTHORITY`; quyền xem không tự cấp hành động quản trị; không quyết định Project Adjustment |
| `SCIENTIFIC_MANAGEMENT_STAFF` | Chỉ proposal/project được phân công quản lý đang hiệu lực | Chuyên viên/trợ lý: kiểm tra, yêu cầu bổ sung, xác nhận đầy đủ và theo dõi đánh giá trên hồ sơ mình phụ trách; quyết định cuối Project Adjustment trong Golden Flow 4; nghiệp vụ không gắn proposal/project theo scope riêng | Không tự có quyền toàn Học viện; quan hệ tham gia không cấp quyền hành chính Quản lý khoa học; không quyết định proposal, acceptance hoặc Project Extension |
| `LEADERSHIP_APPROVAL_AUTHORITY` | Toàn bộ hồ sơ trong scope lãnh đạo được cấp rõ ràng | Phê duyệt/từ chối proposal trước khi project execution bắt đầu; xem/giám sát thông tin project theo disclosure | Không sửa nội dung hồ sơ, không bỏ qua phản biện/tổng hợp; không quyết định Project Adjustment hoặc Project Extension; không tự quyết hồ sơ mình là PI/thành viên/phản biện |
| `RESEARCH_OVERSIGHT_AUTHORITY` | Institutional research oversight plus internal researcher capabilities through record relationships | Explicit institutional scopes; read-only oversight; no final decisions | No protected reviewer data from oversight; conflict/disclosure checks still apply |
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

## 2.1. Trách nhiệm quản lý proposal/project — quyết định 2026-09-21

| Quan hệ quản lý | Bản ghi sở hữu | Cardinality |
| --- | --- | --- |
| `PROPOSAL_MANAGEMENT_OFFICER` | Một proposal | Tối đa một chuyên viên phụ trách chính đang hiệu lực trên mỗi proposal |
| `PROJECT_MANAGEMENT_OFFICER` | Một project | Tối đa một chuyên viên phụ trách chính đang hiệu lực trên mỗi project |

Không có officer đang hiệu lực nghĩa là **chưa phân công**, không phải context bị lỗi.
Head được thấy hồ sơ này trong scope; Staff không được nhận management visibility.
Không phân công mặc định cho mọi Staff, người tạo, đơn vị hoặc officer của proposal
khi tạo project. Project có quan hệ quản lý riêng, không chia sẻ hàng quan hệ với proposal.

Tạo, chuyển hoặc thu hồi phân công phải kiểm tra actor có capability phân công được
cấp rõ, candidate là Staff đang hoạt động, scope, conflict và context hiện thời.
Chuyển phân công kết thúc quan hệ cũ rồi ghi quan hệ mới trong cùng giao dịch;
không ghi đè lịch sử. Ngăn hai officer chính đồng thời kể cả request cạnh tranh.
Giữ actor, thời điểm, record, officer cũ/mới, thời gian hiệu lực và lý do thay đổi
trong history/audit. Thu hồi/hết hiệu lực chấm dứt quyền quản lý ngay.

Staff có thể tham gia hồ sơ khác qua PI, thành viên, thư ký, reviewer, council hoặc
task assignment hợp lệ. Quyền tham gia chỉ cấp action/disclosure của quan hệ đó;
không cho kiểm tra hành chính, phân công đánh giá, tổng hợp hoặc quản lý hồ sơ.
Sau khi mất officer assignment, quan hệ khác vẫn được xét độc lập; không giữ lại
management capability. Không dùng một “vai trò cao nhất” hay union đọc/ghi để
biến quyền xem qua participation thành quyền hành chính.

Backend phải phân biệt lý do truy cập: Head trong scope, officer quản lý hiện hành,
hoặc từng quan hệ tham gia/review/council/task. Conflict và disclosure vẫn giới hạn
nội dung/action, kể cả Head là participant; Head không được dùng quyền giám sát
để xem review ẩn hoặc tự xử lý/quyết định hồ sơ có xung đột.

Trong các bảng nghiệp vụ bên dưới, “Quản lý khoa học” trên proposal/project là
operator có capability quản lý cụ thể; Staff bắt buộc có officer assignment tương
ứng. Head được phân công/thu hồi officer, phân công đánh giá, soạn/chốt tổng hợp và trình gói đủ điều kiện; không suy ra
toàn bộ action của Staff hay quyền quyết định lãnh đạo từ system role Head.

Nghiệp vụ độc lập như đợt tiếp nhận và hồ sơ nhà khoa học tiếp tục dùng capability/
scope riêng đã được quy định. Chúng không cấp quyền proposal/project. Không tạo
thêm officer relationship cho các domain khác trong thay đổi này.

### Final decisions replacing the pre-coding questions

- Head owns officer assignment/reassignment/revocation within explicit scope and without conflict.
  Assignment takes effect at transaction time; prior rows and audit are retained. No automatic
  officer backfill preserves the former broad Staff grant. Unassigned records remain valid.
- Head assigns reviewers after current-submission completeness confirmation, reads submitted reviews,
  drafts and finalizes synthesis, then explicitly submits the complete package. Staff monitors reviews. Head has
  no proposal final approval authority and cannot directly edit research content through
  management authority. Head extension decisions follow Golden Flow 4 §4.4.
- `nmphuong` maps to `SCIENTIFIC_MANAGEMENT_HEAD`; `hdtien1` and `hdtien2` remain
  `SCIENTIFIC_MANAGEMENT_STAFF`; `tvtien` is `LEADERSHIP_APPROVAL_AUTHORITY`;
  `vndinh` is `RESEARCH_OVERSIGHT_AUTHORITY`. Local demo institutional
  scope is granted explicitly for each internal unit, never inherited from an organization tree.
- Internal proposal eligibility includes `RESEARCHER_INTERNAL_USER` and
  `RESEARCH_OVERSIGHT_AUTHORITY`. Create/edit/submit/resubmit still require the current
  owner-derived PI, applicable scope/intake/state and no prohibited conflict. Staff may hold
  participation relationships but receives no new PI mutation grant from its system role.
- `LEADERSHIP_APPROVAL_AUTHORITY` has institutional leadership oversight and eligible final
  decisions. `RESEARCH_OVERSIGHT_AUTHORITY` has institutional research oversight plus independent researcher relationships; the role
  never grants final proposal, council, funding or acceptance decisions. An Oversight PI/member
  gains only that relationship's actions; unrelated records remain read-only.
- Leadership/oversight operational disclosure is status/counts/deadlines/responsible officer.
  Reviewer identity, raw scores and confidential comments are omitted unless exact actor/state
  disclosure explicitly permits them. Review participation continues to block same-round final
  decisions after revocation when a persisted draft/submitted evaluation exists.

### Finalized implementation scope — 2026-09-21

The current change implements this model on the existing proposal, intake, researcher-profile,
file and evaluation features. Approved projects, council-establishment/ethics lifecycles,
institutional dashboards, general search/report/export and notification/My Work backends
remain planned where no operational source exists. `PROJECT_MANAGEMENT_OFFICER` is a
contract relationship, not a persisted orphan assignment. Dashboard showcase data is not
an institutional report or proof of authorization. Future source domains must apply the
same current scope, relationship, conflict and disclosure checks before aggregates or drill-down.

`LEADERSHIP_APPROVAL_AUTHORITY` and `RESEARCH_OVERSIGHT_AUTHORITY` require institutional research dashboard views of available
proposal stages, overdue work, active/delayed/reporting-due/acceptance/completed projects,
funding and management workload. Only `LEADERSHIP_APPROVAL_AUTHORITY` gets eligible proposal decision queues. Project adjustment queues
belong to assigned Staff and extension decision queues to Head. Head gets
responsible-officer/unassigned filters and workload; Staff sees assigned management records.
Proposal funding currently provides `budgetMetadata.amount` (requested funding). Approved,
used and remaining project funding and utilization are unavailable until their source exists;
never infer expenditure or add ledgers, payments, banking, invoices or ERP integration.

# 3. Quy tắc scope, xung đột và ủy quyền

- `SCIENTIFIC_MANAGEMENT_HEAD` xem tất cả proposal/project trong scope Quản lý khoa học
  được cấp, có thể là toàn Học viện khi được cấp rõ. `SCIENTIFIC_MANAGEMENT_STAFF`
  chỉ có management visibility khi có officer assignment hiện hành trên đúng hồ sơ;
  scope tổ chức, nơi công tác hoặc chức danh không thay thế assignment.
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
- Participant (PI, team secretary/member) không được đồng thời là management officer,
  reviewer, người đánh giá/nghiệm thu, thành viên hội đồng đánh giá/nghiệm thu hoặc
  người quyết định cuối trên cùng hồ sơ. Reviewer không quyết định cuối cùng cùng
  hồ sơ/vòng. Các vị trí loại trừ nhau trong cùng hội đồng không được kiêm nhiệm.
  Kiểm tra cả khi tạo/thay đổi mọi phía của quan hệ (kể cả thêm participant) và
  khi thực thi hành động được bảo vệ; preflight/UI không thay thế kiểm tra hiện thời.
- Proposal create, submit và resubmit là hành động riêng của PI nội bộ hiện
  tại; không có đường ủy quyền, delegate input hoặc capability mở rộng cho
  các hành động này. Những delegation contract khác (nếu domain tương lai cho
  phép) vẫn phải nêu rõ action, record, thời hạn, phê duyệt và thu hồi.
- Tài khoản inactive/locked mất quyền ngay; quan hệ và lịch sử cũ không bị xóa.

# 4. Ma trận quyền theo bản ghi và nghiệp vụ

## 4.1. Hồ sơ nhà khoa học

| Hành động | Quyền |
| --- | --- |
| Tạo/cập nhật/kích hoạt/ngừng hoạt động | `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD` và `SCIENTIFIC_MANAGEMENT_STAFF` trong scope tổ chức được cấp rõ ràng |
| Xác minh/gộp hồ sơ trùng | Quản lý hoặc Thư ký có scope cảnh báo/xác minh; chỉ Quản lý khoa học phê duyệt gộp |
| Liên kết tài khoản | `SYSTEM_ADMIN`, `SCIENTIFIC_MANAGEMENT_HEAD` và `SCIENTIFIC_MANAGEMENT_STAFF` có scope; một hồ sơ chỉ một liên kết account hiện hành, kể cả khi inactive và một account không liên kết nhiều hồ sơ |
| Xem dữ liệu định danh/liên hệ | Chỉ người có scope quản lý hoặc quan hệ nghiệp vụ cần thiết; danh sách/search/notification dùng dữ liệu tối thiểu |
| Tham gia đề tài/phản biện | Chỉ qua quan hệ/assignment riêng trên từng bản ghi |

Hồ sơ có thể tồn tại trước tài khoản. Hồ sơ `INACTIVE` không được chọn trong
workflow lấy Scientist Profile làm candidate, nhưng evaluation assignment lấy
active account làm candidate không phụ thuộc profile có tồn tại hoặc active hay
không. Lịch sử quan hệ cũ vẫn giữ.

## 4.2. Đợt tiếp nhận

| Hành động | Quyền |
| --- | --- |
| Tạo, sửa, mở, đóng đợt | Chuyên viên có capability và scope đợt được cấp rõ; không cấp quyền xem proposal/project trong đợt |
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


### Reviewer / Council Assignment from User Accounts

Scientific Management Staff with an effective `PROPOSAL_MANAGEMENT_OFFICER`
assignment and explicitly granted scope may assign or revoke `reviewer` or
`committee_member` duties on that eligible proposal.
Both duties remain proposal-scoped assignments, not account roles.

Each proposal requires exactly two `reviewer` assignments and at least three
`committee_member` assignments before it can move to `ready_for_approval`.
Count distinct accounts with `assigned` or `completed` assignments; revoked
assignments do not count. Assignment can be built incrementally, but a third
reviewer is rejected inside the proposal mutation transaction. Revocation may
temporarily leave a vacancy; readiness stays blocked until replacements are
assigned and all required reviews are submitted. Readiness rechecks the roster
under the proposal lock so concurrent assignment changes cannot bypass it.

#### Evaluation-position compatibility and multiplicity

This subsection is the authoritative compatibility definition for proposal,
council and ethics evaluation assignments. An evaluation context key is the
tuple `(sourceDomain, sourceRecordId, evaluationContextId)`, where the source
owns a mandatory immutable round/council context ID. A council evaluating two
source records has two context keys; a later round on the same source record has
a new `evaluationContextId`. Missing or ambiguous context fails closed.
Relationships on another source record, council context or round neither block
nor grant an assignment.

| Current fact on the source record / in the evaluation context | Proposed assignment/action | Result |
| --- | --- | --- |
| Active PI (`PROPOSAL_PI` or `TOPIC_PI`), `TOPIC_MEMBER` or `TOPIC_SECRETARY` on the source record | `PROPOSAL_MANAGEMENT_OFFICER`, `PROJECT_MANAGEMENT_OFFICER`, `COUNCIL_CHAIR`, `COUNCIL_SECRETARY`, `COUNCIL_MEMBER`, `REVIEWER` / `COUNCIL_REVIEWER`, or final approval authority | Deny `SOURCE_PARTICIPATION_CONFLICT` |
| An active/scheduled evaluation position | The same position with an overlapping interval for the same person | Deny `DUPLICATE_OR_OVERLAPPING_ASSIGNMENT` |
| An active/scheduled evaluation position | A different mutually exclusive position with an overlapping interval for the same person | Deny `INCOMPATIBLE_COUNCIL_POSITION` |
| An active evaluation position, or any persisted draft/submitted evaluation by the person in this round | Consolidation or final approve/reject decision for the same source record and round | Deny `REVIEWER_DECISION_CONFLICT`; persisted evaluation keeps the conflict after the assignment ends or is revoked |
| A relationship or evaluation position only on another source record, council or round | Otherwise eligible assignment/action in this context | No conflict from that unrelated relationship |

The mutually exclusive evaluation-position set is `COUNCIL_CHAIR`,
`COUNCIL_SECRETARY`, `COUNCIL_MEMBER`, and `REVIEWER`;
`COUNCIL_REVIEWER` is a domain label for `REVIEWER`, not a second position.
One researcher may hold at most one active position from that set in an
evaluation context. This rejects duplicate active assignments and every pair,
including chair + member, chair + secretary, chair + reviewer, member +
reviewer and secretary + reviewer.

Changing position is revoke/end-then-assign. The old row, actor, reason and
effective interval remain immutable history; its effective end must be no later
than the new position's effective start. The authoritative mutation must lock
or otherwise serialize the context and prevent concurrent requests, bulk
operations, imports, direct APIs or administrative paths from creating
overlapping active intervals.

Effective intervals are half-open `[effectiveFrom, effectiveUntil)`. `assigned`
and `completed` rows remain part of the current round for multiplicity until
revoked/ended or the round closes; completion never permits a second evaluation
position in that round. A future replacement may be scheduled only when the
same authoritative mutation records the old end first and proves it is no later
than the new start.

Candidate search/preflight evaluates the same rules and returns the backend
decision code, stable reason code and minimum-disclosure reason. The owning
mutation repeats the evaluation using current account, source participation,
evaluation-context/round, assignment intervals and context versions. A stale
preflight is denied as `STALE_ASSIGNMENT_CONTEXT`; it is never an assignment
grant. UI filtering and disabled states consume these backend results and do
not reproduce the policy locally.

An ended/revoked assignment with no persisted evaluation creates no lasting
decision conflict after its interval ends. This does not erase its immutable
history and does not relax any conflict while the assignment is active.

Any active user account can be selected, regardless of system role, organization
scope, or whether a Scientist Profile exists or is active. Search exposes only
account ID, display name and username to authorized, unconflicted staff for this
proposal. A profile link is optional provenance and is never created by assignment.
The assignee needs no scope at the proposal's host unit: an effective assignment
allows the review queue, proposal/package/files and own review actions on that
proposal, subject to participation conflicts and the existing workflow/disclosure rules.

Assignment is allowed in `submitted`, `resubmitted`, or `under_review`; the first
assignment requires current submission completeness evidence and opens
`under_review`. Revocation uses the same state boundary and requires a reason.
PI and active team secretary/member, unresolved conflict context, inactive accounts,
and incompatible, duplicate or overlapping active assignments are denied. Only scoped, conflict-free Head may assign or consolidate. Self-assignment, where otherwise eligible,
removes synthesis authority through the same-proposal reviewer conflict. Staff monitoring requires current management-officer
authority on that proposal;
leadership with a reviewer assignment still cannot decide that proposal.
Both duty types recheck account status, participation, workflow, dates and proposal
context version inside the mutation transaction. Search is advisory, not a grant.

Each new assignment retains the account ID and the current linked profile ID when
available, otherwise null. Existing provenance is not inferred or rewritten.
Assignment and revocation append actor/time/target/profile/account/role audit
atomically. Revocation preserves the assignment and submitted reviews and immediately
ends its access grant. Conflict-rejected attempts commit only their failure audit,
without creating an assignment or changing workflow state.

### Hiển thị workflow theo bản ghi

`Phiếu đánh giá của tôi`, `Phân công đánh giá` và `Hồ sơ trình phê duyệt` không
phải là nội dung toàn cục của trang hồ sơ nhà khoa học. Chúng chỉ được dựng
trong chi tiết proposal có context tương ứng. `Phiếu đánh giá của tôi` cần
assignment reviewer/council đang còn hiệu lực trên đúng proposal và vòng đánh
giá; role researcher, council hoặc assignment ở proposal khác không thay thế
điều kiện này. `Phân công đánh giá` cần capability của
`SCIENTIFIC_MANAGEMENT_STAFF` cùng `PROPOSAL_MANAGEMENT_OFFICER` đang hiệu lực
trên proposal, scope và state cho phép. `Trình phê
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

Golden Flow 4 is specified in the [Project Execution contract](contracts/project-execution.md).
It preserves project-scoped `TOPIC_PI` (the requested `PROJECT_PI`) and assigned-Staff
monitoring. Leadership approval is the gate before execution; after activation,
reports are reviewed/accepted by assigned Staff, Project Adjustments are finally
approved/rejected by assigned Staff, and Project Extensions are finally
approved/rejected by the scoped Head. Leadership does not decide either project
request type, and Head does not decide Project Adjustments. Submitted revisions and
evidence are immutable; overdue is derived, never a project workflow state.
Assigned proposal Staff creates; Head separately assigns project Staff, who confirms
setup. Acceptance/council implementation belongs to the next flow.

| Hành động | Quyền |
| --- | --- |
| Tạo đề tài từ đề xuất | Staff phụ trách proposal hiện hành tạo từ proposal đã được Leadership phê duyệt; không tự động sinh record |
| Phân công Staff đề tài / kích hoạt | Head phân công `PROJECT_MANAGEMENT_OFFICER`; Staff được phân công xác nhận setup và kích hoạt execution |
| Sao chép PI/thành viên | Sao chép thành quan hệ mới của đề tài; thay đổi sau đó không sửa ngược đề xuất |
| Quản lý mốc, báo cáo, evidence, task | Quản lý khoa học và participant/assignee đúng scope |
| Báo cáo tiến độ | `TOPIC_PI`/`PROJECT_PI` nộp; assigned Staff review, accept hoặc request supplementation |
| Project Adjustment | PI tạo/gửi; assigned Staff review và approve/reject. Scope: milestone, approved scope/plan, governed membership; không gồm tăng end date |
| Project Extension | PI tạo/gửi; assigned Staff administrative validation/preparation; Head approve/reject. Leadership không quyết định |
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
