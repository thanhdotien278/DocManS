-- CreateTable
CREATE TABLE "scientific_conferences" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "level" TEXT NOT NULL DEFAULT 'academy',
    "host_organization_unit_id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "response_deadline" TIMESTAMP(3),
    "abstract_deadline" TIMESTAMP(3) NOT NULL,
    "full_paper_deadline" TIMESTAMP(3) NOT NULL,
    "default_slot_minutes" INTEGER NOT NULL DEFAULT 15,
    "program_changed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "cancel_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scientific_conferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_officers" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "reason" TEXT,

    CONSTRAINT "conference_officers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_invitations" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "academic_title" TEXT,
    "email" TEXT,
    "is_internal" BOOLEAN NOT NULL DEFAULT false,
    "organization_unit_id" TEXT,
    "external_organization" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sent_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "decline_reason" TEXT,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_invitation_tokens" (
    "id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conference_invitation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_papers" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" TEXT,
    "authors" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'awaiting_abstract',
    "withdraw_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_paper_versions" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "abstract_text" TEXT,
    "file_id" TEXT,
    "submitted_by_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conference_paper_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_revision_requests" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "due_at" TIMESTAMP(3) NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_version_id" TEXT,

    CONSTRAINT "conference_revision_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_mailings" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT,
    "sent_by_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conference_mailings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_mailing_recipients" (
    "id" TEXT NOT NULL,
    "mailing_id" TEXT NOT NULL,
    "invitation_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conference_mailing_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_events" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "paper_id" TEXT,
    "invitation_id" TEXT,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "reason" TEXT,
    "facts" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conference_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_sessions" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room" TEXT,
    "chair_name" TEXT,
    "secretary_name" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "slot_minutes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_session_breaks" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conference_session_breaks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_session_slots" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "manually_adjusted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "conference_session_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_program_versions" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "published_by_id" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conference_program_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conference_proceedings" (
    "id" TEXT NOT NULL,
    "conference_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "file_id" TEXT NOT NULL,
    "isbn" TEXT,
    "note" TEXT,
    "uploaded_by_id" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conference_proceedings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scientific_conferences_code_key" ON "scientific_conferences"("code");

-- CreateIndex
CREATE INDEX "scientific_conferences_status_idx" ON "scientific_conferences"("status");

-- CreateIndex
CREATE INDEX "scientific_conferences_host_organization_unit_id_idx" ON "scientific_conferences"("host_organization_unit_id");

-- CreateIndex
CREATE INDEX "conference_officers_conference_id_revoked_at_idx" ON "conference_officers"("conference_id", "revoked_at");

-- CreateIndex
CREATE INDEX "conference_officers_user_id_revoked_at_idx" ON "conference_officers"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "conference_invitations_user_id_idx" ON "conference_invitations"("user_id");

-- CreateIndex
CREATE INDEX "conference_invitations_conference_id_status_idx" ON "conference_invitations"("conference_id", "status");

-- Lời mời đã huỷ không chặn việc mời lại cùng email/tài khoản.
CREATE UNIQUE INDEX "conference_invitations_conference_id_email_key" ON "conference_invitations"("conference_id", "email") WHERE "status" <> 'revoked';

-- CreateIndex
CREATE UNIQUE INDEX "conference_invitations_conference_id_user_id_key" ON "conference_invitations"("conference_id", "user_id") WHERE "status" <> 'revoked';

-- CreateIndex
CREATE UNIQUE INDEX "conference_invitation_tokens_token_hash_key" ON "conference_invitation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "conference_invitation_tokens_invitation_id_used_at_revoked__idx" ON "conference_invitation_tokens"("invitation_id", "used_at", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "conference_papers_invitation_id_key" ON "conference_papers"("invitation_id");

-- CreateIndex
CREATE INDEX "conference_papers_conference_id_status_idx" ON "conference_papers"("conference_id", "status");

-- CreateIndex
CREATE INDEX "conference_papers_owner_id_idx" ON "conference_papers"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "conference_paper_versions_paper_id_kind_version_number_key" ON "conference_paper_versions"("paper_id", "kind", "version_number");

-- CreateIndex
CREATE INDEX "conference_revision_requests_paper_id_kind_resolved_at_idx" ON "conference_revision_requests"("paper_id", "kind", "resolved_at");

-- CreateIndex
CREATE INDEX "conference_mailings_conference_id_sent_at_idx" ON "conference_mailings"("conference_id", "sent_at");

-- CreateIndex
CREATE INDEX "conference_mailing_recipients_mailing_id_idx" ON "conference_mailing_recipients"("mailing_id");

-- CreateIndex
CREATE INDEX "conference_mailing_recipients_invitation_id_idx" ON "conference_mailing_recipients"("invitation_id");

-- CreateIndex
CREATE INDEX "conference_events_conference_id_created_at_idx" ON "conference_events"("conference_id", "created_at");

-- CreateIndex
CREATE INDEX "conference_events_paper_id_idx" ON "conference_events"("paper_id");

-- CreateIndex
CREATE INDEX "conference_sessions_conference_id_starts_at_idx" ON "conference_sessions"("conference_id", "starts_at");

-- CreateIndex
CREATE INDEX "conference_session_breaks_session_id_idx" ON "conference_session_breaks"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "conference_session_slots_paper_id_key" ON "conference_session_slots"("paper_id");

-- CreateIndex
CREATE INDEX "conference_session_slots_session_id_position_idx" ON "conference_session_slots"("session_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "conference_program_versions_conference_id_version_number_key" ON "conference_program_versions"("conference_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "conference_proceedings_conference_id_version_number_key" ON "conference_proceedings"("conference_id", "version_number");

-- AddForeignKey
ALTER TABLE "scientific_conferences" ADD CONSTRAINT "scientific_conferences_host_organization_unit_id_fkey" FOREIGN KEY ("host_organization_unit_id") REFERENCES "organization_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scientific_conferences" ADD CONSTRAINT "scientific_conferences_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_officers" ADD CONSTRAINT "conference_officers_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_officers" ADD CONSTRAINT "conference_officers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_officers" ADD CONSTRAINT "conference_officers_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_invitations" ADD CONSTRAINT "conference_invitations_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_invitations" ADD CONSTRAINT "conference_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_invitations" ADD CONSTRAINT "conference_invitations_organization_unit_id_fkey" FOREIGN KEY ("organization_unit_id") REFERENCES "organization_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_invitations" ADD CONSTRAINT "conference_invitations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_invitation_tokens" ADD CONSTRAINT "conference_invitation_tokens_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "conference_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_papers" ADD CONSTRAINT "conference_papers_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_papers" ADD CONSTRAINT "conference_papers_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "conference_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_papers" ADD CONSTRAINT "conference_papers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_paper_versions" ADD CONSTRAINT "conference_paper_versions_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "conference_papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_paper_versions" ADD CONSTRAINT "conference_paper_versions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_paper_versions" ADD CONSTRAINT "conference_paper_versions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_revision_requests" ADD CONSTRAINT "conference_revision_requests_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "conference_papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_revision_requests" ADD CONSTRAINT "conference_revision_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_revision_requests" ADD CONSTRAINT "conference_revision_requests_resolved_version_id_fkey" FOREIGN KEY ("resolved_version_id") REFERENCES "conference_paper_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_mailings" ADD CONSTRAINT "conference_mailings_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_mailings" ADD CONSTRAINT "conference_mailings_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_mailing_recipients" ADD CONSTRAINT "conference_mailing_recipients_mailing_id_fkey" FOREIGN KEY ("mailing_id") REFERENCES "conference_mailings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_mailing_recipients" ADD CONSTRAINT "conference_mailing_recipients_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "conference_invitations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_events" ADD CONSTRAINT "conference_events_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_events" ADD CONSTRAINT "conference_events_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "conference_papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_events" ADD CONSTRAINT "conference_events_invitation_id_fkey" FOREIGN KEY ("invitation_id") REFERENCES "conference_invitations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_events" ADD CONSTRAINT "conference_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_sessions" ADD CONSTRAINT "conference_sessions_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_session_breaks" ADD CONSTRAINT "conference_session_breaks_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conference_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_session_slots" ADD CONSTRAINT "conference_session_slots_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conference_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_session_slots" ADD CONSTRAINT "conference_session_slots_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "conference_papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_program_versions" ADD CONSTRAINT "conference_program_versions_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_program_versions" ADD CONSTRAINT "conference_program_versions_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_proceedings" ADD CONSTRAINT "conference_proceedings_conference_id_fkey" FOREIGN KEY ("conference_id") REFERENCES "scientific_conferences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_proceedings" ADD CONSTRAINT "conference_proceedings_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conference_proceedings" ADD CONSTRAINT "conference_proceedings_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Mỗi hội nghị tối đa một chuyên viên phụ trách còn hiệu lực.
CREATE UNIQUE INDEX "conference_officers_one_active" ON "conference_officers"("conference_id") WHERE "revoked_at" IS NULL;

-- Mỗi báo cáo tối đa một yêu cầu sửa đang mở cho mỗi loại (tóm tắt / toàn văn).
CREATE UNIQUE INDEX "conference_revision_requests_one_open" ON "conference_revision_requests"("paper_id", "kind") WHERE "resolved_at" IS NULL;

ALTER TABLE "scientific_conferences" ADD CONSTRAINT "scientific_conferences_dates_check" CHECK ("ends_at" >= "starts_at");
ALTER TABLE "scientific_conferences" ADD CONSTRAINT "scientific_conferences_slot_minutes_check" CHECK ("default_slot_minutes" BETWEEN 1 AND 240);
ALTER TABLE "conference_invitations" ADD CONSTRAINT "conference_invitations_kind_check" CHECK ("kind" IN ('speaker', 'delegate'));
ALTER TABLE "conference_invitations" ADD CONSTRAINT "conference_invitations_internal_unit_check" CHECK (NOT "is_internal" OR "organization_unit_id" IS NOT NULL OR "user_id" IS NOT NULL);
ALTER TABLE "conference_paper_versions" ADD CONSTRAINT "conference_paper_versions_kind_check" CHECK ("kind" IN ('abstract', 'full_paper'));
ALTER TABLE "conference_revision_requests" ADD CONSTRAINT "conference_revision_requests_kind_check" CHECK ("kind" IN ('abstract', 'full_paper'));
ALTER TABLE "conference_sessions" ADD CONSTRAINT "conference_sessions_kind_check" CHECK ("kind" IN ('plenary', 'track'));
ALTER TABLE "conference_sessions" ADD CONSTRAINT "conference_sessions_time_check" CHECK ("ends_at" > "starts_at");
ALTER TABLE "conference_sessions" ADD CONSTRAINT "conference_sessions_slot_minutes_check" CHECK ("slot_minutes" IS NULL OR "slot_minutes" BETWEEN 1 AND 240);
ALTER TABLE "conference_session_breaks" ADD CONSTRAINT "conference_session_breaks_time_check" CHECK ("ends_at" > "starts_at");
