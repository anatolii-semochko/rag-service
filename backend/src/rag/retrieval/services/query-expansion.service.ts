import { Injectable } from '@nestjs/common';
import { OpenAIProvider } from '../../../ai/providers/openai.provider';

export interface QueryExpansionOptions {
  maxExpansions?: number;
  includeSubQueries?: boolean;
  includeSynonyms?: boolean;
  includeRelatedTerms?: boolean;
  domainContext?: string;
}

export interface ExpandedQuery {
  originalQuery: string;
  expandedQueries: string[];
  synonyms: string[];
  relatedTerms: string[];
  subQueries: string[];
  metadata: {
    expansionMethod: string;
    totalExpansions: number;
  };
}

@Injectable()
export class QueryExpansionService {
  constructor(
    private readonly openAIProvider: OpenAIProvider,
  ) {}

  async expandQuery(
    query: string,
    options: QueryExpansionOptions = {}
  ): Promise<ExpandedQuery> {
    const {
      maxExpansions = 5,
      includeSubQueries = true,
      includeSynonyms = true,
      includeRelatedTerms = true,
      domainContext
    } = options;

    try {
      // Generate multiple types of expansions in parallel
      const expansionPromises = [];

      if (includeSynonyms) {
        expansionPromises.push(this.generateSynonyms(query, domainContext));
      }

      if (includeRelatedTerms) {
        expansionPromises.push(this.generateRelatedTerms(query, domainContext));
      }

      if (includeSubQueries) {
        expansionPromises.push(this.generateSubQueries(query, domainContext));
      }

      // Execute all expansions in parallel
      const results = await Promise.all(expansionPromises);

      let synonyms: string[] = [];
      let relatedTerms: string[] = [];
      let subQueries: string[] = [];

      if (includeSynonyms) synonyms = results[0] || [];
      if (includeRelatedTerms) relatedTerms = results[includeSynonyms ? 1 : 0] || [];
      if (includeSubQueries) {
        const subQueryIndex = (includeSynonyms ? 1 : 0) + (includeRelatedTerms ? 1 : 0);
        subQueries = results[subQueryIndex] || [];
      }

      // Generate expanded queries by combining original with expansions
      const expandedQueries = this.combineExpansions(
        query,
        synonyms,
        relatedTerms,
        subQueries,
        maxExpansions
      );

      return {
        originalQuery: query,
        expandedQueries,
        synonyms,
        relatedTerms,
        subQueries,
        metadata: {
          expansionMethod: 'ai_based',
          totalExpansions: expandedQueries.length,
        },
      };
    } catch (error) {
      console.error('Error expanding query:', error);

      // Fallback to simple keyword-based expansion
      return this.fallbackExpansion(query);
    }
  }

  private async generateSynonyms(query: string, domainContext?: string): Promise<string[]> {
    try {
      const prompt = `Generate 3-5 synonyms and alternative phrasings for this query:
"${query}"

${domainContext ? `Context: This is in the domain of ${domainContext}` : ''}

Rules:
- Provide synonyms that maintain the same meaning
- Include alternative ways to phrase the same question
- Focus on terms that would appear in relevant documents
- Return only the synonym phrases, one per line
- Do not include the original query

Examples:
Query: "machine learning algorithms"
- ML algorithms
- artificial intelligence models
- automated learning methods

Synonyms:`;

      const response = await this.openAIProvider.chat([
        { role: 'system', content: 'You are an expert at generating synonyms and alternative phrasings for search queries.' },
        { role: 'user', content: prompt }
      ], 0.4);

      return this.parseListResponse(response);
    } catch (error) {
      console.error('Error generating synonyms:', error);
      return [];
    }
  }

  private async generateRelatedTerms(query: string, domainContext?: string): Promise<string[]> {
    try {
      const prompt = `Generate 3-5 related terms and concepts for this query:
"${query}"

${domainContext ? `Context: This is in the domain of ${domainContext}` : ''}

Rules:
- Provide related concepts that might appear in relevant documents
- Include broader and narrower terms
- Include associated technologies, methods, or concepts
- Focus on terms that would help find comprehensive information
- Return only the related terms, one per line

Examples:
Query: "database optimization"
- query performance tuning
- indexing strategies
- SQL optimization
- database schema design

Related terms:`;

      const response = await this.openAIProvider.chat([
        { role: 'system', content: 'You are an expert at identifying related concepts and terms for search queries.' },
        { role: 'user', content: prompt }
      ], 0.4);

      return this.parseListResponse(response);
    } catch (error) {
      console.error('Error generating related terms:', error);
      return [];
    }
  }

  private async generateSubQueries(query: string, domainContext?: string): Promise<string[]> {
    try {
      const prompt = `Break down this complex query into 2-4 simpler sub-questions:
"${query}"

${domainContext ? `Context: This is in the domain of ${domainContext}` : ''}

Rules:
- Create specific, focused sub-questions that together answer the original query
- Each sub-question should be searchable independently
- Cover different aspects of the main query
- Make questions that would find complementary information
- Return only the sub-questions, one per line

Examples:
Query: "How to implement secure user authentication in web applications?"
- What are secure password hashing algorithms?
- How to implement session management securely?
- What are OAuth and JWT authentication methods?
- How to prevent common authentication vulnerabilities?

Sub-questions:`;

      const response = await this.openAIProvider.chat([
        { role: 'system', content: 'You are an expert at breaking down complex queries into focused sub-questions.' },
        { role: 'user', content: prompt }
      ], 0.4);

      return this.parseListResponse(response);
    } catch (error) {
      console.error('Error generating sub-queries:', error);
      return [];
    }
  }

  private parseListResponse(response: string): string[] {
    return response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('Example') && !line.includes(':'))
      .map(line => line.replace(/^[-*•]\s*/, '')) // Remove bullet points
      .filter(line => line.length > 3)
      .slice(0, 5); // Limit to 5 items
  }

  private combineExpansions(
    originalQuery: string,
    synonyms: string[],
    relatedTerms: string[],
    subQueries: string[],
    maxExpansions: number
  ): string[] {
    const expansions: string[] = [];

    // Add sub-queries first (usually most valuable)
    expansions.push(...subQueries.slice(0, Math.min(2, maxExpansions)));

    // Add queries with synonyms substituted
    if (expansions.length < maxExpansions && synonyms.length > 0) {
      const synonymExpansions = this.createSynonymQueries(originalQuery, synonyms)
        .slice(0, maxExpansions - expansions.length);
      expansions.push(...synonymExpansions);
    }

    // Add related term queries
    if (expansions.length < maxExpansions && relatedTerms.length > 0) {
      expansions.push(...relatedTerms.slice(0, maxExpansions - expansions.length));
    }

    // Remove duplicates and ensure we don't include the original query
    return [...new Set(expansions)]
      .filter(expansion => expansion.toLowerCase() !== originalQuery.toLowerCase())
      .slice(0, maxExpansions);
  }

  private createSynonymQueries(originalQuery: string, synonyms: string[]): string[] {
    const words = originalQuery.toLowerCase().split(/\s+/);
    const expansions: string[] = [];

    for (const synonym of synonyms.slice(0, 3)) {
      // Try to intelligently substitute words
      if (words.length <= 3) {
        // For short queries, try direct substitution
        expansions.push(synonym);
      } else {
        // For longer queries, try to identify key terms to replace
        const keyWords = words.filter(word => word.length > 3);
        if (keyWords.length > 0) {
          const modifiedQuery = originalQuery.replace(keyWords[0], synonym.split(' ')[0]);
          if (modifiedQuery !== originalQuery) {
            expansions.push(modifiedQuery);
          }
        }
      }
    }

    return expansions;
  }

  private fallbackExpansion(query: string): ExpandedQuery {
    // Simple keyword-based fallback
    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const expandedQueries = words.length > 1
      ? [words.slice(0, -1).join(' '), words.slice(1).join(' ')]
      : [];

    return {
      originalQuery: query,
      expandedQueries,
      synonyms: [],
      relatedTerms: [],
      subQueries: [],
      metadata: {
        expansionMethod: 'fallback_keyword',
        totalExpansions: expandedQueries.length,
      },
    };
  }
}