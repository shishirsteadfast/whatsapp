import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsArray,
  IsUUID,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressBookContactDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ example: '1234567890' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: 'phone must contain digits only' })
  @MaxLength(20)
  phone: string;

  @ApiProperty({ example: '+60' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'countryCode must be a valid dial code (e.g. +60)' })
  countryCode: string;

  @ApiPropertyOptional({ example: 'Malaysia' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional({ example: 'Selangor' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: 'Kuala Lumpur' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: '123 Jalan Ampang' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: 'VIP customer' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateAddressBookContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'phone must contain digits only' })
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'countryCode must be a valid dial code (e.g. +60)' })
  countryCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkDeleteDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids: string[];
}

export class BulkCreateDto {
  @ApiProperty({ type: [CreateAddressBookContactDto] })
  @IsArray()
  @ArrayNotEmpty()
  contacts: CreateAddressBookContactDto[];
}
