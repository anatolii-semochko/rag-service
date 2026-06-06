import { IsString, IsOptional, IsArray, IsUUID, IsNumber, IsBoolean, Min, Max, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchRequestDto {
  @ApiProperty({
    description: 'Search query',
    example: 'financial projections for Q4',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  query: string;

  @ApiPropertyOptional({
    description: 'Collection IDs to search in',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  collectionIds?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Minimum similarity threshold (0-1)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  threshold?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Include full-text search in hybrid search',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeFullText?: boolean = true;

  @ApiPropertyOptional({
    description: 'Metadata filters',
    example: { tags: ['finance'], folder: '/reports' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}