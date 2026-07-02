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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { RequireRole } from '../auth/decorators/auth.decorators';
import { UserRole } from '../auth/entities/user.entity';

@Controller('users')
@RequireRole(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Put(':id/roles')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
  ): Promise<UserResponseDto> {
    return this.usersService.assignRoles(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }
}
