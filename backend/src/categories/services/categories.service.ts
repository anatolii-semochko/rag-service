import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Category } from '../../entities/category.entity';
import { Collection } from '../../collections/entities/collection.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CategoryResponseDto } from '../dto/category-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

interface CategoryFilters {
  search?: string;
  isActive?: boolean;
}

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultCategoryExists();
  }

  private async ensureDefaultCategoryExists() {
    const categoriesCount = await this.categoryRepository.count();

    if (categoriesCount === 0) {
      console.log('🎯 Creating default category and collection...');

      // Create default category
      const defaultCategory = this.categoryRepository.create({
        name: 'General Documents',
        description: 'Default category for your documents',
        color: '#007bff',
        isActive: true,
      });

      const savedCategory = await this.categoryRepository.save(defaultCategory);

      console.log(`✅ Created default category: ${savedCategory.name}`);
    }
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
    // Check if category with same name already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = this.categoryRepository.create(createCategoryDto);
    const savedCategory = await this.categoryRepository.save(category);

    return plainToClass(CategoryResponseDto, {
      ...savedCategory,
      collections: [],
    });
  }

  async findAll(
    pagination: PaginationDto,
    filters: CategoryFilters = {},
  ) {
    const { page = 1, limit = 10 } = pagination;
    const { search, isActive } = filters;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .leftJoinAndSelect('category.collections', 'collections')
      .orderBy('category.createdAt', 'DESC');

    if (search) {
      queryBuilder.andWhere('category.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (typeof isActive === 'boolean') {
      queryBuilder.andWhere('category.isActive = :isActive', { isActive });
    }

    const [categories, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const data = categories.map(category =>
      plainToClass(CategoryResponseDto, category),
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['collections'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return plainToClass(CategoryResponseDto, category);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.findOne(id);

    // Check for name conflicts if name is being updated
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    await this.categoryRepository.update(id, updateCategoryDto);
    return this.findOne(id);
  }

  async toggleActive(id: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.isActive = !category.isActive;
    await this.categoryRepository.save(category);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['collections'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.collections && category.collections.length > 0) {
      throw new ConflictException(
        'Cannot delete category with existing collections. Delete collections first.',
      );
    }

    await this.categoryRepository.delete(id);
  }

  async getCollections(id: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;

    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const [collections, total] = await this.collectionRepository.findAndCount({
      where: { categoryId: id },
      relations: ['documents'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: collections,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStats(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['collections', 'collections.documents'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const totalCollections = category.collections.length;
    const activeCollections = category.collections.filter(c => c.isActive).length;
    const totalDocuments = category.collections.reduce(
      (sum, collection) => sum + collection.documents.length,
      0,
    );
    const activeDocuments = category.collections.reduce(
      (sum, collection) =>
        sum + collection.documents.filter(d => d.isActive).length,
      0,
    );

    return {
      categoryId: id,
      categoryName: category.name,
      totalCollections,
      activeCollections,
      totalDocuments,
      activeDocuments,
      isActive: category.isActive,
    };
  }
}