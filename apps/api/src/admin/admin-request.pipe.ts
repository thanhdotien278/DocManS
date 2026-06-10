import { BadRequestException, type PipeTransform } from "@nestjs/common";

type FieldRule = {
  maxLength?: number;
  optional?: boolean;
};

const ADMIN_VALIDATION_MESSAGE = "Dữ liệu quản trị không hợp lệ.";

export function adminRequestPipe(fields: Record<string, FieldRule>): PipeTransform<unknown, Record<string, unknown>> {
  return {
    transform(value: unknown) {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new BadRequestException({ message: ADMIN_VALIDATION_MESSAGE });
      }

      const input = value as Record<string, unknown>;

      for (const [field, rule] of Object.entries(fields)) {
        const fieldValue = input[field];

        if (fieldValue === undefined) {
          if (rule.optional) {
            continue;
          }
          throw new BadRequestException({ message: ADMIN_VALIDATION_MESSAGE });
        }

        if (typeof fieldValue !== "string" || !fieldValue.trim()) {
          throw new BadRequestException({ message: ADMIN_VALIDATION_MESSAGE });
        }

        if (rule.maxLength && fieldValue.length > rule.maxLength) {
          throw new BadRequestException({ message: ADMIN_VALIDATION_MESSAGE });
        }
      }

      return input;
    }
  };
}
