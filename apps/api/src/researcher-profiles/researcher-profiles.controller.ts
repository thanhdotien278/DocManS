import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import { createResearcherProfilePipe, researcherAccountPipe, updateMyProfilePipe, type ResearcherAccountInput, researcherProfileMutationPipe, updateResearcherProfilePipe, type CreateResearcherProfileDto, type UpdateResearcherProfileDto } from "./researcher-profiles.dto.js";
import { ResearcherProfilesService } from "./researcher-profiles.service.js";

@Controller("api/v1/researcher-profiles")
@UseGuards(SessionAuthGuard)
export class ResearcherProfilesController {
  constructor(private readonly profilesService: ResearcherProfilesService) {}

  @Get()
  async list(@Req() request: RequestWithCurrentUser, @Query() query: Record<string, string | undefined>) {
    return this.profilesService.listProfiles(request.currentUser!, query);
  }

  @Get("catalogs")
  async catalogs(@Req() request: RequestWithCurrentUser) {
    return this.profilesService.listCatalogs(request.currentUser!);
  }

  @Get("my-profile")
  async myProfile(@Req() request: RequestWithCurrentUser) {
    return { profile: await this.profilesService.getMyProfile(request.currentUser!) };
  }

  @Patch("my-profile")
  async updateMyProfile(@Req() request: RequestWithCurrentUser, @Body(updateMyProfilePipe) body: UpdateResearcherProfileDto) {
    return this.profilesService.updateMyProfile(request.currentUser!, body);
  }

  @Post()
  async create(@Req() request: RequestWithCurrentUser, @Body(createResearcherProfilePipe) body: CreateResearcherProfileDto) {
    return this.profilesService.createProfile(request.currentUser!, body);
  }

  @Get(":id")
  async get(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { profile: await this.profilesService.getProfile(request.currentUser!, id) };
  }

  @Get(":id/history")
  async history(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { history: await this.profilesService.listHistory(request.currentUser!, id) };
  }

  @Patch(":id")
  async update(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(updateResearcherProfilePipe) body: UpdateResearcherProfileDto) {
    return this.profilesService.updateProfile(request.currentUser!, id, body);
  }

  @Post(":id/activate")
  async activate(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(researcherProfileMutationPipe) body: { contextVersion: UpdateResearcherProfileDto["contextVersion"] }) {
    return this.profilesService.setStatus(request.currentUser!, id, "ACTIVE", body.contextVersion);
  }

  @Post(":id/deactivate")
  async deactivate(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(researcherProfileMutationPipe) body: { contextVersion: UpdateResearcherProfileDto["contextVersion"] }) {
    return this.profilesService.setStatus(request.currentUser!, id, "INACTIVE", body.contextVersion);
  }

  @Get(":id/account-candidates")
  async accountCandidates(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Query("keyword") keyword?: string) {
    return this.profilesService.accountCandidates(request.currentUser!, id, keyword);
  }

  @Post(":id/account")
  async createAccount(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(researcherAccountPipe) body: ResearcherAccountInput) {
    return this.profilesService.createResearcherAccount(request.currentUser!, id, body);
  }

  @Post(":id/account/link")
  async linkAccount(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(researcherAccountPipe) body: ResearcherAccountInput) {
    return this.profilesService.linkResearcherAccount(request.currentUser!, id, body);
  }

  @Post(":id/account/unlink")
  async unlinkAccount(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(researcherAccountPipe) body: ResearcherAccountInput) {
    return this.profilesService.unlinkResearcherAccount(request.currentUser!, id, body);
  }

  @Post(":id/account/reset")
  async resetAccount(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(researcherAccountPipe) body: ResearcherAccountInput) {
    return this.profilesService.resetResearcherAccount(request.currentUser!, id, body);
  }

  @Post(":id/account/resend-activation")
  async resendActivation(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(researcherAccountPipe) body: ResearcherAccountInput) {
    return this.profilesService.resetResearcherAccount(request.currentUser!, id, body);
  }
}
