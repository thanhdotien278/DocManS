-- Tên hiển thị của tài khoản đã liên kết lý lịch khoa học lấy theo họ tên trong lý lịch.
UPDATE "users" AS u
SET "display_name" = r."full_name", "updated_at" = CURRENT_TIMESTAMP
FROM "researcher_profiles" AS r
WHERE r."linked_user_id" = u."id" AND u."display_name" <> r."full_name";
