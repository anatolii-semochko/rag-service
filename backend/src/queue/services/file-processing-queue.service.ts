import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessFileJob, JobResult, QueueService } from '../interfaces/queue.interface';
import { Document } from '../../documents/entities/document.entity';
import { ChunkingService } from '../../ai/services/chunking.service';
import { OpenAIProvider } from '../../ai/providers/openai.provider';

@Injectable()
export class FileProcessingQueueService implements QueueService {
  private readonly processingJobs = new Map<string, Promise<JobResult>>();

  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private chunkingService: ChunkingService,
    private openAIProvider: OpenAIProvider,
  ) {}

  async addJob(job: ProcessFileJob): Promise<void> {
    console.log(`Adding job for document ${job.documentId}`);

    // Запускаємо обробку в фоні
    const processingPromise = this.processJob(job);
    this.processingJobs.set(job.documentId, processingPromise);

    // Обробляємо результат асинхронно
    processingPromise
      .then(async (result) => {
        await this.updateDocumentStatus(result);
        this.processingJobs.delete(job.documentId);
      })
      .catch(async (error) => {
        console.error(`Job failed for document ${job.documentId}:`, error);
        await this.updateDocumentStatus({
          documentId: job.documentId,
          status: 'failed',
          error: error.message,
          processedAt: new Date(),
        });
        this.processingJobs.delete(job.documentId);
      });
  }

  async processJob(job: ProcessFileJob): Promise<JobResult> {
    console.log(`Processing document ${job.documentId}`);

    try {
      // 1. Витягуємо текст з файлу
      const text = this.chunkingService.extractTextFromFile(
        job.fileBuffer,
        job.mimeType,
        job.filename
      );

      if (!text || text.trim().length === 0) {
        throw new Error('No text extracted from file');
      }

      // 2. Розділяємо на чанки
      const chunks = this.chunkingService.chunkText(text);

      if (chunks.length === 0) {
        throw new Error('No chunks generated from text');
      }

      console.log(`Generated ${chunks.length} chunks for document ${job.documentId}`);

      // 3. Створюємо ембеддінги для кожного чанка
      const embeddings = [];
      let totalTokens = 0;

      for (const chunk of chunks) {
        try {
          const embeddingResult = await this.openAIProvider.embeddingsWithTokens(chunk.text);
          embeddings.push({
            chunkId: chunks.indexOf(chunk),
            text: chunk.text,
            embedding: embeddingResult.embedding,
            tokens: embeddingResult.tokens,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
          });
          totalTokens += embeddingResult.tokens;
        } catch (error) {
          console.error(`Failed to create embedding for chunk ${chunks.indexOf(chunk)}:`, error);
          // Продовжуємо з іншими чанками
        }
      }

      if (embeddings.length === 0) {
        throw new Error('No embeddings created');
      }

      // 4. TODO: Зберігаємо ембеддінги в VectorDB
      console.log(`Created ${embeddings.length} embeddings for document ${job.documentId}`);

      // 5. Зберігаємо метадані в базі даних
      await this.saveProcessingMetadata(job.documentId, {
        chunks: chunks.length,
        embeddings: embeddings.length,
        totalTokens,
        extractedText: text,
      });

      return {
        documentId: job.documentId,
        status: 'completed',
        chunks: chunks.length,
        tokens: totalTokens,
        processedAt: new Date(),
      };

    } catch (error) {
      console.error(`Error processing document ${job.documentId}:`, error);
      return {
        documentId: job.documentId,
        status: 'failed',
        error: error.message,
        processedAt: new Date(),
      };
    }
  }

  private async updateDocumentStatus(result: JobResult): Promise<void> {
    try {
      const updateData: any = {
        isProcessed: result.status === 'completed',
        updatedAt: new Date(),
      };

      // Додаємо метадані про обробку
      if (result.status === 'completed') {
        updateData.metadata = {
          processedAt: result.processedAt,
          chunks: result.chunks,
          tokens: result.tokens,
          status: 'completed',
        };
      } else {
        updateData.metadata = {
          processedAt: result.processedAt,
          status: 'failed',
          error: result.error,
        };
      }

      await this.documentsRepository.update(result.documentId, updateData);

      console.log(`Updated document ${result.documentId} status: ${result.status}`);
    } catch (error) {
      console.error(`Error updating document status:`, error);
    }
  }

  private async saveProcessingMetadata(documentId: string, metadata: any): Promise<void> {
    try {
      // Тут можна зберегти додаткові метадані обробки
      // Наприклад, створити таблицю document_chunks або щось подібне
      console.log(`Saving processing metadata for document ${documentId}:`, {
        chunks: metadata.chunks,
        embeddings: metadata.embeddings,
        tokens: metadata.totalTokens,
      });
    } catch (error) {
      console.error('Error saving processing metadata:', error);
    }
  }

  async getJobStatus(documentId: string): Promise<'processing' | 'completed' | 'failed' | 'not_found'> {
    if (this.processingJobs.has(documentId)) {
      return 'processing';
    }

    // Перевіряємо статус в базі даних
    const document = await this.documentsRepository.findOne({
      where: { id: documentId }
    });

    if (!document) {
      return 'not_found';
    }

    return document.isProcessed ? 'completed' : 'failed';
  }

  async getProcessingStats(): Promise<{
    processing: number;
    totalProcessed: number;
  }> {
    const processing = this.processingJobs.size;
    const totalProcessed = await this.documentsRepository.count({
      where: { isProcessed: true }
    });

    return { processing, totalProcessed };
  }
}