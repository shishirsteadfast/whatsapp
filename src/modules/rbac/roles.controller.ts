import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';

@Controller('roles')
@RequireRole(UserRole.ADMIN)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Role> {
    return this.rolesService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateRoleDto): Promise<Role> {
    return this.rolesService.update(id, dto);
  }

  @Put(':id/permissions')
  async assignPermissions(
    @Param('id') id: string,
    @Body() dto: AssignPermissionsDto,
  ): Promise<Role> {
    return this.rolesService.assignPermissions(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.rolesService.delete(id);
  }
}
