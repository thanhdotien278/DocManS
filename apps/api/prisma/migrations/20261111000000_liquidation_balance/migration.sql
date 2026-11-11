-- Story 6.13: thanh lý phải cân đối (quyết toán + thu hồi = đã giải ngân); số liệu chốt và số biên bản khi GĐ ký.
ALTER TABLE "project_liquidations"
  ADD COLUMN "recovered_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN "approved_budget" DECIMAL(18,2),
  ADD COLUMN "total_disbursed" DECIMAL(18,2),
  ADD COLUMN "total_settled" DECIMAL(18,2),
  ADD COLUMN "liquidation_number" TEXT;
ALTER TABLE "project_liquidations" ADD CONSTRAINT "project_liquidations_recovered_amount_check" CHECK ("recovered_amount" >= 0);
CREATE UNIQUE INDEX "project_liquidations_liquidation_number_key" ON "project_liquidations"("liquidation_number");
