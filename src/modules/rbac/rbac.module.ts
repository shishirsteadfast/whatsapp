import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { UserRoleAssignment } from './entities/user-role.entity';
import { User } from '../auth/entities/user.entity';
import { PermissionsService } from './permissions.service';
import { RolesService } from './roles.service';
import { UsersService } from './users.service';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { UsersController } from './users.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, Role, UserRoleAssignment, User]),
  ],
  controllers: [PermissionsController, RolesController, UsersController],
  providers: [PermissionsService, RolesService, UsersService],
  exports: [PermissionsService, RolesService, UsersService],
})
export class RbacModule {}
