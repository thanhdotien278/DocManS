import { BadRequestException, ForbiddenException } from "@nestjs/common";
import type { SafeUserContext } from "../auth/auth.types.js";

export type RequestWithCurrentUser = {
  currentUser?: SafeUserContext;
};

export function assertSystemAdmin(user?: SafeUserContext): SafeUserContext {
  if (!user || user.role !== "system-admin") {
    throw new ForbiddenException({ message: "Chỉ quản trị viên hệ thống được thực hiện thao tác này." });
  }

  return user;
}

export function readText(value: unknown, field: string, maxLength = 160) {
  if (typeof value !== "string") {
    throw new BadRequestException({ message: `${field} không hợp lệ.` });
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new BadRequestException({ message: `${field} không hợp lệ.` });
  }

  return normalized;
}

export function readOptionalText(value: unknown, field: string, maxLength = 500) {
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
