import { IsString, IsUUID, IsOptional, IsArray, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Collection ID to add the document to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  collectionId: string;

  @ApiPropertyOptional({
    description: 'Custom metadata for the document',
    example: { folder: '/finance/reports', department: 'accounting' },
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags for the document',
    example: ['finance', 'annual', 'report'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}