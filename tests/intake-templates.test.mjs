import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProposalIntakePeriodsService } from '../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js';
import { AuditLogService } from '../dist/apps/api/auth/audit-log.service.js';
import { createProposalIntakePeriodPipe } from '../dist/apps/api/proposal-intake-periods/proposal-intake-periods.dto.js';

test('intake template upload, download, authorization, validation and failed-save cleanup', async () => {
  const actor = { id: 'staff', status: 'active', systemRole: 'RESEARCH_MANAGEMENT_STAFF', organizationScopes: [] };
  const records = [];
  const periods = [];
  const objects = new Map();
  const db = {
    $transaction: async work => work(db), $queryRaw: async () => [],
    user: { findUnique: async () => actor },
    organizationUnit: { count: async () => 0 },
    auditLog: { create: async ({ data }) => ({ ...data, timestamp: new Date() }) },
    fileRecord: {
      create: async ({ data }) => { records.push({ ...data, deletedAt: null }); return data; },
      findFirst: async ({ where }) => records.find(row => Object.entries(where).every(([key, value]) => row[key] === value))
    },
    proposalIntakePeriod: {
      create: async ({ data }) => { const row = { ...data, createdAt: new Date(), updatedAt: new Date() }; periods.push(row); return row; },
      findMany: async () => periods
    }
  };
  const storage = { putObject: async data => objects.set(data.objectKey, data.content), getObject: async key => objects.get(key), deleteObject: async key => objects.delete(key) };
  const service = new ProposalIntakePeriodsService(db, new AuditLogService(db), storage);
  const content = Buffer.alloc(11 * 1024 * 1024, 'x');
  const file = { originalname: 'Mẫu.pdf', mimetype: 'application/pdf', size: content.length, buffer: content };
  const input = { code: 'TEST', title: 'Test', startsAt: '2020-01-01', endsAt: '2099-01-01', requiredPackage: [{ code: 'template', label: 'Mẫu.pdf', description: 'Miêu tả', uploadIndex: 0, maxSizeMb: null }] };
  const parsed = createProposalIntakePeriodPipe.transform({ data: JSON.stringify(input) });
  const period = await service.createPeriod(actor, parsed, [file]);
  const template = period.requiredPackage[0];
  assert.equal(template.maxSizeMb, null);
  assert.equal(template.description, 'Miêu tả');
  assert.ok(template.templateFileId);
  assert.equal((await service.downloadTemplate(actor, period.id, template.templateFileId)).content, content);
  await assert.rejects(service.downloadTemplate({ ...actor, systemRole: 'SYSTEM_ADMIN' }, period.id, template.templateFileId), e => e.status === 403);
  await assert.rejects(service.downloadTemplate(actor, 'other-period', template.templateFileId), e => e.status === 404);
  await assert.rejects(service.createPeriod(actor, { ...input, requiredPackage: [template] }), e => e.status === 400);
  await assert.rejects(service.createPeriod(actor, input, [{ ...file, originalname: 'bad.exe' }]), e => e.status === 400);
  const count = objects.size;
  db.proposalIntakePeriod.create = async () => { throw new Error('database failure'); };
  await assert.rejects(service.createPeriod(actor, input, [file]), /database failure/);
  assert.equal(objects.size, count, 'failed save removes uploaded object');
  actor.systemRole = 'RESEARCHER_INTERNAL_USER';
  await assert.rejects(service.createPeriod(actor, input, [file]), e => e.status === 403);
});

test('intake period open/close, context version, duplicate code and denied audit', async () => {
  const actor = { id: 'staff', status: 'active', systemRole: 'RESEARCH_MANAGEMENT_STAFF', organizationScopes: [] };
  const periods = [];
  const audits = [];
  let tick = 0;
  const db = {
    $transaction: async work => work(db), $queryRaw: async () => [],
    user: { findUnique: async () => actor },
    organizationUnit: { count: async () => 0 },
    auditLog: { create: async ({ data }) => { audits.push(data); return { ...data, timestamp: new Date() }; } },
    fileRecord: { create: async ({ data }) => data },
    proposalIntakePeriod: {
      create: async ({ data }) => {
        if (periods.some(p => p.code === data.code)) throw Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['code'] } });
        const row = { ...data, createdAt: new Date(), updatedAt: new Date(++tick) }; periods.push(row); return row;
      },
      findUnique: async ({ where }) => periods.find(p => p.id === where.id) ?? null,
      update: async ({ where, data }) => { const i = periods.findIndex(p => p.id === where.id); return periods[i] = { ...periods[i], ...data, updatedAt: new Date(++tick) }; },
      findMany: async () => periods
    }
  };
  const service = new ProposalIntakePeriodsService(db, new AuditLogService(db), { deleteObject: async () => undefined });
  const input = { code: 'P1', title: 'P1', startsAt: '2020-01-01', endsAt: '2099-01-01', requiredPackage: [{ code: 'doc', label: 'Tài liệu' }] };
  const created = await service.createPeriod(actor, input);
  await assert.rejects(service.createPeriod(actor, input), e => e.status === 409 && e.response.field === 'code');
  const opened = await service.openPeriod(actor, created.id, { contextVersion: created.contextVersion });
  assert.equal(opened.status, 'open');
  const openAudit = audits.find(a => a.action === 'open-proposal-intake-period' && a.result === 'success');
  const reason = JSON.parse(openAudit.reason);
  assert.equal(reason.before.status, 'draft');
  assert.equal(reason.after.status, 'open');
  assert.equal(reason.contextVersion, opened.contextVersion);
  await assert.rejects(service.closePeriod(actor, created.id, { contextVersion: created.contextVersion }), e => e.status === 409 && e.response.code === 'CONTEXT_VERSION_MISMATCH');
  assert.equal(periods[0].status, 'open');
  await assert.rejects(service.openPeriod(actor, created.id, { contextVersion: opened.contextVersion }), e => e.status === 400);
  const closed = await service.closePeriod(actor, created.id, { contextVersion: opened.contextVersion });
  assert.equal(closed.status, 'closed');
  actor.systemRole = 'RESEARCH_BOARD_HEAD';
  await assert.rejects(service.openPeriod(actor, created.id, { contextVersion: closed.contextVersion }), e => e.status === 403);
  assert.ok(audits.some(a => a.action === 'open-proposal-intake-period' && a.result === 'failure' && a.actorId === 'staff' && a.targetEntityId === created.id));
});
