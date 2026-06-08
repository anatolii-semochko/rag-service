import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './controllers/chat.controller';
import { ChatService } from './services/chat.service';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatSession, ChatMessage]),
    SearchModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}