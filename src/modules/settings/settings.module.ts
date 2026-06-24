import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller';
import { SystemSettingsController } from './system-settings.controller';
import { SystemSettingsService } from './system-settings.service';
import { SystemSettings } from './entities/system-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemSettings])],
  controllers: [SettingsController, SystemSettingsController],
  providers: [SystemSettingsService],
})
export class SettingsModule {}
