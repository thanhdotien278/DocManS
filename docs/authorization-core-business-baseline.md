---
title: "DocManS — Baseline vai trò, quyền theo bản ghi và nghiệp vụ cốt lõi"
type: normative-product-decision
status: approved
version: 1.3
updated: 2026-10-18
approved: 2026-08-26
audience:
  - product
  - UX/UI
  - architecture
  - backend
  - frontend
  - QA
---

> **Đồng bộ 18/10/2026 — 10 vai trò hệ thống.** Tài liệu này đã đồng bộ với
> [`permission-matrix.md`](./permission-matrix.md) (§2, §5–§8, §10; §7 thắng khi mâu
> thuẫn). Code trên nhánh `DocManS` vẫn chạy mô hình 7 vai trò cho tới khi
> `tuan/DocManS` được merge. Chỉ số ¹–⁷ trong tài liệu này là ghi chú điều kiện ở
> permission-matrix §7.2.

# Mục đích và hiệu lực

Đây là mốc quyết định sản phẩm đã được chốt để vẽ user flow, thiết kế UX/UI,
viết story và triển khai code DocManS. Code không được tự suy diễn quyền từ
giao diện, chức danh hiển thị hoặc quan hệ ở một bản ghi khác.

`_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`
tiếp tục là contract kỹ thuật cho context, version, fail-closed, delegation,
disclosure và audit. Tài liệu này là nguồn quyết định sản phẩm cho role, scope,
workflow và hành vi nghiệp vụ; ma trận vai trò chi tiết nằm ở `docs/permission-matrix.md`.
Khi triển khai, phải đồng bộ các nguồn và cập nhật `packages/permissions` cùng các
test contract.

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

Mỗi tài khoản có **đúng một system role**. `SYSTEM_ADMIN` cấp, thay đổi và thu hồi
role; thay đổi có audit. Một user có system role lãnh đạo hoặc quản lý vẫn có thể
đồng thời là PI/thành viên/reviewer thông qua quan hệ theo bản ghi. Chức danh đơn vị
(Trưởng khoa, Chủ nhiệm Bộ môn, …) chỉ để hiển thị, không cấp quyền.

| Viết tắt | System role | Phạm vi mặc định | Quyền/trách nhiệm chính | Giới hạn bắt buộc |
| --- | --- | --- | --- | --- |
| QT | `SYSTEM_ADMIN` | Dữ liệu nền tảng | Tài khoản, role, đơn vị/scope, danh mục, cấu hình, hồ sơ nhà khoa học (tạo, cấp/liên kết tài khoản), văn bản khoa học, hỗ trợ truy vết vận hành | Không có lý lịch khoa học, không dashboard nghiệp vụ, không xem/sửa bản ghi nghiệp vụ, không làm reviewer/hội đồng/IRB, không quyết định, không mở lại hồ sơ |
| GĐ | `LEADERSHIP_APPROVAL_AUTHORITY` | Toàn Học viện cho đề tài; đề xuất đã vào quy trình trong scope² | Duy nhất phê duyệt đề tài kèm kinh phí và phê duyệt thanh lý; ký mọi thứ PGĐ-KH ký; xem kinh phí từng đề tài; quản lý kinh phí, giải ngân, quyết toán | Không sửa nội dung hồ sơ, không bỏ qua phản biện/tổng hợp/tờ trình; không ký/quyết hồ sơ mình là PI/thành viên/reviewer |
| PGĐ-KH | `SCIENCE_DEPUTY_DIRECTOR` | Như GĐ (xem) | Ký thành lập hội đồng đánh giá, nghiệm thu, IRB; cấp giấy IRB; ký gia hạn, điều chỉnh (không đổi kinh phí); xem kinh phí từng đề tài | Không phê duyệt đề tài, kinh phí, thanh lý; không quản lý kinh phí |
| PGĐ-TD | `RESEARCH_OVERSIGHT_AUTHORITY` | Scope đơn vị¹, chỉ theo dõi | Theo dõi tiến độ, số lượng, báo cáo kinh phí **tổng hợp**⁷ | Không xem kinh phí từng bản ghi, không ký, không duyệt, không chuyển tờ trình |
| TP | `RESEARCH_MANAGEMENT_HEAD` | Đề xuất trong scope đơn vị¹; mọi đề tài toàn Học viện | Duyệt mọi tờ trình trước khi lên BGĐ; phân mảng cho CV; giao/thu hồi CV phụ trách; phân công phản biện/hội đồng, tổng hợp, lập hội đồng IRB, lập tờ trình trong scope¹; quản lý kinh phí toàn Học viện; quản lý đợt tiếp nhận | Không kiểm tra đầy đủ, không yêu cầu bổ sung; không ký thay BGĐ; không duyệt tờ trình mình lập |
| PP | `RESEARCH_MANAGEMENT_DEPUTY_HEAD` | Scope đơn vị¹, chỉ theo dõi | Theo dõi tiến độ, số lượng; xem kinh phí đề tài mình là PI/thành viên⁴ | Không có bước trong luồng tờ trình, không duyệt/ký, kể cả khi TP vắng |
| TB | `RESEARCH_BOARD_HEAD` | Đề xuất trong scope đơn vị¹; mọi đề tài toàn Học viện | Rà soát tờ trình do CV lập rồi trình TP hoặc trả tác giả; giao/thu hồi CV phụ trách; kiểm tra đầy đủ, yêu cầu bổ sung, phân công phản biện/hội đồng, tổng hợp, lập hội đồng IRB, lập tờ trình trong scope¹; quản lý kinh phí toàn Học viện | Không rà soát tờ trình mình lập; không ký thay BGĐ |
| CV | `RESEARCH_MANAGEMENT_STAFF` | Chỉ hồ sơ/đề tài đang được giao phụ trách³ | Kiểm tra đầy đủ, yêu cầu bổ sung, mời phản biện/hội đồng, tổng hợp, lập hội đồng IRB, lập tờ trình; nghiệp vụ đề tài hằng ngày; kinh phí trong phạm vi giao; tạo/mở/đóng đợt; quản lý hồ sơ nhà khoa học và NCKH sinh viên trong scope¹ | Không thao tác hồ sơ giao cho CV khác; không giao/thu hồi CV; quan hệ tham gia không cấp quyền quản lý |
| NCV | `RESEARCHER_INTERNAL_USER` | Bản ghi có quan hệ hợp lệ⁴ | Tạo/sửa/nộp đề xuất với tư cách PI; làm việc PI/thành viên; reviewer, hội đồng, IRB khi được mời⁵ ⁶; đăng ký NCKH sinh viên với tư cách GVHD | Không xem bản ghi không liên quan, không tự phân công, không quyết định |
| NNB | `EXTERNAL_RESEARCHER_USER` | Chỉ bản ghi có quan hệ được cấp | Reviewer, thành viên hội đồng/IRB, thư ký hội đồng hoặc thành viên đề tài qua quan hệ tường minh | Không bao giờ là PI; không thấy đợt tiếp nhận; không tạo/sửa/nộp đề xuất; không phân công hoặc quyết định |

Đổi tên so với mô hình 7 vai trò cũ: `SCIENTIFIC_MANAGEMENT_HEAD` →
`RESEARCH_MANAGEMENT_HEAD`, `SCIENTIFIC_MANAGEMENT_STAFF` → `RESEARCH_MANAGEMENT_STAFF`.
`RESEARCH_OVERSIGHT_AUTHORITY` nay chỉ là các Phó Giám đốc khác theo dõi, không còn là
PGĐ phụ trách Khoa học (`SCIENCE_DEPUTY_DIRECTOR`).

Mọi role trừ QT có lý lịch khoa học và tự cập nhật. GĐ, PGĐ, TP, PP, TB, CV có thể làm
PI đề xuất như NCV. `EXTERNAL_RESEARCHER_USER` được tạo/quản lý bởi QT hoặc TP¹/CV¹.
Tài khoản bị khóa thì mất quyền ngay; quan hệ cũ chỉ còn lịch sử.

# 2. Quan hệ và assignment theo từng bản ghi

Các role sau **không phải system role** và chỉ có hiệu lực trong đúng aggregate
được ghi trong bảng. Mỗi quan hệ có trạng thái, thời gian hiệu lực, người tạo/
thu hồi và audit; quan hệ inactive/expired/revoked mất quyền ngay.

| Quan hệ | Bản ghi | Quyền cốt lõi | Giới hạn |
| --- | --- | --- | --- |
| PI / `PROPOSAL_PI` | Một đề xuất | Sở hữu bản nháp, sửa/nộp, phản hồi bổ sung, yêu cầu rút/chỉnh sửa | Không phản biện, không tự phê duyệt, không sửa phiên bản đã khóa, không xem nhật ký thao tác của hồ sơ |
| Nhóm đề xuất / `TOPIC_SECRETARY`, `TOPIC_MEMBER` | Một đề xuất | Xem hồ sơ; thư ký nội bộ được upload tệp đề xuất khi trạng thái cho phép | Không là PI, không tạo/sửa/nộp/nộp lại, không tự đổi thành viên/quyền |
| PI đề tài / `TOPIC_PI` | Một đề tài đã duyệt | Báo cáo, xin điều chỉnh/gia hạn, nộp nghiệm thu, nộp sản phẩm | Không truy cập đề tài ngoài quan hệ; không tự thay đổi quyền |
| Nhóm đề tài / `TOPIC_SECRETARY`, `TOPIC_MEMBER` | Một đề tài đã duyệt | Theo dõi; thành viên NCV/NNB cập nhật tiến độ mốc mình phụ trách⁴ | Không phê duyệt cuối nếu không có authority riêng |
| Phản biện / `REVIEWER_ASSIGNMENT` | Một assignment/vòng đánh giá | Xem đúng gói được giao sau khi chấp nhận, nhập và gửi điểm/nhận xét | Không xem hồ sơ chưa được giao, không sửa bài của phản biện khác, không quyết định/ký, không xem nhật ký thao tác |
| Hội đồng / `COUNCIL_MEMBER` | Một hội đồng/hồ sơ được giao | Chấm phiếu đánh giá khi được mời⁵ | Không truy cập council/hồ sơ ngoài assignment |
| Thư ký hội đồng / `COUNCIL_SCIENTIFIC_SECRETARY` | Một hội đồng | Hành chính hội đồng, soạn tổng hợp và biên bản⁶ | Không chấm điểm, không quyết định |
| Thành viên/thư ký IRB / `ETHICS_REVIEWER_ASSIGNMENT` | Một hồ sơ IRB/assignment | Thành viên nhận xét; thư ký IRB lập kết luận | Không truy cập assignment khác |
| Người được giao việc / `TASK_ASSIGNEE` | Một task gắn bản ghi | Cập nhật task và evidence được giao | Quyền task không vượt quyền trên bản ghi liên kết |

Reviewer, thành viên hội đồng đánh giá và thành viên IRB được mời từ mọi tài khoản có
lý lịch khoa học (mọi role trừ QT); ai được mời vào hội đồng đánh giá đều chấm phiếu.
Người tham gia bản ghi không được mời. Các quan hệ cộng dồn quyền được phép, nhưng mọi
điều kiện từ system role, scope, trạng thái, context và conflict đều phải đạt. Không có
khái niệm “quan hệ cao nhất” để thay thế hoặc làm mất quan hệ khác.

## 2.1. Trách nhiệm quản lý proposal/project — quyết định 2026-09-21

Cập nhật 2026-10-18 theo mô hình 10 vai trò.

| Quan hệ quản lý | Bản ghi sở hữu | Cardinality |
| --- | --- | --- |
| `PROPOSAL_MANAGEMENT_OFFICER` | Một proposal | Tối đa một CV phụ trách đang hiệu lực trên mỗi proposal |
| `PROJECT_MANAGEMENT_OFFICER` | Một project | Tối đa một CV phụ trách đang hiệu lực trên mỗi project |

Khi hồ sơ được nộp, hệ thống tự giao CV phụ trách theo mảng (cấp + tính chất) mà TP đã
phân. Không khớp mảng thì hồ sơ hiển thị “Chưa có người phụ trách” để TP giao. Không có
officer đang hiệu lực nghĩa là **chưa phân công**, không phải context bị lỗi. TP¹/TB¹
thấy hồ sơ này trong scope; CV không nhận management visibility trên hồ sơ không giao
cho mình. Project có quan hệ quản lý riêng, không chia sẻ hàng quan hệ với proposal và
không tự sao chép officer từ proposal.

Chỉ TP¹/TB¹ giao, chuyển hoặc thu hồi CV phụ trách (ngoài tự giao theo mảng). Mỗi lần
phải kiểm tra actor có capability phân công, candidate là CV đang hoạt động, scope,
conflict và context hiện thời. Chuyển phân công kết thúc quan hệ cũ rồi ghi quan hệ mới
trong cùng giao dịch; không ghi đè lịch sử. Ngăn hai officer đồng thời kể cả request
cạnh tranh. Giữ actor (hoặc system), thời điểm, record, officer cũ/mới, mảng khớp, thời
gian hiệu lực và lý do trong history/audit. Thu hồi/hết hiệu lực chấm dứt quyền quản
lý ngay; phân công cũ không cấp gì.

CV có thể tham gia hồ sơ khác qua PI, thành viên, thư ký, reviewer, council hoặc
task assignment hợp lệ. Quyền tham gia chỉ cấp action/disclosure của quan hệ đó;
không cho kiểm tra hành chính, phân công đánh giá, tổng hợp hoặc quản lý hồ sơ.
Sau khi mất officer assignment, quan hệ khác vẫn được xét độc lập; không giữ lại
management capability. Không dùng một “vai trò cao nhất” hay union đọc/ghi để
biến quyền xem qua participation thành quyền hành chính.

Backend phải phân biệt lý do truy cập: TP/TB trong scope, CV phụ trách hiện hành,
BGĐ theo scope, hoặc từng quan hệ tham gia/review/council/task. Conflict và disclosure
vẫn giới hạn nội dung/action, kể cả khi TP/TB/BGĐ là participant; không ai dùng quyền
giám sát để xem review ẩn hoặc tự xử lý/quyết định hồ sơ có xung đột.

Trong các bảng nghiệp vụ bên dưới, “Phòng KHQS” trên proposal/project nghĩa là TP¹/TB¹
cho điều phối và CV³ cho thao tác bản ghi, trừ khi ô ghi rõ role. Kiểm tra đầy đủ và
yêu cầu bổ sung chỉ thuộc TB¹/CV³, không bao giờ thuộc TP. Không suy ra quyền ký/quyết
định của BGĐ từ system role TP/TB.

Nghiệp vụ độc lập như đợt tiếp nhận và hồ sơ nhà khoa học tiếp tục dùng capability/
scope riêng đã được quy định. Chúng không cấp quyền proposal/project. Không tạo
thêm officer relationship cho các domain khác trong thay đổi này.

### Final decisions replacing the pre-coding questions

- TP¹/TB¹ own officer assignment/reassignment/revocation within explicit scope and without
  conflict; the system auto-assigns by segment on submission. Assignment takes effect at
  transaction time; prior rows and audit are retained. Unassigned records remain valid.
- After current-submission completeness confirmation (TB¹/CV³), TP¹/TB¹ or the assigned CV³
  assign reviewers/council, read submitted reviews, consolidate and draft the tờ trình. The
  council secretary drafts synthesis/minutes and does not score. The tờ trình goes CV → TB →
  TP → BGĐ; no role on that path edits research content through management authority.
- Demo accounts under the 10-role model (the `DocManS` seed still uses the 7-role codes;
  see `docs/development/auth-seed-users.md`): `nmphuong` → `RESEARCH_MANAGEMENT_HEAD`;
  `hdtien1`, `hdtien2` → `RESEARCH_MANAGEMENT_STAFF`; `tvtien` →
  `LEADERSHIP_APPROVAL_AUTHORITY`; `vndinh` (PGĐ phụ trách Khoa học) →
  `SCIENCE_DEPUTY_DIRECTOR`. Local demo institutional scope is granted explicitly for
  each internal unit, never inherited from an organization tree.
- Proposal PI eligibility: every system role except `SYSTEM_ADMIN` and
  `EXTERNAL_RESEARCHER_USER`. Create/edit/submit/resubmit still require the current
  owner-derived PI, applicable scope/intake/state and no prohibited conflict. A management
  role holding a participation relationship gains only that relationship's actions.
- Only `LEADERSHIP_APPROVAL_AUTHORITY` decides topic + funding and liquidation.
  `LEADERSHIP_APPROVAL_AUTHORITY` or `SCIENCE_DEPUTY_DIRECTOR` signs council establishment,
  IRB, acceptance, extension and adjustment. `RESEARCH_OVERSIGHT_AUTHORITY` and
  `RESEARCH_MANAGEMENT_DEPUTY_HEAD` only monitor and never sign, approve or route.
- BGĐ/PP operational disclosure is status/counts/deadlines/responsible officer; GĐ and
  PGĐ-KH also see per-project funding, PGĐ-TD only aggregate funding⁷, PP only for own
  participation⁴. Reviewer identity, raw scores and confidential comments are omitted unless
  exact actor/state disclosure explicitly permits them. Review participation continues to
  block same-round consolidation/decision/signature after revocation when a persisted
  draft/submitted evaluation exists.

### Finalized implementation scope — 2026-09-21

The model is implemented on the existing proposal, intake, researcher-profile, file and
evaluation features (7-role codes on `DocManS`; 10-role codes, tờ trình routing, council
invitations and dashboard breakdowns on `tuan/DocManS`). Approved projects,
council-establishment/ethics lifecycles, institutional dashboards, general
search/report/export and notification/My Work backends remain planned where no
operational source exists. `PROJECT_MANAGEMENT_OFFICER` is a contract relationship, not
a persisted orphan assignment. Dashboard showcase data is not an institutional report or
proof of authorization. Future source domains must apply the same current scope,
relationship, conflict and disclosure checks before aggregates or drill-down.

Business dashboards (every role except QT) show available proposal stages, overdue work,
active/delayed/reporting-due/acceptance/completed projects and management workload, with
year, unit, level, field and nature (Quân sự / Dân sự / Chưa phân loại) filters and a
responsible-CV breakdown including an unassigned group. PGĐ-TD sees aggregate figures
only⁷. Only GĐ gets topic/funding and liquidation decision queues; GĐ and PGĐ-KH get
signature queues; TB gets the tờ trình review queue and TP the approval queue; CV sees
assigned records. Proposal funding currently provides `budgetMetadata.amount` (requested
funding). Approved, used and remaining project funding and utilization are unavailable
until their source exists; never infer expenditure or add ledgers, payments, banking,
invoices or ERP integration.

# 3. Quy tắc scope, xung đột và ủy quyền

- Đề xuất luôn theo scope đơn vị: TP, TB, PP, PGĐ-TD xem trong scope¹; GĐ, PGĐ-KH xem
  đề xuất đã vào quy trình trong scope²; CV chỉ có management visibility khi có officer
  assignment hiện hành trên đúng hồ sơ³; scope tổ chức, nơi công tác hoặc chức danh không
  thay thế assignment.
- Đề tài: GĐ, PGĐ-KH, TP, TB xem mọi đề tài toàn Học viện; TP và TB quản lý kinh phí toàn
  Học viện; PP và PGĐ-TD theo dõi trong scope¹; thao tác đề tài khác vẫn theo scope đơn vị.
- Reviewer/hội đồng/IRB được đọc bản ghi ngoài đơn vị mình khi có assignment⁵.
- TP¹/CV¹ chỉ thao tác hồ sơ nhà khoa học trong đơn vị có scope. Quyền hồ sơ nhà khoa
  học không biến thành system role mới.
- Đợt tiếp nhận do TP hoặc CV tạo/mở/đóng, có phạm vi `Toàn Học viện` hoặc `Chọn đơn vị`.
  Đợt mặc định là `Toàn Học viện`; khi chọn đơn vị, chỉ các đơn vị được chọn được nộp.
  Mọi role trừ QT và NNB xem được đợt đang mở.
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
  reviewer, người đánh giá/nghiệm thu, thành viên hội đồng đánh giá/nghiệm thu/IRB,
  người rà soát/duyệt tờ trình hoặc người ký/quyết định cuối trên cùng hồ sơ. PI, thành
  viên hoặc reviewer không dùng quyền quản lý (phân công, kiểm tra đầy đủ, tổng hợp,
  quyết định, kinh phí) trên cùng hồ sơ. Reviewer không quyết định/ký cùng hồ sơ/vòng.
  Các vị trí loại trừ nhau trong cùng hội đồng không được kiêm nhiệm. Kiểm tra cả khi
  tạo/thay đổi mọi phía của quan hệ (kể cả thêm participant) và khi thực thi hành động
  được bảo vệ; preflight/UI không thay thế kiểm tra hiện thời.
- Tờ trình đi CV lập → TB rà soát → TP duyệt → BGĐ ký. Tờ trình do TB lập lên thẳng TP;
  do TP lập vẫn qua bước TB. Trả lại ở bất kỳ bước nào về tác giả, bắt buộc lý do.
  Không bỏ bước; TB/TP không rà soát tờ trình mình lập và chỉ xử lý tờ trình trong scope¹.
- Ẩn danh hai chiều: PI và reviewer không xem nhật ký thao tác của bản ghi.
- Cấp thấp không thay đổi quyết định của cấp cao; backend thực thi mọi quyền.
- Proposal create, submit và resubmit là hành động riêng của PI hiện tại; không có
  đường ủy quyền, delegate input hoặc capability mở rộng cho các hành động này. Những
  delegation contract khác (nếu domain tương lai cho phép) vẫn phải nêu rõ action,
  record, thời hạn, phê duyệt và thu hồi.
- Tài khoản inactive/locked mất quyền ngay; quan hệ và lịch sử cũ không bị xóa.

# 4. Ma trận quyền theo bản ghi và nghiệp vụ

## 4.1. Hồ sơ nhà khoa học

| Hành động | Quyền |
| --- | --- |
| Tạo/cập nhật/kích hoạt/ngừng hoạt động | QT; TP¹ và CV¹ trong scope tổ chức được cấp rõ ràng |
| Xác minh/gộp hồ sơ trùng | QT, TP¹, CV¹ cảnh báo/xác minh; chỉ TP¹/CV¹ phê duyệt gộp *(tạm giữ — §7 chưa quy định, chờ quyết định sản phẩm)* |
| Liên kết tài khoản | QT, TP¹, CV¹; một hồ sơ chỉ một liên kết account hiện hành, kể cả khi inactive và một account không liên kết nhiều hồ sơ |
| Tự cập nhật lý lịch khoa học | Mọi role trừ QT, qua My Profile |
| Xem dữ liệu định danh/liên hệ | Chỉ người có scope quản lý hoặc quan hệ nghiệp vụ cần thiết; danh sách/search/notification dùng dữ liệu tối thiểu |
| Tham gia đề tài/phản biện | Chỉ qua quan hệ/assignment riêng trên từng bản ghi |

Hồ sơ có thể tồn tại trước tài khoản. Hồ sơ `INACTIVE` không được chọn trong
workflow lấy Scientist Profile làm candidate, nhưng evaluation assignment lấy
active account làm candidate không phụ thuộc profile có tồn tại hoặc active hay
không. Lịch sử quan hệ cũ vẫn giữ.

## 4.2. Đợt tiếp nhận

| Hành động | Quyền |
| --- | --- |
| Tạo, sửa, mở, đóng đợt | TP hoặc CV có scope đợt được cấp rõ; không cấp quyền xem proposal/project trong đợt |
| Xem đợt đang mở | Mọi role trừ QT và NNB |
| Chọn phạm vi | `Toàn Học viện` hoặc `Chọn đơn vị`; mặc định toàn Học viện |
| Quá hạn | Chỉ đánh dấu quá hạn và nhắc; không tự từ chối/đóng/chuyển trạng thái |
| Sau khi đóng | Chặn đề xuất mới; hồ sơ đã nộp tiếp tục xử lý |

## 4.3. Đề xuất nghiên cứu

| Hành động | Quyền |
| --- | --- |
| Tạo bản nháp | PI thuộc mọi role trừ QT/NNB, có scope đơn vị |
| Sửa bản nháp | Chỉ PI hiện tại |
| Thêm thành viên | PI đề xuất; thay đổi quan hệ phải qua kiểm tra và quyền quản lý |
| Nộp chính thức | Chỉ PI hiện tại; không ủy quyền; section nộp không hiển thị cho người không phải PI |
| Tự giao CV phụ trách | Hệ thống theo mảng khi nộp/nộp lại; TP giao hồ sơ không khớp mảng; TP¹/TB¹ giao/thu hồi |
| Kiểm tra đầy đủ/yêu cầu bổ sung | TB¹ hoặc CV³ (không phải TP); mỗi phiên bản nộp/nộp lại chỉ được xác nhận đầy đủ một lần; yêu cầu bổ sung phải nêu lý do và hạn theo ngày |
| Phản hồi và nộp lại | Chỉ PI hiện tại; không delegation |
| Phân công/thay đổi phản biện, hội đồng, hội đồng IRB | TP¹, TB¹ hoặc CV³, có conflict check |
| Chấm điểm/nhận xét | Chỉ người được mời và đã chấp nhận (mọi role trừ QT)⁵; thư ký hội đồng không chấm; gửi xong thì khóa; sửa lỗi bằng phiên bản nhận xét mới được duyệt |
| Tổng hợp đánh giá | TP¹, TB¹ hoặc CV³ không xung đột; thư ký hội đồng soạn tổng hợp/biên bản⁶ |
| Trình phê duyệt (tờ trình) | CV³ (hoặc TP¹/TB¹) lập → TB rà soát → TP duyệt → BGĐ (TB lập thì lên thẳng TP; TP lập vẫn qua TB; xem §3); chỉ chuyển hồ sơ, không phải quyết định cuối |
| Ký thành lập hội đồng đánh giá/IRB; cấp giấy IRB | GĐ hoặc PGĐ-KH |
| Phê duyệt/từ chối đề tài và kinh phí | Chỉ GĐ (`LEADERSHIP_APPROVAL_AUTHORITY`) khi hồ sơ đủ điều kiện và đã qua TB, TP |
| Rút hồ sơ | PI chỉ rút khi còn nháp; sau nộp gửi yêu cầu, Phòng KHQS phê duyệt và chuyển `Đã rút` *(tạm giữ — §7 chưa quy định, chờ quyết định sản phẩm)* |
| Chỉnh sửa sau nộp | PI gửi yêu cầu; Phòng KHQS phê duyệt; hệ thống tạo bản làm việc mới, giữ bản đã khóa *(tạm giữ — §7 chưa quy định, chờ quyết định sản phẩm)* |
| Mở lại | Chỉ Phòng KHQS; bắt buộc lý do và audit *(tạm giữ — §7 chưa quy định, chờ quyết định sản phẩm)* |

Mọi phiên bản đã nộp, review, quyết định và tệp dùng để thẩm định được giữ
nguyên. Không ghi đè bản cũ.


### Reviewer / Council Assignment from User Accounts

TP¹/TB¹ within scope, or the CV with an effective `PROPOSAL_MANAGEMENT_OFFICER`
assignment³, may assign or revoke `reviewer` or `committee_member` duties on that
eligible proposal. Both duties remain proposal-scoped assignments, not account roles.

Each proposal requires exactly two `reviewer` assignments and at least three
`committee_member` assignments before it can move to `ready_for_approval`.
Count distinct accounts with `assigned` or `completed` assignments; revoked
assignments do not count. Assignment can be built incrementally, but a third
reviewer is rejected inside the proposal mutation transaction. Revocation may
temporarily leave a vacancy; readiness stays blocked until replacements are
assigned and all required reviews are submitted. Readiness rechecks the roster
under the proposal lock so concurrent assignment changes cannot bypass it.
The council tờ trình can be routed only when every member has accepted; council
members read the dossier only after BGĐ signs the council establishment decision.

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
| Active PI (`PROPOSAL_PI` or `TOPIC_PI`), `TOPIC_MEMBER` or `TOPIC_SECRETARY` on the source record | `PROPOSAL_MANAGEMENT_OFFICER`, `PROJECT_MANAGEMENT_OFFICER`, `COUNCIL_CHAIR`, `COUNCIL_SECRETARY`, `COUNCIL_MEMBER`, `REVIEWER` / `COUNCIL_REVIEWER`, tờ trình review (TB step) / approval (TP step), or final approval/signature authority | Deny `SOURCE_PARTICIPATION_CONFLICT` |
| An active/scheduled evaluation position | The same position with an overlapping interval for the same person | Deny `DUPLICATE_OR_OVERLAPPING_ASSIGNMENT` |
| An active/scheduled evaluation position | A different mutually exclusive position with an overlapping interval for the same person | Deny `INCOMPATIBLE_COUNCIL_POSITION` |
| An active evaluation position, or any persisted draft/submitted evaluation by the person in this round | Consolidation, final approve/reject decision or BGĐ signature for the same source record and round | Deny `REVIEWER_DECISION_CONFLICT`; persisted evaluation keeps the conflict after the assignment ends or is revoked |
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

Any active account with a scientific CV can be selected — every system role except
`SYSTEM_ADMIN` (GĐ, PGĐ, TP, PP, TB, CV, NCV, NNB) — regardless of organization scope
or whether a Scientist Profile exists or is active. Search exposes only account ID,
display name, username and display-only unit title to TP¹/TB¹ or the assigned CV³
without conflict on this proposal. A profile link is optional provenance and is never
created by assignment. The assignee needs no scope at the proposal's host unit: an
accepted `reviewer` assignment allows the review queue, proposal/package/files and own review
actions on that proposal, subject to participation conflicts and the existing
workflow/disclosure rules. A `committee_member` reads the dossier only after BGĐ signs the
council establishment decision. Before acceptance only title, role, deadline and inviter
are visible; decline requires a reason.

Assignment is allowed in `submitted`, `resubmitted`, or `under_review`; the first
assignment requires current submission completeness evidence and opens
`under_review`. Revocation uses the same state boundary and requires a reason.
PI and active team secretary/member, unresolved conflict context, inactive accounts,
`SYSTEM_ADMIN`, and incompatible, duplicate or overlapping active assignments are
denied. Only TP¹/TB¹ or the assigned CV³, conflict-free, may assign or consolidate.
Self-assignment, where otherwise eligible, removes consolidation authority through the
same-proposal reviewer conflict. A CV acts only with current management-officer
authority on that proposal; GĐ/PGĐ-KH with a reviewer or council assignment still
cannot decide or sign for that proposal.
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
giá; role, council hoặc assignment ở proposal khác không thay thế điều kiện này.
`Phân công đánh giá` cần TP¹/TB¹ trong scope hoặc CV có `PROPOSAL_MANAGEMENT_OFFICER`
đang hiệu lực³, cùng state cho phép. `Trình phê duyệt` là bước tờ trình của Phòng
KHQS (CV lập → TB → TP) để chuyển hồ sơ hoàn tất sang BGĐ; action cuối
`Phê duyệt`/`Từ chối` đề tài và kinh phí chỉ thuộc `LEADERSHIP_APPROVAL_AUTHORITY`.

Backend capability là nguồn sự thật: action không được cấp (`ACTION_NOT_GRANTED`)
thì bỏ toàn bộ section; action bị chặn bởi conflict hoặc workflow state vẫn có
thể hiện dưới dạng disabled kèm lý do. Thiếu proposal/assignment context phải
fail closed. `SYSTEM_ADMIN` không được suy diễn quyền review hoặc approval.

### Chỉnh sửa sau nộp

1. PI gửi `Yêu cầu chỉnh sửa sau nộp`.
2. Phòng KHQS có scope (TP¹/TB¹ hoặc CV³) phê duyệt. *(tạm giữ — §7 chưa quy định, chờ quyết định sản phẩm)*
3. Hệ thống tạo revision mới từ bản khóa; PI sửa trong revision.
4. PI duyệt nội dung cuối và nộp lại; bản cũ vẫn là chứng cứ.
5. Lỗi câu chữ/định dạng dùng flow này; thay đổi mục tiêu, kinh phí, nhân sự,
   thời hạn hoặc kết quả dùng `Yêu cầu điều chỉnh` chính thức.

### Ẩn danh phản biện

Mỗi đợt chọn `Không ẩn danh`, `Ẩn danh một chiều` hoặc `Ẩn danh hai chiều`; mặc
định là **ẩn danh một chiều**. Chỉ Phòng KHQS có scope (TP¹/TB¹/CV³) xem danh tính
để vận hành *(tạm giữ — §7 chưa quy định, chờ quyết định sản phẩm)*. PI/thành viên không xem identity, điểm thô hoặc nhận xét nội bộ trước
khi chính sách công bố cho phép. Bất kể lựa chọn của đợt, PI và reviewer không xem
nhật ký thao tác của bản ghi.

## 4.4. Đề tài đã được duyệt

Golden Flow 4 is specified in the [Project Execution contract](contracts/project-execution.md)
(its role list is pending the 10-role sync; this section wins on conflict). It preserves
project-scoped `TOPIC_PI` (the requested `PROJECT_PI`) and assigned-CV operations. GĐ
approval of topic + funding is the gate before execution. After activation, reports are
reviewed/accepted by the assigned CV without a tờ trình. For Project Adjustment (no
funding change) and Project Extension, the PI submits, the assigned CV appraises and
drafts the tờ trình, TB reviews, TP approves, and GĐ or PGĐ-KH signs; the signature
atomically applies the change. Neither TP, TB nor CV decides either request type.
Code state names from the former flow (`under_staff_review`, `under_staff_validation`,
`ready_for_head_decision`) must be reconciled with the tờ trình routing on
`tuan/DocManS`. Submitted revisions and evidence are immutable; overdue is derived, never
a project workflow state. The assigned proposal CV creates the project; TP¹/TB¹
separately assign the project CV, who confirms setup.

| Hành động | Quyền |
| --- | --- |
| Tạo đề tài từ đề xuất | CV phụ trách proposal hiện hành tạo từ proposal đã được GĐ phê duyệt; không tự động sinh record |
| Phân công CV đề tài / kích hoạt | TP¹/TB¹ giao/thu hồi `PROJECT_MANAGEMENT_OFFICER`; CV được giao xác nhận setup và kích hoạt execution |
| Sao chép PI/thành viên | Sao chép thành quan hệ mới của đề tài; thay đổi sau đó không sửa ngược đề xuất |
| Xem và theo dõi | GĐ, PGĐ-KH, TP, TB: mọi đề tài toàn Học viện; PP, PGĐ-TD, CV: trong scope¹ (CV chỉ thao tác khi được giao³); PI/thành viên: đề tài của mình⁴ |
| Quản lý mốc, báo cáo, evidence, task | CV³ và participant/assignee đúng scope; thành viên NCV/NNB cập nhật tiến độ mốc mình phụ trách⁴ |
| Báo cáo tiến độ | `TOPIC_PI`/`PROJECT_PI` nộp; CV³ review, accept hoặc request supplementation |
| Project Adjustment | PI tạo/gửi/rút; CV³ thẩm định, lập tờ trình; TB → TP; GĐ hoặc PGĐ-KH ký. Scope: milestone, approved scope/plan, governed membership; không gồm tăng end date hoặc đổi kinh phí |
| Project Extension | PI tạo/gửi/rút; CV³ thẩm định, lập tờ trình; TB → TP; GĐ hoặc PGĐ-KH ký |
| Kinh phí | Xem chi tiết: GĐ, PGĐ-KH, TP, TB; CV³; PP và PI/thành viên chỉ đề tài mình tham gia⁴; PGĐ-TD chỉ tổng hợp⁷. Quản lý, giải ngân, quyết toán: GĐ; TP, TB toàn Học viện; CV³ |
| Nộp kết quả cuối | PI hoặc delegation hợp lệ; sau nộp khóa phiên bản |
| Nghiệm thu | CV³ chuẩn bị, lập tờ trình hội đồng nghiệm thu; TB → TP; GĐ hoặc PGĐ-KH ký thành lập hội đồng |
| Thanh lý | CV³ lập biên bản thanh lý; TB → TP; chỉ GĐ ký |
| Mở lại | Chỉ Phòng KHQS; lý do + audit *(tạm giữ — §7 chưa quy định, chờ quyết định sản phẩm)* |

Trạng thái: `Chuẩn bị triển khai → Đang thực hiện → Tạm dừng → Chờ nghiệm thu
→ Đã nghiệm thu | Không đạt → Đóng/lưu trữ`.

## 4.5. Tệp, thông báo, dashboard và audit

- Tệp luôn gắn bản ghi và kiểm tra quyền ở **mọi lần** xem/tải/tải lên/thay
  thế. Thay tệp tạo version mới; không ghi đè tệp đã dùng thẩm định/nghiệm
  thu.
- Thông báo gửi khi được giao role, đổi trạng thái, yêu cầu bổ sung/chỉnh
  sửa, nhận xét cần xử lý, tờ trình chờ bước tiếp theo/chờ ký, sắp hết hạn hoặc có
  quyết định. Thông báo không cấp quyền và không chứa dữ liệu nhạy cảm.
- Danh sách mặc định chỉ gồm Phòng KHQS và BGĐ theo scope ở §3 và người có quan hệ
  trực tiếp. Nhà nghiên cứu cùng đơn vị nhưng không tham gia không thấy hồ sơ. QT
  không có dashboard nghiệp vụ; PGĐ-TD chỉ thấy số liệu kinh phí tổng hợp⁷.
- Dữ liệu hiển thị theo ba lớp: tóm tắt nội bộ theo scope; nội dung/tệp/lịch
  sử cần thiết cho người có quan hệ; dữ liệu nhạy cảm/audit chỉ người được
  cấp đặc biệt. PI và reviewer không xem nhật ký thao tác của bản ghi.
  Search/count/facet/export dùng cùng filter.
- Audit bất biến cho create/update/soft-delete, chuyển trạng thái, phân công (kể cả
  tự giao CV theo mảng), delegation, truy cập/tải tệp nhạy cảm, từng bước tờ trình
  (lập/chuyển/trả/duyệt/ký), quyết định, chỉnh sửa sau nộp, mở lại, rút hồ sơ, liên
  kết hồ sơ và thay đổi tài khoản/role/scope.

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
TP/CV mở đợt tiếp nhận
  → PI tạo bản nháp
  → PI sửa và nộp
  → Hệ thống tự giao CV theo mảng (không khớp: TP giao)
  → TB/CV kiểm tra đầy đủ
  → (bổ sung/chỉnh sửa sau nộp nếu cần)
  → TP/TB/CV mời phản biện/hội đồng; tờ trình hội đồng → GĐ/PGĐ-KH ký
  → Phản biện/hội đồng chấm và gửi
  → TP/TB/CV tổng hợp, CV lập tờ trình → TB rà soát → TP duyệt
  → GĐ phê duyệt/từ chối đề tài và kinh phí
  → CV tạo đề tài và xác nhận PI/thành viên
  → Theo dõi mốc, báo cáo, điều chỉnh/gia hạn (tờ trình → GĐ/PGĐ-KH ký)
  → Nộp kết quả
  → Nghiệm thu (hội đồng do GĐ/PGĐ-KH ký thành lập)
  → Thanh lý (chỉ GĐ ký)
  → Đóng/lưu trữ
```

Các luồng phụ bắt buộc: tạo/quản lý hồ sơ nhà khoa học; liên kết tài khoản;
tạo user external; phân công/thu hồi; trả tờ trình về tác giả; delegation; rút hồ
sơ; quá hạn; xung đột lợi ích; khóa tài khoản; xem/tải tệp; thông báo; audit.

# 7. Quy tắc thay đổi baseline

Mọi thay đổi role, scope, relationship, workflow state, decision authority,
disclosure, versioning hoặc retention phải:

1. cập nhật tài liệu này và `docs/permission-matrix.md` trong cùng change set;
2. cập nhật contract/fixture trong `packages/permissions` nếu chạm authorization;
3. bổ sung acceptance tests cho đường cho phép và đường bị từ chối;
4. ghi rõ migration/compatibility impact trước khi code.


## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](contracts/researcher-profile-access.md) is the current
source of truth for this feature, including API/data fields, credential delivery,
migration compatibility and history retention; its role list is pending the 10-role
sync, and role rules here and in `permission-matrix.md` win on conflict.

- QT (platform) and TP¹/CV¹ (unit scope) manage internal/external profiles
  independently of Accounts, including academic/contact information,
  position, military rank, expertise, publications and self-reported project
  history (title, role, Academy/institutional/Ministry/other level, dates, status,
  notes). Profile activation and account activation remain separate actions.
- Every role except QT has a scientific CV and self-updates it through My Profile.
- Account provisioning creates linked `PENDING_ACTIVATION` researcher accounts:
  INTERNAL profiles provision by default with required email; EXTERNAL profiles
  provision only when the manager checks `Tạo tài khoản truy cập hệ thống`.
- Activation uses hashed single-use tokens, expires exactly after 48 hours and
  sends only a setup-password link. No temporary password is generated, emailed,
  persisted, returned to staff or placed in audit.
- Login accepts either configured username or account email. Username is optional
  at provisioning, unique when set later by the linked user in My Profile,
  and never inferred from email.
- My Profile uses the active Account's current link. Only own personal/scientific
  fields and own username are editable; type, status, linkage, email credential
  destination and role/scope remain administrative.
- Profile/link/account/activation/username/account-status audit is preserved with
  safe transactional change facts.
