import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chunk } from '../../../documents/entities/chunk.entity';

export interface KeywordSearchResult {
  chunk: Chunk;
  rank: number;
  document?: {
    id: string;
    filename: string;
    collectionId: string;
  };
}

@Injectable()
export class KeywordSearchService {
  constructor(
    @InjectRepository(Chunk)
    private chunksRepository: Repository<Chunk>,
  ) {}

  /**
   * Full text search using PostgreSQL's built-in FTS
   */
  async search(
    query: string,
    limit: number = 10,
    collectionIds?: string[]
  ): Promise<KeywordSearchResult[]> {
    try {
      // Prepare the tsquery - escape special characters and format
      const tsQuery = query
        .replace(/[!@#$%^&*()_+=\[\]{}|\\:";'<>?,./]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => `${word}:*`)
        .join(' | ');

      if (!tsQuery) {
        return [];
      }

      // Base SQL query for full text search
      let sqlQuery = `
        SELECT
          c.*,
          d.id as document_id,
          d."originalFilename" as document_filename,
          d."collectionId" as document_collection_id,
          ts_rank(c."searchVector", to_tsquery('english', $1)) as rank
        FROM chunks c
        JOIN documents d ON c."documentId" = d.id
        WHERE c."searchVector" @@ to_tsquery('english', $1)
          AND d."isActive" = true
      `;

      const params: any[] = [tsQuery];

      // Add collection filter if needed
      if (collectionIds && collectionIds.length > 0) {
        const collectionPlaceholders = collectionIds.map((_, index) => `$${index + 2}`).join(', ');
        sqlQuery += ` AND d."collectionId" IN (${collectionPlaceholders})`;
        params.push(...collectionIds);
      }

      sqlQuery += ` ORDER BY rank DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const results = await this.chunksRepository.query(sqlQuery, params);

      return results.map((row: any) => ({
        chunk: {
          id: row.id,
          documentId: row.documentId,
          content: row.content,
          chunkIndex: row.chunkIndex,
          tokenCount: row.tokenCount,
          metadata: row.metadata,
          embedding: row.embedding,
          searchVector: row.searchVector,
          createdAt: row.createdAt,
        } as Chunk,
        rank: parseFloat(row.rank),
        document: {
          id: row.document_id,
          filename: row.document_filename,
          collectionId: row.document_collection_id,
        },
      }));
    } catch (error) {
      console.error('Error in keyword search:', error);
      throw error;
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<{
    totalSearchableChunks: number;
    avgRankScore: number;
  }> {
    try {
      const [searchableChunks] = await this.chunksRepository.query(
        'SELECT COUNT(*) as count FROM chunks WHERE "searchVector" IS NOT NULL'
      );

      return {
        totalSearchableChunks: parseInt(searchableChunks.count),
        avgRankScore: 0, // Could be calculated based on sample queries
      };
    } catch (error) {
      console.error('Error getting search stats:', error);
      throw error;
    }
  }

  /**
   * Update search vectors for existing chunks (for migration)
   */
  async updateSearchVectors(): Promise<void> {
    try {
      await this.chunksRepository.query(`
        UPDATE chunks
        SET "searchVector" = to_tsvector('english', content)
        WHERE "searchVector" IS NULL AND content IS NOT NULL
      `);
      console.log('Updated search vectors for all chunks');
    } catch (error) {
      console.error('Error updating search vectors:', error);
      throw error;
    }
  }
}