import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../auth/entities/user.entity';
import { Role } from './entities/role.entity';
import { UserRoleAssignment } from './entities/user-role.entity';
import { RolesService } from './roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { createLogger } from '../../common/services/logger.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = createLogger('UsersService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRoleAssignment)
    private readonly userRoleRepository: Repository<UserRoleAssignment>,
    private readonly rolesService: RolesService,
  ) {}

  private toResponseDto(user: User, roles?: Role[]): UserResponseDto {
    const { password: _pw, ...safeUser } = user;
    return {
      ...safeUser,
      roles: roles
        ? roles.map(r => ({ id: r.id, name: r.name, description: r.description }))
        : undefined,
    };
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });

    const results: UserResponseDto[] = [];
    for (const user of users) {
      const roles = await this.getUserRoles(user.id);
      results.push(this.toResponseDto(user, roles));
    }
    return results;
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const roles = await this.getUserRoles(user.id);
    return this.toResponseDto(user, roles);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Phone number already in use');
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepository.create({
      phone: dto.phone,
      password: hash,
      name: dto.name,
      role: dto.role ?? UserRole.OPERATOR,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.userRepository.save(user);

    // Assign roles if specified
    if (dto.roleIds && dto.roleIds.length > 0) {
      const roles = await this.rolesService.findByIds(dto.roleIds);
      for (const role of roles) {
        const assignment = this.userRoleRepository.create({
          userId: saved.id,
          roleId: role.id,
        });
        await this.userRoleRepository.save(assignment);
      }
      return this.findById(saved.id);
    }

    return this.toResponseDto(saved, []);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.phone !== undefined && dto.phone !== user.phone) {
      const existing = await this.userRepository.findOne({ where: { phone: dto.phone } });
      if (existing) {
        throw new ConflictException('Phone number already in use');
      }
      user.phone = dto.phone;
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    if (dto.password !== undefined) {
      user.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    await this.userRepository.save(user);

    // Update role assignments if specified
    if (dto.roleIds !== undefined) {
      // Remove existing assignments
      await this.userRoleRepository.delete({ userId: id });

      // Add new assignments
      if (dto.roleIds.length > 0) {
        const roles = await this.rolesService.findByIds(dto.roleIds);
        for (const role of roles) {
          const assignment = this.userRoleRepository.create({
            userId: id,
            roleId: role.id,
          });
          await this.userRoleRepository.save(assignment);
        }
      }
    }

    return this.findById(id);
  }

  async assignRoles(id: string, dto: AssignRolesDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Remove existing assignments
    await this.userRoleRepository.delete({ userId: id });

    // Add new assignments
    if (dto.roleIds.length > 0) {
      const roles = await this.rolesService.findByIds(dto.roleIds);
      for (const role of roles) {
        const assignment = this.userRoleRepository.create({
          userId: id,
          roleId: role.id,
        });
        await this.userRoleRepository.save(assignment);
      }
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRoleRepository.delete({ userId: id });
    await this.userRepository.remove(user);
  }

  async getUserRoles(userId: string): Promise<Role[]> {
    const assignments = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
    return assignments.map(a => a.role).filter(Boolean);
  }

  /**
   * Get the set of effective permission names for a user from their assigned roles.
   */
  async getUserEffectivePermissions(userId: string): Promise<string[]> {
    const roles = await this.getUserRoles(userId);
    const roleIds = roles.map(r => r.id);
    return this.rolesService.getEffectivePermissions(roleIds);
  }
}
