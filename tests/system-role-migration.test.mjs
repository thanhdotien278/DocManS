import "dotenv/config";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { UnauthorizedException } from "@nestjs/common";
import { AuthRateLimitService } from "../dist/apps/api/auth/auth-rate-limit.service.js";
import { AuthService } from "../dist/apps/api/auth/auth.service.js";
import { AuthStore } from "../dist/apps/api/auth/auth.store.js";

const MIGRATIONS = [
  "20260428000000_auth_session_audit",
  "20260529000000_audit_log_targets",
  "20260609000000_ep01_admin_foundation",
  "20260610000000_ep02_proposal_intake_submission",
  "20260616000000_st_23a_file_records",
  "20260616010000_file_record_description",
  "20260618000000_st_31_proposal_supplement_requests",
  "20260726000000_st_30_proposal_participation",
  "20260727000000_ep03_proposal_evaluation"
];

const MIGRATIONS_ROOT = new URL("../apps/api/prisma/migrations/", import.meta.url);

async function executeMigration(client, migration) {
  const sql = await readFile(new URL(`${migration}/migration.sql`, MIGRATIONS_ROOT), "utf8");
  await client.query(sql);
}

async function insertLegacyUser(client, { id, username, status = "active", role }) {
  await client.query(
    `INSERT INTO "users" ("id", "username", "username_key", "display_name", "password_hash", "status", "role", "role_label", "unit", "updated_at")
     VALUES ($1, $2, $2, $2, 'hash', $3, $4, $4, 'Học viện Quân y', CURRENT_TIMESTAMP)`,
    [id, username, status, role]
  );
}

describe("Story 1.4 system-role migration", () => {
  it("maps one legacy role, disables ambiguous users, and leaves disabled accounts fail-closed", async () => {
    assert.ok(process.env.DATABASE_URL, "DATABASE_URL is required for the clean-schema migration test");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    const schema = `story14_migration_${process.pid}_${Date.now()}`;
    await client.connect();

    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      for (const migration of MIGRATIONS) {
        await executeMigration(client, migration);
      }

      await client.query(
        `INSERT INTO "roles" ("id", "code", "label", "status", "updated_at") VALUES
          ('role-council-member', 'council-member', 'Thành viên hội đồng', 'active', CURRENT_TIMESTAMP),
          ('role-inactive-reviewer', 'legacy-inactive-role', 'Vai trò cũ', 'inactive', CURRENT_TIMESTAMP)`
      );
      await insertLegacyUser(client, { id: "legacy-pi", username: "legacy.pi", role: "principal-investigator" });
      await insertLegacyUser(client, { id: "single-assignment", username: "single.assignment", role: "reviewer" });
      await insertLegacyUser(client, { id: "multiple-roles", username: "multiple.roles", role: "reviewer" });
      await insertLegacyUser(client, { id: "unknown-role", username: "unknown.role", role: "unknown-role" });
      await insertLegacyUser(client, { id: "council-member", username: "council.member", role: "council-member" });
      await insertLegacyUser(client, { id: "inactive-assignment", username: "inactive.assignment", role: "system-admin" });
      await insertLegacyUser(client, { id: "disabled-reviewer", username: "disabled.reviewer", status: "disabled", role: "reviewer" });

      await client.query(
        `INSERT INTO "user_role_assignments" ("id", "user_id", "role_id", "is_primary") VALUES
          ('ura-single-leadership', 'single-assignment', 'role-leadership', true),
          ('ura-multiple-leadership', 'multiple-roles', 'role-leadership', true),
          ('ura-multiple-reviewer', 'multiple-roles', 'role-reviewer', false),
          ('ura-inactive-reviewer', 'inactive-assignment', 'role-inactive-reviewer', true)`
      );
      await client.query(
        `INSERT INTO "user_organization_scopes" ("id", "user_id", "organization_unit_id", "is_primary")
         VALUES ('uos-disabled-reviewer', 'disabled-reviewer', 'org-hvqy', true)`
      );

      await executeMigration(client, "20260729000000_ep01_single_system_role");
      await executeMigration(client, "20260730000000_archive_legacy_role_authority");
      for (const migration of [
        "20260730010000_password_reset_tokens",
        "20260731000000_st_18_authorization_context_versions",
        "20260731000100_st_19_proposal_relationship_lifecycle",
        "20260803000000_st_110_proposal_delegations",
        "20260823000000_st_21_researcher_profiles",
        "20260901000000_add_external_researcher_system_role"
      ]) {
        await executeMigration(client, migration);
      }
      await client.query(
        `INSERT INTO "users" ("id", "username", "username_key", "display_name", "password_hash", "status", "legacy_role", "legacy_role_label", "system_role", "unit", "updated_at")
         VALUES ('external-researcher', 'external.researcher', 'external.researcher', 'External Researcher', 'hash', 'active', NULL, NULL, 'EXTERNAL_RESEARCHER_USER', 'Đơn vị ngoài', CURRENT_TIMESTAMP)`
      );
      await client.query(
        `INSERT INTO "user_organization_scopes" ("id", "user_id", "organization_unit_id", "is_primary")
         VALUES ('uos-external-researcher', 'external-researcher', 'org-hvqy', true)`
      );
      await assert.rejects(() => client.query(
        `INSERT INTO "users" ("id", "username", "username_key", "display_name", "password_hash", "status", "legacy_role", "legacy_role_label", "system_role", "unit", "updated_at")
         VALUES ('active-null-role', 'active.null.role', 'active.null.role', 'Active Null Role', 'hash', 'active', NULL, NULL, NULL, 'Học viện Quân y', CURRENT_TIMESTAMP)`
      ));
      await assert.rejects(() => client.query(
        `INSERT INTO "users" ("id", "username", "username_key", "display_name", "password_hash", "status", "legacy_role", "legacy_role_label", "system_role", "unit", "updated_at")
         VALUES ('unknown-role-value', 'unknown.role.value', 'unknown.role.value', 'Unknown Role Value', 'hash', 'active', NULL, NULL, 'UNKNOWN_ROLE', 'Học viện Quân y', CURRENT_TIMESTAMP)`
      ));

      const { rows: users } = await client.query(
        `SELECT "id", "status", "system_role", "legacy_role" FROM "users" ORDER BY "id"`
      );
      assert.deepEqual(users, [
        { id: "council-member", status: "disabled", system_role: null, legacy_role: "council-member" },
        { id: "disabled-reviewer", status: "disabled", system_role: "RESEARCHER_INTERNAL_USER", legacy_role: "reviewer" },
        { id: "external-researcher", status: "active", system_role: "EXTERNAL_RESEARCHER_USER", legacy_role: null },
        { id: "inactive-assignment", status: "disabled", system_role: null, legacy_role: "system-admin" },
        { id: "legacy-pi", status: "active", system_role: "RESEARCHER_INTERNAL_USER", legacy_role: "principal-investigator" },
        { id: "multiple-roles", status: "disabled", system_role: null, legacy_role: "reviewer" },
        { id: "single-assignment", status: "active", system_role: "LEADERSHIP_APPROVAL_AUTHORITY", legacy_role: "reviewer" },
        { id: "unknown-role", status: "disabled", system_role: null, legacy_role: "unknown-role" }
      ]);

      const { rows: issues } = await client.query(
        `SELECT "user_id", "roles" FROM "system_role_migration_issues" ORDER BY "user_id"`
      );
      assert.deepEqual(issues, [
        { user_id: "council-member", roles: ["council-member"] },
        { user_id: "inactive-assignment", roles: [] },
        { user_id: "multiple-roles", roles: ["leadership", "reviewer"] },
        { user_id: "unknown-role", roles: ["unknown-role"] }
      ]);

      const disabledUser = users.find((user) => user.id === "disabled-reviewer");
      const authStore = new AuthStore({
        user: {
          async findUnique() {
            return {
              id: disabledUser.id,
              username: "disabled.reviewer",
              displayName: "Disabled Reviewer",
              passwordHash: "hash",
              status: disabledUser.status,
              systemRole: disabledUser.system_role,
              unit: "Học viện Quân y",
              organizationScopes: [
                {
                  isPrimary: true,
                  organizationUnit: { id: "org-hvqy", code: "HVQY", name: "Học viện Quân y", status: "active" }
                }
              ]
            };
          }
        }
      });
      const authService = new AuthService(
        { async record() {} },
        new AuthRateLimitService(),
        authStore,
        { async verifyPassword() { return true; } }
      );
      await assert.rejects(
        () => authService.login({ username: "disabled.reviewer", password: "correct-password" }, {}),
        UnauthorizedException
      );

      const externalAuthStore = new AuthStore({
        user: {
          async findUnique() {
            return {
              id: "external-researcher",
              username: "external.researcher",
              displayName: "External Researcher",
              passwordHash: "hash",
              status: "active",
              systemRole: "EXTERNAL_RESEARCHER_USER",
              unit: "Học viện Quân y",
              organizationScopes: [
                {
                  isPrimary: true,
                  organizationUnit: { id: "org-hvqy", code: "HVQY", name: "Học viện Quân y", status: "active" }
                }
              ]
            };
          }
        },
        session: {
          async create() {
            return {
              id: "session-external",
              userId: "external-researcher",
              createdAt: new Date(),
              expiresAt: new Date(Date.now() + 60_000),
              revokedAt: null
            };
          }
        }
      });
      const externalAuthService = new AuthService(
        { async record() {} },
        new AuthRateLimitService(),
        externalAuthStore,
        { async verifyPassword() { return true; } }
      );
      const externalLogin = await externalAuthService.login({ username: "external.researcher", password: "correct-password" }, {});
      assert.equal(externalLogin.user.systemRole, "EXTERNAL_RESEARCHER_USER");
      assert.deepEqual(externalLogin.user.organizationScopes, [{ id: "org-hvqy", code: "HVQY", name: "Học viện Quân y" }]);
    } finally {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    }
  });
});
