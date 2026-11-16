import { getApiBaseUrl } from "@/lib/session";

export type ScientificDocument = {
  id: string;
  documentNumber: string;
  title: string;
  category: string;
  issuingAuthority?: string | null;
  issuedDate?: string | null;
  effectiveDate?: string | null;
  description?: string | null;
  status: string;
  fileName: string;
  fileSize: number;
};

// Không đặt Content-Type: body là FormData, trình duyệt tự thêm boundary.
async function request<T>(path: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/scientific-documents${path}`, { ...init, credentials: "include" });
  } catch {
    throw new Error("Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.");
  }
  const body = (await response.json().catch(() => ({}))) as { message?: string | string[] };
  if (!response.ok) throw new Error((Array.isArray(body.message) ? body.message[0] : body.message) ?? fallback);
  return body as T;
}

export async function listScientificDocuments() {
  return (await request<{ documents?: ScientificDocument[] }>("", undefined, "Không thể tải danh sách văn bản và biểu mẫu.")).documents ?? [];
}

export function createScientificDocument(formData: FormData) {
  return request("", { method: "POST", body: formData }, "Không thể tải lên văn bản / biểu mẫu.");
}

export function updateScientificDocument(id: string, formData: FormData) {
  return request(`/${encodeURIComponent(id)}`, { method: "PATCH", body: formData }, "Không thể cập nhật văn bản / biểu mẫu.");
}

export function deleteScientificDocument(id: string) {
  return request(`/${encodeURIComponent(id)}`, { method: "DELETE" }, "Không thể xóa văn bản / biểu mẫu.");
}

export function getScientificDocumentDownloadUrl(id: string) {
  return `${getApiBaseUrl()}/scientific-documents/${encodeURIComponent(id)}/download`;
}
