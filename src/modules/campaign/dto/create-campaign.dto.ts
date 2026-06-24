import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsNumber,
  Min,
  Max,
  IsISO8601,
  ArrayNotEmpty,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CampaignRecipientType } from '../entities/campaign.entity';

class MessageContentDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  filename?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsEnum(CampaignRecipientType)
  recipientType: CampaignRecipientType;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  recipientIds: string[];

  @ValidateNested()
  @Type(() => MessageContentDto)
  messageContent: MessageContentDto;

  @IsOptional()
  @IsISO8601()
  scheduleAt?: string;
}
