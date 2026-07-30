-- Keep legacy values available for migration review and audit, but remove them from the
-- application schema so they cannot be used as an authority source at runtime.
ALTER TABLE "users" RENAME COLUMN "role" TO "legacy_role";
ALTER TABLE "users" RENAME COLUMN "role_label" TO "legacy_role_label";
ALTER TABLE "users" ALTER COLUMN "legacy_role" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "legacy_role_label" DROP NOT NULL;
ALTER TABLE "roles" RENAME TO "legacy_roles";
ALTER TABLE "user_role_assignments" RENAME TO "legacy_user_role_assignments";
