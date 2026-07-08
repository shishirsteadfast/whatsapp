import { IsString, IsOptional, MinLength, Matches, IsArray, IsBoolean } from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
