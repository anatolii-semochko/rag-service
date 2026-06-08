import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';
import { ChatRequestDto } from '../dto/chat-request.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { ChatMessage } from '../entities/chat-message.entity';
import { ChatSession } from '../entities/chat-session.entity';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'Send chat message',
    description: 'Sends a message to the RAG-enabled chatbot and receives AI-generated response',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat response generated successfully',
    type: ChatResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid chat request' })
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    return this.chatService.chat(chatRequest);
  }

  @Get('sessions')
  @ApiOperation({
    summary: 'Get chat sessions',
    description: 'Retrieves all chat sessions for a user',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'User ID to filter sessions',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat sessions retrieved successfully',
    type: [ChatSession],
  })
  async getSessions(@Query('userId') userId?: string): Promise<ChatSession[]> {
    return this.chatService.getSessions(userId);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({
    summary: 'Get session chat history',
    description: 'Retrieves all messages from a specific chat session',
  })
  @ApiParam({ name: 'sessionId', type: 'string', description: 'Chat session ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat history retrieved successfully',
    type: [ChatMessage],
  })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionHistory(@Param('sessionId') sessionId: string): Promise<ChatMessage[]> {
    return this.chatService.getSessionHistory(sessionId);
  }
}