import { IsString, IsNotEmpty, MinLength, Matches, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { UserRole } from '../../auth/entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  name: string;

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
