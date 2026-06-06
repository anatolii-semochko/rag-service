import { Injectable } from '@nestjs/common';
import { SearchRequestDto } from '../dto/search-request.dto';
import { SearchResponseDto, SearchResultDto } from '../dto/search-response.dto';

@Injectable()
export class SearchService {
  async search(searchRequest: SearchRequestDto): Promise<SearchResponseDto> {
    const startTime = Date.now();

    // Mock implementation - return test data
    const mockResults: SearchResultDto[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        documentId: '456e7890-e89b-12d3-a456-426614174001',
        documentName: 'annual-report-2024.pdf',
        content: `The financial projections for Q4 show a 15% increase in revenue compared to the previous quarter.
                  This growth is primarily driven by increased demand in our core markets and successful product launches.
                  Operating margins have improved to 12.5%, exceeding our initial targets.`,
        similarity: 0.89,
        metadata: {
          chunkIndex: 5,
          tokenCount: 450,
          page: 15,
        },
      },
      {
        id: '789e0123-e89b-12d3-a456-426614174002',
        documentId: '456e7890-e89b-12d3-a456-426614174001',
        documentName: 'annual-report-2024.pdf',
        content: `Revenue growth metrics indicate strong performance across all business segments.
                  The technology division contributed 40% of total revenue, while services accounted for 35%.
                  International markets showed particularly robust growth at 22% year-over-year.`,
        similarity: 0.82,
        metadata: {
          chunkIndex: 12,
          tokenCount: 380,
          page: 28,
        },
      },
      {
        id: 'abc1234-e89b-12d3-a456-426614174003',
        documentId: '789e0123-e89b-12d3-a456-426614174002',
        documentName: 'q4-projections.docx',
        content: `Q4 financial outlook remains positive with projected revenue of $125M.
                  Cost reduction initiatives have resulted in 8% savings in operational expenses.
                  Market expansion into European regions is expected to contribute an additional $15M in revenue.`,
        similarity: 0.78,
        metadata: {
          chunkIndex: 3,
          tokenCount: 420,
          section: 'Executive Summary',
        },
      },
      {
        id: 'def5678-e89b-12d3-a456-426614174004',
        documentId: '123e4567-e89b-12d3-a456-426614174000',
        documentName: 'budget-analysis.txt',
        content: `Budget analysis for the fourth quarter reveals opportunities for cost optimization.
                  Marketing expenses can be reduced by 12% while maintaining campaign effectiveness.
                  Technology infrastructure investments of $2.5M are recommended for scaling operations.`,
        similarity: 0.75,
        metadata: {
          chunkIndex: 8,
          tokenCount: 350,
          category: 'Budget Planning',
        },
      },
    ];

    // Filter results based on threshold
    const filteredResults = mockResults.filter(result => result.similarity >= searchRequest.threshold);

    // Apply limit
    const limitedResults = filteredResults.slice(0, searchRequest.limit);

    const executionTime = Date.now() - startTime;

    return {
      results: limitedResults,
      total: filteredResults.length,
      executionTime,
    };
  }

  async searchByMetadata(metadata: Record<string, any>): Promise<SearchResultDto[]> {
    // Mock implementation - return test data filtered by metadata
    const mockResults: SearchResultDto[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        documentId: '456e7890-e89b-12d3-a456-426614174001',
        documentName: 'annual-report-2024.pdf',
        content: 'Financial content matching metadata filters...',
        similarity: 1.0, // Exact metadata match
        metadata: {
          tags: ['finance', 'annual'],
          folder: '/reports',
          department: 'finance',
        },
      },
    ];

    return mockResults;
  }
}