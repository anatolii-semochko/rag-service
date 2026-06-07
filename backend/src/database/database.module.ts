import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Category } from '../entities/category.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Document } from '../documents/entities/document.entity';
import { Chunk } from '../documents/entities/chunk.entity';
import { ChatSession } from '../chat/entities/chat-session.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [Category, Collection, Document, Chunk, ChatSession, ChatMessage],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}