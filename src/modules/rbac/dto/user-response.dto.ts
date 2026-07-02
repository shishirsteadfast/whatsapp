import { UserRole } from '../../auth/entities/user.entity';

export class UserResponseDto {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  profilePic: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles?: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
}
