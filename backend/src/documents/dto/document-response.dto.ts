import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DocumentResponseDto {
  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Collection ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectionId: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'annual-report-2024.pdf',
  })
  originalFilename: string;

  @ApiProperty({
    description: 'File type',
    example: 'pdf',
    enum: ['pdf', 'docx', 'txt', 'md', 'image'],
  })
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 2048576,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Processing status',
    example: 'completed',
    enum: ['processing', 'completed', 'error'],
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Document metadata',
    example: { folder: '/finance/reports', tags: ['finance', 'annual'] },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the document is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-06-06T10:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-06-06T10:00:00.000Z',
  })
  updatedAt: string;
}