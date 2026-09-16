-- AlterTable
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "username_key" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_credential_email_key" ON "users"("credential_email");

-- AlterTable
ALTER TABLE "account_credential_deliveries" ADD COLUMN "expires_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "account_activation_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "credential_version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "account_activation_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_activation_tokens_token_hash_key" ON "account_activation_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "account_activation_tokens_user_id_used_at_expires_at_idx" ON "account_activation_tokens"("user_id", "used_at", "expires_at");

-- AddForeignKey
ALTER TABLE "account_activation_tokens" ADD CONSTRAINT "account_activation_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_activation_tokens" ADD CONSTRAINT "account_activation_tokens_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
