import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CollectionsService } from '../services/collections.service';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { CollectionResponseDto } from '../dto/collection-response.dto';
import { PaginationDto, PaginationResponseDto } from '../../common/dto/pagination.dto';

@ApiTags('Collections')
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new collection',
    description: 'Creates a new document collection/knowledge base',
  })
  @ApiResponse({
    status: 201,
    description: 'Collection created successfully',
    type: CollectionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(@Body() createCollectionDto: CreateCollectionDto): Promise<CollectionResponseDto> {
    return this.collectionsService.create(createCollectionDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all collections',
    description: 'Retrieves a paginated list of all collections',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Collections retrieved successfully',
    type: PaginationResponseDto<CollectionResponseDto>,
  })
  async findAll(@Query() pagination: PaginationDto): Promise<PaginationResponseDto<CollectionResponseDto>> {
    return this.collectionsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get collection by ID',
    description: 'Retrieves a specific collection by its ID',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Collection ID' })
  @ApiResponse({
    status: 200,
    description: 'Collection retrieved successfully',
    type: CollectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async findOne(@Param('id') id: string): Promise<CollectionResponseDto> {
    return this.collectionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update collection',
    description: 'Updates an existing collection',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Collection ID' })
  @ApiResponse({
    status: 200,
    description: 'Collection updated successfully',
    type: CollectionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
  ): Promise<CollectionResponseDto> {
    return this.collectionsService.update(id, updateCollectionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete collection',
    description: 'Deletes a collection and all associated documents',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Collection ID' })
  @ApiResponse({ status: 204, description: 'Collection deleted successfully' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.collectionsService.remove(id);
  }

  @Get(':id/documents')
  @ApiOperation({
    summary: 'Get all documents in a collection',
    description: 'Retrieves all documents that belong to a specific collection',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Collection ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async getDocuments(
    @Param('id') id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.collectionsService.getDocuments(id, pagination);
  }
}