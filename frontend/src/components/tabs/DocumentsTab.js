// Documents Tab Component
import { BaseComponent } from '../common/BaseComponent.js';
import { categoriesService, collectionsService, documentsService } from '../../api/services.js';
import { stringUtils } from '../../utils/helpers.js';

export class DocumentsTab extends BaseComponent {
  constructor() {
    super();

    this.state = {
      categories: [],
      selectedCategory: null,
      selectedCollection: null,
      collections: [],
      files: [],
      loadingCategories: false,
      loadingCollections: false,
      loadingFiles: false,
      expandedCategories: new Set(),
      expandedCollections: new Set(),
      categoryCollections: {},
      collectionFiles: {}
    };

    this.initializeData();
  }

  async initializeData() {
    await this.fetchCategories();
  }

  async fetchCategories() {
    try {
      this.setState({ loadingCategories: true });
      const response = await categoriesService.getCategories();
      this.setState({
        categories: response.data || [],
        loadingCategories: false
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      this.setState({ loadingCategories: false });
    }
  }

  async fetchCollections(categoryId) {
    try {
      this.setState({ loadingCollections: true });
      const response = await collectionsService.getCollectionsByCategory(categoryId);

      // Update categoryCollections object with new data for this category
      this.setState((prevState) => ({
        categoryCollections: {
          ...prevState.categoryCollections,
          [categoryId]: response.data || []
        },
        loadingCollections: false
      }));
    } catch (error) {
      console.error('Error fetching collections:', error);
      this.setState({ loadingCollections: false });
    }
  }

  async fetchFiles(collectionId) {
    try {
      this.setState({ loadingFiles: true });
      const response = await documentsService.getDocumentsByCollection(collectionId);

      // Update collectionFiles object with new data for this collection
      this.setState((prevState) => ({
        collectionFiles: {
          ...prevState.collectionFiles,
          [collectionId]: response.data || []
        },
        loadingFiles: false
      }));
    } catch (error) {
      console.error('Error fetching files:', error);
      this.setState({ loadingFiles: false });
    }
  }

  template() {
    return `
      <div class="documents-container">
        <div class="documents-header">
          <h2>📄 Document Manager</h2>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="window.app.openCategoryModal()" title="Add Category">➕ New Category</button>
            <button class="btn btn-secondary" onclick="window.app.exportData()" title="Export Data">📥 Export</button>
            <button class="btn btn-ghost" onclick="window.app.reloadDocuments()" title="Reload Data">🔄 Reload</button>
          </div>
        </div>

        <div class="documents-table-container">
          <table class="documents-table">
            <tbody id="documents-table-body">
              ${this.renderCategoriesTableRows()}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderCategoriesTableRows() {
    if (this.state.loadingCategories) {
      return '<tr><td colspan="7" class="loading-row">Loading categories...</td></tr>';
    }

    if (this.state.categories.length === 0) {
      return '<tr><td colspan="7" class="empty-row">No categories. <button class="btn-link" onclick="window.app.openCategoryModal()">Create first category</button></td></tr>';
    }

    return this.state.categories.map(category => {
      const isExpanded = this.state.expandedCategories.has(category.id);
      const collectionsCount = category.collectionsCount || 0;
      const totalFiles = category.totalDocumentsCount || 0;

      let rows = `
        <tr class="category-row" data-category-id="${category.id}">
          <td style="width: 60px">
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" onclick="window.app.toggleCategoryExpand('${category.id}')" ${collectionsCount === 0 ? 'disabled' : ''}>
              ${collectionsCount > 0 ? (isExpanded ? '▼' : '▶') : ''}
            </button>
          </td>
          <td>
            <div class="category-name-cell">
              <div class="category-color" style="background-color: ${category.color}"></div>
              <span class="category-name" ondblclick="window.app.editCategoryName('${category.id}')" title="Double click to edit">${stringUtils.escapeHtml(category.name)}</span>
            </div>
          </td>
          <td class="count-cell">${collectionsCount} / ${totalFiles}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(category).class}">${this.getProcessingStatus(category).text}</span>
          </td>
          <td class="actions-cell">
            <button class="toggle-switch ${category.isActive ? 'active' : 'inactive'}" style="margin-right: 80px" onclick="window.app.toggleCategoryActive('${category.id}', ${category.isActive})" title="${category.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
            <button class="btn-icon add-collection-btn" onclick="window.app.openCollectionModal('${category.id}')" title="Add Collection">➕</button>
            <button class="btn-icon edit-btn" onclick="window.app.editCategoryName('${category.id}')" title="Edit">✏️</button>
            <button class="btn-icon delete-btn ${collectionsCount > 0 ? 'disabled' : ''}" onclick="window.app.deleteCategoryWithConfirm('${category.id}', '${stringUtils.escapeHtml(category.name)}', ${collectionsCount > 0})" ${collectionsCount > 0 ? 'disabled' : ''} title="${collectionsCount > 0 ? 'Cannot delete category with collections' : 'Delete category'}">🗑️</button>
          </td>
        </tr>
      `;

      // Add expanded collections if needed
      if (isExpanded && this.state.categoryCollections[category.id]) {
        rows += `
          <tr class="expanded-row">
            <td colspan="5" class="expanded-cell">
              <div class="nested-table-container">
                ${this.renderCollectionsTable(category.id)}
              </div>
            </td>
          </tr>
        `;
      }

      return rows;
    }).join('');
  }

  renderCollectionsTable(categoryId) {
    const collections = this.state.categoryCollections[categoryId] || [];

    if (collections.length === 0) {
      return '<p class="empty-nested">No collections in this category</p>';
    }

    let tableHTML = `
      <table class="nested-table collections-table">
        <tbody>
    `;

    collections.forEach(collection => {
      const isExpanded = this.state.expandedCollections.has(collection.id);
      const documentsCount = collection.documentsCount || collection.documents?.length || 0;

      // Визначаємо, чи вимкнений switcher через неактивну категорію
      const category = this.state.categories.find(cat => cat.id === categoryId);
      const disabledByParent = !category || category.isActive === false;

      tableHTML += `
        <tr class="collection-row" data-collection-id="${collection.id}">
          <td width="90">
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" onclick="window.app.toggleCollectionExpand('${collection.id}')" ${documentsCount === 0 ? 'disabled' : ''}>
              ${documentsCount > 0 ? (isExpanded ? '▼' : '▶') : ''}
            </button>
          </td>
          <td>
            <span class="collection-name" ondblclick="window.app.editCollectionName('${collection.id}')" title="Double click to edit">📁 ${stringUtils.escapeHtml(collection.name)}</span>
          </td>
          <td class="count-cell">${documentsCount}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(collection).class}">${this.getProcessingStatus(collection).text}</span>
          </td>
          </td>
          <td class="actions-cell">
            <button class="toggle-switch ${collection.isActive ? 'active' : 'inactive'} ${disabledByParent ? 'disabled-by-parent' : ''}" style="margin-right: 40px" onclick="window.app.toggleCollectionActive('${collection.id}', ${collection.isActive})" title="${collection.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
            <button class="btn-icon upload-btn" onclick="window.app.openFileUpload('${collection.id}')" title="Upload Files">📤</button>
            <button class="btn-icon edit-btn" onclick="window.app.editCollectionName('${collection.id}')" title="Edit">✏️</button>
            <button class="btn-icon delete-btn ${documentsCount > 0 ? 'disabled' : ''}" onclick="window.app.deleteCollectionWithConfirm('${collection.id}', '${stringUtils.escapeHtml(collection.name)}', ${documentsCount > 0})" ${documentsCount > 0 ? 'disabled' : ''} title="${documentsCount > 0 ? 'Cannot delete collection with files' : 'Delete collection'}">🗑️</button>
          </td>
        </tr>
      `;

      // Add files table if expanded
      if (isExpanded && this.state.collectionFiles[collection.id]) {
        tableHTML += `
          <tr class="expanded-row">
            <td colspan="5" class="expanded-cell">
              <div class="nested-table-container files-container">
                ${this.renderFilesTable(collection.id)}
              </div>
            </td>
          </tr>
        `;
      }
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
  }

  renderFilesTable(collectionId) {
    const files = this.state.collectionFiles[collectionId] || [];

    if (files.length === 0) {
      return '<p class="empty-nested">No files in this collection</p>';
    }

    let tableHTML = `
      <table class="nested-table files-table">
        <tbody>
    `;

    files.forEach(file => {
      // Визначаємо, чи вимкнений switcher через неактивні батьків
      const collection = this.findCollectionInAllCategories(collectionId);
      const category = this.state.categories.find(cat =>
        this.state.categoryCollections[cat.id]?.some(col => col.id === collectionId)
      );

      const isCollectionActive = collection?.isActive !== false;
      const isCategoryActive = category?.isActive !== false;
      const disabledByParent = !isCollectionActive || !isCategoryActive;

      tableHTML += `
        <tr class="file-row" data-file-id="${file.id}">
          <td>
            <span class="file-name" onclick="window.app.previewFile('${file.id}')" title="Click to preview">
              ${this.getFileIcon(file.fileType || file.mimeType)} ${stringUtils.escapeHtml(file.originalFilename || file.filename || file.title)}
            </span>
          </td>
          <td class="size-cell">${this.formatFileSize(file.fileSize || file.size)}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(file).class}">${this.getProcessingStatus(file).text}</span>
          </td>
          <td class="actions-cell">
            <button class="toggle-switch ${file.isActive ? 'active' : 'inactive'} ${disabledByParent ? 'disabled-by-parent' : ''}" onclick="window.app.toggleFileActive('${file.id}', ${file.isActive})" title="${file.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
            <button class="btn-icon preview-btn" onclick="window.app.previewFile('${file.id}')" title="Preview Content">👁️</button>
            <button class="btn-icon reprocess-btn" onclick="window.app.reprocessDocument('${file.id}')" title="Reprocess Document">🔄</button>
            <button class="btn-icon delete-btn" onclick="window.app.deleteFileWithConfirm('${file.id}', '${stringUtils.escapeHtml(file.originalFilename || file.filename || file.title)}')" title="Delete File">🗑️</button>
          </td>
        </tr>
      `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
  }

  getProcessingStatus(item) {
    if (item.metadata?.status) {
      switch (item.metadata.status) {
        case 'completed': return { class: 'status-completed', text: 'Completed' };
        case 'processing': return { class: 'status-processing', text: 'Processing' };
        case 'failed': return { class: 'status-error', text: 'Failed' };
        default: return { class: 'status-pending', text: 'Pending' };
      }
    }
    return { class: 'status-completed', text: 'Ready' };
  }

  getFileIcon(mimeType) {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📋';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('text')) return '📄';
    return '📄';
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Event handlers (called from global scope)
  async toggleCategoryExpand(categoryId) {
    const expandedCategories = new Set(this.state.expandedCategories);

    if (expandedCategories.has(categoryId)) {
      expandedCategories.delete(categoryId);
    } else {
      expandedCategories.add(categoryId);
      // Load collections for this category
      await this.loadCategoryCollections(categoryId);
    }

    this.setState({ expandedCategories });
  }

  async loadCategoryCollections(categoryId) {
    try {
      const response = await collectionsService.getCollectionsByCategory(categoryId);
      const categoryCollections = { ...this.state.categoryCollections };
      categoryCollections[categoryId] = response.data || [];
      this.setState({ categoryCollections });
    } catch (error) {
      console.error('Error loading category collections:', error);
    }
  }

  async toggleCollectionExpand(collectionId) {
    const expandedCollections = new Set(this.state.expandedCollections);

    if (expandedCollections.has(collectionId)) {
      expandedCollections.delete(collectionId);
    } else {
      expandedCollections.add(collectionId);
      // Load files for this collection
      await this.loadCollectionFiles(collectionId);
    }

    this.setState({ expandedCollections });
  }

  async loadCollectionFiles(collectionId) {
    try {
      const response = await documentsService.getDocumentsByCollection(collectionId);
      const collectionFiles = { ...this.state.collectionFiles };
      collectionFiles[collectionId] = response.data || [];
      this.setState({ collectionFiles });
    } catch (error) {
      console.error('Error loading collection files:', error);
    }
  }

  closeEmptyExpandedItems() {
    const expandedCategories = new Set(this.state.expandedCategories);
    const expandedCollections = new Set(this.state.expandedCollections);
    let needsUpdate = false;

    // Закриваємо категорії без колекцій
    for (const categoryId of this.state.expandedCategories) {
      const category = this.state.categories.find(cat => cat.id === categoryId);
      if (!category || (category.collectionsCount || 0) === 0) {
        expandedCategories.delete(categoryId);
        needsUpdate = true;
      }
    }

    // Закриваємо колекції без файлів
    for (const collectionId of this.state.expandedCollections) {
      const files = this.state.collectionFiles[collectionId] || [];
      if (files.length === 0) {
        expandedCollections.delete(collectionId);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      this.setState({ expandedCategories, expandedCollections });
    }

  }

  findCollectionInAllCategories(collectionId) {
    for (const categoryId in this.state.categoryCollections) {
      const collection = this.state.categoryCollections[categoryId].find(col => col.id === collectionId);
      if (collection) return collection;
    }
    return null;
  }

  async loadData() {
    // Зберігаємо стани відкритих вкладок
    const expandedCategories = new Set(this.state.expandedCategories);
    const expandedCollections = new Set(this.state.expandedCollections);

    // Завантажуємо всі дані з нуля
    await this.fetchCategories();

    // Завантажуємо колекції для відкритих категорій
    const categoryCollections = {};
    for (const categoryId of expandedCategories) {
      try {
        const response = await collectionsService.getCollectionsByCategory(categoryId);
        categoryCollections[categoryId] = response.data || [];
      } catch (error) {
        console.error('Error loading collections:', error);
        categoryCollections[categoryId] = [];
      }
    }

    // Завантажуємо файли для відкритих колекцій
    const collectionFiles = {};
    for (const collectionId of expandedCollections) {
      try {
        const response = await documentsService.getDocumentsByCollection(collectionId);
        collectionFiles[collectionId] = response.data || [];
      } catch (error) {
        console.error('Error loading files:', error);
        collectionFiles[collectionId] = [];
      }
    }

    // Оновлюємо стан
    this.setState({
      categoryCollections,
      collectionFiles,
      expandedCategories,
      expandedCollections
    });

    // Закриваємо порожні вкладки і ховаємо стрілочки
    this.closeEmptyExpandedItems();
  }

  updateDocumentsTable() {
    const tbody = this.$('#documents-table-body');
    if (tbody) {
      tbody.innerHTML = this.renderCategoriesTableRows();
    }
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