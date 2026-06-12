import { IsString, IsOptional, IsArray, IsUUID, MinLength, IsNumber, IsBoolean, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RetrievalMode } from '../../rag/retrieval/enums/retrieval-mode.enum';
import { RagMode } from './enums/rag-mode.enum';
import { SessionMessageDto } from './session-message.dto';

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
    description: 'RAG mode: none (LLM only), all (all categories), partial (selected categories)',
    enum: RagMode,
    example: RagMode.ALL,
  })
  @IsOptional()
  @IsEnum(RagMode)
  ragMode?: RagMode;

  @ApiPropertyOptional({
    description: 'Category IDs to use when ragMode is PARTIAL',
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    isArray: true,
    type: String,
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  selectedCategories?: string[];

  @ApiPropertyOptional({
    description: 'Retrieval strategies to use',
    enum: RetrievalMode,
    example: [RetrievalMode.HYBRID, RetrievalMode.VECTOR],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RetrievalMode, { each: true })
  strategies?: RetrievalMode[];

  @ApiPropertyOptional({
    description: 'Retrieval strategy mode (deprecated - use strategies array)',
    enum: RetrievalMode,
    example: RetrievalMode.HYBRID,
  })
  @IsOptional()
  @IsEnum(RetrievalMode)
  retrievalMode?: RetrievalMode;

  @ApiPropertyOptional({
    description: 'Weight for vector similarity in hybrid search (0.0 to 1.0)',
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  vectorWeight?: number;

  @ApiPropertyOptional({
    description: 'Weight for keyword matching in hybrid search (0.0 to 1.0)',
    example: 0.3,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  keywordWeight?: number;

  @ApiPropertyOptional({
    description: 'Enable trace logging for debugging RAG process',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  trace?: boolean;

  @ApiPropertyOptional({
    description: 'Test RAG process without sending request to LLM',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    description: 'Session history for context-aware conversations',
    example: [
      { request: 'What is AI?', summary: 'User asked about AI definition' },
      { request: 'How does it work?', summary: 'User followed up asking about AI mechanics' }
    ],
    isArray: true,
    type: SessionMessageDto,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionMessageDto)
  session?: SessionMessageDto[];
}