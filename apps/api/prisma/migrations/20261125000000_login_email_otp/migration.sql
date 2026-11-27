-- Xác thực hai lớp qua thư: tài khoản tự bật (vai trò lãnh đạo, Phòng KHQS, quản trị luôn bắt buộc theo mã nguồn)
-- và lượt đăng nhập chờ mã. Mã chỉ lưu dạng băm; lượt hết hạn sau 10 phút.
ALTER TABLE "users" ADD COLUMN "login_otp_enabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "login_challenges" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "credential_version" INTEGER NOT NULL,
  "code_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "send_count" INTEGER NOT NULL DEFAULT 1,
  "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "ip" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_challenges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "login_challenges_attempts_check" CHECK ("attempts" >= 0 AND "send_count" >= 1)
);

CREATE INDEX "login_challenges_user_id_idx" ON "login_challenges"("user_id");
CREATE INDEX "login_challenges_expires_at_idx" ON "login_challenges"("expires_at");
ALTER TABLE "login_challenges" ADD CONSTRAINT "login_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
