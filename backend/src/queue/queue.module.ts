import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileProcessingQueueService } from './services/file-processing-queue.service';
import { QueueController } from './controllers/queue.controller';
import { Document } from '../documents/entities/document.entity';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    AiModule,
  ],
  controllers: [QueueController],
  providers: [
    FileProcessingQueueService,
  ],
  exports: [
    FileProcessingQueueService,
  ],
})
export class QueueModule {}