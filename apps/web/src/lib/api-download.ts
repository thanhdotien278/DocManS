import { getApiBaseUrl } from "@/lib/session";

/** Tải một tệp do API dựng (Excel…) kèm cookie phiên rồi lưu về máy với `fileName`. Lỗi: ném Error có thông báo của API. */
export async function downloadFromApi(path: string, fileName: string, fallbackMessage = "Không tải được tệp. Vui lòng thử lại.") {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { credentials: "include", cache: "no-store" });
  } catch {
    throw new Error("Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: unknown };
    throw new Error(typeof body.message === "string" ? body.message : fallbackMessage);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
