import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from '../services/search.service';
import { SearchRequestDto } from '../dto/search-request.dto';
import { SearchResponseDto, SearchResultDto } from '../dto/search-response.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('vector')
  @ApiOperation({
    summary: 'Vector search',
    description: 'Performs hybrid search (vector + full-text) across document chunks',
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  async vectorSearch(@Body() searchRequest: SearchRequestDto): Promise<SearchResponseDto> {
    return this.searchService.search(searchRequest);
  }

  @Get('metadata')
  @ApiOperation({
    summary: 'Metadata search',
    description: 'Searches documents by metadata filters (tags, folders, etc.)',
  })
  @ApiQuery({
    name: 'tags',
    required: false,
    type: String,
    description: 'Comma-separated list of tags',
  })
  @ApiQuery({
    name: 'folder',
    required: false,
    type: String,
    description: 'Document folder path',
  })
  @ApiQuery({
    name: 'department',
    required: false,
    type: String,
    description: 'Department filter',
  })
  @ApiResponse({
    status: 200,
    description: 'Metadata search completed successfully',
    type: [SearchResultDto],
  })
  async metadataSearch(@Query() query: any): Promise<SearchResultDto[]> {
    const metadata: Record<string, any> = {};

    if (query.tags) {
      metadata.tags = query.tags.split(',').map((tag: string) => tag.trim());
    }
    if (query.folder) {
      metadata.folder = query.folder;
    }
    if (query.department) {
      metadata.department = query.department;
    }

    return this.searchService.searchByMetadata(metadata);
  }
}