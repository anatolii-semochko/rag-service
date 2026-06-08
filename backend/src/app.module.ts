import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';

import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { CategoriesModule } from './categories/categories.module';
import { CollectionsModule } from './collections/collections.module';
import { DocumentsModule } from './documents/documents.module';
import { ChatModule } from './chat/chat.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL') || 60000,
          limit: configService.get<number>('THROTTLE_LIMIT') || 10,
        },
      ],
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),

    DatabaseModule,
    CommonModule,
    CategoriesModule,
    CollectionsModule,
    DocumentsModule,
    ChatModule,
    SearchModule,
  ],
})
export class AppModule {}