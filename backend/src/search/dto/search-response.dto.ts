import { ApiProperty } from '@nestjs/swagger';

export class SearchResultDto {
  @ApiProperty({
    description: 'Chunk ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Document ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  documentId: string;

  @ApiProperty({
    description: 'Document name',
    example: 'annual-report-2024.pdf',
  })
  documentName: string;

  @ApiProperty({
    description: 'Matched content chunk',
    example: 'The financial projections for Q4 show a 15% increase in revenue...',
  })
  content: string;

  @ApiProperty({
    description: 'Similarity score (0-1)',
    example: 0.85,
  })
  similarity: number;

  @ApiProperty({
    description: 'Chunk metadata',
    example: { chunkIndex: 5, tokenCount: 450 },
  })
  metadata: Record<string, any>;
}

export class SearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: [SearchResultDto],
  })
  results: SearchResultDto[];

  @ApiProperty({
    description: 'Total number of results found',
    example: 25,
  })
  total: number;

  @ApiProperty({
    description: 'Search execution time in milliseconds',
    example: 150,
  })
  executionTime: number;
}