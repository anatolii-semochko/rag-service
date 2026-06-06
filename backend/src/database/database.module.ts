import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Collection } from '../collections/entities/collection.entity';
import { Document } from '../documents/entities/document.entity';
import { Chunk } from '../embeddings/entities/chunk.entity';
import { Embedding } from '../embeddings/entities/embedding.entity';
import { Entity } from '../graph/entities/entity.entity';
import { Relation } from '../graph/entities/relation.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        entities: [Collection, Document, Chunk, Embedding, Entity, Relation],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}