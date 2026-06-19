import { IsString, IsNotEmpty, IsOptional, MaxLength, IsUrl, ValidateIf } from 'class-validator';

export class SendTextMessageDto {
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text: string;
}

export class SendMediaMessageDto {
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @IsOptional()
  @IsUrl()
  @ValidateIf((o: SendMediaMessageDto) => !o.base64)
  url?: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o: SendMediaMessageDto) => !o.url)
  base64?: string;

  @IsOptional()
  @IsString()
  mimetype?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1024)
  caption?: string;
}

export class MessageResponseDto {
  messageId: string;

  timestamp: number;
}
