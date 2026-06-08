import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chunk } from '../../documents/entities/chunk.entity';

export interface VectorSearchResult {
  chunk: Chunk;
  similarity: number;
  document?: {
    id: string;
    filename: string;
    collectionId: string;
  };
}

export interface ChunkWithEmbedding {
  documentId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  embedding: number[];
  metadata?: Record<string, any>;
}

@Injectable()
export class VectorStorageService {
  constructor(
    @InjectRepository(Chunk)
    private chunksRepository: Repository<Chunk>,
  ) {}

  /**
   * Stores chunks with their embeddings in PostgreSQL with pgvector
   */
  async storeChunks(chunks: ChunkWithEmbedding[]): Promise<Chunk[]> {
    try {
      // Create chunk objects
      const chunkEntities = chunks.map(chunk =>
        this.chunksRepository.create({
          documentId: chunk.documentId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          tokenCount: chunk.tokenCount,
          embedding: chunk.embedding,
          metadata: chunk.metadata || {},
        })
      );

      // Save to database
      const savedChunks = await this.chunksRepository.save(chunkEntities);
      console.log(`Stored ${savedChunks.length} chunks with embeddings for document ${chunks[0]?.documentId}`);

      return savedChunks;
    } catch (error) {
      console.error('Error storing chunks with embeddings:', error);
      throw error;
    }
  }

  /**
   * Deletes all chunks for a document (for reprocessing)
   */
  async deleteChunksByDocument(documentId: string): Promise<void> {
    try {
      const result = await this.chunksRepository.delete({ documentId });
      console.log(`Deleted ${result.affected || 0} chunks for document ${documentId}`);
    } catch (error) {
      console.error(`Error deleting chunks for document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Vector search for similar chunks
   */
  async searchSimilar(
    queryEmbedding: number[],
    limit: number = 10,
    threshold: number = 0.7,
    collectionId?: string
  ): Promise<VectorSearchResult[]> {
    try {
      // Base SQL query for cosine similarity
      let query = `
        SELECT
          c.*,
          d.id as document_id,
          d."originalFilename" as document_filename,
          d."collectionId" as document_collection_id,
          (1 - (c.embedding <=> $1::vector)) as similarity
        FROM chunks c
        JOIN documents d ON c."documentId" = d.id
        WHERE c.embedding IS NOT NULL
          AND d."isActive" = true
          AND (1 - (c.embedding <=> $1::vector)) >= $2
      `;

      const params: any[] = [
        `[${queryEmbedding.join(',')}]`, // embedding as string for PostgreSQL
        threshold
      ];

      // Add collection filter if needed
      if (collectionId) {
        query += ` AND d."collectionId" = $3`;
        params.push(collectionId);
      }

      query += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const results = await this.chunksRepository.query(query, params);

      return results.map((row: any) => ({
        chunk: {
          id: row.id,
          documentId: row.documentId,
          content: row.content,
          chunkIndex: row.chunkIndex,
          tokenCount: row.tokenCount,
          metadata: row.metadata,
          embedding: row.embedding,
          createdAt: row.createdAt,
        } as Chunk,
        similarity: parseFloat(row.similarity),
        document: {
          id: row.document_id,
          filename: row.document_filename,
          collectionId: row.document_collection_id,
        },
      }));
    } catch (error) {
      console.error('Error in vector similarity search:', error);
      throw error;
    }
  }

  /**
   * Gets vector database statistics
   */
  async getVectorStats(): Promise<{
    totalChunks: number;
    chunksWithEmbeddings: number;
    documentsCount: number;
    avgTokensPerChunk: number;
  }> {
    try {
      const [totalChunks] = await this.chunksRepository.query(
        'SELECT COUNT(*) as count FROM chunks'
      );

      const [chunksWithEmbeddings] = await this.chunksRepository.query(
        'SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL'
      );

      const [documentsCount] = await this.chunksRepository.query(
        'SELECT COUNT(DISTINCT "documentId") as count FROM chunks'
      );

      const [avgTokens] = await this.chunksRepository.query(
        'SELECT AVG("tokenCount") as avg FROM chunks WHERE "tokenCount" > 0'
      );

      return {
        totalChunks: parseInt(totalChunks.count),
        chunksWithEmbeddings: parseInt(chunksWithEmbeddings.count),
        documentsCount: parseInt(documentsCount.count),
        avgTokensPerChunk: parseFloat(avgTokens.avg) || 0,
      };
    } catch (error) {
      console.error('Error getting vector stats:', error);
      throw error;
    }
  }

  /**
   * Gets chunks for a specific document
   */
  async getChunksByDocument(documentId: string): Promise<Chunk[]> {
    return this.chunksRepository.find({
      where: { documentId },
      order: { chunkIndex: 'ASC' },
    });
  }
}