import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { DocumentResponseDto } from '../dto/document-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
  ) {}

  async upload(file: Express.Multer.File, uploadDto: UploadDocumentDto): Promise<DocumentResponseDto> {
    // Mock implementation - return test data
    const mockDocument: DocumentResponseDto = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      collectionId: uploadDto.collectionId,
      originalFilename: file.originalname,
      fileType: this.getFileType(file.originalname),
      fileSize: file.size,
      status: 'processing',
      metadata: {
        ...uploadDto.metadata,
        tags: uploadDto.tags || [],
        mimeType: file.mimetype,
      },
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return mockDocument;
  }

  async findByCollection(collectionId: string, pagination: PaginationDto): Promise<{
    data: DocumentResponseDto[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    // Mock implementation - return test data
    const mockDocuments: DocumentResponseDto[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        collectionId,
        originalFilename: 'annual-report-2024.pdf',
        fileType: 'pdf',
        fileSize: 2048576,
        status: 'completed',
        metadata: { tags: ['finance', 'annual'], folder: '/reports' },
        isActive: true,
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      },
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        collectionId,
        originalFilename: 'q4-projections.docx',
        fileType: 'docx',
        fileSize: 1024000,
        status: 'completed',
        metadata: { tags: ['finance', 'projections'], department: 'finance' },
        isActive: true,
        createdAt: '2024-02-01T14:30:00.000Z',
        updatedAt: '2024-02-01T14:45:00.000Z',
      },
      {
        id: '789e0123-e89b-12d3-a456-426614174002',
        collectionId,
        originalFilename: 'budget-analysis.txt',
        fileType: 'txt',
        fileSize: 45678,
        status: 'processing',
        metadata: { tags: ['budget'], folder: '/analysis' },
        isActive: true,
        createdAt: '2024-06-06T09:15:00.000Z',
        updatedAt: '2024-06-06T09:15:00.000Z',
      },
    ];

    const total = mockDocuments.length;
    const pages = Math.ceil(total / pagination.limit);
    const startIndex = (pagination.page - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const data = mockDocuments.slice(startIndex, endIndex);

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

  async findOne(id: string): Promise<DocumentResponseDto> {
    // Mock implementation - return test data
    const mockDocument: DocumentResponseDto = {
      id,
      collectionId: '123e4567-e89b-12d3-a456-426614174000',
      originalFilename: 'annual-report-2024.pdf',
      fileType: 'pdf',
      fileSize: 2048576,
      status: 'completed',
      metadata: { tags: ['finance', 'annual'], folder: '/reports' },
      isActive: true,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z',
    };

    return mockDocument;
  }

  async toggleActive(id: string, isActive: boolean): Promise<DocumentResponseDto> {
    // Mock implementation - return updated test data
    const mockDocument: DocumentResponseDto = {
      id,
      collectionId: '123e4567-e89b-12d3-a456-426614174000',
      originalFilename: 'annual-report-2024.pdf',
      fileType: 'pdf',
      fileSize: 2048576,
      status: 'completed',
      metadata: { tags: ['finance', 'annual'], folder: '/reports' },
      isActive,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: new Date().toISOString(),
    };

    return mockDocument;
  }

  async remove(id: string): Promise<void> {
    // Mock implementation - no actual deletion
    return;
  }

  private getFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'docx':
      case 'doc':
        return 'docx';
      case 'txt':
        return 'txt';
      case 'md':
        return 'md';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      default:
        return 'txt';
    }
  }
}