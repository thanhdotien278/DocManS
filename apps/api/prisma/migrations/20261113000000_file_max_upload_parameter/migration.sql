-- QT đặt dung lượng tệp tải lên tối đa (MB) trong bảng tham số hệ thống; trần vẫn là FILE_MAX_UPLOAD_BYTES.
INSERT INTO "system_parameters" ("id", "key", "value", "label", "updated_at")
VALUES (gen_random_uuid()::text, 'file_max_upload_mb', '10', 'Dung lượng tệp tải lên tối đa (MB)', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
