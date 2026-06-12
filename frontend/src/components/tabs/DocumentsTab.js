// Documents Tab Component
import { BaseComponent } from '../common/BaseComponent.js';
import { categoriesService, collectionsService, documentsService } from '../../api/services.js';
import { DocumentTabComponents } from '../documents/DocumentTabComponents.js';
import { DocumentTabService } from '../../services/documentTabService.js';

export class DocumentsTab extends BaseComponent {
  constructor() {
    super();

    this.state = {
      processedData: [], // now storing processed tree data
      loadingData: false,
      expandedCategories: new Set(),
      expandedCollections: new Set(),
    };

    this.documentTabService = new DocumentTabService();
    this.documentTabComponents = new DocumentTabComponents(this);
    this.initializeData();
  }

  async initializeData() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.setState({ loadingData: true });

      // PageInit -> fetchData -> precalculateData -> Render
      const rawData = await this.documentTabService.fetchData(
        this.state.expandedCategories,
        this.state.expandedCollections
      );

      const processedData = this.documentTabService.precalculateData(
        rawData.categories,
        rawData.categoryCollections,
        rawData.collectionFiles,
        rawData.expandedCategories,
        rawData.expandedCollections
      );

      this.setState({
        processedData,
        loadingData: false
      });
    } catch (error) {
      console.error('Error loading document data:', error);
      this.setState({ loadingData: false });
    }
  }

  template() {
    return `
      <div style="height: inherit; overflow: auto;">
        <div class="container-header">
          <h2>📄 Document Manager</h2>
          <div class="container-header-actions">
            <button class="btn btn-primary" onclick="window.app.openCategoryModal()" title="Add Category">➕ New Category</button>
            <button class="btn btn-secondary" onclick="window.app.exportData()" title="Export Data">📥 Export</button>
            <button class="btn btn-ghost" onclick="window.app.reloadDocuments()" title="Reload Data">🔄 Reload</button>
          </div>
        </div>
        <div class="documents-table-container">
          <table class="documents-table">
            <tbody id="documents-table-body">
              ${this.documentTabComponents.renderCategoriesTableRows()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Event handlers (called from global scope)
  async toggleCategoryExpand(categoryId) {
    const expandedCategories = new Set(this.state.expandedCategories);

    if (expandedCategories.has(categoryId)) {
      expandedCategories.delete(categoryId);
    } else {
      expandedCategories.add(categoryId);
    }

    this.setState({ expandedCategories });

    // Reload data with new state
    await this.loadData();
  }

  async toggleCollectionExpand(collectionId) {
    const expandedCollections = new Set(this.state.expandedCollections);

    if (expandedCollections.has(collectionId)) {
      expandedCollections.delete(collectionId);
    } else {
      expandedCollections.add(collectionId);
    }

    this.setState({ expandedCollections });

    // Reload data with new state
    await this.loadData();
  }

  // API action methods
  async toggleCategoryActive(categoryId, isCurrentlyActive) {
    try {
      await categoriesService.toggleCategory(categoryId, isCurrentlyActive);
      await this.loadData();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Failed to update category status');
    }
  }

  async toggleCollectionActive(collectionId, isCurrentlyActive) {
    try {
      await collectionsService.toggleCollection(collectionId, isCurrentlyActive);
      await this.loadData();
    } catch (error) {
      console.error('Error toggling collection:', error);
      alert('Failed to update collection status');
    }
  }

  async toggleFileActive(fileId, isCurrentlyActive) {
    try {
      await documentsService.toggleDocument(fileId, isCurrentlyActive);
      await this.loadData();
    } catch (error) {
      console.error('Error toggling file:', error);
      alert('Failed to update file status');
    }
  }

  async deleteCategory(categoryId, categoryName, hasCollections) {
    if (hasCollections) {
      alert('Cannot delete category with collections');
      return;
    }

    if (confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      try {
        await categoriesService.deleteCategory(categoryId);
        await this.loadData();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  }

  async deleteCollection(collectionId, collectionName, hasFiles) {
    if (hasFiles) {
      alert('Cannot delete collection with files');
      return;
    }

    if (confirm(`Are you sure you want to delete collection "${collectionName}"?`)) {
      try {
        await collectionsService.deleteCollection(collectionId);
        await this.loadData();
      } catch (error) {
        console.error('Error deleting collection:', error);
        alert('Failed to delete collection');
      }
    }
  }

  async deleteFile(fileId, fileName) {
    if (confirm(`Are you sure you want to delete file "${fileName}"?`)) {
      try {
        await documentsService.deleteDocument(fileId);
        await this.loadData();
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file');
      }
    }
  }
}