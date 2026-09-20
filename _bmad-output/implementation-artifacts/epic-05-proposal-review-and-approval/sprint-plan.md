# Epic 5: Kiểm tra, đánh giá và phê duyệt đề xuất

**Authorization refinement — 2026-09-21:** Stories 5.1/5.3/5.5 require current `PROPOSAL_MANAGEMENT_OFFICER` plus scope; participation/review alone grants no administrative action. Preserve Head oversight, leadership-only final decisions and conflict checks at relationship changes and actions. Baseline §2.1 owns officer-grant/Head-action and migration questions before coding; this note does not mark implementation complete.

- **Epic status:** `in-progress` (aligned with `../sprint-status.yaml`)
- **Canonical source:** [epics.md](../../epics.md)
- **Current slice:** [Proposal Review & Approval implementation plan](implementation-plan.md)
- **Planning refinement:** 2026-09-20; documentation only, no implementation completion claimed
- **Implemented slice:** 2026-09-21 — staff assignment through personal review queue;
  see [execution record](assignment-slice.md). Full-story tracker statuses remain unchanged.

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
