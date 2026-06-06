import { IsString, IsOptional, IsArray, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}