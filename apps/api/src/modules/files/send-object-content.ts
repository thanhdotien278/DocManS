import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export type ObjectContentResponse = {
  setHeader(name: string, value: string): void;
  send(content: Buffer): void;
} & Partial<NodeJS.WritableStream>;

function readableToBuffer(stream: Readable) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

/**
 * Gửi nội dung tệp lấy từ MinIO theo stream trực tiếp ra response để RAM không tăng theo kích thước tệp
 * hay số lượt tải đồng thời. Fallback sang Buffer nếu content đã là Buffer hoặc response giả lập không phải WritableStream.
 */
export async function sendObjectContent(response: ObjectContentResponse, content: Readable | Buffer, sizeBytes?: number) {
  if (Buffer.isBuffer(content) || typeof response.write !== "function") {
    const buffer = Buffer.isBuffer(content) ? content : await readableToBuffer(content);
    response.setHeader("Content-Length", String(buffer.length));
    response.send(buffer);
    return;
  }
  if (sizeBytes !== undefined) response.setHeader("Content-Length", String(sizeBytes));
  try {
    await pipeline(content, response as NodeJS.WritableStream);
  } catch {
    // Header đã gửi nên không trả lỗi JSON được: pipeline đã huỷ kết nối.
  }
}
