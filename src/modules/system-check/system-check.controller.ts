import { Controller, Get } from '@nestjs/common';
import { SystemCheckService } from './system-check.service';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';
import { SystemCheckResult } from './system-check.types';

@Controller('system-check')
export class SystemCheckController {
  constructor(private readonly systemCheckService: SystemCheckService) {}

  @Get()
  @RequireRole(UserRole.ADMIN)
  async check(): Promise<SystemCheckResult> {
    return this.systemCheckService.runChecks();
  }
}
