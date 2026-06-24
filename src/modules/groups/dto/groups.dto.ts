import { IsString, IsOptional, IsNotEmpty, MaxLength, IsArray, IsUUID, ArrayNotEmpty, IsNumber } from 'class-validator';

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string | null;
}

export class AddMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  contactIds: string[];
}

export class RemoveMembersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  contactIds: string[];
}

export class FilterContactsDto {
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
  name?: string;

  @IsOptional()
  @IsString()
  phonePrefix?: string;
}

export class BulkCreateWithGroupDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  contacts: {
    fullName?: string;
    phone: string;
    countryCode: string;
    countryId?: number;
    stateId?: number;
    cityId?: number;
    address?: string;
    note?: string;
  }[];
}
