import { Controller, Get, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";

@Controller("api/v1/health")
class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      service: "DocManSystem API",
      timestamp: new Date().toISOString()
    };
  }
}

@Module({
  imports: [AuthModule],
  controllers: [HealthController]
})
export class AppModule {}
