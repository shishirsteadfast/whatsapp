import { Controller, Get, Param } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { Permission } from './entities/permission.entity';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequireRole(UserRole.ADMIN)
  async findAll(): Promise<Permission[]> {
    return this.permissionsService.findAll();
  }

  @Get('groups/:group')
  @RequireRole(UserRole.ADMIN)
  async findByGroup(@Param('group') group: string): Promise<Permission[]> {
    return this.permissionsService.findByGroup(group);
  }
}
