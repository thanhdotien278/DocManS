---
title: 'Story 5.9 — Luồng tờ trình CV → TB → TP → BGĐ [FR71]'
type: feature
created: '2026-10-25'
status: in-review
story_key: 5-9-approval-routing-cv-tb-tp-bgd
---

## Intent

Mọi thủ tục cần BGĐ ký đi qua một luồng tờ trình thống nhất: người lập (CV/TB/TP) → TB rà soát → TP duyệt → BGĐ ký. AC: `_bmad-output/epics.md` Story 5.9; quyết định REJECTED/CANCELLED: D-035.

## Scope of this step

Lõi routing, API theo hồ sơ nguồn, UI trên chi tiết đề xuất, và điểm tích hợp gói đánh giá (`DECISION_PACKAGE`). Không gồm: GĐ ký/quyết định (5.10), inbox (11.6), thông báo (chờ hạ tầng Epic 11).

## Code Map

- `apps/api/prisma/migrations/20261025000000_approval_routing/` — bảng, CHECK, partial unique index `PENDING`.
- `apps/api/src/proposals-shared/approval-routing.ts` — `openApprovalSubmission`, `advanceApprovalSubmission`, `returnApprovalSubmission`, `assertReadyForLeadership`, `closeApprovalSubmission`, `pendingApprovalStages`, `resolveApprovalActions`.
- `apps/api/src/approvals/*` — `GET subject`, `POST :id/advance`, `POST :id/return`.
- `apps/api/src/proposal-evaluations/proposal-evaluation-summary.service.ts` — `submitCompletedPackage` mở `DECISION_PACKAGE`.
- `apps/web/src/components/approvals/routing-status.tsx`, `apps/web/src/lib/approval-routing-api.ts`.
- `tests/approval-routing-db.test.mjs` — PostgreSQL thật.

## Verification

Xem báo cáo hoàn thành; gap: thông báo bước kế tiếp, hoàn nguồn khi trả lại cho 7 loại khác, ký LEADERSHIP theo loại.
