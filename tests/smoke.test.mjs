import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function collectSourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      return collectSourceFiles(absolutePath);
    }

    return absolutePath.endsWith(".ts") || absolutePath.endsWith(".tsx") || absolutePath.endsWith(".css")
      ? [absolutePath]
      : [];
  });
}

describe("workspace smoke checks", () => {
  it("has the expected RTMS app boundaries", () => {
    assert.equal(existsSync("apps/web/src/app/dashboard/page.tsx"), true);
    assert.equal(existsSync("apps/web/src/app/login/page.tsx"), true);
    assert.equal(existsSync("apps/web/src/middleware.ts"), true);
    assert.equal(existsSync("apps/api/src/main.ts"), true);
    assert.equal(existsSync("packages/permissions/src/index.ts"), true);
    assert.equal(existsSync("packages/ui-tokens/src/index.ts"), true);
  });

  it("keeps temporary UI data isolated from production lib paths", () => {
    assert.equal(existsSync("apps/web/src/fixtures/showcase-data.ts"), true);
    assert.equal(existsSync("apps/web/src/fixtures/shell-context.ts"), true);
    assert.equal(existsSync("apps/web/src/lib/app-data.ts"), false);
    assert.equal(existsSync("apps/web/src/lib/accounts.ts"), false);
  });

  it("keeps permissions fail closed by default", () => {
    const permissionsSource = readFileSync("packages/permissions/src/index.ts", "utf8");

    assert.equal(/demoRoleContext|visual-demo/.test(permissionsSource), false);
    assert.match(permissionsSource, /allowed:\s*false/);
    assert.match(permissionsSource, /function evaluatePermission/);
  });

  it("uses server-backed auth boundaries instead of browser storage placeholders", () => {
    const sessionSource = readFileSync("apps/web/src/lib/session.ts", "utf8");
    const middlewareSource = readFileSync("apps/web/src/middleware.ts", "utf8");
    const loginPageSource = readFileSync("apps/web/src/app/login/page.tsx", "utf8");
    const authControllerExists = existsSync("apps/api/src/auth/auth.controller.ts");
    const authGuardExists = existsSync("apps/api/src/auth/session-auth.guard.ts");
    const prismaSchemaExists = existsSync("apps/api/prisma/schema.prisma");
    const prismaServiceExists = existsSync("apps/api/src/infrastructure/prisma/prisma.service.ts");
    const authStoreSource = readFileSync("apps/api/src/auth/auth.store.ts", "utf8");
    const seedSource = readFileSync("apps/api/prisma/seed.mjs", "utf8");
    const passwordServiceSource = readFileSync("apps/api/src/auth/password.service.ts", "utf8");

    assert.equal(/localStorage|document\.cookie|resolveShellProfile|DEFAULT_SHELL/.test(sessionSource), false);
    assert.match(middlewareSource, /AUTH_SESSION_COOKIE/);
    assert.match(middlewareSource, /NextResponse\.redirect/);
    assert.equal(/accountProfiles|fixtures\/shell-context/.test(loginPageSource), false);
    assert.equal(authControllerExists, true);
    assert.equal(authGuardExists, true);
    assert.equal(prismaSchemaExists, true);
    assert.equal(prismaServiceExists, true);
    assert.match(authStoreSource, /PrismaService/);
    assert.equal(/Admin@12345|Leadership@12345|Staff@12345|Pi@12345|Reviewer@12345/.test(authStoreSource), false);
    assert.equal(/Admin@12345|Leadership@12345|Staff@12345|Pi@12345|Reviewer@12345/.test(seedSource), false);
    assert.match(passwordServiceSource, /scrypt/);
  });

  it("keeps the external researcher role safe across the browser session boundary", () => {
    const sessionSource = readFileSync("apps/web/src/lib/session.ts", "utf8");
    const authApiSource = readFileSync("apps/web/src/lib/auth-api.ts", "utf8");
    const shellSource = readFileSync("apps/web/src/fixtures/shell-context.ts", "utf8");

    assert.match(sessionSource, /SystemRole/);
    assert.match(sessionSource, /Nhà nghiên cứu bên ngoài/);
    assert.match(authApiSource, /SYSTEM_ROLES\.includes/);
    assert.match(shellSource, /EXTERNAL_RESEARCHER_USER:\s*\[\]/);
  });

  it("keeps database scope focused on auth, access, catalogs, config, audit, and the EP-02/EP-03 proposal models", () => {
    const schemaSource = readFileSync("apps/api/prisma/schema.prisma", "utf8");
    const models = [...schemaSource.matchAll(/^model\s+(\w+)/gm)].map((match) => match[1]);

    assert.deepEqual(models, [
      "User",
      "SystemRoleMigrationIssue",
      "OrganizationUnit",
      "UserOrganizationScope",
      "Session",
      "PasswordResetToken",
      "AuditLog",
      "CatalogItem",
      "ResearcherProfile",
      "ResearcherProfileField",
      "ResearcherProfileExpertiseKeyword",
      "SystemParameter",
      "NotificationTemplate",
      "ProposalIntakePeriod",
      "ResearchProposal",
      "ProposalDelegation",
      "ProposalMember",
      "ProposalAttachment",
      "FileRecord",
      "ProposalSubmissionEvent",
      "ProposalSupplementRequest",
      "ProposalReviewAssignment",
      "ProposalReview",
      "ProposalEvaluationSummary",
      "ProposalDecision"
    ]);
    assert.match(schemaSource, /@@map\("users"\)/);
    assert.match(schemaSource, /@@map\("system_role_migration_issues"\)/);
    assert.match(schemaSource, /systemRole\s+String\?/);
    assert.match(schemaSource, /@@map\("organization_units"\)/);
    assert.match(schemaSource, /@@map\("user_organization_scopes"\)/);
    assert.match(schemaSource, /@@map\("sessions"\)/);
    assert.match(schemaSource, /@@map\("audit_logs"\)/);
    assert.match(schemaSource, /@@map\("catalog_items"\)/);
    assert.match(schemaSource, /@@map\("researcher_profiles"\)/);
    assert.match(schemaSource, /@@map\("researcher_profile_fields"\)/);
    assert.match(schemaSource, /@@map\("researcher_profile_expertise_keywords"\)/);
    assert.match(schemaSource, /@@map\("system_parameters"\)/);
    assert.match(schemaSource, /@@map\("notification_templates"\)/);
    assert.match(schemaSource, /@@map\("proposal_intake_periods"\)/);
    assert.match(schemaSource, /@@map\("research_proposals"\)/);
    assert.match(schemaSource, /@@map\("proposal_members"\)/);
    assert.match(schemaSource, /@@map\("proposal_attachments"\)/);
    assert.match(schemaSource, /@@map\("proposal_submission_events"\)/);
    assert.match(schemaSource, /@@map\("proposal_supplement_requests"\)/);
    assert.match(schemaSource, /@@map\("proposal_review_assignments"\)/);
    assert.match(schemaSource, /@@map\("proposal_reviews"\)/);
    assert.match(schemaSource, /@@map\("proposal_evaluation_summaries"\)/);
    assert.match(schemaSource, /@@map\("proposal_decisions"\)/);
  });

  it("defines a local database setup path for Epic 1", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const composeSource = readFileSync("docker-compose.yml", "utf8");

    assert.match(packageJson.scripts["prisma:deploy"], /prisma migrate deploy --schema apps\/api\/prisma\/schema\.prisma/);
    assert.match(packageJson.scripts["db:setup"], /prisma:generate/);
    assert.match(packageJson.scripts["db:setup"], /prisma:deploy/);
    assert.match(packageJson.scripts["db:setup"], /prisma:seed/);
    assert.match(composeSource, /npm run db:setup/);
    assert.match(composeSource, /DATABASE_URL: postgresql:\/\/docmansystem:docmansystem@postgres:5432\/docmansystem\?schema=public/);
  });

  it("keeps prohibited presentation labels out of frontend source", () => {
    const prohibitedPattern = /\b(demo|mock|mô phỏng|giả lập|test data)\b/i;
    const sourceFiles = collectSourceFiles("apps/web/src");

    for (const filePath of sourceFiles) {
      const contents = readFileSync(filePath, "utf8");
      assert.equal(
        prohibitedPattern.test(contents),
        false,
        `Prohibited presentation label found in ${filePath}`
      );
    }
  });
});
