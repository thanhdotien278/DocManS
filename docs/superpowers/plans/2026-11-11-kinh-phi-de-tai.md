# Theo dõi kinh phí đề tài (6.13) — Plan triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến Story 6.12 (sổ ghi kinh phí + thanh lý, chưa có UI) thành feature dùng được: chốt kinh phí duyệt, ràng buộc tổng, chứng từ, thanh lý cân đối có số biên bản, giao diện và thông báo.

**Architecture:** Giữ `project_funding_records` (append-only, GRANT/DISBURSEMENT/SETTLEMENT, version) và `project_liquidations`. Hàm thuần (đọc số tiền, tổng, bất biến) tách ra `apps/api/src/approved-projects/project-funding.ts` để test không cần DB; service chỉ gọi vào. UI là hai `SectionCard` mới trong `project-detail.tsx`, gọi API qua `projects-api.ts`.

**Tech Stack:** NestJS 11 + Prisma 7 (tsc, import `.js`), Next.js 15 / React 19 (CSS global, không Tailwind), `node:test`, Postgres cho DB test.

Spec: `docs/superpowers/specs/2026-11-11-kinh-phi-de-tai-design.md`.

## Global Constraints

- API: mọi import tương đối phải có đuôi `.js`; không import `@rtms/*` từ API. Sau mỗi sửa API phải `npm run build:api` trước khi chạy test.
- Thông điệp lỗi và UI bằng tiếng Việt; `BadRequestException({ code, message })` như mã hiện có.
- Số tiền: không âm, ≤ `10_000_000_000_000` (10^13), làm tròn đến đồng; lưu `Decimal(18,2)`.
- Bất biến: `ΣDISBURSEMENT ≤ ΣGRANT`, `ΣSETTLEMENT ≤ ΣDISBURSEMENT` (tính trên bản mới nhất của mỗi `entryId`).
- Thanh lý: `recoveredAmount ≤ ΣDISBURSEMENT`; GĐ ký chỉ khi `ΣSETTLEMENT + recoveredAmount = ΣDISBURSEMENT`; số biên bản `${n}/BBTL-HVQY/${năm}`.
- Web: không dùng các từ `demo`, `mock`, `mô phỏng`, `giả lập`, `test data` dưới `apps/web/src` (smoke test cấm). Không thêm CSS mới; dùng class global (`section-card`, `field`, `form-grid two`, `button primary`, `table`, `button-row`, `form-error`).
- Không sửa danh sách model Prisma (chỉ thêm cột) để `tests/smoke.test.mjs` không đổi.
- DB test chạy bằng `DATABASE_URL` trong `.env` (docker `postgres` phải chạy): `docker compose up -d postgres`.
- Commit theo mẫu `feat(st-6.13.N): ...`, kết thúc bằng `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Nhánh làm việc: `git checkout -b feat/6-13-kinh-phi-de-tai` từ nhánh hiện tại trước Task 1.

---

### Task 1: Hàm thuần `project-funding.ts` (Story 6-13-2, phần kiểm tra)

**Files:**
- Create: `apps/api/src/approved-projects/project-funding.ts`
- Test: `tests/project-funding.test.mjs`

**Interfaces:**
- Produces:
  - `readFundingAmount(value: unknown, field = "Số tiền"): number` — ném `BadRequestException({ code: "FUNDING_INVALID" })` khi không phải số hữu hạn, âm, hoặc > 10^13; trả số đã `Math.round`.
  - `readApprovedBudget(budgetMetadata: unknown): number` — `approvedAmount` ưu tiên, rồi `amount`; không có hoặc không hợp lệ → 0.
  - `latestFunding<T extends { entryId: string; version: number }>(rows: T[]): T[]` — bản mới nhất mỗi entry, giữ thứ tự xuất hiện đầu.
  - `fundingTotals(records: Array<{ kind: string; amount: unknown }>): { GRANT: number; DISBURSEMENT: number; SETTLEMENT: number }`.
  - `assertFundingInvariant(totals): void` — ném `FUNDING_INVALID` khi vi phạm.
  - `FUNDING_KINDS = ["GRANT", "DISBURSEMENT", "SETTLEMENT"] as const`, `MAX_FUNDING_AMOUNT`.

- [ ] **Step 1: Viết test thất bại**

```js
// tests/project-funding.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertFundingInvariant, fundingTotals, latestFunding, readApprovedBudget, readFundingAmount } from "../dist/apps/api/approved-projects/project-funding.js";

const code = (c) => (e) => e.response?.code === c;

test("readFundingAmount: làm tròn, chặn âm, quá 10^13, không phải số", () => {
  assert.equal(readFundingAmount("1000.6"), 1001);
  assert.equal(readFundingAmount(0), 0);
  for (const bad of [-1, "abc", NaN, Infinity, 10_000_000_000_001, null, undefined]) assert.throws(() => readFundingAmount(bad), code("FUNDING_INVALID"), String(bad));
});

test("readApprovedBudget: approvedAmount ưu tiên hơn amount; thiếu thì 0", () => {
  assert.equal(readApprovedBudget({ amount: 500, approvedAmount: 450 }), 450);
  assert.equal(readApprovedBudget({ amount: "500" }), 500);
  assert.equal(readApprovedBudget({ total: 1000 }), 0);
  assert.equal(readApprovedBudget(null), 0);
  assert.equal(readApprovedBudget({ amount: -5 }), 0);
});

test("latestFunding + fundingTotals: lấy bản mới nhất mỗi entry rồi cộng theo loại", () => {
  const rows = [
    { entryId: "a", version: 1, kind: "GRANT", amount: "500" },
    { entryId: "b", version: 1, kind: "DISBURSEMENT", amount: "200" },
    { entryId: "a", version: 2, kind: "GRANT", amount: "450" }
  ];
  assert.deepEqual(latestFunding(rows).map((r) => [r.entryId, r.version]), [["a", 2], ["b", 1]]);
  assert.deepEqual(fundingTotals(latestFunding(rows)), { GRANT: 450, DISBURSEMENT: 200, SETTLEMENT: 0 });
});

test("assertFundingInvariant: giải ngân ≤ cấp, quyết toán ≤ giải ngân", () => {
  assertFundingInvariant({ GRANT: 500, DISBURSEMENT: 500, SETTLEMENT: 500 });
  assert.throws(() => assertFundingInvariant({ GRANT: 400, DISBURSEMENT: 500, SETTLEMENT: 0 }), code("FUNDING_INVALID"));
  assert.throws(() => assertFundingInvariant({ GRANT: 500, DISBURSEMENT: 300, SETTLEMENT: 301 }), code("FUNDING_INVALID"));
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npm run build:api && node --test tests/project-funding.test.mjs`
Expected: FAIL — `Cannot find module .../project-funding.js`

- [ ] **Step 3: Viết hàm thuần**

```ts
// apps/api/src/approved-projects/project-funding.ts
import { BadRequestException } from "@nestjs/common";

/** Story 6.13: quy tắc số liệu kinh phí dùng chung cho ghi sổ, tạo đề tài và thanh lý. Không truy cập DB. */
export const FUNDING_KINDS = ["GRANT", "DISBURSEMENT", "SETTLEMENT"] as const;
export type FundingKind = (typeof FUNDING_KINDS)[number];
export type FundingTotals = Record<FundingKind, number>;
// 10^13 đồng: đủ cho mọi đề tài, chặn giá trị vô lý hoặc tràn số.
export const MAX_FUNDING_AMOUNT = 10_000_000_000_000;

function invalid(message: string): never {
  throw new BadRequestException({ code: "FUNDING_INVALID", message });
}

export function readFundingAmount(value: unknown, field = "Số tiền"): number {
  const amount = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > MAX_FUNDING_AMOUNT) invalid(`${field} phải là số không âm, tối đa ${MAX_FUNDING_AMOUNT.toLocaleString("vi-VN")} đồng.`);
  return Math.round(amount);
}

/** Kinh phí được duyệt: số lãnh đạo sửa khi phê duyệt (`approvedAmount`) ưu tiên hơn số đề xuất (`amount`). */
export function readApprovedBudget(budgetMetadata: unknown): number {
  if (!budgetMetadata || typeof budgetMetadata !== "object") return 0;
  const record = budgetMetadata as Record<string, unknown>;
  for (const key of ["approvedAmount", "amount"]) {
    const raw = record[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const amount = Number(raw);
    return Number.isFinite(amount) && amount >= 0 && amount <= MAX_FUNDING_AMOUNT ? Math.round(amount) : 0;
  }
  return 0;
}

export function latestFunding<T extends { entryId: string; version: number }>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const row of rows) if (!latest.has(row.entryId) || latest.get(row.entryId)!.version < row.version) latest.set(row.entryId, row);
  return [...latest.values()];
}

export function fundingTotals(records: Array<{ kind: string; amount: unknown }>): FundingTotals {
  const totals: FundingTotals = { GRANT: 0, DISBURSEMENT: 0, SETTLEMENT: 0 };
  for (const row of records) if (row.kind in totals) totals[row.kind as FundingKind] += Number(row.amount);
  return totals;
}

export function assertFundingInvariant(totals: FundingTotals): void {
  if (totals.DISBURSEMENT > totals.GRANT) invalid(`Tổng đã giải ngân (${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ) không được vượt kinh phí được cấp (${totals.GRANT.toLocaleString("vi-VN")} đ).`);
  if (totals.SETTLEMENT > totals.DISBURSEMENT) invalid(`Tổng đã quyết toán (${totals.SETTLEMENT.toLocaleString("vi-VN")} đ) không được vượt số đã giải ngân (${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ).`);
}
```

- [ ] **Step 4: Chạy test**

Run: `npm run build:api && node --test tests/project-funding.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/approved-projects/project-funding.ts tests/project-funding.test.mjs
git commit -m "feat(st-6.13.2): hàm thuần số liệu kinh phí và bất biến tổng

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Ràng buộc tổng khi ghi sổ (Story 6-13-2, phần service)

**Files:**
- Modify: `apps/api/src/approved-projects/approved-projects.service.ts` (hằng `FUNDING_KINDS` dòng 33; `latestFunding`/`fundingTotals` dòng 830-838; `recordFunding` dòng 862-886)
- Test: `tests/approval-routing-db.test.mjs` (thêm sau test "6.12: funding metadata ...")

**Interfaces:**
- Consumes: Task 1.
- Produces: `recordFunding` ném 400 `FUNDING_INVALID` khi vi phạm; `getFunding` trả `totals` dạng `{ GRANT, DISBURSEMENT, SETTLEMENT }` như cũ.

- [ ] **Step 1: Viết test thất bại** (thêm vào cuối nhóm 6.12 trong `tests/approval-routing-db.test.mjs`)

```js
test("6.13.2: giải ngân không vượt kinh phí cấp, quyết toán không vượt giải ngân, sửa phiên bản cũng bị kiểm tra", async () => {
  const f = await projectFixture("F2");
  const { people, service } = f;
  const write = (kind, amount, extra = {}) => service.recordFunding(people.head, f.project.id, { kind, amount, recordedOn: "2026-03-01", ...extra });
  const invalid = (error) => error.response?.code === "FUNDING_INVALID";
  const grant = await write("GRANT", 500);
  await assert.rejects(() => write("DISBURSEMENT", 501), invalid, "giải ngân vượt cấp");
  await write("DISBURSEMENT", 300);
  await assert.rejects(() => write("SETTLEMENT", 301), invalid, "quyết toán vượt giải ngân");
  await write("SETTLEMENT", 300);
  await assert.rejects(() => write("GRANT", 200, { entryId: grant.entryId }), invalid, "hạ kinh phí cấp xuống dưới đã giải ngân");
  await assert.rejects(() => write("GRANT", -1), invalid);
  await assert.rejects(() => write("GRANT", 10_000_000_000_001), invalid);
  assert.deepEqual((await service.getFunding(people.head, f.project.id)).totals, { GRANT: 500, DISBURSEMENT: 300, SETTLEMENT: 300 });
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs`
Expected: FAIL ở test 6.13.2 (giải ngân 501 được chấp nhận).

- [ ] **Step 3: Nối service vào hàm thuần**

Trong `approved-projects.service.ts`:

1. Thêm import: `import { FUNDING_KINDS, assertFundingInvariant, fundingTotals, latestFunding, readFundingAmount } from "./project-funding.js";`
2. Xoá dòng 33 `const FUNDING_KINDS = [...]` và hai method private `latestFunding`, `fundingTotals` (dòng 830-838). Thay mọi `this.latestFunding(x)` → `latestFunding(x).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())` và `this.fundingTotals(x)` → `fundingTotals(x)`. (`FUNDING_KINDS.includes(input.kind)` cần `(FUNDING_KINDS as readonly string[]).includes(input.kind)`.)
3. Trong `recordFunding`, thay hai dòng đọc số tiền:

```ts
      const amount = readFundingAmount(input.amount);
```

và ngay trước `tx.projectFundingRecord.create`, thêm kiểm tra bất biến trên trạng thái sau khi ghi:

```ts
      const rows = await tx.projectFundingRecord.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } });
      const next = latestFunding([...rows, { entryId, version, kind: input.kind, amount, createdAt: new Date() }]);
      assertFundingInvariant(fundingTotals(next));
```

- [ ] **Step 4: Chạy test**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs tests/project-funding.test.mjs`
Expected: PASS, kể cả test 6.12 cũ.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/approved-projects/approved-projects.service.ts tests/approval-routing-db.test.mjs
git commit -m "feat(st-6.13.2): ràng buộc giải ngân ≤ cấp và quyết toán ≤ giải ngân khi ghi sổ

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Chốt kinh phí duyệt và GRANT tự động (Story 6-13-1)

**Files:**
- Modify: `apps/api/src/proposal-evaluations/proposal-evaluations.dto.ts:157-170` (`proposalDecisionPipe`)
- Modify: `apps/api/src/proposal-evaluations/proposal-decisions.service.ts:238-245` (trong `$transaction`, sau `updateProposalStatusGuarded`)
- Modify: `apps/api/src/approved-projects/approved-projects.service.ts:255-283` (`createProject`)
- Test: `tests/approval-routing-db.test.mjs`

**Interfaces:**
- Consumes: `readApprovedBudget`, `readFundingAmount` (Task 1).
- Produces: body approve nhận `approvedAmount?: number`; `researchProposal.budgetMetadata.approvedAmount` được ghi; đề tài mới có GRANT v1 `note: "Kinh phí được phê duyệt"` khi kinh phí > 0.

- [ ] **Step 1: Viết test thất bại**

Test GRANT tự động (fixture tạo đề tài bằng service thật). Thêm vào `tests/approval-routing-db.test.mjs`:

```js
test("6.13.1: tạo đề tài từ đề xuất có kinh phí duyệt → GRANT v1 tự động; approvedAmount ưu tiên; 0 thì không tạo", async () => {
  const ctx = await setup("F1");
  const { people, proposal, org } = ctx;
  const service = new ApprovedProjectsService(db, new AuditLogService(db));
  const makeApproved = async (prop, budgetMetadata) => {
    await db.researchProposal.update({ where: { id: prop.id }, data: { status: "approved", budgetMetadata } });
    const event = await db.proposalSubmissionEvent.create({ data: { proposalId: prop.id, actorId: people.pi.id, fromStatus: "draft", toStatus: "submitted", snapshot: { id: prop.id, ownerId: people.pi.id, members: [], title: prop.title, budgetMetadata: { amount: 500 } } } });
    await db.proposalDecision.create({ data: { proposalId: prop.id, decision: "approved", decidedById: people.director.id, fromStatus: "pending_approval", toStatus: "approved", packageSnapshot: { submissionEventId: event.id } } });
  };
  await makeApproved(proposal, { amount: 500, approvedAmount: 450 });
  const created = await service.createProject(people.staff, { proposalId: proposal.id, contextVersion: proposalContextVersion(await db.researchProposal.findUnique({ where: { id: proposal.id } })) });
  const grants = await db.projectFundingRecord.findMany({ where: { projectId: created.id } });
  assert.deepEqual(grants.map((r) => [r.kind, String(r.amount), r.version, r.note]), [["GRANT", "450", 1, "Kinh phí được phê duyệt"]]);
  assert.equal((await db.approvedProject.findUnique({ where: { id: created.id } })).scopeSnapshot.budgetMetadata.approvedAmount, 450, "snapshot phạm vi ghi số đã duyệt");

  const second = await db.researchProposal.create({ data: { ...(({ id, createdAt, updatedAt, ...rest }) => rest)(await db.researchProposal.findUnique({ where: { id: proposal.id } })), title: "Đề xuất không kinh phí", budgetMetadata: { amount: 0 } } });
  await makeApproved(second, { amount: 0 });
  const zero = await service.createProject(people.staff, { proposalId: second.id, contextVersion: proposalContextVersion(await db.researchProposal.findUnique({ where: { id: second.id } })) });
  assert.equal(await db.projectFundingRecord.count({ where: { projectId: zero.id } }), 0);
});
```

Lưu ý khi chạy: nếu `createProject` đòi thêm điều kiện (ví dụ `proposalContextVersion` hay trường bắt buộc của `researchProposal.create`), đọc lỗi và bổ sung đúng trường vào fixture; không nới lỏng service.

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs`
Expected: FAIL — `grants` rỗng.

- [ ] **Step 3: GRANT tự động trong `createProject`**

Trong `approved-projects.service.ts`, import thêm `readApprovedBudget` từ `./project-funding.js`. Trong `createProject`, trước `tx.approvedProject.create`:

```ts
      // Story 6.13: số lãnh đạo chốt khi phê duyệt nằm ở đề xuất hiện tại, không ở snapshot lúc nộp.
      const budgetMetadata = { ...(snapshot.budgetMetadata ?? {}), ...((proposal.budgetMetadata as AnyRecord | null)?.approvedAmount !== undefined ? { approvedAmount: (proposal.budgetMetadata as AnyRecord).approvedAmount } : {}) };
      const approvedBudget = readApprovedBudget(budgetMetadata);
```

Đổi `budgetMetadata: snapshot.budgetMetadata` trong `scopeSnapshot` thành `budgetMetadata`. Sau `approvedProjectMember.createMany`:

```ts
      if (approvedBudget > 0) await tx.projectFundingRecord.create({ data: { projectId: project.id, entryId: randomUUID(), version: 1, kind: "GRANT", amount: approvedBudget, recordedOn: new Date(), note: "Kinh phí được phê duyệt", fileRecordIds: [], recordedById: currentActor.id } });
```

(`proposal` trong hàm này đã được select `budgetMetadata` ở `PROJECT_INCLUDE`/dòng 39; nếu `createProject` dùng một query khác, thêm `budgetMetadata: true` vào select đó.)

- [ ] **Step 4: Chạy test**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs`
Expected: PASS.

- [ ] **Step 5: `approvedAmount` trong quyết định của GĐ**

`proposal-evaluations.dto.ts`, trong `proposalDecisionPipe.transform` trước `return`:

```ts
    if (input.approvedAmount !== undefined && input.approvedAmount !== null && input.approvedAmount !== "") {
      const amount = Number(input.approvedAmount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000_000_000) throw new BadRequestException({ message: "Kinh phí phê duyệt phải là số không âm, tối đa 10.000.000.000.000 đồng." });
      input.approvedAmount = Math.round(amount);
    } else delete input.approvedAmount;
```

`proposal-decisions.service.ts`, trong transaction ngay sau `await updateProposalStatusGuarded(...)`:

```ts
      // Story 6.13: GĐ có thể chốt lại kinh phí khi phê duyệt; ghi vào metadata của đề xuất, có audit before/after.
      if (decision === PROPOSAL_DECISIONS.approved && typeof input.approvedAmount === "number") {
        const before = (proposal as { budgetMetadata?: unknown }).budgetMetadata ?? {};
        const after = { ...(before as Record<string, unknown>), approvedAmount: input.approvedAmount };
        await tx.researchProposal.update({ where: { id: proposalId }, data: { budgetMetadata: after as never } });
        await tx.auditLog.create({ data: { action: "approve-proposal-funding", result: "success", actorId: actor.id, targetEntity: "research-proposal", targetEntityId: proposalId, username: actor.username, beforeFacts: before as never, afterFacts: after as never } });
      }
```

Kiểm tra `findEvaluationProposal` có trả `budgetMetadata`; nếu không, thêm vào select của nó (file `proposal-evaluation-support.ts`).

Thêm test vào `tests/proposals-ep03.test.mjs` cạnh test dòng ~1298 (fixture `approving` đã có đề xuất duyệt được):

```js
    const withBudget = await approving.decisions.decide(leadershipUser, approvedProposal.id, "approved", { note: "Đồng ý.", approvedAmount: 450 });
```

→ Vì mỗi đề xuất chỉ quyết định một lần, tách thành test mới sao chép cách dựng fixture của test đó, gọi `decide` với `approvedAmount: 450`, rồi assert `prisma.researchProposals` (fake) đã nhận `update` với `budgetMetadata.approvedAmount === 450` và fake audit có action `approve-proposal-funding`. Nếu fake Prisma của file chưa có `researchProposal.update` trong transaction, mở rộng fake theo mẫu các bảng khác trong cùng file.

- [ ] **Step 6: Chạy test và typecheck**

Run: `npm run build:api && node --test tests/proposals-ep03.test.mjs tests/approval-routing-db.test.mjs && npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src tests/approval-routing-db.test.mjs tests/proposals-ep03.test.mjs
git commit -m "feat(st-6.13.1): chốt kinh phí phê duyệt và tạo GRANT tự động khi lập đề tài

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Chứng từ kinh phí `FUNDING_VOUCHER` (Story 6-13-3)

**Files:**
- Modify: `apps/api/src/modules/files/files.dto.ts:4-9` (hằng mới)
- Modify: `apps/api/src/modules/files/files.service.ts:156-160` (uploadFile) và `:439-443` (assertCanUpload)
- Modify: `apps/api/src/approved-projects/approved-projects.service.ts` (`recordFunding`: kiểm tra purpose)
- Test: `tests/approval-routing-db.test.mjs`

**Interfaces:**
- Produces: `FUNDING_VOUCHER_PURPOSE = "FUNDING_VOUCHER"` export từ `files.dto.ts`; `recordFunding` ném 400 `EVIDENCE_WRONG_RECORD` khi tệp không phải purpose này.

- [ ] **Step 1: Viết test thất bại**

```js
test("6.13.3: GĐ/TP/TB/CV phụ trách tải chứng từ FUNDING_VOUCHER; PI, thành viên, PGĐ-KH bị từ chối; sổ ghi chỉ nhận tệp chứng từ", async () => {
  const f = await projectFixture("F3");
  const { people, service } = f;
  const storage = { objects: new Map(), async putObject({ objectKey, content }) { this.objects.set(objectKey, Buffer.from(content)); }, async getObject(key) { return this.objects.get(key); }, async deleteObject(key) { this.objects.delete(key); } };
  const files = new FilesService(db, storage, new AuditLogService(db), new ProposalParticipationService(db), new ProposalReviewAccessService(db), { maxFileSizeBytes: 1024, allowedExtensions: [".pdf"] });
  const upload = async (actor, filePurpose) => files.uploadFile(actor, { relatedEntityType: "approved_project", relatedEntityId: f.project.id, filePurpose, fileName: `${filePurpose}.pdf`, mimeType: "application/pdf", sizeBytes: 4, content: Buffer.from("%PDF"), contextVersion: await f.ctxVersion() });
  const vouchers = [];
  for (const who of [people.director, people.head, people.board, people.staff]) vouchers.push(await upload(who, "FUNDING_VOUCHER"));
  for (const who of [people.pi, people.member, people.science, people.staff2]) await assert.rejects(() => upload(who, "FUNDING_VOUCHER"), code(403), who.displayName);
  const evidence = await upload(people.pi, "PROJECT_EVIDENCE");
  await service.recordFunding(people.head, f.project.id, { kind: "GRANT", amount: 100, recordedOn: "2026-03-01", fileRecordIds: [vouchers[0].id] });
  await assert.rejects(() => service.recordFunding(people.head, f.project.id, { kind: "GRANT", amount: 100, recordedOn: "2026-03-01", fileRecordIds: [evidence.id] }), (e) => e.response?.code === "EVIDENCE_WRONG_RECORD");
});
```

Thêm import ở đầu file: `import { FilesService } from "../dist/apps/api/modules/files/files.service.js";` (`ProposalParticipationService`, `ProposalReviewAccessService`, `AuditLogService` đã import sẵn). Kiểm tra `uploadFile` trả object có `id`; nếu trả `{ file }` thì đổi `vouchers[0].id` cho khớp.

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs`
Expected: FAIL — GĐ upload bị 403 (`project.evidence.contribute` không có).

- [ ] **Step 3: Mở cổng upload và kiểm tra purpose**

`files.dto.ts`, sau dòng 9: `export const FUNDING_VOUCHER_PURPOSE = "FUNDING_VOUCHER";`

`files.service.ts`:
- import `FUNDING_VOUCHER_PURPOSE` cùng các hằng ở dòng 17.
- `assertCanUpload`, nhánh `APPROVED_PROJECT_ENTITY_TYPE` (dòng 439-443) thay bằng:

```ts
    if (relatedEntityType === APPROVED_PROJECT_ENTITY_TYPE) {
      const projects = new ApprovedProjectsService(this.prisma, this.auditLog);
      // Story 6.13: chứng từ kinh phí do người được ghi kinh phí tải (GĐ, TP, TB, CV phụ trách), không phải PI/thành viên.
      if (filePurpose === FUNDING_VOUCHER_PURPOSE) {
        if (!(await projects.getFunding(actor, relatedEntityId)).canWrite) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED", message: "Chỉ người quản lý kinh phí đề tài được tải chứng từ." });
        return;
      }
      const project = await projects.getProject(actor, relatedEntityId);
      if (!project.viewerAuthorization.allowedActions.includes("project.evidence.contribute")) throw new ForbiddenException({ code: "ACTION_NOT_GRANTED" });
      return;
    }
```

- `uploadFile` (dòng 156-160): đổi điều kiện thành `if (!isPi && input.filePurpose !== "PROJECT_CONTRIBUTION" && input.filePurpose !== FUNDING_VOUCHER_PURPOSE) throw ...`. Vì `getProject` ở đó cũng ném 403 với người không xem được đề tài, giữ nguyên.

`approved-projects.service.ts`, trong `recordFunding` sau `assertUsableEvidence`:

```ts
      if (files.some((file: AnyRecord) => file.filePurpose !== "FUNDING_VOUCHER")) throw new BadRequestException({ code: "EVIDENCE_WRONG_RECORD", message: "Chứng từ kinh phí phải là tệp loại chứng từ giải ngân (FUNDING_VOUCHER)." });
```

- [ ] **Step 4: Chạy test**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs tests/files-route.test.mjs tests/acceptance-dossier-db.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/files apps/api/src/approved-projects/approved-projects.service.ts tests/approval-routing-db.test.mjs
git commit -m "feat(st-6.13.3): chứng từ kinh phí FUNDING_VOUCHER cho người ghi kinh phí

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Thanh lý cân đối, chốt số, cấp số BBTL (Story 6-13-4)

**Files:**
- Create: `apps/api/prisma/migrations/20261111000000_liquidation_balance/migration.sql`
- Modify: `apps/api/prisma/schema.prisma:1089-1106` (`ProjectLiquidation`)
- Modify: `apps/api/src/approved-projects/approved-projects.dto.ts:85-88` (`projectLiquidationPipe`)
- Modify: `apps/api/src/approved-projects/approved-projects.service.ts` (`liquidationView` 806-815, `submitLiquidation` 889-904, `decideLiquidation` 907-924)
- Test: `tests/approval-routing-db.test.mjs`

**Interfaces:**
- Produces: `submitLiquidation` nhận `recoveredAmount` (mặc định 0); `liquidation.current` có `recoveredAmount: string`, `approvedBudget | totalDisbursed | totalSettled: string | null`, `liquidationNumber: string | null`; lỗi `LIQUIDATION_INVALID`, `LIQUIDATION_UNBALANCED`.

- [ ] **Step 1: Migration và schema**

```sql
-- Story 6.13: thanh lý phải cân đối (quyết toán + thu hồi = đã giải ngân); số liệu chốt và số biên bản khi GĐ ký.
ALTER TABLE "project_liquidations"
  ADD COLUMN "recovered_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "approved_budget" DECIMAL(18,2),
  ADD COLUMN "total_disbursed" DECIMAL(18,2),
  ADD COLUMN "total_settled" DECIMAL(18,2),
  ADD COLUMN "liquidation_number" TEXT;
ALTER TABLE "project_liquidations" ADD CONSTRAINT "project_liquidations_recovered_amount_check" CHECK ("recovered_amount" >= 0);
CREATE UNIQUE INDEX "project_liquidations_liquidation_number_key" ON "project_liquidations"("liquidation_number");
```

`schema.prisma`, trong `model ProjectLiquidation` sau `decisionNote`:

```prisma
  /// Story 6.13: số thu hồi do CV nhập; 3 số chốt và số biên bản chỉ ghi khi GĐ ký.
  recoveredAmount   Decimal  @default(0) @db.Decimal(18, 2) @map("recovered_amount")
  approvedBudget    Decimal? @db.Decimal(18, 2) @map("approved_budget")
  totalDisbursed    Decimal? @db.Decimal(18, 2) @map("total_disbursed")
  totalSettled      Decimal? @db.Decimal(18, 2) @map("total_settled")
  liquidationNumber String?  @unique @map("liquidation_number")
```

Run: `npx prisma generate --schema apps/api/prisma/schema.prisma` rồi `npm run db:setup` (hoặc `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`) — Expected: migration áp dụng thành công.

- [ ] **Step 2: Viết test thất bại**

```js
test("6.13.4: thu hồi ≤ giải ngân; GĐ chỉ ký khi quyết toán + thu hồi = giải ngân; ký thì chốt số liệu và cấp số BBTL không trùng", async () => {
  const f = await projectFixture("F4", "failed");
  const { people, service } = f;
  const write = (kind, amount) => service.recordFunding(people.head, f.project.id, { kind, amount, recordedOn: "2026-03-01" });
  await write("GRANT", 500); await write("DISBURSEMENT", 500); await write("SETTLEMENT", 480);
  const submit = async (recoveredAmount) => service.submitLiquidation(people.staff, f.project.id, { report: "Biên bản", recoveredAmount, contextVersion: await f.ctxVersion() });
  await assert.rejects(() => submit(501), (e) => e.response?.code === "LIQUIDATION_INVALID", "thu hồi vượt giải ngân");
  const liquidation = await submit(15);
  await f.toLeadership("LIQUIDATION");
  const sign = async () => service.decideLiquidation(people.director, f.project.id, "approve", { liquidationId: liquidation.id, contextVersion: await f.ctxVersion() });
  await assert.rejects(sign, (e) => e.response?.code === "LIQUIDATION_UNBALANCED", "lệch 5");
  assert.equal((await db.projectLiquidation.findUnique({ where: { id: liquidation.id } })).status, "SUBMITTED");
  assert.equal((await f.reload()).status, "failed");

  await write("SETTLEMENT", 5);
  await sign();
  const signed = await db.projectLiquidation.findUnique({ where: { id: liquidation.id } });
  assert.deepEqual([signed.status, String(signed.approvedBudget), String(signed.totalDisbursed), String(signed.totalSettled), String(signed.recoveredAmount)], ["SIGNED", "500", "500", "485", "15"]);
  assert.match(signed.liquidationNumber, /^\d+\/BBTL-HVQY\/\d{4}$/);
  assert.equal((await f.reload()).status, "closed");

  const g = await projectFixture("F4b", "failed");
  await g.service.recordFunding(g.people.head, g.project.id, { kind: "GRANT", amount: 10, recordedOn: "2026-03-01" });
  const second = await g.service.submitLiquidation(g.people.staff, g.project.id, { report: "Biên bản 2", recoveredAmount: 0, contextVersion: await g.ctxVersion() });
  await g.toLeadership("LIQUIDATION");
  await g.service.decideLiquidation(g.people.director, g.project.id, "approve", { liquidationId: second.id, contextVersion: await g.ctxVersion() });
  const n = (row) => Number(row.liquidationNumber.split("/")[0]);
  assert.equal(n(await db.projectLiquidation.findUnique({ where: { id: second.id } })), n(signed) + 1, "số tăng dần trong năm");
  const view = await g.service.getProject(g.people.director, g.project.id);
  assert.equal(view.liquidation.current.liquidationNumber, (await db.projectLiquidation.findUnique({ where: { id: second.id } })).liquidationNumber);
});
```

Lưu ý: `projectFixture("F4b")` gọi `setup` sẽ vô hiệu Trưởng ban cũ (index một TB đang hoạt động); `g.people.board` là TB mới nên `toLeadership` vẫn chạy.

- [ ] **Step 3: Chạy để thấy thất bại**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs`
Expected: FAIL — `submit(501)` không bị từ chối.

- [ ] **Step 4: Pipe, submit và ký**

`approved-projects.dto.ts`, `projectLiquidationPipe`:

```ts
export const projectLiquidationPipe: PipeTransform<unknown, ProjectMutationDto> = { transform(value) {
  const input = record(value);
  return { report: readText(input.report, "report", 10000), recoveredAmount: input.recoveredAmount ?? 0, fileRecordIds: ids(input.fileRecordIds, "fileRecordIds"), contextVersion: context(input) } as ProjectMutationDto;
} };
```

`approved-projects.service.ts`:
- Thêm helper private dùng chung:

```ts
  private async currentFundingTotals(tx: any, projectId: string) {
    const rows = await tx.projectFundingRecord.findMany({ where: { projectId } });
    return fundingTotals(latestFunding(rows));
  }
```

- `submitLiquidation`: sau `const report = ...`:

```ts
      const recoveredAmount = readFundingAmount(input.recoveredAmount, "Số tiền thu hồi");
      const totals = await this.currentFundingTotals(tx, project.id);
      if (recoveredAmount > totals.DISBURSEMENT) throw new BadRequestException({ code: "LIQUIDATION_INVALID", message: `Số tiền thu hồi (${recoveredAmount.toLocaleString("vi-VN")} đ) không được lớn hơn số đã giải ngân (${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ).` });
```

và thêm `recoveredAmount` vào object `data`, vào `afterFacts` của history và audit.

- `decideLiquidation`: sau kiểm tra lý do từ chối, trước `closeApprovalSubmission`:

```ts
      let closing: AnyRecord = {};
      if (decision === "approve") {
        // Số liệu chốt theo sổ ghi tại thời điểm ký; lệch dù 1 đồng cũng không ký được.
        const totals = await this.currentFundingTotals(tx, project.id);
        const recovered = Number(liquidation.recoveredAmount);
        if (totals.SETTLEMENT + recovered !== totals.DISBURSEMENT) throw new BadRequestException({ code: "LIQUIDATION_UNBALANCED", message: `Chưa cân đối kinh phí: đã giải ngân ${totals.DISBURSEMENT.toLocaleString("vi-VN")} đ, đã quyết toán ${totals.SETTLEMENT.toLocaleString("vi-VN")} đ, thu hồi ${recovered.toLocaleString("vi-VN")} đ. Phần chênh lệch phải được quyết toán hoặc thu hồi trước khi ký.` });
        const year = (await readTransactionClockV1(tx)).getFullYear();
        const sequence = (await tx.projectLiquidation.count({ where: { status: "SIGNED", decidedAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } } })) + 1;
        closing = { approvedBudget: totals.GRANT, totalDisbursed: totals.DISBURSEMENT, totalSettled: totals.SETTLEMENT, liquidationNumber: `${sequence}/BBTL-HVQY/${year}` };
      }
```

và gộp `...closing` vào `data` của `tx.projectLiquidation.update`; thêm `liquidationNumber: closing.liquidationNumber ?? null` vào `afterFacts` của history và audit. Transaction `mutate` là Serializable; hai lần ký cùng lúc trùng số sẽ bị unique index chặn và `mutate` đã đổi P2002 thành 409 `CONTEXT_VERSION_MISMATCH` (kiểm tra ở `.catch` của `mutate`; nếu `mutate` chưa xử lý P2002, bổ sung giống `createProject` dòng 284-286).

- `liquidationView`: mở rộng `current`:

```ts
      current: latest ? { id: latest.id, status: latest.status, outcome: latest.outcome, report: latest.report, decisionNote: latest.decisionNote, decidedAt: latest.decidedAt?.toISOString?.() ?? null, recoveredAmount: String(latest.recoveredAmount ?? 0), approvedBudget: latest.approvedBudget === null || latest.approvedBudget === undefined ? null : String(latest.approvedBudget), totalDisbursed: latest.totalDisbursed === null || latest.totalDisbursed === undefined ? null : String(latest.totalDisbursed), totalSettled: latest.totalSettled === null || latest.totalSettled === undefined ? null : String(latest.totalSettled), liquidationNumber: latest.liquidationNumber ?? null, fileRecordIds: latest.fileRecordIds ?? [] } : null,
```

và thêm `canSubmit: isResearchManagementStaff(actor) && LIQUIDATABLE.includes(project.status) && (!latest || ["DRAFT", "REJECTED"].includes(latest.status))` (UI dùng để hiện form; server vẫn `assertOfficer`).

- [ ] **Step 5: Chạy test**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs tests/smoke.test.mjs`
Expected: PASS (smoke không đổi vì không thêm model).

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma apps/api/src/approved-projects tests/approval-routing-db.test.mjs
git commit -m "feat(st-6.13.4): thanh lý cân đối, chốt số liệu và cấp số BBTL khi GĐ ký

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Thông báo kinh phí và thanh lý (Story 6-13-6)

**Files:**
- Modify: `apps/api/src/notifications/notification-events.ts:4` (`NotificationSourceType`)
- Modify: `apps/api/src/approved-projects/approved-projects.service.ts` (`recordFunding`, `decideLiquidation`)
- Test: `tests/approval-routing-db.test.mjs`

**Interfaces:**
- Produces: thông báo `type` `project.funding.recorded` (PI) và `project.liquidation.decided` (PI + CV phụ trách), `link: /projects/:id`, `sourceType` `project_funding` | `project_liquidation`.

- [ ] **Step 1: Viết test thất bại**

```js
test("6.13.6: PI được báo khi có giải ngân/quyết toán (không phải GRANT, không gửi người ghi); PI và CV được báo khi GĐ ký/từ chối thanh lý; không trùng", async () => {
  const f = await projectFixture("F6", "failed");
  const { people, service } = f;
  const write = (kind, amount, extra = {}) => service.recordFunding(people.head, f.project.id, { kind, amount, recordedOn: "2026-03-01", ...extra });
  await write("GRANT", 100);
  assert.equal(await db.userNotification.count({ where: { userId: people.pi.id, type: "project.funding.recorded" } }), 0, "GRANT không báo");
  const d = await write("DISBURSEMENT", 100);
  await write("DISBURSEMENT", 100, { entryId: d.entryId });
  assert.equal(await db.userNotification.count({ where: { userId: people.pi.id, type: "project.funding.recorded" } }), 2, "mỗi phiên bản một thông báo");
  assert.equal(await db.userNotification.count({ where: { userId: people.head.id, type: "project.funding.recorded" } }), 0, "người ghi không tự nhận");
  await write("SETTLEMENT", 100);
  const liquidation = await service.submitLiquidation(people.staff, f.project.id, { report: "BB", recoveredAmount: 0, contextVersion: await f.ctxVersion() });
  await f.toLeadership("LIQUIDATION");
  await service.decideLiquidation(people.director, f.project.id, "approve", { liquidationId: liquidation.id, contextVersion: await f.ctxVersion() });
  for (const who of [people.pi, people.staff]) assert.equal((await db.userNotification.findFirst({ where: { userId: who.id, type: "project.liquidation.decided" } })).link, `/projects/${f.project.id}`, who.displayName);
  assert.equal(await db.userNotification.count({ where: { userId: people.director.id, type: "project.liquidation.decided" } }), 0);
});
```

- [ ] **Step 2: Chạy để thấy thất bại**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs`
Expected: FAIL — count = 0 thay vì 2.

- [ ] **Step 3: Gửi thông báo trong cùng transaction**

`notification-events.ts`: thêm `| "project_funding" | "project_liquidation"` vào `NotificationSourceType`.

`approved-projects.service.ts`: import `notifyUsers` từ `../notifications/notification-events.js` (ethics-dossiers.service.ts đã import tương tự; sao chép đường dẫn). Helper:

```ts
  private projectPiUserId(project: AnyRecord): string | null {
    return (project.members ?? []).find((member: AnyRecord) => member.participationRole === "TOPIC_PI" && member.status === "ACTIVE")?.userId ?? null;
  }
```

`recordFunding`, sau audit:

```ts
      if (input.kind !== "GRANT") await notifyUsers(tx, { userIds: [this.projectPiUserId(project)], exclude: [currentActor.id], type: "project.funding.recorded", title: input.kind === "DISBURSEMENT" ? "Đề tài có đợt giải ngân mới" : "Đề tài có số liệu quyết toán mới", body: `${project.title}: ${amount.toLocaleString("vi-VN")} đ`, link: `/projects/${project.id}`, sourceType: "project_funding", sourceId: project.id, idempotencyKey: `funding:${entryId}:v${version}` });
```

`decideLiquidation`, sau audit:

```ts
      await notifyUsers(tx, { userIds: [this.projectPiUserId(project), officer?.officerUserId], exclude: [currentActor.id], type: "project.liquidation.decided", title: decision === "approve" ? "Biên bản thanh lý đã được ký" : "Biên bản thanh lý bị từ chối", body: `${project.title}${closing.liquidationNumber ? ` — số ${closing.liquidationNumber}` : ""}`, link: `/projects/${project.id}`, sourceType: "project_liquidation", sourceId: liquidation.id, idempotencyKey: `liquidation:${liquidation.id}:${status}` });
```

với `const officer = await this.currentOfficer(tx, project.id);` thêm ở đầu callback.

- [ ] **Step 4: Chạy test**

Run: `npm run build:api && node --test tests/approval-routing-db.test.mjs && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src tests/approval-routing-db.test.mjs
git commit -m "feat(st-6.13.6): thông báo chủ nhiệm và chuyên viên về giải ngân, quyết toán, thanh lý

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Giao diện Kinh phí và Thanh lý (Story 6-13-5)

**Files:**
- Modify: `apps/web/src/lib/projects-api.ts` (type `ProjectRecord`, hàm mới, nhãn lịch sử)
- Create: `apps/web/src/components/projects/project-funding-section.tsx`
- Modify: `apps/web/src/components/projects/project-detail.tsx` (render section mới sau "Các phiên bản báo cáo")

**Interfaces:**
- Consumes: `GET /projects/:id/funding` → `{ funding: { restricted, records, totals, canWrite } }`; `POST /projects/:id/funding`; `POST /projects/:id/liquidation` (`report, recoveredAmount, fileRecordIds, contextVersion`); `POST /projects/:id/liquidation/:liquidationId/approve|reject` (`reason?, contextVersion`); `project.liquidation` từ Task 5; upload purpose `FUNDING_VOUCHER` qua `uploadProjectFile`.
- Produces: component `<ProjectFundingSection project={project} busy onDone={refresh} setBusy setNotice />`.

- [ ] **Step 1: API wrapper**

Trong `projects-api.ts`:

```ts
export type FundingRecord = { entryId: string; version: number; kind: "GRANT" | "DISBURSEMENT" | "SETTLEMENT"; amount: string; recordedOn: string | null; note: string | null; fileRecordIds: string[]; recordedById: string; createdAt: string };
export type FundingView = { restricted: boolean; records: FundingRecord[]; totals: { GRANT: number; DISBURSEMENT: number; SETTLEMENT: number } | null; canWrite: boolean };
export type LiquidationView = { current: null | { id: string; status: string; outcome: string; report: string; decisionNote: string | null; decidedAt: string | null; recoveredAmount: string; approvedBudget: string | null; totalDisbursed: string | null; totalSettled: string | null; liquidationNumber: string | null; fileRecordIds: string[] }; eligible: boolean; canSign: boolean; canSubmit: boolean; note: string | null };
export const FUNDING_KIND_LABELS: Record<string, string> = { GRANT: "Kinh phí được cấp", DISBURSEMENT: "Giải ngân", SETTLEMENT: "Quyết toán" };
export const LIQUIDATION_STATUS_LABELS: Record<string, string> = { DRAFT: "Bản nháp", SUBMITTED: "Đang trình", SIGNED: "Đã ký", REJECTED: "Bị từ chối" };
export const vnd = (value: number | string) => `${Number(value).toLocaleString("vi-VN")} đ`;
export async function getProjectFunding(id: string) { return (await json<{ funding: FundingView }>(`/projects/${id}/funding`)).funding; }
```

Thêm vào `ProjectRecord`: `liquidation?: LiquidationView | null;`. Thêm vào `HISTORY_ACTION_LABELS`: `"project.funding.record": "Ghi số liệu kinh phí", "project.liquidation.submit": "Trình biên bản thanh lý", "project.liquidation.approve": "Ký biên bản thanh lý", "project.liquidation.reject": "Từ chối biên bản thanh lý"`.

- [ ] **Step 2: Component section**

```tsx
// apps/web/src/components/projects/project-funding-section.tsx
"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { FUNDING_KIND_LABELS, LIQUIDATION_STATUS_LABELS, getProjectFunding, projectAction, projectCapability, projectFileUrl, uploadProjectFile, vnd, type FundingView, type ProjectRecord } from "@/lib/projects-api";

type Props = { project: ProjectRecord; busy: boolean; setBusy: (value: boolean) => void; setNotice: (value: string) => void; onDone: () => Promise<void> };
const emptyForm = { kind: "DISBURSEMENT", amount: "", recordedOn: "", note: "", entryId: "" };

export function ProjectFundingSection({ project, busy, setBusy, setNotice, onDone }: Props) {
  const [funding, setFunding] = useState<FundingView | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [vouchers, setVouchers] = useState<Array<{ id: string; fileName: string }>>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [report, setReport] = useState("");
  const [recovered, setRecovered] = useState("0");
  const [reason, setReason] = useState("");
  const liquidation = project.liquidation ?? null;
  const contextVersion = projectCapability(project)?.contextVersion;

  async function load() { try { setFunding(await getProjectFunding(project.id)); } catch { setFunding(null); } }
  useEffect(() => { void load(); }, [project.id, project.history.length]);

  async function call(path: string, body: Record<string, unknown>, confirmText?: string) {
    if (!contextVersion) { setNotice("Ngữ cảnh quyền không hợp lệ. Vui lòng tải lại."); return; }
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setNotice("");
    try { await projectAction(project.id, path, { ...body, contextVersion }); await onDone(); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể hoàn tất thao tác."); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setNotice("");
    try { const saved = await uploadProjectFile(project, file, "FUNDING_VOUCHER"); setVouchers((current) => [...current, saved]); setPicked((current) => [...current, saved.id]); setNotice(`Đã tải chứng từ: ${saved.fileName}`); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Không thể tải chứng từ."); }
    finally { setBusy(false); }
  }

  if (!funding || funding.restricted) return null;
  const totals = funding.totals ?? { GRANT: 0, DISBURSEMENT: 0, SETTLEMENT: 0 };
  const recoveredNow = Number(liquidation?.current?.status === "SIGNED" ? liquidation.current.recoveredAmount : recovered || 0);
  const gap = totals.DISBURSEMENT - totals.SETTLEMENT - recoveredNow;

  return <>
    <SectionCard title="Kinh phí" subtitle={`Được cấp ${vnd(totals.GRANT)} · Đã giải ngân ${vnd(totals.DISBURSEMENT)} · Đã quyết toán ${vnd(totals.SETTLEMENT)} · Còn lại ${vnd(totals.GRANT - totals.DISBURSEMENT)}`}>
      {!funding.records.length ? <p>Chưa có số liệu kinh phí.</p> : <table className="table"><thead><tr><th>Loại</th><th>Số tiền</th><th>Ngày</th><th>Ghi chú</th><th>Chứng từ</th><th></th></tr></thead><tbody>
        {funding.records.map((row) => <tr key={row.entryId}><td>{FUNDING_KIND_LABELS[row.kind]}</td><td>{vnd(row.amount)}</td><td>{row.recordedOn ?? ""}</td><td>{row.note ?? ""}{row.version > 1 ? ` (phiên bản ${row.version})` : ""}</td><td>{row.fileRecordIds.map((fileId) => <a key={fileId} href={projectFileUrl(fileId)}>Tệp</a>)}</td><td>{funding.canWrite ? <button className="button" type="button" disabled={busy} onClick={() => setForm({ kind: row.kind, amount: row.amount, recordedOn: row.recordedOn ?? "", note: row.note ?? "", entryId: row.entryId })}>Sửa</button> : null}</td></tr>)}
      </tbody></table>}
      {funding.canWrite ? <div className="form-grid two">
        <label className="field"><span>Loại số liệu</span><select value={form.kind} disabled={!!form.entryId} onChange={(event) => setForm({ ...form, kind: event.target.value })}>{Object.entries(FUNDING_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field"><span>Số tiền (đồng)</span><input type="number" min={0} step={1} value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
        <label className="field"><span>Ngày</span><input type="date" value={form.recordedOn} onChange={(event) => setForm({ ...form, recordedOn: event.target.value })} /></label>
        <label className="field"><span>Ghi chú</span><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        <label className="field"><span>Tải chứng từ</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} /></label>
        {vouchers.map((file) => <label className="field" key={file.id}><span><input type="checkbox" checked={picked.includes(file.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, file.id] : picked.filter((id) => id !== file.id))} /> {file.fileName}</span></label>)}
        <div className="button-row">
          <button className="button primary" type="button" disabled={busy || !form.amount || !form.recordedOn} onClick={() => void call("funding", { kind: form.kind, amount: Number(form.amount), recordedOn: form.recordedOn, note: form.note || undefined, entryId: form.entryId || undefined, fileRecordIds: picked }).then(() => { setForm(emptyForm); setPicked([]); })}>{form.entryId ? "Lưu phiên bản sửa" : "Ghi số liệu"}</button>
          {form.entryId ? <button className="button" type="button" disabled={busy} onClick={() => setForm(emptyForm)}>Huỷ sửa</button> : null}
        </div>
      </div> : null}
    </SectionCard>

    {liquidation ? <SectionCard title="Thanh lý đề tài" subtitle={liquidation.current ? `Biên bản: ${LIQUIDATION_STATUS_LABELS[liquidation.current.status] ?? liquidation.current.status}${liquidation.current.liquidationNumber ? ` · Số ${liquidation.current.liquidationNumber}` : ""}` : liquidation.note ?? "Chưa có biên bản thanh lý"}>
      <table className="table"><tbody>
        <tr><td>Đã giải ngân</td><td>{vnd(liquidation.current?.totalDisbursed ?? totals.DISBURSEMENT)}</td></tr>
        <tr><td>Đã quyết toán</td><td>{vnd(liquidation.current?.totalSettled ?? totals.SETTLEMENT)}</td></tr>
        <tr><td>Thu hồi</td><td>{vnd(liquidation.current?.status === "SIGNED" ? liquidation.current.recoveredAmount : liquidation.current?.recoveredAmount ?? recoveredNow)}</td></tr>
        <tr><td>Chênh lệch</td><td>{liquidation.current?.status === "SIGNED" ? "0 đ (đã cân đối)" : vnd(gap)}</td></tr>
      </tbody></table>
      {liquidation.current ? <p>{liquidation.current.report}{liquidation.current.decisionNote ? ` — Phản hồi: ${liquidation.current.decisionNote}` : ""}</p> : null}
      {liquidation.canSubmit ? <div className="form-grid two">
        <label className="field"><span>Nội dung biên bản</span><textarea value={report} onChange={(event) => setReport(event.target.value)} /></label>
        <label className="field"><span>Số tiền thu hồi (đồng)</span><input type="number" min={0} step={1} value={recovered} onChange={(event) => setRecovered(event.target.value)} /></label>
        <button className="button primary" type="button" disabled={busy || report.trim().length < 10} onClick={() => void call("liquidation", { report, recoveredAmount: Number(recovered || 0), fileRecordIds: picked }, "Trình biên bản thanh lý (Trưởng ban → Trưởng phòng → Giám đốc)?")}>Trình biên bản thanh lý</button>
      </div> : null}
      {liquidation.canSign && liquidation.current ? <div className="form-grid two">
        <label className="field"><span>Lý do (bắt buộc khi từ chối)</span><input value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="button-row">
          <button className="button primary" type="button" disabled={busy || gap !== 0} title={gap !== 0 ? "Chưa cân đối: quyết toán + thu hồi phải bằng đã giải ngân." : undefined} onClick={() => void call(`liquidation/${liquidation.current!.id}/approve`, { reason: reason || undefined }, "Ký biên bản thanh lý và đóng đề tài?")}>Ký biên bản</button>
          <button className="button danger" type="button" disabled={busy || !reason.trim()} onClick={() => void call(`liquidation/${liquidation.current!.id}/reject`, { reason }, "Từ chối biên bản thanh lý?")}>Từ chối</button>
        </div>
      </div> : null}
    </SectionCard> : null}
  </>;
}
```

- [ ] **Step 3: Gắn vào trang chi tiết**

`project-detail.tsx`: import `{ ProjectFundingSection } from "@/components/projects/project-funding-section";` và chèn ngay sau `SectionCard "Các phiên bản báo cáo"` (dòng 130):

```tsx
    <ProjectFundingSection project={project} busy={busy} setBusy={setBusy} setNotice={setNotice} onDone={refresh} />
```

- [ ] **Step 4: Typecheck, smoke, kiểm tra tay**

Run: `npm run typecheck && node --test tests/smoke.test.mjs`
Expected: PASS.

Chạy `docker compose up -d postgres minio`, `npm run dev:api`, `npm run dev:web` (preview `dev:web` ở cổng 3000). Đăng nhập `admin`/`1234` (GĐ hoặc tài khoản TP theo `docs/development/auth-seed-users.md`), mở một đề tài đang thực hiện: thấy mục "Kinh phí", ghi một GRANT rồi một DISBURSEMENT lớn hơn → thấy thông điệp `FUNDING_INVALID`. Đăng nhập tài khoản PGĐ-TD → không thấy mục. Chụp màn hình hai trường hợp.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(st-6.13.5): mục Kinh phí và Thanh lý trên trang chi tiết đề tài

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Tài liệu, sprint status, kiểm chứng toàn bộ

**Files:**
- Modify: `docs/permission-matrix.md` (§7 bảng dòng 402-403; §11 dòng 652)
- Modify: `docs/contracts/project-execution.md` (đoạn về funding/liquidation dòng 170-180)
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml` (6 key `6-13-*` → `review`)
- Modify: `_bmad-output/implementation-artifacts/spec-6-11-6-12-adjustment-extension-funding-liquidation.md` (mục Gaps: xoá hai gap đã xử lý)

- [ ] **Step 1: Cập nhật ma trận quyền**

Dòng 402, cột Notes/State: thêm "Chứng từ kinh phí (`FUNDING_VOUCHER`) do người được ghi kinh phí tải; ΣDisbursement ≤ ΣGrant; ΣSettlement ≤ ΣDisbursement." Dòng 403 (Liquidation): thêm "CV nhập thu hồi ≤ đã giải ngân; GĐ ký chỉ khi quyết toán + thu hồi = đã giải ngân; ký thì chốt số liệu và cấp số `n/BBTL-HVQY/năm`." Dòng 652 (audit): thêm `approve-proposal-funding` và `liquidationNumber` vào cột dữ liệu.

- [ ] **Step 2: Cập nhật contract và spec cũ**

`docs/contracts/project-execution.md`: sau đoạn dòng 176-178 thêm hai câu về bất biến tổng và điều kiện cân đối khi ký thanh lý, trỏ tới `docs/superpowers/specs/2026-11-11-kinh-phi-de-tai-design.md`. Trong spec 6.11/6.12 mục Gaps, xoá dòng "Funding documents..." và "No web UI for funding records or liquidation; no notifications", thay bằng "Đã xử lý ở 6.13".

- [ ] **Step 3: Sprint status**

Đổi 6 key `6-13-*` từ `backlog` sang `review`.

- [ ] **Step 4: Kiểm chứng toàn bộ**

Run: `npm run typecheck && npm test`
Expected: PASS toàn bộ. Nếu `tests/smoke.test.mjs` báo từ cấm dưới `apps/web/src`, sửa từ ngữ trong component.

- [ ] **Step 5: Commit**

```bash
git add docs _bmad-output/implementation-artifacts
git commit -m "docs(st-6.13): cập nhật ma trận quyền, contract và sprint status cho kinh phí đề tài

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

- Spec coverage: 6-13-1 → Task 3; 6-13-2 → Task 1+2; 6-13-3 → Task 4; 6-13-4 → Task 5; 6-13-5 → Task 7; 6-13-6 → Task 6; docs → Task 8.
- Tên dùng xuyên task: `readFundingAmount`, `readApprovedBudget`, `latestFunding`, `fundingTotals`, `assertFundingInvariant` (Task 1) được Task 2/3/5 dùng đúng tên; `currentFundingTotals` (Task 5) dùng ở Task 5; `closing` (Task 5) dùng ở Task 6; `canSubmit`, `liquidationNumber`, `recoveredAmount` (Task 5) dùng ở Task 7.
- Điểm chưa chắc, người thực hiện phải xác nhận khi chạy: (a) `findEvaluationProposal` có select `budgetMetadata` không (Task 3); (b) `mutate` đã map P2002 → 409 chưa (Task 5); (c) `uploadFile` trả `{ id }` hay `{ file: { id } }` (Task 4).
