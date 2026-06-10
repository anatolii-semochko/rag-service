import { Injectable } from '@nestjs/common';
import { RetrievalStrategy } from '../interfaces/retrieval.interface';
import { RetrievalResult, RetrievalChunk } from '../interfaces/retrieval-result.interface';
import { RetrievalOptions } from '../interfaces/retrieval-context.interface';
import { OpenAIProvider } from '../../../ai/providers/openai.provider';
import { VectorRetrievalStrategy } from './vector.strategy';
import { KeywordSearchService } from '../services/keyword-search.service';
import { HybridRetrievalStrategy } from './hybrid.strategy';
import { GraphRetrievalStrategy } from './graph.strategy';

@Injectable()
export class AgentRetrievalStrategy implements RetrievalStrategy {
  constructor(
    private readonly openAIProvider: OpenAIProvider,
    private readonly vectorStrategy: VectorRetrievalStrategy,
    private readonly hybridStrategy: HybridRetrievalStrategy,
    private readonly graphStrategy: GraphRetrievalStrategy,
    private readonly keywordSearchService: KeywordSearchService,
  ) {}

  async retrieve(
    query: string,
    options: RetrievalOptions,
  ): Promise<RetrievalResult> {
    const limit = options.limit || 10;

    try {
      // Step 1: Analyze query to determine optimal retrieval strategy
      const queryAnalysis = await this.analyzeQuery(query);

      // Step 2: Generate expanded queries if beneficial
      const expandedQueries = await this.generateQueryVariations(query, queryAnalysis);

      // Step 3: Execute retrieval using determined strategy/strategies
      const retrievalResults = await this.executeRetrievalPlan(
        query,
        expandedQueries,
        queryAnalysis,
        options
      );

      // Step 4: Merge and rerank results
      const mergedResults = await this.mergeAndRerank(query, retrievalResults, limit);

      const totalScore = mergedResults.reduce((sum, chunk) => sum + chunk.score, 0);

      return {
        chunks: mergedResults,
        totalScore,
        metadata: {
          vectorResults: retrievalResults.vector?.chunks.length || 0,
          keywordResults: retrievalResults.keyword?.chunks.length || 0,
          graphResults: retrievalResults.graph?.chunks.length || 0,
          processingTime: 0,
          mode: 'agent',
          queryAnalysis: {
            complexity: queryAnalysis.complexity,
            intent: queryAnalysis.intent,
            strategiesUsed: queryAnalysis.recommendedStrategies,
            expandedQueries: expandedQueries.length,
          },
        },
      };
    } catch (error) {
      console.error('Error in agent retrieval strategy:', error);

      // Fallback to hybrid strategy
      return await this.hybridStrategy.retrieve(query, options);
    }
  }

  private async analyzeQuery(query: string): Promise<{
    complexity: 'simple' | 'medium' | 'complex';
    intent: 'factual' | 'procedural' | 'conceptual' | 'comparative';
    keywords: string[];
    entities: string[];
    recommendedStrategies: string[];
    needsExpansion: boolean;
  }> {
    try {
      const analysisPrompt = `Analyze this search query and provide structured analysis:
Query: "${query}"

Provide analysis in this format:
COMPLEXITY: [simple/medium/complex]
INTENT: [factual/procedural/conceptual/comparative]
KEYWORDS: [comma-separated important keywords]
ENTITIES: [comma-separated named entities, concepts, or specific terms]
STRATEGIES: [comma-separated list from: vector, keyword, hybrid, graph]
NEEDS_EXPANSION: [true/false]

Analysis guidelines:
- Simple: Single concept, direct lookup
- Medium: Multiple related concepts, requires some reasoning
- Complex: Abstract concepts, requires multi-step reasoning
- Factual: Looking for specific facts or data
- Procedural: How-to or step-by-step instructions
- Conceptual: Understanding concepts or definitions
- Comparative: Comparing multiple items or concepts`;

      const response = await this.openAIProvider.chat([
        { role: 'system', content: 'You are a query analysis expert. Provide concise, structured analysis.' },
        { role: 'user', content: analysisPrompt }
      ], 0.3);

      // Parse the response
      const lines = response.split('\n');
      const analysis = {
        complexity: 'medium' as 'simple' | 'medium' | 'complex',
        intent: 'factual' as 'factual' | 'procedural' | 'conceptual' | 'comparative',
        keywords: [] as string[],
        entities: [] as string[],
        recommendedStrategies: ['hybrid'] as string[],
        needsExpansion: false,
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('COMPLEXITY:')) {
          const complexity = trimmed.split(':')[1]?.trim().toLowerCase();
          if (['simple', 'medium', 'complex'].includes(complexity)) {
            analysis.complexity = complexity as any;
          }
        } else if (trimmed.startsWith('INTENT:')) {
          const intent = trimmed.split(':')[1]?.trim().toLowerCase();
          if (['factual', 'procedural', 'conceptual', 'comparative'].includes(intent)) {
            analysis.intent = intent as any;
          }
        } else if (trimmed.startsWith('KEYWORDS:')) {
          analysis.keywords = trimmed.split(':')[1]?.split(',').map(k => k.trim()).filter(Boolean) || [];
        } else if (trimmed.startsWith('ENTITIES:')) {
          analysis.entities = trimmed.split(':')[1]?.split(',').map(e => e.trim()).filter(Boolean) || [];
        } else if (trimmed.startsWith('STRATEGIES:')) {
          analysis.recommendedStrategies = trimmed.split(':')[1]?.split(',').map(s => s.trim()).filter(Boolean) || ['hybrid'];
        } else if (trimmed.startsWith('NEEDS_EXPANSION:')) {
          analysis.needsExpansion = trimmed.split(':')[1]?.trim().toLowerCase() === 'true';
        }
      }

      return analysis;
    } catch (error) {
      console.error('Error analyzing query:', error);
      // Return safe defaults
      return {
        complexity: 'medium',
        intent: 'factual',
        keywords: query.split(/\s+/).filter(w => w.length > 2),
        entities: [],
        recommendedStrategies: ['hybrid'],
        needsExpansion: false,
      };
    }
  }

  private async generateQueryVariations(
    originalQuery: string,
    analysis: { needsExpansion: boolean; intent: string; complexity: string }
  ): Promise<string[]> {
    if (!analysis.needsExpansion) {
      return [];
    }

    try {
      const expansionPrompt = `Generate 2-3 alternative search queries for better information retrieval:

Original Query: "${originalQuery}"
Query Intent: ${analysis.intent}
Query Complexity: ${analysis.complexity}

Generate variations that:
1. Use synonyms and related terms
2. Rephrase the question differently
3. Break down complex queries into simpler parts (if complex)
4. Add context or clarify ambiguous terms

Provide only the alternative queries, one per line:`;

      const response = await this.openAIProvider.chat([
        { role: 'system', content: 'You are an expert at query expansion for information retrieval. Generate helpful query variations.' },
        { role: 'user', content: expansionPrompt }
      ], 0.4);

      return response
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('-') && line.length > 5)
        .slice(0, 3);
    } catch (error) {
      console.error('Error generating query variations:', error);
      return [];
    }
  }

  private async executeRetrievalPlan(
    query: string,
    expandedQueries: string[],
    analysis: { recommendedStrategies: string[] },
    options: RetrievalOptions
  ): Promise<{
    vector?: RetrievalResult;
    keyword?: RetrievalResult;
    hybrid?: RetrievalResult;
    graph?: RetrievalResult;
  }> {
    const results: any = {};
    const strategies = analysis.recommendedStrategies;
    const allQueries = [query, ...expandedQueries];

    // Execute strategies in parallel
    const promises: Promise<any>[] = [];

    if (strategies.includes('vector')) {
      promises.push(
        this.executeForAllQueries('vector', allQueries, options).then(result => {
          results.vector = result;
        })
      );
    }

    if (strategies.includes('keyword')) {
      promises.push(
        this.executeForAllQueries('keyword', allQueries, options).then(result => {
          results.keyword = result;
        })
      );
    }

    if (strategies.includes('hybrid')) {
      promises.push(
        this.executeForAllQueries('hybrid', allQueries, options).then(result => {
          results.hybrid = result;
        })
      );
    }

    if (strategies.includes('graph')) {
      promises.push(
        this.executeForAllQueries('graph', allQueries, options).then(result => {
          results.graph = result;
        })
      );
    }

    await Promise.all(promises);

    return results;
  }

  private async executeForAllQueries(
    strategy: string,
    queries: string[],
    options: RetrievalOptions
  ): Promise<RetrievalResult> {
    const allResults: RetrievalResult[] = [];

    for (const query of queries) {
      try {
        let result: RetrievalResult;

        switch (strategy) {
          case 'vector':
            result = await this.vectorStrategy.retrieve(query, { ...options, limit: Math.ceil((options.limit || 10) / queries.length) });
            break;
          case 'hybrid':
            result = await this.hybridStrategy.retrieve(query, { ...options, limit: Math.ceil((options.limit || 10) / queries.length) });
            break;
          case 'graph':
            result = await this.graphStrategy.retrieve(query, { ...options, limit: Math.ceil((options.limit || 10) / queries.length) });
            break;
          case 'keyword':
            const keywordResults = await this.keywordSearchService.search(query, Math.ceil((options.limit || 10) / queries.length), options.collectionIds);
            result = {
              chunks: keywordResults.map((r, index) => ({
                chunkId: r.chunk.id,
                documentId: r.chunk.documentId,
                documentName: r.document?.filename || 'Unknown',
                collectionId: r.document?.collectionId || '',
                collectionName: '',
                categoryId: '',
                content: r.chunk.content,
                score: r.rank,
                page: r.chunk.metadata?.page,
                metadata: {
                  keywordScore: r.rank,
                  position: index,
                  length: r.chunk.content.length,
                  tokenCount: r.chunk.tokenCount,
                },
              })),
              totalScore: keywordResults.reduce((sum, r) => sum + r.rank, 0),
              metadata: {
                keywordResults: keywordResults.length,
                mode: 'keyword',
              },
            };
            break;
          default:
            continue;
        }

        allResults.push(result);
      } catch (error) {
        console.error(`Error executing ${strategy} strategy:`, error);
      }
    }

    // Merge results from all queries
    if (allResults.length === 0) {
      return { chunks: [], totalScore: 0, metadata: { mode: strategy } };
    }

    if (allResults.length === 1) {
      return allResults[0];
    }

    // Merge multiple results
    const mergedChunks = new Map<string, RetrievalChunk>();
    let totalScore = 0;

    allResults.forEach((result, queryIndex) => {
      totalScore += result.totalScore;
      result.chunks.forEach(chunk => {
        const key = chunk.chunkId;
        if (mergedChunks.has(key)) {
          // Boost score for chunks found by multiple queries
          const existing = mergedChunks.get(key)!;
          existing.score = Math.max(existing.score, chunk.score) + (chunk.score * 0.1);
        } else {
          mergedChunks.set(key, { ...chunk, score: chunk.score * (1.0 - queryIndex * 0.1) });
        }
      });
    });

    const sortedChunks = Array.from(mergedChunks.values())
      .sort((a, b) => b.score - a.score);

    return {
      chunks: sortedChunks,
      totalScore,
      metadata: {
        mode: strategy,
        queriesUsed: allResults.length,
      },
    };
  }

  private async mergeAndRerank(
    query: string,
    results: any,
    limit: number
  ): Promise<RetrievalChunk[]> {
    const allChunks = new Map<string, RetrievalChunk & { sources: string[] }>();

    // Collect all unique chunks with source tracking
    Object.entries(results).forEach(([strategy, result]: [string, any]) => {
      if (!result || !result.chunks) return;

      result.chunks.forEach((chunk: RetrievalChunk) => {
        const key = chunk.chunkId;
        if (allChunks.has(key)) {
          const existing = allChunks.get(key)!;
          existing.score = Math.max(existing.score, chunk.score);
          existing.sources.push(strategy);
          // Update metadata with best scores from each strategy
          if (chunk.metadata?.vectorScore && (!existing.metadata?.vectorScore || chunk.metadata.vectorScore > existing.metadata.vectorScore)) {
            existing.metadata = existing.metadata || {};
            existing.metadata.vectorScore = chunk.metadata.vectorScore;
          }
          if (chunk.metadata?.keywordScore && (!existing.metadata?.keywordScore || chunk.metadata.keywordScore > existing.metadata.keywordScore)) {
            existing.metadata = existing.metadata || {};
            existing.metadata.keywordScore = chunk.metadata.keywordScore;
          }
        } else {
          allChunks.set(key, {
            ...chunk,
            sources: [strategy],
          });
        }
      });
    });

    // Apply multi-strategy boost
    const finalChunks = Array.from(allChunks.values()).map(chunk => {
      const multiStrategyBoost = chunk.sources.length > 1 ? 0.2 * (chunk.sources.length - 1) : 0;
      const diversityScore = chunk.sources.length / Object.keys(results).length;

      return {
        ...chunk,
        score: chunk.score + multiStrategyBoost + (diversityScore * 0.1),
        metadata: {
          ...chunk.metadata,
          agentScore: chunk.score,
          strategiesUsed: chunk.sources,
          diversityScore,
        },
      };
    });

    // Remove sources property and return sorted results
    return finalChunks
      .map(({ sources, ...chunk }) => chunk)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getName(): string {
    return 'Agent-based Adaptive Retrieval Strategy';
  }
}