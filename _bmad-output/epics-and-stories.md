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

# DocManSystem - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for DocManSystem, decomposing the requirements from the PRD, Architecture, Project Context, and UX Design into implementable stories.

This document contains the approved implementation epics and detailed, testable stories for phased delivery.

## Requirements Inventory

### Functional Requirements

FR1: System administrators can authenticate to the system and access administrator-only configuration and support capabilities.

FR2: The system can manage authenticated sessions, login state, and logout flows for internal users.

FR3: System administrators can manage user accounts, including creation, activation, deactivation, and role assignment support.

FR4: System administrators can manage roles and permission mappings required for phase 1 operations.

FR5: System administrators can manage organizational units and map users to organization scope for role-based data access.

FR6: The system can enforce role-based, organization-scoped, and state-based authorization across proposals, projects, tasks, files, dashboards, and reports.

FR7: System administrators can manage shared catalogs required by business workflows, including organizational units, research fields, proposal types, statuses, priorities, report types, product types, forms, checklists, and scoring criteria.

FR8: System administrators can configure system parameters, notification templates, and selected workflow-supporting settings required for phase 1 operations.

FR9: Scientific management staff can create and manage proposal intake periods with dates, applicability rules, and required submission packages.

FR10: Principal investigators can create a proposal draft, save progress, and submit a proposal formally within an applicable intake period.

FR11: Principal investigators can enter structured proposal information including title, field, host unit, participants, timeline, objectives, content summary, and proposed budget metadata.

FR12: Principal investigators can upload required proposal attachments and supporting documents to a proposal record.

FR13: The system can validate required proposal data and required file conditions before formal submission.

FR14: The system can record proposal submission history, including timestamps and submission state changes.

FR15: Scientific management staff can review proposal completeness and request supplements with a stated reason and due date.

FR16: Principal investigators can view supplement requests, revise proposal content or attachments, and resubmit the proposal.

FR17: Scientific management staff can assign reviewers or committee participants to proposals according to the workflow.

FR18: Reviewers and committee members can access assigned proposals and submit scores, comments, and recommendations.

FR19: Scientific management staff can monitor review progress and consolidate evaluation outcomes.

FR20: Leadership or approval authority can review proposal history, evaluation outputs, and supporting files before making an approval decision.

FR21: Leadership or approval authority can approve, reject, or otherwise disposition a proposal according to workflow rules.

FR22: The system can treat proposal statuses as controlled states and restrict actions based on current proposal state.

FR23: The system can create an approved-project record from an approved proposal while preserving relevant source data.

FR24: Scientific management staff and authorized project participants can define and maintain project milestones and planned reporting checkpoints.

FR25: Principal investigators can submit periodic progress reports and supporting evidence for approved projects.

FR26: Scientific management staff can review project progress reports, request follow-up where needed, and track unresolved issues.

FR27: Principal investigators can submit adjustment or extension requests for approved projects.

FR28: Leadership or authorized staff can review and decide on adjustment, extension, acceptance, and final-review actions according to workflow rules.

FR29: The system can identify delayed projects, upcoming deadlines, and projects waiting for administrative action.

FR30: The system can treat approved-project workflow states as controlled states and restrict actions based on current project state.

FR30a: Project members can view approved projects they participate in, including assigned responsibilities, relevant milestones, and permitted supporting files.

FR30b: Project members can upload permitted contribution files or evidence within the scope granted to them for an approved project.

FR31: Authorized users can create tasks that are standalone or linked to proposals, approved projects, reports, meetings, or workflow events.

FR32: Authorized users can assign task ownership, collaborators, due dates, priorities, and descriptive instructions.

FR33: Task assignees and authorized users can update task status, progress, notes, and completion evidence.

FR34: The system can identify and surface overdue tasks and upcoming due tasks.

FR35: The system can treat relevant task statuses as controlled workflow states where business rules depend on them.

FR36: Authorized users can upload, replace, view, and download files attached to business records according to permission rules.

FR37: The system can preserve file metadata including uploader, timestamp, related record, and other traceability context required for business use.

FR38: The system can present workflow history and business-record history for proposals, projects, tasks, and related decisions.

FR39: The system can create audit-log records for critical business actions defined by this PRD.

FR40: Authorized administrators and authorized business users can inspect audit or history information appropriate to their responsibilities and permissions.

FR41: The system can create in-app notifications for important business events such as assignment, supplement request, approval request, state change, and deadline-related events.

FR42: The system can send email notifications for important business events and reminders defined in phase 1 scope.

FR43: The system can generate reminders for approaching deadlines, overdue reports, overdue tasks, and pending workflow actions.

FR44: The system can present user-specific work queues showing items waiting for the current user’s attention.

FR45: Leadership and scientific management staff can access role-based dashboards showing waiting approvals, delayed projects, overdue tasks, upcoming reports, and summary indicators within authorized scope.

FR46: Users can search and filter proposals, projects, tasks, and reports by relevant business attributes such as code, title, unit, field, status, assignee, due date, and intake period.

FR47: The system can provide traceable detail views that connect dashboard indicators and list results to the underlying workflow records.

FR48: Authorized users can export designated lists and reports to Excel or PDF according to business needs and permission rules.

FR49: The system can produce role-scoped reporting views and summary outputs by unit, field, status, reporting period, and related administrative dimensions.

### NonFunctional Requirements

NFR1: Standard authenticated list views, detail pages, and common workflow actions shall return user-visible results within 2 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions.

NFR2: Dashboard views shall present core widgets and counts within 3 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions.

NFR3: Search and filter interactions on primary administrative lists shall complete within 2 seconds for at least 95 percent of measured requests under normal phase 1 operating conditions.

NFR4: Heavy operations such as exports, reminder batches, and derived reporting workloads shall provide visible progress, queued status, or completion feedback and shall not block normal interactive request handling.

NFR5: All authenticated traffic shall require encrypted transport in deployment environments.

NFR6: Passwords, credentials, and session-related secrets shall never be stored or transmitted in plaintext application flows.

NFR7: Authorization shall be enforced on the backend for all protected operations, including dashboards, reports, search, exports, workflow actions, file access, and history views.

NFR8: The system shall fail closed when authorization scope, assignment scope, or state-based permission context cannot be resolved safely.

NFR9: Audit-log records for critical actions shall be queryable by authorized users within the product or operational support tooling.

NFR10: Critical workflow actions such as submission, supplement request, approval decision, task status change, and key file-linking operations shall either complete successfully with consistent state changes or fail without partial business-state persistence.

NFR11: Reminder, notification, and background processing flows shall be safe to retry without causing inconsistent state and should avoid duplicate business outcomes where the same trigger is reprocessed.

NFR12: Important business records shall support soft delete where defined by product rules.

NFR13: Every schema change shall be versioned through a Prisma migration and validated through migration execution in controlled development or test environments.

NFR14: Core phase 1 workflows shall meet WCAG AA expectations for labels, focus visibility, keyboard navigation, readable status communication, and error feedback.

NFR15: Responsive versions of core workflows shall preserve accessibility behavior rather than treating accessibility as desktop-only.

NFR16: Status communication shall not depend on color alone and shall include text or icon reinforcement.

NFR17: The phase 1 solution shall preserve modular-monolith boundaries so major business areas remain separable in code, testing, and review.

NFR18: Business logic shall remain centralized in backend service layers rather than being fragmented across controllers or frontend-only flows.

NFR19: New code introduced under this PRD shall maintain TypeScript strictness, explicit DTO validation, and clear domain naming.

NFR20: New functionality shall be implemented in a way that supports story-sized testing, review, and rollback of changes without broad unrelated refactoring.

### Additional Requirements

- First implementation story must initialize an Nx workspace with Next.js frontend, NestJS backend, and shared TypeScript packages.
- Phase 1 must remain a modular monolith with explicit domain boundaries; no microservices or Kubernetes.
- Frontend and backend should be separate deployable apps inside one repository and one coordinated delivery unit.
- Backend APIs should follow REST-style domain route groups under `/api/v1/<domain-module>/...`.
- Use PostgreSQL as the system of record with Prisma migration-driven schema evolution.
- Use Redis for cache, queue, reminder jobs, and notification orchestration.
- Use MinIO as the S3-compatible file object store behind a files module.
- Use Docker Compose and Nginx for phase 1 deployment and reverse proxying.
- Proposal, approved-project, and task workflows must use explicit state-machine style domain operations rather than arbitrary field edits.
- Business logic must reside in backend services, not controllers.
- Shared packages should provide contracts, validation, permissions, domain types, and UI tokens where reuse is real.
- Authorization must combine role-based, organization-scope, assignment-scope, and state-based checks in backend application flow.
- Audit logging must be captured inside the same application use case that changes business state.
- Reminder and notification jobs must use consistent payload structures and idempotency safeguards.
- Dashboard and reporting aggregates must always be scope-aware and derived from backend query services.
- Date and time handling must use UTC persistence and ISO 8601 API boundaries.
- Database naming should use `snake_case`, API route segments should use kebab-case, and TypeScript code should use explicit domain names.
- Sensitive file metadata visibility and file download access must be permission-checked on every access.
- Monitoring baseline should include structured logs, health checks, queue/job visibility, and storage/database service monitoring.
- Backup and recovery policy should be added as a supporting architectural concern during implementation planning.

### UX Design Requirements

UX-DR1: The UI must preserve the Military Medical Academy institutional admin-dashboard style, using dark green as the primary visual direction with white and light gray-green surfaces and restrained gold accents.

UX-DR2: The product must avoid startup-style SaaS visuals, strong gradients, glassmorphism, decorative hero areas, emoji icons, and non-business decorative imagery.

UX-DR3: Typography must use a practical sans-serif family aligned with the academy website where available; content text should remain comfortably readable in the `14px` to `16px` range.

UX-DR4: The application shell must use a sidebar on desktop, a topbar with search, notifications, account context, and current role, and mandatory breadcrumbs on important detail pages.

UX-DR5: The layout must be responsive from the start and explicitly support `360px`, `390px`, `430px`, `768px`, `1024px`, and `1440px`.

UX-DR6: On mobile and tablet, sidebar navigation must become a drawer, bottom navigation, or similarly constrained navigation pattern that does not obstruct content.

UX-DR7: Dense business tables must remain usable responsively: desktop should favor full tables, tablet should hide secondary columns, and mobile should use card lists or contained horizontal scrolling without full-page horizontal overflow.

UX-DR8: Every primary list screen must support keyword search, role-relevant filters, sorting, quick actions, and clear loading, empty, and error states.

UX-DR9: Long forms must be structured into clear sections such as general information, participants, schedule, budget metadata, domain content, attachments, and processing history.

UX-DR10: Form validation errors must appear inline near the relevant field, and important actions must show explicit loading, success, and error feedback.

UX-DR11: Important actions such as submit, approve, reject, request supplement, and delete must require confirmation with consequences clearly stated.

UX-DR12: Long mobile forms should use sticky primary action bars where needed, with touch targets near `44px` and without overcrowding horizontal action groups.

UX-DR13: Workflow-heavy detail screens must expose current status plus timeline or stepper context and readable processing history without hiding traceability in hard-to-find overlays.

UX-DR14: History items should directly link comments, scores, attached files, and decisions to the relevant processing milestone.

UX-DR15: File-management UI must show file name, type, size, uploader, upload time, upload status, failure/retry states, and conditionally visible actions based on permission.

UX-DR16: File workflows should support preview where allowed and show version or replacement history for important documents.

UX-DR17: Dashboard widgets and KPI cards must prioritize actionability over decoration, showing waiting items, delayed work, overdue tasks, and summary indicators with clear urgency.

UX-DR18: Dashboard cards should use light surfaces, restrained borders, and status color accents, while charts should primarily use the green brand palette and reserve red/yellow for warnings.

UX-DR19: Search and navigation must support returning quickly from detail views to lists and dashboards, with visible active filters and direct drill-down from dashboard signals to filtered record views.

UX-DR20: Status presentation must never rely on color alone and must always pair color with text labels or icons.

UX-DR21: Accessibility for core workflows must meet WCAG AA, including labels, visible focus states, semantic controls, keyboard navigation, `aria-live` or equivalent support for async updates, and support for `prefers-reduced-motion`.

UX-DR22: Mobile and tablet designs must be treated as first-class, with no screens considered “desktop-only” for dashboard, list, detail, approval, submission, task, or progress-update workflows.

UX-DR23: Reusable UI patterns and components should be preferred across modules, and new components should only be introduced when they can serve multiple similar screens.

### FR Coverage Map

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
FR30a: Epic 4 - Quyền xem của project member
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

## Epic List

### Epic 1: Nền Tảng Truy Cập, Phân Quyền, Danh Mục Và Khung Ứng Dụng
Thiết lập nền tảng vận hành nội bộ để người dùng có thể đăng nhập, được áp quyền đúng vai trò và phạm vi dữ liệu, quản trị được dữ liệu nền, và sử dụng khung giao diện quản trị nhất quán cho các nghiệp vụ phía sau.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8

### Epic 2: Tiếp Nhận Và Nộp Hồ Sơ Đề Tài
Cho phép chuyên viên mở đợt tiếp nhận và chủ nhiệm đề tài tạo, hoàn thiện, đính kèm, kiểm tra và nộp hồ sơ đề xuất trong một quy trình đầy đủ và có thể truy vết.
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14

### Epic 3: Bổ Sung, Đánh Giá Và Phê Duyệt Đề Tài
Cho phép các bên liên quan xử lý đầy đủ vòng đời thẩm định đề xuất từ yêu cầu bổ sung đến phân công đánh giá, chấm điểm, tổng hợp và phê duyệt/từ chối theo trạng thái được kiểm soát.
**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22

### Epic 4: Theo Dõi Đề Tài Được Duyệt Và Tiến Độ Thực Hiện
Biến đề tài được duyệt thành hồ sơ triển khai thực tế với milestone, báo cáo định kỳ, điều chỉnh/gia hạn, nghiệm thu và giám sát tiến độ theo workflow rõ ràng.
**FRs covered:** FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR30a, FR30b

### Epic 5: Giao Việc, Tệp Tin, Lịch Sử Và Audit
Hỗ trợ vận hành xuyên suốt bằng giao việc, cập nhật trạng thái, quản lý file, truy vết lịch sử và audit log để tăng trách nhiệm giải trình ở tất cả các module chính.
**FRs covered:** FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40

### Epic 6: Thông Báo, Nhắc Việc Và Hàng Đợi Công Việc
Đảm bảo người dùng luôn biết việc gì cần xử lý qua thông báo trong ứng dụng, email, nhắc hạn và hàng đợi công việc theo đúng vai trò và phạm vi dữ liệu.
**FRs covered:** FR41, FR42, FR43, FR44

### Epic 7: Dashboard Điều Hành, Tìm Kiếm, Báo Cáo Và Xuất Dữ Liệu
Cung cấp lớp điều hành và ra quyết định cho lãnh đạo và chuyên viên thông qua dashboard theo vai trò, tìm kiếm/lọc, báo cáo tổng hợp và export có kiểm soát.
**FRs covered:** FR45, FR46, FR47, FR48, FR49

## Epic 1: Nền Tảng Truy Cập, Phân Quyền, Danh Mục Và Khung Ứng Dụng

Thiết lập nền tảng kỹ thuật và nghiệp vụ tối thiểu để các epic sau có thể triển khai an toàn trên cùng một workspace, cùng mô hình phân quyền và cùng khung UX quản trị.

### Story 1.1: Khởi tạo workspace và ứng dụng nền tảng

As a implementation team,
I want a standardized Nx workspace with web, api, and shared packages,
So that future stories can be delivered consistently within the approved architecture.

**Business Value:** Tạo nền kỹ thuật thống nhất ngay từ đầu, giảm rủi ro drift kiến trúc và cho phép triển khai các story sau theo mô hình modular monolith đã duyệt.

**Scope:** Khởi tạo Nx workspace; tạo ứng dụng Next.js và NestJS; tạo packages nền cho contracts, validation, permissions, ui-tokens; thiết lập strict TypeScript, lint/test/build scripts, Docker Compose skeleton, Nginx skeleton, app shell cơ bản.

**Out of Scope:** Chưa triển khai nghiệp vụ auth, chưa tạo toàn bộ schema domain, chưa triển khai màn hình nghiệp vụ chi tiết.

**Acceptance Criteria:**

**Given** repository rỗng hoặc chưa có cấu trúc triển khai
**When** story hoàn thành
**Then** repository có Nx workspace với `apps/web`, `apps/api`, và shared packages theo architecture
**And** web và api có thể chạy ở chế độ development với health check hoặc trang placeholder

**Given** workspace đã được khởi tạo
**When** developer chạy build và test nền tảng
**Then** các lệnh build/lint/test cơ bản chạy được
**And** TypeScript strict mode được bật cho các app và package mới

**Given** UX guideline và project context
**When** app shell nền tảng được tạo
**Then** shell sử dụng hướng dashboard hành chính với sidebar, topbar, breadcrumb placeholder
**And** responsive shell hoạt động ở các breakpoint chính

**Technical Notes:** Đây là story đầu tiên theo yêu cầu architecture; chỉ tạo entity/config khi cần cho nền tảng; chuẩn hóa naming, route conventions, environment strategy, CI-friendly scripts.

**Authorization Requirements:** Chưa có nghiệp vụ phân quyền chi tiết nhưng phải chuẩn bị sẵn hook/boundary cho backend auth, permission, current-user context.

**Audit-Log Requirements:** Không yêu cầu audit log nghiệp vụ; có thể có structured app logging cho startup/health diagnostics.

**Test or Manual Verification Checklist:**
- Xác nhận cấu trúc thư mục phù hợp architecture
- Chạy được web app và api app ở local
- Xác nhận shell responsive ở `360px`, `768px`, `1440px`
- Xác nhận strict TypeScript và lệnh build cơ bản hoạt động

### Story 1.2: Đăng nhập, đăng xuất và quản lý phiên nội bộ

As a internal user,
I want to log in and log out securely,
So that I can access only protected internal functions assigned to me.

**Business Value:** Mở cổng truy cập an toàn cho toàn bộ hệ thống nội bộ và là tiền đề cho mọi luồng nghiệp vụ có bảo vệ.

**Scope:** Mô hình user nền tảng, credential storage an toàn, login form, logout flow, session/token handling, protected route middleware, backend auth endpoints, basic user context in shell.

**Out of Scope:** Chưa có quản trị tài khoản phức tạp, chưa có reset password nâng cao, chưa tích hợp SSO hoặc external identity.

**Acceptance Criteria:**

**Given** người dùng nội bộ hợp lệ
**When** họ nhập đúng thông tin đăng nhập
**Then** hệ thống tạo phiên xác thực hợp lệ
**And** người dùng được chuyển vào khu vực nội bộ phù hợp

**Given** người dùng nhập sai thông tin
**When** gửi yêu cầu đăng nhập
**Then** hệ thống từ chối truy cập với thông báo lỗi an toàn
**And** không tiết lộ chi tiết nhạy cảm về tài khoản

**Given** người dùng đã đăng nhập
**When** họ đăng xuất
**Then** phiên truy cập bị vô hiệu hóa
**And** các route được bảo vệ không còn truy cập được nếu không đăng nhập lại

**Technical Notes:** Ưu tiên local auth cho phase 1; fail closed; bảo vệ secret; chuẩn bị extensibility cho future SSO nhưng không triển khai ở story này.

**Authorization Requirements:** Chỉ người dùng đã xác thực mới truy cập khu vực nội bộ; route protection phải được enforce ở backend và web middleware phù hợp.

**Audit-Log Requirements:** Ghi audit log cho `login` và `logout` với actor, timestamp, kết quả và context tối thiểu.

**Test or Manual Verification Checklist:**
- Kiểm tra login thành công và logout thành công
- Kiểm tra login sai bị từ chối
- Kiểm tra route protected không truy cập được khi chưa đăng nhập
- Kiểm tra audit log login/logout được tạo

### Story 1.3: Quản lý người dùng, vai trò và phạm vi đơn vị

As a system administrator,
I want to manage users, roles, and organization scope assignments,
So that access can be granted correctly across all business modules.

**Business Value:** Tạo năng lực vận hành hệ thống thực tế bằng cách kiểm soát ai làm gì và thấy dữ liệu nào.

**Scope:** CRUD có kiểm soát cho user, activate/deactivate, role assignment, organization/unit records, scope assignment UI/API, danh sách và lọc quản trị cơ bản.

**Out of Scope:** Chưa triển khai ma trận permission tinh chỉnh cho từng action business nhỏ; chưa có bulk import nâng cao.

**Acceptance Criteria:**

**Given** quản trị viên đã đăng nhập
**When** tạo tài khoản mới và gán role cùng đơn vị
**Then** người dùng mới xuất hiện trong danh sách quản trị
**And** các gán role/scope được lưu đầy đủ

**Given** tài khoản đang hoạt động
**When** quản trị viên vô hiệu hóa tài khoản
**Then** tài khoản không thể tiếp tục truy cập protected flows
**And** trạng thái tài khoản được hiển thị rõ trong UI quản trị

**Given** một người dùng có role và organization scope cụ thể
**When** user context được nạp
**Then** hệ thống có thể xác định role và data scope hiện hành của người dùng
**And** context đó sẵn sàng cho enforcement ở các story sau

**Technical Notes:** Tạo entity nền tối thiểu: users, roles, organizations, assignment tables; tránh tạo trước các bảng không cần; chuẩn hóa seed/dev data tối thiểu nếu cần.

**Authorization Requirements:** Chỉ system administrator mới được quản trị user/role/scope; backend phải chặn mọi truy cập trái phép vào admin endpoints.

**Audit-Log Requirements:** Ghi audit log cho create/update/activate/deactivate user, role assignment, scope assignment.

**Test or Manual Verification Checklist:**
- Tạo, sửa, vô hiệu hóa người dùng
- Gán role và organization scope
- Kiểm tra user bị disable không đăng nhập được
- Kiểm tra audit log cho thay đổi quản trị

### Story 1.4: Permission primitives, danh mục dùng chung và cấu hình nền

As a system administrator,
I want shared catalogs and base configuration managed inside the system,
So that downstream workflows can use controlled reference data and notification settings.

**Business Value:** Loại bỏ phụ thuộc vào dữ liệu cứng trong code và cho phép các quy trình nghiệp vụ dùng chung cùng một bộ dữ liệu nền tin cậy.

**Scope:** Permission primitive layer; catalog management cho research fields, proposal types, priorities, report types, scoring criteria cơ bản; notification template skeleton; system parameters nền; reusable admin list/forms.

**Out of Scope:** Không triển khai full business workflow phụ thuộc vào từng catalog; không làm workflow engine cấu hình động.

**Acceptance Criteria:**

**Given** quản trị viên cần dữ liệu tham chiếu
**When** thêm hoặc cập nhật bản ghi catalog được hỗ trợ
**Then** hệ thống lưu được dữ liệu tham chiếu hợp lệ
**And** dữ liệu này sẵn sàng để được dùng ở các module nghiệp vụ sau

**Given** quản trị viên cần cấu hình mẫu thông báo hoặc tham số nền
**When** cập nhật cấu hình được hỗ trợ
**Then** cấu hình được lưu và tra cứu được từ backend
**And** việc cập nhật không yêu cầu sửa mã nguồn

**Given** backend cần kiểm tra quyền hành động
**When** permission primitives được gọi
**Then** chúng có thể kết hợp role, scope, và state context theo quy ước thống nhất
**And** trả về kết quả fail closed khi context không đủ

**Technical Notes:** Gắn chặt với FR6, FR7, FR8 và các NFR bảo mật; chuẩn bị reusable admin UI theo UX guideline.

**Authorization Requirements:** Chỉ system administrator truy cập catalog/config management; permission primitives phải là cơ chế dùng chung cho các epic sau.

**Audit-Log Requirements:** Ghi audit log cho create/update/soft delete catalog records và cập nhật system parameters/templates.

**Test or Manual Verification Checklist:**
- Tạo và cập nhật ít nhất một loại catalog
- Cập nhật ít nhất một system parameter hoặc notification template
- Kiểm tra permission primitives xử lý trường hợp context thiếu
- Kiểm tra audit log cho thay đổi catalog/config

## Epic 2: Tiếp Nhận Và Nộp Hồ Sơ Đề Tài

Cho phép vận hành trọn vẹn bước đầu của quy trình: mở đợt tiếp nhận, tạo hồ sơ đề xuất, nhập nội dung, đính kèm file, kiểm tra điều kiện và nộp chính thức.

### Story 2.1: Tạo và quản lý đợt tiếp nhận đề tài

As a scientific management staff member,
I want to create and manage proposal intake periods,
So that proposal submissions are controlled by time window and required package rules.

**Business Value:** Đặt khung thời gian và luật nộp hồ sơ rõ ràng cho toàn bộ quy trình intake.

**Scope:** CRUD đợt tiếp nhận, trạng thái mở/đóng, ngày hiệu lực, applicability rules cơ bản, required package definition mức tối thiểu, danh sách và lọc đợt tiếp nhận.

**Out of Scope:** Chưa xử lý workflow đánh giá/phê duyệt; chưa có rule engine phức tạp.

**Acceptance Criteria:**

**Given** chuyên viên quản lý khoa học có quyền phù hợp
**When** tạo đợt tiếp nhận với ngày bắt đầu, ngày kết thúc và yêu cầu hồ sơ
**Then** đợt tiếp nhận được lưu với trạng thái hợp lệ
**And** có thể được dùng để nhận proposal sau đó

**Given** một đợt tiếp nhận đang mở
**When** đến sau ngày kết thúc hoặc bị đóng thủ công
**Then** hệ thống không cho nộp mới vào đợt đó
**And** trạng thái đợt tiếp nhận hiển thị rõ ràng

**Technical Notes:** Tạo entity intake period và cấu trúc requirement package chỉ ở mức cần cho submission flow; tránh over-design.

**Authorization Requirements:** Chỉ staff được ủy quyền hoặc admin mới quản lý intake periods; PI chỉ được xem các đợt tiếp nhận áp dụng cho họ.

**Audit-Log Requirements:** Ghi audit log cho create/update/open/close intake period.

**Test or Manual Verification Checklist:**
- Tạo đợt tiếp nhận mới
- Đóng/mở đợt tiếp nhận
- Kiểm tra không nộp được vào đợt đã đóng
- Kiểm tra audit log tương ứng

### Story 2.2: Tạo nháp hồ sơ đề xuất và nhập thông tin có cấu trúc

As a principal investigator,
I want to create and save a proposal draft with structured data,
So that I can prepare a complete submission over multiple sessions.

**Business Value:** Giảm rủi ro mất dữ liệu và cho phép chủ nhiệm hoàn thiện hồ sơ theo từng bước thực tế.

**Scope:** Tạo proposal draft; sectioned form cho title, field, host unit, participants, timeline, objectives, summary, budget metadata; save draft; basic detail/history placeholder.

**Out of Scope:** Chưa nộp chính thức; chưa xử lý yêu cầu bổ sung; chưa chấm điểm.

**Acceptance Criteria:**

**Given** một PI có quyền nộp hồ sơ trong đợt hợp lệ
**When** họ tạo hồ sơ nháp và nhập dữ liệu bắt buộc
**Then** proposal draft được lưu
**And** có thể mở lại để chỉnh sửa tiếp

**Given** form hồ sơ dài
**When** người dùng thao tác trên desktop hoặc mobile
**Then** form được chia section rõ ràng
**And** vẫn sử dụng được ở các breakpoint yêu cầu mà không tràn ngang toàn trang

**Given** dữ liệu không hợp lệ ở một trường
**When** người dùng rời trường hoặc gửi lưu
**Then** lỗi hiển thị inline gần trường sai
**And** không làm mất dữ liệu hợp lệ đã nhập

**Technical Notes:** Bao phủ mạnh UX-DR9, UX-DR10, UX-DR12; ưu tiên section clarity và save draft.

**Authorization Requirements:** Chỉ PI hoặc người được cấp quyền thay mặt mới tạo/sửa draft của proposal thuộc scope hợp lệ; staff chỉ đọc khi workflow cho phép.

**Audit-Log Requirements:** Ghi audit log cho create proposal draft và các cập nhật quan trọng nếu đã lưu business-significant changes.

**Test or Manual Verification Checklist:**
- Tạo proposal draft mới
- Lưu nháp nhiều lần
- Kiểm tra validation inline
- Kiểm tra responsive form ở `390px`, `768px`, `1440px`

### Story 2.3: Đính kèm hồ sơ đề xuất và kiểm tra điều kiện trước khi nộp

As a principal investigator,
I want to upload required attachments and see submission readiness,
So that I can know whether my proposal can be submitted formally.

**Business Value:** Giảm hồ sơ thiếu thành phần và tăng tỷ lệ nộp đúng ngay lần đầu.

**Scope:** Upload file proposal attachments, file validation type/size, attachment metadata UI, required-file completeness checks, submission readiness panel.

**Out of Scope:** Chưa hỗ trợ replace/version history nâng cao ngoài mức cần cho proposal submission; chưa xử lý supplement cycle.

**Acceptance Criteria:**

**Given** proposal draft yêu cầu tệp bắt buộc
**When** PI tải tệp hợp lệ lên
**Then** tệp được liên kết đúng với proposal
**And** UI hiển thị tên tệp, loại, dung lượng, uploader, thời điểm tải

**Given** tệp không hợp lệ về loại hoặc dung lượng
**When** người dùng tải lên
**Then** hệ thống từ chối tệp
**And** hiển thị lỗi rõ ràng, không mơ hồ

**Given** proposal draft chưa đủ dữ liệu hoặc tệp bắt buộc
**When** hệ thống đánh giá readiness
**Then** người dùng nhìn thấy rõ các mục còn thiếu
**And** chưa thể nộp chính thức khi điều kiện chưa đạt

**Technical Notes:** Bắt đầu dùng files module theo chiều dọc proposal; enforcement permission cho upload/view file là bắt buộc.

**Authorization Requirements:** Chỉ PI hoặc người được ủy quyền mới upload file vào draft của họ; backend luôn kiểm tra record association và quyền truy cập.

**Audit-Log Requirements:** Ghi audit log cho upload important file.

**Test or Manual Verification Checklist:**
- Upload tệp hợp lệ
- Từ chối tệp sai loại/sai dung lượng
- Kiểm tra metadata file hiển thị
- Kiểm tra readiness panel phản ánh đúng thiếu sót

### Story 2.4: Nộp hồ sơ chính thức và xem lịch sử nộp

As a principal investigator,
I want to submit my prepared proposal formally and view submission history,
So that the proposal enters the controlled intake workflow with traceable status changes.

**Business Value:** Chuyển hồ sơ từ trạng thái chuẩn bị sang quy trình chính thức có quản trị và truy vết.

**Scope:** Submit action, controlled status transition from draft to submitted, confirmation dialog, submission history/timeline entries, read-only protections after submit theo rule cơ bản.

**Out of Scope:** Chưa xử lý supplement requests; chưa reviewer assignment.

**Acceptance Criteria:**

**Given** proposal draft đã đạt điều kiện readiness
**When** PI xác nhận nộp chính thức
**Then** proposal chuyển sang trạng thái submitted
**And** hệ thống ghi nhận timestamp cùng actor của lần nộp

**Given** proposal chưa đủ điều kiện nộp
**When** PI cố nộp chính thức
**Then** hệ thống từ chối chuyển trạng thái
**And** chỉ ra các điều kiện còn thiếu

**Given** proposal đã được nộp
**When** người dùng xem chi tiết proposal
**Then** họ thấy timeline hoặc history của trạng thái nộp
**And** các hành động chỉnh sửa trái phép bị chặn theo rule trạng thái

**Technical Notes:** State transition phải là explicit domain operation; timeline UX cần rõ ràng theo UX-DR13/14.

**Authorization Requirements:** Chỉ PI/chủ sở hữu proposal được submit; các actor khác chỉ xem hoặc thao tác tùy theo role/state.

**Audit-Log Requirements:** Ghi audit log cho `submit proposal` và trạng thái liên quan.

**Test or Manual Verification Checklist:**
- Nộp hồ sơ đủ điều kiện thành công
- Chặn nộp khi thiếu dữ liệu hoặc thiếu file
- Kiểm tra history/timeline hiển thị lần nộp
- Kiểm tra audit log cho hành động submit

## Epic 3: Bổ Sung, Đánh Giá Và Phê Duyệt Đề Tài

Cho phép xử lý toàn bộ giai đoạn thẩm định đề xuất sau khi nộp chính thức, từ bổ sung đến quyết định phê duyệt.

### Story 3.1: Yêu cầu bổ sung và nộp lại hồ sơ

As a scientific management staff member and principal investigator,
I want to issue, receive, and resolve supplement requests,
So that incomplete proposals can be corrected within a traceable workflow.

**Business Value:** Giảm việc xử lý ngoài hệ thống và tạo vòng phản hồi có deadline, lý do, và trạng thái rõ ràng.

**Scope:** Staff request supplement với lý do và hạn; PI xem supplement request; chỉnh sửa proposal và file liên quan; resubmit after supplement; timeline/history updates.

**Out of Scope:** Chưa phân công reviewer; chưa phê duyệt cuối cùng.

**Acceptance Criteria:**

**Given** proposal ở trạng thái phù hợp để kiểm tra tính đầy đủ
**When** staff gửi yêu cầu bổ sung với reason và due date
**Then** proposal chuyển sang trạng thái chờ bổ sung
**And** PI nhìn thấy nội dung yêu cầu cùng hạn phản hồi

**Given** proposal đang chờ bổ sung
**When** PI cập nhật dữ liệu/tệp và nộp lại
**Then** proposal chuyển sang trạng thái resubmitted hoặc tương đương
**And** hệ thống giữ lại lịch sử yêu cầu bổ sung và lần nộp lại

**Given** proposal không ở trạng thái cho phép bổ sung
**When** staff hoặc PI cố thao tác
**Then** hệ thống từ chối thao tác
**And** trạng thái không bị thay đổi sai

**Technical Notes:** Bao phủ FR15, FR16, FR22; phải hỗ trợ lịch sử đa vòng nếu business cho phép, nhưng story có thể bắt đầu với một vòng chuẩn hóa tốt.

**Authorization Requirements:** Staff được quyền yêu cầu bổ sung trong scope của mình; PI chỉ phản hồi proposal của chính mình; reviewer/lãnh đạo không có quyền sửa nội dung proposal ở bước này.

**Audit-Log Requirements:** Ghi audit log cho `request supplement`, `update proposal`, `resubmit proposal`.

**Test or Manual Verification Checklist:**
- Gửi yêu cầu bổ sung
- PI xem yêu cầu và nộp lại
- Kiểm tra state transitions hợp lệ
- Kiểm tra audit log và timeline

### Story 3.2: Phân công reviewer và truy cập proposal theo assignment

As a scientific management staff member,
I want to assign reviewers or council members to proposals,
So that evaluation work is routed securely to the right people.

**Business Value:** Tạo bước chuyển từ intake sang evaluation có kiểm soát, tránh lộ hồ sơ ngoài phạm vi phân công.

**Scope:** Assignment records, assign/reassign reviewer trong rule cho phép, reviewer queue/list for assigned proposals, assignment notifications hook.

**Out of Scope:** Chưa nhập score/comments chi tiết; chưa tổng hợp kết quả.

**Acceptance Criteria:**

**Given** proposal sẵn sàng cho đánh giá
**When** staff gán một hoặc nhiều reviewer/hội đồng
**Then** assignment được lưu
**And** chỉ những người được gán mới thấy proposal trong khu vực đánh giá của họ

**Given** một reviewer không được phân công
**When** họ cố truy cập proposal không thuộc assignment
**Then** hệ thống từ chối truy cập
**And** không rò rỉ metadata nhạy cảm của proposal đó

**Given** staff cần điều chỉnh phân công
**When** thay đổi assignment trong trạng thái hợp lệ
**Then** assignment mới có hiệu lực
**And** lịch sử phân công được lưu vết

**Technical Notes:** Data-scope + assignment-scope enforcement là trọng tâm; tránh cho reviewer thấy proposal ngoài assignment.

**Authorization Requirements:** Chỉ staff hoặc role được phép mới assign/reassign; reviewer chỉ xem assigned items.

**Audit-Log Requirements:** Ghi audit log cho `assign reviewer` và thay đổi assignment liên quan.

**Test or Manual Verification Checklist:**
- Gán reviewer thành công
- Reviewer được gán truy cập được
- Reviewer không được gán bị chặn
- Kiểm tra lịch sử và audit log assignment

### Story 3.3: Reviewer chấm điểm và gửi nhận xét

As a reviewer or council member,
I want to submit scores, comments, and recommendations for assigned proposals,
So that the evaluation outcome can be consolidated in a controlled manner.

**Business Value:** Số hóa bước đánh giá học thuật quan trọng nhất, giúp tổng hợp nhanh và có truy vết.

**Scope:** Review form, score criteria selection, save/submit review, draft-vs-submitted review state nếu cần, reviewer-only access to own review, attachments/comments if required minimally.

**Out of Scope:** Chưa tổng hợp nhiều review thành quyết định staff; chưa phê duyệt lãnh đạo.

**Acceptance Criteria:**

**Given** reviewer được phân công proposal
**When** reviewer nhập score, comment, recommendation và gửi
**Then** kết quả đánh giá được lưu gắn với proposal và reviewer đó
**And** reviewer không thể ghi đè trái phép lên review của người khác

**Given** score criteria hoặc trường bắt buộc còn thiếu
**When** reviewer cố submit
**Then** hệ thống chặn submit
**And** hiển thị lỗi rõ ràng gần trường liên quan

**Given** reviewer đã submit review
**When** staff xem proposal
**Then** staff thấy trạng thái hoàn thành đánh giá tương ứng
**And** lịch sử xử lý thể hiện thời điểm gửi đánh giá

**Technical Notes:** Bao phủ UX form validation, accessibility, status visibility; entity review chỉ tạo phần cần cho scoring/comments.

**Authorization Requirements:** Chỉ reviewer được gán mới tạo/sửa review của mình trong trạng thái cho phép; staff được đọc để tổng hợp; PI không được thấy nội dung review nếu policy chưa cho phép.

**Audit-Log Requirements:** Ghi audit log cho `submit score and review comment`.

**Test or Manual Verification Checklist:**
- Reviewer submit review hợp lệ
- Chặn submit khi thiếu score/comment bắt buộc
- Chặn reviewer truy cập/sửa review không thuộc họ
- Kiểm tra audit log và trạng thái completion

### Story 3.4: Theo dõi tiến độ đánh giá và tổng hợp kết quả

As a scientific management staff member,
I want to monitor review completion and consolidate evaluation outcomes,
So that proposals can move efficiently toward an approval decision.

**Business Value:** Giảm theo dõi thủ công bằng bảng tính/email và tăng khả năng ra quyết định đúng hạn.

**Scope:** Review progress view, completion status by reviewer, consolidated evaluation summary entry, readiness-to-approve marker, queue of proposals waiting decision.

**Out of Scope:** Chưa để lãnh đạo ra quyết định; chưa xử lý dashboard cấp cao toàn hệ thống.

**Acceptance Criteria:**

**Given** proposal có nhiều reviewer assignments
**When** staff mở màn hình theo dõi đánh giá
**Then** staff thấy reviewer nào đã hoàn thành/chưa hoàn thành
**And** có thể nhận biết proposal nào đã sẵn sàng để tổng hợp

**Given** đủ thông tin đánh giá
**When** staff nhập summary/consolidated outcome
**Then** proposal được đánh dấu sẵn sàng cho bước phê duyệt
**And** summary được lưu có truy vết người nhập

**Technical Notes:** UX tập trung bảng/list + status badges + quick actions; tối thiểu drilldown tới reviews.

**Authorization Requirements:** Chỉ staff trong scope phù hợp xem/tổng hợp; reviewer không được sửa consolidated outcome.

**Audit-Log Requirements:** Ghi audit log cho cập nhật tổng hợp đánh giá quan trọng.

**Test or Manual Verification Checklist:**
- Xem được tiến độ hoàn thành review
- Tạo consolidated outcome
- Kiểm tra readiness marker cho proposal
- Kiểm tra history/audit cho summary action

### Story 3.5: Phê duyệt hoặc từ chối proposal

As a leadership or approval authority user,
I want to review the complete proposal record and make a formal approval decision,
So that accepted proposals can advance into project execution while rejected ones remain traceable.

**Business Value:** Hoàn tất vòng đời proposal bằng quyết định có thẩm quyền, minh bạch và truy vết được.

**Scope:** Approval decision view with proposal history, review outputs, files, consolidated summary; approve/reject action; controlled state transitions; confirmation dialogs; decision history.

**Out of Scope:** Chưa tạo approved project record; chưa xử lý project execution.

**Acceptance Criteria:**

**Given** proposal ở trạng thái sẵn sàng phê duyệt
**When** lãnh đạo mở hồ sơ
**Then** họ thấy đủ thông tin cần quyết định gồm history, reviews, files, summary
**And** dữ liệu hiển thị vẫn tuân thủ permission rules

**Given** lãnh đạo xác nhận approve hoặc reject
**When** gửi quyết định
**Then** proposal chuyển sang trạng thái đích hợp lệ
**And** quyết định được lưu cùng actor, timestamp, và ghi chú nếu có

**Given** proposal chưa ở trạng thái cho phép quyết định
**When** người dùng cố approve/reject
**Then** hệ thống từ chối thao tác
**And** không cho phép bypass workflow state

**Technical Notes:** Đây là story đóng vòng proposal; confirmation UX bắt buộc; fail closed nếu thiếu authority context.

**Authorization Requirements:** Chỉ approval authority được quyết định; staff/reviewer/PI không được gọi action này ngoài permission rules.

**Audit-Log Requirements:** Ghi audit log cho `approve` và `reject`.

**Test or Manual Verification Checklist:**
- Approve proposal hợp lệ
- Reject proposal hợp lệ
- Chặn quyết định khi proposal chưa ở state đúng
- Kiểm tra history và audit log cho decision

## Epic 4: Theo Dõi Đề Tài Được Duyệt Và Tiến Độ Thực Hiện

Chuyển từ decision stage sang execution stage của đề tài đã được duyệt và quản lý các vòng đời tiếp theo.

### Story 4.1: Khởi tạo hồ sơ đề tài thực hiện từ proposal đã duyệt

As a scientific management staff member,
I want an approved proposal to become an approved-project record,
So that project execution can be tracked without re-entering core source data.

**Business Value:** Bảo toàn dữ liệu nguồn và mở ra giai đoạn quản lý thực hiện ngay sau phê duyệt.

**Scope:** Create approved-project from approved proposal, copy/link relevant source data, initial project detail view, project member baseline visibility.

**Out of Scope:** Chưa tạo milestone/reporting; chưa adjustment/final review.

**Acceptance Criteria:**

**Given** proposal đã được phê duyệt
**When** hệ thống hoặc staff tạo approved project
**Then** approved-project record được khởi tạo với dữ liệu nguồn liên quan
**And** proposal và project liên kết truy vết được với nhau

**Given** project đã được tạo
**When** PI hoặc project member có quyền xem
**Then** họ thấy thông tin cơ bản của project cùng liên kết nguồn gốc từ proposal
**And** chỉ thấy trong phạm vi được phép

**Technical Notes:** Tránh duplicate không cần thiết; ưu tiên link + snapshot chọn lọc.

**Authorization Requirements:** Chỉ staff hoặc backend workflow tự động được tạo approved project; project members chỉ xem nếu được gán.

**Audit-Log Requirements:** Ghi audit log cho create approved project.

**Test or Manual Verification Checklist:**
- Tạo approved project từ proposal đã duyệt
- Kiểm tra dữ liệu nguồn được mang sang đúng
- Kiểm tra project link ngược về proposal
- Kiểm tra audit log tạo project

### Story 4.2: Quản lý milestone, checkpoint và thành viên đề tài

As a scientific management staff member,
I want to define milestones, reporting checkpoints, and participant visibility,
So that project execution has a clear schedule and accountability structure.

**Business Value:** Thiết lập kế hoạch thực hiện và cơ chế theo dõi rõ ràng ngay khi project bắt đầu.

**Scope:** CRUD milestones/checkpoints, assign members/roles trong project nếu chưa có đủ, project detail timeline of plan, basic due-date indicators.

**Out of Scope:** Chưa có actual progress report submission; chưa reminders tự động.

**Acceptance Criteria:**

**Given** approved project đã tồn tại
**When** staff cấu hình milestone và reporting checkpoints
**Then** project lưu được các mốc theo thời gian
**And** các mốc hiển thị rõ trong project detail

**Given** project member thuộc project
**When** họ xem project trong phạm vi được cấp
**Then** họ thấy các milestone liên quan và trách nhiệm cơ bản của mình
**And** không thấy project ngoài phạm vi tham gia

**Technical Notes:** Bao phủ FR24 và FR30a; milestone/status UX cần dễ quét trên desktop lẫn mobile.

**Authorization Requirements:** Staff quản lý milestone; member chỉ xem thông tin họ được cấp; leadership xem tùy scope.

**Audit-Log Requirements:** Ghi audit log cho create/update milestone và thay đổi thành viên dự án quan trọng.

**Test or Manual Verification Checklist:**
- Tạo milestone/checkpoint
- Kiểm tra project member thấy đúng project của mình
- Chặn member xem project không liên quan
- Kiểm tra audit log thay đổi mốc/kế hoạch

### Story 4.3: Nộp báo cáo tiến độ và evidence thực hiện

As a principal investigator or permitted project member,
I want to submit progress reports and supporting evidence,
So that project progress can be reviewed on schedule.

**Business Value:** Số hóa bước báo cáo định kỳ, tạo đầu vào chuẩn cho giám sát tiến độ.

**Scope:** Create progress report linked to checkpoint, upload evidence files, member-contribution file support within granted scope, report status baseline, report form UX.

**Out of Scope:** Chưa xử lý adjustment request; chưa final review.

**Acceptance Criteria:**

**Given** project có checkpoint đến hạn
**When** PI nộp progress report với evidence cần thiết
**Then** report được lưu gắn với project và checkpoint
**And** trạng thái báo cáo phản ánh đã nộp/chờ rà soát

**Given** project member được cấp quyền nộp evidence trong phạm vi giới hạn
**When** member upload contribution file
**Then** evidence được chấp nhận và gắn đúng project/report context
**And** member không thể nộp ra ngoài scope được cấp

**Given** dữ liệu báo cáo hoặc file còn thiếu
**When** người dùng cố submit
**Then** hệ thống chặn submit
**And** chỉ ra rõ các thiếu sót

**Technical Notes:** Bao phủ FR25 và FR30b; tái sử dụng patterns file/history; mobile-friendly report form là bắt buộc.

**Authorization Requirements:** PI submit full report; member chỉ upload contribution/evidence theo grant; staff đọc/soát trong scope.

**Audit-Log Requirements:** Ghi audit log cho create/update progress report và upload important file.

**Test or Manual Verification Checklist:**
- PI nộp báo cáo tiến độ
- Member upload evidence hợp lệ trong scope
- Chặn upload ngoài scope
- Kiểm tra audit log và timeline report

### Story 4.4: Rà soát báo cáo tiến độ và theo dõi chậm hạn

As a scientific management staff member,
I want to review submitted progress reports and detect delayed projects,
So that unresolved issues and overdue execution are visible early.

**Business Value:** Tăng khả năng giám sát chủ động thay vì chỉ phản ứng sau khi đề tài đã chậm sâu.

**Scope:** Review progress report, request follow-up note, unresolved issues list, overdue project indicators, waiting-for-admin-action markers.

**Out of Scope:** Chưa gửi reminder tự động; chưa dashboard tổng hợp cấp hệ thống.

**Acceptance Criteria:**

**Given** progress reports đã được nộp
**When** staff rà soát
**Then** staff có thể đánh dấu cần follow-up hoặc chấp nhận ở mức quy trình phù hợp
**And** issue/unresolved state được hiển thị rõ trong project context

**Given** project hoặc checkpoint quá hạn
**When** staff xem danh sách project
**Then** hệ thống hiển thị trạng thái delayed/upcoming/waiting action rõ ràng
**And** các indicator dựa trên deadline và trạng thái hiện hành

**Technical Notes:** Chuẩn bị dữ liệu cho Epic 6/7 nhưng tự bản thân story vẫn hoàn chỉnh về giá trị giám sát.

**Authorization Requirements:** Chỉ staff/leadership phù hợp mới xem và đánh dấu follow-up trong scope của mình.

**Audit-Log Requirements:** Ghi audit log cho review/follow-up actions quan trọng trên progress report.

**Test or Manual Verification Checklist:**
- Rà soát report và ghi follow-up
- Hiển thị project delayed/upcoming
- Kiểm tra indicator theo đúng deadline
- Kiểm tra audit log follow-up/review

### Story 4.5: Điều chỉnh, gia hạn, nghiệm thu và final review

As a principal investigator and approval authority,
I want to request and decide key project lifecycle changes,
So that project execution can adapt and close through controlled workflows.

**Business Value:** Hoàn thiện các trạng thái quan trọng cuối vòng đời đề tài thực hiện và tránh xử lý ngoại luồng.

**Scope:** Adjustment/extension request submission; review/decision actions; acceptance/final review actions; explicit state transitions for approved project lifecycle.

**Out of Scope:** Chưa có báo cáo phân tích nâng cao sau nghiệm thu; chưa có digital signature.

**Acceptance Criteria:**

**Given** approved project ở trạng thái phù hợp
**When** PI gửi adjustment hoặc extension request
**Then** request được lưu với lý do và context cần thiết
**And** project chuyển vào trạng thái chờ xử lý phù hợp

**Given** request hoặc project ở bước cần quyết định
**When** authority phê duyệt hoặc từ chối adjustment/extension/acceptance/final review
**Then** trạng thái project chuyển hợp lệ theo state machine
**And** quyết định được lưu với history đầy đủ

**Given** thao tác không hợp lệ theo current project state
**When** user cố thực hiện action
**Then** hệ thống chặn thao tác
**And** không cho phép cập nhật tùy ý trạng thái project

**Technical Notes:** Đây là story state-heavy; nên chia code theo explicit domain operations, không cập nhật status tự do.

**Authorization Requirements:** PI tạo request; staff/leadership/authority quyết định tùy loại action; members khác không được thao tác ngoài scope.

**Audit-Log Requirements:** Ghi audit log cho create adjustment request, approve/reject request, acceptance actions, final review decisions.

**Test or Manual Verification Checklist:**
- Tạo adjustment/extension request
- Approve/reject request
- Thực hiện acceptance/final review hợp lệ
- Kiểm tra state transition và audit log

## Epic 5: Giao Việc, Tệp Tin, Lịch Sử Và Audit

Tăng khả năng vận hành hàng ngày và trách nhiệm giải trình trên toàn hệ thống.

### Story 5.1: Tạo và phân công công việc liên kết nghiệp vụ

As a authorized user,
I want to create tasks linked to business records and assign responsibility,
So that follow-up work is explicit and trackable.

**Business Value:** Biến các việc cần xử lý thành đối tượng quản lý rõ ràng thay vì chỉ tồn tại trong email hoặc ghi chú rời rạc.

**Scope:** Task entity baseline, create task standalone/linked, assignee/collaborator, due date, priority, instruction, task list/detail baseline.

**Out of Scope:** Chưa có automated reminders; chưa dashboard tổng hợp tasks.

**Acceptance Criteria:**

**Given** user có quyền tạo task
**When** họ tạo task gắn với proposal, project, report hoặc độc lập
**Then** task được lưu cùng relation business context
**And** assignee, due date, priority hiển thị rõ trong task detail

**Given** task được gắn với business record
**When** người dùng xem record hoặc task liên quan
**Then** có thể điều hướng qua lại giữa task và bản ghi nguồn
**And** traceability được giữ nguyên

**Technical Notes:** Tạo đúng bảng/task fields cần dùng; không làm task engine phức tạp.

**Authorization Requirements:** Chỉ role được phép mới tạo/assign task; visibility theo scope và linked record permissions.

**Audit-Log Requirements:** Ghi audit log cho `create task` và `assign task`.

**Test or Manual Verification Checklist:**
- Tạo task standalone
- Tạo task linked với proposal/project
- Gán assignee/collaborator
- Kiểm tra audit log tạo/gán task

### Story 5.2: Cập nhật trạng thái task và evidence hoàn thành

As a task assignee,
I want to update task status, notes, and completion evidence,
So that work progress is visible and verifiable.

**Business Value:** Cho phép chuyên viên và thành viên cập nhật tiến độ công việc trực tiếp trong hệ thống, phục vụ giám sát và accountability.

**Scope:** Task status flow, progress notes, completion evidence attachment, overdue indicator at task level, task history baseline.

**Out of Scope:** Chưa có automated reminders/email; chưa có aggregated task dashboard.

**Acceptance Criteria:**

**Given** assignee có quyền với task
**When** cập nhật status hoặc ghi chú tiến độ
**Then** task lưu được thay đổi
**And** history hiển thị ai cập nhật, lúc nào, thay đổi gì

**Given** task yêu cầu bằng chứng hoàn thành
**When** assignee tải evidence lên
**Then** evidence gắn đúng với task
**And** metadata file được lưu đầy đủ

**Given** task ở trạng thái hoặc scope không cho phép sửa
**When** user cố cập nhật
**Then** hệ thống từ chối
**And** trạng thái task không bị thay đổi sai

**Technical Notes:** Bao phủ FR33, FR34, FR35 ở mức task workflow cơ bản; UX cần status + notes + file evidence rõ ràng.

**Authorization Requirements:** Assignee và authorized collaborators cập nhật theo rule; người ngoài scope không truy cập/sửa task.

**Audit-Log Requirements:** Ghi audit log cho `update task status`, upload important file, completion evidence updates.

**Test or Manual Verification Checklist:**
- Cập nhật status task hợp lệ
- Thêm progress notes
- Upload evidence hoàn thành
- Kiểm tra history và audit log

### Story 5.3: Dịch vụ file dùng chung với metadata, quyền truy cập và lịch sử thay thế

As a authorized user,
I want a consistent file-management capability across business records,
So that important documents remain permission-controlled and traceable.

**Business Value:** Tạo nền file management thống nhất cho proposal, project, report và task, giảm rủi ro lộ file hoặc mất truy vết.

**Scope:** Shared files service/API/UI patterns for upload/view/download/replace, metadata display, permission enforcement, optional preview for common types, replacement/version history baseline.

**Out of Scope:** Chưa hỗ trợ mọi loại preview nâng cao; chưa làm DMS độc lập.

**Acceptance Criteria:**

**Given** file gắn với business record quan trọng
**When** user có quyền xem hoặc tải xuống
**Then** hệ thống cho phép truy cập qua service được kiểm soát
**And** không cho phép truy cập trực tiếp chỉ bằng object key

**Given** user không có quyền với record liên quan
**When** họ cố xem hoặc tải file
**Then** hệ thống từ chối
**And** không rò rỉ metadata nhạy cảm của file

**Given** file được thay thế trong workflow cho phép
**When** replace action thành công
**Then** hệ thống giữ metadata và version/replacement history tối thiểu
**And** vẫn truy vết được uploader và timestamp

**Technical Notes:** Bao phủ FR36, FR37 và rules từ project context; phải qua files module.

**Authorization Requirements:** Permission check mọi lần upload/view/download/replace; record-level access bắt buộc.

**Audit-Log Requirements:** Ghi audit log cho upload important file, download important file, replace file nếu là action quan trọng.

**Test or Manual Verification Checklist:**
- Upload/view/download file hợp lệ
- Chặn truy cập file trái phép
- Replace file và kiểm tra replacement history
- Kiểm tra audit log download/upload/replace

### Story 5.4: Lịch sử xử lý và tra cứu audit log theo thẩm quyền

As a authorized administrator or business user,
I want to inspect workflow history and audit logs,
So that decisions and changes can be investigated and defended.

**Business Value:** Củng cố accountability và hỗ trợ kiểm tra, giải trình, xử lý tranh chấp.

**Scope:** History timeline for key entities, audit-log list/detail query for authorized users, filters by actor/action/entity/time, role-sensitive visibility.

**Out of Scope:** Chưa làm analytics nâng cao trên audit logs; chưa export audit riêng.

**Acceptance Criteria:**

**Given** một proposal, project hoặc task có nhiều thay đổi
**When** user có thẩm quyền mở history
**Then** họ thấy timeline xử lý rõ actor, action, timestamp, context
**And** các mốc liên quan tới comment/decision/file được liên kết trực tiếp

**Given** admin hoặc business authority cần tra cứu audit
**When** lọc theo actor/action/entity/time
**Then** hệ thống trả về các bản ghi audit phù hợp
**And** chỉ hiển thị các bản ghi mà người dùng được phép xem

**Technical Notes:** Gắn chặt UX-DR13/14 và FR38/39/40; cần distinction giữa business history và raw audit events.

**Authorization Requirements:** Chỉ authorized users xem history/audit; visibility vẫn phải respect role và data scope.

**Audit-Log Requirements:** Story này là lớp tra cứu; không thêm loại action mới ngoài các truy vấn hệ thống nếu cần logging vận hành.

**Test or Manual Verification Checklist:**
- Xem history của proposal/project/task
- Lọc audit logs
- Chặn user không có quyền xem audit/history
- Kiểm tra liên kết giữa timeline và các mốc file/decision

## Epic 6: Thông Báo, Nhắc Việc Và Hàng Đợi Công Việc

Biến trạng thái và deadline thành hành động cụ thể mà người dùng thấy đúng lúc.

### Story 6.1: Thông báo trong ứng dụng cho sự kiện nghiệp vụ quan trọng

As a internal user,
I want to receive in-app notifications for assignments, supplements, approvals, and state changes,
So that I know what needs my attention without external follow-up.

**Business Value:** Tăng khả năng phản hồi đúng lúc và giảm lệ thuộc vào trao đổi thủ công.

**Scope:** Notification entity/UI list, unread/read state, triggers for core actions already built, links from notification to target record.

**Out of Scope:** Chưa có email notifications; chưa có reminder batching.

**Acceptance Criteria:**

**Given** một action nghiệp vụ quan trọng xảy ra
**When** action đó thuộc tập trigger được hỗ trợ
**Then** notification in-app được tạo cho đúng recipient
**And** recipient có thể điều hướng tới record liên quan

**Given** user mở trung tâm thông báo
**When** họ xem danh sách
**Then** notification hiển thị trạng thái read/unread và thông tin ngắn gọn
**And** chỉ hiển thị notification thuộc phạm vi quyền của họ

**Technical Notes:** Trigger ít nhưng đúng trước; không làm notification center quá nặng ở story đầu.

**Authorization Requirements:** Notification delivery phải respect role/scope/assignment; user không thấy notification của người khác.

**Audit-Log Requirements:** Có thể ghi operational log cho notification creation nếu cần truy vết trigger, nhưng không thay thế business audit hiện có.

**Test or Manual Verification Checklist:**
- Tạo notification khi assign reviewer/task
- Tạo notification khi request supplement/approval event
- Kiểm tra user chỉ thấy notification của mình
- Kiểm tra link từ notification tới record nguồn

### Story 6.2: Email notifications cho sự kiện và quyết định trọng yếu

As a internal user,
I want to receive email notifications for important workflow events,
So that I do not miss required actions when away from the application.

**Business Value:** Tăng khả năng nhận biết công việc cần xử lý với các bước quan trọng và deadline.

**Scope:** Email dispatch integration, templates for key events, retry-safe queueing, status tracking tối thiểu cho send attempts.

**Out of Scope:** Chưa có email preference center đầy đủ; chưa có SMS.

**Acceptance Criteria:**

**Given** một event được cấu hình gửi email
**When** event đó xảy ra
**Then** email notification được đưa vào queue và gửi tới recipient hợp lệ
**And** nội dung email dùng template phù hợp

**Given** job gửi email thất bại tạm thời
**When** hệ thống retry theo quy tắc idempotent
**Then** không tạo duplicate business outcome
**And** có thể quan sát được trạng thái gửi ở mức vận hành tối thiểu

**Technical Notes:** Phù hợp NFR11; reuse notification template config từ Epic 1.

**Authorization Requirements:** Recipient selection luôn theo permission/business context; không gửi nội dung nhạy cảm cho người ngoài scope.

**Audit-Log Requirements:** Không bắt buộc audit log business riêng cho mỗi email; nên có operational log/queue trace cho troubleshooting.

**Test or Manual Verification Checklist:**
- Gửi email cho event quan trọng
- Kiểm tra template đúng
- Mô phỏng retry an toàn
- Xác nhận không gửi cho recipient ngoài scope

### Story 6.3: Reminder jobs và hàng đợi việc chờ xử lý

As a internal user,
I want deadline reminders and a personalized work queue,
So that I can prioritize overdue and upcoming actions in one place.

**Business Value:** Giảm nguy cơ bỏ sót việc quá hạn và tăng khả năng xử lý chủ động.

**Scope:** Reminder job rules for supplement deadlines, review deadlines, report deadlines, task due dates; user work queue list; idempotent scheduling and retry behavior.

**Out of Scope:** Chưa làm dashboard analytics nâng cao; chưa có rule configurator phức tạp.

**Acceptance Criteria:**

**Given** một record có deadline sắp tới hoặc đã quá hạn
**When** reminder job chạy
**Then** hệ thống tạo reminder/notification phù hợp
**And** tránh gửi trùng lặp không cần thiết cho cùng một trigger

**Given** user mở hàng đợi công việc cá nhân
**When** hệ thống tải dữ liệu
**Then** user thấy items đang chờ xử lý theo vai trò của mình
**And** mỗi item có trạng thái, hạn xử lý và đường dẫn tới bản ghi nguồn

**Technical Notes:** Bao phủ FR43/44; queue design phải idempotent; work queue là view nghiệp vụ chứ không chỉ là danh sách notification.

**Authorization Requirements:** Queue chỉ chứa item thuộc role/scope/assignment của current user.

**Audit-Log Requirements:** Không bắt buộc audit log business cho mỗi reminder; nhưng các action người dùng thực hiện từ queue vẫn đi qua audit của module nguồn.

**Test or Manual Verification Checklist:**
- Sinh reminder cho deadline sắp đến
- Sinh reminder cho item quá hạn
- Kiểm tra queue cá nhân hiển thị đúng items
- Kiểm tra tránh duplicate reminder khi retry

## Epic 7: Dashboard Điều Hành, Tìm Kiếm, Báo Cáo Và Xuất Dữ Liệu

Tạo lớp hiển thị và điều hành cho chuyên viên và lãnh đạo trên dữ liệu đã tích lũy từ các epic trước.

### Story 7.1: Tìm kiếm, lọc và danh sách điều hướng xuyên module

As a scientific management staff member or leadership user,
I want to search and filter proposals, projects, tasks, and reports,
So that I can quickly locate records that need action.

**Business Value:** Tăng tốc thao tác vận hành hàng ngày và là đầu vào cho điều hành, rà soát, báo cáo.

**Scope:** Search/filter/sort lists for primary modules, filter chips, list states, mobile-friendly filter drawer/sheet patterns, drill-down to record detail.

**Out of Scope:** Chưa có dashboard summary widgets; chưa export.

**Acceptance Criteria:**

**Given** user có quyền với tập bản ghi lớn
**When** tìm kiếm hoặc lọc theo code, title, unit, field, status, assignee, due date, intake period
**Then** danh sách trả về đúng bản ghi trong phạm vi quyền của user
**And** các bộ lọc đang áp dụng hiển thị rõ và có thể xóa nhanh

**Given** user dùng mobile hoặc tablet
**When** thao tác lọc danh sách
**Then** bộ lọc được trình bày qua drawer, bottom sheet hoặc pattern tương đương phù hợp
**And** không gây tràn ngang toàn trang

**Technical Notes:** Bao phủ UX-DR7, UX-DR8, UX-DR19; performance lists/search là NFR trọng yếu.

**Authorization Requirements:** Search/filter phải enforce backend scope filtering; không lộ count hoặc record ngoài quyền.

**Audit-Log Requirements:** Không yêu cầu audit log cho thao tác tìm kiếm/list thông thường.

**Test or Manual Verification Checklist:**
- Tìm kiếm theo mã/tên
- Lọc theo trạng thái/đơn vị/hạn xử lý
- Kiểm tra responsive list/filter trên mobile
- Kiểm tra không lộ record ngoài scope

### Story 7.2: Dashboard theo vai trò với drill-down hành động

As a leadership or scientific management user,
I want a role-based dashboard showing waiting approvals, delayed projects, overdue tasks, and upcoming reports,
So that I can move directly from signals to action.

**Business Value:** Tạo giao diện điều hành thực sự, tập trung vào việc cần xử lý thay vì chỉ hiển thị số liệu trang trí.

**Scope:** Role-based dashboard widgets, KPI cards, urgency indicators, drill-down links to filtered lists/details, responsive dashboard layout, server-backed aggregates.

**Out of Scope:** Chưa có advanced analytics lâu dài; chưa có custom dashboard builder.

**Acceptance Criteria:**

**Given** user thuộc role leadership hoặc staff
**When** mở dashboard
**Then** họ thấy các widget phù hợp vai trò và scope của mình
**And** các widget ưu tiên waiting approvals, delayed projects, overdue tasks, upcoming reports

**Given** user click vào một chỉ báo dashboard
**When** hệ thống điều hướng
**Then** user tới danh sách đã lọc hoặc bản ghi nguồn phù hợp
**And** dữ liệu drill-down nhất quán với số liệu summary ban đầu

**Given** dashboard hiển thị trên desktop và mobile
**When** render ở breakpoint yêu cầu
**Then** layout vẫn rõ ràng, không nặng trang trí, và không làm mất hành động chính
**And** status không chỉ dựa vào màu

**Technical Notes:** Bao phủ UX-DR17, UX-DR18, UX-DR20, UX-DR22; aggregates phải scope-aware.

**Authorization Requirements:** Dashboard totals và widget items luôn theo current-user scope; fail closed khi scope không xác định.

**Audit-Log Requirements:** Không yêu cầu audit log cho xem dashboard; các action downstream tiếp tục dùng audit của module nguồn.

**Test or Manual Verification Checklist:**
- Kiểm tra dashboard cho staff
- Kiểm tra dashboard cho leadership
- Drill-down từ widget tới list/detail
- Kiểm tra không lộ số liệu ngoài scope

### Story 7.3: Báo cáo tổng hợp và xuất Excel/PDF

As a authorized staff or leadership user,
I want to generate scoped reports and export them to Excel or PDF,
So that I can support executive reporting and operational review without manual spreadsheet assembly.

**Business Value:** Giảm mạnh thời gian làm báo cáo thủ công và chuẩn hóa đầu ra báo cáo của hệ thống.

**Scope:** Reporting views by unit/field/status/reporting period, export jobs or direct exports where suitable, Excel/PDF generation, progress/queued feedback for heavier exports.

**Out of Scope:** Chưa có analytics tự phục vụ phức tạp; chưa export mọi loại dữ liệu trong hệ thống.

**Acceptance Criteria:**

**Given** user có quyền với một tập báo cáo được hỗ trợ
**When** họ chọn bộ lọc và yêu cầu xem báo cáo
**Then** hệ thống trả về reporting view phù hợp với phạm vi quyền
**And** các số liệu khớp với dữ liệu nguồn hiện hành

**Given** user yêu cầu export Excel hoặc PDF
**When** export được thực thi
**Then** hệ thống tạo file đầu ra đúng định dạng
**And** vẫn giữ nguyên rule filter và permission của báo cáo gốc

**Given** export là tác vụ nặng
**When** xử lý mất thời gian
**Then** user thấy queued/progress/completion feedback phù hợp
**And** interactive requests thông thường không bị chặn

**Technical Notes:** Gắn với NFR4, FR48, FR49; export nên dùng queue cho trường hợp nặng; quyền xuất luôn đồng nhất quyền xem.

**Authorization Requirements:** Chỉ authorized users được xem/export report; mọi aggregate và file export đều phải respect data scope.

**Audit-Log Requirements:** Ghi audit log cho export báo cáo nếu được coi là hành động quan trọng; tối thiểu phải có operational trace cho export jobs.

**Test or Manual Verification Checklist:**
- Xem reporting view với bộ lọc
- Export Excel
- Export PDF
- Kiểm tra file export không chứa dữ liệu ngoài scope
