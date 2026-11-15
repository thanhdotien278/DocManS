-- Đơn vị quản lý người dùng Trong học viện tự chọn khi đăng ký; cán bộ duyệt vẫn chốt đơn vị cuối cùng.
ALTER TABLE "users" ADD COLUMN "requested_organization_unit_id" TEXT;
