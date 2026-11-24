import "dotenv/config";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import ts from "typescript";
import { ConflictException } from "@nestjs/common";
import {
  allocateLiquidationNumber,
  allocateProposalCode,
  formatAcademicTitleFromProfile,
  formatProposalCode,
  nextDocumentSequence,
  resolveDecisionNumber
} from "../dist/apps/api/proposals-shared/document-number.js";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";

function compileTsModule(source, filename, mocks) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
  });
  const mod = { exports: {} };
  const fn = vm.runInThisContext(`(function(exports, require, module) { ${outputText}\n})`, { filename });
  fn(mod.exports, (spec) => {
    if (spec in mocks) return mocks[spec];
    throw new Error(`Unexpected import ${spec} in ${filename}`);
  }, mod);
  return mod.exports;
}

describe("Automatic document numbering", () => {
  it("formats and allocates sequential proposal codes, decision numbers, and liquidation numbers with duplicate checks", async () => {
    assert.equal(formatProposalCode(2026, "KHTH", 7), "2026-KHTH-007");

    const counters = new Map();
    const takenDecisions = new Set(["001/QĐ-HVQY/2026", "105/QĐ-HVQY"]);
    const takenProposals = new Set(["2026-KHTH-001"]);
    const takenLiquidations = new Set();

    const tx = {
      $queryRaw: async (_strings, ...values) => {
        const key = `${values[0]}:${values[1]}`;
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);
        return [{ value: next }];
      },
      researchProposal: {
        findFirst: async ({ where }) => (takenProposals.has(where.code) ? { id: "existing" } : null)
      },
      proposalDecision: {
        findFirst: async ({ where }) => (takenDecisions.has(where.decisionNumber) ? { id: "d1" } : null)
      },
      approvalSubmission: {
        findFirst: async () => null
      },
      projectLiquidation: {
        findFirst: async ({ where }) => (takenLiquidations.has(where.liquidationNumber) ? { id: "l1" } : null)
      }
    };

    // Skips existing 2026-KHTH-001 and returns 002
    assert.equal(await allocateProposalCode(tx, "KHTH", new Date("2026-05-01T00:00:00Z")), "2026-KHTH-002");

    // Skips taken 001/QĐ-HVQY/2026 and returns 002/QĐ-HVQY/2026
    assert.equal(await resolveDecisionNumber(tx, { year: 2026 }), "002/QĐ-HVQY/2026");

    // Duplicate manual decision number rejects with 409 DECISION_NUMBER_TAKEN
    await assert.rejects(
      () => resolveDecisionNumber(tx, { requested: "105/QĐ-HVQY", year: 2026 }),
      (err) => err instanceof ConflictException && err.getResponse().code === "DECISION_NUMBER_TAKEN"
    );

    // Explicit unused number is preserved without advancing counter
    assert.equal(await resolveDecisionNumber(tx, { requested: " 208/QĐ-HVQY ", year: 2026 }), "208/QĐ-HVQY");

    assert.equal(await allocateLiquidationNumber(tx, 2026), "1/BBTL-HVQY/2026");
    assert.equal(
      formatAcademicTitleFromProfile({
        academicRankCatalogItem: { code: "associate-professor", name: "PGS" },
        academicDegreeCatalogItem: { code: "doctor", name: "TS" }
      }),
      "PGS. TS."
    );
  });

  it("atomically increments PostgreSQL document_number_counters under concurrent calls", async () => {
    const prevUrl = process.env.DATABASE_URL;
    const database = await createMigratedDatabase("doc_counters");
    process.env.DATABASE_URL = database.url;
    const prisma = new PrismaService();
    try {
      const results = await Promise.all(
        Array.from({ length: 6 }, () => prisma.$transaction((tx) => nextDocumentSequence(tx, "qd-hvqy", 2026)))
      );
      assert.deepEqual([...results].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);
    } finally {
      await prisma.$disconnect();
      process.env.DATABASE_URL = prevUrl;
      await database.drop();
    }
  });
});

describe("Official decision document templates (QĐ 1273, QĐ 4626, TT 14/2022/TT-BQP)", () => {
  it("renders valid, XSS-safe official HTML with KT. GIÁM ĐỐC for PGĐ-KH, TT 14/2022/TT-BQP, and blank unsigned placeholders", async () => {
    const [docSrc, tplSrc, clsSrc, vndSrc] = await Promise.all([
      readFile("apps/web/src/lib/decision-document.ts", "utf8"),
      readFile("apps/web/src/lib/decision-templates.ts", "utf8"),
      readFile("apps/web/src/lib/proposal-classification.ts", "utf8"),
      readFile("apps/web/src/lib/vietnamese-currency.ts", "utf8")
    ]);

    const docMod = compileTsModule(docSrc, "decision-document.ts", {});
    const clsMod = compileTsModule(clsSrc, "proposal-classification.ts", {});
    const vndMod = compileTsModule(vndSrc, "vietnamese-currency.ts", {});
    const tplMod = compileTsModule(tplSrc, "decision-templates.ts", {
      "@/lib/decision-document": docMod,
      "@/lib/proposal-classification": clsMod,
      "@/lib/vietnamese-currency": vndMod
    });

    const councilHtml = docMod.buildDecisionHtml(
      tplMod.councilDecisionDocument({
        code: "2026-KHTH-001",
        title: "Nghiên cứu <script>alert(1)</script> y học",
        ownerDisplayName: "Thượng tá, TS. Phạm Anh Tuấn",
        hostOrganizationUnitName: "Khoa Toán - Tin học",
        proposalTypeCode: "academy-level",
        councilMetadata: {
          decisionNumber: "1273/QĐ-HVQY",
          decidedAt: "2026-05-15T03:00:00.000Z",
          decidedByName: "Thiếu tướng, PGS. TS. Vũ Nhất Định",
          decidedByRole: "SCIENCE_DEPUTY_DIRECTOR",
          members: [
            { displayName: "GS. TS. Trần A", assignmentRole: "council_chair", academicTitle: "GS. TS.", unit: "Bộ môn Nội" },
            { displayName: "TS. Nguyễn B", assignmentRole: "council_secretary", unit: "Phòng KHQS" }
          ]
        }
      })
    );

    assert.match(councilHtml, /1273\/QĐ-HVQY/);
    assert.match(councilHtml, /Thông tư 14\/2022\/TT-BQP/);
    assert.match(councilHtml, /KT\. GIÁM ĐỐC/);
    assert.match(councilHtml, /PHÓ GIÁM ĐỐC/);
    assert.match(councilHtml, /Thiếu tướng Vũ Nhất Định/);
    assert.doesNotMatch(councilHtml, /<script>/);
    assert.match(councilHtml, /&lt;script&gt;/);
    assert.doesNotMatch(councilHtml, /57\/2021/);

    const approvalDraftHtml = docMod.buildDecisionHtml(
      tplMod.approvalDecisionDocument({
        code: "2026-KHTH-002",
        title: "Đề tài cấp Học viện",
        ownerDisplayName: "TS. Nguyễn Văn A",
        hostOrganizationUnitName: "Viện Nghiên cứu Y học quân sự",
        budgetMetadata: { approvedAmount: 150_000_000 },
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        decisions: []
      })
    );
    assert.match(approvalDraftHtml, /Số:.*\/QĐ-HVQY/);
    assert.match(approvalDraftHtml, /150\.000\.000 đồng/);
    assert.match(approvalDraftHtml, /Thông tư 14\/2022\/TT-BQP/);

    const acceptanceHtml = docMod.buildDecisionHtml(
      tplMod.acceptanceCouncilDecisionDocument({
        project: { code: "2026-KHTH-003", title: "Đề tài nghiệm thu", piName: "TS. Lê C", unitName: "Khoa Ngoại" },
        decisionNumber: "4626/QĐ-HVQY",
        decidedAt: "2026-11-20T00:00:00Z",
        decidedByName: "Trung tướng Trần Viết Tiến",
        decidedByRole: "LEADERSHIP_APPROVAL_AUTHORITY",
        members: [{ displayName: "PGS. TS. Hoàng D", councilRole: "council_chair", unit: "Học viện Quân y" }],
        products: [{ title: "Quy trình chẩn đoán", type: "Quy trình", description: "Đạt chuẩn" }]
      })
    );
    assert.match(acceptanceHtml, /4626\/QĐ-HVQY/);
    assert.match(acceptanceHtml, /Phụ lục I/);
    assert.match(acceptanceHtml, /Phụ lục II/);
    assert.match(acceptanceHtml, /Quy trình chẩn đoán/);

    const panelHtml = docMod.buildDecisionHtml(
      tplMod.productPanelDecisionDocument({
        project: { code: "2026-KHTH-003", title: "Đề tài nghiệm thu", piName: "TS. Lê C", unitName: "Khoa Ngoại" },
        products: [{ title: "Phần mềm xử lý ảnh", productForm: 1, requirements: "Độ chính xác cao" }],
        members: [{ fullName: "TS. Đỗ E", academicTitle: "TS.", unit: "Khoa CNTT", role: "LEADER" }]
      })
    );
    assert.match(panelHtml, /Tổ thẩm định, đánh giá sản phẩm KH&amp;CN/);
    assert.match(panelHtml, /Tổ trưởng/);
  });
});
