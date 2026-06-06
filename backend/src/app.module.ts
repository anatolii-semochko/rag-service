import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { CollectionsModule } from './collections/collections.module';
import { DocumentsModule } from './documents/documents.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';
import { GraphModule } from './graph/graph.module';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),

    DatabaseModule,
    AuthModule,
    CollectionsModule,
    DocumentsModule,
    EmbeddingsModule,
    ChatModule,
    SearchModule,
    GraphModule,
    ProvidersModule,
  ],
})
export class AppModule {}