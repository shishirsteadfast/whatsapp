import { Injectable, OnModuleInit, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { PermissionsService, DEFAULT_ROLE_PERMISSIONS } from './permissions.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

import { createLogger } from '../../common/services/logger.service';

@Injectable()
export class RolesService implements OnModuleInit {
  private readonly logger = createLogger('RolesService');

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultRoles();
  }

  private async seedDefaultRoles(): Promise<void> {
    const count = await this.roleRepository.count();
    if (count > 0) {
      this.logger.log(`Roles already seeded (${count} existing)`);
      return;
    }

    const allPermissions = await this.permissionsService.findAll();
    const permissionMap = new Map(allPermissions.map(p => [p.name, p]));

    for (const [roleName, permissionNames] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const permissions = permissionNames
        .map(name => permissionMap.get(name))
        .filter((p): p is Permission => !!p);

      const role = this.roleRepository.create({
        name: roleName,
        description: `System ${roleName} role with standard permissions`,
        isSystem: true,
        isActive: true,
        permissions,
      });
      await this.roleRepository.save(role);
      this.logger.log(`Seeded role "${roleName}" with ${permissions.length} permissions`);
    }
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepository.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role "${id}" not found`);
    return role;
  }

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
  }

  async findByIds(ids: string[]): Promise<Role[]> {
    return this.roleRepository.find({
      where: { id: In(ids), isActive: true },
      relations: ['permissions'],
    });
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Role "${dto.name}" already exists`);
    }

    let permissions: Permission[] = [];
    if (dto.permissionIds && dto.permissionIds.length > 0) {
      permissions = await this.permissionsService.findByIds(dto.permissionIds);
    }

    const role = this.roleRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      isSystem: false,
      isActive: true,
      permissions,
    });
    return this.roleRepository.save(role);
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);

    if (dto.name !== undefined) {
      const existing = await this.roleRepository.findOne({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Role "${dto.name}" already exists`);
      }
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    if (dto.isActive !== undefined) {
      role.isActive = dto.isActive;
    }

    if (dto.permissionIds !== undefined) {
      const permissions = await this.permissionsService.findByIds(dto.permissionIds);
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto): Promise<Role> {
    const role = await this.findById(id);
    const permissions = await this.permissionsService.findByIds(dto.permissionIds);
    role.permissions = permissions;
    return this.roleRepository.save(role);
  }

  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    if (role.isSystem) {
      throw new BadRequestException(`Cannot delete system role "${role.name}"`);
    }
    await this.roleRepository.remove(role);
  }

  /**
   * Get the effective set of permission names for a list of roles.
   * Includes all permissions from all roles assigned to the user.
   */
  async getEffectivePermissions(roleIds: string[]): Promise<string[]> {
    if (roleIds.length === 0) return [];
    const roles = await this.roleRepository.find({
      where: { id: In(roleIds), isActive: true },
      relations: ['permissions'],
    });
    const permissionSet = new Set<string>();
    for (const role of roles) {
      for (const permission of role.permissions) {
        permissionSet.add(permission.name);
      }
    }
    return Array.from(permissionSet);
  }


}
