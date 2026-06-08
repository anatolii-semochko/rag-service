import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUUID, Min, Max } from 'class-validator';
import { VectorStorageService, VectorSearchResult } from '../services/vector-storage.service';
import { OpenAIProvider } from '../providers/openai.provider';

class VectorSearchDto {
  @ApiProperty({
    description: 'Search query',
    example: 'What is artificial intelligence?'
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Maximum number of results',
    example: 10,
    required: false,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Similarity threshold (0-1)',
    example: 0.7,
    required: false,
    minimum: 0,
    maximum: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number;

  @ApiProperty({
    description: 'Collection ID for filtering',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false
  })
  @IsOptional()
  @IsUUID()
  collectionId?: string;
}

class VectorStatsResponseDto {
  totalChunks: number;
  chunksWithEmbeddings: number;
  documentsCount: number;
  avgTokensPerChunk: number;
}

@ApiTags('Vector Search')
@Controller('vector')
export class VectorSearchController {
  constructor(
    private readonly vectorStorageService: VectorStorageService,
    private readonly openAIProvider: OpenAIProvider,
  ) {}

  @Post('search')
  @ApiOperation({
    summary: 'Vector search in documents',
    description: 'Performs semantic search in stored documents using vector embeddings',
  })
  @ApiBody({
    type: VectorSearchDto,
    examples: {
      basic: {
        summary: 'Basic search',
        value: {
          query: 'What is artificial intelligence?',
          limit: 5,
          threshold: 0.7,
        },
      },
      collection: {
        summary: 'Search in specific collection',
        value: {
          query: 'machine learning algorithms',
          limit: 10,
          threshold: 0.75,
          collectionId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Vector search results',
    schema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chunk: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  metadata: { type: 'object' },
                },
              },
              similarity: { type: 'number' },
              document: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  filename: { type: 'string' },
                  collectionId: { type: 'string' },
                },
              },
            },
          },
        },
        query: { type: 'string' },
        executionTime: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  async search(@Body() searchDto: VectorSearchDto): Promise<{
    results: VectorSearchResult[];
    query: string;
    executionTime: number;
  }> {
    if (!searchDto.query || searchDto.query.trim().length === 0) {
      throw new BadRequestException('Query parameter is required and cannot be empty');
    }

    const startTime = Date.now();

    try {
      // 1. Create embedding for query
      const queryEmbedding = await this.openAIProvider.embeddings(searchDto.query.trim());

      // 2. Perform vector search
      const results = await this.vectorStorageService.searchSimilar(
        queryEmbedding,
        searchDto.limit || 10,
        searchDto.threshold || 0.7,
        searchDto.collectionId,
      );

      const executionTime = Date.now() - startTime;

      return {
        results,
        query: searchDto.query,
        executionTime,
      };
    } catch (error) {
      console.error('Error in vector search:', error);
      throw new BadRequestException(`Search failed: ${error.message}`);
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Vector database statistics',
    description: 'Returns statistics about the number of stored chunks and documents',
  })
  @ApiResponse({
    status: 200,
    description: 'Vector database statistics',
    type: VectorStatsResponseDto,
  })
  async getStats(): Promise<VectorStatsResponseDto> {
    try {
      return await this.vectorStorageService.getVectorStats();
    } catch (error) {
      console.error('Error getting vector stats:', error);
      throw new BadRequestException(`Failed to get statistics: ${error.message}`);
    }
  }

  @Get('test')
  @ApiOperation({
    summary: 'Test search',
    description: 'Performs a test vector search to verify system operation',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Test query' })
  @ApiResponse({
    status: 200,
    description: 'Test search results',
  })
  async testSearch(@Query('q') query?: string) {
    const testQuery = query || 'test search query';

    try {
      // Create embedding
      const embedding = await this.openAIProvider.embeddings(testQuery);

      // Perform search
      const results = await this.vectorStorageService.searchSimilar(
        embedding,
        5,
        0.5, // Lower threshold for testing
      );

      return {
        query: testQuery,
        embeddingDimensions: embedding.length,
        resultsCount: results.length,
        results: results.map(r => ({
          similarity: r.similarity,
          content: r.chunk.content.substring(0, 100) + '...',
          document: r.document?.filename,
        })),
      };
    } catch (error) {
      console.error('Error in test search:', error);
      return {
        error: error.message,
        query: testQuery,
      };
    }
  }
}