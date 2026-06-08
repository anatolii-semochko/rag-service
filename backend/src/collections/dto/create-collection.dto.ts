import { IsString, IsOptional, MinLength, MaxLength, IsUUID, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCollectionDto {
  @ApiProperty({
    description: 'Name of the collection',
    example: 'Financial Reports 2024',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the collection',
    example: 'Collection of financial reports and documents for the year 2024',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Category ID where collection belongs',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({
    description: 'Is collection active',
    default: true,
    example: true
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Collection metadata',
    example: { tags: ['finance', 'reports'], priority: 'high' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}