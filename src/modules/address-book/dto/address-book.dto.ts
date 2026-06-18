import {
  IsString,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  Matches,
  IsArray,
  IsUUID,
  IsNumber,
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

  @ApiPropertyOptional({ example: 112 })
  @IsOptional()
  @IsNumber()
  countryId?: number;

  @ApiPropertyOptional({ example: 1234 })
  @IsOptional()
  @IsNumber()
  stateId?: number;

  @ApiPropertyOptional({ example: 5678 })
  @IsOptional()
  @IsNumber()
  cityId?: number;

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
  @IsNumber()
  countryId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  stateId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cityId?: number | null;

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
