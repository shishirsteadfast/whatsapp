import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { REQUIRED_ROLE_KEY, REQUIRED_PERMISSIONS_KEY, PUBLIC_KEY } from '../decorators/auth.decorators';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Bearer token is required');

    let payload: { sub: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwtSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub, isActive: true } });
    if (!user) throw new UnauthorizedException('User not found or inactive');

    // Check required role (hierarchy-based)
    const requiredRole = this.reflector.getAllAndOverride<UserRole>(REQUIRED_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRole && !this.hasRolePermission(user.role, requiredRole)) {
      throw new UnauthorizedException(`Insufficient permissions. Required: ${requiredRole}`);
    }

    // Check required permissions (granular-based)
    // Note: @RequirePermissions() is available for future use.
    // When enabled, inject UsersService from RbacModule to check granular permissions.

    (request as Request & { user: User }).user = user;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const auth = request.headers['authorization'];
    if (auth?.startsWith('Bearer ')) return auth.substring(7);
    return undefined;
  }

  private hasRolePermission(userRole: UserRole, required: UserRole): boolean {
    const hierarchy: Record<UserRole, number> = {
      [UserRole.VIEWER]: 1,
      [UserRole.OPERATOR]: 2,
      [UserRole.ADMIN]: 3,
    };
    return hierarchy[userRole] >= hierarchy[required];
  }
}
