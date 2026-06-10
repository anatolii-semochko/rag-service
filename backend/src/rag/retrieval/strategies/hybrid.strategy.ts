import { Injectable } from '@nestjs/common';
import { RetrievalStrategy } from '../interfaces/retrieval.interface';
import { RetrievalResult, RetrievalChunk } from '../interfaces/retrieval-result.interface';
import { RetrievalOptions } from '../interfaces/retrieval-context.interface';
import { VectorStorageService } from '../../../ai/services/vector-storage.service';
import { KeywordSearchService } from '../services/keyword-search.service';
import { OpenAIProvider } from '../../../ai/providers/openai.provider';

@Injectable()
export class HybridRetrievalStrategy implements RetrievalStrategy {
  constructor(
    private readonly vectorStorageService: VectorStorageService,
    private readonly keywordSearchService: KeywordSearchService,
    private readonly openAIProvider: OpenAIProvider,
  ) {}

  async retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<RetrievalResult> {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.5;
    const vectorWeight = options.vectorWeight || 0.7;
    const keywordWeight = options.keywordWeight || 0.3;

    // Perform both vector and keyword searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      this.performVectorSearch(query, limit, threshold, options.collectionIds),
      this.performKeywordSearch(query, limit, options.collectionIds),
    ]);

    // Create a map to merge results by chunkId
    const resultsMap = new Map<string, RetrievalChunk>();

    // Process vector results
    vectorResults.forEach((result, index) => {
      const chunkId = result.chunk.id;
      resultsMap.set(chunkId, {
        chunkId,
        documentId: result.chunk.documentId,
        documentName: result.document?.filename || 'Unknown',
        collectionId: result.document?.collectionId || '',
        collectionName: '', // Will be populated if needed
        categoryId: '', // Will be populated if needed
        content: result.chunk.content,
        score: result.similarity * vectorWeight,
        page: result.chunk.metadata?.page,
        metadata: {
          vectorScore: result.similarity,
          keywordScore: 0,
          position: index,
          length: result.chunk.content.length,
          tokenCount: result.chunk.tokenCount,
        },
      });
    });

    // Process keyword results and merge/update scores
    keywordResults.forEach((result, index) => {
      const chunkId = result.chunk.id;
      const keywordScore = result.rank * keywordWeight;

      if (resultsMap.has(chunkId)) {
        // Update existing chunk with keyword score
        const existingChunk = resultsMap.get(chunkId)!;
        existingChunk.score += keywordScore;
        existingChunk.metadata!.keywordScore = result.rank;
      } else {
        // Add new chunk from keyword search
        resultsMap.set(chunkId, {
          chunkId,
          documentId: result.chunk.documentId,
          documentName: result.document?.filename || 'Unknown',
          collectionId: result.document?.collectionId || '',
          collectionName: '',
          categoryId: '',
          content: result.chunk.content,
          score: keywordScore,
          page: result.chunk.metadata?.page,
          metadata: {
            vectorScore: 0,
            keywordScore: result.rank,
            position: index,
            length: result.chunk.content.length,
            tokenCount: result.chunk.tokenCount,
          },
        });
      }
    });

    // Convert to array and sort by combined score
    const chunks = Array.from(resultsMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const totalScore = chunks.reduce((sum, chunk) => sum + chunk.score, 0);

    return {
      chunks,
      totalScore,
      metadata: {
        vectorResults: vectorResults.length,
        keywordResults: keywordResults.length,
        processingTime: 0, // Will be filled by RetrievalService
        mode: 'hybrid',
      },
    };
  }

  private async performVectorSearch(
    query: string,
    limit: number,
    threshold: number,
    collectionIds?: string[]
  ) {
    try {
      const queryEmbedding = await this.openAIProvider.embeddings(query);
      return await this.vectorStorageService.searchSimilar(
        queryEmbedding,
        limit,
        threshold,
        collectionIds?.[0], // For now, support single collection
      );
    } catch (error) {
      console.error('Error in vector search:', error);
      return [];
    }
  }

  private async performKeywordSearch(
    query: string,
    limit: number,
    collectionIds?: string[]
  ) {
    try {
      return await this.keywordSearchService.search(query, limit, collectionIds);
    } catch (error) {
      console.error('Error in keyword search:', error);
      return [];
    }
  }

  getName(): string {
    return 'Hybrid Search Strategy (Vector + Keyword)';
  }
}