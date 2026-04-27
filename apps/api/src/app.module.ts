import { Controller, Get, Module } from "@nestjs/common";

@Controller("api/v1/health")
class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      service: "rtms-api-placeholder",
      scope: "Story 1.1A visual MVP only"
    };
  }
}

@Module({
  controllers: [HealthController]
})
export class AppModule {}
