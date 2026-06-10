import { BadRequestException } from "@nestjs/common";
import type { ProposalMemberInput, RequiredPackageItem } from "./proposal-types.js";

export function readText(value: unknown, field: string, maxLength = 300) {
  if (typeof value !== "string") {
    throw new BadRequestException({ message: `${field} không hợp lệ.` });
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new BadRequestException({ message: `${field} không hợp lệ.` });
  }

  return normalized;
}

export function readOptionalText(value: unknown, field: string, maxLength = 1000) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return readText(value, field, maxLength);
}

export function readCode(value: unknown, field: string) {
  const code = readText(value, field, 80);
  if (!/^[a-z0-9][a-z0-9-_.]*$/i.test(code)) {
    throw new BadRequestException({ message: `${field} chỉ được chứa chữ, số, dấu gạch ngang, gạch dưới hoặc dấu chấm.` });
  }

  return code;
}

export function readOptionalCode(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return readCode(value, field);
}

export function readDate(value: unknown, field: string) {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new BadRequestException({ message: `${field} không hợp lệ.` });
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException({ message: `${field} không hợp lệ.` });
  }

  return date;
}

export function readOptionalDate(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return readDate(value, field);
}

export function assertDateRange(startsAt: Date, endsAt: Date) {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new BadRequestException({ message: "Ngày kết thúc phải sau ngày bắt đầu." });
  }
}

export function readRequiredPackage(value: unknown) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 12) {
    throw new BadRequestException({ message: "Danh sách tệp bắt buộc không hợp lệ." });
  }

  return value.map((item, index): RequiredPackageItem => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new BadRequestException({ message: "Danh sách tệp bắt buộc không hợp lệ." });
    }

    const record = item as Record<string, unknown>;
    const allowedMimeTypes = readAllowedMimeTypes(record.allowedMimeTypes);
    const maxSizeMb = readMaxSizeMb(record.maxSizeMb);

    return {
      code: readCode(record.code, `requiredPackage[${index}].code`),
      label: readText(record.label, `requiredPackage[${index}].label`, 160),
      allowedMimeTypes,
      maxSizeMb
    };
  });
}

export function normalizeRequiredPackage(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      code: typeof item.code === "string" ? item.code : "",
      label: typeof item.label === "string" ? item.label : "",
      allowedMimeTypes: Array.isArray(item.allowedMimeTypes)
        ? item.allowedMimeTypes.filter((mimeType): mimeType is string => typeof mimeType === "string" && Boolean(mimeType.trim()))
        : ["application/pdf"],
      maxSizeMb: typeof item.maxSizeMb === "number" && item.maxSizeMb > 0 ? item.maxSizeMb : 5
    }))
    .filter((item) => item.code && item.label);
}

export function readMembers(value: unknown): ProposalMemberInput[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (!Array.isArray(value) || value.length > 20) {
    throw new BadRequestException({ message: "Danh sách thành viên không hợp lệ." });
  }

  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new BadRequestException({ message: "Danh sách thành viên không hợp lệ." });
    }

    const record = item as Record<string, unknown>;
    return {
      name: readText(record.name, `members[${index}].name`, 160),
      role: readText(record.role, `members[${index}].role`, 120),
      organization: readText(record.organization, `members[${index}].organization`, 160)
    };
  });
}

export function readBudgetMetadata(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException({ message: "Thông tin kinh phí không hợp lệ." });
  }

  const record = value as Record<string, unknown>;
  const amount = typeof record.amount === "number" ? record.amount : Number(record.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new BadRequestException({ message: "Kinh phí không hợp lệ." });
  }

  return {
    amount,
    currency: typeof record.currency === "string" && record.currency.trim() ? record.currency.trim() : "VND",
    note: typeof record.note === "string" ? record.note.trim().slice(0, 300) : undefined
  };
}

function readAllowedMimeTypes(value: unknown) {
  if (value === undefined || value === null) {
    return ["application/pdf"];
  }

  if (!Array.isArray(value) || value.length === 0 || value.length > 8) {
    throw new BadRequestException({ message: "Định dạng tệp cho phép không hợp lệ." });
  }

  return value.map((item) => readText(item, "allowedMimeTypes", 120));
}

function readMaxSizeMb(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return 5;
  }

  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0 || numberValue > 50) {
    throw new BadRequestException({ message: "Dung lượng tệp tối đa không hợp lệ." });
  }

  return numberValue;
}
