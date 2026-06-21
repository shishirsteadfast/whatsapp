import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  StreamableFile,
  Header,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, statSync } from 'fs';
import { UploadService } from './upload.service';

const MIME_MAP: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post(':folder')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Param('folder') folder: string) {
    const allowedFolders = ['profile', 'business-logo', 'small-logo'];
    if (!allowedFolders.includes(folder)) {
      return { error: 'Invalid folder' };
    }
    return this.uploadService.uploadFile(file, folder);
  }

  @Get(':folder/:filename')
  @Header('Cache-Control', 'public, max-age=31536000')
  serve(@Param('folder') folder: string, @Param('filename') filename: string) {
    const filePath = this.uploadService.getFilePath(folder, filename);
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const stat = statSync(filePath);
    const stream = createReadStream(filePath);
    return new StreamableFile(stream, {
      type: MIME_MAP[ext] ?? 'image/jpeg',
      length: stat.size,
      disposition: `inline; filename="${filename}"`,
    });
  }

  @Delete(':folder/:filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('folder') folder: string, @Param('filename') filename: string) {
    this.uploadService.deleteFile(folder, filename);
  }
}
