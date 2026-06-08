import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatRequestDto } from '../dto/chat-request.dto';
import { ChatResponseDto, ChatContextDto } from '../dto/chat-response.dto';
import { SearchService } from '../../search/services/search.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private chatSessionsRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private chatMessagesRepository: Repository<ChatMessage>,
    private searchService: SearchService,
  ) {}

  async chat(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = chatRequest.sessionId || uuidv4();

    // Mock context retrieval (would use searchService.search in real implementation)
    const mockContext: ChatContextDto[] = [
      {
        documentId: '456e7890-e89b-12d3-a456-426614174001',
        documentName: 'annual-report-2024.pdf',
        content: `The financial projections for Q4 show a 15% increase in revenue compared to the previous quarter.
                  Operating margins have improved to 12.5%, exceeding our initial targets.`,
        relevance: 0.89,
      },
      {
        documentId: '789e0123-e89b-12d3-a456-426614174002',
        documentName: 'q4-projections.docx',
        content: `Q4 financial outlook remains positive with projected revenue of $125M.
                  Cost reduction initiatives have resulted in 8% savings in operational expenses.`,
        relevance: 0.82,
      },
    ];

    // Mock AI response generation (would use LLM provider in real implementation)
    const mockResponse = this.generateMockResponse(chatRequest.message, mockContext);

    const response: ChatResponseDto = {
      response: mockResponse,
      sessionId,
      context: mockContext,
      timestamp: new Date().toISOString(),
    };

    return response;
  }

  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    // Mock implementation - return test data
    const mockMessages: ChatMessage[] = [
      {
        id: 'msg-1',
        sessionId,
        role: 'user' as any,
        content: 'What are the key financial metrics for Q4?',
        metadata: {},
        createdAt: new Date('2024-06-06T10:00:00Z'),
        session: null,
      },
      {
        id: 'msg-2',
        sessionId,
        role: 'assistant' as any,
        content: `Based on your financial documents, here are the key Q4 metrics:

        **Revenue Growth**: 15% increase compared to previous quarter, reaching $125M projected

        **Operating Margins**: Improved to 12.5%, exceeding initial targets

        **Cost Savings**: 8% reduction in operational expenses through cost reduction initiatives

        **Market Performance**:
        - Technology division: 40% of total revenue
        - Services: 35% of total revenue
        - International markets: 22% year-over-year growth

        **Future Outlook**: European expansion expected to contribute additional $15M in revenue.`,
        metadata: {
          contextSources: ['annual-report-2024.pdf', 'q4-projections.docx'],
        },
        createdAt: new Date('2024-06-06T10:00:30Z'),
        session: null,
      },
    ];

    return mockMessages;
  }

  async getSessions(userId?: string): Promise<ChatSession[]> {
    // Mock implementation - return test data
    const mockSessions: ChatSession[] = [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: userId || null,
        title: 'Financial Analysis Q4',
        metadata: { messageCount: 6 },
        createdAt: new Date('2024-06-06T10:00:00Z'),
        updatedAt: new Date('2024-06-06T10:15:00Z'),
        messages: [],
      },
      {
        id: '456e7890-e89b-12d3-a456-426614174001',
        userId: userId || null,
        title: 'Budget Planning Discussion',
        metadata: { messageCount: 4 },
        createdAt: new Date('2024-06-05T14:30:00Z'),
        updatedAt: new Date('2024-06-05T15:00:00Z'),
        messages: [],
      },
    ];

    return mockSessions;
  }

  private generateMockResponse(userMessage: string, context: ChatContextDto[]): string {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('financial') || lowerMessage.includes('revenue') || lowerMessage.includes('q4')) {
      return `Based on your financial documents, here are the key insights:

**Revenue Performance**: Your Q4 projections show strong growth with a 15% increase compared to the previous quarter, reaching a projected $125M.

**Operational Efficiency**: Operating margins have improved significantly to 12.5%, which exceeds the initial targets set for this quarter.

**Cost Management**: The cost reduction initiatives have been successful, resulting in 8% savings in operational expenses while maintaining service quality.

**Market Distribution**:
- Technology division contributes 40% of total revenue
- Services account for 35% of revenue
- International markets show robust 22% year-over-year growth

**Future Outlook**: The planned European market expansion is expected to contribute an additional $15M in revenue.

These metrics indicate strong financial health and positive momentum heading into the next fiscal period.`;
    }

    if (lowerMessage.includes('budget') || lowerMessage.includes('cost') || lowerMessage.includes('expense')) {
      return `Based on your budget analysis documents:

**Cost Optimization Opportunities**: There are several areas where expenses can be reduced:
- Marketing expenses can be reduced by 12% while maintaining campaign effectiveness
- Operational costs have already seen 8% reduction through recent initiatives

**Investment Recommendations**:
- Technology infrastructure investments of $2.5M are recommended for scaling operations
- This investment will support growth projections and operational efficiency

**Budget Allocation**: Current analysis shows effective resource distribution across departments with opportunities for further optimization in administrative costs.`;
    }

    return `Based on the context from your documents, I can help you with information about your business operations, financial performance, and strategic planning.

The available documents contain insights about:
- Financial projections and performance metrics
- Budget analysis and cost optimization
- Market growth and revenue distribution
- Operational efficiency improvements

Please feel free to ask specific questions about any of these areas, and I'll provide detailed insights based on your document collection.`;
  }
}