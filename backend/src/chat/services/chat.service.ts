import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatRequestDto } from '../dto/chat-request.dto';
import { ChatResponseDto, ChatContextDto } from '../dto/chat-response.dto';
import { RagMode } from '../dto/enums/rag-mode.enum';
import { SearchService } from '../../search/services/search.service';
import { OpenAIProvider } from '../../ai/providers/openai.provider';
import { RetrievalService } from '../../rag/retrieval/services/retrieval.service';
import { RetrievalMode } from '../../rag/retrieval/enums/retrieval-mode.enum';
import { ChatTraceService } from './chat-trace.service';
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
    const trace = ChatTraceService.create(chatRequest.trace || false);

    trace.initialize(chatRequest.message, sessionId);

    try {
      let context: ChatContextDto[] = [];
      let aiResponse = null;
      let summary = null;

      // 1. Use retrieval only if useRAG is enabled
      const shouldUseRAG = chatRequest.ragMode && chatRequest.ragMode !== 'none';
      if (shouldUseRAG) {
        trace.addStep('retrieval_start', { ragMode: chatRequest.ragMode, strategies: chatRequest.strategies });

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
          },
          trace // Pass trace to retrieval service
        );

        trace.addStep('retrieval_complete', {
          mode: retrievalMode,
          chunksFound: retrievalResult.chunks.length,
          totalScore: retrievalResult.chunks.reduce((sum, chunk) => sum + chunk.score, 0) / retrievalResult.chunks.length
        });

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

        trace.setFinalContext(context);
      } else {
        trace.addStep('retrieval_skipped', { useRAG: false });
      }

      // 4. Get session history for context
      trace.addStep('conversation_history_start', {});
      const recentMessages = await this.getRecentSessionMessages(sessionId, 5);
      const conversationContext = this.formatConversationContext(recentMessages);
      trace.addStep('conversation_history_complete', { messagesCount: recentMessages.length });

      // 5. Generate response using OpenAI (only if not dryRun)
      if (!chatRequest.dryRun) {
        trace.addStep('llm_generation_start', { dryRun: false });

        const aiResult = await this.generateAIResponse(
          chatRequest.message,
          context,
          conversationContext,
          chatRequest.context,
          chatRequest.temperature,
          trace
        );

        aiResponse = aiResult.answer;
        summary = aiResult.summary;

        trace.addStep('llm_generation_complete', {
          responseLength: aiResponse?.length || 0,
          summaryLength: summary?.length || 0
        });
        trace.setLLMResponse(aiResponse);

        // 6. Save user message and AI response to database
        await this.saveMessage(sessionId, 'user', chatRequest.message);
        await this.saveMessage(sessionId, 'assistant', aiResponse, context);
      } else {
        trace.addStep('llm_generation_skipped', { dryRun: true });
        aiResponse = null;
      }

      const response: ChatResponseDto = {
        response: aiResponse || 'Dry run mode - LLM request skipped',
        sessionId,
        context,
        timestamp: new Date().toISOString(),
        summary: summary || 'Session interaction summary',
        trace: trace.finalize(),
      };

      return response;
    } catch (error) {
      console.error('Error in chat service:', error);
      trace.setError(error.message);

      // Fallback response
      return {
        response: 'I apologize, but I encountered an error while processing your request. Please try again.',
        sessionId,
        context: [],
        timestamp: new Date().toISOString(),
        summary: 'Error occurred during request processing',
        trace: trace.finalize(),
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
    temperature?: number,
    trace?: ChatTraceService
  ): Promise<{answer: string, summary: string}> {
    try {
      if (trace) {
        trace.addStep('prompt_construction_start', {
          contextChunks: context.length,
          conversationMessages: conversationContext ? conversationContext.split('\n').length - 1 : 0,
          hasAdditionalContext: !!additionalContext
        });
      }

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
- Maintain a helpful and professional tone

IMPORTANT: Your response must be in JSON format with two fields:
{
  "answer": "Your detailed response to the user's question",
  "summary": "A brief 1-2 sentence summary of this conversation turn for session context (what the user asked about and key points of your response)"
}

The summary should help maintain conversation context for future interactions. Focus on the main topic and key information discussed.`;

      if (trace) {
        trace.addStep('prompt_construction_complete', {
          systemPromptLength: systemPrompt.length,
          userMessageLength: userMessage.length,
          temperature: temperature || 0.7
        });
        trace.setGeneratedPrompt(systemPrompt);
      }

      const rawResponse = await this.openAIProvider.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ], temperature || 0.7);

      // Parse JSON response to extract answer and summary
      try {
        const parsedResponse = JSON.parse(rawResponse);
        if (parsedResponse.answer && parsedResponse.summary) {
          if (trace) {
            trace.addStep('response_parsed', {
              hasAnswer: !!parsedResponse.answer,
              hasSummary: !!parsedResponse.summary,
              summaryLength: parsedResponse.summary.length
            });
          }
          return {
            answer: parsedResponse.answer,
            summary: parsedResponse.summary
          };
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON response, using raw response:', parseError);
        if (trace) {
          trace.addStep('response_parse_failed', {
            error: parseError.message,
            rawResponseLength: rawResponse.length
          });
        }
      }

      // Fallback: generate basic summary from raw response
      const fallbackSummary = `User asked: "${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}"`;
      return {
        answer: rawResponse,
        summary: fallbackSummary
      };
    } catch (error) {
      console.error('Error generating AI response:', error);
      return {
        answer: 'I apologize, but I encountered an error while generating a response. Please try again.',
        summary: 'Error occurred during response generation'
      };
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