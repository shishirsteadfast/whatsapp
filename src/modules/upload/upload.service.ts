import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), 'data/uploads');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

@Injectable()
export class UploadService {
  constructor() {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
  }

  uploadFile(file: UploadFile, folder: string): { url: string; filename: string } {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File too large. Maximum size: 5MB');
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${folder}_${randomBytes(8).toString('hex')}${ext}`;
    const folderPath = path.join(UPLOAD_DIR, folder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filePath = path.join(folderPath, filename);
    fs.writeFileSync(filePath, file.buffer);

    return {
      url: `/api/upload/${folder}/${filename}`,
      filename,
    };
  }

  deleteFile(folder: string, filename: string): void {
    const filePath = path.join(UPLOAD_DIR, folder, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getFilePath(folder: string, filename: string): string {
    return path.join(UPLOAD_DIR, folder, filename);
  }

  getFileBuffer(folder: string, filename: string): Buffer | null {
    const filePath = path.join(UPLOAD_DIR, folder, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath);
  }
}
