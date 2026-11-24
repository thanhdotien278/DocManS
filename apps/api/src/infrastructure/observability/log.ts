/**
 * Log một dòng JSON ra stdout/stderr (Docker thu và xoay vòng theo cấu hình logging của compose).
 * Không ghi body, query string hay dữ liệu nghiệp vụ: chỉ định danh kỹ thuật để truy vết sự cố.
 */
export function logJson(level: "info" | "warn" | "error", message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  (level === "error" ? process.stderr : process.stdout).write(`${line}\n`);
}
