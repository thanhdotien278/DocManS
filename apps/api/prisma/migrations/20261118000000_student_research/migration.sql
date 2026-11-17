-- Vai trò thứ 11: Sinh viên (tự đăng ký, tự kích hoạt). Chạy lại an toàn cho phần CHECK.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_system_role_check";
ALTER TABLE "users" ADD CONSTRAINT "users_system_role_check"
  CHECK ("system_role" IS NULL OR "system_role" IN (
    'SYSTEM_ADMIN', 'RESEARCH_MANAGEMENT_HEAD', 'RESEARCH_MANAGEMENT_DEPUTY_HEAD', 'RESEARCH_BOARD_HEAD',
    'RESEARCH_MANAGEMENT_STAFF', 'LEADERSHIP_APPROVAL_AUTHORITY', 'SCIENCE_DEPUTY_DIRECTOR',
    'RESEARCH_OVERSIGHT_AUTHORITY',
    'RESEARCHER_INTERNAL_USER', 'EXTERNAL_RESEARCHER_USER', 'STUDENT_USER'
  ));

CREATE TABLE "student_profiles" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "student_code" TEXT NOT NULL,
  "class_name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "organization_unit_id" TEXT NOT NULL,
  "previous_semester_score" DECIMAL(4,2) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "student_profiles_user_id_key" ON "student_profiles"("user_id");
CREATE UNIQUE INDEX "student_profiles_student_code_key" ON "student_profiles"("student_code");
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "student_research_periods" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "submission_deadline" TIMESTAMP(3) NOT NULL,
  "max_members" INTEGER NOT NULL,
  "responsible_officer_user_id" TEXT NOT NULL,
  "responsible_officer_assigned_by_id" TEXT NOT NULL,
  "responsible_officer_assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_research_periods_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_research_periods_max_members_check" CHECK ("max_members" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "student_research_periods_year_key" ON "student_research_periods"("year");
ALTER TABLE "student_research_periods" ADD CONSTRAINT "student_research_periods_responsible_officer_user_id_fkey" FOREIGN KEY ("responsible_officer_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "student_research_topics" (
  "id" TEXT NOT NULL,
  "period_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "advisor_name" TEXT NOT NULL,
  "advisor_unit" TEXT NOT NULL,
  "leader_user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending_approval',
  "rejection_reason" TEXT,
  "deadline_override" TIMESTAMP(3),
  "score" DECIMAL(5,2),
  "award" TEXT,
  "closed_at" TIMESTAMP(3),
  "closed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_research_topics_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "student_research_topics_period_id_idx" ON "student_research_topics"("period_id");
CREATE INDEX "student_research_topics_leader_user_id_idx" ON "student_research_topics"("leader_user_id");
ALTER TABLE "student_research_topics" ADD CONSTRAINT "student_research_topics_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "student_research_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_research_topics" ADD CONSTRAINT "student_research_topics_leader_user_id_fkey" FOREIGN KEY ("leader_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "student_research_topic_members" (
  "id" TEXT NOT NULL,
  "topic_id" TEXT NOT NULL,
  "period_id" TEXT NOT NULL,
  "user_id" TEXT,
  "invited_email" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "student_research_topic_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "student_research_topic_members_period_id_user_id_key" ON "student_research_topic_members"("period_id", "user_id");
CREATE UNIQUE INDEX "student_research_topic_members_period_id_invited_email_key" ON "student_research_topic_members"("period_id", "invited_email");
CREATE INDEX "student_research_topic_members_topic_id_idx" ON "student_research_topic_members"("topic_id");
ALTER TABLE "student_research_topic_members" ADD CONSTRAINT "student_research_topic_members_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "student_research_topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_research_topic_members" ADD CONSTRAINT "student_research_topic_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
