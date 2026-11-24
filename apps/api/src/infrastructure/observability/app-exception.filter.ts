import { ArgumentsHost, BadRequestException, Catch, ConflictException, HttpException, NotFoundException } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { logJson } from "./log.js";

type PrismaKnownError = { code: string; clientVersion?: string; meta?: { modelName?: unknown; target?: unknown } };

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  const value = error as PrismaKnownError | null;
  return !!value && typeof value.code === "string" && /^P\d{4}$/.test(value.code) && typeof value.clientVersion === "string";
}

/** Lỗi ràng buộc của Prisma lọt ra ngoài service → mã HTTP đúng nghĩa thay vì 500. */
export function mapPrismaError(error: PrismaKnownError): HttpException | null {
  switch (error.code) {
    case "P2002": return new ConflictException({ code: "UNIQUE_CONSTRAINT_VIOLATION", message: "Dữ liệu bị trùng với bản ghi đã có." });
    case "P2025": return new NotFoundException({ code: "RECORD_NOT_FOUND", message: "Không tìm thấy dữ liệu cần thao tác." });
    case "P2003": return new BadRequestException({ code: "REFERENCE_INVALID", message: "Dữ liệu tham chiếu không tồn tại." });
    case "P2034": return new ConflictException({ code: "CONTEXT_VERSION_MISMATCH", message: "Dữ liệu vừa được người khác thay đổi. Vui lòng tải lại và thực hiện lại." });
    default: return null;
  }
}

/**
 * Bộ lọc lỗi toàn cục. HttpException giữ nguyên cách Nest trả lời; lỗi Prisma đã biết được đổi mã;
 * lỗi không lường trước trả 500 kèm mã tra cứu (request id) và được log đầy đủ stack.
 */
@Catch()
export class AppExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== "http") return super.catch(exception, host);
    const request = host.switchToHttp().getRequest<{ requestId?: string; method?: string; originalUrl?: string; url?: string; currentUser?: { id?: string } }>();
    const context = {
      requestId: request?.requestId,
      method: request?.method,
      path: (request?.originalUrl ?? request?.url ?? "").split("?")[0],
      userId: request?.currentUser?.id
    };

    if (exception instanceof HttpException) {
      if (exception.getStatus() >= 500) logJson("error", "http_exception", { ...context, status: exception.getStatus(), error: exception.message });
      return super.catch(exception, host);
    }

    if (isPrismaKnownError(exception)) {
      const mapped = mapPrismaError(exception);
      if (mapped) {
        logJson("warn", "prisma_error_mapped", {
          ...context,
          prismaCode: exception.code,
          model: exception.meta?.modelName,
          target: exception.meta?.target,
          status: mapped.getStatus()
        });
        return super.catch(mapped, host);
      }
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));
    logJson("error", "unhandled_exception", {
      ...context,
      error: error.message,
      stack: error.stack,
      prismaCode: isPrismaKnownError(exception) ? exception.code : undefined
    });
    const response = host.switchToHttp().getResponse<{ status(code: number): { json(body: unknown): unknown }; headersSent?: boolean }>();
    if (response.headersSent) return;
    response.status(500).json({
      statusCode: 500,
      message: `Lỗi hệ thống. Mã tra cứu: ${context.requestId ?? "không có"}`,
      requestId: context.requestId
    });
  }
}
