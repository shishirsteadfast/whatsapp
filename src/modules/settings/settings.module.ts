import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettings } from './entities/system-settings.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSettings]), UploadModule],
  controllers: [SettingsController, SystemSettingsController],
  providers: [SystemSettingsService],
})
export class SettingsModule {}
