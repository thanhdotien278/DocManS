import { BadRequestException, type PipeTransform } from "@nestjs/common";

export const DOCUMENT_CATEGORIES = {
  LAW_REGULATION: "LAW_REGULATION",
  INTERNAL_REGULATION: "INTERNAL_REGULATION",
  DOCUMENT_TEMPLATE: "DOCUMENT_TEMPLATE",
  PROPOSAL_TEMPLATE: "PROPOSAL_TEMPLATE",
  EVALUATION_TEMPLATE: "EVALUATION_TEMPLATE",
  GUIDELINE: "GUIDELINE",
  LEGAL_DOCUMENT: "LEGAL_DOCUMENT",
  FORM_TEMPLATE: "FORM_TEMPLATE"
} as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[keyof typeof DOCUMENT_CATEGORIES];

/** Trạng thái người quản lý đặt được; "DELETED" chỉ do thao tác xoá ghi (kèm deletedAt). */
export const DOCUMENT_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export type CreateScientificDocumentDto = {
  documentNumber: string;
  title: string;
  category: string;
  issuingAuthority?: string;
  issuedDate?: string;
  effectiveDate?: string;
  description?: string;
};

export type UpdateScientificDocumentDto = {
  documentNumber?: string;
  title?: string;
  category?: string;
  issuingAuthority?: string;
  issuedDate?: string;
  effectiveDate?: string;
  description?: string;
  status?: string;
};

export type QueryScientificDocumentsDto = {
  category?: string;
  search?: string;
  status?: string;
};

export type UploadedDocumentFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const LIMITS = { documentNumber: 100, title: 500, issuingAuthority: 255, description: 5000, search: 200 };
const CREATE_FIELDS = ["documentNumber", "title", "category", "issuingAuthority", "issuedDate", "effectiveDate", "description"];

function invalid(message: string): never {
  throw new BadRequestException({ message });
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("Dữ liệu văn bản không hợp lệ.");
  return value as Record<string, unknown>;
}

function text(input: Record<string, unknown>, key: keyof typeof LIMITS, label: string, required: boolean) {
  const value = input[key];
  if (value === undefined || value === null) {
    if (required) invalid(`${label} không được để trống.`);
    return undefined;
  }
  if (typeof value !== "string") invalid(`${label} không hợp lệ.`);
  const trimmed = value.trim();
  if (required && !trimmed) invalid(`${label} không được để trống.`);
  if (trimmed.length > LIMITS[key]) invalid(`${label} tối đa ${LIMITS[key]} ký tự.`);
  return trimmed;
}

/** Ngày dạng YYYY-MM-DD (hoặc ISO). Chuỗi rỗng = xoá ngày, nên được giữ để service ghi null. */
function date(input: Record<string, unknown>, key: "issuedDate" | "effectiveDate", label: string) {
  const value = input[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") invalid(`${label} không hợp lệ.`);
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) || Number.isNaN(Date.parse(trimmed))) invalid(`${label} không phải ngày hợp lệ.`);
  return trimmed;
}

function category(input: Record<string, unknown>, required: boolean) {
  const value = input.category;
  if (value === undefined && !required) return undefined;
  if (typeof value !== "string" || !Object.values(DOCUMENT_CATEGORIES).includes(value.trim() as DocumentCategory)) {
    invalid("Phân loại văn bản không hợp lệ.");
  }
  return value.trim();
}

function documentFields(input: Record<string, unknown>, required: boolean) {
  return {
    documentNumber: text(input, "documentNumber", "Số hiệu văn bản", required),
    title: text(input, "title", "Tiêu đề văn bản", required),
    category: category(input, required),
    issuingAuthority: text(input, "issuingAuthority", "Cơ quan ban hành", false),
    issuedDate: date(input, "issuedDate", "Ngày ban hành"),
    effectiveDate: date(input, "effectiveDate", "Ngày hiệu lực"),
    description: text(input, "description", "Mô tả", false)
  };
}

export const createScientificDocumentPipe: PipeTransform<unknown, CreateScientificDocumentDto> = {
  transform(value) {
    const input = record(value);
    if (Object.keys(input).some((key) => !CREATE_FIELDS.includes(key))) invalid("Có trường không được hỗ trợ.");
    return documentFields(input, true) as CreateScientificDocumentDto;
  }
};

export const updateScientificDocumentPipe: PipeTransform<unknown, UpdateScientificDocumentDto> = {
  transform(value) {
    const input = record(value ?? {});
    if (Object.keys(input).some((key) => key !== "status" && !CREATE_FIELDS.includes(key))) invalid("Có trường không được hỗ trợ.");
    const status = input.status;
    if (status !== undefined && (typeof status !== "string" || !(DOCUMENT_STATUSES as readonly string[]).includes(status))) {
      invalid("Trạng thái văn bản không hợp lệ.");
    }
    const fields = documentFields(input, false);
    return Object.fromEntries(Object.entries({ ...fields, status }).filter(([, item]) => item !== undefined)) as UpdateScientificDocumentDto;
  }
};

export const queryScientificDocumentsPipe: PipeTransform<unknown, QueryScientificDocumentsDto> = {
  transform(value) {
    const input = record(value ?? {});
    const read = (key: "category" | "search" | "status") => {
      const item = input[key];
      if (item === undefined) return undefined;
      if (typeof item !== "string") invalid("Tham số tìm kiếm không hợp lệ.");
      return item.trim();
    };
    const search = read("search");
    if (search && search.length > LIMITS.search) invalid(`Từ khoá tối đa ${LIMITS.search} ký tự.`);
    const status = read("status");
    if (status && !(DOCUMENT_STATUSES as readonly string[]).includes(status)) invalid("Trạng thái văn bản không hợp lệ.");
    const categoryValue = read("category");
    if (categoryValue && categoryValue !== "ALL" && !Object.values(DOCUMENT_CATEGORIES).includes(categoryValue as DocumentCategory)) {
      invalid("Phân loại văn bản không hợp lệ.");
    }
    return { category: categoryValue || undefined, search: search || undefined, status: status || undefined };
  }
};
