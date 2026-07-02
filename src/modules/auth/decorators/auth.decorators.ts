import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { Request } from 'express';
import { User } from '../entities/user.entity';

export const REQUIRED_ROLE_KEY = 'requiredRole';
export const REQUIRED_PERMISSIONS_KEY = 'requiredPermissions';
export const PUBLIC_KEY = 'isPublic';

export const RequireRole = (role: UserRole) => SetMetadata(REQUIRED_ROLE_KEY, role);

/**
 * Require one or more permissions to access a route.
 * If multiple permissions are provided, all must be present (AND logic).
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User | undefined => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: User }>();
  return request.user;
});
