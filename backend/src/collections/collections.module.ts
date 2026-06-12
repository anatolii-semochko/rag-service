import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './controllers/collections.controller';
import { CollectionsService } from './services/collections.service';
import { Collection } from './entities/collection.entity';
import { Category } from '../entities/category.entity';
import { Document } from '../documents/entities/document.entity';
import { StatisticsHelper } from '../common/helpers/statistics.helper';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, Category, Document])],
  controllers: [CollectionsController],
  providers: [CollectionsService, StatisticsHelper],
  exports: [CollectionsService, StatisticsHelper],
})
export class CollectionsModule {}