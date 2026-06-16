import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SessionAuthGuard } from "../../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../../proposals-shared/proposal-types.js";
import { listFilesPipe, type ListFilesDto, uploadFilePipe, type UploadFileDto } from "./files.dto.js";
import { FilesService, streamToBuffer } from "./files.service.js";

type UploadedMultipartFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type DownloadResponse = {
  setHeader(name: string, value: string): void;
  send(content: Buffer): void;
};

@Controller("api/v1/files")
@UseGuards(SessionAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Req() request: RequestWithCurrentUser,
    @Body(uploadFilePipe) body: UploadFileDto,
    @UploadedFile() file?: UploadedMultipartFile
  ) {
    if (!file) {
      throw new BadRequestException({ message: "Chưa chọn tệp tải lên." });
    }
    return {
      file: await this.filesService.uploadFile(request.currentUser!, {
        relatedEntityType: body.relatedEntityType,
        relatedEntityId: body.relatedEntityId,
        filePurpose: body.filePurpose,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        content: file.buffer
      })
    };
  }

  @Get()
  async listFiles(@Req() request: RequestWithCurrentUser, @Query(listFilesPipe) query: ListFilesDto) {
    return {
      files: await this.filesService.listFiles(request.currentUser!, {
        relatedEntityType: query.relatedEntityType,
        relatedEntityId: query.relatedEntityId
      })
    };
  }

  @Get(":id/download")
  async downloadFile(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Res() response: DownloadResponse) {
    const download = await this.filesService.downloadFile(request.currentUser!, id);
    const content = await streamToBuffer(download.content);
    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", `attachment; filename="${download.fileName.replace(/"/g, "")}"`);
    response.send(content);
  }
}
