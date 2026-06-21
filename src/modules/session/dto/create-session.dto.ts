import { IsString, IsOptional, MaxLength, MinLength, Matches, IsIn } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9-]+$/, {
    message: 'Session name can only contain letters, numbers, and hyphens',
  })
  name: string;

  @IsOptional()
  config?: Record<string, unknown>;

  // Phase 3: Proxy per session
  @IsOptional()
  @IsString()
  @MaxLength(255)
  proxyUrl?: string;

  @IsOptional()
  @IsIn(['http', 'https', 'socks4', 'socks5'])
  proxyType?: 'http' | 'https' | 'socks4' | 'socks5';
}
