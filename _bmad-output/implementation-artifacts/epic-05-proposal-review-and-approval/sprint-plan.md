# Epic 5: Kiểm tra, đánh giá và phê duyệt đề xuất

**Authorization refinement — 2026-09-21:** Stories 5.1/5.3/5.5 require current `PROPOSAL_MANAGEMENT_OFFICER` plus scope; participation/review alone grants no administrative action. Preserve Head oversight, leadership-only final decisions and conflict checks at relationship changes and actions. Finalized baseline §2.1 grants Head officer management and eligible package submission. Deputy has researcher eligibility plus read-only institutional oversight; Director alone has eligible final decisions. Proposal implementation is current; project/council/dashboard/reporting/notification backends absent from the repository remain backlog.

- **Epic status:** `in-progress` (aligned with `../sprint-status.yaml`)
- **Canonical source:** [epics.md](../../epics.md)
- **Current slice:** [Proposal Review & Approval implementation plan](implementation-plan.md)
- **Planning refinement:** 2026-09-20; documentation only, no implementation completion claimed
- **Implemented slice:** 2026-09-21 — staff assignment through personal review queue;
  see [execution record](assignment-slice.md). Full-story tracker statuses remain unchanged.

## Golden Flow: Proposal Review & Approval — cross-story deliverable

**Success criterion:** One real proposal can move from a valid `resubmitted` (or
`submitted`) version through completeness evidence, scoped staff assignment, exactly
two reviewers and at least three committee members, assigned review submission,
staff monitoring and synthesis, leadership routing, and an authorized `approved`
or `rejected` decision in the real UI and backend. No direct status update or
manual database mutation is part of the flow.

| Boundary | Current state | Remaining acceptance work |
| --- | --- | --- |
| Completeness and assignment (5.1–5.3) | **Partial** — account-based assignment, conflict checks, lifecycle history, cardinality and personal queue exist | Recheck the current context in every mutation and preserve assignment/review history across replacement and revocation |
| Reviewer package and submission (5.4) | **Partial** — assigned package, fixed rubric, draft save and submitted-review lock exist | Bind the package to the current workflow evidence, keep every read/file route least-disclosure, and make the locked state consistent with capabilities |
| Staff monitoring, synthesis and routing (5.5) | **Partial** — progress, summary and readiness checks exist | Persist attributable immutable synthesis/package evidence; recheck roster, valid reviews, conflict and context under the proposal lock |
| Leadership queue and package (5.7) | **Partial** — decision package and shared detail panel exist | Use a server-filtered decision queue, explicit scope/conflict checks, and disclosure-safe routed evidence |
| Final decision and result (5.8) | **Partial** — guarded approve/reject and audit/history exist | Recheck authority, package/context and readiness in the decision transaction; retain the decision and publish only the permitted result |
| Notifications (Epic 11 contract) | **Missing** — no proposal-specific delivery persistence is wired | Add only the existing contract's durable event/recipient handoff if required by the current runtime; do not create a second notification system |

### Golden Flow acceptance gate

- **Happy path — approved:** researcher resubmits → staff confirms completeness →
  staff assigns eligible accounts → all required reviews submit → staff synthesizes
  and routes → authorized Director approves → `approved`, audit/history complete.
- **Happy path — rejected:** the same path ends with a required rejection reason,
  `rejected`, and retained decision/audit/history evidence.
- **Required denials:** PI/member/secretary or conflicting account assignment;
  incompatible duplicate position; unassigned or wrong-record reviewer access;
  wrong proposal/version submission; silent edit of submitted review; incomplete
  roster or synthesis bypass; Head/Staff/Deputy or reviewer final decision;
  leadership decision before readiness; direct invalid status change; and protected
  reviewer/internal data exposed through detail, lists, files, history or notifications.

Keep Stories 5.3–5.8 as the owning stories. This is one cross-role deliverable,
not a new Epic or parallel workflow. Promote tracker statuses only after the gate
has runtime evidence; preserve the historical assignment slice as a partial record.

## Coverage and slice order

| Story | Current tracker status | Slice treatment |
| --- | --- | --- |
| 5.1 Kiểm tra tính đầy đủ và yêu cầu bổ sung | `backlog` | Existing flow completed per user; entry regression only; tracker not promoted by this review |
| 5.2 Chỉnh sửa theo yêu cầu và nộp lại đề xuất | `backlog` | Existing flow completed per user; entry regression only |
| 5.3 Phân công reviewer / thành viên hội đồng từ tài khoản | `review` | Assignment → durable audit → personal queue verified; notifications and remaining full-story boundaries pending |
| 5.4 Reviewer truy cập và nộp đánh giá của mình | `backlog` | Queue entry/discovery completed by first slice; package/evaluation journey remains pending |
| 5.5 Theo dõi, tổng hợp và trình phê duyệt | `backlog` | Refined; versioned consolidation and explicit staff routing |
| 5.6 Thư ký khoa học hỗ trợ hành chính cho quy trình đánh giá | `backlog` | Unchanged; not a prerequisite for this slice |
| 5.7 Lãnh đạo xem hồ sơ trình quyết định | `backlog` | Refined; scoped queue and immutable evidence package |
| 5.8 Phê duyệt, từ chối và công bố kết quả đề xuất | `backlog` | Refined; version-safe decision, public result and notifications |

## Execution boundary

Implement shared authorization/context/disclosure corrections, then 5.3 → 5.4 →
5.5 → 5.7 → 5.8. Integrate only required proposal events under existing Epic
11.1–11.2 notification contracts; do not duplicate those stories. No new epic,
system role, council-management subsystem or approved-project creation.

The account-based baseline and `spec-any-user-reviewer-council.md` supersede the
profile-only candidate policy in older assignment specs. Keep those historical
artifacts unchanged. The implementation plan records verified source gaps and the
end-to-end acceptance gate; code presence is not acceptance evidence. Promote
tracker statuses only after the relevant implementation and verification.

## Finalized leadership authorization impact

`RESEARCH_OVERSIGHT_AUTHORITY` combines internal researcher capabilities through record
relationships with explicit-scope institutional oversight. It grants no final proposal,
council-establishment, funding or acceptance decision. `LEADERSHIP_APPROVAL_AUTHORITY`
has oversight plus eligible conflict-free final decisions. All surfaces must preserve
disclosure, source authorization and active officer restrictions; no broad Staff queues.
Project/council establishment, notifications/My Work and institutional dashboards/reports
remain planned where their owning backend is absent. Funding uses available metadata only.

## Golden Flow implementation closeout — 2026-09-21

The approved cross-role implementation is complete: current-submission evidence binding,
assignment/review immutability, versioned synthesis and decision packages, scoped server
queue, least-disclosure leadership projection, reviewer/staff/leadership UI paths, and
focused regression coverage are present. API/web builds, type checks and focused tests
pass. Full repository tests retain known pre-existing role/source expectations and stale
transaction mocks; disposable-PostgreSQL/browser acceptance remains deferred because the
local Prisma schema engine path is unavailable.
