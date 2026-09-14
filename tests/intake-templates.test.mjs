import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProposalIntakePeriodsService } from '../dist/apps/api/proposal-intake-periods/proposal-intake-periods.service.js';
import { AuditLogService } from '../dist/apps/api/auth/audit-log.service.js';
import { createProposalIntakePeriodPipe } from '../dist/apps/api/proposal-intake-periods/proposal-intake-periods.dto.js';

test('intake template upload, download, authorization, validation and failed-save cleanup', async () => {
  const actor = { id: 'staff', status: 'active', systemRole: 'SCIENTIFIC_MANAGEMENT_STAFF', organizationScopes: [] };
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
