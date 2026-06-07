import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../entities/document.entity';
import { Collection } from '../../collections/entities/collection.entity';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { DocumentResponseDto } from '../dto/document-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { plainToClass } from 'class-transformer';
import * as path from 'path';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(Collection)
    private collectionsRepository: Repository<Collection>,
  ) {}

  async upload(file: Express.Multer.File, uploadDto: UploadDocumentDto): Promise<DocumentResponseDto> {
    // Validate file
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check if collection exists
    const collection = await this.collectionsRepository.findOne({
      where: { id: uploadDto.collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Create document record
    const document = this.documentsRepository.create({
      collectionId: uploadDto.collectionId,
      filename: this.generateSafeFilename(file.originalname),
      originalFilename: file.originalname,
      fileContent: file.buffer, // Store file in database
      mimeType: file.mimetype,
      fileSize: file.size,
      metadata: {
        ...uploadDto.metadata,
        tags: uploadDto.tags || [],
        mimeType: file.mimetype,
        uploadedAt: new Date().toISOString(),
      },
      isProcessed: false,
      isActive: true,
    });

    // Save to database
    const savedDocument = await this.documentsRepository.save(document);

    // Return response DTO
    return plainToClass(DocumentResponseDto, {
      id: savedDocument.id,
      collectionId: savedDocument.collectionId,
      originalFilename: savedDocument.originalFilename,
      fileType: this.getFileType(savedDocument.originalFilename),
      fileSize: savedDocument.fileSize,
      status: savedDocument.isProcessed ? 'completed' : 'processing',
      metadata: savedDocument.metadata,
      isActive: savedDocument.isActive,
      createdAt: savedDocument.createdAt.toISOString(),
      updatedAt: savedDocument.updatedAt.toISOString(),
    });
  }

  private generateSafeFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 100);
    return `${timestamp}_${name}${ext}`;
  }

  async findByCollection(collectionId: string, pagination: PaginationDto): Promise<{
    data: DocumentResponseDto[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const { page = 1, limit = 10 } = pagination;

    // Check if collection exists
    const collection = await this.collectionsRepository.findOne({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Get documents from database
    const [documents, total] = await this.documentsRepository.findAndCount({
      where: { collectionId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Convert to DTOs
    const data = documents.map(doc => plainToClass(DocumentResponseDto, {
      id: doc.id,
      collectionId: doc.collectionId,
      originalFilename: doc.originalFilename,
      fileType: this.getFileType(doc.originalFilename),
      fileSize: doc.fileSize,
      status: doc.isProcessed ? 'completed' : 'processing',
      metadata: doc.metadata,
      isActive: doc.isActive,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

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

  async findOne(id: string): Promise<DocumentResponseDto> {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return plainToClass(DocumentResponseDto, {
      id: document.id,
      collectionId: document.collectionId,
      originalFilename: document.originalFilename,
      fileType: this.getFileType(document.originalFilename),
      fileSize: document.fileSize,
      status: document.isProcessed ? 'completed' : 'processing',
      metadata: document.metadata,
      isActive: document.isActive,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    });
  }

  async getContent(id: string): Promise<{ content: string; mimeType: string; filename: string }> {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (!document.fileContent) {
      throw new NotFoundException('Document content not available');
    }

    // Convert buffer to string for text files
    let content = '';
    if (document.mimeType?.startsWith('text/') || document.mimeType === 'application/json') {
      content = document.fileContent.toString('utf-8');
    } else if (document.mimeType?.startsWith('image/')) {
      // For images, return base64
      content = `data:${document.mimeType};base64,${document.fileContent.toString('base64')}`;
    } else if (document.mimeType === 'application/pdf') {
      // For PDFs, return base64 for embedding
      content = `data:${document.mimeType};base64,${document.fileContent.toString('base64')}`;
    } else {
      // For other files, indicate content not displayable
      content = '[Binary content - not displayable as text]';
    }

    return {
      content,
      mimeType: document.mimeType,
      filename: document.originalFilename,
    };
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
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    await this.documentsRepository.delete(id);
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