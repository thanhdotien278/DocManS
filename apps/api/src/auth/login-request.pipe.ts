import { BadRequestException, Injectable, type PipeTransform } from "@nestjs/common";
import type { LoginRequest } from "./auth.types.js";

const LOGIN_VALIDATION_MESSAGE = "Dữ liệu đăng nhập không hợp lệ.";
const USERNAME_MAX_LENGTH = 128;
const PASSWORD_MAX_LENGTH = 256;

@Injectable()
export class LoginRequestPipe implements PipeTransform<unknown, LoginRequest> {
  transform(value: unknown): LoginRequest {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new BadRequestException({ message: LOGIN_VALIDATION_MESSAGE });
    }

    const input = value as Record<string, unknown>;

    if (typeof input.username !== "string" || typeof input.password !== "string") {
      throw new BadRequestException({ message: LOGIN_VALIDATION_MESSAGE });
    }

    if (!input.username.trim() || !input.password) {
      throw new BadRequestException({ message: LOGIN_VALIDATION_MESSAGE });
    }

    if (input.username.length > USERNAME_MAX_LENGTH || input.password.length > PASSWORD_MAX_LENGTH) {
      throw new BadRequestException({ message: LOGIN_VALIDATION_MESSAGE });
    }

    return {
      username: input.username,
      password: input.password
    };
  }
}
