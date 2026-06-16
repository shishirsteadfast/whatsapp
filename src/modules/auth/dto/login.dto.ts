import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '0170000000' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone: string;

  @ApiProperty({ example: 'password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
  };
}
