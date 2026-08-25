# Epic 2: Hồ sơ nhà khoa học và định danh quan hệ

- **Epic status:** `in-progress`
- **Canonical source:** [epics.md](../../epics.md)
- **Planning order:** sequential, in the order below
- **Retrospective:** optional after all stories are done

## Stories

| Order | Story | Status |
|---|---|---|
| 2.1 | Tạo và duy trì hồ sơ nhà khoa học | `ready-for-dev` |
| 2.2 | Liên kết hồ sơ nhà khoa học với tài khoản | `ready-for-dev` |
| 2.3 | Lịch sử tham gia từ nguồn nghiệp vụ có thẩm quyền | `ready-for-dev` |
| 2.4 | Kiểm tra xung đột lợi ích trước khi phân công | `ready-for-dev` |
| 2.5 | Tìm kiếm và xem danh bạ nhà khoa học theo phạm vi | `ready-for-dev` |
| 2.6 | Timeline và audit hồ sơ nhà khoa học | `ready-for-dev` |

## Execution note

Create the next story specification only after its preceding dependency is understood and the shared authorization, audit, and file rules in the project context remain satisfied.

## Dependency and delivery boundary

- Implement in canonical order: `2.1 -> 2.2 -> 2.3 -> 2.4`; Story 2.5 consumes 2.1-2.3 and Story 2.6 consumes 2.1-2.3 plus their atomic audit facts.
- Story 2.3 enables only the existing proposal source after its producer/consumer integration gate passes. Future project, seminar, student-research, council, ethics, review, publication, product, and task sources remain disabled until their owning stories are contract-complete.
- Story 2.4 ships proposal conflict preflight and mutation-time enforcement end to end. Future assignment domains adopt the same contract in their owning stories.
- Story 2.6 extends the shared audit seam only as needed for researcher-profile projection; Epic 3 retains ownership of broader audit/history platform work.
- A `ready-for-dev` status means the specification is context-complete. Implementation still honors the dependencies above and must pass each story's evidence gates before changing to `done`.
