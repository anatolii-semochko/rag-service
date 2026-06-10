import { IsString, IsOptional, IsArray, IsUUID, MinLength, IsNumber, IsBoolean, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RetrievalMode } from '../../rag/retrieval/enums/retrieval-mode.enum';

export class ChatRequestDto {
  @ApiProperty({
    description: 'User message',
    example: 'What are the key financial metrics for Q4?',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  message: string;

  @ApiPropertyOptional({
    description: 'Chat session ID (if continuing existing conversation)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Collection IDs to search for context',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  collectionIds?: string[];

  @ApiPropertyOptional({
    description: 'Additional context or instructions',
    example: 'Focus on revenue and profit margins',
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Temperature for AI response randomness (0.0 to 1.0)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Whether to use RAG (Retrieval-Augmented Generation)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  useRAG?: boolean;

  @ApiPropertyOptional({
    description: 'Retrieval strategy mode',
    enum: RetrievalMode,
    example: RetrievalMode.HYBRID,
  })
  @IsOptional()
  @IsEnum(RetrievalMode)
  retrievalMode?: RetrievalMode;
}