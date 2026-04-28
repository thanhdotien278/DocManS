import { Controller, Get, Module } from "@nestjs/common";

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
  controllers: [HealthController]
})
export class AppModule {}
