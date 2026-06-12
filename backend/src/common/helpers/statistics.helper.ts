import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Collection } from '../../collections/entities/collection.entity';
import { Document } from '../../documents/entities/document.entity';

@Injectable()
export class StatisticsHelper {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Collection)
    private readonly collectionRepository: Repository<Collection>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
  ) {}

  /**
   * Update statistics for all entities (categories and collections)
   */
  async updateAllStatistics(): Promise<void> {
    await this.updateCollectionStatistics();
    await this.updateCategoryStatistics();
  }

  /**
   * Update statistics for a specific category
   */
  async updateCategoryStatistics(categoryId?: string): Promise<void> {
    const whereCondition = categoryId ? { where: { id: categoryId } } : {};
    const categories = await this.categoryRepository.find(whereCondition);

    for (const category of categories) {
      await this.calculateCategoryStatistics(category.id);
    }
  }

  /**
   * Update statistics for a specific collection
   */
  async updateCollectionStatistics(collectionId?: string): Promise<void> {
    const whereCondition = collectionId ? { where: { id: collectionId } } : {};
    const collections = await this.collectionRepository.find(whereCondition);

    for (const collection of collections) {
      await this.calculateCollectionStatistics(collection.id);
    }
  }

  /**
   * Calculate and save statistics for a specific category
   */
  private async calculateCategoryStatistics(categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
      relations: ['collections', 'collections.documents'],
    });

    if (!category) return;

    let totalCollections = 0;
    let totalFiles = 0;
    let activeCollections = 0;
    let activeDocuments = 0;

    for (const collection of category.collections) {
      totalCollections++;

      if (collection.isActive) {
        activeCollections++;
      }

      const collectionFiles = collection.documents || [];
      totalFiles += collectionFiles.length;

      // Count active files
      const activeCollectionFiles = collectionFiles.filter(doc => doc.isActive);
      activeDocuments += activeCollectionFiles.length;
    }

    // Determine category status
    const isEmpty = totalCollections === 0 || totalFiles === 0;
    const inUse = activeCollections > 0 && activeDocuments > 0;

    // Update category with calculated statistics
    await this.categoryRepository.update(categoryId, {
      collectionsCount: totalCollections,
      documentsCount: totalFiles,
      activeCollections,
      activeDocuments,
      isEmpty,
      inUse,
    });
  }

  /**
   * Calculate and save statistics for a specific collection
   */
  private async calculateCollectionStatistics(collectionId: string): Promise<void> {
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
      relations: ['documents'],
    });

    if (!collection) return;

    const totalFiles = collection.documents?.length || 0;
    const activeDocuments = collection.documents?.filter(doc => doc.isActive).length || 0;

    // Determine collection status
    const isEmpty = totalFiles === 0;
    const inUse = collection.isActive && activeDocuments > 0;

    // Update collection with calculated statistics
    await this.collectionRepository.update(collectionId, {
      documentsCount: totalFiles,
      activeDocuments,
      isEmpty,
      inUse,
    });
  }

  /**
   * Update statistics for collections that belong to a specific category
   */
  async updateCollectionStatisticsByCategory(categoryId: string): Promise<void> {
    const collections = await this.collectionRepository.find({
      where: { categoryId },
    });

    for (const collection of collections) {
      await this.calculateCollectionStatistics(collection.id);
    }
  }

  /**
   * Update statistics after document changes
   */
  async updateStatisticsAfterDocumentChange(collectionId: string): Promise<void> {
    // Update collection statistics first
    await this.updateCollectionStatistics(collectionId);

    // Find the category and update its statistics
    const collection = await this.collectionRepository.findOne({
      where: { id: collectionId },
      select: ['categoryId'],
    });

    if (collection) {
      await this.updateCategoryStatistics(collection.categoryId);
    }
  }
}