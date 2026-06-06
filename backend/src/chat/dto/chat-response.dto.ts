import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatContextDto {
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
    description: 'Relevant content chunk',
    example: 'Q4 revenue increased by 15% compared to previous quarter...',
  })
  content: string;

  @ApiProperty({
    description: 'Relevance score',
    example: 0.85,
  })
  relevance: number;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'Generated response',
    example: 'Based on your documents, the key financial metrics for Q4 show...',
  })
  response: string;

  @ApiProperty({
    description: 'Chat session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Context sources used for the response',
    type: [ChatContextDto],
  })
  context?: ChatContextDto[];

  @ApiProperty({
    description: 'Response timestamp',
    example: '2024-06-06T10:00:00.000Z',
  })
  timestamp: string;
}