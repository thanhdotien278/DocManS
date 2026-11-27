import { Controller, Get, Res } from "@nestjs/common";
import { MinioObjectStorageService } from "../minio/minio-object-storage.service.js";
import { PrismaService } from "../prisma/prisma.service.js";

type HealthResponse = { status(code: number): { json(body: unknown): unknown } };
type DependencyStatus = "up" | "down";

const CHECK_TIMEOUT_MS = 3000;
const READY_CACHE_MS = 10_000;

/** Kiểm tra có giới hạn thời gian: một phụ thuộc treo không giữ request healthcheck mãi. */
async function probe(check: () => Promise<unknown>): Promise<DependencyStatus> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      check(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS); })
    ]);
    return "up";
  } catch {
    return "down";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

@Controller("api/v1/health")
export class HealthController {
  private readyCache: { at: number; database: DependencyStatus; storage: DependencyStatus } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioObjectStorageService
  ) {}

  /**
   * Liveness cho Docker healthcheck: tiến trình chạy và kết nối được CSDL. Không kiểm tra MinIO để một sự
   * cố kho tệp không làm API bị đánh dấu hỏng (đa số chức năng không cần tệp).
   */
  @Get()
  async health(@Res() res: HealthResponse) {
    const database = await probe(() => this.prisma.$queryRaw`SELECT 1`);
    return res.status(database === "up" ? 200 : 503).json({
      status: database === "up" ? "ok" : "error",
      service: "DocManSystem API",
      database: database === "up" ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Readiness cho giám sát: CSDL và kho tệp MinIO. Kết quả được dùng lại trong 10 giây để giám sát gọi dày
   * cũng không tạo tải lên CSDL/MinIO.
   */
  @Get("ready")
  async ready(@Res() res: HealthResponse) {
    const now = Date.now();
    if (!this.readyCache || now - this.readyCache.at > READY_CACHE_MS) {
      const [database, storage] = await Promise.all([
        probe(() => this.prisma.$queryRaw`SELECT 1`),
        probe(() => this.storage.checkBucket())
      ]);
      this.readyCache = { at: now, database, storage };
    }
    const { database, storage, at } = this.readyCache;
    const ok = database === "up" && storage === "up";
    return res.status(ok ? 200 : 503).json({
      status: ok ? "ok" : "degraded",
      database,
      storage,
      checkedAt: new Date(at).toISOString()
    });
  }
}
