import { IsString, IsUrl, IsArray, IsOptional, IsBoolean, IsInt, Min, Max, ArrayMinSize } from 'class-validator';

export const WEBHOOK_EVENTS = [
  'message.received',
  'message.sent',
  'message.ack',
  'message.revoked',
  'session.status',
  'session.qr',
  'session.authenticated',
  'session.disconnected',
  'group.join',
  'group.leave',
  'group.update',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export class CreateWebhookDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  events?: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  headers?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  retryCount?: number;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsArray()
  events?: string[];

  @IsOptional()
  @IsString()
  secret?: string;

  @IsOptional()
  headers?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  retryCount?: number;
}
