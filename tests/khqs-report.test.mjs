import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import ExcelJS from "exceljs";
import {
  allocation,
  buildTables,
  managementFacts,
  managementSuggestion,
  parsePeriod,
  periodBounds,
  projectLevel,
  readManualTables,
  readNarrative
} from "../dist/apps/api/khqs-reports/khqs-report.js";
import { buildKhqsWorkbook } from "../dist/apps/api/khqs-reports/khqs-report-excel.js";
import { KhqsReportsService } from "../dist/apps/api/khqs-reports/khqs-reports.service.js";

function actor(id, systemRole) {
  return { id, username: id, displayName: `CB ${id}`, systemRole, status: "active" };
}

function sampleProject(overrides = {}) {
  return {
    id: overrides.id ?? "proj-1",
    code: overrides.code ?? "2026-KHTH-001",
    title: overrides.title ?? "Nghiên cứu ứng dụng AI trong y học quân sự",
    status: overrides.status ?? "executing",
    startDate: overrides.startDate ?? new Date(Date.UTC(2026, 0, 15)),
    endDate: overrides.endDate ?? new Date(Date.UTC(2026, 11, 20)),
    scopeSnapshot: overrides.scopeSnapshot ?? {
      proposalTypeCode: "academy-level",
      budgetMetadata: { approvedAmount: 200_000_000 }
    },
    hostOrganizationUnitId: "unit-khth",
    hostOrganizationUnit: { name: "Khoa Toán - Tin học" },
    proposal: overrides.proposal ?? { proposalTypeCode: "academy-level" },
    members: [
      {
        name: "TS. Phạm Anh Tuấn",
        participationRole: "TOPIC_PI",
        status: "ACTIVE",
        effectiveUntil: null,
        user: { displayName: "TS. Phạm Anh Tuấn" }
      }
    ],
    fundingRecords: overrides.fundingRecords ?? [
      { entryId: "grant-1", version: 1, kind: "GRANT", amount: 250_000_000, recordedOn: new Date(Date.UTC(2026, 0, 20)) },
      { entryId: "disb-1", version: 1, kind: "DISBURSEMENT", amount: 50_000_000, recordedOn: new Date(Date.UTC(2025, 10, 1)) },
      { entryId: "disb-2", version: 1, kind: "DISBURSEMENT", amount: 80_000_000, recordedOn: new Date(Date.UTC(2026, 2, 10)) },
      { entryId: "disb-2", version: 2, kind: "DISBURSEMENT", amount: 110_000_000, recordedOn: new Date(Date.UTC(2026, 2, 10)) },
      { entryId: "disb-h2", version: 1, kind: "DISBURSEMENT", amount: 40_000_000, recordedOn: new Date(Date.UTC(2026, 7, 1)) }
    ],
    requests: overrides.requests ?? [],
    reports: overrides.reports ?? [
      { status: "submitted", revision: 1, progressResults: "Hoàn thành thu thập số liệu.", issuesRecommendations: null, submittedAt: new Date(Date.UTC(2026, 4, 10)) }
    ],
    history: overrides.history ?? [],
    liquidations: overrides.liquidations ?? []
  };
}

describe("KHQS periodic report domain & Excel export", () => {
  it("parses valid periods, computes UTC period bounds, and maps both catalog level naming conventions", () => {
    assert.deepEqual(parsePeriod("2026", "H1"), { year: 2026, period: "H1" });
    assert.deepEqual(parsePeriod("2026", "FY"), { year: 2026, period: "FY" });
    assert.throws(() => parsePeriod("1999", "H1"));
    assert.throws(() => parsePeriod("2026", "Q1"));

    const h1 = periodBounds(2026, "H1");
    assert.equal(h1.start.toISOString(), "2026-01-01T00:00:00.000Z");
    assert.equal(h1.end.toISOString(), "2026-06-30T00:00:00.000Z");

    assert.equal(projectLevel({ scopeSnapshot: { proposalTypeCode: "ministry-defense" }, proposal: null }), "ministry-defense");
    assert.equal(projectLevel({ scopeSnapshot: {}, proposal: { proposalTypeCode: "sector-level" } }), "sector-level");
  });

  it("computes ProjectFundingRecord latestFunding sums in millions with H1/FY cutoffs", () => {
    const proj = sampleProject();
    const h1Money = allocation(proj, 2026, "H1");
    assert.equal(h1Money.totalBudget, 250);
    assert.equal(h1Money.before, 50);
    // entryId "disb-2" v2 (110M) supersedes v1 (80M), and H2 disbursement (40M on 2026-08-01) is excluded in H1
    assert.equal(h1Money.inYear, 110);

    const fyMoney = allocation(proj, 2026, "FY");
    assert.equal(fyMoney.inYear, 150);
  });

  it("partitions KQ-1 (national) and KQ-2 (ministry/branch/grassroots), applies overrides, and builds management facts", () => {
    const projects = [
      sampleProject({ id: "nat-1", code: "2026-NAT-001", scopeSnapshot: { proposalTypeCode: "national-level" } }),
      sampleProject({ id: "min-1", code: "2026-BQP-001", scopeSnapshot: { proposalTypeCode: "ministry-defense" } }),
      sampleProject({ id: "br-1", code: "2026-NG-001", scopeSnapshot: { proposalTypeCode: "sector-level" } }),
      sampleProject({ id: "ac-1", code: "2026-HV-001", scopeSnapshot: { proposalTypeCode: "academy-level" } }),
      sampleProject({ id: "bs-1", code: "2026-CS-001", scopeSnapshot: { proposalTypeCode: "base-level" } })
    ];

    const tables = buildTables(projects, 2026, "H1", { "ac-1": { result: "Đã sửa tay cho kỳ H1", note: "Ghi chú mới" } });
    assert.equal(tables.kq1.length, 1);
    assert.equal(tables.kq2.find((s) => s.key === "ministry").rows.length, 1);
    assert.equal(tables.kq2.find((s) => s.key === "branch").rows.length, 1);
    assert.equal(tables.kq2.find((s) => s.key === "grassroots").rows.length, 2);

    const overridden = tables.kq2.find((s) => s.key === "grassroots").rows.find((r) => r.projectId === "ac-1");
    assert.equal(overridden.result, "Đã sửa tay cho kỳ H1");
    assert.equal(overridden.note, "Ghi chú mới");
    assert.equal(overridden.edited, true);

    const facts = managementFacts(projects, 2026, "H1");
    assert.equal(facts.total, 5);
    assert.equal(facts.national, 1);
    assert.equal(facts.ministry, 1);
    assert.equal(facts.branch, 1);
    assert.equal(facts.grassroots, 2);
    assert.match(managementSuggestion(facts, 2026, "H1"), /5 nhiệm vụ KH&CN/);
  });

  it("generates a 5-sheet ExcelJS workbook (KQ-1..KQ-6) and sanitizes formula injection", async () => {
    const proj = sampleProject({ id: "nat-inj", title: "=SUM(A1)", scopeSnapshot: { proposalTypeCode: "national-level" } });
    const tables = buildTables([proj], 2026, "H1", {});
    const manual = readManualTables({
      kq3: [{ name: "+CMD()", host: "HVQY", partner: "Đối tác", totalBudget: 120 }],
      kq4: [{ section: "project", fundSource: "defense", name: "PTN A", totalInvestment: 500 }],
      kq6: [{ section: "training", task: "compile", name: "Giáo trình B", compiled: "done", compileBudget: 30 }],
      overrides: {}
    });

    const buf = await buildKhqsWorkbook({ year: 2026, period: "H1", tables, manual });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    assert.deepEqual(wb.worksheets.map((ws) => ws.name), ["KQ-1", "KQ-2", "KQ-3", "KQ-4", "KQ-6"]);
    const kq1Name = String(wb.getWorksheet("KQ-1").getRow(7).getCell(2).value ?? "");
    assert.ok(kq1Name.startsWith("'=SUM(A1)"), `Expected neutralized formula, got: ${kq1Name}`);
    const kq3Name = String(wb.getWorksheet("KQ-3").getRow(7).getCell(2).value ?? "");
    assert.ok(kq3Name.startsWith("'+CMD()"), `Expected neutralized formula, got: ${kq3Name}`);
  });
});

describe("KhqsReportsService RBAC, optimistic locking & audit log", () => {
  function createMockPrisma() {
    let stored = null;
    const audits = [];
    const projects = [sampleProject()];
    const prisma = {
      audits,
      approvedProject: {
        findMany: async () => projects
      },
      khqsPeriodicReport: {
        findUnique: async ({ where, include, select }) => {
          if (!stored || stored.year !== where.year_period.year || stored.period !== where.year_period.period) return null;
          if (select) return { id: stored.id, version: stored.version };
          return include ? { ...stored, updatedBy: { displayName: "Trưởng phòng" } } : stored;
        },
        create: async ({ data }) => {
          stored = { id: "khqs-1", ...data, updatedAt: new Date() };
          return stored;
        },
        updateMany: async ({ where, data }) => {
          if (!stored || stored.id !== where.id || stored.version !== where.version) return { count: 0 };
          stored = { ...stored, ...data, version: stored.version + 1, updatedAt: new Date() };
          return { count: 1 };
        }
      },
      auditLog: {
        create: async ({ data }) => {
          audits.push(data);
          return data;
        }
      }
    };
    return prisma;
  }

  it("allows read for GĐ/PGĐ-KH/TP/TB, allows edit only for TP/TB, and denies other roles with 403", async () => {
    const prisma = createMockPrisma();
    const auditLog = { record: async (entry) => { prisma.audits.push(entry); } };
    const service = new KhqsReportsService(prisma, auditLog);

    for (const role of ["LEADERSHIP_APPROVAL_AUTHORITY", "SCIENCE_DEPUTY_DIRECTOR", "RESEARCH_MANAGEMENT_HEAD", "RESEARCH_BOARD_HEAD"]) {
      const report = await service.get(actor(`u-${role}`, role), "2026", "H1");
      assert.equal(report.canEdit, role === "RESEARCH_MANAGEMENT_HEAD" || role === "RESEARCH_BOARD_HEAD");
    }

    for (const deniedRole of [
      "RESEARCH_OVERSIGHT_AUTHORITY",
      "RESEARCH_MANAGEMENT_DEPUTY_HEAD",
      "RESEARCH_MANAGEMENT_STAFF",
      "RESEARCHER_INTERNAL_USER",
      "EXTERNAL_RESEARCHER_USER",
      "STUDENT_USER",
      "SYSTEM_ADMIN"
    ]) {
      await assert.rejects(() => service.get(actor(`u-${deniedRole}`, deniedRole), "2026", "H1"), ForbiddenException);
    }

    await assert.rejects(
      () => service.save(actor("gd", "LEADERSHIP_APPROVAL_AUTHORITY"), "2026", "H1", { version: 0, narrative: { basis: "abc" } }),
      ForbiddenException
    );
    await assert.rejects(
      () => service.save(actor("pgdkh", "SCIENCE_DEPUTY_DIRECTOR"), "2026", "H1", { version: 0, narrative: { basis: "abc" } }),
      ForbiddenException
    );
  });

  it("enforces optimistic version locking (409 on stale version) and records audit entries on save & Excel export", async () => {
    const prisma = createMockPrisma();
    const auditLog = { record: async (entry) => { prisma.audits.push(entry); } };
    const service = new KhqsReportsService(prisma, auditLog);

    const tp = actor("tp", "RESEARCH_MANAGEMENT_HEAD");
    const saved = await service.save(tp, "2026", "H1", {
      version: 0,
      narrative: readNarrative({ documentNumber: "15/BC-HVQY", situation: "Ổn định" }),
      manual: { kq3: [{ name: "Hợp tác 1" }], kq4: [], kq6: [] },
      overrides: {}
    });
    assert.equal(saved.version, 1);

    await assert.rejects(
      () => service.save(actor("tb", "RESEARCH_BOARD_HEAD"), "2026", "H1", { version: 0, narrative: { situation: "Ghi đè cũ" } }),
      ConflictException
    );

    const xlsx = await service.exportExcel(actor("gd", "LEADERSHIP_APPROVAL_AUTHORITY"), "2026", "H1");
    assert.equal(xlsx.fileName, "Bao_cao_KHQS_6_thang_2026.xlsx");
    assert.ok(Buffer.isBuffer(xlsx.buffer) && xlsx.buffer.length > 500);
    assert.deepEqual(prisma.audits.map((a) => a.action), ["khqs-report-save", "khqs-report-export"]);
  });
});
