import { Module } from '@nestjs/common';
import { ChunkingService } from './services/chunking.service';
import { OpenAIProvider } from './providers/openai.provider';

@Module({
  providers: [
    ChunkingService,
    OpenAIProvider,
  ],
  exports: [
    ChunkingService,
    OpenAIProvider,
  ],
})
export class AiModule {}