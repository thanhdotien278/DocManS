import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SessionAuthGuard } from "../../auth/session-auth.guard.js";
import type { RequestWithCurrentUser } from "../../proposals-shared/proposal-types.js";
import { listFilesPipe, type ListFilesDto, updateFilePipe, type UpdateFileDto, uploadFilePipe, type UploadFileDto } from "./files.dto.js";
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

function encodeRfc5987Value(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function toAsciiFilename(value: string) {
  const fallback = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9._ -]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (fallback || "download").replace(/"/g, "");
}

export function buildContentDisposition(fileName: string) {
  return `attachment; filename="${toAsciiFilename(fileName)}"; filename*=UTF-8''${encodeRfc5987Value(fileName)}`;
}

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
        originalFileName: body.originalFileName ?? file.originalname,
        description: body.description,
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

  @Patch(":id")
  async updateFile(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Body(updateFilePipe) body: UpdateFileDto) {
    return {
      file: await this.filesService.updateFile(request.currentUser!, id, {
        description: body.description
      })
    };
  }

  @Delete(":id")
  async deleteFile(@Req() request: RequestWithCurrentUser, @Param("id") id: string) {
    return {
      file: await this.filesService.deleteFile(request.currentUser!, id)
    };
  }

  @Get(":id/download")
  async downloadFile(@Req() request: RequestWithCurrentUser, @Param("id") id: string, @Res() response: DownloadResponse) {
    const download = await this.filesService.downloadFile(request.currentUser!, id);
    const content = await streamToBuffer(download.content);
    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", String(download.sizeBytes));
    response.setHeader("Content-Disposition", buildContentDisposition(download.fileName));
    response.send(content);
  }
}
