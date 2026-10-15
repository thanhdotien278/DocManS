import "dotenv/config";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { Client } from "pg";

const MIGRATIONS_ROOT = new URL("../apps/api/prisma/migrations/", import.meta.url);

// GF4 tables reference users, organization units, proposals and file records, so the whole chain is replayed
// in a throwaway schema; the public/dev schema is never touched.
test("GF4 migrations: status checks, immutable revisions/evidence and append-only history", async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for the clean-schema migration test");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const schema = `gf4_migration_${process.pid}_${Date.now()}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    const migrations = (await readdir(MIGRATIONS_ROOT, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const migration of migrations) await client.query(await readFile(new URL(`${migration}/migration.sql`, MIGRATIONS_ROOT), "utf8"));

    const unit = (await client.query(`SELECT id FROM organization_units ORDER BY code LIMIT 1`)).rows[0].id;
    await client.query(`INSERT INTO users (id, username, username_key, display_name, password_hash, status, system_role, unit, updated_at) VALUES ('u-pi', 'pi', 'pi', 'PI', 'hash', 'active', 'RESEARCHER_INTERNAL_USER', 'u', now())`);
    await client.query(`INSERT INTO proposal_intake_periods (id, code, title, starts_at, ends_at, required_package, updated_at) VALUES ('ip-1', 'IP1', 'Đợt 1', now(), now(), '{}', now())`);
    await client.query(`INSERT INTO research_proposals (id, intake_period_id, owner_id, host_organization_unit_id, title, updated_at) VALUES ('prop-1', 'ip-1', 'u-pi', $1, 'Đề xuất', now())`, [unit]);
    await client.query(`INSERT INTO proposal_submission_events (id, proposal_id, actor_id, from_status, to_status) VALUES ('sub-1', 'prop-1', 'u-pi', 'draft', 'submitted')`);
    await client.query(`INSERT INTO proposal_decisions (id, proposal_id, decision, decided_by_id, from_status, to_status) VALUES ('dec-1', 'prop-1', 'approved', 'u-pi', 'under_review', 'approved')`);
    await client.query(`INSERT INTO approved_projects (id, proposal_id, source_submission_event_id, source_decision_id, host_organization_unit_id, title, scope_snapshot, created_by_id, updated_at) VALUES ('p1', 'prop-1', 'sub-1', 'dec-1', $1, 'Đề tài', '{}', 'u-pi', now())`, [unit]);
    await client.query(`INSERT INTO file_records (id, related_entity_type, related_entity_id, file_purpose, original_file_name, mime_type, size_bytes, storage_bucket, storage_object_key, uploaded_by_id, updated_at) VALUES ('f-1', 'approved_project', 'p1', 'PROJECT_EVIDENCE', 'a.pdf', 'application/pdf', 1, 'b', 'k', 'u-pi', now())`);

    const rejects = (sql, params, pattern) => assert.rejects(client.query(sql, params), pattern);

    // Request status check accepts the terminal 'withdrawn' status.
    await client.query(`INSERT INTO project_requests (id, project_id, request_type, requester_id, current_values, proposed_values, reason, status, updated_at) VALUES ('req-1', 'p1', 'extension', 'u-pi', '{}', '{}', 'x', 'withdrawn', now())`);
    await rejects(`UPDATE project_requests SET status = 'cancelled' WHERE id = 'req-1'`, [], /project_requests_status_check/);

    // A returned revision is superseded by its correction; status may advance, content may not.
    await client.query(`INSERT INTO project_report_revisions (id, project_id, revision, progress_results, author_id, status, updated_at) VALUES ('rep-1', 'p1', 1, 'Nội dung', 'u-pi', 'draft', now())`);
    await client.query(`UPDATE project_report_revisions SET status = 'submitted', submitted_at = now() WHERE id = 'rep-1'`);
    await client.query(`INSERT INTO project_report_evidence (id, report_revision_id, file_record_id) VALUES ('ev-1', 'rep-1', 'f-1')`);
    await rejects(`UPDATE project_report_revisions SET progress_results = 'sửa' WHERE id = 'rep-1'`, [], /immutable/);
    await rejects(`DELETE FROM project_report_revisions WHERE id = 'rep-1'`, [], /immutable/);
    await client.query(`UPDATE project_report_revisions SET status = 'supplement_requested' WHERE id = 'rep-1'`);
    await client.query(`INSERT INTO project_report_revisions (id, project_id, revision, progress_results, author_id, status, supersedes_report_id, updated_at) VALUES ('rep-2', 'p1', 2, 'Bổ sung', 'u-pi', 'draft', 'rep-1', now())`);
    await client.query(`UPDATE project_report_revisions SET status = 'superseded' WHERE id = 'rep-1'`);
    await rejects(`INSERT INTO project_report_revisions (id, project_id, revision, progress_results, author_id, supersedes_report_id, updated_at) VALUES ('rep-3', 'p1', 3, 'Lần 2', 'u-pi', 'rep-1', now())`, [], /supersedes_report_id_key/);
    await rejects(`UPDATE project_report_revisions SET status = 'archived' WHERE id = 'rep-2'`, [], /project_report_revisions_status_check/);
    await client.query(`UPDATE project_report_revisions SET status = 'submitted', submitted_at = now() WHERE id = 'rep-2'`);
    await rejects(`UPDATE project_report_revisions SET supersedes_report_id = NULL WHERE id = 'rep-2'`, [], /immutable/);

    // Evidence links and their pinned files are immutable.
    await rejects(`DELETE FROM project_report_evidence WHERE id = 'ev-1'`, [], /immutable/);
    await rejects(`UPDATE file_records SET original_file_name = 'b.pdf' WHERE id = 'f-1'`, [], /immutable/);

    // History is append-only.
    await client.query(`INSERT INTO project_history (id, project_id, actor_id, action) VALUES ('h-1', 'p1', 'u-pi', 'project.created')`);
    await rejects(`UPDATE project_history SET action = 'x' WHERE id = 'h-1'`, [], /append-only/);
    await rejects(`DELETE FROM project_history WHERE id = 'h-1'`, [], /append-only/);
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
