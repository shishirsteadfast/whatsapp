import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

class BulkMessageContentDto {
  @IsOptional()
  @IsString()
  text?: string;

  image?: { url?: string; base64?: string; mimetype?: string };

  video?: { url?: string; base64?: string; mimetype?: string };

  audio?: { url?: string; base64?: string; mimetype?: string };

  document?: { url?: string; base64?: string; mimetype?: string; filename?: string };

  @IsOptional()
  @IsString()
  caption?: string;
}

class BulkMessageItemDto {
  @IsString()
  chatId: string;

  @IsString()
  type: 'text' | 'image' | 'video' | 'audio' | 'document';

  @ValidateNested()
  @Type(() => BulkMessageContentDto)
  content: BulkMessageContentDto;

  @IsOptional()
  variables?: Record<string, string>;
}

class BulkMessageOptionsDto {
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  delayBetweenMessages?: number;

  @IsOptional()
  @IsBoolean()
  randomizeDelay?: boolean;

  @IsOptional()
  @IsBoolean()
  stopOnError?: boolean;
}

export class SendBulkMessageDto {
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkMessageItemDto)
  messages: BulkMessageItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BulkMessageOptionsDto)
  options?: BulkMessageOptionsDto;
}

export class BulkMessageResponseDto {
  batchId: string;

  status: string;

  totalMessages: number;

  estimatedCompletionTime?: string;

  statusUrl: string;
}
