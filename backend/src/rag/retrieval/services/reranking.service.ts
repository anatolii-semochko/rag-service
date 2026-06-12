import { Injectable } from '@nestjs/common';
import { OpenAIProvider } from '../../../ai/providers/openai.provider';
import { RetrievalChunk } from '../interfaces/retrieval-result.interface';

export interface RerankingOptions {
  method?: 'ai_based' | 'semantic' | 'hybrid';
  maxCandidates?: number;
  diversityWeight?: number;
  freshnessBias?: number;
  authorityWeight?: number;
  queryExpectedType?: 'factual' | 'procedural' | 'conceptual' | 'comparative';
}

export interface RerankingResult {
  rerankedChunks: RetrievalChunk[];
  originalOrder: string[];
  rerankingScores: Record<string, number>;
  metadata: {
    method: string;
    candidatesEvaluated: number;
    reorderingSignificance: number;
  };
}

@Injectable()
export class RerankingService {
  constructor(
    private readonly openAIProvider: OpenAIProvider,
  ) {}

  async rerankResults(
    query: string,
    chunks: RetrievalChunk[],
    options: RerankingOptions = {}
  ): Promise<RerankingResult> {
    const {
      method = 'hybrid',
      maxCandidates = 20,
      diversityWeight = 0.2,
      freshnessBias = 0.1,
      authorityWeight = 0.1,
      queryExpectedType = 'factual'
    } = options;

    if (chunks.length === 0) {
      return {
        rerankedChunks: [],
        originalOrder: [],
        rerankingScores: {},
        metadata: {
          method,
          candidatesEvaluated: 0,
          reorderingSignificance: 0,
        },
      };
    }

    const originalOrder = chunks.map(chunk => chunk.chunkId);
    const candidatesToRerank = chunks.slice(0, maxCandidates);

    try {
      let rerankedChunks: RetrievalChunk[];

      switch (method) {
        case 'ai_based':
          rerankedChunks = await this.aiBasedReranking(query, candidatesToRerank, queryExpectedType);
          break;
        case 'semantic':
          rerankedChunks = await this.semanticReranking(query, candidatesToRerank);
          break;
        case 'hybrid':
          rerankedChunks = await this.hybridReranking(
            query,
            candidatesToRerank,
            { diversityWeight, freshnessBias, authorityWeight, queryExpectedType }
          );
          break;
        default:
          rerankedChunks = candidatesToRerank;
      }

      // Apply diversity filtering
      const diversifiedChunks = this.applyDiversityFiltering(rerankedChunks, diversityWeight);

      // Calculate reordering significance
      const reorderingSignificance = this.calculateReorderingSignificance(
        originalOrder,
        diversifiedChunks.map(chunk => chunk.chunkId)
      );

      // Generate reranking scores
      const rerankingScores: Record<string, number> = {};
      diversifiedChunks.forEach((chunk, index) => {
        rerankingScores[chunk.chunkId] = chunk.score;
      });

      return {
        rerankedChunks: diversifiedChunks,
        originalOrder,
        rerankingScores,
        metadata: {
          method,
          candidatesEvaluated: candidatesToRerank.length,
          reorderingSignificance,
        },
      };
    } catch (error) {
      console.error('Error in reranking:', error);

      // Fallback to original order with basic scoring adjustment
      return {
        rerankedChunks: candidatesToRerank,
        originalOrder,
        rerankingScores: Object.fromEntries(
          candidatesToRerank.map(chunk => [chunk.chunkId, chunk.score])
        ),
        metadata: {
          method: 'fallback',
          candidatesEvaluated: candidatesToRerank.length,
          reorderingSignificance: 0,
        },
      };
    }
  }

  private async aiBasedReranking(
    query: string,
    chunks: RetrievalChunk[],
    queryType: string
  ): Promise<RetrievalChunk[]> {
    try {
      // For efficiency, we'll batch process chunks in groups of 5
      const batchSize = 5;
      const batches: RetrievalChunk[][] = [];

      for (let i = 0; i < chunks.length; i += batchSize) {
        batches.push(chunks.slice(i, i + batchSize));
      }

      const batchResults = await Promise.all(
        batches.map((batch, batchIndex) => this.rankBatch(query, batch, queryType, batchIndex))
      );

      // Combine and sort all results
      const allRanked = batchResults.flat();
      return allRanked.sort((a, b) => (b.metadata?.aiRankingScore || b.score) - (a.metadata?.aiRankingScore || a.score));
    } catch (error) {
      console.error('Error in AI-based reranking:', error);
      return chunks;
    }
  }

  private async rankBatch(
    query: string,
    batch: RetrievalChunk[],
    queryType: string,
    batchIndex: number
  ): Promise<RetrievalChunk[]> {
    try {
      const prompt = `Rank these ${batch.length} text passages by relevance to the user query.

Query: "${query}"
Query Type: ${queryType}

Instructions:
- Rate each passage's relevance from 1-10 (10 = perfect match, 1 = irrelevant)
- Consider content quality, directness of answer, and completeness
- For ${queryType} queries, prioritize passages that provide ${this.getQueryTypeGuidance(queryType)}
- Respond with ONLY the ratings in format: "1:X 2:Y 3:Z" where X,Y,Z are scores 1-10

Passages:
${batch.map((chunk, index) => `${index + 1}: ${chunk.content.substring(0, 300)}...`).join('\n\n')}

Ratings:`;

      const response = await this.openAIProvider.chat([
        { role: 'system', content: 'You are an expert at ranking text relevance. Be precise and consistent in your ratings.' },
        { role: 'user', content: prompt }
      ], 0.2);

      return this.parseRankingResponse(response, batch);
    } catch (error) {
      console.error(`Error ranking batch ${batchIndex}:`, error);
      return batch; // Return original order if ranking fails
    }
  }

  private getQueryTypeGuidance(queryType: string): string {
    const guidance = {
      factual: 'specific facts, data, and direct answers',
      procedural: 'step-by-step instructions and how-to information',
      conceptual: 'explanations, definitions, and understanding of concepts',
      comparative: 'comparisons, pros/cons, and analytical content'
    };
    return guidance[queryType] || 'relevant and accurate information';
  }

  private parseRankingResponse(response: string, batch: RetrievalChunk[]): RetrievalChunk[] {
    try {
      const ratingsMatch = response.match(/(\d+:[0-9.]+\s*)+/g);
      if (!ratingsMatch) {
        return batch; // Return original if can't parse
      }

      const ratings: Record<number, number> = {};
      const ratingsText = ratingsMatch.join(' ');

      // Parse ratings like "1:8 2:6 3:9"
      const pairs = ratingsText.match(/(\d+):([0-9.]+)/g) || [];
      pairs.forEach(pair => {
        const [index, score] = pair.split(':');
        ratings[parseInt(index) - 1] = parseFloat(score);
      });

      // Apply ratings to chunks
      const rankedChunks = batch.map((chunk, index) => {
        const aiScore = ratings[index] || 5; // Default to middle score
        const normalizedScore = aiScore / 10; // Normalize to 0-1
        const combinedScore = (chunk.score * 0.3) + (normalizedScore * 0.7); // Blend with original score

        return {
          ...chunk,
          score: combinedScore,
          metadata: {
            ...chunk.metadata,
            aiRankingScore: normalizedScore,
            originalScore: chunk.score,
          },
        };
      });

      return rankedChunks.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error parsing ranking response:', error);
      return batch;
    }
  }

  private async semanticReranking(
    query: string,
    chunks: RetrievalChunk[]
  ): Promise<RetrievalChunk[]> {
    try {
      // Simple semantic scoring based on term overlap and semantic similarity indicators
      const queryTerms = query.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(term => term.length > 2);

      const scoredChunks = chunks.map(chunk => {
        const content = chunk.content.toLowerCase();

        // Calculate term overlap score
        const termMatches = queryTerms.filter(term => content.includes(term)).length;
        const termOverlapScore = queryTerms.length > 0 ? termMatches / queryTerms.length : 0;

        // Calculate position score (earlier mentions might be more important)
        const firstMatchPosition = queryTerms.reduce((minPos, term) => {
          const pos = content.indexOf(term);
          return pos !== -1 && pos < minPos ? pos : minPos;
        }, content.length);

        const positionScore = 1 - (firstMatchPosition / content.length);

        // Calculate content quality indicators
        const hasNumbers = /\d/.test(chunk.content);
        const hasSpecificTerms = /\b(specific|example|step|method|process|result|data)\b/i.test(chunk.content);
        const qualityScore = (hasNumbers ? 0.1 : 0) + (hasSpecificTerms ? 0.1 : 0);

        // Combine scores
        const semanticScore = (
          termOverlapScore * 0.5 +
          positionScore * 0.3 +
          qualityScore * 0.2
        );

        const combinedScore = (chunk.score * 0.4) + (semanticScore * 0.6);

        return {
          ...chunk,
          score: combinedScore,
          metadata: {
            ...chunk.metadata,
            semanticScore,
            termOverlapScore,
            positionScore,
            qualityScore,
          },
        };
      });

      return scoredChunks.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error in semantic reranking:', error);
      return chunks;
    }
  }

  private async hybridReranking(
    query: string,
    chunks: RetrievalChunk[],
    options: {
      diversityWeight: number;
      freshnessBias: number;
      authorityWeight: number;
      queryExpectedType: string;
    }
  ): Promise<RetrievalChunk[]> {
    try {
      // First apply semantic reranking
      const semanticallyRanked = await this.semanticReranking(query, chunks);

      // Then apply AI reranking to top candidates
      const topCandidates = semanticallyRanked.slice(0, Math.min(10, semanticallyRanked.length));
      const aiRanked = await this.aiBasedReranking(query, topCandidates, options.queryExpectedType);

      // Apply additional scoring factors
      const finalScored = aiRanked.map((chunk, index) => {
        // Calculate authority score (placeholder - could be based on document source, author, etc.)
        const authorityScore = chunk.documentName.includes('official') ||
                              chunk.documentName.includes('documentation') ? 0.2 : 0;

        // Calculate freshness score (placeholder - would need document dates)
        const freshnessScore = options.freshnessBias * (1 - index / aiRanked.length);

        // Combine all scores
        const finalScore = chunk.score +
                          (authorityScore * options.authorityWeight) +
                          freshnessScore;

        return {
          ...chunk,
          score: finalScore,
          metadata: {
            ...chunk.metadata,
            hybridScore: finalScore,
            authorityScore,
            freshnessScore,
          },
        };
      });

      return finalScored.sort((a, b) => b.score - a.score);
    } catch (error) {
      console.error('Error in hybrid reranking:', error);
      return chunks;
    }
  }

  private applyDiversityFiltering(chunks: RetrievalChunk[], diversityWeight: number): RetrievalChunk[] {
    if (diversityWeight <= 0 || chunks.length <= 1) {
      return chunks;
    }

    const diversified: RetrievalChunk[] = [];
    const usedDocuments = new Set<string>();
    const contentSimilarityThreshold = 0.7;

    for (const chunk of chunks) {
      let shouldAdd = true;

      // Check document diversity
      if (usedDocuments.has(chunk.documentId) && usedDocuments.size > 2) {
        // Allow some document repetition, but penalize excessive repetition
        shouldAdd = Math.random() > diversityWeight;
      }

      // Check content diversity for top candidates
      if (shouldAdd && diversified.length > 0 && diversified.length < 5) {
        const contentSimilarity = this.calculateContentSimilarity(
          chunk.content,
          diversified[diversified.length - 1].content
        );

        if (contentSimilarity > contentSimilarityThreshold) {
          shouldAdd = Math.random() > (diversityWeight * contentSimilarity);
        }
      }

      if (shouldAdd) {
        diversified.push(chunk);
        usedDocuments.add(chunk.documentId);
      }

      // Stop if we have enough diverse results
      if (diversified.length >= chunks.length) {
        break;
      }
    }

    return diversified;
  }

  private calculateContentSimilarity(content1: string, content2: string): number {
    // Simple Jaccard similarity based on word sets
    const words1 = new Set(content1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(content2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateReorderingSignificance(originalOrder: string[], newOrder: string[]): number {
    if (originalOrder.length === 0 || originalOrder.length !== newOrder.length) {
      return 0;
    }

    // Calculate Spearman rank correlation
    let sumDiffSquared = 0;
    const n = originalOrder.length;

    for (let i = 0; i < n; i++) {
      const originalRank = i + 1;
      const newRank = newOrder.indexOf(originalOrder[i]) + 1;
      const diff = originalRank - newRank;
      sumDiffSquared += diff * diff;
    }

    const spearmanCorr = 1 - (6 * sumDiffSquared) / (n * (n * n - 1));

    // Return significance as (1 - correlation), so higher values mean more reordering
    return Math.max(0, 1 - spearmanCorr);
  }
}