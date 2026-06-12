import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Collection } from '../entities/collection.entity';
import { Category } from '../../entities/category.entity';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { CollectionResponseDto } from '../dto/collection-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private collectionsRepository: Repository<Collection>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(createCollectionDto: CreateCollectionDto): Promise<CollectionResponseDto> {
    // Check if category exists
    const category = await this.categoryRepository.findOne({
      where: { id: createCollectionDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if collection with same name already exists in this category
    const existingCollection = await this.collectionsRepository.findOne({
      where: {
        name: createCollectionDto.name,
        categoryId: createCollectionDto.categoryId
      },
    });

    if (existingCollection) {
      throw new ConflictException('Collection with this name already exists in this category');
    }

    const collection = this.collectionsRepository.create({
      ...createCollectionDto,
      isActive: true,
    });
    const savedCollection = await this.collectionsRepository.save(collection);

    return plainToClass(CollectionResponseDto, {
      ...savedCollection,
      documentsCount: savedCollection.documentsCount,
    });
  }

  async findAll(pagination: PaginationDto): Promise<{
    data: CollectionResponseDto[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { page = 1, limit = 10 } = pagination;

    const [collections, total] = await this.collectionsRepository.findAndCount({
      relations: ['category'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = collections.map(collection =>
      plainToClass(CollectionResponseDto, {
        ...collection,
        documentsCount: collection.documentsCount,
      }),
    );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<CollectionResponseDto> {
    const collection = await this.collectionsRepository.findOne({
      where: { id },
      relations: ['category'],
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    return plainToClass(CollectionResponseDto, {
      ...collection,
      documentsCount: collection.documentsCount,
    });
  }

  async update(id: string, updateCollectionDto: UpdateCollectionDto): Promise<CollectionResponseDto> {
    const collection = await this.findOne(id);

    // If categoryId is being changed, verify the new category exists
    if (updateCollectionDto.categoryId && updateCollectionDto.categoryId !== collection.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateCollectionDto.categoryId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    // Check for name conflicts if name or category is being updated
    const targetCategoryId = updateCollectionDto.categoryId || collection.categoryId;
    const targetName = updateCollectionDto.name || collection.name;

    if ((updateCollectionDto.name && updateCollectionDto.name !== collection.name) ||
        (updateCollectionDto.categoryId && updateCollectionDto.categoryId !== collection.categoryId)) {
      const existingCollection = await this.collectionsRepository.findOne({
        where: {
          name: targetName,
          categoryId: targetCategoryId
        },
      });

      if (existingCollection && existingCollection.id !== id) {
        throw new ConflictException('Collection with this name already exists in this category');
      }
    }

    await this.collectionsRepository.update(id, updateCollectionDto);
    return this.findOne(id);
  }

  async toggleActive(id: string): Promise<CollectionResponseDto> {
    const collection = await this.collectionsRepository.findOne({ where: { id } });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    collection.isActive = !collection.isActive;
    await this.collectionsRepository.save(collection);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const collection = await this.collectionsRepository.findOne({
      where: { id },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    if (collection.documentsCount > 0) {
      throw new ConflictException(
        'Cannot delete collection with existing documents. Delete documents first.',
      );
    }

    await this.collectionsRepository.delete(id);
  }

  async getDocuments(id: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;

    const collection = await this.collectionsRepository.findOne({ where: { id } });
    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // For now, return empty array until documents are implemented
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        pages: 0,
      },
    };
  }

  async findByCategory(categoryId: string, pagination: PaginationDto) {
    const { page = 1, limit = 10 } = pagination;

    const [collections, total] = await this.collectionsRepository.findAndCount({
      where: { categoryId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = collections.map(collection =>
      plainToClass(CollectionResponseDto, {
        ...collection,
        documentsCount: collection.documentsCount,
      }),
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

  async getActiveCollections(): Promise<CollectionResponseDto[]> {
    const collections = await this.collectionsRepository.find({
      where: {
        isActive: true,
        category: {
          isActive: true,
        },
      },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });

    return collections.map(collection =>
      plainToClass(CollectionResponseDto, {
        ...collection,
        documentsCount: collection.documentsCount,
      }),
    );
  }
}