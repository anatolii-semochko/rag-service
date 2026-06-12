import { Injectable } from '@nestjs/common';
import { RetrievalStrategy } from '../interfaces/retrieval.interface';
import { RetrievalResult, RetrievalChunk } from '../interfaces/retrieval-result.interface';
import { RetrievalOptions } from '../interfaces/retrieval-context.interface';
import { OpenAIProvider } from '../../../ai/providers/openai.provider';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chunk } from '../../../documents/entities/chunk.entity';
import { Document } from '../../../documents/entities/document.entity';

@Injectable()
export class GraphRetrievalStrategy implements RetrievalStrategy {
  constructor(
    private readonly openAIProvider: OpenAIProvider,
    @InjectRepository(Chunk)
    private readonly chunkRepository: Repository<Chunk>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  async retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<RetrievalResult> {
    const limit = options.limit || 10;
    const threshold = options.threshold || 0.5;

    try {
      // Step 1: Find initial seed chunks using semantic similarity
      const seedChunks = await this.findSeedChunks(query, Math.min(limit * 2, 20), threshold, options.collectionIds);

      // Step 2: Expand search using graph relationships
      const expandedChunks = await this.expandViaGraph(seedChunks, limit, options.collectionIds);

      // Step 3: Re-rank expanded results based on relevance to original query
      const rankedChunks = await this.rerankByRelevance(query, expandedChunks, limit);

      const totalScore = rankedChunks.reduce((sum, chunk) => sum + chunk.score, 0);

      return {
        chunks: rankedChunks,
        totalScore,
        metadata: {
          graphResults: rankedChunks.length,
          processingTime: 0,
          mode: 'graph',
        },
      };
    } catch (error) {
      console.error('Error in graph retrieval strategy:', error);
      return {
        chunks: [],
        totalScore: 0,
        metadata: {
          graphResults: 0,
          processingTime: 0,
          mode: 'graph',
        },
      };
    }
  }

  private async findSeedChunks(
    query: string,
    limit: number,
    threshold: number,
    collectionIds?: string[]
  ): Promise<Array<{ chunk: Chunk; document: Document; similarity: number }>> {
    try {
      const queryEmbedding = await this.openAIProvider.embeddings(query);

      // Build query to find similar chunks
      let queryBuilder = this.chunkRepository
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document')
        .where('chunk.embedding IS NOT NULL');

      if (collectionIds && collectionIds.length > 0) {
        queryBuilder = queryBuilder.andWhere('document.collectionId IN (:...collectionIds)', {
          collectionIds
        });
      }

      // For now, use a simple approach - in production, would use vector similarity
      // This is a placeholder implementation
      const chunks = await queryBuilder
        .orderBy('chunk.createdAt', 'DESC')
        .limit(limit)
        .getMany();

      return chunks.map((chunk, index) => ({
        chunk,
        document: chunk.document,
        similarity: 1.0 - (index * 0.1), // Placeholder similarity
      }));
    } catch (error) {
      console.error('Error finding seed chunks:', error);
      return [];
    }
  }

  private async expandViaGraph(
    seedResults: Array<{ chunk: Chunk; document: Document; similarity: number }>,
    limit: number,
    collectionIds?: string[]
  ): Promise<Array<{ chunk: Chunk; document: Document; score: number; graphScore: number }>> {
    const expandedChunks = new Map<string, { chunk: Chunk; document: Document; score: number; graphScore: number }>();

    for (const seedResult of seedResults) {
      // Add seed chunk
      expandedChunks.set(seedResult.chunk.id, {
        chunk: seedResult.chunk,
        document: seedResult.document,
        score: seedResult.similarity,
        graphScore: seedResult.similarity,
      });

      // Find related chunks in the same document
      const relatedChunks = await this.findRelatedChunks(seedResult.chunk, collectionIds);

      for (const related of relatedChunks) {
        if (!expandedChunks.has(related.chunk.id)) {
          expandedChunks.set(related.chunk.id, {
            chunk: related.chunk,
            document: related.document,
            score: related.relationshipScore * 0.8, // Discount for being related
            graphScore: related.relationshipScore,
          });
        }
      }
    }

    return Array.from(expandedChunks.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async findRelatedChunks(
    seedChunk: Chunk,
    collectionIds?: string[]
  ): Promise<Array<{ chunk: Chunk; document: Document; relationshipScore: number }>> {
    try {
      // Strategy 1: Find chunks in the same document (sequential relationship)
      let queryBuilder = this.chunkRepository
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document')
        .where('chunk.documentId = :documentId', { documentId: seedChunk.documentId })
        .andWhere('chunk.id != :seedId', { seedId: seedChunk.id });

      if (collectionIds && collectionIds.length > 0) {
        queryBuilder = queryBuilder.andWhere('document.collectionId IN (:...collectionIds)', {
          collectionIds
        });
      }

      const relatedInDoc = await queryBuilder
        .orderBy('ABS(chunk.chunkIndex - :seedIndex)', 'ASC')
        .setParameter('seedIndex', seedChunk.chunkIndex || 0)
        .limit(5)
        .getMany();

      // Strategy 2: Find chunks with similar content patterns (placeholder)
      const similarContent = await this.findContentSimilarChunks(seedChunk, collectionIds);

      // Combine and score relationships
      const allRelated = [
        ...relatedInDoc.map((chunk, index) => ({
          chunk,
          document: chunk.document,
          relationshipScore: Math.max(0.1, 0.8 - index * 0.15), // Higher score for closer chunks
        })),
        ...similarContent,
      ];

      return allRelated;
    } catch (error) {
      console.error('Error finding related chunks:', error);
      return [];
    }
  }

  private async findContentSimilarChunks(
    seedChunk: Chunk,
    collectionIds?: string[]
  ): Promise<Array<{ chunk: Chunk; document: Document; relationshipScore: number }>> {
    try {
      // For now, find chunks with overlapping keywords
      const seedWords = seedChunk.content
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 10); // Top 10 words

      if (seedWords.length === 0) return [];

      let queryBuilder = this.chunkRepository
        .createQueryBuilder('chunk')
        .leftJoinAndSelect('chunk.document', 'document')
        .where('chunk.id != :seedId', { seedId: seedChunk.id })
        .andWhere('chunk.documentId != :documentId', { documentId: seedChunk.documentId });

      // Add keyword matching
      const keywordConditions = seedWords.map((word, index) =>
        `LOWER(chunk.content) LIKE :word${index}`
      ).join(' OR ');

      if (keywordConditions) {
        queryBuilder = queryBuilder.andWhere(`(${keywordConditions})`);

        seedWords.forEach((word, index) => {
          queryBuilder.setParameter(`word${index}`, `%${word}%`);
        });
      }

      if (collectionIds && collectionIds.length > 0) {
        queryBuilder = queryBuilder.andWhere('document.collectionId IN (:...collectionIds)', {
          collectionIds
        });
      }

      const similarChunks = await queryBuilder
        .limit(3)
        .getMany();

      return similarChunks.map(chunk => ({
        chunk,
        document: chunk.document,
        relationshipScore: 0.3, // Base score for keyword similarity
      }));
    } catch (error) {
      console.error('Error finding content similar chunks:', error);
      return [];
    }
  }

  private async rerankByRelevance(
    query: string,
    chunks: Array<{ chunk: Chunk; document: Document; score: number; graphScore: number }>,
    limit: number
  ): Promise<RetrievalChunk[]> {
    try {
      // Simple relevance scoring based on query term matching
      const queryTerms = query.toLowerCase().split(/\s+/);

      const rankedChunks: RetrievalChunk[] = chunks.map((item, index) => {
        const content = item.chunk.content.toLowerCase();
        const termMatches = queryTerms.filter(term => content.includes(term)).length;
        const relevanceBoost = (termMatches / queryTerms.length) * 0.2;

        return {
          chunkId: item.chunk.id,
          documentId: item.chunk.documentId,
          documentName: item.document?.filename || 'Unknown',
          collectionId: item.document?.collectionId || '',
          collectionName: '',
          categoryId: '',
          content: item.chunk.content,
          score: item.score + relevanceBoost,
          page: item.chunk.metadata?.page,
          metadata: {
            graphScore: item.graphScore,
            position: index,
            length: item.chunk.content.length,
            tokenCount: item.chunk.tokenCount,
            termMatches,
          },
        };
      });

      return rankedChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('Error reranking chunks:', error);
      return [];
    }
  }

  getName(): string {
    return 'Graph Search Strategy (Relationship-based)';
  }
}