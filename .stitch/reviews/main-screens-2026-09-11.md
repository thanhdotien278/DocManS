# Main application screens — 2026-09-11 review draft

## Scope and source mapping

Eight requested screens are review drafts, not implementation-ready production components. Reuse private project `3965040673492764594`, canonical asset `c957155014ff4a7b8a36f601db08d4cc` (version 1 at start). One owned project and no shared projects were returned. Retain historical screens and the existing design system.

“Document” list/detail/edit maps to proposal dossiers in the documented domain; approved projects remain separate.

## Architecture inspected

- `docs/user-flows.md` read in full: five account roles; one active role; separate record relationships; submission, supplement, assigned review, leadership decision, explicit project creation and retained history.
- `docs/diagrams/current-architecture.md`: Next.js → NestJS enforcement → PostgreSQL/Prisma and private MinIO through the API; no deployed Redis.
- `apps/api/src/app.module.ts`: Auth, Admin, Files, Proposal Intake, Research Proposals, Proposal Evaluations, Delegations and Researcher Profiles modules.
- `apps/web/src/components/layout/app-shell.tsx`: login/reset outside shell; session loading; Sidebar/MobileNav; institution, quick search, notifications and account/system-role/unit menu.
- `docs/ux-ui-spec.md` §§3.2–3.7,4 supplies login/dashboard/search/admin detail absent from flow diagrams. Authorization baseline overrides lower-priority role shorthand.

## Limits

Desktop 1440px requested. Responsive requirements are prompt constraints, not verified behavior. Screenshot inspection cannot certify backend authorization, keyboard behavior or complete loading/empty/error states. Canonical breakpoint, Material-token/prose and frosted-surface conflicts remain open in `design-system-reconciliation.md`; this review batch does not silently overwrite them or claim reconciliation complete.

## Generation briefs

## Inspection findings (initial batch)

Overall **NEEDS_REVISION**; generated drafts are for review, not acceptance.

- Login rendered at 1440px with labelled username/password, reveal-password control, primary submit and no public signup. Generated copy invents “Phân hệ Bảo mật Cấp 3”, inactivity timeout policy, a particular support department and placeholder policy links. Remove unsupported assertions before acceptance. Source: downloaded `2026-09-11-login.html`, browser accessibility tree and desktop screenshot.
- Dashboard contains unsupported `PostgreSQL RLS` text, security-level/version/session claims, invented intake quotas and a specific automatic 17:00 lock rule. These are not architecture/product authority. Staff-versus-leadership action separation is present, but the added business copy needs revision. Source: downloaded `2026-09-11-dashboard.html` and browser accessibility tree.
- Proposal list at 1440px: document width 1440px; table has a contained horizontal-scroll region (1108px viewport / 1529px content), so actions need horizontal access. At 390px the full sidebar remains visible, crushing main content: **mobile adaptation fails**. Account header incorrectly presents PI as system role; extra security/version and contract/funding claims must be removed. Source: rendered desktop/mobile screenshots and read-only DOM measurements.
- These are findings against actual returned HTML, not proof that prompt constraints were honored. No production implementation or account/record actions were executed.

### 01 Login — Đăng nhập

Unauthenticated /login. Compact centered institutional sign-in panel, not authenticated sidebar. Username and password persistent labels, show/hide password with accessible label, Đăng nhập button; no public signup, social login, remember-me or invented self-service reset. A support instruction without invented contact address. Session protection note. Represent resting state with empty fields; validation reserves inline message space. Generic invalid-credentials feedback, locked/inactive safe message and network retry belong to alternate states, not simultaneous errors. No account enumeration or credential examples. Source ux-ui-spec3.2.

### 02 Dashboard — Tổng quan

Scientific management staff dashboard. Account system role Quản lý khoa học, scope Học viện. Compact scoped KPI cards new submissions, pending checks, supplements awaiting response, reviews overdue. Work queue with code/title/status/due date/relationship or scoped operational context and named next action, and upcoming deadlines. Relevant authorized intake summary, no invented business performance percentages. Quick links to intake and checking/assignment/consolidation; NO final approval button and no PI create-proposal action. Overdue is a flag not auto-rejection. No global role switch. Source ux-ui-spec4 staff dashboard.

### 03 Document list — Hồ sơ đề xuất

Proposal dossier list /proposals, internal PI persona. Tạo bản nháp allowed in applicable open intake. Dense table with code/title, PI, managing unit, field, intake, status, submitted date, due/risk flag, viewer relationship; combine logical metadata in cells to fit1440. Search by code/title/PI; intake/status/unit/field filters, applied removable chips, sort and pagination. Use internally consistent sample records, no mismatched active filters. My relationship uses Chủ nhiệm/Thành viên, not Quản lý trực tiếp. Action Xem chi tiết only, no submit from under_review. Draft rows show no submitted date. Counts match rendered sample rows; no bulk delete. Scope statement says only accessible dossiers, not all same-unit records. Source ux-ui-spec3.4.

### 04 Document detail — Chi tiết hồ sơ

Proposal /proposals/:id internal PI viewing draft. Header code DX-2026-014, title Nghiên cứu cải thiện phục hồi chức năng sau chấn thương, Nháp, viewer relationship Chủ nhiệm, unit Khoa Y học quân sự, intake Đợt tiếp nhận2026, deadline and next action Hoàn thiện hồ sơ. Summary metadata, overview/objectives/content, participants, files, related records, workflow and history sections. Contextual right readiness rail; edit draft allowed, formal submit disabled with safe visible reason Chưa đủ điều kiện nộp. Do not invent exact ethics/budget-approval prerequisites: checklist only required fields and required package from intake. No reviewer identities/raw reviews/decision tabs for PI draft. File upload is allowed; download only authorized files. No stale-context warning simultaneously pretending active edit is enabled. Empty permitted files section may show Chưa có tệp. Desktop main+rail; stack at1024/768. Sources proposal-detail-workspace brief and UX3.4/5.3.

### 05 Create Edit — Chỉnh sửa hồ sơ

Edit draft proposal /proposals/:id/edit for internal PI. Same DX-2026-014 record and medical title as detail. Sectioned form: applicable intake, title/type/field, managing unit, PI/members, start/end dates, objectives/content, budget metadata, required files and separate server readiness summary. Persistent labels and required markers. Save draft remains available even incomplete; Nộp chính thức disabled with readiness reason and readiness review path, never direct status dropdown. Show one inline missing-title validation sample only if title empty; choose coherent incomplete objectives instead. Nonnegative budget, date order, unique member constraints as helper text not arbitrary limits. No member/admin permission editor. Cancel returns detail; dirty changes require confirmation; no production action. Submitted versions are locked, not edited in place. SourceUX3.4.

### 06 Approval workflow — Quyết định

Leadership decision package /proposals/:id/decision. One eligible sample proposal DX-2026-009 in Chờ quyết định (ready_for_approval). Account Lãnh đạo; scope line and backend capability eligibility. Immutable submitted snapshot, permitted evaluation summary, file evidence, chronological workflow history and prior supplements. Actions Phê duyệt and Không phê duyệt with confirmation; rejection reason required. Do not add edit content, reviewer assignment, automatic project creation, digital signing or parallel approval rules. Timeline is history, not editable status steps. Show authority/no-conflict evaluated context without secret conflict sources. Conclude note approved proposal becomes project only by separate scientific-management creation. Review package excludes undisclosed raw review identities. Source user-flows3 and UX3.4 leadership decision.

### 07 Search — Tìm kiếm

Global search /search for internal researcher. Labelled keyword query, explicit Tìm kiếm, record-type tabs, facets code/title/person/unit/status/date; scoped result counts. Show consistent two sample accessible proposal/project results with record type, title/code, status, unit, date and own record relationship plus open action. No hidden-record placeholders, raw storage paths, unrestricted document content search or inferred permission. Filters chips clear; search uses same authorization scope as source lists. No results message is alternate not simultaneous populated results. Source UX3.7 global search and docs/diagrams/search.md.

### 08 Users Roles — Tài khoản và vai trò

System admin /users with Tài khoản and Vai trò & phạm vi sections visible. Account table username,name,status,EXACTLY one active system role,unit/scope,linked researcher profile. New/update/lock/reset account affordances; no hard delete. Show selected internal account settings inspector with one-role radio/select and scope plus save/cancel and explicit impact/confirmation warning. Canonical five roles SYSTEM_ADMIN,SCIENTIFIC_MANAGEMENT_STAFF,LEADERSHIP_APPROVAL_AUTHORITY,RESEARCHER_INTERNAL_USER,EXTERNAL_RESEARCHER_USER in read-only reference list. PI/member/secretary/reviewer are record relationships, NOT extra global roles; admin does not gain business access. No create custom role or wildcard permission matrix. Account locking revokes access immediately retaining profile/history. Sidebar platform administration only, no approval/business dossiers. Source user-flows1/5.3/7 and UX3.7.

