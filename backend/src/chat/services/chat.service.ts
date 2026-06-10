import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatRequestDto } from '../dto/chat-request.dto';
import { ChatResponseDto, ChatContextDto } from '../dto/chat-response.dto';
import { SearchService } from '../../search/services/search.service';
import { OpenAIProvider } from '../../ai/providers/openai.provider';
import { RetrievalService } from '../../rag/retrieval/services/retrieval.service';
import { RetrievalMode } from '../../rag/retrieval/enums/retrieval-mode.enum';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private chatSessionsRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private chatMessagesRepository: Repository<ChatMessage>,
    private searchService: SearchService,
    private retrievalService: RetrievalService,
    private openAIProvider: OpenAIProvider,
  ) {}

  async chat(chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    const sessionId = chatRequest.sessionId || uuidv4();

    try {
      let context: ChatContextDto[] = [];

      // 1. Use retrieval only if useRAG is enabled
      if (chatRequest.useRAG !== false) {
        // 2. Use new RetrievalService with specified mode
        const retrievalMode = chatRequest.retrievalMode || RetrievalMode.HYBRID;
        const retrievalResult = await this.retrievalService.retrieve(
          chatRequest.message,
          {
            mode: retrievalMode,
            limit: 5,
            threshold: 0.7,
            collectionIds: chatRequest.collectionIds,
            temperature: chatRequest.temperature,
            vectorWeight: chatRequest.vectorWeight,
            keywordWeight: chatRequest.keywordWeight,
          }
        );

        // 3. Convert retrieval results to context format
        context = retrievalResult.chunks.map(chunk => ({
          documentId: chunk.documentId,
          documentName: chunk.documentName,
          content: chunk.content,
          relevance: chunk.score,
          metadata: {
            vectorScore: chunk.metadata?.vectorScore,
            keywordScore: chunk.metadata?.keywordScore,
            mode: retrievalResult.metadata?.mode,
          },
        }));
      }

      // 4. Get session history for context
      const recentMessages = await this.getRecentSessionMessages(sessionId, 5);
      const conversationContext = this.formatConversationContext(recentMessages);

      // 5. Generate response using OpenAI
      const aiResponse = await this.generateAIResponse(
        chatRequest.message,
        context,
        conversationContext,
        chatRequest.context,
        chatRequest.temperature
      );

      // 6. Save user message and AI response to database
      await this.saveMessage(sessionId, 'user', chatRequest.message);
      await this.saveMessage(sessionId, 'assistant', aiResponse, context);

      const response: ChatResponseDto = {
        response: aiResponse,
        sessionId,
        context,
        timestamp: new Date().toISOString(),
      };

      return response;
    } catch (error) {
      console.error('Error in chat service:', error);

      // Fallback response
      return {
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        sessionId,
        context: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    try {
      return await this.chatMessagesRepository.find({
        where: { sessionId },
        order: { createdAt: 'ASC' }, // Show oldest first for history
      });
    } catch (error) {
      console.error('Error fetching session history:', error);
      return [];
    }
  }

  async getSessions(userId?: string): Promise<ChatSession[]> {
    try {
      const whereCondition: any = {};
      if (userId) {
        whereCondition.userId = userId;
      }

      return await this.chatSessionsRepository.find({
        where: whereCondition,
        order: { updatedAt: 'DESC' },
        relations: ['messages'],
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  private async generateAIResponse(
    userMessage: string,
    context: ChatContextDto[],
    conversationContext: string,
    additionalContext?: string,
    temperature?: number
  ): Promise<string> {
    try {
      // Build context string from retrieved documents
      const contextString = context.length > 0
        ? context.map(ctx => `Document: ${ctx.documentName}\nContent: ${ctx.content}\nRelevance: ${ctx.relevance}\n`).join('\n')
        : 'No relevant documents found in the knowledge base.';

      // Build system prompt for RAG
      const systemPrompt = `You are a helpful AI assistant with access to a knowledge base. Use the provided context to answer the user's question accurately and comprehensively.

CONTEXT FROM KNOWLEDGE BASE:
${contextString}

CONVERSATION HISTORY:
${conversationContext}

${additionalContext ? `ADDITIONAL INSTRUCTIONS: ${additionalContext}` : ''}

Instructions:
- Answer based primarily on the provided context
- If the context doesn't contain relevant information, say so clearly
- Provide specific details and quotes when available
- Be concise but comprehensive
- If you reference information, mention which document it came from
- Maintain a helpful and professional tone`;

      const response = await this.openAIProvider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ], temperature || 0.7);

      return response;
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I apologize, but I encountered an error while generating a response. Please try again.';
    }
  }

  private async getRecentSessionMessages(sessionId: string, limit: number = 10): Promise<ChatMessage[]> {
    try {
      return await this.chatMessagesRepository.find({
        where: { sessionId },
        order: { createdAt: 'DESC' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching session messages:', error);
      return [];
    }
  }

  private formatConversationContext(messages: ChatMessage[]): string {
    if (messages.length === 0) return 'No previous conversation.';

    return messages
      .reverse() // Show oldest first
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  private async saveMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    context?: ChatContextDto[]
  ): Promise<ChatMessage> {
    try {
      // Ensure session exists
      await this.ensureSessionExists(sessionId);

      const message = this.chatMessagesRepository.create({
        sessionId,
        role: role as any,
        content,
        metadata: context ? { contextSources: context.map(c => c.documentName) } : {},
      });

      return await this.chatMessagesRepository.save(message);
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  private async ensureSessionExists(sessionId: string): Promise<ChatSession> {
    let session = await this.chatSessionsRepository.findOne({
      where: { id: sessionId }
    });

    if (!session) {
      session = this.chatSessionsRepository.create({
        id: sessionId,
        title: 'New Chat',
        metadata: { messageCount: 0 },
      });
      session = await this.chatSessionsRepository.save(session);
    }

    return session;
  }
}