import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChunkingService } from './services/chunking.service';
import { VectorStorageService } from './services/vector-storage.service';
import { OpenAIProvider } from './providers/openai.provider';
import { VectorSearchController } from './controllers/vector-search.controller';
import { Chunk } from '../documents/entities/chunk.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chunk]),
  ],
  controllers: [
    VectorSearchController,
  ],
  providers: [
    ChunkingService,
    VectorStorageService,
    OpenAIProvider,
  ],
  exports: [
    ChunkingService,
    VectorStorageService,
    OpenAIProvider,
  ],
})
export class AiModule {}