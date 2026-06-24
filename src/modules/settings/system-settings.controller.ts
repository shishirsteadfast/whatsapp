import { Controller, Get, Put, Body } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(private readonly service: SystemSettingsService) {}

  @Get()
  get() {
    return this.service.get();
  }

  @Put()
  @RequireRole(UserRole.ADMIN)
  update(
    @Body()
    dto: Partial<{
      businessLogo: string;
      smallLogo: string;
      email: string;
      altPhone: string;
      website: string;
      name: string;
      address: string;
      googleMapLink: string;
    }>,
  ) {
    return this.service.update(dto);
  }
}
