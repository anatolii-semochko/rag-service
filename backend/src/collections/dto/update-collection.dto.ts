import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCollectionDto {
  @ApiPropertyOptional({
    description: 'Name of the collection',
    example: 'Financial Reports 2024 - Updated',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the collection',
    example: 'Updated description for financial reports collection',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the collection is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'ID of the category this collection belongs to',
    example: '3a9f4f88-b203-4cd9-9e00-031e40e83185',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}