import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DocumentsService } from '../services/documents.service';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { DocumentResponseDto } from '../dto/document-response.dto';
import { PaginationDto, PaginationResponseDto } from '../../common/dto/pagination.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload a document',
    description: 'Uploads a document file to a collection for processing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document upload with file and metadata',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, DOCX, TXT, MD, or image)',
        },
        collectionId: {
          type: 'string',
          format: 'uuid',
          description: 'Collection ID to add the document to',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata for the document',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags for the document',
        },
      },
      required: ['file', 'collectionId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file or input data' })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.upload(file, uploadDto);
  }

  @Get('collection/:collectionId')
  @ApiOperation({
    summary: 'Get documents by collection',
    description: 'Retrieves all documents in a specific collection',
  })
  @ApiParam({ name: 'collectionId', type: 'string', description: 'Collection ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: PaginationResponseDto<DocumentResponseDto>,
  })
  @ApiResponse({ status: 404, description: 'Collection not found' })
  async findByCollection(
    @Param('collectionId') collectionId: string,
    @Query() pagination: PaginationDto,
  ): Promise<PaginationResponseDto<DocumentResponseDto>> {
    return this.documentsService.findByCollection(collectionId, pagination);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get document by ID',
    description: 'Retrieves a specific document by its ID',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findOne(@Param('id') id: string): Promise<DocumentResponseDto> {
    return this.documentsService.findOne(id);
  }

  @Get(':id/content')
  @ApiOperation({
    summary: 'Get document content',
    description: 'Retrieves the raw content of a document',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document content retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Document content as text' },
        mimeType: { type: 'string', description: 'Original file MIME type' },
        filename: { type: 'string', description: 'Original filename' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getContent(@Param('id') id: string): Promise<{ content: string; mimeType: string; filename: string }> {
    return this.documentsService.getContent(id);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Toggle document active status',
    description: 'Activates or deactivates a document for search and chat',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Document ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isActive: {
          type: 'boolean',
          description: 'Whether the document should be active',
        },
      },
      required: ['isActive'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Document status updated successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async toggleActive(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<DocumentResponseDto> {
    return this.documentsService.toggleActive(id, isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete document',
    description: 'Permanently deletes a document and all its processed data',
  })
  @ApiParam({ name: 'id', type: 'string', description: 'Document ID' })
  @ApiResponse({ status: 204, description: 'Document deleted successfully' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.documentsService.remove(id);
  }
}