import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { buildContentDisposition } from "../modules/files/files.controller.js";
import { sendObjectContent, type ObjectContentResponse } from "../modules/files/send-object-content.js";
import { uploadInterceptorOptions } from "../modules/files/upload-limits.js";
import type { RequestWithCurrentUser } from "../proposals-shared/proposal-types.js";
import {
  createScientificDocumentPipe,
  queryScientificDocumentsPipe,
  updateScientificDocumentPipe,
  type CreateScientificDocumentDto,
  type QueryScientificDocumentsDto,
  type UpdateScientificDocumentDto,
  type UploadedDocumentFile
} from "./scientific-documents.dto.js";
import { ScientificDocumentsService } from "./scientific-documents.service.js";

type DownloadResponse = ObjectContentResponse;

// Chặn ngay khi body đang truyền, tệp quá cỡ không bị nạp hết vào bộ nhớ.
const uploadInterceptor = () => FileInterceptor("file", uploadInterceptorOptions());

@Controller("api/v1/scientific-documents")
@UseGuards(SessionAuthGuard)
export class ScientificDocumentsController {
  constructor(private readonly service: ScientificDocumentsService) {}

  @Get()
  async listDocuments(@Req() request: RequestWithCurrentUser, @Query(queryScientificDocumentsPipe) query: QueryScientificDocumentsDto) {
    return { documents: await this.service.listDocuments(request.currentUser!, query) };
  }

  @Get(":id")
  async getDocument(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return { document: await this.service.getDocument(request.currentUser!, id) };
  }

  @Post()
  @UseInterceptors(uploadInterceptor())
  async createDocument(
    @Req() request: RequestWithCurrentUser,
    @Body(createScientificDocumentPipe) body: CreateScientificDocumentDto,
    @UploadedFile() file?: UploadedDocumentFile
  ) {
    return { document: await this.service.createDocument(request.currentUser!, body, file) };
  }

  @Patch(":id")
  @UseInterceptors(uploadInterceptor())
  async updateDocument(
    @Req() request: RequestWithCurrentUser,
    @Param("id") id: string,
    @Body(updateScientificDocumentPipe) body: UpdateScientificDocumentDto,
    @UploadedFile() file?: UploadedDocumentFile
  ) {
    return { document: await this.service.updateDocument(request.currentUser!, id, body, file) };
  }

  @Delete(":id")
  async deleteDocument(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return await this.service.deleteDocument(request.currentUser!, id);
  }

  @Get(":id/download")
  async downloadDocument(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Res() response: DownloadResponse) {
    const file = await this.service.downloadDocument(request.currentUser!, id);
    response.setHeader("Content-Type", file.mimeType);
    response.setHeader("Content-Disposition", buildContentDisposition(file.fileName));
    await sendObjectContent(response, file.stream);
  }
}
