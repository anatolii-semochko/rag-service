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
import { StatisticsHelper } from '../../common/helpers/statistics.helper';

@ApiTags('Collections')
@Controller('collections')
export class CollectionsController {
  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly statisticsHelper: StatisticsHelper,
  ) {}

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
    const result = await this.collectionsService.create(createCollectionDto);
    await this.statisticsHelper.updateCollectionStatistics(result.id);
    await this.statisticsHelper.updateCategoryStatistics(result.categoryId);
    return result;
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

  @Get('active')
  @ApiOperation({
    summary: 'Get active collections',
    description: 'Retrieves all active collections from active categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Active collections retrieved successfully',
    type: [CollectionResponseDto],
  })
  async getActiveCollections(): Promise<{ data: CollectionResponseDto[] }> {
    const collections = await this.collectionsService.getActiveCollections();
    return { data: collections };
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
    const result = await this.collectionsService.update(id, updateCollectionDto);
    await this.statisticsHelper.updateCollectionStatistics(id);
    await this.statisticsHelper.updateCategoryStatistics(result.categoryId);
    return result;
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
    const collection = await this.collectionsService.findOne(id);
    await this.collectionsService.remove(id);
    await this.statisticsHelper.updateCategoryStatistics(collection.categoryId);
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