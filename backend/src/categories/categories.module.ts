import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesService } from './services/categories.service';
import { Category } from '../entities/category.entity';
import { Collection } from '../collections/entities/collection.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Collection])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}