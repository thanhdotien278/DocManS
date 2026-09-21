# Proposal Review & Approval — scoped implementation plan

Date: 2026-09-20. Updated: 2026-09-21. Status: first assignment-to-queue slice
implemented; remaining evaluation/consolidation/decision work is pending.
Story authority: [Epic 5](../../epics.md#epic-5-kiểm-tra-đánh-giá-và-phê-duyệt-đề-xuất).

## First vertical slice execution — 2026-09-21

User authorized only staff selection → assignment/conflict checks → persistence/audit
→ assignee work queue. See [implementation and verification record](assignment-slice.md).
Reused the existing transaction, assignment storage, lifecycle and routes. Completed
the completeness capability gate, mandatory client mutation context, awaited context
refresh, scoped roster/progress reads, narrow effective-assignment queue projection,
all-role queue navigation, and context/effectivity audit facts. No schema migration.

This is not completion of full Stories 5.3/5.4. Notification delivery, reviewer
evaluation/evidence binding, remaining sibling package/file disclosure and historical
review conflict, consolidation and final approval remain in their later slices.
The source-inspection tables below describe the original planning baseline; the
linked execution record identifies the subset now implemented and verified.

## Finalized Scientific Management and Leadership model — 2026-09-21

Head assigns/reassigns/revokes proposal officers, reads Staff operational summaries and
submits completed eligible packages. Staff operations require current officer assignment,
explicit scope and no conflict. Director receives institutional oversight plus eligible final
decisions; Deputy receives internal researcher eligibility plus read-only oversight. Neither
Head nor Deputy gets final decisions. Preserve protected reviewer disclosure and persist
conflicts for an existing review even after assignment revocation. Prior slice verification
remains historical; use the finalized-model spec/report for this change's evidence.

## 1. Scope and governing sources

Complete the assigned Staff → assigned Reviewer/Committee Member → assigned Staff →
Leadership → published result journey after resubmission and completeness checking.
Use Stories **5.3, 5.4, 5.5, 5.7, 5.8**. No new epic or story. Story 5.6 secretary
administration is not a dependency. Approval does not create a project (Epic 6).
No council-administration subsystem, scoring builder, extra review round,
post-decision reopening, or generic task/dashboard/report rebuild.

Reviewed sources (repository-relative paths):

- `_bmad-output/prd.md`: UJ-1–4, FR17–22 including FR19a, FR6a–6e/FR67a,
  FR36–44 and security/atomicity/accessibility NFRs.
- `_bmad-output/epics.md`: active Epic 5; Epic 11.1–11.2 notification contracts.
  Historical EP-03/ST-3.2–3.5 code labels map to current 5.3–5.8; historical
  “Epic 5: Project tracking” is not this slice's authority.
- `docs/authorization-core-business-baseline.md`: sections 1–4.5 and proposal state machine.
- `docs/permission-matrix.md`: sections 8.4, 9–10 and User Account assignment contract.
- `_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/`
  `AUTHORIZATION-CONTRACTS.md` and `ARCHITECTURE-SPINE.md`: context, lifecycle,
  exact actions, disclosure, personal work, background jobs, atomic audit.
- `_bmad-output/architecture.md`: modular monolith, REST, disclosure, workflow,
  immutable evidence, transaction/job boundaries; `CONTEXT.md`, `AGENTS.md`, `GEMINI.md`.
- `docs/user-flows.md`, `docs/ux-ui-spec.md` flows 5–8 and
  `docs/ux-design-guidelines.md`: single workspace, record capabilities, accessible
  confirmations, native date inputs, responsive tables/forms.
- Existing implementation specs: `spec-proposal-intake-through-review.md`,
  `spec-scientist-profile-reviewer-council-assignment.md`,
  `spec-reviewer-council-assignment-completion.md`, `spec-any-user-reviewer-council.md`.
  Older profile-only/delegation statements do not override the current baseline.

Precedence: current authorization baseline → V1 contracts → matrix → architecture/UX
→ PRD → active Epic 5 → implementation. Role names and conceptual diagram phases
are not new database states. Missing context fails closed.

## 2. Current coverage and verified gaps

This is a source inspection, not a runtime acceptance result. Existing code does
not make a story done. Sprint metadata remains unchanged until implementation is verified.

| Story | Existing coverage | Remaining work for this slice |
| --- | --- | --- |
| 5.1–5.2 | User reports completed check/supplement/resubmit journey; current completeness evidence and submission snapshots exist | Entry regression only: latest resubmission must have its own completeness evidence |
| 5.3 | Account candidate search, both duties, assign/revoke, first-assignment transition, context transaction, cardinality limit, lifecycle history and staff panel | Correct stale profile-only planning; notifications; shared disclosure and historical-conflict checks; verify all assignment paths |
| 5.4 | Assignment queue/package, fixed rubric, draft/save/submit, current-context transaction, immutable submitted-review guard and form | Discoverable `/my-reviews` navigation; least-disclosure across sibling reads/files; required token at DTO boundary; own submitted state must agree with capabilities; bound evidence version |
| 5.5 | Progress/counts, summary save, readiness roster check under lock, `markReady` transition and staff panel | Shared mutation context; immutable/versioned consolidation/package; coherent valid-review totals; historical-review conflict; routing capability/readiness reasons; event delivery |
| 5.6 | Separate secretary administrative story | Unchanged, outside this slice |
| 5.7 | `/approvals`, decision package service/panel, history and submitted reviews | Server-filtered actionable queue; authority scope/duty and conflict before private reads; evidence package with usable versioned file links; capability/token parity |
| 5.8 | Approve/reject, reject reason, guarded status update with decision/history/audit transaction | Transaction-time authority/context/package validation; immutable decision evidence binding; published summary; notifications; retry/race checks |

Concrete source evidence under `apps/api/src/` and `apps/web/src/`:

1. `proposal-evaluations/proposal-evaluation-summary.service.ts` and
   `proposal-decisions.service.ts` do not use `runProposalMutation` or compare
   input context tokens. Summary/decision DTOs and web client calls omit them.
   Guarded status updates alone do not protect stale review/package/authority context.
2. `proposal-evaluation-support.ts::assertCanReadEvaluation` permits leadership
   in every formal workflow state without scope. `assertApprovalAuthority`
   checks only role. `getDecisionPackage` computes conflict but still returns
   private reviews/summary; progress checks participation but not reviewer conflict.
   General `proposal-access.ts` already checks host scope, so these paths disagree.
3. `resolveActorConflict` uses current effective assignment access. Revoking or
   expiring an assignment can erase the reviewer conflict despite retained submitted
   reviews. Keep access revocation separate from same-record separation of duties.
4. `summarizeProgress` excludes revoked assignments from submitted counts but uses
   all submitted reviews in its average. Roster readiness counts status only;
   validate relevant account/assignment/conflict/source evidence consistently at routing.
5. Summary is one mutable row per proposal. `getDecisionPackage` returns current
   reviews/summary and attachment count, not an immutable routed evidence package.
   Existing `ProposalSubmissionEvent.snapshot` and append-only database trigger
   provide a reuse path; do not build a generic versioning subsystem.
6. Reviewer package/detail already omit some actor/uploader fields. However, general
   detail still passes `supplementRequests` unchanged, operational endpoints can
   widen disclosure for assigned staff/leadership, and participant publication is absent.
   Audit every sibling serializer/file route; do not assume older leakage notes are
   all still present. `PublishedReviewSummaryV1` is specified but has no API projection.
7. `/my-reviews` exists but is missing from navigation arrays. `/approvals` filters
   ordinary proposal results by status in the browser, not decision capability on
   the server. The review form already refreshes context after draft save: retain it.
8. Only notification templates/SMTP support are present in the backend; evaluation
   services produce no notification deliveries. Existing Epic 11.1–11.2 owns that
   contract; this slice needs only proposal-specific integration and minimal delivery storage.

## 3. Story refinements and source reconciliation

- **5.3:** active-account selection, optional profile provenance, two reviewers plus
  at least three committee members, resubmitted completeness gate, revoke/replace
  history, assignment notifications. Preserve self-selection for unconflicted staff;
  that staff member cannot subsequently consolidate their own review.
- **5.4:** both duties complete the same assignment-scoped review journey; navigation,
  all read surfaces, draft versus submit, context refresh and immutable submission.
- **5.5:** explicitly covers FR19a: monitor → versioned consolidation → staff routes
  to leadership; not just a summary screen. Readiness and transaction acceptance added.
- **5.7:** routed package/queue authorization, evidence versions, file access and safe
  conflict denial before payload disclosure.
- **5.8:** version-bound decision, exactly one terminal outcome, separate public result
  and private note, authorized notification handoff. No project creation.

Narrow source corrections accompany these stories: PRD FR17 and assignment UX/flow
now match the active-account baseline; obsolete matrix leadership bypass wording is
identified as legacy behavior and replaced with the current authority boundary.
The architecture diagram's `UnderCompletenessReview`/`EvaluationConsolidated` are
phases/evidence, and `PendingApproval` maps to persisted `ready_for_approval`.
No additional state migration is required.

Disclosure caveat to preserve during implementation: the baseline defaults to
one-way anonymity and reserves reviewer identities for scientific-management
operations. V1 permits additional decision-duty data only where required. Do not
infer that leadership or `committee_member` automatically needs named reviewers.
Non-default intake anonymity modes need an explicit supported projection/file policy;
if that policy cannot be resolved, deny the affected package/file instead of falling
back to a broader response. Adding a configurable anonymity editor is outside this
slice; do not claim all three modes supported from field hiding alone.

## 4. Final workflow and transition contract

Every Staff operational row below additionally requires the actor's current
`PROPOSAL_MANAGEMENT_OFFICER` and scope. Assignment and participation changes, and
protected actions, repeat conflict checks. Staff accessing a proposal as a reviewer
or participant never gains these administrative actions from its account role.

| Action / owner | Before → after | Required evidence and guard |
| --- | --- | --- |
| Staff checks resubmission | `resubmitted` → same | Current submission completeness evidence; no reuse of prior check |
| Staff assigns first duty | `submitted` or `resubmitted` → `under_review` | Active account, completeness, explicit Staff scope and current proposal officer assignment, no participation/conflict, current context |
| Staff adds/revokes/replaces | `under_review` → same | Unique live account, max two reviewers; revoke reason and preserved history |
| Assignee saves/submits | `under_review` → same | Effective assignment and permitted package; valid fixed rubric/comment/recommendation; submit locks review and completes duty |
| Staff saves summary | `under_review` → same | Unconflicted scoped staff; versioned evidence from eligible submitted reviews |
| Staff confirms “Gửi lãnh đạo phê duyệt” | `under_review` → `ready_for_approval` | Exactly two reviewers, at least three committee members, all required reviews valid/submitted, complete summary, atomic fresh-context check |
| Staff amends ready summary where matrix permits | `ready_for_approval` → same | Revalidate readiness, append new package version, invalidate previous client context; never overwrite routed evidence |
| Leadership reads package | `ready_for_approval` → same | Explicit authority scope + routed record + no conflict; disclosure-filtered evidence |
| Leadership approves/rejects | `ready_for_approval` → `approved` or `rejected` | Exact action, current package/context, rejection reason; atomic immutable decision/history/audit |
| Authorized participant reads result | terminal → same | Only published summary; no private review data |

Assignment expiry ends access; due-date overdue alone is a flag, not automatic rejection.
Revoked reviews remain historical and are excluded from current totals. A submitted
review creates enduring conflict for consolidation/decision even after access ends.
`revise` is an advisory recommendation; it does not introduce a second supplement
cycle, an automatic transition, or a third leadership decision in this slice.

## 5. Implementation changes and contracts

### Domain and authorization

Reuse `proposal-evaluations/`, `proposals-shared/proposal-mutation.ts`, participation
and review-access resolvers, `permissions/proposal-capability-v1.ts`, and the existing
`packages/permissions` action registry. Do not introduce a workflow engine. Adopt only the requested
`SCIENTIFIC_MANAGEMENT_HEAD` / `SCIENTIFIC_MANAGEMENT_STAFF` role split; Resolve current actor/account/scope, assignment, historical review conflict,
workflow, disclosure and token in one coherent context. Use the same result for list,
package, files, progress, capabilities and writes. Recheck inside the shared transaction.

Authority for this slice is the existing leadership role **plus explicitly granted
scope and the routed record**, subject to conflict; no inferred organization tree
or invented approval-assignment table. Any institution-specific authority grant must
be explicit; unresolved authority denies. A role eligible to be assigned reviewer
never gains other review data through its administrative endpoints.

Keep `proposal.review.assign`, `.submit`, `.consolidate`, and
`proposal.decision.approve`/`.reject`. Draft versus route remains an explicit
`markReady` command under staff consolidation; expose server readiness reasons as
well as consolidation capability. Do not use permission to save draft as readiness.
Irrelevant `ACTION_NOT_GRANTED` sections are omitted; relevant conflict/state blocks
remain disabled with safe reasons. Treat approve and reject capabilities separately.

### API / frontend contracts

Base path: `/api/v1/research-proposals`. Extend existing routes, not parallel APIs.

| Existing surface | Required refinement |
| --- | --- |
| `GET :id/assignable-reviewers`, `GET/POST :id/review-assignments`, `POST :id/review-assignments/:assignmentId/revoke` | Retain account selector/current context; consistent safe operational authorization |
| `GET review-assignments/mine`, `GET :id/review-package`, `GET/PUT :id/my-review`, `POST :id/my-review/submit` | Required `contextVersion` on writes; own-only DTO; immutable submission/package binding; current capability after save |
| `GET :id/review-progress`, `PUT :id/evaluation-summary` | Typed context token; strict boolean `markReady`; valid-review-only metrics, readiness reasons, summary/package revision ID |
| `GET :id/decision-package`, `POST :id/approve`, `POST :id/reject` | Current context and routed package revision on writes; authorized immutable proposal/files/reviews/summary on read; reject reason; distinct public-summary fields |
| Existing proposal list/detail | Server-side decision-queue filter/count using exact authority; scoped terminal history; optional `publishedReviewSummary` only after decision and for authorized audiences |

Reads that return protected packages authorize before emitting metadata. Required
fields for publication follow existing `PublishedReviewSummaryV1`: schemaVersion,
decisionStatus, decisionDate, publicSummary, requiredFollowUp. Status/date come from
the decision; designated public summary/follow-up are explicitly supplied/confirmed
by the authority and validated, never generated from private free text automatically.
Use canonical denial codes and `CONTEXT_VERSION_MISMATCH`; refresh and explicit retry,
not silent automatic resubmission of a decision.

Reuse `/proposals/[id]`, `/my-reviews`, `/approvals`, `proposal-evaluation-panel.tsx`,
`proposal-review-form.tsx`, `proposal-decision-panel.tsx`, both queue panels and
`proposal-evaluations-api.ts`. Staff sees roster, deadlines, pending/received counts,
summary and a distinct route action. Reviewer sees assigned evidence and own rubric.
Leadership sees read-only evidence plus confirm/reject/public-result fields. PI/team
sees generic workflow, then public outcome. Add the reviewer entry for all account
roles without granting record access; do not create separate workspaces per role.
Refresh package/capabilities after mutations. Keep native whole-day inputs, inline
errors, lock warnings, loading/empty/error states, keyboard focus and mobile layouts.

### Persistence — only where required

Existing proposal, assignment, review, summary and decision tables cover the flow.
Prefer typed `ProposalSubmissionEvent.snapshot` payloads (with a kind/schema version)
for immutable consolidation versions, routed package manifests and decision evidence/
public summary. Bind review submissions to the reviewed submission/file version and
routed packages to exact review IDs/versions; decision evidence references that package.
Keep the summary row as current projection. Append a snapshot on every summary save;
never expose internal snapshots through the generic participant history/version API.
Existing snapshot immutability makes a new review-round/version subsystem unnecessary.

The previous no-assignment-migration assumption is superseded for management
responsibility: define its minimal persistence/constraints and audited legacy mapping
before coding. Do not alter evaluation state/profile data or invent historical officers. If actual
snapshot constraints cannot support required references/immutability, add only the
specific field/constraint in a scoped migration and document why before implementation.
Never reconstruct missing historical review evidence: legacy records without verifiable
source binding cannot be marked ready by guessing.

Notification delivery is the known persistence gap. Under existing Story 11.1, add
only durable event/recipient delivery records needed for this slice (unique source
version + event + recipient/channel, delivery/read status and retry metadata), reusing
existing templates/mail and job conventions. Inspect any concurrent Epic 11 work first;
reuse it instead of creating duplicate storage. Validate a scoped migration in a disposable
DB; do not reset, deploy unrelated migrations, or touch live records.

### Disclosure, audit and notifications

| Audience | Permitted data |
| --- | --- |
| Assigned reviewer/committee member | Assignment-required submitted package and own review only; no other assignees, reviews or internal summary |
| Unconflicted Staff with current proposal officer assignment and scope | Operational roster, submitted reviews and consolidation as required |
| Eligible leadership | Routed decision evidence and summary, with reviewer identity omitted unless a governing duty-specific policy explicitly permits it |
| PI/team/secretary, including external participants | Generic status before decision; only `PublishedReviewSummaryV1` afterward |
| Unrelated, revoked/expired assignee without another valid relationship | Deny record/package/file; no counts or existence leaks |

Apply projections to normal detail, supplement/history, snapshot, file metadata and
binary download, queues/counts and notifications. A notification/link never grants access.
Do not copy internal notes into public summary or generic audit/timeline responses.

Retain existing audit actions: `assign-reviewer`, `change-reviewer-assignment`,
`submit-score-and-review-comment`, `consolidate-evaluation`, `mark-ready-for-approval`,
`approve-proposal`, `reject-proposal`; retain sensitive-file access audit. Include actor,
authoritative time, proposal/assignment/review/package IDs, before/after state, correlation,
context/policy versions and safe denial reason under V1. Business evidence and successful
audit commit together; failure audit must not accidentally commit business mutations.

Required events only: assignment/change → affected assignee; submitted review →
eligible staff; approval request/package revision → eligible leadership; final decision
→ PI and policy-authorized recipients. Persist source events with the business transaction;
dispatch afterward. In-app delivery follows 11.1, email only for enabled types under 11.2.
Re-authorize recipients at dispatch/read, deduplicate retries, and preserve committed
business state if SMTP fails. No broad reminder scheduler or cross-module My Work rebuild.

## 6. Recommended order and acceptance gate

0. **Management authorization prerequisite:** resolve baseline §2.1 decisions; implement
   explicit Head/Staff roles and proposal officer lifecycle/query facts before relying on
   Staff operations. Verify unassigned/assigned/revoked/participation-only access,
   bidirectional participant conflict, concurrent reassignment and surface parity.
1. **Shared boundaries for 5.3–5.8:** align exact DTO/capability/readiness/disclosure
   contracts; historical-conflict and authority-scope checks; define typed snapshot
   payloads and minimal Epic 11 delivery dependency. Add focused regression checks
   for the confirmed authorization/concurrency gaps before changing behavior.
2. **5.3 → 5.4:** complete account assignment → notification/queue → package/file →
   draft → submitted review, for both duties and accounts across roles/units.
3. **5.5:** implement coherent progress, versioned consolidation and atomic routing;
   verify missing/revoked/conflicted reviews block readiness and stale summary rejects.
4. **5.7 → 5.8:** server-filtered queue, immutable decision package, version-safe
   approve/reject and participant publication; wire required notifications end to end.
5. **End-to-end verification:** use two independent proposals for approve and reject.
   Start from resubmission, check completeness, assign two reviewers and at least
   three committee members, save/reload/submit each review, consolidate, route,
   read package and decide. Verify public outcome and notification recipients.

Negative checks: unrelated record/file IDs; out-of-scope staff/leadership; reviewer
with staff/admin/leadership role probing operational endpoints; PI/member/secretary
conflicts; revoked/expired assignment; historical reviewer after revocation; inactive
account; missing/stale token; roster changes during routing; package edit during
approval; concurrent approve/reject; repeat delivery; no internal data through detail,
files/history/notifications or published result. Retain submitted evidence and audit.

Run focused Node integration/authorization tests (including
`tests/reviewer-council-assignment.test.mjs`, `tests/proposal-review-cardinality.test.mjs`,
`tests/authorization-v1.test.mjs`, and relevant EP-03 checks), API build before tests,
`npm run typecheck`, relevant web build and `git diff --check`. Use disposable PostgreSQL
for transaction/race/migration checks; browser-check staff/reviewer/leadership/PI at desktop
and mobile widths. Separate baseline legacy mock/source-test failures from new regressions.
No story is complete on a source scan alone. This planning task runs documentation
consistency checks only; no application tests, migrations or runtime mutations.
