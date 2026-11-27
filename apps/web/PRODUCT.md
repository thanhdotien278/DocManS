# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** CV (`RESEARCH_MANAGEMENT_STAFF`, chuyên viên Phòng KHQS) and principal investigators (NCV, `RESEARCHER_INTERNAL_USER`), working mostly at a desktop in the office. CV run intake periods, check completeness, request supplements, assign reviewers, draft tờ trình and track approved projects. PIs create and submit proposals, answer supplement requests, update milestones and submit periodic reports.
- **Leadership:** GĐ and PGĐ-KH read role-scoped dashboards and approve or sign, sometimes from a phone. PP and PGĐ-TD only monitor (PGĐ-TD sees aggregate funding only).
- **Other roles:** TP, TB (Phòng KHQS oversight and routing), reviewers and council members (assignment-scoped), NNB external researchers, and QT system administrators.

## Product Purpose

DocManS (legacy alias RTMS) is the internal research-management system of Học viện Quân y. It manages the full topic lifecycle: intake period → proposal dossier → completeness check → appraisal/council → approval/funding → approved project → execution → acceptance → liquidation/closure (D-033). It replaces spreadsheets, email and scattered files.

Success means every user can see, for each record, its current state, the next action, who is responsible and when it is due, with no manual follow-up to find out what happens next. Leadership sees waiting approvals, overdue work and delayed projects at once.

## Positioning

An operational control surface for research administration, not a form repository or generic project tool. It encodes the Academy's actual workflow: unit-scoped access, the mandatory tờ trình routing CV → TB → TP → BGĐ, state-controlled transitions, and an audit trail for every critical action.

## Operating Context

- Authenticated internal web app inside the Học viện Quân y web ecosystem; not public, no SEO.
- Work is record-centric: proposals, approved projects, councils, ethics (IRB) dossiers, tasks, related documents, each with workflow history and versioned files.
- Official paper artifacts matter: some screens render A4 documents in Times New Roman (e.g. CV/lý lịch khoa học).
- All UI copy, roles and domain terms are Vietnamese; vocabulary is fixed in `CONTEXT.md` at the repo root.

## Capabilities and Constraints

- Ten system roles plus record-scoped relationships (PI, topic secretary, member) and assignments (reviewer, council, ethics, task). The backend is authoritative; UI capability data only explains, it never grants.
- Status changes are domain actions with confirmations and reasons, never free field edits.
- Must work at 360, 390, 430, 768, 1024 and 1440 px. Dense tables may scroll horizontally inside their container; the page never does.
- Stack is fixed: Next.js 15 App Router, React 19, one global stylesheet (`src/app/globals.css`) with CSS custom properties; no Tailwind or CSS-in-JS. Tokens mirrored in `packages/ui-tokens`.
- Source guard: the words `demo`, `mock`, `mô phỏng`, `giả lập`, `test data` are forbidden anywhere under `apps/web/src`.

## Brand Commitments

- Binding spec: `docs/ux-design-guidelines.md`. Institutional admin dashboard: official, data-first, inherits the Học viện Quân y website identity. Deep green primary, white and pale green-gray surfaces, gold only as a restrained accent; status colors carry meaning only.
- Avoid: startup-SaaS styling, purple/orange as primary, strong gradients, heavy glassmorphism, hero banners on internal screens, decorative illustration, emoji icons.
- Logo: `apps/web/public/logo.png`.
- Tone: serious, trustworthy, suited to a military-medical academic institution.

## Evidence on Hand

- Product is in development, not yet piloted. There are no real users, testimonials, usage metrics or baselines; business targets are to be baselined during pilot/UAT. Do not invent any.
- Requirements and journeys: `docs/user-flows.md`, `docs/ux-ui-spec.md`, `docs/permission-matrix.md`.
- Dev seed accounts (password `1234`) exist only for local development: `docs/development/auth-seed-users.md`.

## Product Principles

1. Show state, next step, owner and deadline before anything else on a record.
2. Prevent errors on consequential actions (submit, approve, return, request supplement): clear confirmation, mandatory reasons, readable feedback.
3. Show each user only what their role, scope and assignment allow, and say why an action is unavailable.
4. Density over decoration: the screen is a working tool for daily office use.
5. Use the fixed domain vocabulary; never rename institutional terms.

## Accessibility & Inclusion

WCAG AA for core workflows, including responsive layouts. Color is never the only status signal: every status has a text label, icon or short description. Keyboard operability and visible focus on forms, filters, tables, dialogs and navigation.
