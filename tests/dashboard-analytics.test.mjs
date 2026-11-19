import "dotenv/config";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import vm from "node:vm";
import ts from "typescript";
import * as react from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { ConflictException } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createMigratedDatabase } from "./helpers/disposable-database.mjs";
import { AppModule } from "../dist/apps/api/app.module.js";
import { PrismaService } from "../dist/apps/api/infrastructure/prisma/prisma.service.js";
import { ApprovedProjectsService } from "../dist/apps/api/approved-projects/approved-projects.service.js";
import { computeProjectProgress } from "../dist/apps/api/approved-projects/project-progress.js";
import { ProjectHealthSnapshotService } from "../dist/apps/api/dashboard/project-health-snapshot.service.js";

function unzipEntries(zipBuffer) {
  const entries = new Map();
  let eocdOffset = -1;
  for (let i = zipBuffer.length - 22; i >= 0; i--) {
    if (zipBuffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  assert.notEqual(eocdOffset, -1, "ZIP phải có End of Central Directory");
  const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
  let cdOffset = zipBuffer.readUInt32LE(eocdOffset + 16);

  for (let idx = 0; idx < totalEntries; idx++) {
    assert.equal(zipBuffer.readUInt32LE(cdOffset), 0x02014b50);
    const method = zipBuffer.readUInt16LE(cdOffset + 10);
    const compressedSize = zipBuffer.readUInt32LE(cdOffset + 20);
    const nameLen = zipBuffer.readUInt16LE(cdOffset + 28);
    const extraLen = zipBuffer.readUInt16LE(cdOffset + 30);
    const commentLen = zipBuffer.readUInt16LE(cdOffset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(cdOffset + 42);
    const name = zipBuffer.subarray(cdOffset + 46, cdOffset + 46 + nameLen).toString("utf8");

    assert.equal(zipBuffer.readUInt32LE(localHeaderOffset), 0x04034b50);
    const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const rawSlice = zipBuffer.subarray(dataStart, dataStart + compressedSize);
    const content = method === 8 ? inflateRawSync(rawSlice) : rawSlice;
    entries.set(name, content.toString("utf8"));

    cdOffset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

let database;
let db;
let app;
let baseUrl;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalSnapshotsEnabled = process.env.HEALTH_SNAPSHOTS_ENABLED;
const fixture = {};

before(async () => {
  database = await createMigratedDatabase("dashboard_analytics");
  process.env.DATABASE_URL = database.url;
  process.env.HEALTH_SNAPSHOTS_ENABLED = "false";

  db = new PrismaService();

  const unitA = await db.organizationUnit.create({
    data: { id: "org-dash-a", code: "DASH-A", name: "Khoa Toán - Tin học (Test)" }
  });
  const unitB = await db.organizationUnit.create({
    data: { id: "org-dash-b", code: "DASH-B", name: "Khoa Vật lý (Test)" }
  });
  const unitOut = await db.organizationUnit.create({
    data: { id: "org-dash-out", code: "DASH-OUT", name: "Đơn vị ngoài phạm vi (Test)" }
  });

  for (const [type, code, name] of [
    ["proposal-type", "academy-level", "Đề tài cấp Học viện"],
    ["research-field", "military-medicine", "Y học quân sự"],
    ["proposal-nature", "military", "Quân sự"],
    ["proposal-nature", "civil", "Dân sự"]
  ]) {
    await db.catalogItem.upsert({
      where: { type_code: { type, code } },
      update: { name, status: "active", deletedAt: null },
      create: { type, code, name, status: "active" }
    });
  }

  const sessions = {};
  const makeUser = async (alias, systemRole, scopedUnits) => {
    const username = `${alias}_dash`;
    const user = await db.user.create({
      data: {
        username,
        usernameKey: username.toLowerCase(),
        displayName: `CB ${alias}`,
        passwordHash: "x",
        status: "active",
        systemRole,
        unit: scopedUnits[0]?.name ?? "HVQY",
        organizationScopes: {
          create: scopedUnits.map((u, idx) => ({
            organizationUnitId: u.id,
            isPrimary: idx === 0
          }))
        }
      }
    });
    const rawToken = `tok-${alias}-${randomUUID()}`;
    const sessionId = createHash("sha256").update(rawToken).digest("hex");
    await db.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        credentialVersion: 0,
        expiresAt: new Date(Date.now() + 86_400_000)
      }
    });
    sessions[alias] = `rtms_session=${rawToken}`;
    return user;
  };

  const users = {
    admin: await makeUser("admin", "SYSTEM_ADMIN", [unitA]),
    student: await makeUser("sv01", "STUDENT_USER", [unitA]),
    tvtien: await makeUser("tvtien", "LEADERSHIP_APPROVAL_AUTHORITY", [unitA, unitB]),
    nmphuong: await makeUser("nmphuong", "RESEARCH_MANAGEMENT_HEAD", [unitA, unitB]),
    oversight: await makeUser("ndbac", "RESEARCH_OVERSIGHT_AUTHORITY", [unitA]),
    oversightWide: await makeUser("ndbacWide", "RESEARCH_OVERSIGHT_AUTHORITY", [unitA, unitB]),
    cv1: await makeUser("cv1", "RESEARCH_MANAGEMENT_STAFF", [unitA, unitB]),
    cv2: await makeUser("cv2", "RESEARCH_MANAGEMENT_STAFF", [unitA, unitB]),
    piA: await makeUser("piA", "RESEARCHER_INTERNAL_USER", [unitA]),
    piB: await makeUser("piB", "RESEARCHER_INTERNAL_USER", [unitB]),
    reviewer: await makeUser("reviewer", "RESEARCHER_INTERNAL_USER", [unitOut]),
    councilExternal: await makeUser("councilExt", "EXTERNAL_RESEARCHER_USER", [unitOut]),
    outsider: await makeUser("outsider", "RESEARCHER_INTERNAL_USER", [unitOut])
  };

  const intake = await db.proposalIntakePeriod.create({
    data: {
      code: "INTAKE-2026-DASH",
      title: "Đợt 2026",
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2026-12-31T00:00:00.000Z"),
      status: "open",
      requiredPackage: []
    }
  });

  // Proposal 1 (Unit A, approved, formula-like title to verify Excel sanitization)
  const prop1 = await db.researchProposal.create({
    data: {
      code: "DX-2026-01",
      intakePeriodId: intake.id,
      ownerId: users.piA.id,
      hostOrganizationUnitId: unitA.id,
      researchFieldCode: "military-medicine",
      proposalTypeCode: "academy-level",
      proposalNatureCode: "military",
      title: "=SUM(1,2) Đề tài Quân y A",
      startDate: new Date("2026-01-15T00:00:00.000Z"),
      endDate: new Date("2026-12-20T00:00:00.000Z"),
      budgetMetadata: { amount: 300_000_000, approvedAmount: 250_000_000 },
      status: "approved",
      submittedAt: new Date("2026-01-10T00:00:00.000Z")
    }
  });
  await db.proposalManagementOfficer.create({
    data: {
      proposalId: prop1.id,
      officerUserId: users.cv1.id,
      assignedById: users.nmphuong.id,
      status: "ACTIVE",
      effectiveFrom: new Date("2026-01-10T00:00:00.000Z")
    }
  });
  const sub1 = await db.proposalSubmissionEvent.create({
    data: {
      proposalId: prop1.id,
      actorId: users.piA.id,
      fromStatus: "draft",
      toStatus: "submitted",
      snapshot: { members: [], attachments: [], requiredPackage: [] }
    }
  });
  const dec1 = await db.proposalDecision.create({
    data: {
      proposalId: prop1.id,
      decision: "approved",
      decidedById: users.tvtien.id,
      fromStatus: "ready_for_approval",
      toStatus: "approved"
    }
  });
  await db.proposalReviewAssignment.create({
    data: {
      proposalId: prop1.id,
      reviewerUserId: users.reviewer.id,
      assignedById: users.nmphuong.id,
      assignmentRole: "reviewer",
      status: "assigned",
      invitationStatus: "accepted",
      councilEstablishedAt: new Date("2026-01-12T00:00:00.000Z"),
      effectiveFrom: new Date("2026-01-11T00:00:00.000Z"),
      reviewedSubmissionEventId: sub1.id
    }
  });

  // Project 1: executing in Unit A, overdue milestone, GRANT 250M, DISBURSEMENT 100M, assigned to cv1
  const proj1 = await db.approvedProject.create({
    data: {
      code: "DT-2026-01",
      proposalId: prop1.id,
      sourceSubmissionEventId: sub1.id,
      sourceDecisionId: dec1.id,
      hostOrganizationUnitId: unitA.id,
      title: "+Đề tài thực hiện Quân y A",
      scopeSnapshot: {
        title: "+Đề tài thực hiện Quân y A",
        researchFieldCode: "military-medicine",
        proposalTypeCode: "academy-level",
        proposalNatureCode: "military",
        budgetMetadata: { approvedAmount: 250_000_000 }
      },
      status: "executing",
      startDate: new Date("2026-01-15T00:00:00.000Z"),
      endDate: new Date("2026-12-20T00:00:00.000Z"),
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
      createdById: users.cv1.id
    }
  });
  await db.approvedProjectMember.create({
    data: {
      projectId: proj1.id,
      userId: users.piA.id,
      name: users.piA.displayName,
      role: "TOPIC_PI",
      participationRole: "TOPIC_PI",
      status: "ACTIVE",
      effectiveFrom: new Date("2026-01-15T00:00:00.000Z"),
      createdById: users.cv1.id
    }
  });
  await db.projectManagementOfficer.create({
    data: {
      projectId: proj1.id,
      officerUserId: users.cv1.id,
      assignedById: users.nmphuong.id,
      status: "ACTIVE",
      effectiveFrom: new Date("2026-01-15T00:00:00.000Z")
    }
  });
  await db.projectMilestone.createMany({
    data: [
      {
        projectId: proj1.id,
        title: "Mốc 1 đã xong",
        dueDate: new Date("2026-03-01T00:00:00.000Z"),
        status: "completed",
        isImportant: true,
        position: 0,
        createdById: users.cv1.id
      },
      {
        projectId: proj1.id,
        title: "Mốc 2 quá hạn",
        dueDate: new Date("2026-05-01T00:00:00.000Z"),
        status: "open",
        isImportant: true,
        position: 1,
        createdById: users.cv1.id
      }
    ]
  });
  await db.projectFundingRecord.createMany({
    data: [
      {
        projectId: proj1.id,
        entryId: randomUUID(),
        version: 1,
        kind: "GRANT",
        amount: 250_000_000,
        recordedOn: new Date("2026-01-20T00:00:00.000Z"),
        fileRecordIds: [],
        recordedById: users.cv1.id
      },
      {
        projectId: proj1.id,
        entryId: randomUUID(),
        version: 1,
        kind: "DISBURSEMENT",
        amount: 100_000_000,
        recordedOn: new Date("2026-04-10T00:00:00.000Z"),
        fileRecordIds: [],
        recordedById: users.cv1.id
      }
    ]
  });
  await db.acceptanceDossier.create({
    data: {
      projectId: proj1.id,
      status: "draft",
      sections: {
        results: "Kết quả bước đầu",
        summary: "Tóm tắt",
        milestoneNotes: {},
        products: [
          { name: "@Bài báo Quân y 1", type: "publication", description: "Tạp chí Y dược học quân sự" }
        ]
      },
      sourceContext: {},
      createdById: users.piA.id
    }
  });

  // Proposal 2 & Project 2: accepted in Unit B (outside oversight's unitA scope!), assigned to cv2
  // Also has past open checkpoint/milestone to prove accepted/closed project snapshots get maxDaysOverdue=0, lateReports=0!
  const prop2 = await db.researchProposal.create({
    data: {
      code: "DX-2026-02",
      intakePeriodId: intake.id,
      ownerId: users.piB.id,
      hostOrganizationUnitId: unitB.id,
      researchFieldCode: "military-medicine",
      proposalTypeCode: "academy-level",
      proposalNatureCode: "civil",
      title: "-Đề tài Dân sự B",
      startDate: new Date("2026-02-01T00:00:00.000Z"),
      endDate: new Date("2026-10-01T00:00:00.000Z"),
      budgetMetadata: { approvedAmount: 400_000_000 },
      status: "approved",
      submittedAt: new Date("2026-01-20T00:00:00.000Z")
    }
  });
  const sub2 = await db.proposalSubmissionEvent.create({
    data: {
      proposalId: prop2.id,
      actorId: users.piB.id,
      fromStatus: "draft",
      toStatus: "submitted",
      snapshot: {}
    }
  });
  const dec2 = await db.proposalDecision.create({
    data: {
      proposalId: prop2.id,
      decision: "approved",
      decidedById: users.tvtien.id,
      fromStatus: "ready_for_approval",
      toStatus: "approved"
    }
  });
  const proj2 = await db.approvedProject.create({
    data: {
      code: "DT-2026-02",
      proposalId: prop2.id,
      sourceSubmissionEventId: sub2.id,
      sourceDecisionId: dec2.id,
      hostOrganizationUnitId: unitB.id,
      title: "Đề tài đã nghiệm thu B",
      scopeSnapshot: {
        title: "Đề tài đã nghiệm thu B",
        researchFieldCode: "military-medicine",
        proposalTypeCode: "academy-level",
        proposalNatureCode: "civil",
        budgetMetadata: { approvedAmount: 400_000_000 }
      },
      status: "accepted",
      startDate: new Date("2026-02-01T00:00:00.000Z"),
      endDate: new Date("2026-09-01T00:00:00.000Z"),
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      createdById: users.cv2.id
    }
  });
  await db.approvedProjectMember.create({
    data: {
      projectId: proj2.id,
      userId: users.piB.id,
      name: users.piB.displayName,
      role: "TOPIC_PI",
      participationRole: "TOPIC_PI",
      status: "ACTIVE",
      effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
      createdById: users.cv2.id
    }
  });
  await db.projectManagementOfficer.create({
    data: {
      projectId: proj2.id,
      officerUserId: users.cv2.id,
      assignedById: users.nmphuong.id,
      status: "ACTIVE",
      effectiveFrom: new Date("2026-02-01T00:00:00.000Z")
    }
  });
  await db.projectMilestone.create({
    data: {
      projectId: proj2.id,
      title: "Mốc cũ quá hạn nhưng đề tài đã nghiệm thu",
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      status: "open",
      position: 0,
      createdById: users.cv2.id
    }
  });
  await db.projectCheckpoint.create({
    data: {
      projectId: proj2.id,
      title: "Điểm báo cáo cũ",
      dueDate: new Date("2026-04-01T00:00:00.000Z"),
      status: "open"
    }
  });
  await db.projectFundingRecord.createMany({
    data: [
      {
        projectId: proj2.id,
        entryId: randomUUID(),
        version: 1,
        kind: "GRANT",
        amount: 400_000_000,
        recordedOn: new Date("2026-02-05T00:00:00.000Z"),
        fileRecordIds: [],
        recordedById: users.cv2.id
      },
      {
        projectId: proj2.id,
        entryId: randomUUID(),
        version: 1,
        kind: "DISBURSEMENT",
        amount: 350_000_000,
        recordedOn: new Date("2026-06-05T00:00:00.000Z"),
        fileRecordIds: [],
        recordedById: users.cv2.id
      }
    ]
  });
  await db.acceptanceDossier.create({
    data: {
      projectId: proj2.id,
      status: "submitted",
      submittedAt: new Date("2026-09-10T00:00:00.000Z"),
      submittedById: users.piB.id,
      sections: {
        results: "Hoàn thành",
        summary: "Tổng kết",
        milestoneNotes: {},
        products: [
          { name: "Phần mềm Chẩn đoán B", type: "software", description: "Đã bàn giao" },
          { name: "Bài báo Quốc tế B", type: "publication", description: "ISI Q1" }
        ]
      },
      sourceContext: {},
      createdById: users.piB.id
    }
  });
  // External council member accepted on an established acceptance council for proj2 -> gets `acceptance-dossier.read`!
  await db.acceptanceCouncilMember.create({
    data: {
      projectId: proj2.id,
      userId: users.councilExternal.id,
      councilRole: "committee_member",
      invitationStatus: "accepted",
      invitedById: users.nmphuong.id,
      respondedAt: new Date("2026-09-12T00:00:00.000Z"),
      councilEstablishedAt: new Date("2026-09-15T00:00:00.000Z")
    }
  });

  // Draft proposal owned by piA (visible to nmphuong & piA, NOT visible to tvtien per matrix 7.1 note 2)
  const propDraft = await db.researchProposal.create({
    data: {
      code: "DX-2026-DRAFT",
      intakePeriodId: intake.id,
      ownerId: users.piA.id,
      hostOrganizationUnitId: unitA.id,
      proposalNatureCode: "military",
      title: "Bản nháp chưa nộp",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      budgetMetadata: { amount: 80_000_000 },
      status: "draft"
    }
  });

  Object.assign(fixture, { unitA, unitB, unitOut, users, sessions, prop1, prop2, propDraft, proj1, proj2 });

  app = await NestFactory.create(AppModule, { logger: false });
  await app.listen(0, "127.0.0.1");
  const addr = app.getHttpServer().address();
  baseUrl = `http://127.0.0.1:${addr.port}/api/v1`;
});

after(async () => {
  await app?.close();
  await db?.$disconnect();
  process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalSnapshotsEnabled === undefined) delete process.env.HEALTH_SNAPSHOTS_ENABLED;
  else process.env.HEALTH_SNAPSHOTS_ENABLED = originalSnapshotsEnabled;
  await database?.drop();
});

async function apiGet(path, username) {
  const headers = username ? { Cookie: fixture.sessions[username] } : {};
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { status: response.status, headers: response.headers, body };
}

test("1. Auth & Role Boundaries: 401 unauthenticated; 403 for SYSTEM_ADMIN and STUDENT_USER across /dashboard/*", async () => {
  const unauth = await apiGet("/dashboard/distribution?subject=projects");
  assert.equal(unauth.status, 401);

  for (const blockedUser of ["admin", "sv01"]) {
    for (const path of [
      "/dashboard/stats",
      "/dashboard/distribution?subject=projects",
      "/dashboard/trends",
      "/dashboard/products",
      "/dashboard/drill-down?metric=projects",
      "/dashboard/drill-down/export?metric=projects",
      "/dashboard/export-proposals"
    ]) {
      const res = await apiGet(path, blockedUser);
      assert.equal(res.status, 403, `${blockedUser} phải bị chặn 403 tại ${path}`);
    }
  }
});

test("2. Whitelist & Duplicate Query Validation: unknown keys, duplicate keys and bad formats return 400 DASHBOARD_QUERY_INVALID", async () => {
  const unknown = await apiGet("/dashboard/distribution?subject=projects&unknown=1", "nmphuong");
  assert.equal(unknown.status, 400);
  assert.equal(unknown.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(unknown.body.field, "unknown");

  const duplicate = await apiGet("/dashboard/distribution?unitId=a&unitId=b", "nmphuong");
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(duplicate.body.field, "unitId");

  const sameDuplicate = await apiGet("/dashboard/stats?year=2026&year=2026", "nmphuong");
  assert.equal(sameDuplicate.status, 400);
  assert.equal(sameDuplicate.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(sameDuplicate.body.field, "year");

  const badMetric = await apiGet("/dashboard/drill-down?metric=conferences", "nmphuong");
  assert.equal(badMetric.status, 400);
  assert.equal(badMetric.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(badMetric.body.field, "metric");

  const badProductStatus = await apiGet("/dashboard/products?productStatus=not_valid", "nmphuong");
  assert.equal(badProductStatus.status, 400);
  assert.equal(badProductStatus.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(badProductStatus.body.field, "productStatus");

  const badProductType = await apiGet("/dashboard/products?type=bad$type!", "nmphuong");
  assert.equal(badProductType.status, 400);
  assert.equal(badProductType.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(badProductType.body.field, "type");

  const badExportMetric = await apiGet("/dashboard/drill-down/export?metric=invalid", "nmphuong");
  assert.equal(badExportMetric.status, 400);
  assert.equal(badExportMetric.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(badExportMetric.body.field, "metric");

  const badProposalExportFilter = await apiGet("/dashboard/export-proposals?unknown=1", "nmphuong");
  assert.equal(badProposalExportFilter.status, 400);
  assert.equal(badProposalExportFilter.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(badProposalExportFilter.body.field, "unknown");

  // type và productStatus bị từ chối khi metric !== "products"
  const wrongMetricType = await apiGet("/dashboard/drill-down?metric=projects&type=publication", "nmphuong");
  assert.equal(wrongMetricType.status, 400);
  assert.equal(wrongMetricType.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(wrongMetricType.body.field, "type");

  const wrongMetricProdStatus = await apiGet("/dashboard/drill-down/export?metric=proposals&productStatus=accepted", "nmphuong");
  assert.equal(wrongMetricProdStatus.status, 400);
  assert.equal(wrongMetricProdStatus.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(wrongMetricProdStatus.body.field, "productStatus");

  // type sản phẩm hợp lệ chứa dấu /, ., (), , : được chấp nhận
  const richType = await apiGet(`/dashboard/products?type=${encodeURIComponent("Sáng chế / Quy trình (v1.2): Y học, Dược")}`, "nmphuong");
  assert.equal(richType.status, 200);
});

test("3. Scoped Distribution & Out-of-Scope unitId: nmphuong, tvtien, CV1 and PI see only permitted records; out-of-scope unitId returns 0 instead of 403", async () => {
  for (const lead of ["nmphuong", "tvtien"]) {
    const res = await apiGet("/dashboard/distribution?subject=projects&year=2026", lead);
    assert.equal(res.status, 200);
    for (const key of [
      "totals",
      "byUnit",
      "byLevel",
      "byField",
      "byStatus",
      "byScope",
      "byOfficer",
      "byYear",
      "byHealth",
      "byUnitHealth"
    ]) {
      assert.ok(key in res.body, `distribution thiếu trường ${key}`);
    }
    assert.equal(res.body.totals.count, 2);
    assert.equal(res.body.totals.totalBudget, 650_000_000);
    assert.equal(res.body.totals.totalDisbursed, 450_000_000);
    assert.equal(res.body.byUnitHealth.length, 2);
  }

  // tvtien (GĐ) chỉ đọc đề xuất đã nộp vào quy trình (2 đề xuất), không đọc bản nháp của người khác; nmphuong (TP) đọc cả 3
  const tvtienProps = await apiGet("/dashboard/distribution?subject=proposals&year=2026", "tvtien");
  assert.equal(tvtienProps.body.totals.count, 2);
  const nmphuongProps = await apiGet("/dashboard/distribution?subject=proposals&year=2026", "nmphuong");
  assert.equal(nmphuongProps.body.totals.count, 3);

  // CV1 chỉ được giao phụ trách proj1 -> chỉ thấy 1 đề tài
  const cv1Dist = await apiGet("/dashboard/distribution?subject=projects&year=2026", "cv1");
  assert.equal(cv1Dist.status, 200);
  assert.equal(cv1Dist.body.totals.count, 1);
  assert.equal(cv1Dist.body.totals.totalBudget, 250_000_000);

  // piA lọc sang unitB ngoài phạm vi tham gia -> 200 OK với 0 bản ghi, tuyệt đối không 403
  const piOutUnit = await apiGet(`/dashboard/distribution?subject=projects&unitId=${fixture.unitB.id}`, "piA");
  assert.equal(piOutUnit.status, 200);
  assert.equal(piOutUnit.body.totals.count, 0);
});

test("4. RESEARCH_OVERSIGHT_AUTHORITY Funding Masking: aggregate totals visible in distribution, per-row funding is null in drill-down and Excel", async () => {
  // ndbac chỉ có scope ở unitA -> thấy proj1 (250M cấp, 100M giải ngân), không thấy proj2 ở unitB
  const dist = await apiGet("/dashboard/distribution?subject=projects&year=2026", "ndbac");
  assert.equal(dist.status, 200);
  assert.equal(dist.body.fundingRestricted, true);
  assert.equal(dist.body.totals.count, 1);
  assert.equal(dist.body.totals.totalBudget, 250_000_000);
  assert.equal(dist.body.totals.totalDisbursed, 100_000_000);

  const drill = await apiGet("/dashboard/drill-down?metric=projects", "ndbac");
  assert.equal(drill.status, 200);
  assert.equal(drill.body.total, 1);
  assert.equal(drill.body.items[0].totalBudget, null);
  assert.equal(drill.body.items[0].totalDisbursed, null);
  assert.equal(drill.body.items[0].totalSettled, null);

  const propDrill = await apiGet("/dashboard/drill-down?metric=proposals", "ndbac");
  assert.equal(propDrill.status, 200);
  assert.equal(propDrill.body.items.every((row) => row.totalBudget === null), true);

  const excel = await apiGet("/dashboard/drill-down/export?metric=projects", "ndbac");
  assert.equal(excel.status, 200);
  assert.equal(excel.headers.get("access-control-expose-headers"), "Content-Disposition");
  const sheetXml = unzipEntries(excel.body).get("xl/worksheets/sheet1.xml");
  assert.ok(!sheetXml.includes("250000000"), "Excel của PGĐ-TD không được chứa số kinh phí từng dòng");
  assert.ok(!sheetXml.includes("100000000"), "Excel của PGĐ-TD không được chứa số giải ngân từng dòng");

  // Che kinh phí đề xuất từng dòng cho PGĐ-TD trên cả export-proposals và drill-down/export?metric=proposals
  for (const propExportPath of ["/dashboard/export-proposals", "/dashboard/drill-down/export?metric=proposals"]) {
    const propExcel = await apiGet(propExportPath, "ndbac");
    assert.equal(propExcel.status, 200);
    assert.equal(propExcel.headers.get("access-control-expose-headers"), "Content-Disposition");
    const xml = unzipEntries(propExcel.body).get("xl/worksheets/sheet1.xml");
    assert.ok(!xml.includes("250000000"), `PGĐ-TD không được thấy kinh phí từng đề xuất trên ${propExportPath}`);
    assert.ok(!xml.includes("400000000"), `PGĐ-TD không được thấy kinh phí từng đề xuất trên ${propExportPath}`);
    assert.ok(!xml.includes("80000000"), `PGĐ-TD không được thấy kinh phí nháp từng đề xuất trên ${propExportPath}`);
  }
});

test("5. Acceptance Dossier Products: respects acceptance-dossier.read (including established council member) and drill-down filters", async () => {
  const headProducts = await apiGet("/dashboard/products", "nmphuong");
  assert.equal(headProducts.status, 200);
  assert.equal(headProducts.body.totals.count, 3);

  // Thành viên hội đồng nghiệm thu bên ngoài đã nhận lời sau khi thành lập hội đồng đọc được sản phẩm của proj2 (2 sản phẩm)
  const councilProducts = await apiGet("/dashboard/products", "councilExt");
  assert.equal(councilProducts.status, 200);
  assert.equal(councilProducts.body.totals.count, 2);

  // Người ngoài không có quan hệ -> 0 sản phẩm
  const outsiderProducts = await apiGet("/dashboard/products", "outsider");
  assert.equal(outsiderProducts.status, 200);
  assert.equal(outsiderProducts.body.totals.count, 0);

  const drillPub = await apiGet("/dashboard/drill-down?metric=products&type=publication&productStatus=accepted", "nmphuong");
  assert.equal(drillPub.status, 200);
  assert.equal(drillPub.body.total, 1);
  assert.equal(drillPub.body.items[0].name, "Bài báo Quốc tế B");
});

test("6. Trends on Fresh DB & Range Validation: always ends with live=true today (UTC+7); rejects from > to and > 3 years", async () => {
  const snapshotCount = await db.projectHealthSnapshot.count();
  assert.equal(snapshotCount, 0, "DB mới chưa có snapshot");

  const trends = await apiGet("/dashboard/trends", "nmphuong");
  assert.equal(trends.status, 200);
  assert.equal(trends.body.points.length, 1);
  assert.equal(trends.body.points[0].live, true);
  assert.equal(trends.body.points[0].date, trends.body.today);
  assert.equal(trends.body.points[0].total, 2);

  const inverted = await apiGet("/dashboard/trends?from=2026-10-10&to=2026-05-01", "nmphuong");
  assert.equal(inverted.status, 400);
  assert.equal(inverted.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(inverted.body.field, "from");

  const tooLong = await apiGet("/dashboard/trends?from=2022-01-01&to=2026-01-02", "nmphuong");
  assert.equal(tooLong.status, 400);
  assert.equal(tooLong.body.code, "DASHBOARD_QUERY_INVALID");
  assert.equal(tooLong.body.field, "to");
});

test("7. Weekly Health Snapshots: Sunday 23:55 / >=7d schedule, skipDuplicates idempotency, accepted project overdue=0, append-only trigger & graceful failure", async () => {
  const snapshotService = new ProjectHealthSnapshotService(db);

  // HEALTH_SNAPSHOTS_ENABLED=false -> không chụp
  process.env.HEALTH_SNAPSHOTS_ENABLED = "false";
  const disabledRes = await snapshotService.captureSnapshots(new Date("2026-11-08T16:56:00.000Z"));
  assert.equal(disabledRes.disabled, true);
  assert.equal(disabledRes.inserted, 0);

  process.env.HEALTH_SNAPSHOTS_ENABLED = "true";
  // Thứ tư khi chưa có snapshot -> chưa tới Chủ nhật 23:55 nên shouldCapture = false
  assert.equal(await snapshotService.shouldCapture(new Date("2026-11-04T10:00:00.000Z")), false);
  // Chủ nhật 23:56 giờ VN (2026-11-08 16:56 UTC) -> shouldCapture = true
  const sundayVn = new Date("2026-11-08T16:56:00.000Z");
  assert.equal(await snapshotService.shouldCapture(sundayVn), true);

  const firstRun = await snapshotService.runScheduledCheck(sundayVn);
  assert.equal(firstRun.inserted, 2);

  // Ngay phút kế tiếp trong khung Chủ nhật 23:55-23:59 khi đã có snapshot hôm nay -> shouldCapture = false
  assert.equal(await snapshotService.shouldCapture(new Date("2026-11-08T16:58:00.000Z")), false);

  // Gọi lặp cùng ngày -> skipDuplicates chỉ chèn 0 dòng, không ném lỗi trigger UPDATE
  const repeatSameDay = await snapshotService.captureSnapshots(sundayVn);
  assert.equal(repeatSameDay.inserted, 0);

  // Cách 3 ngày (< 7 ngày, không phải Chủ nhật) -> shouldCapture = false
  assert.equal(await snapshotService.shouldCapture(new Date("2026-11-11T10:00:00.000Z")), false);
  // Cách >= 7 ngày (Thứ hai tuần sau, giả sử lỡ lịch Chủ nhật) -> shouldCapture = true
  assert.equal(await snapshotService.shouldCapture(new Date("2026-11-16T02:00:00.000Z")), true);

  // Kiểm tra đề tài đã nghiệm thu (proj2) có maxDaysOverdue = 0, lateReports = 0, health = completed
  const proj2Snap = await db.projectHealthSnapshot.findFirstOrThrow({
    where: { projectId: fixture.proj2.id }
  });
  assert.equal(proj2Snap.maxDaysOverdue, 0);
  assert.equal(proj2Snap.lateReports, 0);
  assert.equal(proj2Snap.health, "completed");

  const proj1Snap = await db.projectHealthSnapshot.findFirstOrThrow({
    where: { projectId: fixture.proj1.id }
  });
  assert.equal(proj1Snap.health, "delayed");
  assert.ok(proj1Snap.maxDaysOverdue > 0);

  // Trigger chặn UPDATE và DELETE trên project_health_snapshots
  await assert.rejects(
    () =>
      db.projectHealthSnapshot.update({
        where: { id: proj1Snap.id },
        data: { health: "on_track" }
      }),
    /append-only/
  );
  await assert.rejects(
    () => db.projectHealthSnapshot.delete({ where: { id: proj1Snap.id } }),
    /append-only/
  );

  // Kiểm tra vòng đời DI service qua app.get(ProjectHealthSnapshotService)
  const diSnapshotService = app.get(ProjectHealthSnapshotService);
  diSnapshotService.onModuleInit();
  assert.notEqual(diSnapshotService.timer, null);
  diSnapshotService.onModuleDestroy();
  assert.equal(diSnapshotService.timer, null);

  // Khi đã có snapshot lịch sử 2026-11-08, GET /trends trả điểm lịch sử live=false + điểm hôm nay live=true
  const trendsWithHistory = await apiGet("/dashboard/trends?from=2026-11-01", "nmphuong");
  assert.equal(trendsWithHistory.status, 200);
  assert.equal(trendsWithHistory.body.points.some((p) => p.date === "2026-11-08" && p.live === false), true);
  assert.equal(trendsWithHistory.body.points.at(-1).live, true);

  // Lỗi DB bên trong snapshot service được log lại và không làm sập API
  const brokenService = new ProjectHealthSnapshotService({
    approvedProject: {
      findMany: async () => {
        throw new Error("simulated-db-outage");
      }
    }
  });
  brokenService.logger.error = () => undefined;
  const failedRun = await brokenService.captureSnapshots(sundayVn);
  assert.equal(failedRun.inserted, 0);
  assert.match(failedRun.error, /simulated-db-outage/);
});

test("8. Excel (.xlsx) Export: OOXML structure, formula injection guard (=, +, -, @) and AuditLog recording", async () => {
  const beforeAudits = await db.auditLog.count({
    where: { targetEntity: "dashboard-export" }
  });

  const propExport = await apiGet("/dashboard/export-proposals?year=2026", "nmphuong");
  assert.equal(propExport.status, 200);
  assert.match(propExport.headers.get("content-type") ?? "", /spreadsheetml\.sheet/);

  const propZip = unzipEntries(propExport.body);
  const propStyles = propZip.get("xl/styles.xml");
  const propSheet = propZip.get("xl/worksheets/sheet1.xml");
  assert.match(propStyles, /formatCode="#,##0"/);
  assert.match(propSheet, /state="frozen"/);
  assert.match(propSheet, /<autoFilter ref="A1:/);
  assert.match(propSheet, /&apos;=SUM\(1,2\) Đề tài Quân y A/);
  assert.match(propSheet, /&apos;-Đề tài Dân sự B/);

  const projExport = await apiGet("/dashboard/drill-down/export?metric=projects&year=2026", "nmphuong");
  assert.equal(projExport.status, 200);
  const projSheet = unzipEntries(projExport.body).get("xl/worksheets/sheet1.xml");
  assert.match(projSheet, /&apos;\+Đề tài thực hiện Quân y A/);
  assert.match(projSheet, /<v>250000000<\/v>/);

  const prodExport = await apiGet("/dashboard/drill-down/export?metric=products", "nmphuong");
  assert.equal(prodExport.status, 200);
  const prodSheet = unzipEntries(prodExport.body).get("xl/worksheets/sheet1.xml");
  assert.match(prodSheet, /&apos;@Bài báo Quân y 1/);

  const afterAudits = await db.auditLog.count({
    where: { targetEntity: "dashboard-export" }
  });
  assert.equal(afterAudits - beforeAudits, 3);
});

test("9. Dashboard UI Integration: 2-tab layout, ChartCard chart/table toggle, >=12px fonts, and omits unsupported conferences", async () => {
  const [pageSrc, analyticsSrc, drillSrc, vizSrc, heatmapSrc, cssSrc] = await Promise.all([
    readFile(new URL("../apps/web/src/app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/src/components/dashboard/dashboard-analytics.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/src/components/dashboard/drill-down-panel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/src/components/dashboard/viz.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/src/components/dashboard/unit-health-heatmap.tsx", import.meta.url), "utf8"),
    readFile(new URL("../apps/web/src/app/globals.css", import.meta.url), "utf8")
  ]);

  assert.match(pageSrc, /AdminDashboardPanel/);
  assert.match(pageSrc, /StudentResearchPanel/);
  assert.match(pageSrc, /ManagementDashboardPanel/);
  assert.match(pageSrc, /WorkspaceHome/);
  assert.match(pageSrc, /DashboardAnalytics/);
  assert.match(pageSrc, /Thống kê &amp; Phân tích|Thống kê & Phân tích/);
  assert.match(pageSrc, /Việc cần xử lý/);
  assert.match(drillSrc, /ProjectGantt/);
  assert.doesNotMatch(`${pageSrc}\n${analyticsSrc}\n${drillSrc}\n${vizSrc}`, /Hội nghị khoa học/i);
  assert.doesNotMatch(heatmapSrc, /unitCode/);

  assert.match(vizSrc, /className="view-toggle"/);
  assert.match(vizSrc, />\s*Biểu đồ\s*<\/button>/);
  assert.match(vizSrc, />\s*Bảng\s*<\/button>/);
  assert.match(vizSrc, /aria-pressed=\{view === "chart"\}/);
  assert.match(vizSrc, /tabIndex=\{0\}[^>]*role="region"/);

  const cardSections = analyticsSrc.split(/<ChartCard\b/).slice(1);
  assert.ok(cardSections.length >= 10, "DashboardAnalytics phải có đầy đủ thẻ biểu đồ");
  for (const section of cardSections) {
    assert.match(section.split("</ChartCard>")[0] ?? "", /\btable=/, "Mỗi ChartCard phải có chế độ Bảng tương đương");
  }

  const dashCssStart = cssSrc.indexOf("/* ---------- Dashboard Thống kê Phân tích");
  assert.notEqual(dashCssStart, -1);
  const dashCss = cssSrc.slice(dashCssStart);
  assert.doesNotMatch(dashCss, /font-size:\s*(?:[0-9]|1[01])(?:\.[0-9]+)?px/);
  assert.match(dashCss, /\.viz-root small\s*\{[^}]*font-size:\s*12px/);
});

test("10. Stats KPIs, Scoped FilterOptions, Reviewer Anonymity, Drill-down Modes/Sorting/Pagination & Ambiguous Officer Skip", async () => {
  // (1) GET /dashboard/stats cho nmphuong, ndbac và councilExt
  const headStats = await apiGet("/dashboard/stats?year=2026", "nmphuong");
  assert.equal(headStats.status, 200);
  assert.equal(headStats.body.fundingRestricted, false);
  assert.equal(headStats.body.projects.total, 2);
  assert.equal(headStats.body.projects.overdue, 1);
  assert.equal(headStats.body.funding.approvedBudget, 650_000_000);
  assert.equal(headStats.body.funding.totalDisbursed, 450_000_000);
  assert.equal(headStats.body.funding.disbursementRate, 69.23);
  assert.equal(headStats.body.products.total, 3);
  assert.deepEqual(headStats.body.filterOptions.years, [2026]);
  assert.equal(headStats.body.filterOptions.units.length, 2);

  const oversightStats = await apiGet("/dashboard/stats?year=2026", "ndbac");
  assert.equal(oversightStats.status, 200);
  assert.equal(oversightStats.body.fundingRestricted, true);
  assert.equal(oversightStats.body.projects.total, 1);
  assert.equal(oversightStats.body.funding.approvedBudget, 250_000_000);

  const councilStats = await apiGet("/dashboard/stats", "councilExt");
  assert.equal(councilStats.status, 200);
  assert.equal(councilStats.body.projects.total, 0);
  assert.equal(councilStats.body.proposals.total, 0);
  assert.equal(councilStats.body.products.total, 2);
  assert.deepEqual(councilStats.body.filterOptions.years, [2026]);
  assert.deepEqual(
    councilStats.body.filterOptions.units.map((u) => u.id),
    [fixture.unitB.id]
  );

  // (3) Phản biện đề xuất: ẩn tên chủ nhiệm (piName === "—") và che kinh phí trên drill-down + export-proposals
  const revDrill = await apiGet("/dashboard/drill-down?metric=proposals", "reviewer");
  assert.equal(revDrill.status, 200);
  assert.equal(revDrill.body.total, 1);
  assert.equal(revDrill.body.items[0].piName, "—");
  assert.equal(revDrill.body.items[0].totalBudget, null);
  assert.ok(!JSON.stringify(revDrill.body).includes(fixture.users.piA.displayName));

  const revExcel = await apiGet("/dashboard/export-proposals", "reviewer");
  assert.equal(revExcel.status, 200);
  const revSheet = unzipEntries(revExcel.body).get("xl/worksheets/sheet1.xml");
  assert.ok(revSheet.includes(">—<"));
  assert.ok(!revSheet.includes(fixture.users.piA.displayName));
  assert.ok(!revSheet.includes("250000000"));
  assert.ok(!revSheet.includes("300000000"));

  // (4) drill-down metric=overdue_projects, metric=funding sort (authorized vs restricted), và phân trang page=2&pageSize=1
  const overdueDrill = await apiGet("/dashboard/drill-down?metric=overdue_projects", "nmphuong");
  assert.equal(overdueDrill.status, 200);
  assert.equal(overdueDrill.body.total, 1);
  assert.equal(overdueDrill.body.items[0].id, fixture.proj1.id);

  const authFundingDrill = await apiGet("/dashboard/drill-down?metric=funding", "nmphuong");
  assert.equal(authFundingDrill.status, 200);
  assert.deepEqual(
    authFundingDrill.body.items.map((r) => r.id),
    [fixture.proj2.id, fixture.proj1.id],
    "Người có quyền xem kinh phí được sắp giảm dần theo approvedBudget (400M trước 250M)"
  );

  const restrictedFundingDrill = await apiGet("/dashboard/drill-down?metric=funding", "ndbacWide");
  assert.equal(restrictedFundingDrill.status, 200);
  assert.deepEqual(
    restrictedFundingDrill.body.items.map((r) => r.id),
    [fixture.proj1.id, fixture.proj2.id],
    "PGĐ-TD không được sắp theo approvedBudget ẩn (giữ thứ tự createdAt desc)"
  );

  const page2 = await apiGet("/dashboard/drill-down?metric=projects&page=2&pageSize=1", "nmphuong");
  assert.equal(page2.status, 200);
  assert.equal(page2.body.total, 2);
  assert.equal(page2.body.page, 2);
  assert.equal(page2.body.pageSize, 1);
  assert.equal(page2.body.items.length, 1);
  assert.equal(page2.body.items[0].id, fixture.proj2.id);

  // (6) skipUnresolved: đề tài có ngữ cảnh CV phụ trách mơ hồ (CONTEXT_AMBIGUOUS) bị 409 trên /projects nhưng bị loại an toàn (200) trên /dashboard/*
  const approvedProjectsSvc = app.get(ApprovedProjectsService);
  const originalCurrentOfficer = approvedProjectsSvc.currentOfficer.bind(approvedProjectsSvc);
  approvedProjectsSvc.currentOfficer = async (tx, projectId, asOf) => {
    if (projectId === fixture.proj1.id) {
      throw new ConflictException({ code: "CONTEXT_AMBIGUOUS", message: "Phân công chuyên viên của đề tài không rõ ràng." });
    }
    return originalCurrentOfficer(tx, projectId, asOf);
  };
  try {
    const rawProjectsRes = await apiGet("/projects", "nmphuong");
    assert.equal(rawProjectsRes.status, 409);

    const safeDashDist = await apiGet("/dashboard/distribution?subject=projects", "nmphuong");
    assert.equal(safeDashDist.status, 200);
    assert.equal(safeDashDist.body.totals.count, 1);
  } finally {
    approvedProjectsSvc.currentOfficer = originalCurrentOfficer;
  }
});

test("11. Unit Progress Rules & Executable Web Helpers / React SSR Render", async () => {
  const refNow = new Date("2026-06-15T06:00:00.000Z");

  // (5) computeProjectProgress: on_track, at_risk, pending_acceptance, failed, lateReports và trần spi = 2
  const onTrack = computeProjectProgress(
    {
      status: "executing",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      milestones: [
        { id: "m1", dueDate: "2026-05-01T00:00:00.000Z", status: "completed" },
        { id: "m2", dueDate: "2026-10-01T00:00:00.000Z", status: "open" }
      ]
    },
    refNow
  );
  assert.equal(onTrack.health, "on_track");
  assert.equal(onTrack.maxDaysOverdue, 0);

  const atRisk = computeProjectProgress(
    {
      status: "executing",
      startDate: "2026-06-01T00:00:00.000Z",
      endDate: "2026-12-31T00:00:00.000Z",
      milestones: [{ id: "m1", dueDate: "2026-06-20T00:00:00.000Z", status: "open" }]
    },
    refNow
  );
  assert.equal(atRisk.health, "at_risk");

  const pendingAcc = computeProjectProgress(
    {
      status: "pending_acceptance",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-05-01T00:00:00.000Z",
      milestones: [
        { id: "m1", dueDate: "2026-03-01T00:00:00.000Z", status: "open" }
      ],
      checkpoints: [{ id: "c1", dueDate: "2026-03-01T00:00:00.000Z", status: "open" }]
    },
    refNow
  );
  assert.equal(pendingAcc.maxDaysOverdue, 0);
  assert.equal(pendingAcc.overdueMilestones, 0);
  assert.equal(pendingAcc.lateReports, 0);
  assert.equal(pendingAcc.health, "on_track");

  const failedProj = computeProjectProgress(
    {
      status: "failed",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-05-01T00:00:00.000Z",
      milestones: [{ id: "m1", dueDate: "2026-03-01T00:00:00.000Z", status: "open" }]
    },
    refNow
  );
  assert.equal(failedProj.maxDaysOverdue, 0);
  assert.equal(failedProj.lateReports, 0);
  assert.equal(failedProj.health, "delayed");

  const lateReportsProj = computeProjectProgress(
    {
      status: "executing",
      startDate: "2026-06-14T00:00:00.000Z",
      endDate: "2027-06-14T00:00:00.000Z",
      milestones: [{ id: "m1", dueDate: "2026-12-01T00:00:00.000Z", status: "completed" }],
      checkpoints: [{ id: "cp1", dueDate: "2026-06-10T00:00:00.000Z", status: "open" }],
      reports: [{ id: "rp1", status: "supplement_requested", responseDeadline: "2026-06-12T00:00:00.000Z" }]
    },
    refNow
  );
  assert.equal(lateReportsProj.spi, 2, "SPI đơn lẻ bị chặn trần ở 2");
  assert.equal(lateReportsProj.lateReports, 2);
  assert.equal(lateReportsProj.health, "delayed");

  // (8) Nạp thực thi dashboard-api.ts + render DashboardPage & DrillDownPanel qua ts.transpileModule
  const loadWebModule = async (path, deps = {}) => {
    const exports = {};
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    const transpiled = ts.transpileModule(source, {
      fileName: path,
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
    }).outputText;
    vm.runInNewContext(transpiled, {
      exports,
      URLSearchParams,
      URL,
      Intl,
      Date,
      Math,
      Number,
      String,
      Object,
      Array,
      Set,
      Map,
      Promise,
      setTimeout,
      fetch: async () => ({ ok: true, json: async () => ({}) }),
      require: (name) => {
        if (name in deps) return deps[name];
        if (name === "react") return react;
        if (name === "react/jsx-runtime") return jsxRuntime;
        if (name === "lucide-react") return new Proxy({}, { get: () => () => null });
        if (name === "next/link") {
          return {
            __esModule: true,
            default: ({ href, children, ...rest }) => jsxRuntime.jsx("a", { href, ...rest, children })
          };
        }
        throw new Error(`Unexpected import in web test: ${name}`);
      }
    });
    return exports;
  };

  const dashboardApi = await loadWebModule("apps/web/src/lib/dashboard-api.ts", {
    "@/lib/session": { getApiBaseUrl: () => baseUrl }
  });

  assert.equal(dashboardApi.formatMoneyVnd(null), "—");
  assert.equal(dashboardApi.formatShortDate("2026-11-18T18:30:00.000Z"), "19/11/2026");
  const parsedFilters = dashboardApi.readDashboardFilters(
    new URLSearchParams("year=2026&unitId=org-dash-a&unknown=ignored&scope=  military  ")
  );
  assert.deepEqual({ ...parsedFilters }, { year: "2026", unitId: "org-dash-a", scope: "military" });
  const builtParams = dashboardApi.buildDashboardSearchParams(parsedFilters, { subject: "projects", page: undefined });
  assert.equal(builtParams.toString(), "year=2026&unitId=org-dash-a&scope=military&subject=projects");

  let mockRole = "RESEARCH_MANAGEMENT_HEAD";
  const dashboardPageMod = await loadWebModule("apps/web/src/app/dashboard/page.tsx", {
    "@/components/auth/session-provider": {
      useSession: () => ({ account: { systemRole: mockRole, systemRoleLabel: mockRole } })
    },
    "@/components/admin/admin-dashboard-panel": {
      AdminDashboardPanel: () => jsxRuntime.jsx("div", { children: "ADMIN_PANEL" })
    },
    "@/components/student-research/student-research-panel": {
      StudentResearchPanel: () => jsxRuntime.jsx("div", { children: "STUDENT_PANEL" })
    },
    "@/components/research-proposals/management-dashboard-panel": {
      ManagementDashboardPanel: ({ variant }) => jsxRuntime.jsx("div", { children: `MGMT_${variant ?? "staff"}` })
    },
    "@/components/layout/workspace-home": {
      WorkspaceHome: () => jsxRuntime.jsx("div", { children: "WORKSPACE_HOME" })
    },
    "@/components/dashboard/dashboard-analytics": {
      DashboardAnalytics: () => jsxRuntime.jsx("div", { children: "ANALYTICS_VIEW" })
    }
  });

  const headHtml = renderToStaticMarkup(jsxRuntime.jsx(dashboardPageMod.default, {}));
  assert.match(headHtml, /role="tablist"/);
  assert.match(headHtml, /id="dash-tab-analytics"/);
  assert.match(headHtml, /aria-controls="dash-panel-analytics"/);
  assert.match(headHtml, /role="tabpanel"/);
  assert.match(headHtml, /ANALYTICS_VIEW/);

  mockRole = "SYSTEM_ADMIN";
  assert.equal(renderToStaticMarkup(jsxRuntime.jsx(dashboardPageMod.default, {})), "<div>ADMIN_PANEL</div>");
  mockRole = "STUDENT_USER";
  assert.equal(renderToStaticMarkup(jsxRuntime.jsx(dashboardPageMod.default, {})), "<div>STUDENT_PANEL</div>");

  // Kiểm chứng DrillDownPanel chặn dữ liệu cũ khác metric (proposals -> projects không ném TypeError)
  let mockDrillState = {
    metric: "proposals",
    fundingRestricted: false,
    total: 1,
    page: 1,
    pageSize: 50,
    items: [{ kind: "proposal", id: "p1", title: "Đề xuất cũ", unitName: "KHTI", piName: "CN", levelLabel: "HV", fieldLabel: "YH", scopeLabel: "QS", officerName: "CV", statusLabel: "Đã nộp", submittedAt: null, totalBudget: null }]
  };
  const customReact = {
    ...react,
    useState: (initial) => {
      if (initial === null && mockDrillState) return [mockDrillState, () => undefined];
      return react.useState(initial);
    }
  };
  const drillMod = await loadWebModule("apps/web/src/components/dashboard/drill-down-panel.tsx", {
    react: customReact,
    "@/components/ui/dialog": {
      Dialog: ({ children, label }) => jsxRuntime.jsx("dialog", { "aria-label": label, children })
    },
    "@/components/dashboard/project-gantt": {
      ProjectGantt: () => jsxRuntime.jsx("div", { children: "GANTT_CHART" })
    },
    "@/lib/dashboard-api": dashboardApi
  });

  const mismatchedHtml = renderToStaticMarkup(
    jsxRuntime.jsx(drillMod.DrillDownPanel, {
      selection: { metric: "projects", title: "Đề tài mới" },
      onClose: () => undefined
    })
  );
  assert.match(mismatchedHtml, /Đang tải dữ liệu chi tiết/);
  assert.doesNotMatch(mismatchedHtml, /Đề xuất cũ/);

  mockDrillState = {
    metric: "projects",
    fundingRestricted: true,
    total: 1,
    page: 1,
    pageSize: 50,
    items: [
      {
        kind: "project",
        id: "proj-1",
        code: "DT-01",
        proposalId: "prop-1",
        title: "Đề tài khớp metric",
        unitId: "u1",
        unitCode: "U1",
        unitName: "Khoa A",
        piName: "TS. A",
        officerId: "cv1",
        officerName: "CV 1",
        levelLabel: "Học viện",
        fieldLabel: "Y học",
        scopeLabel: "Quân sự",
        year: 2026,
        status: "executing",
        statusLabel: "Đang thực hiện",
        health: "on_track",
        healthLabel: "Đúng tiến độ",
        plannedPercent: 40,
        actualPercent: 50,
        spi: 1.25,
        overdueMilestones: 0,
        maxDaysOverdue: 0,
        lateReports: 0,
        startDate: "2026-01-15T00:00:00.000Z",
        endDate: "2026-12-20T00:00:00.000Z",
        milestones: [],
        totalBudget: null,
        totalDisbursed: null,
        totalSettled: null
      }
    ]
  };
  const matchedHtml = renderToStaticMarkup(
    jsxRuntime.jsx(drillMod.DrillDownPanel, {
      selection: { metric: "projects", title: "Đề tài mới" },
      onClose: () => undefined
    })
  );
  assert.match(matchedHtml, /Đề tài khớp metric/);
  assert.match(matchedHtml, /SPI 1\.25/);

  // Kiểm chứng ChartCard chuyển đổi Biểu đồ / Bảng và HBarChart / BucketTable
  let mockCardView = "chart";
  const vizReact = {
    ...react,
    useState: (initial) => (initial === "chart" ? [mockCardView, () => undefined] : react.useState(initial))
  };
  const vizMod = await loadWebModule("apps/web/src/components/dashboard/viz.tsx", {
    react: vizReact,
    "@/lib/dashboard-api": dashboardApi
  });
  const chartNode = jsxRuntime.jsx(vizMod.ChartCard, {
    title: "Đề tài theo cấp quản lý",
    table: jsxRuntime.jsx(vizMod.BucketTable, {
      columns: [
        { key: "label", label: "Cấp" },
        { key: "count", label: "Số đề tài", numeric: true }
      ],
      rows: [{ key: "hv", cells: { label: "Cấp Học viện", count: "2" } }]
    }),
    children: jsxRuntime.jsx(vizMod.HBarChart, {
      rows: [{ key: "hv", label: "Cấp Học viện", values: { count: 2 } }],
      series: [{ key: "count", label: "Số lượng", color: "var(--series-1)" }]
    })
  });
  const chartViewHtml = renderToStaticMarkup(chartNode);
  assert.match(chartViewHtml, /class="view-toggle"/);
  assert.match(chartViewHtml, /aria-pressed="true"[^>]*>Biểu đồ<\/button>/);
  assert.match(chartViewHtml, /class="hbar-list"/);
  assert.doesNotMatch(chartViewHtml, /<table/);

  mockCardView = "table";
  const tableViewHtml = renderToStaticMarkup(chartNode);
  assert.match(tableViewHtml, /aria-pressed="true"[^>]*>Bảng<\/button>/);
  assert.match(tableViewHtml, /role="region"/);
  assert.match(tableViewHtml, /tabindex="0"/);
  assert.match(tableViewHtml, /<table class="data-table drill-table">/);
  assert.match(tableViewHtml, /Cấp Học viện/);
});
