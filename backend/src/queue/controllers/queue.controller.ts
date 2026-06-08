import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FileProcessingQueueService } from '../services/file-processing-queue.service';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: FileProcessingQueueService) {}

  @Get('status/:documentId')
  @ApiOperation({
    summary: 'Get document processing status',
    description: 'Check the processing status of a specific document',
  })
  @ApiParam({ name: 'documentId', type: 'string', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Processing status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['processing', 'completed', 'failed', 'not_found'],
          description: 'Current processing status'
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocumentStatus(@Param('documentId') documentId: string) {
    const status = await this.queueService.getJobStatus(documentId);
    return {
      documentId,
      status,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get processing statistics',
    description: 'Get overall processing queue statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Processing statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        processing: {
          type: 'number',
          description: 'Number of documents currently being processed'
        },
        totalProcessed: {
          type: 'number',
          description: 'Total number of documents processed successfully'
        },
      },
    },
  })
  async getProcessingStats() {
    return await this.queueService.getProcessingStats();
  }
}