# Refined Golden Flow verification

Updated: 2026-09-22. Implementation and both normal-UI terminal journeys verified.
Independent review pending. No commit or push requested or performed.

## Synthetic UI acceptance

| Outcome | Proposal | Current submission event | Decision |
| --- | --- | --- | --- |
| Approved | `97a5cfab-2e6f-4a11-814a-9326ee77ec28` | `f6a2cc66-bad9-48f8-a416-ffd437c333ef` | `9893e38b-e9c4-4b3d-b53c-bbbc160970cc` at 07:57 local |
| Rejected | `8bbf968f-d6b2-4a7d-a7d4-a2091293b91f` | `9a1113d6-8fbc-42ef-85b4-b088edccaaff` | `81beb8d5-a191-4434-9bf1-240b44f693d2` at 07:58 local |

Both records were created, supplied with required synthetic PDFs, submitted, assigned to
Staff, sent for supplements, edited and resubmitted through normal UI. This session then
confirmed completeness as `hdtien1`, assigned two reviewers (`researcher2`, `researcher3`)
and three committee members (`external1`–`external3`) as Head `nmphuong`, and submitted
all ten reviews through UI. Reviewer draft/save and submitted read-only mode were checked.
Staff monitoring showed 5/5 and named assignments on both records without synthesis controls.
Head separately saved, finalized and submitted each synthesis; Director `tvtien` approved A
and rejected B through UI. No direct database/status writes, reset or reseed were used.

Final authenticated reads verified both terminal states, one decision each, package revision 2,
five immutable submitted reviews bound to each current submission, Staff named monitoring,
PI denial of internal endpoints, Deputy read-only oversight and redacted leadership progress.
Read-only persistence inspection confirmed completeness, review submission, completion threshold,
synthesis draft/finalization/submission and decision history plus their corresponding audit actions.

## Checks run

- `npm run typecheck`: passed for API and web.
- `npm run build:api`: passed.
- `npm run build:web`: passed; web dev stopped first and restored afterwards.
- Focused Golden Flow/cardinality/assignment tests: 12 passed, 0 failed, 1 disposable-DB test skipped.
- `git diff --check`: passed.
- Twenty live negative API assertions passed before synthesis: PI/member candidate conflict,
  duplicate/incompatible duty, Staff assignment and all synthesis actions, premature Head draft,
  premature Director package/approval, Deputy approval, PI internal endpoints, unassigned review
  access, submitted-review edit, reviewer decision, and wrong-proposal context token.
- One further live assertion denied submitting the saved synthesis draft before finalization.
- Prior handoff evidence: Head assignment before completeness denied (400), Staff assignment denied (403).
- Regression verifies a completeness event cannot replace the current submission snapshot,
  exact-version readiness binding, effective/active roster filtering and stale finalized source rejection.
- Post-decision API checks against the final build passed for both proposals and all five actor types.

## Known verification limits and policy gaps

- Disposable database integration test remains skipped; this is not integration-test proof.
- Broader legacy `proposals-st30.test.mjs`: 3 passed, 11 failed. Existing transaction mocks lack
  `tx.user.findUnique`; these failures predate this slice and were not rewritten wholesale.
- Capability source suite has a pre-existing whole-file role-regex failure (the officer panel
  already uses role-based section display). The changed action-list expectation was updated.
- Review reopening and recovery after finalized sources become invalid have no approved workflow;
  mutations fail closed rather than silently regenerating evidence.
- Reminder delivery, notification/export backends and other council positions remain outside
  implemented surfaces. Existing deadlines and overdue visibility are used.
- TypeSafe skill was read when requested. Both its live index and building-guide fetch failed;
  no AI integration was added because authorization and workflow rules are deterministic.
- The earlier browser approval-review usage failure was transient; subsequent approved normal
  UI operations completed. No alternate authentication bypass was used.

## Runtime and migration

Existing `20260921010000_proposal_review_golden_flow` migration was applied in the prior
session. This refinement adds no schema migration. Final local API/web listeners were restored
on 4000/3000. Unrelated `skills-lock.json` remains untouched.
