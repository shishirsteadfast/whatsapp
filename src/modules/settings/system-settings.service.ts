import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSettings } from './entities/system-settings.entity';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class SystemSettingsService {
  constructor(
    @InjectRepository(SystemSettings)
    private readonly repo: Repository<SystemSettings>,
    private readonly uploadService: UploadService,
  ) {}

  private async getOrCreate(): Promise<SystemSettings> {
    let settings = await this.repo.findOne({ where: {} });
    if (!settings) {
      settings = this.repo.create({});
      settings = await this.repo.save(settings);
    }
    return settings;
  }

  async get(): Promise<SystemSettings> {
    return this.getOrCreate();
  }

  async update(dto: Partial<Omit<SystemSettings, 'id' | 'updatedAt'>>): Promise<SystemSettings> {
    const settings = await this.getOrCreate();

    // Delete old logos if new ones are being set
    if (dto.businessLogo !== undefined && dto.businessLogo !== settings.businessLogo && settings.businessLogo) {
      this.deleteUploadedFile(settings.businessLogo);
    }
    if (dto.smallLogo !== undefined && dto.smallLogo !== settings.smallLogo && settings.smallLogo) {
      this.deleteUploadedFile(settings.smallLogo);
    }

    Object.assign(settings, dto);
    return this.repo.save(settings);
  }

  private deleteUploadedFile(url: string): void {
    try {
      const match = url.match(/\/api\/upload\/([^/]+)\/([^/]+)$/);
      if (match) {
        const [, folder, filename] = match;
        this.uploadService.deleteFile(folder, filename);
      }
    } catch {
      // Ignore errors when deleting old files
    }
  }
}
