import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+]{7,20}$/, { message: 'phone must be a valid phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class LoginResponseDto {
  access_token: string;

  user: {
    id: string;
    phone: string;
    name: string;
    role: string;
  };
}
