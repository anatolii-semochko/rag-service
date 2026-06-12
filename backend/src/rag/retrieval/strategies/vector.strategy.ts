import { Injectable } from '@nestjs/common';
import { RetrievalStrategy } from '../interfaces/retrieval.interface';
import { RetrievalResult, RetrievalChunk } from '../interfaces/retrieval-result.interface';
import { RetrievalOptions } from '../interfaces/retrieval-context.interface';
import { VectorStorageService } from '../../../ai/services/vector-storage.service';
import { OpenAIProvider } from '../../../ai/providers/openai.provider';

@Injectable()
export class VectorRetrievalStrategy implements RetrievalStrategy {
  constructor(
    private readonly vectorStorageService: VectorStorageService,
    private readonly openAIProvider: OpenAIProvider,
  ) {}

  async retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<RetrievalResult> {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.7;

    // Generate embedding for the query
    const queryEmbedding = await this.openAIProvider.embeddings(query);

    // Perform vector search
    const results = await this.vectorStorageService.searchSimilar(
      queryEmbedding,
      limit,
      threshold,
      options.collectionIds?.[0], // For now, support single collection
    );

    // Transform results to RetrievalChunk format
    const chunks: RetrievalChunk[] = results.map((result, index) => ({
      chunkId: result.chunk.id,
      documentId: result.chunk.documentId,
      documentName: result.document?.filename || 'Unknown',
      collectionId: result.document?.collectionId || '',
      collectionName: '', // Will be populated by service if needed
      categoryId: '', // Will be populated by service if needed
      content: result.chunk.content,
      score: result.similarity,
      page: result.chunk.metadata?.page,
      metadata: {
        vectorScore: result.similarity,
        position: index,
        length: result.chunk.content.length,
        tokenCount: result.chunk.tokenCount,
      },
    }));

    const totalScore = chunks.reduce((sum, chunk) => sum + chunk.score, 0);

    return {
      chunks,
      totalScore,
      metadata: {
        vectorResults: chunks.length,
        processingTime: 0, // Will be filled by RetrievalService
        mode: 'vector',
      },
    };
  }

  getName(): string {
    return 'Vector Search Strategy';
  }
}