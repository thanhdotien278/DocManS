---
stepsCompleted:
  - "step-01-validate-prerequisites"
  - "step-02-design-epics"
  - "step-03-create-stories"
  - "step-04-final-validation"
inputDocuments:
  - "/Users/Super/DocManS/_bmad-output/prd.md"
  - "/Users/Super/DocManS/_bmad-output/architecture.md"
  - "/Users/Super/DocManS/_bmad-output/project-context.md"
  - "/Users/Super/DocManS/docs/ux-design-guidelines.md"
project: "DocManSystem"
aliases:
  - "RTMS"
status: "complete"
created: "2026-04-27T23:59:00+0700"
updated: "2026-04-28T00:24:00+0700"
outputFile: "/Users/Super/DocManS/_bmad-output/epics-and-stories.md"
---

# DocManSystem - Phân Rã Epic

> **Lưu ý 2026-07-29:** Đây là ghi chú lịch sử, không còn là backlog chuẩn.
> Backlog đã hoàn thiện phân quyền và được BMAD kiểm tra nằm tại
> [`_bmad-output/epics.md`](../../_bmad-output/epics.md). Không triển khai trực
> tiếp từ nội dung cũ bên dưới.

## Tổng Quan

Tài liệu này cung cấp đầy đủ phân rã epic và story cho DocManSystem, chuyển các yêu cầu từ PRD, Architecture, Project Context và UX Design thành các story có thể triển khai.

Tài liệu này chứa các epic triển khai đã được duyệt và các story chi tiết, có thể kiểm thử để bàn giao theo từng giai đoạn.

## Danh Mục Yêu Cầu

### Yêu Cầu Chức Năng

FR1: Quản trị viên hệ thống có thể xác thực vào hệ thống và truy cập các năng lực cấu hình, hỗ trợ chỉ dành cho quản trị viên.

FR2: Hệ thống có thể quản lý phiên xác thực, trạng thái đăng nhập và luồng đăng xuất cho người dùng nội bộ.

FR3: Quản trị viên hệ thống có thể quản lý tài khoản người dùng, gồm tạo mới, kích hoạt, vô hiệu hóa và hỗ trợ gán vai trò.

FR4: Quản trị viên hệ thống có thể quản lý vai trò và ánh xạ quyền cần thiết cho vận hành giai đoạn 1.

FR5: Quản trị viên hệ thống có thể quản lý đơn vị tổ chức và ánh xạ người dùng vào phạm vi đơn vị để truy cập dữ liệu theo vai trò.

FR6: Hệ thống có thể thực thi phân quyền theo vai trò, phạm vi đơn vị và trạng thái trên proposal, project, task, file, dashboard và báo cáo.

FR7: Quản trị viên hệ thống có thể quản lý danh mục dùng chung cần cho workflow nghiệp vụ, gồm đơn vị tổ chức, lĩnh vực nghiên cứu, loại proposal, trạng thái, mức ưu tiên, loại báo cáo, loại sản phẩm, biểu mẫu, checklist và tiêu chí chấm điểm.

FR8: Quản trị viên hệ thống có thể cấu hình tham số hệ thống, mẫu thông báo và các thiết lập hỗ trợ workflow cần cho vận hành giai đoạn 1.

FR9: Chuyên viên quản lý khoa học có thể tạo và quản lý đợt tiếp nhận hồ sơ với mốc ngày, quy tắc áp dụng và bộ hồ sơ nộp bắt buộc.

FR10: Chủ nhiệm đề tài có thể tạo bản nháp proposal, lưu tiến độ và nộp proposal chính thức trong đợt tiếp nhận phù hợp.

FR11: Chủ nhiệm đề tài có thể nhập thông tin proposal có cấu trúc, gồm tên đề tài, lĩnh vực, đơn vị chủ trì, người tham gia, timeline, mục tiêu, tóm tắt nội dung và metadata kinh phí đề xuất.

FR12: Chủ nhiệm đề tài có thể tải lên các tệp đính kèm proposal và tài liệu hỗ trợ bắt buộc vào bản ghi proposal.

FR13: Hệ thống có thể kiểm tra dữ liệu proposal bắt buộc và điều kiện tệp bắt buộc trước khi nộp chính thức.

FR14: Hệ thống có thể ghi nhận lịch sử nộp proposal, gồm timestamp và thay đổi trạng thái nộp.

FR15: Chuyên viên quản lý khoa học có thể rà soát độ đầy đủ của proposal và yêu cầu bổ sung với lý do cùng hạn xử lý rõ ràng.

FR16: Chủ nhiệm đề tài có thể xem yêu cầu bổ sung, chỉnh sửa nội dung hoặc tệp đính kèm proposal và nộp lại proposal.

FR17: Chuyên viên quản lý khoa học có thể phân công reviewer hoặc thành viên hội đồng cho proposal theo workflow.

FR18: Reviewer và thành viên hội đồng có thể truy cập proposal được phân công và gửi điểm, nhận xét, kiến nghị.

FR19: Chuyên viên quản lý khoa học có thể theo dõi tiến độ review và tổng hợp kết quả đánh giá.

FR20: Lãnh đạo hoặc cấp có thẩm quyền phê duyệt có thể xem lịch sử proposal, kết quả đánh giá và tệp hỗ trợ trước khi ra quyết định.

FR21: Lãnh đạo hoặc cấp có thẩm quyền phê duyệt có thể phê duyệt, từ chối hoặc xử lý proposal theo quy tắc workflow.

FR22: Hệ thống có thể coi trạng thái proposal là các trạng thái được kiểm soát và giới hạn hành động theo trạng thái hiện tại của proposal.

FR23: Hệ thống có thể tạo bản ghi approved-project từ proposal đã duyệt trong khi vẫn bảo toàn dữ liệu nguồn liên quan.

FR24: Chuyên viên quản lý khoa học và người tham gia project được ủy quyền có thể định nghĩa, duy trì milestone project và checkpoint báo cáo theo kế hoạch.

FR25: Chủ nhiệm đề tài có thể nộp báo cáo tiến độ định kỳ và evidence hỗ trợ cho project đã duyệt.

FR26: Chuyên viên quản lý khoa học có thể rà soát báo cáo tiến độ project, yêu cầu follow-up khi cần và theo dõi vấn đề chưa xử lý.

FR27: Chủ nhiệm đề tài có thể gửi yêu cầu điều chỉnh hoặc gia hạn cho project đã duyệt.

FR28: Lãnh đạo hoặc chuyên viên được ủy quyền có thể rà soát và quyết định các hành động điều chỉnh, gia hạn, nghiệm thu và final review theo quy tắc workflow.

FR29: Hệ thống có thể xác định project chậm hạn, deadline sắp tới và project đang chờ hành động hành chính.

FR30: Hệ thống có thể coi trạng thái workflow của approved-project là các trạng thái được kiểm soát và giới hạn hành động theo trạng thái hiện tại của project.

FR30a: Thành viên project có thể xem các approved project mà họ tham gia, gồm trách nhiệm được giao, milestone liên quan và tệp hỗ trợ được phép xem.

FR30b: Thành viên project có thể tải lên tệp đóng góp hoặc evidence được phép trong phạm vi được cấp cho approved project.

FR31: Người dùng được ủy quyền có thể tạo task độc lập hoặc liên kết với proposal, approved project, báo cáo, cuộc họp hoặc sự kiện workflow.

FR32: Người dùng được ủy quyền có thể gán người chịu trách nhiệm task, cộng tác viên, hạn xử lý, mức ưu tiên và hướng dẫn mô tả.

FR33: Người được giao task và người dùng được ủy quyền có thể cập nhật trạng thái task, tiến độ, ghi chú và evidence hoàn thành.

FR34: Hệ thống có thể xác định và hiển thị task quá hạn và task sắp đến hạn.

FR35: Hệ thống có thể coi các trạng thái task liên quan là trạng thái workflow được kiểm soát khi quy tắc nghiệp vụ phụ thuộc vào chúng.

FR36: Người dùng được ủy quyền có thể upload, thay thế, xem và download file đính kèm bản ghi nghiệp vụ theo quy tắc phân quyền.

FR37: Hệ thống có thể lưu metadata file, gồm người upload, timestamp, bản ghi liên quan và ngữ cảnh truy vết khác cần cho nghiệp vụ.

FR38: Hệ thống có thể hiển thị lịch sử workflow và lịch sử bản ghi nghiệp vụ cho proposal, project, task và các quyết định liên quan.

FR39: Hệ thống có thể tạo audit-log cho các hành động nghiệp vụ quan trọng được định nghĩa trong PRD này.

FR40: Quản trị viên được ủy quyền và người dùng nghiệp vụ được ủy quyền có thể tra cứu thông tin audit hoặc history phù hợp với trách nhiệm và quyền của họ.

FR41: Hệ thống có thể tạo thông báo trong ứng dụng cho các sự kiện nghiệp vụ quan trọng như phân công, yêu cầu bổ sung, yêu cầu phê duyệt, đổi trạng thái và sự kiện liên quan deadline.

FR42: Hệ thống có thể gửi thông báo email cho sự kiện nghiệp vụ quan trọng và nhắc việc được định nghĩa trong phạm vi giai đoạn 1.

FR43: Hệ thống có thể sinh nhắc việc cho deadline sắp tới, báo cáo quá hạn, task quá hạn và hành động workflow đang chờ xử lý.

FR44: Hệ thống có thể hiển thị hàng đợi công việc riêng cho từng người dùng, gồm các mục đang chờ người dùng hiện tại xử lý.

FR45: Lãnh đạo và chuyên viên quản lý khoa học có thể truy cập dashboard theo vai trò, hiển thị phê duyệt đang chờ, project chậm hạn, task quá hạn, báo cáo sắp tới và chỉ số tổng hợp trong phạm vi được phép.

FR46: Người dùng có thể tìm kiếm và lọc proposal, project, task và báo cáo theo thuộc tính nghiệp vụ liên quan như mã, tiêu đề, đơn vị, lĩnh vực, trạng thái, người được giao, hạn xử lý và đợt tiếp nhận.

FR47: Hệ thống có thể cung cấp màn hình chi tiết có truy vết, kết nối chỉ báo dashboard và kết quả danh sách tới bản ghi workflow nguồn.

FR48: Người dùng được ủy quyền có thể xuất các danh sách và báo cáo được chỉ định ra Excel hoặc PDF theo nhu cầu nghiệp vụ và quy tắc phân quyền.

FR49: Hệ thống có thể tạo màn hình reporting và đầu ra tổng hợp theo phạm vi vai trò, theo đơn vị, lĩnh vực, trạng thái, kỳ báo cáo và các chiều hành chính liên quan.

### Yêu Cầu Phi Chức Năng

NFR1: Các màn hình danh sách đã xác thực, trang chi tiết và hành động workflow phổ biến phải trả kết quả người dùng nhìn thấy trong vòng 2 giây cho ít nhất 95 phần trăm request được đo trong điều kiện vận hành bình thường của giai đoạn 1.

NFR2: Màn hình dashboard phải hiển thị widget lõi và số liệu đếm trong vòng 3 giây cho ít nhất 95 phần trăm request được đo trong điều kiện vận hành bình thường của giai đoạn 1.

NFR3: Tương tác tìm kiếm và lọc trên các danh sách quản trị chính phải hoàn tất trong vòng 2 giây cho ít nhất 95 phần trăm request được đo trong điều kiện vận hành bình thường của giai đoạn 1.

NFR4: Các tác vụ nặng như export, batch nhắc việc và workload reporting suy diễn phải có tiến độ hiển thị, trạng thái trong hàng đợi hoặc phản hồi hoàn tất, và không được chặn xử lý request tương tác thông thường.

NFR5: Toàn bộ lưu lượng đã xác thực phải yêu cầu truyền tải mã hóa trong môi trường triển khai.

NFR6: Password, credential và secret liên quan phiên không bao giờ được lưu hoặc truyền dưới dạng plaintext trong luồng ứng dụng.

NFR7: Phân quyền phải được thực thi ở backend cho mọi thao tác được bảo vệ, gồm dashboard, báo cáo, tìm kiếm, export, hành động workflow, truy cập file và màn hình history.

NFR8: Hệ thống phải fail closed khi không thể xác định an toàn authorization scope, assignment scope hoặc ngữ cảnh quyền theo trạng thái.

NFR9: Bản ghi audit-log cho hành động quan trọng phải có thể được truy vấn bởi người dùng được ủy quyền trong sản phẩm hoặc tooling hỗ trợ vận hành.

NFR10: Các hành động workflow quan trọng như nộp hồ sơ, yêu cầu bổ sung, quyết định phê duyệt, đổi trạng thái task và thao tác liên kết file trọng yếu phải hoặc hoàn tất thành công với thay đổi trạng thái nhất quán, hoặc thất bại mà không lưu một phần trạng thái nghiệp vụ.

NFR11: Các luồng nhắc việc, thông báo và xử lý nền phải an toàn khi retry, không gây trạng thái không nhất quán và nên tránh tạo kết quả nghiệp vụ trùng lặp khi cùng một trigger được xử lý lại.

NFR12: Các bản ghi nghiệp vụ quan trọng phải hỗ trợ xóa mềm ở nơi quy tắc sản phẩm định nghĩa.

NFR13: Mọi thay đổi schema phải được version hóa qua Prisma migration và xác thực bằng cách chạy migration trong môi trường development hoặc test được kiểm soát.

NFR14: Các workflow lõi của giai đoạn 1 phải đáp ứng kỳ vọng WCAG AA về label, focus nhìn thấy được, điều hướng bàn phím, truyền đạt trạng thái dễ đọc và phản hồi lỗi.

NFR15: Phiên bản responsive của các workflow lõi phải giữ hành vi accessibility, không coi accessibility là yêu cầu chỉ dành cho desktop.

NFR16: Truyền đạt trạng thái không được chỉ phụ thuộc vào màu sắc mà phải có text hoặc icon bổ trợ.

NFR17: Giải pháp giai đoạn 1 phải giữ ranh giới modular-monolith để các mảng nghiệp vụ chính vẫn tách bạch được trong code, kiểm thử và review.

NFR18: Logic nghiệp vụ phải nằm tập trung trong các lớp service backend thay vì phân tán qua controller hoặc luồng chỉ ở frontend.

NFR19: Code mới được đưa vào theo PRD này phải giữ TypeScript strictness, DTO validation rõ ràng và naming domain minh bạch.

NFR20: Chức năng mới phải được triển khai theo cách hỗ trợ kiểm thử, review và rollback ở kích thước story mà không cần refactor rộng các phần không liên quan.

### Yêu Cầu Bổ Sung

- Story triển khai đầu tiên phải khởi tạo Nx workspace với frontend Next.js, backend NestJS và các package TypeScript dùng chung.
- Giai đoạn 1 phải giữ kiến trúc modular monolith với ranh giới domain rõ ràng; không dùng microservices hoặc Kubernetes.
- Frontend và backend nên là các app có thể deploy riêng trong cùng một repository và một đơn vị bàn giao phối hợp.
- API backend nên theo nhóm route domain kiểu REST dưới `/api/v1/<domain-module>/...`.
- Dùng PostgreSQL làm nguồn dữ liệu chính, với thay đổi schema được quản lý bằng Prisma migration.
- Dùng Redis cho cache, queue, reminder job và điều phối notification.
- Dùng MinIO làm object store tương thích S3 phía sau files module.
- Dùng Docker Compose và Nginx cho triển khai giai đoạn 1 và reverse proxy.
- Workflow proposal, approved-project và task phải dùng domain operation rõ ràng theo kiểu state-machine thay vì sửa field tùy ý.
- Logic nghiệp vụ phải nằm trong backend service, không nằm trong controller.
- Shared package nên cung cấp contracts, validation, permissions, domain types và UI tokens ở nơi có reuse thực sự.
- Authorization phải kết hợp kiểm tra theo role, organization-scope, assignment-scope và state-based trong luồng ứng dụng backend.
- Audit logging phải được ghi trong cùng use case ứng dụng nơi thay đổi trạng thái nghiệp vụ.
- Reminder và notification job phải dùng cấu trúc payload nhất quán và cơ chế bảo vệ idempotency.
- Aggregate dashboard và reporting luôn phải scope-aware và được dẫn xuất từ backend query service.
- Xử lý ngày giờ phải lưu theo UTC và dùng ranh giới API ISO 8601.
- Naming database nên dùng `snake_case`, segment route API nên dùng kebab-case, và code TypeScript nên dùng tên domain rõ ràng.
- Việc hiển thị metadata file nhạy cảm và quyền download file phải được kiểm tra permission ở mọi lần truy cập.
- Baseline monitoring nên gồm structured logs, health checks, khả năng quan sát queue/job và monitoring dịch vụ storage/database.
- Chính sách backup và recovery nên được thêm như một mối quan tâm kiến trúc hỗ trợ trong giai đoạn lập kế hoạch triển khai.

### Yêu Cầu Thiết Kế UX

UX-DR1: UI phải giữ phong cách admin-dashboard của Học viện Quân y, dùng xanh đậm làm hướng thị giác chính với nền trắng, xanh xám nhạt và điểm nhấn vàng tiết chế.

UX-DR2: Sản phẩm phải tránh phong cách SaaS kiểu startup, gradient mạnh, glassmorphism, khu vực hero trang trí, icon emoji và hình ảnh trang trí không phục vụ nghiệp vụ.

UX-DR3: Typography phải dùng font sans-serif thực dụng, đồng bộ với website học viện khi có thể; text nội dung nên dễ đọc trong khoảng `14px` đến `16px`.

UX-DR4: Application shell phải dùng sidebar trên desktop, topbar có tìm kiếm, notification, ngữ cảnh tài khoản và vai trò hiện tại, đồng thời bắt buộc có breadcrumb ở các trang chi tiết quan trọng.

UX-DR5: Layout phải responsive ngay từ đầu và hỗ trợ rõ các kích thước `360px`, `390px`, `430px`, `768px`, `1024px` và `1440px`.

UX-DR6: Trên mobile và tablet, navigation sidebar phải chuyển thành drawer, bottom navigation hoặc pattern giới hạn tương đương không che nội dung.

UX-DR7: Các bảng nghiệp vụ dày đặc vẫn phải usable khi responsive: desktop ưu tiên bảng đầy đủ, tablet ẩn cột phụ, mobile dùng danh sách dạng card hoặc cuộn ngang trong container, không gây tràn ngang toàn trang.

UX-DR8: Mọi màn hình danh sách chính phải hỗ trợ tìm kiếm từ khóa, bộ lọc liên quan vai trò, sắp xếp, quick actions và trạng thái loading, empty, error rõ ràng.

UX-DR9: Form dài phải được chia thành các section rõ ràng như thông tin chung, người tham gia, lịch trình, metadata kinh phí, nội dung domain, tệp đính kèm và lịch sử xử lý.

UX-DR10: Lỗi validation form phải hiển thị inline gần field liên quan, và hành động quan trọng phải có feedback loading, success và error rõ ràng.

UX-DR11: Hành động quan trọng như submit, approve, reject, request supplement và xóa phải yêu cầu xác nhận với hậu quả được nêu rõ.

UX-DR12: Form dài trên mobile nên dùng sticky primary action bar khi cần, với vùng chạm gần `44px` và không nhồi nhét nhóm hành động ngang.

UX-DR13: Màn hình chi tiết nhiều workflow phải hiển thị trạng thái hiện tại cùng timeline hoặc stepper context và lịch sử xử lý dễ đọc, không giấu truy vết trong overlay khó tìm.

UX-DR14: Item history nên liên kết trực tiếp comment, điểm, tệp đính kèm và quyết định với milestone xử lý liên quan.

UX-DR15: UI quản lý file phải hiển thị tên file, loại, dung lượng, người upload, thời điểm upload, trạng thái upload, trạng thái lỗi/retry và các action hiển thị có điều kiện theo permission.

UX-DR16: Workflow file nên hỗ trợ preview khi được phép và hiển thị version hoặc replacement history cho tài liệu quan trọng.

UX-DR17: Widget dashboard và KPI card phải ưu tiên tính hành động hơn trang trí, hiển thị item đang chờ, việc chậm, task quá hạn và chỉ số tổng hợp với mức độ khẩn rõ ràng.

UX-DR18: Card dashboard nên dùng nền sáng, border tiết chế và điểm nhấn màu trạng thái; chart nên chủ yếu dùng palette xanh thương hiệu và dành đỏ/vàng cho cảnh báo.

UX-DR19: Search và navigation phải hỗ trợ quay lại nhanh từ màn hình chi tiết về danh sách và dashboard, có bộ lọc đang áp dụng nhìn thấy được và drill-down trực tiếp từ tín hiệu dashboard tới màn hình bản ghi đã lọc.

UX-DR20: Cách trình bày trạng thái không bao giờ được chỉ dựa vào màu, mà luôn phải kết hợp màu với nhãn text hoặc icon.

UX-DR21: Accessibility cho các workflow lõi phải đạt WCAG AA, gồm label, trạng thái focus nhìn thấy được, control semantic, điều hướng bàn phím, hỗ trợ `aria-live` hoặc tương đương cho cập nhật async, và hỗ trợ `prefers-reduced-motion`.

UX-DR22: Thiết kế mobile và tablet phải được coi là first-class, không có màn hình nào bị coi là “desktop-only” đối với workflow dashboard, danh sách, chi tiết, phê duyệt, nộp hồ sơ, task hoặc cập nhật tiến độ.

UX-DR23: Nên ưu tiên pattern và component UI tái sử dụng giữa các module; chỉ thêm component mới khi nó phục vụ được nhiều màn hình tương tự.

### Bản Đồ Bao Phủ FR

FR1: Epic 1 - Xác thực truy cập nội bộ
FR2: Epic 1 - Quản lý phiên đăng nhập và đăng xuất
FR3: Epic 1 - Quản lý tài khoản người dùng
FR4: Epic 1 - Quản lý vai trò và quyền
FR5: Epic 1 - Quản lý đơn vị và phạm vi dữ liệu
FR6: Epic 1 - Nền tảng phân quyền role/scope/state
FR7: Epic 1 - Danh mục dùng chung
FR8: Epic 1 - Cấu hình hệ thống và mẫu thông báo
FR9: Epic 2 - Quản lý đợt tiếp nhận
FR10: Epic 2 - Tạo nháp và nộp hồ sơ
FR11: Epic 2 - Nhập dữ liệu đề xuất có cấu trúc
FR12: Epic 2 - Đính kèm tệp hồ sơ đề xuất
FR13: Epic 2 - Kiểm tra điều kiện trước khi nộp
FR14: Epic 2 - Lịch sử nộp hồ sơ
FR15: Epic 3 - Yêu cầu bổ sung
FR16: Epic 3 - Chỉnh sửa và nộp lại sau bổ sung
FR17: Epic 3 - Phân công reviewer/hội đồng
FR18: Epic 3 - Chấm điểm, nhận xét, kiến nghị
FR19: Epic 3 - Theo dõi tiến độ đánh giá và tổng hợp
FR20: Epic 3 - Xem hồ sơ đầy đủ trước phê duyệt
FR21: Epic 3 - Phê duyệt hoặc từ chối
FR22: Epic 3 - State machine vòng đời proposal
FR23: Epic 4 - Tạo approved project từ proposal đã duyệt
FR24: Epic 4 - Milestone và checkpoint báo cáo
FR25: Epic 4 - Báo cáo tiến độ định kỳ
FR26: Epic 4 - Theo dõi và phản hồi báo cáo tiến độ
FR27: Epic 4 - Yêu cầu điều chỉnh/gia hạn
FR28: Epic 4 - Quyết định điều chỉnh, nghiệm thu, final review
FR29: Epic 4 - Cảnh báo trễ hạn và chờ xử lý
FR30: Epic 4 - State machine vòng đời approved project
FR30a: Epic 4 - Quyền xem của thành viên project
FR30b: Epic 4 - Nộp evidence trong phạm vi được cấp
FR31: Epic 5 - Tạo công việc
FR32: Epic 5 - Phân công công việc
FR33: Epic 5 - Cập nhật trạng thái và bằng chứng hoàn thành
FR34: Epic 5 - Cảnh báo quá hạn/sắp hạn công việc
FR35: Epic 5 - State machine công việc
FR36: Epic 5 - Quản lý file nghiệp vụ
FR37: Epic 5 - Metadata và truy vết file
FR38: Epic 5 - Lịch sử xử lý nghiệp vụ
FR39: Epic 5 - Audit log hành động quan trọng
FR40: Epic 5 - Tra cứu history/audit theo thẩm quyền
FR41: Epic 6 - Thông báo trong ứng dụng
FR42: Epic 6 - Thông báo email
FR43: Epic 6 - Nhắc hạn tự động
FR44: Epic 6 - Hàng đợi việc chờ xử lý
FR45: Epic 7 - Dashboard theo vai trò
FR46: Epic 7 - Tìm kiếm và lọc
FR47: Epic 7 - Drill-down tới bản ghi nguồn
FR48: Epic 7 - Xuất Excel/PDF
FR49: Epic 7 - Reporting theo phạm vi được phép

## Danh Sách Epic

### Epic 1: Nền Tảng Truy Cập, Phân Quyền, Danh Mục Và Khung Ứng Dụng
Thiết lập nền tảng vận hành nội bộ để người dùng có thể đăng nhập, được áp quyền đúng vai trò và phạm vi dữ liệu, quản trị được dữ liệu nền, và sử dụng khung giao diện quản trị nhất quán cho các nghiệp vụ phía sau.
**FR được bao phủ:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8

### Epic 2: Tiếp Nhận Và Nộp Hồ Sơ Đề Tài
Cho phép chuyên viên mở đợt tiếp nhận và chủ nhiệm đề tài tạo, hoàn thiện, đính kèm, kiểm tra và nộp hồ sơ đề xuất trong một quy trình đầy đủ và có thể truy vết.
**FR được bao phủ:** FR9, FR10, FR11, FR12, FR13, FR14

### Epic 3: Bổ Sung, Đánh Giá Và Phê Duyệt Đề Tài
Cho phép các bên liên quan xử lý đầy đủ vòng đời thẩm định đề xuất từ yêu cầu bổ sung đến phân công đánh giá, chấm điểm, tổng hợp và phê duyệt/từ chối theo trạng thái được kiểm soát.
**FR được bao phủ:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22

### Epic 4: Theo Dõi Đề Tài Được Duyệt Và Tiến Độ Thực Hiện
Biến đề tài được duyệt thành hồ sơ triển khai thực tế với milestone, báo cáo định kỳ, điều chỉnh/gia hạn, nghiệm thu và giám sát tiến độ theo workflow rõ ràng.
**FR được bao phủ:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR30a, FR30b

### Epic 5: Giao Việc, Tệp Tin, Lịch Sử Và Audit
Hỗ trợ vận hành xuyên suốt bằng giao việc, cập nhật trạng thái, quản lý file, truy vết lịch sử và audit log để tăng trách nhiệm giải trình ở tất cả các module chính.
**FR được bao phủ:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40

### Epic 6: Thông Báo, Nhắc Việc Và Hàng Đợi Công Việc
Đảm bảo người dùng luôn biết việc gì cần xử lý qua thông báo trong ứng dụng, email, nhắc hạn và hàng đợi công việc theo đúng vai trò và phạm vi dữ liệu.
**FR được bao phủ:** FR41, FR42, FR43, FR44

### Epic 7: Dashboard Điều Hành, Tìm Kiếm, Báo Cáo Và Xuất Dữ Liệu
Cung cấp lớp điều hành và ra quyết định cho lãnh đạo và chuyên viên thông qua dashboard theo vai trò, tìm kiếm/lọc, báo cáo tổng hợp và export có kiểm soát.
**FR được bao phủ:** FR45, FR46, FR47, FR48, FR49

## Epic 1: Nền Tảng Truy Cập, Phân Quyền, Danh Mục Và Khung Ứng Dụng

Thiết lập nền tảng kỹ thuật và nghiệp vụ tối thiểu để các epic sau có thể triển khai an toàn trên cùng một workspace, cùng mô hình phân quyền và cùng khung UX quản trị.

### Story 1.1: Khởi tạo workspace và ứng dụng nền tảng

Là đội triển khai,
tôi muốn có một Nx workspace chuẩn hóa với web, api và shared packages,
để các story sau có thể được bàn giao nhất quán theo kiến trúc đã duyệt.

**Giá trị nghiệp vụ:** Tạo nền kỹ thuật thống nhất ngay từ đầu, giảm rủi ro drift kiến trúc và cho phép triển khai các story sau theo mô hình modular monolith đã duyệt.

**Phạm vi:** Khởi tạo Nx workspace; tạo ứng dụng Next.js và NestJS; tạo packages nền cho contracts, validation, permissions, ui-tokens; thiết lập TypeScript strict, lint/test/build scripts, Docker Compose skeleton, Nginx skeleton, app shell cơ bản.

**Ngoài phạm vi:** Chưa triển khai nghiệp vụ auth, chưa tạo toàn bộ schema domain, chưa triển khai màn hình nghiệp vụ chi tiết.

**Tiêu chí chấp nhận:**

**Cho trước** repository rỗng hoặc chưa có cấu trúc triển khai
**Khi** story hoàn thành
**Thì** repository có Nx workspace với `apps/web`, `apps/api`, và shared packages theo architecture
**Và** web và api có thể chạy ở chế độ development với health check hoặc trang placeholder

**Cho trước** workspace đã được khởi tạo
**Khi** developer chạy build và test nền tảng
**Thì** các lệnh build/lint/test cơ bản chạy được
**Và** TypeScript strict mode được bật cho các app và package mới

**Cho trước** UX guideline và project context
**Khi** app shell nền tảng được tạo
**Thì** shell sử dụng hướng dashboard hành chính với sidebar, topbar, breadcrumb placeholder
**Và** responsive shell hoạt động ở các breakpoint chính

**Ghi chú kỹ thuật:** Đây là story đầu tiên theo yêu cầu architecture; chỉ tạo entity/config khi cần cho nền tảng; chuẩn hóa naming, route conventions, environment strategy, CI-friendly scripts.

**Yêu cầu phân quyền:** Chưa có nghiệp vụ phân quyền chi tiết nhưng phải chuẩn bị sẵn hook/boundary cho backend auth, permission, current-user context.

**Yêu cầu audit log:** Không yêu cầu audit log nghiệp vụ; có thể có structured app logging cho khởi động/health diagnostics.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Xác nhận cấu trúc thư mục phù hợp architecture
- Chạy được web app và api app ở local
- Xác nhận shell responsive ở `360px`, `768px`, `1440px`
- Xác nhận TypeScript strict và lệnh build cơ bản hoạt động

### Story 1.2: Đăng nhập, đăng xuất và quản lý phiên nội bộ

Là người dùng nội bộ,
tôi muốn đăng nhập và đăng xuất an toàn,
để tôi chỉ truy cập được các chức năng nội bộ được bảo vệ và được gán cho mình.

**Giá trị nghiệp vụ:** Mở cổng truy cập an toàn cho toàn bộ hệ thống nội bộ và là tiền đề cho mọi luồng nghiệp vụ có bảo vệ.

**Phạm vi:** Mô hình user nền tảng, lưu trữ credential an toàn, form đăng nhập, luồng đăng xuất, xử lý session/token, middleware bảo vệ route, endpoint auth backend, và user context cơ bản trong shell.

**Ngoài phạm vi:** Chưa có quản trị tài khoản phức tạp, chưa có reset password nâng cao, chưa tích hợp SSO hoặc định danh bên ngoài.

**Tiêu chí chấp nhận:**

**Cho trước** người dùng nội bộ hợp lệ
**Khi** họ nhập đúng thông tin đăng nhập
**Thì** hệ thống tạo phiên xác thực hợp lệ
**Và** người dùng được chuyển vào khu vực nội bộ phù hợp

**Cho trước** người dùng nhập sai thông tin
**Khi** gửi yêu cầu đăng nhập
**Thì** hệ thống từ chối truy cập với thông báo lỗi an toàn
**Và** không tiết lộ chi tiết nhạy cảm về tài khoản

**Cho trước** người dùng đã đăng nhập
**Khi** họ đăng xuất
**Thì** phiên truy cập bị vô hiệu hóa
**Và** các route được bảo vệ không còn truy cập được nếu không đăng nhập lại

**Ghi chú kỹ thuật:** Ưu tiên local auth cho giai đoạn 1; fail closed; bảo vệ secret; chuẩn bị extensibility cho SSO trong tương lai nhưng không triển khai ở story này.

**Yêu cầu phân quyền:** Chỉ người dùng đã xác thực mới truy cập khu vực nội bộ; route protection phải được enforce ở backend và web middleware phù hợp.

**Yêu cầu audit log:** Ghi audit log cho `login` và `logout` với actor, timestamp, kết quả và context tối thiểu.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Kiểm tra login thành công và logout thành công
- Kiểm tra login sai bị từ chối
- Kiểm tra route protected không truy cập được khi chưa đăng nhập
- Kiểm tra audit log login/logout được tạo

### Story 1.3: Quản lý người dùng, vai trò và phạm vi đơn vị

Là quản trị viên hệ thống,
tôi muốn quản lý người dùng, vai trò và gán phạm vi đơn vị,
để quyền truy cập được cấp đúng trên toàn bộ các module nghiệp vụ.

**Giá trị nghiệp vụ:** Tạo năng lực vận hành hệ thống thực tế bằng cách kiểm soát ai làm gì và thấy dữ liệu nào.

**Phạm vi:** CRUD có kiểm soát cho user, kích hoạt/vô hiệu hóa tài khoản, gán role, bản ghi organization/unit, UI/API gán scope, danh sách và bộ lọc quản trị cơ bản.

**Ngoài phạm vi:** Chưa triển khai ma trận permission tinh chỉnh cho từng action business nhỏ; chưa có nhập hàng loạt nâng cao.

**Tiêu chí chấp nhận:**

**Cho trước** quản trị viên đã đăng nhập
**Khi** tạo tài khoản mới và gán role cùng đơn vị
**Thì** người dùng mới xuất hiện trong danh sách quản trị
**Và** các gán role/scope được lưu đầy đủ

**Cho trước** tài khoản đang hoạt động
**Khi** quản trị viên vô hiệu hóa tài khoản
**Thì** tài khoản không thể tiếp tục truy cập luồng được bảo vệ
**Và** trạng thái tài khoản được hiển thị rõ trong UI quản trị

**Cho trước** một người dùng có role và organization scope cụ thể
**Khi** user context được nạp
**Thì** hệ thống có thể xác định role và data scope hiện hành của người dùng
**Và** context đó sẵn sàng cho enforcement ở các story sau

**Ghi chú kỹ thuật:** Tạo entity nền tối thiểu: user, role, organizations, bảng assignment; tránh tạo trước các bảng không cần; chuẩn hóa seed/dev data tối thiểu nếu cần.

**Yêu cầu phân quyền:** Chỉ quản trị viên hệ thống mới được quản trị user/role/scope; backend phải chặn mọi truy cập trái phép vào admin endpoints.

**Yêu cầu audit log:** Ghi audit log cho tạo/cập nhật/activate/deactivate user, gán role, gán scope.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo, sửa, vô hiệu hóa người dùng
- Gán role và organization scope
- Kiểm tra user bị disable không đăng nhập được
- Kiểm tra audit log cho thay đổi quản trị

### Story 1.4: Permission primitives, danh mục dùng chung và cấu hình nền

Là quản trị viên hệ thống,
tôi muốn danh mục dùng chung và cấu hình nền được quản lý trong hệ thống,
để các workflow phía sau có thể dùng dữ liệu tham chiếu và thiết lập thông báo được kiểm soát.

**Giá trị nghiệp vụ:** Loại bỏ phụ thuộc vào dữ liệu cứng trong code và cho phép các quy trình nghiệp vụ dùng chung cùng một bộ dữ liệu nền tin cậy.

**Phạm vi:** Lớp permission primitives; quản lý catalog cho lĩnh vực nghiên cứu, loại proposal, mức ưu tiên, loại báo cáo và tiêu chí chấm điểm cơ bản; khung mẫu notification; tham số hệ thống nền; danh sách/form quản trị tái sử dụng.

**Ngoài phạm vi:** Không triển khai nghiệp vụ đầy đủ workflow phụ thuộc vào từng catalog; không làm workflow engine cấu hình động.

**Tiêu chí chấp nhận:**

**Cho trước** quản trị viên cần dữ liệu tham chiếu
**Khi** thêm hoặc cập nhật bản ghi catalog được hỗ trợ
**Thì** hệ thống lưu được dữ liệu tham chiếu hợp lệ
**Và** dữ liệu này sẵn sàng để được dùng ở các module nghiệp vụ sau

**Cho trước** quản trị viên cần cấu hình mẫu thông báo hoặc tham số nền
**Khi** cập nhật cấu hình được hỗ trợ
**Thì** cấu hình được lưu và tra cứu được từ backend
**Và** việc cập nhật không yêu cầu sửa mã nguồn

**Cho trước** backend cần kiểm tra quyền hành động
**Khi** permission primitives được gọi
**Thì** chúng có thể kết hợp role, scope, và state context theo quy ước thống nhất
**Và** trả về kết quả fail closed khi context không đủ

**Ghi chú kỹ thuật:** Gắn chặt với FR6, FR7, FR8 và các NFR bảo mật; chuẩn bị tái sử dụng admin UI theo UX guideline.

**Yêu cầu phân quyền:** Chỉ quản trị viên hệ thống truy cập catalog/config management; permission primitives phải là cơ chế dùng chung cho các epic sau.

**Yêu cầu audit log:** Ghi audit log cho tạo/cập nhật/xóa mềm bản ghi catalog và cập nhật tham số hệ thống/templates.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo và cập nhật ít nhất một loại catalog
- Cập nhật ít nhất một system parameter hoặc mẫu notification
- Kiểm tra permission primitives xử lý trường hợp context thiếu
- Kiểm tra audit log cho thay đổi catalog/config

## Epic 2: Tiếp Nhận Và Nộp Hồ Sơ Đề Tài

Cho phép vận hành trọn vẹn bước đầu của quy trình: mở đợt tiếp nhận, tạo hồ sơ đề xuất, nhập nội dung, đính kèm file, kiểm tra điều kiện và nộp chính thức.

### Story 2.1: Tạo và quản lý đợt tiếp nhận đề tài

Là chuyên viên quản lý khoa học,
tôi muốn tạo và quản lý các đợt tiếp nhận hồ sơ,
để việc nộp hồ sơ được kiểm soát theo khung thời gian và quy tắc bộ hồ sơ bắt buộc.

**Giá trị nghiệp vụ:** Đặt khung thời gian và luật nộp hồ sơ rõ ràng cho toàn bộ quy trình intake.

**Phạm vi:** CRUD đợt tiếp nhận, trạng thái mở/đóng, ngày hiệu lực, quy tắc áp dụng cơ bản, định nghĩa bộ hồ sơ bắt buộc ở mức tối thiểu, danh sách và bộ lọc đợt tiếp nhận.

**Ngoài phạm vi:** Chưa xử lý workflow đánh giá/phê duyệt; chưa có rule engine phức tạp.

**Tiêu chí chấp nhận:**

**Cho trước** chuyên viên quản lý khoa học có quyền phù hợp
**Khi** tạo đợt tiếp nhận với ngày bắt đầu, ngày kết thúc và yêu cầu hồ sơ
**Thì** đợt tiếp nhận được lưu với trạng thái hợp lệ
**Và** có thể được dùng để nhận proposal sau đó

**Cho trước** một đợt tiếp nhận đang mở
**Khi** đến sau ngày kết thúc hoặc bị đóng thủ công
**Thì** hệ thống không cho nộp mới vào đợt đó
**Và** trạng thái đợt tiếp nhận hiển thị rõ ràng

**Ghi chú kỹ thuật:** Tạo entity intake period và cấu trúc requirement package chỉ ở mức cần cho submission flow; tránh over-design.

**Yêu cầu phân quyền:** Chỉ staff được ủy quyền hoặc admin mới quản lý intake periods; PI chỉ được xem các đợt tiếp nhận áp dụng cho họ.

**Yêu cầu audit log:** Ghi audit log cho tạo/cập nhật/open/close intake period.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo đợt tiếp nhận mới
- Đóng/mở đợt tiếp nhận
- Kiểm tra không nộp được vào đợt đã đóng
- Kiểm tra audit log tương ứng

### Story 2.2: Tạo nháp hồ sơ đề xuất và nhập thông tin có cấu trúc

Là chủ nhiệm đề tài,
tôi muốn tạo và lưu bản nháp proposal với dữ liệu có cấu trúc,
để tôi có thể chuẩn bị hồ sơ nộp hoàn chỉnh qua nhiều phiên làm việc.

**Giá trị nghiệp vụ:** Giảm rủi ro mất dữ liệu và cho phép chủ nhiệm hoàn thiện hồ sơ theo từng bước thực tế.

**Phạm vi:** Tạo proposal draft; form chia section cho tên đề tài, lĩnh vực, đơn vị chủ trì, người tham gia, timeline, mục tiêu, tóm tắt và metadata kinh phí; lưu nháp; placeholder chi tiết/history cơ bản.

**Ngoài phạm vi:** Chưa nộp chính thức; chưa xử lý yêu cầu bổ sung; chưa chấm điểm.

**Tiêu chí chấp nhận:**

**Cho trước** một PI có quyền nộp hồ sơ trong đợt hợp lệ
**Khi** họ tạo hồ sơ nháp và nhập dữ liệu bắt buộc
**Thì** proposal draft được lưu
**Và** có thể mở lại để chỉnh sửa tiếp

**Cho trước** form hồ sơ dài
**Khi** người dùng thao tác trên desktop hoặc mobile
**Thì** form được chia section rõ ràng
**Và** vẫn sử dụng được ở các breakpoint yêu cầu mà không tràn ngang toàn trang

**Cho trước** dữ liệu không hợp lệ ở một trường
**Khi** người dùng rời trường hoặc gửi lưu
**Thì** lỗi hiển thị inline gần trường sai
**Và** không làm mất dữ liệu hợp lệ đã nhập

**Ghi chú kỹ thuật:** Bao phủ mạnh UX-DR9, UX-DR10, UX-DR12; ưu tiên section clarity và save draft.

**Yêu cầu phân quyền:** Chỉ PI hoặc người được cấp quyền thay mặt mới tạo/sửa draft của proposal thuộc scope hợp lệ; staff chỉ đọc khi workflow cho phép.

**Yêu cầu audit log:** Ghi audit log cho tạo proposal draft và các cập nhật quan trọng nếu đã lưu thay đổi có ý nghĩa nghiệp vụ.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo proposal draft mới
- Lưu nháp nhiều lần
- Kiểm tra validation inline
- Kiểm tra responsive form ở `390px`, `768px`, `1440px`

### Story 2.3: Đính kèm hồ sơ đề xuất và kiểm tra điều kiện trước khi nộp

Là chủ nhiệm đề tài,
tôi muốn tải lên tệp đính kèm bắt buộc và xem trạng thái sẵn sàng nộp,
để tôi biết proposal của mình đã có thể nộp chính thức hay chưa.

**Giá trị nghiệp vụ:** Giảm hồ sơ thiếu thành phần và tăng tỷ lệ nộp đúng ngay lần đầu.

**Phạm vi:** Upload file đính kèm proposal, kiểm tra loại/dung lượng file, UI metadata tệp đính kèm, kiểm tra độ đầy đủ của file bắt buộc, panel trạng thái sẵn sàng nộp.

**Ngoài phạm vi:** Chưa hỗ trợ replace/version history nâng cao ngoài mức cần cho việc nộp hồ sơ; chưa xử lý supplement cycle.

**Tiêu chí chấp nhận:**

**Cho trước** proposal draft yêu cầu tệp bắt buộc
**Khi** PI tải tệp hợp lệ lên
**Thì** tệp được liên kết đúng với proposal
**Và** UI hiển thị tên tệp, loại, dung lượng, người upload, thời điểm tải

**Cho trước** tệp không hợp lệ về loại hoặc dung lượng
**Khi** người dùng tải lên
**Thì** hệ thống từ chối tệp
**Và** hiển thị lỗi rõ ràng, không mơ hồ

**Cho trước** proposal draft chưa đủ dữ liệu hoặc tệp bắt buộc
**Khi** hệ thống đánh giá mức sẵn sàng
**Thì** người dùng nhìn thấy rõ các mục còn thiếu
**Và** chưa thể nộp chính thức khi điều kiện chưa đạt

**Ghi chú kỹ thuật:** Bắt đầu dùng files module theo chiều dọc proposal; enforcement permission cho upload/xem file là bắt buộc.

**Yêu cầu phân quyền:** Chỉ PI hoặc người được ủy quyền mới upload file vào draft của họ; backend luôn kiểm tra liên kết bản ghi và quyền truy cập.

**Yêu cầu audit log:** Ghi audit log cho upload file quan trọng.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Upload tệp hợp lệ
- Từ chối tệp sai loại/sai dung lượng
- Kiểm tra metadata file hiển thị
- Kiểm tra panel mức sẵn sàng phản ánh đúng thiếu sót

### Story 2.4: Nộp hồ sơ chính thức và xem lịch sử nộp

Là chủ nhiệm đề tài,
tôi muốn nộp chính thức proposal đã chuẩn bị và xem lịch sử nộp,
để proposal đi vào workflow tiếp nhận được kiểm soát với các thay đổi trạng thái có thể truy vết.

**Giá trị nghiệp vụ:** Chuyển hồ sơ từ trạng thái chuẩn bị sang quy trình chính thức có quản trị và truy vết.

**Phạm vi:** Hành động submit, chuyển trạng thái có kiểm soát từ draft sang submitted, hộp thoại xác nhận, entry history/timeline của lần nộp, bảo vệ read-only sau khi submit theo rule cơ bản.

**Ngoài phạm vi:** Chưa xử lý supplement requests; chưa phân công reviewer.

**Tiêu chí chấp nhận:**

**Cho trước** proposal draft đã đạt điều kiện sẵn sàng
**Khi** PI xác nhận nộp chính thức
**Thì** proposal chuyển sang trạng thái đã nộp
**Và** hệ thống ghi nhận timestamp cùng actor của lần nộp

**Cho trước** proposal chưa đủ điều kiện nộp
**Khi** PI cố nộp chính thức
**Thì** hệ thống từ chối chuyển trạng thái
**Và** chỉ ra các điều kiện còn thiếu

**Cho trước** proposal đã được nộp
**Khi** người dùng xem chi tiết proposal
**Thì** họ thấy timeline hoặc history của trạng thái nộp
**Và** các hành động chỉnh sửa trái phép bị chặn theo rule trạng thái

**Ghi chú kỹ thuật:** State transition phải là explicit domain operation; timeline UX cần rõ ràng theo UX-DR13/14.

**Yêu cầu phân quyền:** Chỉ PI/chủ sở hữu proposal được submit; các actor khác chỉ xem hoặc thao tác tùy theo role/state.

**Yêu cầu audit log:** Ghi audit log cho `submit proposal` và trạng thái liên quan.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Nộp hồ sơ đủ điều kiện thành công
- Chặn nộp khi thiếu dữ liệu hoặc thiếu file
- Kiểm tra history/timeline hiển thị lần nộp
- Kiểm tra audit log cho hành động submit

## Epic 3: Bổ Sung, Đánh Giá Và Phê Duyệt Đề Tài

Cho phép xử lý toàn bộ giai đoạn thẩm định đề xuất sau khi nộp chính thức, từ bổ sung đến quyết định phê duyệt.

### Story 3.1: Yêu cầu bổ sung và nộp lại hồ sơ

Là chuyên viên quản lý khoa học và chủ nhiệm đề tài,
tôi muốn tạo, nhận và xử lý yêu cầu bổ sung,
để proposal chưa đầy đủ có thể được chỉnh sửa trong workflow có thể truy vết.

**Giá trị nghiệp vụ:** Giảm việc xử lý ngoài hệ thống và tạo vòng phản hồi có deadline, lý do, và trạng thái rõ ràng.

**Phạm vi:** Staff gửi yêu cầu bổ sung với lý do và hạn xử lý; PI xem yêu cầu bổ sung; chỉnh sửa proposal và file liên quan; nộp lại sau bổ sung; cập nhật timeline/history.

**Ngoài phạm vi:** Chưa phân công reviewer; chưa phê duyệt cuối cùng.

**Tiêu chí chấp nhận:**

**Cho trước** proposal ở trạng thái phù hợp để kiểm tra tính đầy đủ
**Khi** staff gửi yêu cầu bổ sung với lý do và hạn xử lý
**Thì** proposal chuyển sang trạng thái chờ bổ sung
**Và** PI nhìn thấy nội dung yêu cầu cùng hạn phản hồi

**Cho trước** proposal đang chờ bổ sung
**Khi** PI cập nhật dữ liệu/tệp và nộp lại
**Thì** proposal chuyển sang trạng thái đã nộp lại hoặc tương đương
**Và** hệ thống giữ lại lịch sử yêu cầu bổ sung và lần nộp lại

**Cho trước** proposal không ở trạng thái cho phép bổ sung
**Khi** staff hoặc PI cố thao tác
**Thì** hệ thống từ chối thao tác
**Và** trạng thái không bị thay đổi sai

**Ghi chú kỹ thuật:** Bao phủ FR15, FR16, FR22; phải hỗ trợ lịch sử đa vòng nếu business cho phép, nhưng story có thể bắt đầu với một vòng chuẩn hóa tốt.

**Yêu cầu phân quyền:** Staff được quyền yêu cầu bổ sung trong scope của mình; PI chỉ phản hồi proposal của chính mình; reviewer/lãnh đạo không có quyền sửa nội dung proposal ở bước này.

**Yêu cầu audit log:** Ghi audit log cho `request supplement`, `cập nhật proposal`, `resubmit proposal`.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Gửi yêu cầu bổ sung
- PI xem yêu cầu và nộp lại
- Kiểm tra state transitions hợp lệ
- Kiểm tra audit log và timeline

### Story 3.2: Phân công reviewer và truy cập proposal theo phân công

Là chuyên viên quản lý khoa học,
tôi muốn phân công reviewer hoặc thành viên hội đồng cho proposal,
để công việc đánh giá được chuyển an toàn tới đúng người.

**Giá trị nghiệp vụ:** Tạo bước chuyển từ intake sang đánh giá có kiểm soát, tránh lộ hồ sơ ngoài phạm vi assignment.

**Phạm vi:** Bản ghi assignment, gán/gán lại reviewer trong rule cho phép, queue/danh sách proposal được phân công cho reviewer, hook notification khi phân công.

**Ngoài phạm vi:** Chưa nhập score/comments chi tiết; chưa tổng hợp kết quả.

**Tiêu chí chấp nhận:**

**Cho trước** proposal sẵn sàng cho đánh giá
**Khi** staff gán một hoặc nhiều reviewer/hội đồng
**Thì** phân công được lưu
**Và** chỉ những người được gán mới thấy proposal trong khu vực đánh giá của họ

**Cho trước** một reviewer không được phân công
**Khi** họ cố truy cập proposal không thuộc assignment
**Thì** hệ thống từ chối truy cập
**Và** không rò rỉ metadata nhạy cảm của proposal đó

**Cho trước** staff cần điều chỉnh phân công
**Khi** thay đổi phân công trong trạng thái hợp lệ
**Thì** assignment mới có hiệu lực
**Và** lịch sử assignment được lưu vết

**Ghi chú kỹ thuật:** Thực thi data-scope và assignment-scope là trọng tâm; tránh cho reviewer thấy proposal ngoài phân công.

**Yêu cầu phân quyền:** Chỉ staff hoặc role được phép mới gán/gán lại; reviewer chỉ xem các item được phân công.

**Yêu cầu audit log:** Ghi audit log cho `assign reviewer` và thay đổi phân công liên quan.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Gán reviewer thành công
- Reviewer được gán truy cập được
- Reviewer không được gán bị chặn
- Kiểm tra lịch sử và audit log phân công

### Story 3.3: Reviewer chấm điểm và gửi nhận xét

Là reviewer hoặc thành viên hội đồng,
tôi muốn gửi điểm, nhận xét và kiến nghị cho proposal được phân công,
để kết quả đánh giá có thể được tổng hợp theo cách được kiểm soát.

**Giá trị nghiệp vụ:** Số hóa bước đánh giá học thuật quan trọng nhất, giúp tổng hợp nhanh và có truy vết.

**Phạm vi:** Form review, chọn tiêu chí chấm điểm, lưu/gửi review, trạng thái review draft-vs-submitted nếu cần, reviewer chỉ truy cập review của chính mình, tệp đính kèm/comment ở mức tối thiểu nếu bắt buộc.

**Ngoài phạm vi:** Chưa tổng hợp nhiều review thành quyết định staff; chưa phê duyệt lãnh đạo.

**Tiêu chí chấp nhận:**

**Cho trước** reviewer được phân công proposal
**Khi** reviewer nhập score, comment, recommendation và gửi
**Thì** kết quả đánh giá được lưu gắn với proposal và reviewer đó
**Và** reviewer không thể ghi đè trái phép lên review của người khác

**Cho trước** score criteria hoặc trường bắt buộc còn thiếu
**Khi** reviewer cố submit
**Thì** hệ thống chặn submit
**Và** hiển thị lỗi rõ ràng gần trường liên quan

**Cho trước** reviewer đã submit review
**Khi** staff xem proposal
**Thì** staff thấy trạng thái hoàn thành đánh giá tương ứng
**Và** lịch sử xử lý thể hiện thời điểm gửi đánh giá

**Ghi chú kỹ thuật:** Bao phủ UX form validation, accessibility, khả năng hiển thị trạng thái; entity review chỉ tạo phần cần cho scoring/comments.

**Yêu cầu phân quyền:** Chỉ reviewer được gán mới tạo/sửa review của mình trong trạng thái cho phép; staff được đọc để tổng hợp; PI không được thấy nội dung review nếu policy chưa cho phép.

**Yêu cầu audit log:** Ghi audit log cho `submit score and review comment`.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Reviewer submit review hợp lệ
- Chặn submit khi thiếu score/comment bắt buộc
- Chặn reviewer truy cập/sửa review không thuộc họ
- Kiểm tra audit log và trạng thái completion

### Story 3.4: Theo dõi tiến độ đánh giá và tổng hợp kết quả

Là chuyên viên quản lý khoa học,
tôi muốn theo dõi mức độ hoàn thành review và tổng hợp kết quả đánh giá,
để proposal có thể chuyển hiệu quả tới bước quyết định phê duyệt.

**Giá trị nghiệp vụ:** Giảm theo dõi thủ công bằng bảng tính/email và tăng khả năng ra quyết định đúng hạn.

**Phạm vi:** Màn hình tiến độ review, trạng thái hoàn thành theo reviewer, entry tổng hợp kết quả đánh giá, marker sẵn sàng phê duyệt, queue proposal đang chờ quyết định.

**Ngoài phạm vi:** Chưa để lãnh đạo ra quyết định; chưa xử lý dashboard cấp cao toàn hệ thống.

**Tiêu chí chấp nhận:**

**Cho trước** proposal có nhiều phân công reviewer
**Khi** staff mở màn hình theo dõi đánh giá
**Thì** staff thấy reviewer nào đã hoàn thành/chưa hoàn thành
**Và** có thể nhận biết proposal nào đã sẵn sàng để tổng hợp

**Cho trước** đủ thông tin đánh giá
**Khi** staff nhập summary/consolidated outcome
**Thì** proposal được đánh dấu sẵn sàng cho bước phê duyệt
**Và** summary được lưu có truy vết người nhập

**Ghi chú kỹ thuật:** UX tập trung bảng/danh sách + status badges + quick actions; tối thiểu drilldown tới reviews.

**Yêu cầu phân quyền:** Chỉ staff trong scope phù hợp xem/tổng hợp; reviewer không được sửa consolidated outcome.

**Yêu cầu audit log:** Ghi audit log cho cập nhật tổng hợp đánh giá quan trọng.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Xem được tiến độ hoàn thành review
- Tạo consolidated outcome
- Kiểm tra marker mức sẵn sàng cho proposal
- Kiểm tra history/audit cho summary action

### Story 3.5: Phê duyệt hoặc từ chối proposal

Là lãnh đạo hoặc người dùng có thẩm quyền phê duyệt,
tôi muốn xem đầy đủ hồ sơ proposal và ra quyết định phê duyệt chính thức,
để proposal được chấp nhận có thể chuyển sang thực hiện project, còn proposal bị từ chối vẫn được truy vết.

**Giá trị nghiệp vụ:** Hoàn tất vòng đời proposal bằng quyết định có thẩm quyền, minh bạch và truy vết được.

**Phạm vi:** Màn hình quyết định phê duyệt với history proposal, kết quả review, file và summary tổng hợp; hành động approve/reject; chuyển trạng thái có kiểm soát; hộp thoại xác nhận; lịch sử quyết định.

**Ngoài phạm vi:** Chưa tạo bản ghi approved project; chưa xử lý project execution.

**Tiêu chí chấp nhận:**

**Cho trước** proposal ở trạng thái sẵn sàng phê duyệt
**Khi** lãnh đạo mở hồ sơ
**Thì** họ thấy đủ thông tin cần quyết định gồm history, reviews, file, summary
**Và** dữ liệu hiển thị vẫn tuân thủ quy tắc phân quyền

**Cho trước** lãnh đạo xác nhận approve hoặc reject
**Khi** gửi quyết định
**Thì** proposal chuyển sang trạng thái đích hợp lệ
**Và** quyết định được lưu cùng actor, timestamp, và ghi chú nếu có

**Cho trước** proposal chưa ở trạng thái cho phép quyết định
**Khi** người dùng cố approve/reject
**Thì** hệ thống từ chối thao tác
**Và** không cho phép bypass workflow state

**Ghi chú kỹ thuật:** Đây là story đóng vòng proposal; confirmation UX bắt buộc; fail closed nếu thiếu authority context.

**Yêu cầu phân quyền:** Chỉ cấp có thẩm quyền phê duyệt được quyết định; staff/reviewer/PI không được gọi action này ngoài quy tắc phân quyền.

**Yêu cầu audit log:** Ghi audit log cho `approve` và `reject`.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Approve proposal hợp lệ
- Reject proposal hợp lệ
- Chặn quyết định khi proposal chưa ở state đúng
- Kiểm tra history và audit log cho quyết định

## Epic 4: Theo Dõi Đề Tài Được Duyệt Và Tiến Độ Thực Hiện

Chuyển từ giai đoạn quyết định sang giai đoạn thực hiện của đề tài đã được duyệt và quản lý các vòng đời tiếp theo.

### Story 4.1: Khởi tạo hồ sơ đề tài thực hiện từ proposal đã duyệt

Là chuyên viên quản lý khoa học,
tôi muốn proposal đã duyệt trở thành bản ghi approved-project,
để việc thực hiện project có thể được theo dõi mà không phải nhập lại dữ liệu nguồn cốt lõi.

**Giá trị nghiệp vụ:** Bảo toàn dữ liệu nguồn và mở ra giai đoạn quản lý thực hiện ngay sau phê duyệt.

**Phạm vi:** Tạo approved-project từ proposal đã duyệt, copy/link dữ liệu nguồn liên quan, màn hình chi tiết project ban đầu, khả năng hiển thị cơ bản cho thành viên project.

**Ngoài phạm vi:** Chưa tạo milestone/reporting; chưa adjustment/final review.

**Tiêu chí chấp nhận:**

**Cho trước** proposal đã được phê duyệt
**Khi** hệ thống hoặc staff tạo approved project
**Thì** bản ghi approved-project được khởi tạo với dữ liệu nguồn liên quan
**Và** proposal và project liên kết truy vết được với nhau

**Cho trước** project đã được tạo
**Khi** PI hoặc thành viên project có quyền xem
**Thì** họ thấy thông tin cơ bản của project cùng liên kết nguồn gốc từ proposal
**Và** chỉ thấy trong phạm vi được phép

**Ghi chú kỹ thuật:** Tránh trùng lặp không cần thiết; ưu tiên link + snapshot chọn lọc.

**Yêu cầu phân quyền:** Chỉ staff hoặc backend workflow tự động tạo approved project; thành viên project chỉ xem nếu được gán.

**Yêu cầu audit log:** Ghi audit log cho tạo approved project.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo approved project từ proposal đã duyệt
- Kiểm tra dữ liệu nguồn được mang sang đúng
- Kiểm tra project link ngược về proposal
- Kiểm tra audit log tạo project

### Story 4.2: Quản lý milestone, checkpoint và thành viên đề tài

Là chuyên viên quản lý khoa học,
tôi muốn định nghĩa milestone, checkpoint báo cáo và khả năng hiển thị cho người tham gia,
để việc thực hiện project có lịch trình và cấu trúc trách nhiệm rõ ràng.

**Giá trị nghiệp vụ:** Thiết lập kế hoạch thực hiện và cơ chế theo dõi rõ ràng ngay khi project bắt đầu.

**Phạm vi:** CRUD milestone/checkpoint, gán member/role trong project nếu chưa đủ, timeline kế hoạch trong chi tiết project, chỉ báo hạn xử lý cơ bản.

**Ngoài phạm vi:** Chưa có nộp progress report thực tế; chưa reminder tự động.

**Tiêu chí chấp nhận:**

**Cho trước** approved project đã tồn tại
**Khi** staff cấu hình milestone và reporting checkpoints
**Thì** project lưu được các mốc theo thời gian
**Và** các mốc hiển thị rõ trong chi tiết project

**Cho trước** thành viên project thuộc project
**Khi** họ xem project trong phạm vi được cấp
**Thì** họ thấy các milestone liên quan và trách nhiệm cơ bản của mình
**Và** không thấy project ngoài phạm vi tham gia

**Ghi chú kỹ thuật:** Bao phủ FR24 và FR30a; milestone/status UX cần dễ quét trên desktop lẫn mobile.

**Yêu cầu phân quyền:** Staff quản lý milestone; member chỉ xem thông tin họ được cấp; leadership xem tùy scope.

**Yêu cầu audit log:** Ghi audit log cho tạo/cập nhật milestone và thay đổi thành viên dự án quan trọng.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo milestone/checkpoint
- Kiểm tra thành viên project thấy đúng project của mình
- Chặn member xem project không liên quan
- Kiểm tra audit log thay đổi mốc/kế hoạch

### Story 4.3: Nộp báo cáo tiến độ và evidence thực hiện

Là chủ nhiệm đề tài hoặc thành viên project được cấp quyền,
tôi muốn nộp báo cáo tiến độ và evidence hỗ trợ,
để tiến độ project được rà soát đúng lịch.

**Giá trị nghiệp vụ:** Số hóa bước báo cáo định kỳ, tạo đầu vào chuẩn cho giám sát tiến độ.

**Phạm vi:** Tạo progress report liên kết với checkpoint, upload file evidence, hỗ trợ file đóng góp của member trong scope được cấp, trạng thái báo cáo cơ bản, UX form báo cáo.

**Ngoài phạm vi:** Chưa xử lý adjustment request; chưa final review.

**Tiêu chí chấp nhận:**

**Cho trước** project có checkpoint đến hạn
**Khi** PI nộp progress report với evidence cần thiết
**Thì** báo cáo được lưu gắn với project và checkpoint
**Và** trạng thái báo cáo phản ánh đã nộp/chờ rà soát

**Cho trước** thành viên project được cấp quyền nộp evidence trong phạm vi giới hạn
**Khi** member upload contribution file
**Thì** evidence được chấp nhận và gắn đúng project/báo cáo context
**Và** member không thể nộp ra ngoài scope được cấp

**Cho trước** dữ liệu báo cáo hoặc file còn thiếu
**Khi** người dùng cố submit
**Thì** hệ thống chặn submit
**Và** chỉ ra rõ các thiếu sót

**Ghi chú kỹ thuật:** Bao phủ FR25 và FR30b; tái sử dụng patterns file/history; form báo cáo thân thiện trên mobile là bắt buộc.

**Yêu cầu phân quyền:** PI submit full báo cáo; member chỉ upload contribution/evidence theo quyền được cấp; staff đọc/soát trong scope.

**Yêu cầu audit log:** Ghi audit log cho tạo/cập nhật progress report và upload file quan trọng.

**Checklist kiểm thử hoặc xác minh thủ công:**
- PI nộp báo cáo tiến độ
- Member upload evidence hợp lệ trong scope
- Chặn upload ngoài scope
- Kiểm tra audit log và timeline báo cáo

### Story 4.4: Rà soát báo cáo tiến độ và theo dõi chậm hạn

Là chuyên viên quản lý khoa học,
tôi muốn rà soát báo cáo tiến độ đã nộp và phát hiện project chậm hạn,
để các vấn đề chưa xử lý và việc thực hiện quá hạn được nhìn thấy sớm.

**Giá trị nghiệp vụ:** Tăng khả năng giám sát chủ động thay vì chỉ phản ứng sau khi đề tài đã chậm sâu.

**Phạm vi:** Rà soát progress report, yêu cầu ghi chú follow-up, danh sách vấn đề chưa xử lý, chỉ báo project quá hạn, marker đang chờ hành động hành chính.

**Ngoài phạm vi:** Chưa gửi reminder tự động; chưa dashboard tổng hợp cấp hệ thống.

**Tiêu chí chấp nhận:**

**Cho trước** progress report đã được nộp
**Khi** staff rà soát
**Thì** staff có thể đánh dấu cần follow-up hoặc chấp nhận ở mức quy trình phù hợp
**Và** issue/unresolved state được hiển thị rõ trong project context

**Cho trước** project hoặc checkpoint quá hạn
**Khi** staff xem danh sách project
**Thì** hệ thống hiển thị trạng thái delayed/upcoming/waiting action rõ ràng
**Và** các indicator dựa trên deadline và trạng thái hiện hành

**Ghi chú kỹ thuật:** Chuẩn bị dữ liệu cho Epic 6/7 nhưng tự bản thân story vẫn hoàn chỉnh về giá trị giám sát.

**Yêu cầu phân quyền:** Chỉ staff/leadership phù hợp mới xem và đánh dấu follow-up trong scope của mình.

**Yêu cầu audit log:** Ghi audit log cho review/follow-up actions quan trọng trên progress report.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Rà soát báo cáo và ghi follow-up
- Hiển thị project delayed/upcoming
- Kiểm tra indicator theo đúng deadline
- Kiểm tra audit log follow-up/review

### Story 4.5: Điều chỉnh, gia hạn, nghiệm thu và final review

Là chủ nhiệm đề tài và cấp có thẩm quyền phê duyệt,
tôi muốn yêu cầu và quyết định các thay đổi quan trọng trong vòng đời project,
để việc thực hiện project có thể điều chỉnh và kết thúc qua workflow được kiểm soát.

**Giá trị nghiệp vụ:** Hoàn thiện các trạng thái quan trọng cuối vòng đời đề tài thực hiện và tránh xử lý ngoại luồng.

**Phạm vi:** Gửi yêu cầu điều chỉnh/gia hạn; hành động review/quyết định; hành động nghiệm thu/final review; chuyển trạng thái rõ ràng cho vòng đời approved project.

**Ngoài phạm vi:** Chưa có báo cáo phân tích nâng cao sau nghiệm thu; chưa có digital signature.

**Tiêu chí chấp nhận:**

**Cho trước** approved project ở trạng thái phù hợp
**Khi** PI gửi adjustment hoặc extension request
**Thì** request được lưu với lý do và context cần thiết
**Và** project chuyển vào trạng thái chờ xử lý phù hợp

**Cho trước** request hoặc project ở bước cần quyết định
**Khi** authority phê duyệt hoặc từ chối adjustment/extension/acceptance/final review
**Thì** trạng thái project chuyển hợp lệ theo state machine
**Và** quyết định được lưu với history đầy đủ

**Cho trước** thao tác không hợp lệ theo state hiện tại của project
**Khi** user cố thực hiện action
**Thì** hệ thống chặn thao tác
**Và** không cho phép cập nhật tùy ý trạng thái project

**Ghi chú kỹ thuật:** Đây là story state-heavy; nên chia code theo explicit domain operation, không cập nhật status tự do.

**Yêu cầu phân quyền:** PI tạo request; staff/leadership/authority quyết định tùy loại action; các member khác không được thao tác ngoài scope.

**Yêu cầu audit log:** Ghi audit log cho tạo adjustment request, approve/reject request, acceptance actions, quyết định final review.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo adjustment/extension request
- Approve/reject request
- Thực hiện acceptance/final review hợp lệ
- Kiểm tra state transition và audit log

## Epic 5: Giao Việc, Tệp Tin, Lịch Sử Và Audit

Tăng khả năng vận hành hàng ngày và trách nhiệm giải trình trên toàn hệ thống.

### Story 5.1: Tạo và phân công công việc liên kết nghiệp vụ

Là người dùng được ủy quyền,
tôi muốn tạo task liên kết với bản ghi nghiệp vụ và gán trách nhiệm,
để công việc follow-up rõ ràng và có thể theo dõi.

**Giá trị nghiệp vụ:** Biến các việc cần xử lý thành đối tượng quản lý rõ ràng thay vì chỉ tồn tại trong email hoặc ghi chú rời rạc.

**Phạm vi:** Entity task nền tảng, tạo task độc lập/liên kết, người được giao/cộng tác viên, hạn xử lý, mức ưu tiên, hướng dẫn, danh sách/chi tiết task cơ bản.

**Ngoài phạm vi:** Chưa có reminder tự động; chưa dashboard tổng hợp task.

**Tiêu chí chấp nhận:**

**Cho trước** user có quyền tạo task
**Khi** họ tạo task gắn với proposal, project, báo cáo hoặc độc lập
**Thì** task được lưu cùng liên kết với ngữ cảnh nghiệp vụ
**Và** người được giao, hạn xử lý, mức ưu tiên hiển thị rõ trong task chi tiết

**Cho trước** task được gắn với bản ghi nghiệp vụ
**Khi** người dùng xem bản ghi hoặc task liên quan
**Thì** có thể điều hướng qua lại giữa task và bản ghi nguồn
**Và** khả năng truy vết được giữ nguyên

**Ghi chú kỹ thuật:** Tạo đúng bảng/task field cần dùng; không làm task engine phức tạp.

**Yêu cầu phân quyền:** Chỉ role được phép mới tạo/assign task; khả năng hiển thị theo scope và permission của bản ghi liên kết.

**Yêu cầu audit log:** Ghi audit log cho `tạo task` và `assign task`.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo task standalone
- Tạo task linked với proposal/project
- Gán người được giao/cộng tác viên
- Kiểm tra audit log tạo/gán task

### Story 5.2: Cập nhật trạng thái task và evidence hoàn thành

Là người được giao task,
tôi muốn cập nhật trạng thái task, ghi chú và evidence hoàn thành,
để tiến độ công việc có thể nhìn thấy và kiểm chứng.

**Giá trị nghiệp vụ:** Cho phép chuyên viên và thành viên cập nhật tiến độ công việc trực tiếp trong hệ thống, phục vụ giám sát và accountability.

**Phạm vi:** Luồng trạng thái task, ghi chú tiến độ, đính kèm evidence hoàn thành, chỉ báo quá hạn ở cấp task, history task cơ bản.

**Ngoài phạm vi:** Chưa có reminder tự động/email; chưa có dashboard tổng hợp task.

**Tiêu chí chấp nhận:**

**Cho trước** người được giao có quyền với task
**Khi** cập nhật status hoặc ghi chú tiến độ
**Thì** task lưu được thay đổi
**Và** history hiển thị ai cập nhật, lúc nào, thay đổi gì

**Cho trước** task yêu cầu bằng chứng hoàn thành
**Khi** người được giao tải evidence lên
**Thì** evidence gắn đúng với task
**Và** metadata file được lưu đầy đủ

**Cho trước** task ở trạng thái hoặc scope không cho phép sửa
**Khi** user cố cập nhật
**Thì** hệ thống từ chối
**Và** trạng thái task không bị thay đổi sai

**Ghi chú kỹ thuật:** Bao phủ FR33, FR34, FR35 ở mức task workflow cơ bản; UX cần status + notes + file evidence rõ ràng.

**Yêu cầu phân quyền:** Người được giao và cộng tác viên được ủy quyền cập nhật theo rule; người ngoài scope không truy cập/sửa task.

**Yêu cầu audit log:** Ghi audit log cho `cập nhật task status`, upload file quan trọng, cập nhật evidence hoàn thành.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Cập nhật status task hợp lệ
- Thêm ghi chú tiến độ
- Upload evidence hoàn thành
- Kiểm tra history và audit log

### Story 5.3: Dịch vụ file dùng chung với metadata, quyền truy cập và lịch sử thay thế

Là người dùng được ủy quyền,
tôi muốn có năng lực quản lý file nhất quán trên các bản ghi nghiệp vụ,
để tài liệu quan trọng luôn được kiểm soát quyền và có thể truy vết.

**Giá trị nghiệp vụ:** Tạo nền file management thống nhất cho proposal, project, báo cáo và task, giảm rủi ro lộ file hoặc mất truy vết.

**Phạm vi:** Pattern service/API/UI file dùng chung cho upload/xem/download/replace, hiển thị metadata, thực thi permission, preview tùy chọn cho định dạng phổ biến, replacement/version history cơ bản.

**Ngoài phạm vi:** Chưa hỗ trợ mọi loại preview nâng cao; chưa làm DMS độc lập.

**Tiêu chí chấp nhận:**

**Cho trước** file gắn với bản ghi nghiệp vụ quan trọng
**Khi** user có quyền xem hoặc tải xuống
**Thì** hệ thống cho phép truy cập qua service được kiểm soát
**Và** không cho phép truy cập trực tiếp chỉ bằng object key

**Cho trước** user không có quyền với bản ghi liên quan
**Khi** họ cố xem hoặc tải file
**Thì** hệ thống từ chối
**Và** không rò rỉ metadata nhạy cảm của file

**Cho trước** file được thay thế trong workflow cho phép
**Khi** replace action thành công
**Thì** hệ thống giữ metadata và version/replacement history tối thiểu
**Và** vẫn truy vết được người upload và timestamp

**Ghi chú kỹ thuật:** Bao phủ FR36, FR37 và rule từ project context; phải qua files module.

**Yêu cầu phân quyền:** Permission check mọi lần upload/xem/download/replace; truy cập ở cấp bản ghi bắt buộc.

**Yêu cầu audit log:** Ghi audit log cho upload file quan trọng, download file quan trọng, replace file nếu là action quan trọng.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Upload/xem/download file hợp lệ
- Chặn truy cập file trái phép
- Replace file và kiểm tra replacement history
- Kiểm tra audit log download/upload/replace

### Story 5.4: Lịch sử xử lý và tra cứu audit log theo thẩm quyền

Là quản trị viên hoặc người dùng nghiệp vụ được ủy quyền,
tôi muốn tra cứu lịch sử workflow và audit log,
để các quyết định và thay đổi có thể được kiểm tra và giải trình.

**Giá trị nghiệp vụ:** Củng cố accountability và hỗ trợ kiểm tra, giải trình, xử lý tranh chấp.

**Phạm vi:** Timeline history cho entity chính, truy vấn danh sách/chi tiết audit-log cho người dùng được ủy quyền, bộ lọc theo actor/action/entity/time, khả năng hiển thị nhạy theo role.

**Ngoài phạm vi:** Chưa làm analytics nâng cao trên audit log; chưa export audit riêng.

**Tiêu chí chấp nhận:**

**Cho trước** một proposal, project hoặc task có nhiều thay đổi
**Khi** user có thẩm quyền mở history
**Thì** họ thấy timeline xử lý rõ actor, action, timestamp, context
**Và** các mốc liên quan tới comment/quyết định/file được liên kết trực tiếp

**Cho trước** admin hoặc business authority cần tra cứu audit
**Khi** lọc theo actor/action/entity/time
**Thì** hệ thống trả về các bản ghi audit phù hợp
**Và** chỉ hiển thị các bản ghi mà người dùng được phép xem

**Ghi chú kỹ thuật:** Gắn chặt UX-DR13/14 và FR38/39/40; cần distinction giữa history nghiệp vụ và event audit thô.

**Yêu cầu phân quyền:** Chỉ người dùng được ủy quyền xem history/audit; khả năng hiển thị vẫn phải tuân thủ role và data scope.

**Yêu cầu audit log:** Story này là lớp tra cứu; không thêm loại action mới ngoài các truy vấn hệ thống nếu cần logging vận hành.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Xem history của proposal/project/task
- Lọc audit log
- Chặn user không có quyền xem audit/history
- Kiểm tra liên kết giữa timeline và các mốc file/quyết định

## Epic 6: Thông Báo, Nhắc Việc Và Hàng Đợi Công Việc

Biến trạng thái và deadline thành hành động cụ thể mà người dùng thấy đúng lúc.

### Story 6.1: Thông báo trong ứng dụng cho sự kiện nghiệp vụ quan trọng

Là người dùng nội bộ,
tôi muốn nhận thông báo trong ứng dụng về phân công, bổ sung, phê duyệt và thay đổi trạng thái,
để tôi biết việc gì cần chú ý mà không cần follow-up bên ngoài.

**Giá trị nghiệp vụ:** Tăng khả năng phản hồi đúng lúc và giảm lệ thuộc vào trao đổi thủ công.

**Phạm vi:** Entity notification và UI danh sách, trạng thái unread/read, trigger cho các hành động lõi đã xây dựng, link từ notification tới bản ghi đích.

**Ngoài phạm vi:** Chưa có email notification; chưa có reminder batching.

**Tiêu chí chấp nhận:**

**Cho trước** một action nghiệp vụ quan trọng xảy ra
**Khi** action đó thuộc tập trigger được hỗ trợ
**Thì** notification in-app được tạo cho đúng recipient
**Và** recipient có thể điều hướng tới bản ghi liên quan

**Cho trước** user mở trung tâm thông báo
**Khi** họ xem danh sách
**Thì** notification hiển thị trạng thái read/unread và thông tin ngắn gọn
**Và** chỉ hiển thị notification thuộc phạm vi quyền của họ

**Ghi chú kỹ thuật:** Trigger ít nhưng đúng trước; không làm notification center quá nặng ở story đầu.

**Yêu cầu phân quyền:** Notification delivery phải tuân thủ role/scope/assignment; user không thấy notification của người khác.

**Yêu cầu audit log:** Có thể ghi operational log cho notification creation nếu cần truy vết trigger, nhưng không thay thế audit nghiệp vụ hiện có.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tạo notification khi assign reviewer/task
- Tạo notification khi request supplement/approval event
- Kiểm tra user chỉ thấy notification của mình
- Kiểm tra link từ notification tới bản ghi nguồn

### Story 6.2: Email notification cho sự kiện và quyết định trọng yếu

Là người dùng nội bộ,
tôi muốn nhận email notification cho các sự kiện workflow quan trọng,
để tôi không bỏ lỡ hành động cần xử lý khi không ở trong ứng dụng.

**Giá trị nghiệp vụ:** Tăng khả năng nhận biết công việc cần xử lý với các bước quan trọng và deadline.

**Phạm vi:** Tích hợp gửi email, template cho sự kiện chính, queueing an toàn khi retry, theo dõi trạng thái tối thiểu cho các lần gửi.

**Ngoài phạm vi:** Chưa có email preference center đầy đủ; chưa có SMS.

**Tiêu chí chấp nhận:**

**Cho trước** một event được cấu hình gửi email
**Khi** event đó xảy ra
**Thì** email notification được đưa vào queue và gửi tới recipient hợp lệ
**Và** nội dung email dùng template phù hợp

**Cho trước** job gửi email thất bại tạm thời
**Khi** hệ thống retry theo quy tắc idempotent
**Thì** không tạo trùng lặp kết quả nghiệp vụ
**Và** có thể quan sát được trạng thái gửi ở mức vận hành tối thiểu

**Ghi chú kỹ thuật:** Phù hợp NFR11; tái sử dụng cấu hình mẫu notification từ Epic 1.

**Yêu cầu phân quyền:** Việc chọn recipient luôn theo permission/ngữ cảnh nghiệp vụ; không gửi nội dung nhạy cảm cho người ngoài scope.

**Yêu cầu audit log:** Không bắt buộc audit log business riêng cho mỗi email; nên có operational log/queue trace cho troubleshooting.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Gửi email cho event quan trọng
- Kiểm tra template đúng
- Mô phỏng retry an toàn
- Xác nhận không gửi cho recipient ngoài scope

### Story 6.3: Reminder job và hàng đợi việc chờ xử lý

Là người dùng nội bộ,
tôi muốn có nhắc hạn và hàng đợi công việc cá nhân,
để tôi có thể ưu tiên việc quá hạn và việc sắp tới ở một nơi.

**Giá trị nghiệp vụ:** Giảm nguy cơ bỏ sót việc quá hạn và tăng khả năng xử lý chủ động.

**Phạm vi:** Rule reminder job cho hạn bổ sung, hạn review, hạn báo cáo, hạn task; danh sách work queue của user; lập lịch idempotent và hành vi retry an toàn.

**Ngoài phạm vi:** Chưa làm dashboard analytics nâng cao; chưa có rule configurator phức tạp.

**Tiêu chí chấp nhận:**

**Cho trước** một bản ghi có deadline sắp tới hoặc đã quá hạn
**Khi** reminder job chạy
**Thì** hệ thống tạo reminder/notification phù hợp
**Và** tránh gửi trùng lặp không cần thiết cho cùng một trigger

**Cho trước** user mở hàng đợi công việc cá nhân
**Khi** hệ thống tải dữ liệu
**Thì** user thấy item đang chờ xử lý theo vai trò của mình
**Và** mỗi item có trạng thái, hạn xử lý và đường dẫn tới bản ghi nguồn

**Ghi chú kỹ thuật:** Bao phủ FR43/44; queue design phải idempotent; work queue là view nghiệp vụ chứ không chỉ là danh sách notification.

**Yêu cầu phân quyền:** Queue chỉ chứa item thuộc role/scope/assignment của user hiện tại.

**Yêu cầu audit log:** Không bắt buộc audit log business cho mỗi reminder; nhưng các action người dùng thực hiện từ queue vẫn đi qua audit của module nguồn.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Sinh reminder cho deadline sắp đến
- Sinh reminder cho item quá hạn
- Kiểm tra queue cá nhân hiển thị đúng items
- Kiểm tra tránh trùng lặp reminder khi retry

## Epic 7: Dashboard Điều Hành, Tìm Kiếm, Báo Cáo Và Xuất Dữ Liệu

Tạo lớp hiển thị và điều hành cho chuyên viên và lãnh đạo trên dữ liệu đã tích lũy từ các epic trước.

### Story 7.1: Tìm kiếm, lọc và danh sách điều hướng xuyên module

Là chuyên viên quản lý khoa học hoặc người dùng lãnh đạo,
tôi muốn tìm kiếm và lọc proposal, project, task và báo cáo,
để tôi nhanh chóng tìm được bản ghi cần xử lý.

**Giá trị nghiệp vụ:** Tăng tốc thao tác vận hành hàng ngày và là đầu vào cho điều hành, rà soát, báo cáo.

**Phạm vi:** Tìm kiếm/lọc/sắp xếp danh sách cho các module chính, filter chips, trạng thái danh sách, pattern drawer/sheet lọc thân thiện trên mobile, drill-down tới chi tiết bản ghi.

**Ngoài phạm vi:** Chưa có widget summary dashboard; chưa export.

**Tiêu chí chấp nhận:**

**Cho trước** user có quyền với tập bản ghi lớn
**Khi** tìm kiếm hoặc lọc theo code, title, unit, field, status, người được giao, hạn xử lý, intake period
**Thì** danh sách trả về đúng bản ghi trong phạm vi quyền của user
**Và** các bộ lọc đang áp dụng hiển thị rõ và có thể xóa nhanh

**Cho trước** user dùng mobile hoặc tablet
**Khi** thao tác lọc danh sách
**Thì** bộ lọc được trình bày qua drawer, bottom sheet hoặc pattern tương đương phù hợp
**Và** không gây tràn ngang toàn trang

**Ghi chú kỹ thuật:** Bao phủ UX-DR7, UX-DR8, UX-DR19; hiệu năng danh sách/tìm kiếm là NFR trọng yếu.

**Yêu cầu phân quyền:** Tìm kiếm/lọc phải thực thi scope filtering ở backend; không lộ count hoặc bản ghi ngoài quyền.

**Yêu cầu audit log:** Không yêu cầu audit log cho thao tác tìm kiếm/danh sách thông thường.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Tìm kiếm theo mã/tên
- Lọc theo trạng thái/đơn vị/hạn xử lý
- Kiểm tra responsive danh sách/lọc trên mobile
- Kiểm tra không lộ bản ghi ngoài scope

### Story 7.2: Dashboard theo vai trò với drill-down hành động

Là lãnh đạo hoặc người dùng quản lý khoa học,
tôi muốn dashboard theo vai trò hiển thị phê duyệt đang chờ, project chậm hạn, task quá hạn và báo cáo sắp tới,
để tôi có thể chuyển trực tiếp từ tín hiệu sang hành động.

**Giá trị nghiệp vụ:** Tạo giao diện điều hành thực sự, tập trung vào việc cần xử lý thay vì chỉ hiển thị số liệu trang trí.

**Phạm vi:** Widget dashboard theo vai trò, KPI card, chỉ báo khẩn cấp, link drill-down tới danh sách/chi tiết đã lọc, layout dashboard responsive, aggregate từ server.

**Ngoài phạm vi:** Chưa có analytics nâng cao lâu dài; chưa có công cụ tùy biến dashboard.

**Tiêu chí chấp nhận:**

**Cho trước** user thuộc role leadership hoặc staff
**Khi** mở dashboard
**Thì** họ thấy các widget phù hợp vai trò và scope của mình
**Và** các widget ưu tiên phê duyệt đang chờ, project chậm hạn, task quá hạn, báo cáo sắp tới

**Cho trước** user click vào một chỉ báo dashboard
**Khi** hệ thống điều hướng
**Thì** user tới danh sách đã lọc hoặc bản ghi nguồn phù hợp
**Và** dữ liệu drill-down nhất quán với số liệu summary ban đầu

**Cho trước** dashboard hiển thị trên desktop và mobile
**Khi** render ở breakpoint yêu cầu
**Thì** layout vẫn rõ ràng, không nặng trang trí, và không làm mất hành động chính
**Và** status không chỉ dựa vào màu

**Ghi chú kỹ thuật:** Bao phủ UX-DR17, UX-DR18, UX-DR20, UX-DR22; aggregate phải scope-aware.

**Yêu cầu phân quyền:** Dashboard totals và widget items luôn theo current-user scope; fail closed khi scope không xác định.

**Yêu cầu audit log:** Không yêu cầu audit log cho xem dashboard; các action phía sau tiếp tục dùng audit của module nguồn.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Kiểm tra dashboard cho staff
- Kiểm tra dashboard cho leadership
- Drill-down từ widget tới danh sách/chi tiết
- Kiểm tra không lộ số liệu ngoài scope

### Story 7.3: Báo cáo tổng hợp và xuất Excel/PDF

Là chuyên viên hoặc lãnh đạo được ủy quyền,
tôi muốn tạo báo cáo theo phạm vi và xuất ra Excel hoặc PDF,
để tôi có thể hỗ trợ báo cáo lãnh đạo và rà soát vận hành mà không phải lắp ghép bảng tính thủ công.

**Giá trị nghiệp vụ:** Giảm mạnh thời gian làm báo cáo thủ công và chuẩn hóa đầu ra báo cáo của hệ thống.

**Phạm vi:** Reporting view theo đơn vị/lĩnh vực/trạng thái/kỳ báo cáo, export job hoặc export trực tiếp khi phù hợp, tạo Excel/PDF, phản hồi progress/queued cho export nặng.

**Ngoài phạm vi:** Chưa có analytics tự phục vụ phức tạp; chưa export mọi loại dữ liệu trong hệ thống.

**Tiêu chí chấp nhận:**

**Cho trước** user có quyền với một tập báo cáo được hỗ trợ
**Khi** họ chọn bộ lọc và yêu cầu xem báo cáo
**Thì** hệ thống trả về reporting view phù hợp với phạm vi quyền
**Và** các số liệu khớp với dữ liệu nguồn hiện hành

**Cho trước** user yêu cầu export Excel hoặc PDF
**Khi** export được thực thi
**Thì** hệ thống tạo file đầu ra đúng định dạng
**Và** vẫn giữ nguyên rule lọc và permission của báo cáo gốc

**Cho trước** export là tác vụ nặng
**Khi** xử lý mất thời gian
**Thì** user thấy queued/progress/completion feedback phù hợp
**Và** request tương tác thông thường không bị chặn

**Ghi chú kỹ thuật:** Gắn với NFR4, FR48, FR49; export nên dùng queue cho trường hợp nặng; quyền xuất luôn đồng nhất quyền xem.

**Yêu cầu phân quyền:** Chỉ người dùng được ủy quyền được xem/export báo cáo; mọi aggregate và file export đều phải tuân thủ data scope.

**Yêu cầu audit log:** Ghi audit log cho export báo cáo nếu được coi là hành động quan trọng; tối thiểu phải có operational trace cho export job.

**Checklist kiểm thử hoặc xác minh thủ công:**
- Xem reporting view với bộ lọc
- Export Excel
- Export PDF
- Kiểm tra file export không chứa dữ liệu ngoài scope
