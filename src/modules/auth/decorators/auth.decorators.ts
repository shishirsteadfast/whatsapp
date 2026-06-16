import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';
import { Request } from 'express';
import { User } from '../entities/user.entity';

export const REQUIRED_ROLE_KEY = 'requiredRole';
export const PUBLIC_KEY = 'isPublic';

export const RequireRole = (role: UserRole) => SetMetadata(REQUIRED_ROLE_KEY, role);

export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User | undefined => {
  const request = ctx.switchToHttp().getRequest<Request & { user?: User }>();
  return request.user;
});
