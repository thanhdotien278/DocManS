# Yêu cầu hệ thống DocManS / RTMS

**Tên hệ thống:** DocManS (Research Topic Management System - RTMS)
**Đơn vị sử dụng:** Học viện Quân y
**Phiên bản tài liệu:** 2.0
**Ngày cập nhật:** 27/08/2026
**Trạng thái:** Yêu cầu hợp nhất cho Phase 1

## 1. Mục đích và nguồn chuẩn

DocManS là ứng dụng web nội bộ quản lý vòng đời đề xuất nghiên cứu, đề tài đã
được phê duyệt và các nghiệp vụ quản lý khoa học liên quan. Hệ thống thay thế
việc theo dõi phân tán bằng bảng tính, email, tệp rời và xử lý thủ công.

Tài liệu này là bản tóm tắt yêu cầu để định hướng sản phẩm, UX, kiến trúc,
triển khai và nghiệm thu. Các tài liệu sau là nguồn chi tiết và có hiệu lực:

1. [`docs/authorization-core-business-baseline.md`](docs/authorization-core-business-baseline.md): nguồn quyết định mới nhất về vai trò, phạm vi, workflow, disclosure và audit.
2. [`docs/permission-matrix.md`](docs/permission-matrix.md): ma trận quyền theo hành động, bản ghi và trạng thái.
3. [`docs/user-flows.md`](docs/user-flows.md): chuỗi nghiệp vụ và trạng thái cốt lõi để thiết kế flow.
4. [`docs/ux-design-guidelines.md`](docs/ux-design-guidelines.md): yêu cầu UX/UI và accessibility.
5. [`_bmad-output/prd.md`](_bmad-output/prd.md): PRD, FR/NFR, user journey và acceptance criteria.
6. [`_bmad-output/epics.md`](_bmad-output/epics.md): backlog chuẩn gồm 12 Epic và các FR tương ứng.
7. [`_bmad-output/project-context.md`](_bmad-output/project-context.md), [`_bmad-output/architecture.md`](_bmad-output/architecture.md) và [`_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md`](_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md): ràng buộc kỹ thuật và contract thực thi.

Khi có mâu thuẫn, baseline phân quyền và contract kỹ thuật nêu trên được ưu
tiên. Nội dung trong thư mục `_bmad-output/archive/` chỉ là lịch sử, không dùng
làm nguồn yêu cầu hiện hành.

## 2. Mục tiêu và kết quả cần đạt

- Số hóa trọn quy trình từ mở đợt tiếp nhận, nộp đề xuất, đánh giá, phê duyệt,
  theo dõi thực hiện đến nghiệm thu.
- Làm rõ trạng thái, người chịu trách nhiệm, việc tiếp theo, hạn xử lý và điểm
  nghẽn của từng hồ sơ.
- Bảo đảm mọi dữ liệu, hành động, tệp và quyết định quan trọng có thể truy vết.
- Cung cấp dashboard, hàng đợi công việc, nhắc hạn và báo cáo đúng phạm vi
  quyền.
- Quản lý thống nhất seminar, nghiên cứu sinh viên, văn bản liên quan, hội đồng,
  hồ sơ đạo đức và hồ sơ nhà khoa học.

Chỉ tiêu Phase 1 theo PRD:

- 100% chỉ số dashboard không làm lộ dữ liệu ngoài phạm vi người dùng.
- 100% hành động workflow quan trọng có thể kiểm chứng qua audit/UAT.
- Tối thiểu 95% nhắc việc đến hạn hoặc quá hạn được tạo và gửi đúng rule trong
  giai đoạn kiểm thử và triển khai sớm.
- Mục tiêu cải thiện độ đầy đủ hồ sơ, thời gian lập báo cáo và tỷ lệ đúng hạn
  được thiết lập baseline trong pilot/UAT.

## 3. Phạm vi Phase 1

### 3.1 Chức năng trong MVP

1. **Tiếp nhận và phê duyệt đề xuất nghiên cứu (OMS):** đợt tiếp nhận, bản
   nháp, kiểm tra, bổ sung, nộp lại, phân công đánh giá, chấm điểm, tổng hợp,
   phê duyệt và từ chối.
2. **Theo dõi và nghiệm thu đề tài:** tạo đề tài từ đề xuất đã duyệt, mốc tiến
   độ, báo cáo, chậm hạn, điều chỉnh, gia hạn, hồ sơ nghiệm thu và kết quả cuối.
3. **Seminar và nghiên cứu sinh viên:** hoạt động đã được phê duyệt, kế hoạch,
   mốc, điều chỉnh, tài liệu, kinh phí dạng metadata, sản phẩm và kết quả.
4. **Giao việc:** công việc độc lập hoặc gắn với hồ sơ, phân công, phối hợp,
   hạn, ưu tiên, tiến độ, minh chứng và cảnh báo quá hạn.
5. **Dashboard, tìm kiếm, báo cáo và xuất dữ liệu:** dashboard theo vai trò,
   hàng đợi cần xử lý, drill-down, lọc theo quyền, Excel/PDF.
6. **Văn bản liên quan:** văn bản quản trị, pháp lý, kế hoạch, đề xuất, đề tài,
   seminar và hội đồng; metadata, hiệu lực, phiên bản và liên kết hồ sơ.
7. **Hội đồng và hồ sơ đạo đức:** kế hoạch hội đồng, thành viên, hồ sơ đạo đức,
   kiểm tra đầy đủ, phân công, đánh giá, tổng hợp và trình quyết định.
8. **Hồ sơ nhà khoa học:** định danh học thuật, đơn vị, chuyên môn, liên kết tài
   khoản, quan hệ tham gia, lịch sử, tìm kiếm và kiểm toán.
9. **Nền tảng dùng chung:** xác thực nội bộ, tài khoản, vai trò, đơn vị, phân
   quyền, tệp, lịch sử, audit, thông báo và nhắc việc.

### 3.2 Ngoài phạm vi Phase 1

- Cổng tự đăng ký hoặc tự nộp hồ sơ công khai từ Internet.
- SSO, LDAP, OIDC, MFA và tích hợp định danh bên ngoài.
- Ký số hoặc tích hợp phê duyệt số bên ngoài.
- SMS.
- Microservices, Kubernetes, workflow engine.
- Elasticsearch/OpenSearch.
- Phân hệ tài chính chuyên sâu hoặc tích hợp tài chính bên ngoài.
- Ứng dụng mobile riêng; web responsive là đủ.

Các nội dung trên có thể là hướng phát triển sau khi có quyết định mới được
phê duyệt.

## 4. Người dùng và mô hình vai trò

### 4.1 System role cấp tài khoản

Mỗi tài khoản chỉ có **một system role đang hoạt động tại một thời điểm**.
System role quyết định phạm vi điều hướng và nền tảng; không tự cấp quyền trên
mọi hồ sơ.

| System role | Trách nhiệm chính | Giới hạn bắt buộc |
| --- | --- | --- |
| `SYSTEM_ADMIN` | Tài khoản, role, đơn vị/scope, danh mục nền tảng, cấu hình và truy vết vận hành | Không mặc nhiên xem/sửa dữ liệu nghiệp vụ, đánh giá, phê duyệt hoặc mở lại hồ sơ |
| `SCIENTIFIC_MANAGEMENT_HEAD` | Xem tất cả proposal/project trong scope Quản lý khoa học được cấp; theo dõi chuyên viên phụ trách, chưa phân công, khối lượng, trạng thái và hạn | Không đồng nghĩa lãnh đạo phê duyệt; quyền xem không tự cấp action quản trị |
| `SCIENTIFIC_MANAGEMENT_STAFF` | Vận hành proposal/project được phân công quản lý; đợt và hồ sơ nhà khoa học theo capability/scope riêng | Không có visibility toàn Học viện; không dùng participation để cấp quyền quản lý; không quyết định cuối |
| `LEADERSHIP_APPROVAL_AUTHORITY` | Xem hồ sơ được trình và phê duyệt/từ chối theo thẩm quyền | Không sửa nội dung, bỏ qua đánh giá hoặc quyết định hồ sơ mình tham gia |
| `RESEARCH_OVERSIGHT_AUTHORITY` | Deputy Director: institutional research oversight plus internal researcher capabilities through record relationships | Explicit institutional scopes; read-only oversight; no final decisions |
| `RESEARCHER_INTERNAL_USER` | Khi là PI: tạo/sửa/nộp đề xuất và phản hồi bổ sung; ngoài ra tham gia đề tài hoặc review theo quan hệ | Không xem hồ sơ không liên quan hoặc quyết định cuối |
| `EXTERNAL_RESEARCHER_USER` | Xem hồ sơ liên quan và thực hiện review hoặc đóng góp đề tài/task khi có assignment rõ ràng | Không tạo/sửa/nộp đề xuất, đổi PI/team/kinh phí/mục tiêu/trạng thái hoặc quyết định |

### 4.2 Quan hệ theo từng bản ghi

Các vai trò sau không phải system role; chúng chỉ có hiệu lực trong đúng hồ sơ,
đề tài, hội đồng, assignment hoặc task được ghi nhận:

- PI (`PROPOSAL_PI` for a proposal, `TOPIC_PI` for an approved topic).
- Team proposal/topic (`TOPIC_SECRETARY`, `TOPIC_MEMBER`); a proposal PI is
  derived from `ownerId` and is never duplicated as a team row.
- Reviewer, thành viên hội đồng, reviewer hồ sơ đạo đức.
- Người được giao task.
- `PROPOSAL_MANAGEMENT_OFFICER` / `PROJECT_MANAGEMENT_OFFICER`: tối đa một
  Staff phụ trách chính đang hiệu lực trên mỗi proposal/project; giữ lịch sử và
  audit khi phân công, chuyển hoặc thu hồi, kiểm soát cả request cạnh tranh.

Quan hệ có trạng thái, thời gian hiệu lực, người tạo/thu hồi và audit. Các quan
hệ cộng dồn quyền theo từng bản ghi, nhưng không có khái niệm “vai trò cao nhất”
để thay thế các quan hệ khác.

Staff có thể truy cập hồ sơ không do mình quản lý qua PI/member/secretary/reviewer/
council/task hợp lệ; backend phải thể hiện lý do truy cập và chỉ cấp capability của
quan hệ đó. Thu hồi quản lý không thu hồi quan hệ độc lập, nhưng chấm dứt management
visibility/action. Head có bộ lọc/nhóm theo officer và chưa phân công, chỉ số workload,
trạng thái/hạn; count, drill-down và export dùng cùng tập hồ sơ được phép.

Head phân công/chuyển/thu hồi officer, đọc tổng hợp của Staff và trình gói hoàn tất.
Director có giám sát và quyết định cuối khi đủ điều kiện, không có xung đột; Deputy có
năng lực nghiên cứu nội bộ theo quan hệ và giám sát chỉ đọc, không có quyết định cuối.
Phạm vi triển khai hiện tại và funding metadata tuân theo baseline §2.1; backend dự án,
council establishment, dashboard/reporting chưa tồn tại không được mô tả là đã triển khai.

## 5. Nguyên tắc phân quyền và quản trị

- Backend là nguồn quyết định cuối và kiểm tra quyền trước detail, list, search,
  count, facet, dashboard, reports/export, notification, files và workflow/business history.
- Quyền được quyết định bởi system role, organization scope, quan hệ/assignment,
  workflow state, applicable delegation contract và conflict; thiếu hoặc mơ hồ
  context thì fail closed.
- Head xem tất cả proposal/project trong scope được cấp; Staff chỉ có management
  visibility trên hồ sơ có officer assignment hiện hành. Scope cha/con không tự kế thừa.
- Mỗi bản ghi có đúng một đơn vị quản lý chính. Cùng đơn vị, cùng chức danh hoặc
  có quan hệ ở bản ghi khác không tự mở quyền.
- Đợt tiếp nhận có phạm vi `Toàn Học viện` hoặc `Chọn đơn vị`; mặc định là toàn
  Học viện. Chỉ đơn vị nằm trong phạm vi mới được tạo/nộp đề xuất.
- Participant (PI/thành viên/thư ký nhóm) không đồng thời quản lý, phản biện,
  đánh giá/nghiệm thu, tham gia hội đồng đánh giá/nghiệm thu hoặc quyết định cuối
  cùng hồ sơ. Reviewer không quyết định cuối cùng vòng; vị trí loại trừ trong cùng
  hội đồng không được kiêm nhiệm. Kiểm tra khi tạo/thay đổi quan hệ ở cả hai phía
  và tại protected action.
- Tạo, nộp và nộp lại proposal chỉ do PI hiện tại có system role
  `RESEARCHER_INTERNAL_USER` thực hiện; không có delegation input hoặc
  capability mở rộng cho các hành động này. Delegation ở domain khác (nếu
  contract cho phép) vẫn phải bị giới hạn theo record, action, thời hạn, lý do,
  phê duyệt và thu hồi.
- Tài khoản inactive/locked và quan hệ inactive/expired/revoked mất quyền ngay;
  lịch sử không bị xóa.
- Không xóa cứng bản ghi nghiệp vụ, phiên bản, quan hệ, quyết định, tệp dùng để
  thẩm định hoặc audit.

### 5.1 Disclosure và versioning

Trước trạng thái công bố được cấu hình, PI, đồng nghiên cứu viên, thành viên và
thư ký không được thấy danh tính reviewer, điểm thô, nhận xét nội bộ hoặc dữ
liệu tổng hợp đánh giá. Sau quyết định cuối chỉ được thấy summary được policy
cho phép. Quy tắc này áp dụng đồng nhất cho detail, list, tệp, export,
notification, dashboard, search và history.

Mọi phiên bản đã nộp, review, quyết định và tệp dùng để thẩm định được giữ
nguyên. Chỉnh sửa sau nộp tạo revision mới; không ghi đè bản đã khóa.

### 5.2 Audit bắt buộc

Audit append-only phải ghi actor, thời điểm UTC, đối tượng, action, correlation
context, kết quả quyết định và before/after đã redacted khi phù hợp. Tối thiểu
phải audit:

- đăng nhập, đăng xuất, đổi mật khẩu, reset mật khẩu;
- tạo/cập nhật/xóa mềm và thay đổi tài khoản, role, scope, quan hệ;
- nộp, nộp lại, yêu cầu bổ sung, rút, chỉnh sửa sau nộp, mở lại hồ sơ;
- phân công/thu hồi reviewer, hội đồng và task; delegation chỉ được audit khi
  một domain có contract cho phép;
- chấm điểm, nhận xét, tổng hợp, phê duyệt/từ chối, nghiệm thu;
- upload, thay thế, xem/tải tệp quan trọng;
- thay đổi trạng thái và các hành động workflow quan trọng khác.

## 6. Yêu cầu chức năng

### 6.1 Identity, tài khoản, danh mục và hồ sơ nhà khoa học

- Quản trị viên tạo, cập nhật, kích hoạt, vô hiệu hóa và khóa tài khoản; gán
  đúng một system role đang hoạt động và đơn vị/scope.
- Người dùng xác thực bằng tài khoản/mật khẩu nội bộ; được đổi mật khẩu;
  reset có kiểm soát và mọi thay đổi được audit.
- Quản lý danh mục đơn vị, lĩnh vực, loại đề xuất, trạng thái, ưu tiên, loại báo
  cáo/sản phẩm, mẫu biểu, checklist, tiêu chí chấm và tham số cần cho Phase 1.
- Người có thẩm quyền tạo/cập nhật/kích hoạt/ngừng hoạt động hồ sơ nhà khoa học,
  phát hiện/gộp trùng theo quyền, liên kết tối đa một account hiện hành với mỗi hồ
  sơ (một account không liên kết nhiều hồ sơ) và duy trì lịch sử tham gia.
- Hồ sơ inactive không được nhận assignment mới; lịch sử quan hệ cũ vẫn giữ.

### 6.2 Tiếp nhận, nộp, đánh giá và phê duyệt đề xuất

- Nhân sự quản lý khoa học tạo/mở/đóng đợt tiếp nhận, cấu hình thời gian, phạm
  vi, bộ hồ sơ bắt buộc, biểu mẫu và điều kiện.
- PI nội bộ tạo bản nháp trong đợt phù hợp, nhập thông tin có cấu trúc, upload
  tệp, kiểm tra readiness, lưu nháp và nộp chính thức.
- Hệ thống kiểm tra trường bắt buộc, điều kiện tệp, ghi thời điểm nộp và khóa
  phiên bản đã nộp.
- Nhân sự quản lý khoa học kiểm tra hồ sơ, yêu cầu bổ sung có
  lý do và hạn; PI xem yêu cầu, sửa và nộp lại.
- Nhân sự quản lý phân công reviewer/hội đồng sau conflict check; reviewer chỉ
  xem đúng gói được giao, nhập điểm/nhận xét/kiến nghị và gửi để khóa kết quả.
- Nhân sự quản lý theo dõi tiến độ và tổng hợp; lãnh đạo/approval authority xem
  lịch sử, kết quả, tệp liên quan và quyết định theo workflow.
- Hành động sau nộp như rút, chỉnh sửa hoặc mở lại phải dùng request/action
  riêng, không cập nhật trực tiếp trạng thái để bypass.

### 6.3 Theo dõi và nghiệm thu đề tài

Golden Flow 4 is specified in the [Project Execution contract](docs/contracts/project-execution.md).
It preserves project-scoped `TOPIC_PI` (the requested `PROJECT_PI`). Assigned Staff
reviews/accepts reports and finally approves/rejects normal adjustments; Head finally
approves/rejects extensions after Staff validation/preparation. Leadership approves
the source proposal only and has permitted read/monitor access during execution.
Submitted revisions/evidence are immutable; overdue is derived, never a project state.
Assigned proposal Staff creates; Head independently assigns project Staff, who confirms
setup. Controlled fields change only through the appropriate approved request.
Acceptance/council implementation belongs to the next flow.

- Nhân sự quản lý tạo và xác nhận hồ sơ đề tài từ đề xuất đã duyệt, kế thừa dữ
  liệu cần thiết nhưng không tự động sinh record ngoài quy trình.
- Quản lý mốc tiến độ, kỳ báo cáo, tỷ lệ hoàn thành, khó khăn, minh chứng và
  cảnh báo chậm tiến độ.
- PI nộp báo cáo định kỳ, hồ sơ điều chỉnh/gia hạn và hồ sơ kết quả cuối; thành
  viên chỉ cập nhật phần được giao.
- Assigned project Staff reviews/accepts reports and reviews/finally decides normal
  adjustments. Staff validates/prepares extensions; Head finally decides extensions.
  Leadership approves the proposal before execution and monitors permitted project
  information only. Acceptance authority remains the separate next workflow.
- Phân công hội đồng/reviewer nghiệm thu, nhập nhận xét/kết quả, lưu biên bản,
  quyết định và sản phẩm cuối.

### 6.4 Seminar và nghiên cứu sinh viên

- Tạo hoặc import hoạt động đã được phê duyệt.
- Quản lý kế hoạch, mốc, điều chỉnh, văn bản, metadata kinh phí, sản phẩm,
  kết quả và lịch sử.
- Áp dụng cùng nguyên tắc scope, quan hệ, tệp, notification, audit và báo cáo.

### 6.5 Task và khu “Của tôi”

- Tạo task độc lập hoặc liên kết đề xuất, đề tài, báo cáo, cuộc họp hay event.
- Gán người chủ trì/phối hợp, hạn, ưu tiên, mô tả, trạng thái, tiến độ, ghi chú
  và minh chứng.
- Hiển thị task sắp hạn/quá hạn; không tự động từ chối, đóng hoặc chuyển workflow
  nghiệp vụ chỉ vì quá hạn.
- Khu “Của tôi” hợp nhất hồ sơ sở hữu, hồ sơ tham gia, quan hệ thư ký, review,
  task và hành động chờ xử lý; mỗi mục vẫn được backend authorize độc lập.

### 6.6 Văn bản, tệp, lịch sử và audit

- Đăng ký và liên kết văn bản quản trị/pháp lý/kế hoạch với hồ sơ liên quan;
  quản lý metadata, hiệu lực, version context và thay thế.
- Tệp luôn gắn bản ghi; upload, view, download, replace và soft delete đều kiểm
  tra quyền ở thời điểm thực hiện.
- Lưu uploader, thời điểm, loại, dung lượng, bản ghi liên quan và lịch sử version;
  không ghi đè tệp đã dùng thẩm định/nghiệm thu.
- Hiển thị workflow history và business history theo đúng disclosure policy.

### 6.7 Hội đồng và hồ sơ đạo đức

- Quản lý kế hoạch hội đồng, thành viên, vai trò, tài liệu, lịch và biên bản.
- Tiếp nhận hồ sơ đạo đức, kiểm tra đầy đủ, yêu cầu bổ sung, phân công reviewer,
  chấm/nhận xét, tổng hợp và trình quyết định.
- Thư ký chỉ thực hiện hành động hành chính được cấp; không tự chấm hoặc ra
  quyết định nếu không có assignment/authority riêng.

### 6.8 Thông báo, dashboard, tìm kiếm và báo cáo

- Gửi notification trong hệ thống và email cho assignment, yêu cầu bổ sung,
  thay đổi trạng thái, phê duyệt, hạn sắp đến và quá hạn.
- Dashboard theo vai trò phải ưu tiên việc cần xử lý, hồ sơ chờ, rủi ro, đề tài
  chậm, báo cáo/hội đồng/y đức đến hạn và chỉ số theo đơn vị/lĩnh vực.
- Tìm kiếm/lọc theo mã, tên, chủ nhiệm, đơn vị, lĩnh vực, trạng thái, đợt, hạn,
  người phụ trách; mọi kết quả, count, facet và export dùng cùng authorization.
- Xuất Excel/PDF cho các báo cáo nghiệp vụ cốt lõi, bảo toàn bộ lọc và quyền.

## 7. Trạng thái và luồng chuẩn

### 7.1 Đề xuất

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

### 7.2 Đề tài

```text
Chuẩn bị triển khai
  → Đang thực hiện
  → Tạm dừng ↔ Đang thực hiện
  → Chờ nghiệm thu
  → Đã nghiệm thu | Không đạt
  → Đóng/lưu trữ
```

Quá hạn là cờ theo dõi/nhắc việc, không tự chuyển trạng thái. Luồng chuẩn là:

```text
Mở đợt → PI tạo/nộp → kiểm tra → bổ sung nếu cần → phân công đánh giá
→ reviewer gửi kết quả → quản lý tổng hợp → lãnh đạo quyết định
→ quản lý tạo/xác nhận đề tài → theo dõi → nộp kết quả → nghiệm thu
→ đóng/lưu trữ
```

## 8. UX, accessibility và trải nghiệm responsive

- Giao diện institutional admin, ưu tiên dữ liệu và thao tác; kế thừa màu nhận
  diện Học viện Quân y, không dùng decoration làm lu mờ nghiệp vụ.
- Layout gồm sidebar, topbar, tìm kiếm, notification, thông tin user/role và
  breadcrumb cho trang chi tiết.
- Responsive tại tối thiểu 360/390/430/768/1024/1440px; mobile một cột, bảng
  dùng card hoặc scroll trong container, không tạo scroll ngang toàn trang.
- Dashboard, form, danh sách và chi tiết phải có loading, empty, error, inline
  validation, xác nhận cho thao tác quan trọng và hướng dẫn bước tiếp theo.
- Trạng thái không được truyền đạt chỉ bằng màu; phải có nhãn text/icon.
- Các luồng chính đạt mục tiêu WCAG AA: label/accessibility name, focus state,
  keyboard navigation, screen-reader feedback, paste không bị chặn và vùng bấm
  mobile khoảng 44px.
- UI hiển thị quan hệ của người đang xem với hồ sơ; action bị chặn do conflict
  phải hiện disabled kèm lý do, không ẩn im lặng.
- UI lấy `allowedActions`, `blockedActions` và denial reason từ capability
  response của backend; không suy diễn quyền từ system role.

## 9. Yêu cầu phi chức năng và kiến trúc

- Phase 1 dùng modular monolith, một codebase và module nghiệp vụ tách biệt;
  business logic nằm ở backend service/domain, không chỉ ở controller/frontend.
- Stack chuẩn: Next.js/React/TypeScript; NestJS/TypeScript; PostgreSQL/Prisma;
  Redis cho cache/queue/background jobs; MinIO S3-compatible cho binary file;
  Tailwind CSS; ExcelJS; `pdfmake` hoặc Puppeteer; Nginx; Docker Compose.
- PostgreSQL là source of truth; Redis chỉ là hạ tầng hỗ trợ và có thể tái tạo.
  Mọi thay đổi schema dùng Prisma migration.
- API REST-style qua HTTPS/Nginx, có structured error envelope, DTO validation
  ở boundary và business validation trong service.
- 95% list/detail/common actions đáp ứng trong 2 giây; dashboard trong 3 giây;
  search/filter chính trong 2 giây ở điều kiện vận hành Phase 1 bình thường.
- Mutation phải authorize và ghi dữ liệu trong cùng transaction hoặc kiểm tra
  context version nguyên tử; background job phải re-authorize trước side effect.
- PostgreSQL và MinIO phải backup định kỳ, có restore rehearsal; Redis không thay
  thế backup. Mục tiêu ban đầu: RPO 24 giờ, RTO một ngày làm việc.
- Luồng chính phải hỗ trợ kiểm thử bàn phím và accessibility; log ứng dụng,
  health check, job/queue, backup và storage/database phải có khả năng giám sát.

## 10. Tiêu chí nghiệm thu Phase 1

Phase 1 chỉ được coi là đạt khi controlled UAT hoặc test chứng minh được:

1. Tạo đợt, nộp đề xuất, kiểm tra/bổ sung, đánh giá, tổng hợp và quyết định theo
   đúng state machine.
2. Tạo/xác nhận đề tài đã duyệt, quản lý mốc/báo cáo, điều chỉnh/gia hạn và
   nghiệm thu có lịch sử, tệp và quyết định.
3. Seminar, nghiên cứu sinh viên, văn bản, hội đồng và hồ sơ đạo đức được quản
   lý trong phạm vi MVP và hiển thị trong báo cáo phù hợp.
4. Mỗi system role, quan hệ theo bản ghi, scope, conflict, applicable delegation,
   disclosure và tài khoản inactive được kiểm thử cả đường cho phép và từ chối.
5. List/search/count/facet/dashboard/export/notification/file không làm lộ dữ
   liệu ngoài quyền; reviewer và dữ liệu đánh giá nội bộ được che đúng policy.
6. Các hành động quan trọng tạo audit append-only; phiên bản và tệp đã khóa không
   bị ghi đè hoặc xóa cứng.
7. Dashboard và khu “Của tôi” hiển thị đúng việc cần xử lý, loại trừ item bị
   conflict và dẫn được tới hồ sơ nguồn.
8. UX responsive, validation, lỗi, focus, keyboard và status communication đạt
   checklist trong tài liệu UX.

## 11. Traceability với BMAD Epic

| Epic | Phạm vi |
| --- | --- |
| 1 | Truy cập hệ thống và quản trị phân quyền hợp nhất |
| 2 | Hồ sơ nhà khoa học và định danh quan hệ |
| 3 | Tệp nghiệp vụ, lịch sử và kiểm toán |
| 4 | Tiếp nhận và nộp đề xuất nghiên cứu |
| 5 | Kiểm tra, đánh giá và phê duyệt đề xuất |
| 6 | Theo dõi và nghiệm thu đề tài đã phê duyệt |
| 7 | Giao việc và theo dõi thực hiện |
| 8 | Quản lý seminar và nghiên cứu sinh viên |
| 9 | Quản lý văn bản liên quan |
| 10 | Hội đồng và hồ sơ đạo đức |
| 11 | Thông báo, nhắc việc và khu “Của tôi” |
| 12 | Dashboard, tìm kiếm, báo cáo và xuất dữ liệu |

Chi tiết FR, story, acceptance criteria và trạng thái triển khai tiếp tục được
quản lý tại `_bmad-output/prd.md`, `_bmad-output/epics.md` và thư mục
`_bmad-output/implementation-artifacts/`.


## Researcher Profile completion — 2026-09-15

[Researcher Profile / Account / My Profile contract](docs/contracts/researcher-profile-access.md) is the current
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
