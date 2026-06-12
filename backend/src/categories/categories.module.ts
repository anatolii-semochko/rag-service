import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesService } from './services/categories.service';
import { Category } from '../entities/category.entity';
import { Collection } from '../collections/entities/collection.entity';
import { Document } from '../documents/entities/document.entity';
import { StatisticsHelper } from '../common/helpers/statistics.helper';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Collection, Document])],
  controllers: [CategoriesController],
  providers: [CategoriesService, StatisticsHelper],
  exports: [CategoriesService, StatisticsHelper],
})
export class CategoriesModule {}