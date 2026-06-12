import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryResponseDto } from '../dto/category-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { StatisticsHelper } from '../../common/helpers/statistics.helper';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly statisticsHelper: StatisticsHelper,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async create(@Body() createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const result = await this.categoriesService.create(createCategoryDto);
    await this.statisticsHelper.updateCategoryStatistics(result.id);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Filter by active status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
    type: [CategoryResponseDto],
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.categoriesService.findAll(pagination, { search, isActive });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const result = await this.categoriesService.update(id, updateCategoryDto);
    await this.statisticsHelper.updateCategoryStatistics(id);
    return result;
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle category active status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category status updated successfully',
    type: CategoryResponseDto,
  })
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    const result = await this.categoriesService.toggleActive(id);
    await this.statisticsHelper.updateCategoryStatistics(id);
    return result;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.categoriesService.remove(id);
    // No need to update statistics as category is deleted
  }

  @Get(':id/collections')
  @ApiOperation({ summary: 'Get all collections in a category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Collections retrieved successfully',
  })
  async getCollections(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.categoriesService.getCollections(id, pagination);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get category statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category statistics retrieved successfully',
  })
  async getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.getStats(id);
  }

}