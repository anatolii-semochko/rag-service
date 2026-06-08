import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionsController } from './controllers/collections.controller';
import { CollectionsService } from './services/collections.service';
import { Collection } from './entities/collection.entity';
import { Category } from '../entities/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Collection, Category])],
  controllers: [CollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}