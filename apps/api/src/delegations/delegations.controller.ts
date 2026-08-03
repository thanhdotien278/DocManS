import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { createDelegationPipe, delegationContextPipe, type CreateDelegationDto, type DelegationContextDto } from "./delegations.dto.js";
import { DelegationsService } from "./delegations.service.js";

@Controller("api/v1")
@UseGuards(SessionAuthGuard)
export class DelegationsController {
  constructor(private readonly service: DelegationsService) {}

  @Post("research-proposals/:id/delegations")
  create(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(createDelegationPipe) body: CreateDelegationDto) {
    return this.service.create(request.currentUser!, id, body);
  }

  @Post("delegations/:id/approve")
  approve(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(delegationContextPipe) body: DelegationContextDto) {
    return this.service.approve(request.currentUser!, id, body.contextVersion);
  }

  @Post("delegations/:id/revoke")
  revoke(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(delegationContextPipe) body: DelegationContextDto) {
    return this.service.revoke(request.currentUser!, id, body.contextVersion);
  }

  @Post("delegations/:id/reject")
  reject(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(delegationContextPipe) body: DelegationContextDto) {
    return this.service.reject(request.currentUser!, id, body.contextVersion);
  }

  @Get("research-proposals/:id/delegations")
  list(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return this.service.list(request.currentUser!, id);
  }
}
