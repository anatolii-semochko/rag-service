import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';
import { Document } from './entities/document.entity';
import { Chunk } from './entities/chunk.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Category } from '../entities/category.entity';
import { QueueModule } from '../queue/queue.module';
import { StatisticsHelper } from '../common/helpers/statistics.helper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Chunk, Collection, Category]),
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
    QueueModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, StatisticsHelper],
  exports: [DocumentsService, StatisticsHelper],
})
export class DocumentsModule {}