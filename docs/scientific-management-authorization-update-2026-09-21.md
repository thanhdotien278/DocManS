# Scientific Management authorization documentation update — 2026-09-21

> Historical review evidence. The finalized seven-role implementation supersedes this snapshot; see `authorization-core-business-baseline.md` and `development/finalized-authorization-delivery.md` for current scope.

Documentation-only reconciliation of the user-confirmed Head/Staff authorization
model. No application code, schema, migrations, seed data, accounts or tests changed.
Existing implementation status and historical verification are not claims of support
for this new model. No commit or push was performed.

## Decisions now documented

- Six canonical system roles, one active per account. `SCIENTIFIC_MANAGEMENT_HEAD`
  is distinct from `SCIENTIFIC_MANAGEMENT_STAFF` and from
  `LEADERSHIP_APPROVAL_AUTHORITY`; final approval/rejection remains with leadership.
- Head can view all proposals/projects in explicitly authorized Scientific Management
  scope, see responsible Staff and unassigned records, filter/group by Staff and
  monitor workload/status/deadlines. Scope is not inferred from organizational hierarchy.
- Staff management visibility/actions need explicit scope and an effective
  `PROPOSAL_MANAGEMENT_OFFICER` / `PROJECT_MANAGEMENT_OFFICER` on that record.
  Each proposal/project has at most one active primary officer; zero is unassigned.
- Assignment, reassignment and revocation preserve history/audit. Reassignment ends
  the old relationship and creates the new one atomically, including concurrent requests.
  Project responsibility is independent of proposal responsibility; no implicit grant
  to every Staff account, creator, or former officer.
- Legitimate PI/member/secretary/reviewer/council/task relationships remain independent.
  Staff may participate on other records; that access grants no Scientific Management
  administrative action. Backend capabilities distinguish the basis of access.
- Participant + management officer/reviewer/evaluation or acceptance council/final
  decision is prohibited on the same record. Reviewer + final decision in the same
  round and mutually exclusive council positions are also prohibited. Checks run when
  either side of a relationship is created/changed and again at protected action time.
- List, detail, search, counts/facets, dashboards, reports/export, notifications, files
  and workflow/business history share current authorization and disclosure. Revocation
  removes management access immediately without erasing independent valid relationships.
- Backend authority, workflow/delegation limits, fail-closed context, disclosure and
  audited changes remain in force. Independent intake/profile capabilities do not
  grant proposal/project visibility or automatically transfer to Head.

## Conflicts found and reconciled

| Prior rule or ambiguity | Reconciliation |
| --- | --- |
| Staff explicitly had Academy-wide business access in baseline, requirements, PRD, epics and matrix | Replaced with Head visibility inside authorized scope; Staff requires an officer assignment. |
| Five-role lists, and an architecture list missing external researchers | Updated active normative enumerations to six canonical roles; historical verification remains dated. |
| “Assigned or operated by” could make past activity a permanent Staff grant | Current effective officer assignment is required; operation history grants no access. |
| Role/scope alone gated checks, reviewer assignment and consolidation | Added the exact proposal officer requirement to policy, matrix, contracts and stories. |
| Capability text categorically hid all other users' assignments | Kept viewer relationships private; allowed a separate Head management projection for responsible Staff/unassigned state, without hidden review or private profile data. |
| Participation conflict rules covered evaluation but omitted management officers and reverse participant changes | Extended both directions of conflict checking, plus protected-action revalidation. |
| Generic Staff dashboards/reports could imply a portfolio-wide queue | Head portfolio and Staff assigned-management views now have separate access bases and matching filter/count/export semantics. |
| Existing plan prohibited new roles and assumed no assignment migration | Reconciled with the requested Head role and management relationship prerequisites; no migration executed or invented backfill approved. |
| Done stories and demo/slice evidence predate this model | Marked applicability limits without rewriting prior test results or claiming new behavior is implemented. |
| Staff participation as PI versus existing researcher-role-only proposal mutations | Preserved legitimate PI access but retained the existing mutation restriction as an explicit pre-coding question. |

## Decisions and implementation implications before coding

The [baseline §2.1](authorization-core-business-baseline.md#21-trách-nhiệm-quản-lý-proposalproject--quyết-định-2026-09-21)
records the remaining questions. They are not silently resolved by assigning powers
to a job title:

1. Who may assign/reassign/revoke primary management officers? Which operational
   mutations, if any, may Head perform directly? Visibility alone does not decide this.
2. Which explicit organization scope is granted to each Head/Staff account?
3. How will legacy accounts be classified and existing records assigned from verified
   data? Do not promote every Staff account to Head or infer assignments from past scope.
4. Should Staff acting as PI also create/edit/submit/resubmit proposals? Existing policy
   requires `RESEARCHER_INTERNAL_USER` for those actions; this update does not change it.
5. When and by whom are proposal/project officers assigned, and who creates a project
   before it has a project officer? Unassigned is valid; automatic inheritance is not a grant.

Implementation must version affected role/relationship contracts and consumers,
provide minimal domain-owned relationship persistence and concurrency constraints,
update source queries/capabilities and re-authorize derived surfaces. Existing code
and prior successful tests cannot substitute for verification of this target model.
These are implications only, not application changes made in this task.

## Consistency and verification

The reviewed target documents are internally consistent for Head versus Staff
visibility, assignment cardinality/lifecycle, independent participation, conflict
checks and cross-surface filtering. They are **not an unconditional coding-ready
specification** until the explicit officer-grant/Head-action and transition decisions
above are resolved. Missing policy or context remains fail closed.

Validation performed:

- `git diff --check` passed.
- Checked all modified paths: Markdown documentation only.
- Checked all four canonical Head/Staff/officer terms in 11 governing documents and
  absence of the obsolete broad Staff grants in those documents.
- Compared 14 affected functional requirements between PRD and epic inventory;
  aligned shortened duplicate FR15/FR17/FR19a statements and verified exact agreement.
- Checked new local links and preserved fenced-block balance.
- Reviewed both delivery-epic summaries and numbered Stories in Epic 4, 5, 6,
  authorization Stories 1.4/1.7–1.9/2.4, and dashboard/reporting Stories 12.1–12.5;
  aligned linked plans for Epics 4–6, 11 and 12.

These are static documentation checks. Application tests, database operations and
runtime/browser authorization verification were not run or claimed.

## Files changed

32 existing Markdown files updated; this report is the 33rd documentation file.
Historical archives/review reports remain evidence, not active policy. `GEMINI.md`
already delegates authorization policy to the current baseline/contracts and has no
duplicated role definition requiring amendment.

- [.stitch/PRODUCT.md](../.stitch/PRODUCT.md)
- [.stitch/flows/proposal-flow.md](../.stitch/flows/proposal-flow.md)
- [CONTEXT.md](../CONTEXT.md)
- [_bmad-output/architecture.md](../_bmad-output/architecture.md)
- [_bmad-output/epics.md](../_bmad-output/epics.md)
- [_bmad-output/implementation-artifacts/1-4-mot-vai-tro-he-thong-pham-vi-to-chuc-va-chuyen-doi-du-lieu-cu.md](../_bmad-output/implementation-artifacts/1-4-mot-vai-tro-he-thong-pham-vi-to-chuc-va-chuyen-doi-du-lieu-cu.md)
- [_bmad-output/implementation-artifacts/1-9-vong-doi-quan-he-theo-ho-so-va-gioi-han-thu-ky-khoa-hoc.md](../_bmad-output/implementation-artifacts/1-9-vong-doi-quan-he-theo-ho-so-va-gioi-han-thu-ky-khoa-hoc.md)
- [_bmad-output/implementation-artifacts/2-4-kiem-tra-xung-dot-loi-ich-truoc-khi-phan-cong.md](../_bmad-output/implementation-artifacts/2-4-kiem-tra-xung-dot-loi-ich-truoc-khi-phan-cong.md)
- [_bmad-output/implementation-artifacts/epic-04-proposal-intake-and-submission/sprint-plan.md](../_bmad-output/implementation-artifacts/epic-04-proposal-intake-and-submission/sprint-plan.md)
- [_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/assignment-slice.md](../_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/assignment-slice.md)
- [_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md](../_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/implementation-plan.md)
- [_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/sprint-plan.md](../_bmad-output/implementation-artifacts/epic-05-proposal-review-and-approval/sprint-plan.md)
- [_bmad-output/implementation-artifacts/epic-06-approved-project-tracking/sprint-plan.md](../_bmad-output/implementation-artifacts/epic-06-approved-project-tracking/sprint-plan.md)
- [_bmad-output/implementation-artifacts/epic-11-notifications-and-my-work/sprint-plan.md](../_bmad-output/implementation-artifacts/epic-11-notifications-and-my-work/sprint-plan.md)
- [_bmad-output/implementation-artifacts/epic-12-dashboard-search-and-reports/sprint-plan.md](../_bmad-output/implementation-artifacts/epic-12-dashboard-search-and-reports/sprint-plan.md)
- [_bmad-output/implementation-artifacts/spec-any-user-reviewer-council.md](../_bmad-output/implementation-artifacts/spec-any-user-reviewer-council.md)
- [_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md](../_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/ARCHITECTURE-SPINE.md)
- [_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md](../_bmad-output/planning-artifacts/architecture/architecture-DocManSystem-2026-07-29/AUTHORIZATION-CONTRACTS.md)
- [_bmad-output/planning-artifacts/mvp-sprint-plan-2026-09-02.md](../_bmad-output/planning-artifacts/mvp-sprint-plan-2026-09-02.md)
- [_bmad-output/prd.md](../_bmad-output/prd.md)
- [_bmad-output/project-context.md](../_bmad-output/project-context.md)
- [_bmad-output/user-interface-workspaces-docmansystem.md](../_bmad-output/user-interface-workspaces-docmansystem.md)
- [docs/authorization-core-business-baseline.md](authorization-core-business-baseline.md)
- [docs/contracts/researcher-profile-access.md](contracts/researcher-profile-access.md)
- [docs/development/auth-seed-users.md](development/auth-seed-users.md)
- [docs/diagrams/authorization.md](diagrams/authorization.md)
- [docs/diagrams/overview.md](diagrams/overview.md)
- [docs/permission-matrix.md](permission-matrix.md)
- [docs/scientific-management-authorization-update-2026-09-21.md](scientific-management-authorization-update-2026-09-21.md)
- [docs/user-flows.md](user-flows.md)
- [docs/ux-ui-spec.md](ux-ui-spec.md)
- [phan-quyen-trong-de-tai-khoa-hoc.md](../phan-quyen-trong-de-tai-khoa-hoc.md)
- [requirements.md](../requirements.md)
