import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";

const PASSWORD_POLICY_MESSAGE = "Mật khẩu mới phải có từ 12 đến 256 ký tự, gồm chữ hoa, chữ thường và chữ số, không chứa khoảng trắng.";

export function validateNewPassword(value: unknown) {
  if (
    typeof value !== "string" ||
    value.length < 12 ||
    value.length > 256 ||
    /\s/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[A-Z]/.test(value) ||
    !/\d/.test(value)
  ) {
    throw new BadRequestException({ message: PASSWORD_POLICY_MESSAGE });
  }
  return value;
}

function objectInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new BadRequestException({ message: "Dữ liệu mật khẩu không hợp lệ." });
  }
  return value as Record<string, unknown>;
}

@Injectable()
export class ChangePasswordRequestPipe implements PipeTransform {
  transform(value: unknown) {
    const input = objectInput(value);
    if (typeof input.currentPassword !== "string" || !input.currentPassword || input.currentPassword.length > 256) {
      throw new BadRequestException({ message: "Mật khẩu hiện tại không hợp lệ." });
    }
    return { currentPassword: input.currentPassword, newPassword: validateNewPassword(input.newPassword) };
  }
}

@Injectable()
export class CompletePasswordResetRequestPipe implements PipeTransform {
  transform(value: unknown) {
    const input = objectInput(value);
    if (typeof input.token !== "string" || !input.token || input.token.length > 256) {
      throw new BadRequestException({ message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
    }
    return { token: input.token, newPassword: validateNewPassword(input.newPassword) };
  }
}
