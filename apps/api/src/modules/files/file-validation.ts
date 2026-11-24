import { BadRequestException } from "@nestjs/common";
import path from "node:path";

/**
 * Quy tắc kiểm tra tệp tải lên dùng chung: đuôi tệp trong danh sách cho phép,
 * MIME khớp đuôi, dung lượng trong giới hạn và chữ ký đầu tệp khớp nội dung thực.
 */

export const MIME_TYPES_BY_EXTENSION: Record<string, string[]> = {
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".pdf": ["application/pdf"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  // Ảnh chỉ dùng khi nơi gọi tự đưa vào allowedExtensions (minh chứng giấy khen); mặc định vẫn không cho phép.
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"]
};

// Chữ ký đầu tệp: MIME và đuôi tệp đều do trình duyệt khai, chỉ nội dung mới cho biết tệp thật là gì.
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const OLE_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const SIGNATURES_BY_EXTENSION: Record<string, Buffer> = {
  ".doc": OLE_SIGNATURE,
  ".docx": ZIP_SIGNATURE,
  ".pdf": Buffer.from("%PDF"),
  ".xls": OLE_SIGNATURE,
  ".xlsx": ZIP_SIGNATURE,
  ".jpg": JPEG_SIGNATURE,
  ".jpeg": JPEG_SIGNATURE,
  ".png": Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
};

export type FileModuleConfig = {
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  bucketName?: string;
};

export const FILE_MAX_UPLOAD_PARAMETER_KEY = "file_max_upload_mb";

/** Giới hạn QT đặt trong tham số hệ thống (MB); không bao giờ vượt trần triển khai `FILE_MAX_UPLOAD_BYTES`. */
export async function readMaxUploadBytes(
  prisma: { systemParameter?: { findUnique(args: { where: { key: string } }): Promise<{ value: string } | null> } },
  ceilingBytes: number
) {
  const megabytes = Number((await prisma.systemParameter?.findUnique({ where: { key: FILE_MAX_UPLOAD_PARAMETER_KEY } }))?.value);
  return Number.isInteger(megabytes) && megabytes >= 1 ? Math.min(megabytes * 1024 * 1024, ceilingBytes) : ceilingBytes;
}

export function defaultFileConfig(): FileModuleConfig {
  const allowedExtensions = (process.env.FILE_ALLOWED_EXTENSIONS ?? ".doc,.docx,.pdf,.xls,.xlsx")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const maxFileSizeBytes = Number(process.env.FILE_MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024);
  return {
    allowedExtensions,
    maxFileSizeBytes: Number.isFinite(maxFileSizeBytes) && maxFileSizeBytes > 0 ? maxFileSizeBytes : 10 * 1024 * 1024,
    bucketName: process.env.MINIO_BUCKET_NAME
  };
}

export function readUploadFileName(value: unknown) {
  if (typeof value !== "string") throw new BadRequestException({ message: "Tên tệp không hợp lệ." });
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 255) throw new BadRequestException({ message: "Tên tệp không hợp lệ." });
  return trimmed.normalize("NFC");
}

/** Quy tắc kiểm tra tệp tải lên dùng chung: đuôi tệp, MIME, dung lượng và chữ ký nội dung. */
export function assertValidUpload(
  input: { fileName: string; mimeType: string; sizeBytes: number; content: Buffer },
  config: FileModuleConfig
) {
  const extension = path.extname(input.fileName).toLowerCase();
  if (!config.allowedExtensions.includes(extension)) {
    throw new BadRequestException({ message: "Định dạng tệp không được hỗ trợ." });
  }
  const allowedMimeTypes = MIME_TYPES_BY_EXTENSION[extension];
  // Đuôi tệp được cấu hình cho phép nhưng chưa có MIME/chữ ký đối chiếu thì từ chối, không bỏ qua kiểm tra.
  if (!allowedMimeTypes?.includes(input.mimeType)) {
    throw new BadRequestException({ message: "MIME type của tệp không khớp định dạng cho phép." });
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > config.maxFileSizeBytes) {
    throw new BadRequestException({ message: "Dung lượng tệp vượt quá giới hạn cho phép." });
  }
  if (input.content.length !== input.sizeBytes) {
    throw new BadRequestException({ message: "Dung lượng tệp không khớp nội dung tải lên." });
  }
  const signature = SIGNATURES_BY_EXTENSION[extension];
  if (!signature || !input.content.subarray(0, signature.length).equals(signature)) {
    throw new BadRequestException({ message: "Nội dung tệp không khớp định dạng cho phép." });
  }
}
