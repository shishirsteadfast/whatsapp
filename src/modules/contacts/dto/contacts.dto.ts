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

export class CreateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d+$/, { message: 'phone must contain digits only' })
  @MaxLength(20)
  phone: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'countryCode must be a valid dial code (e.g. +60)' })
  countryCode: string;

  @IsOptional()
  @IsNumber()
  countryId?: number;

  @IsOptional()
  @IsNumber()
  stateId?: number;

  @IsOptional()
  @IsNumber()
  cityId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'phone must contain digits only' })
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,4}$/, { message: 'countryCode must be a valid dial code (e.g. +60)' })
  countryCode?: string;

  @IsOptional()
  @IsNumber()
  countryId?: number | null;

  @IsOptional()
  @IsNumber()
  stateId?: number | null;

  @IsOptional()
  @IsNumber()
  cityId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class BulkDeleteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids: string[];
}

export class BulkCreateDto {
  @IsArray()
  @ArrayNotEmpty()
  contacts: CreateContactDto[];
}
