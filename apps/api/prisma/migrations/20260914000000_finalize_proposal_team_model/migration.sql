-- Finalize the proposal owner/team model.
-- Proposal owner is the sole PROPOSAL_PI; proposal_members stores only topic team rows.

-- Classify both legacy role columns before changing data. Unknown values and conflicting
-- secretary/member families abort the migration instead of being silently downgraded.
CREATE TEMP TABLE "_proposal_team_role_classification" ON COMMIT DROP AS
WITH raw AS (
  SELECT
    pm."id",
    pm."proposal_id",
    pm."user_id",
    pm."status",
    p."owner_id",
    lower(trim(coalesce(pm."participation_role", ''))) AS participation_value,
    lower(trim(coalesce(pm."role", ''))) AS role_value,
    regexp_replace(upper(trim(coalesce(pm."participation_role", ''))), '[-[:space:]]+', '_', 'g') AS participation_code,
    regexp_replace(upper(trim(coalesce(pm."role", ''))), '[-[:space:]]+', '_', 'g') AS role_code
  FROM "proposal_members" pm
  JOIN "research_proposals" p ON p."id" = pm."proposal_id"
), classified AS (
  SELECT
    raw.*,
    CASE
      WHEN participation_code IN ('TOPIC_SECRETARY', 'SECRETARY', 'SCIENTIFIC_SECRETARY', 'PROPOSAL_SCIENTIFIC_SECRETARY', 'PROJECT_SCIENTIFIC_SECRETARY')
        OR participation_value LIKE '%thư ký%' OR participation_value LIKE '%thu ky%'
        OR participation_value LIKE '%scientific secretary%'
        THEN 'SECRETARY'
      WHEN participation_code IN ('PROPOSAL_CO_INVESTIGATOR', 'PROJECT_CO_INVESTIGATOR', 'CO_INVESTIGATOR')
        OR participation_value LIKE '%đồng chủ nhiệm%' OR participation_value LIKE '%dong chu nhiem%'
        OR participation_value LIKE '%co-investigator%' OR participation_value LIKE '%co investigator%'
        THEN 'MEMBER'
      WHEN participation_code IN ('PROPOSAL_PI', 'PROJECT_PI', 'TOPIC_PI', 'PI', 'PRINCIPAL_INVESTIGATOR')
        OR participation_value LIKE '%chủ nhiệm%' OR participation_value LIKE '%chu nhiem%'
        OR participation_value LIKE '%principal investigator%'
        THEN 'PI'
      WHEN participation_code IN ('TOPIC_MEMBER', 'PROPOSAL_MEMBER', 'PROJECT_MEMBER', 'TEAM_MEMBER', 'MEMBER')
        OR participation_value LIKE '%thành viên%' OR participation_value LIKE '%thanh vien%'
        OR participation_value LIKE '%member%'
        THEN 'MEMBER'
      ELSE 'UNKNOWN'
    END AS participation_family,
    CASE
      WHEN role_code IN ('TOPIC_SECRETARY', 'SECRETARY', 'SCIENTIFIC_SECRETARY', 'PROPOSAL_SCIENTIFIC_SECRETARY', 'PROJECT_SCIENTIFIC_SECRETARY')
        OR role_value LIKE '%thư ký%' OR role_value LIKE '%thu ky%'
        OR role_value LIKE '%scientific secretary%'
        THEN 'SECRETARY'
      WHEN role_code IN ('PROPOSAL_CO_INVESTIGATOR', 'PROJECT_CO_INVESTIGATOR', 'CO_INVESTIGATOR')
        OR role_value LIKE '%đồng chủ nhiệm%' OR role_value LIKE '%dong chu nhiem%'
        OR role_value LIKE '%co-investigator%' OR role_value LIKE '%co investigator%'
        THEN 'MEMBER'
      WHEN role_code IN ('PROPOSAL_PI', 'PROJECT_PI', 'TOPIC_PI', 'PI', 'PRINCIPAL_INVESTIGATOR')
        OR role_value LIKE '%chủ nhiệm%' OR role_value LIKE '%chu nhiem%'
        OR role_value LIKE '%principal investigator%'
        THEN 'PI'
      WHEN role_code IN ('TOPIC_MEMBER', 'PROPOSAL_MEMBER', 'PROJECT_MEMBER', 'TEAM_MEMBER', 'MEMBER')
        OR role_value LIKE '%thành viên%' OR role_value LIKE '%thanh vien%'
        OR role_value LIKE '%member%'
        THEN 'MEMBER'
      ELSE 'UNKNOWN'
    END AS role_family
  FROM raw
)
SELECT classified.*,
  CASE WHEN participation_family = 'SECRETARY' THEN 'TOPIC_SECRETARY' ELSE 'TOPIC_MEMBER' END AS participation_target,
  CASE WHEN role_family = 'SECRETARY' THEN 'TOPIC_SECRETARY' ELSE 'TOPIC_MEMBER' END AS role_target
FROM classified;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "_proposal_team_role_classification"
    WHERE participation_family = 'UNKNOWN' OR role_family = 'UNKNOWN'
  ) THEN
    RAISE EXCEPTION 'Cannot normalize proposal team: unknown legacy role family';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_proposal_team_role_classification"
    WHERE participation_target <> role_target
      AND NOT (user_id IS NOT DISTINCT FROM owner_id AND (participation_family = 'PI' OR role_family = 'PI'))
  ) THEN
    RAISE EXCEPTION 'Cannot normalize proposal team: conflicting legacy role fields';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "_proposal_team_role_classification"
    WHERE status = 'ACTIVE'
      AND (participation_family = 'PI' OR role_family = 'PI')
      AND user_id IS DISTINCT FROM owner_id
  ) THEN
    RAISE EXCEPTION 'Cannot normalize proposal team: active PI row is not owned by proposal owner';
  END IF;
END $$;

-- Remove owner-derived PI/team rows while retaining lifecycle history. Clamp the end instant so
-- an already-ended or future-dated row cannot remain effective after this migration.
UPDATE "proposal_members" pm
SET "status" = 'ENDED',
    "effective_until" = LEAST(COALESCE(pm."effective_until", CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
FROM "research_proposals" p
WHERE pm."proposal_id" = p."id"
  AND pm."user_id" = p."owner_id";

-- Expired ACTIVE rows are stale lifecycle records, not current team rows. End them before the
-- partial unique index is created so an expired secretary cannot block a current replacement.
UPDATE "proposal_members"
SET "status" = 'ENDED'
WHERE "status" = 'ACTIVE'
  AND "effective_until" IS NOT NULL
  AND "effective_until" <= CURRENT_TIMESTAMP;

-- A proposal with more than one currently active secretary cannot be normalized safely.
DO $$
BEGIN
  IF EXISTS (
    SELECT pm.proposal_id
    FROM "proposal_members" pm
    JOIN "_proposal_team_role_classification" c ON c.id = pm.id
    WHERE pm.status = 'ACTIVE'
      AND c.participation_target = 'TOPIC_SECRETARY'
    GROUP BY pm.proposal_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize proposal team: multiple active TOPIC_SECRETARY rows exist for a proposal';
  END IF;
END $$;

-- Normalize all retained lifecycle rows so both stored role columns use the database contract.
UPDATE "proposal_members" pm
SET "participation_role" = c.participation_target,
    "role" = c.participation_target
FROM "_proposal_team_role_classification" c
WHERE c.id = pm.id;

ALTER TABLE "proposal_members"
  ADD CONSTRAINT "proposal_members_participation_role_check"
  CHECK ("participation_role" IN ('TOPIC_SECRETARY', 'TOPIC_MEMBER'));

ALTER TABLE "proposal_members"
  ADD CONSTRAINT "proposal_members_role_check"
  CHECK ("role" IN ('TOPIC_SECRETARY', 'TOPIC_MEMBER'));

ALTER TABLE "proposal_members"
  ADD CONSTRAINT "proposal_members_role_fields_match_check"
  CHECK ("role" = "participation_role");

CREATE UNIQUE INDEX "proposal_members_one_active_secretary_idx"
  ON "proposal_members"("proposal_id")
  WHERE "status" = 'ACTIVE' AND "participation_role" = 'TOPIC_SECRETARY';

-- Proposal-submit delegation is no longer a supported capability or storage model.
DROP TABLE "proposal_delegations";
