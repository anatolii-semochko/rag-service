import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Collection } from '../entities/collection.entity';
import { CreateCollectionDto } from '../dto/create-collection.dto';
import { UpdateCollectionDto } from '../dto/update-collection.dto';
import { CollectionResponseDto } from '../dto/collection-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class CollectionsService {
  constructor(
    @InjectRepository(Collection)
    private collectionsRepository: Repository<Collection>,
  ) {}

  async create(createCollectionDto: CreateCollectionDto): Promise<CollectionResponseDto> {
    // Mock implementation - return test data
    const mockCollection: CollectionResponseDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: createCollectionDto.name,
      description: createCollectionDto.description || null,
      documentsCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return mockCollection;
  }

  async findAll(pagination: PaginationDto): Promise<{
    data: CollectionResponseDto[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    // Mock implementation - return test data
    const mockCollections: CollectionResponseDto[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Financial Reports 2024',
        description: 'Annual financial reports and analysis',
        documentsCount: 15,
        isActive: true,
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-06-06T10:00:00.000Z',
      },
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        name: 'Marketing Materials',
        description: 'Brochures, presentations, and marketing content',
        documentsCount: 8,
        isActive: true,
        createdAt: '2024-02-01T14:30:00.000Z',
        updatedAt: '2024-05-20T16:45:00.000Z',
      },
      {
        id: '789e0123-e89b-12d3-a456-426614174002',
        name: 'Technical Documentation',
        description: null,
        documentsCount: 23,
        isActive: false,
        createdAt: '2024-03-10T09:15:00.000Z',
        updatedAt: '2024-04-05T11:20:00.000Z',
      },
    ];

    const total = mockCollections.length;
    const pages = Math.ceil(total / pagination.limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const data = mockCollections.slice(startIndex, endIndex);

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages,
      },
    };
  }

  async findOne(id: string): Promise<CollectionResponseDto> {
    // Mock implementation - return test data
    const mockCollection: CollectionResponseDto = {
      id,
      name: 'Financial Reports 2024',
      description: 'Annual financial reports and analysis',
      documentsCount: 15,
      isActive: true,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-06-06T10:00:00.000Z',
    };

    return mockCollection;
  }

  async update(id: string, updateCollectionDto: UpdateCollectionDto): Promise<CollectionResponseDto> {
    // Mock implementation - return updated test data
    const mockCollection: CollectionResponseDto = {
      id,
      name: updateCollectionDto.name || 'Financial Reports 2024',
      description: updateCollectionDto.description || 'Annual financial reports and analysis',
      documentsCount: 15,
      isActive: updateCollectionDto.isActive !== undefined ? updateCollectionDto.isActive : true,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: new Date().toISOString(),
    };

    return mockCollection;
  }

  async remove(id: string): Promise<void> {
    // Mock implementation - no actual deletion
    return;
  }
}