import { BadRequestException, type PipeTransform } from "@nestjs/common";

export type AccountType = "INTERNAL" | "EXTERNAL";
export type RegisterDto = { email: string; username: string; fullName: string; accountType: AccountType };
export type ApproveRegistrationDto = { organizationUnitId: string; accountType: AccountType; externalAffiliation?: string };
export type RejectRegistrationDto = { reason: string };

const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
// Họ tên đi vào email và hồ sơ: một dòng, chỉ chữ cái, khoảng trắng và . ' -
const FULL_NAME_PATTERN = /^[\p{L}\p{M} .'-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function objectInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new BadRequestException({ message: "Dữ liệu không hợp lệ." });
  return value as Record<string, unknown>;
}

function text(input: Record<string, unknown>, field: string, max: number, message: string) {
  const value = input[field];
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new BadRequestException({ message });
  return value.trim();
}

function accountType(value: unknown): AccountType {
  if (value !== "INTERNAL" && value !== "EXTERNAL") throw new BadRequestException({ message: "Vui lòng chọn Trong học viện hoặc Ngoài học viện." });
  return value;
}

export const registerPipe: PipeTransform<unknown, RegisterDto> = {
  transform(value) {
    const input = objectInput(value);
    const email = text(input, "email", 254, "Email không hợp lệ.").toLocaleLowerCase("en-US");
    if (!EMAIL_PATTERN.test(email)) throw new BadRequestException({ message: "Email không hợp lệ." });
    const username = text(input, "username", 32, "Tên đăng nhập phải có 3–32 ký tự gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.").toLowerCase();
    // Không cho username dạng email: login tra cứu cả username và email bằng cùng một ô nhập.
    if (!USERNAME_PATTERN.test(username)) throw new BadRequestException({ message: "Tên đăng nhập phải có 3–32 ký tự gồm chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang." });
    const fullName = text(input, "fullName", 160, "Họ tên là bắt buộc, tối đa 160 ký tự.");
    if (!FULL_NAME_PATTERN.test(fullName)) throw new BadRequestException({ message: "Họ tên chỉ gồm chữ cái, khoảng trắng và các dấu . ' -" });
    return { email, username, fullName, accountType: accountType(input.accountType) };
  }
};

export const approveRegistrationPipe: PipeTransform<unknown, ApproveRegistrationDto> = {
  transform(value) {
    const input = objectInput(value);
    const type = accountType(input.accountType);
    const affiliation = input.externalAffiliation;
    if (affiliation !== undefined && affiliation !== null && (typeof affiliation !== "string" || affiliation.trim().length > 240)) throw new BadRequestException({ message: "Đơn vị công tác bên ngoài tối đa 240 ký tự." });
    return {
      organizationUnitId: text(input, "organizationUnitId", 80, "Vui lòng chọn đơn vị quản lý."),
      accountType: type,
      externalAffiliation: type === "EXTERNAL" && typeof affiliation === "string" && affiliation.trim() ? affiliation.trim() : undefined
    };
  }
};

export const rejectRegistrationPipe: PipeTransform<unknown, RejectRegistrationDto> = {
  transform(value) {
    return { reason: text(objectInput(value), "reason", 500, "Lý do từ chối là bắt buộc, tối đa 500 ký tự.") };
  }
};
