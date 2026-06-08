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
      this.setState({
        collections: response.data || [],
        loadingCollections: false
      });
    } catch (error) {
      console.error('Error fetching collections:', error);
      this.setState({ loadingCollections: false });
    }
  }

  async fetchFiles(collectionId) {
    try {
      this.setState({ loadingFiles: true });
      const response = await documentsService.getDocumentsByCollection(collectionId);
      this.setState({
        files: response.data || [],
        loadingFiles: false
      });
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
            <button class="btn-primary" onclick="window.app.openCategoryModal()" title="Add Category">➕ New Category</button>
            <button class="btn-secondary" onclick="window.app.exportData()" title="Export Data">📥 Export</button>
          </div>
        </div>

        <div class="documents-table-container">
          <table class="documents-table">
            <thead>
              <tr>
                <th width="40"></th>
                <th>Name</th>
                <th width="120">Collections</th>
                <th width="100">Files</th>
                <th width="150">Processing Status</th>
                <th width="80">Active</th>
                <th width="200">Actions</th>
              </tr>
            </thead>
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
          <td>
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
          <td class="count-cell">${collectionsCount}</td>
          <td class="count-cell">${totalFiles}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(category).class}">${this.getProcessingStatus(category).text}</span>
          </td>
          <td class="toggle-cell">
            <button class="toggle-switch ${category.isActive ? 'active' : 'inactive'}" onclick="window.app.toggleCategoryActive('${category.id}', ${category.isActive})" title="${category.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
          </td>
          <td class="actions-cell">
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
            <td colspan="7" class="expanded-cell">
              <div class="nested-table-container">
                <h4 class="nested-title">📁 Collections in Category "${stringUtils.escapeHtml(category.name)}"</h4>
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
        <thead>
          <tr>
            <th width="40"></th>
            <th>Collection Name</th>
            <th width="100">Files</th>
            <th width="150">Processing Status</th>
            <th width="80">Active</th>
            <th width="180">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    collections.forEach(collection => {
      const isExpanded = this.state.expandedCollections.has(collection.id);
      const documentsCount = collection.documentsCount || collection.documents?.length || 0;

      tableHTML += `
        <tr class="collection-row" data-collection-id="${collection.id}">
          <td>
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
          <td class="toggle-cell">
            <button class="toggle-switch ${collection.isActive ? 'active' : 'inactive'}" onclick="window.app.toggleCollectionActive('${collection.id}', ${collection.isActive})" title="${collection.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
          </td>
          <td class="actions-cell">
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
            <td colspan="6" class="expanded-cell">
              <div class="nested-table-container files-container">
                <h5 class="nested-title">📄 Files in Collection "${stringUtils.escapeHtml(collection.name)}"</h5>
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
        <thead>
          <tr>
            <th>File Name</th>
            <th width="120">Size</th>
            <th width="150">Processing Status</th>
            <th width="80">Active</th>
            <th width="140">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    files.forEach(file => {
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
          <td class="toggle-cell">
            <button class="toggle-switch ${file.isActive ? 'active' : 'inactive'}" onclick="window.app.toggleFileActive('${file.id}', ${file.isActive})" title="${file.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
          </td>
          <td class="actions-cell">
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

  async loadData() {
    // Clear expanded state to avoid stale data
    this.setState({
      expandedCategories: new Set(),
      expandedCollections: new Set(),
      categoryCollections: {},
      collectionFiles: {}
    });

    await this.fetchCategories();
    this.updateDocumentsTable();
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

      // Update local state
      const categories = [...this.state.categories];
      const category = categories.find(cat => cat.id === categoryId);
      if (category) {
        category.isActive = !isCurrentlyActive;
      }

      this.setState({ categories });
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Failed to update category status');
    }
  }

  async toggleCollectionActive(collectionId, isCurrentlyActive) {
    try {
      await collectionsService.toggleCollection(collectionId, isCurrentlyActive);

      // Update local state in categoryCollections
      const categoryCollections = { ...this.state.categoryCollections };
      for (const categoryId in categoryCollections) {
        const collection = categoryCollections[categoryId].find(col => col.id === collectionId);
        if (collection) {
          collection.isActive = !isCurrentlyActive;
          break;
        }
      }

      this.setState({ categoryCollections });
    } catch (error) {
      console.error('Error toggling collection:', error);
      alert('Failed to update collection status');
    }
  }

  async toggleFileActive(fileId, isCurrentlyActive) {
    try {
      await documentsService.toggleDocument(fileId, isCurrentlyActive);

      // Update local state in collectionFiles
      const collectionFiles = { ...this.state.collectionFiles };
      for (const collectionId in collectionFiles) {
        const file = collectionFiles[collectionId].find(f => f.id === fileId);
        if (file) {
          file.isActive = !isCurrentlyActive;
          break;
        }
      }

      this.setState({ collectionFiles });
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

        // Remove from local state
        const categories = this.state.categories.filter(cat => cat.id !== categoryId);
        this.setState({ categories });
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

        // Remove from local state
        const categoryCollections = { ...this.state.categoryCollections };
        for (const categoryId in categoryCollections) {
          categoryCollections[categoryId] = categoryCollections[categoryId].filter(col => col.id !== collectionId);
        }

        this.setState({ categoryCollections });

        // Refresh categories to update counts
        await this.fetchCategories();
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

        // Remove from local state
        const collectionFiles = { ...this.state.collectionFiles };
        for (const collectionId in collectionFiles) {
          collectionFiles[collectionId] = collectionFiles[collectionId].filter(f => f.id !== fileId);
        }

        this.setState({ collectionFiles });

        // Refresh categories to update counts
        await this.fetchCategories();
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file');
      }
    }
  }
}