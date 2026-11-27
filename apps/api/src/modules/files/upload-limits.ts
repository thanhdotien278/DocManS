const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Giới hạn trần kích thước tệp tải lên, đọc từ FILE_MAX_UPLOAD_BYTES (mặc định 10 MB). */
export function readMaxUploadCeilingBytes(value = process.env.FILE_MAX_UPLOAD_BYTES): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_MAX_UPLOAD_BYTES;
}

/**
 * Tuỳ chọn multer dùng chung cho mọi FileInterceptor/FilesInterceptor:
 * dừng ngay khi vượt ngưỡng để Nest trả 413 thay vì nạp toàn bộ tệp lớn vào RAM.
 */
export function uploadInterceptorOptions(maxBytes = readMaxUploadCeilingBytes(), maxFiles = 1) {
  return {
    limits: {
      fileSize: maxBytes,
      files: maxFiles,
      fields: 30,
      fieldSize: 64 * 1024,
      parts: 39 + maxFiles
    }
  };
}
