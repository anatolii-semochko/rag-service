import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CommonModule } from './common/common.module';
import { CollectionsModule } from './collections/collections.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';

// Simplified entities imports
import { Collection } from './collections/entities/collection.entity';
import { ChatSession } from './chat/entities/chat-session.entity';
import { ChatMessage } from './chat/entities/chat-message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL || 'postgresql://rag_user:rag_password@postgres:5432/rag_db',
      entities: [Collection, ChatSession, ChatMessage],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),

    CommonModule,
    CollectionsModule,
    ChatModule,
    SearchModule,
  ],
})
export class AppModule {}