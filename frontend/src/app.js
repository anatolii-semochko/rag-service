// RAG Service Frontend - Vanilla JavaScript
// ==========================================

import config from './config.js';

class RAGApp {
  constructor() {
    this.activeTab = 'chat';
    this.categories = [];
    this.selectedCategory = null;
    this.selectedCollection = null;
    this.collections = [];
    this.files = [];
    this.loadingCategories = false;
    this.loadingCollections = false;
    this.loadingFiles = false;

    // New table-based properties
    this.expandedCategories = new Set();
    this.expandedCollections = new Set();
    this.categoryCollections = {};
    this.collectionFiles = {};

    // File upload properties
    this.selectedFiles = [];
    this.uploadCollectionId = null;

    this.init();
  }

  async init() {
    // Load active tab from localStorage
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && ['chat', 'documents', 'audit'].includes(savedTab)) {
      this.activeTab = savedTab;
    }

    // Fetch categories first
    await this.fetchCategories();

    // Then render the page
    this.render();

    // Update UI components after render
    setTimeout(() => {
      this.updateCategoriesList();
      this.updateCollectionsList();
      this.updateFilesList();
      this.updateAddCollectionButton();
      this.updateDocumentsTable(); // Update new table structure
    }, 100);
  }

  // API Methods
  async fetchCategories() {
    try {
      console.log('fetchCategories started');
      this.loadingCategories = true;
      const response = await fetch(config.getCategoriesUrl());
      console.log('Response received:', response.status, response.ok);
      if (response.ok) {
        const result = await response.json();
        this.categories = result.data || result;
        console.log('Categories loaded:', this.categories.length, 'categories');
        this.updateCategoriesList();
      } else {
        console.error('Response not ok:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      console.log('fetchCategories finished, setting loadingCategories to false');
      this.loadingCategories = false;
      this.updateCategoriesList(); // Update again to remove loading state
    }
  }

  async createCategory(categoryData) {
    try {
      const response = await fetch(config.getCategoriesUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (response.ok) {
        // Refresh categories to include the new one
        await this.fetchCategories();

        // Update the table display
        this.updateDocumentsTable();
        this.closeModal();
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  }

  async toggleCategoryActive(categoryId, isActive) {
    try {
      const response = await fetch(config.getCategoryUrl(categoryId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });
      if (response.ok) {
        // Update the category in local state
        const category = this.categories.find(cat => cat.id === categoryId);
        if (category) {
          category.isActive = !isActive;
        }

        // Update the table display
        this.updateDocumentsTable();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  }

  async toggleCollectionActive(collectionId, isActive) {
    try {
      const response = await fetch(config.getCollectionUrl(collectionId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });
      if (response.ok) {
        // Find and update the collection in local state
        for (const categoryId in this.categoryCollections) {
          const collection = this.categoryCollections[categoryId].find(col => col.id === collectionId);
          if (collection) {
            collection.isActive = !isActive;
            break;
          }
        }

        // Update the table display
        this.updateDocumentsTable();
      }
    } catch (error) {
      console.error('Error updating collection:', error);
    }
  }

  deleteCategoryWithConfirm(categoryId, categoryName, hasCollections) {
    if (hasCollections) {
      alert('Cannot delete category that contains collections. Delete all collections first.');
      return;
    }

    if (confirm(`Are you sure you want to delete category "${categoryName}"? This action cannot be undone.`)) {
      this.deleteCategory(categoryId);
    }
  }

  deleteCollectionWithConfirm(collectionId, collectionName, hasDocuments) {
    if (hasDocuments) {
      alert('Cannot delete collection that contains files. Delete all files first.');
      return;
    }

    if (confirm(`Are you sure you want to delete collection "${collectionName}"? This action cannot be undone.`)) {
      this.deleteCollection(collectionId);
    }
  }

  async deleteCategory(categoryId) {
    try {
      const response = await fetch(config.getCategoryUrl(categoryId), {
        method: 'DELETE'
      });
      if (response.ok) {
        // Remove from local state
        this.categories = this.categories.filter(cat => cat.id !== categoryId);
        delete this.categoryCollections[categoryId];
        this.expandedCategories.delete(categoryId);

        // Update the table display
        this.updateDocumentsTable();
      } else {
        const error = await response.json();
        alert(`Deletion error: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    }
  }

  async deleteCollection(collectionId) {
    try {
      const response = await fetch(config.getCollectionUrl(collectionId), {
        method: 'DELETE'
      });
      if (response.ok) {
        // Remove from local state - find which category it belongs to
        let categoryId = null;
        for (const catId in this.categoryCollections) {
          const collectionIndex = this.categoryCollections[catId].findIndex(col => col.id === collectionId);
          if (collectionIndex !== -1) {
            this.categoryCollections[catId].splice(collectionIndex, 1);
            categoryId = catId;
            break;
          }
        }

        // Also remove from expanded collections if needed
        delete this.collectionFiles[collectionId];
        this.expandedCollections.delete(collectionId);

        // Refresh categories to update collection counts
        await this.fetchCategories();

        // Update the table display
        this.updateDocumentsTable();
      } else {
        const error = await response.json();
        alert(`Deletion error: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      alert('Error deleting collection');
    }
  }

  async fetchCollections() {
    if (!this.selectedCategory) return;

    try {
      console.log('fetchCollections started for category:', this.selectedCategory.name);
      this.loadingCollections = true;
      this.updateCollectionsList(); // Show loading state

      const response = await fetch(config.getCategoryCollectionsUrl(this.selectedCategory.id));
      if (response.ok) {
        const result = await response.json();
        this.collections = result.data || result;
        console.log('Collections loaded:', this.collections.length, 'collections');
      } else {
        console.error('Failed to fetch collections:', response.status);
      }
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      this.loadingCollections = false;
      this.updateCollectionsList(); // Update with data or remove loading
    }
  }

  async createCollection(collectionData) {
    try {
      const response = await fetch(config.getCollectionsUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionData)
      });
      if (response.ok) {
        // Refresh categories to update counts
        await this.fetchCategories();

        // Clear and reload collections for this category
        const categoryId = collectionData.categoryId;
        delete this.categoryCollections[categoryId];

        // Expand the category to show the new collection
        this.expandedCategories.add(categoryId);
        await this.loadCategoryCollections(categoryId);

        // Update the table display
        this.updateDocumentsTable();
        this.closeModal();
      }
    } catch (error) {
      console.error('Error creating collection:', error);
    }
  }

  async fetchFiles() {
    if (!this.selectedCollection) return;

    try {
      this.setLoading(true);
      const response = await fetch(config.getCollectionDocumentsUrl(this.selectedCollection.id));
      if (response.ok) {
        const result = await response.json();
        this.files = result.data || result;
        this.updateFilesList();
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      this.setLoading(false);
    }
  }

  // UI Methods
  handleTabChange(tabId) {
    this.activeTab = tabId;
    localStorage.setItem('activeTab', tabId);
    this.render();

    // If switching to documents tab, ensure categories are updated
    if (tabId === 'documents') {
      setTimeout(() => {
        this.updateCategoriesList();
        this.updateCollectionsList();
        this.updateFilesList();
        this.updateAddCollectionButton();
        this.updateDocumentsTable(); // Update new table structure
      }, 100); // Small delay to ensure DOM is rendered
    }
  }


  selectCategory(category) {
    console.log('selectCategory called with:', category.name);
    this.selectedCategory = category;
    this.selectedCollection = null;
    this.files = [];

    // Update UI immediately
    this.updateCategoriesList();
    this.updateFilesList(); // Reset files list
    this.updateAddCollectionButton(); // Update Add Collection button state

    // Then fetch collections for the selected category
    this.fetchCollections();
  }

  selectCollection(collection) {
    this.selectedCollection = collection;
    this.fetchFiles();
    this.updateCollectionsList();
    this.updateFilesList();
  }

  openCategoryModal() {
    this.showModal('category');
  }

  openCollectionModal(categoryId = null) {
    // If categoryId is provided, use that category, otherwise use selected
    const targetCategory = categoryId ?
      this.categories.find(cat => cat.id === categoryId) :
      this.selectedCategory;

    if (!targetCategory) {
      alert('Please select a category first');
      return;
    }

    // Temporarily set selected category for modal
    const originalSelected = this.selectedCategory;
    this.selectedCategory = targetCategory;

    this.showModal('collection');

    // Update the modal with current state after it's shown
    setTimeout(() => {
      this.updateCollectionModal();
      // Restore original selected category if it was changed
      if (categoryId && originalSelected !== targetCategory) {
        this.selectedCategory = originalSelected;
      }
    }, 50);
  }

  showModal(type) {
    const modal = document.getElementById(type + '-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.style.display = 'none');

    // Clear form data
    const forms = document.querySelectorAll('form');
    forms.forEach(form => form.reset());
  }

  // Render Methods
  render() {
    const root = document.getElementById('root');
    root.innerHTML =
      '<div class="app">' +
        this.renderHeader() +
        '<main class="main">' +
          '<div class="container">' +
            this.renderTabNavigation() +
            '<div class="tab-content">' +
              this.renderActiveTab() +
            '</div>' +
          '</div>' +
        '</main>' +
      '</div>' +
      this.renderModals();

    this.attachEventListeners();
  }

  renderHeader() {
    return `
      <header class="header">
        <div class="container">
          <div class="header-content">
            <div class="brand">
              <div class="logo">🤖</div>
              <div class="brand-text">
                <h1>RAG Service</h1>
                <p>Private Document Intelligence</p>
              </div>
            </div>
            <div class="status">
              <span class="status-online">● Online</span>
            </div>
          </div>
        </div>
      </header>
    `;
  }

  renderTabNavigation() {
    const tabs = [
      { id: 'chat', label: 'Chat', icon: '💬' },
      { id: 'documents', label: 'Document Manager', icon: '📄' },
      { id: 'audit', label: 'Audit Log', icon: '📊' }
    ];

    const tabsHTML = tabs.map(tab => `
      <button
        class="tab ${this.activeTab === tab.id ? 'active' : ''}"
        onclick="app.handleTabChange('${tab.id}')"
      >
        <span class="tab-icon">${tab.icon}</span>
        ${tab.label}
      </button>
    `).join('');

    return `
      <div class="tab-navigation">
        <nav class="tabs">
          ${tabsHTML}
        </nav>
      </div>
    `;
  }

  renderActiveTab() {
    switch (this.activeTab) {
      case 'chat':
        return this.renderChatTab();
      case 'documents':
        return this.renderDocumentsTab();
      case 'audit':
        return this.renderAuditTab();
      default:
        return this.renderChatTab();
    }
  }

  renderChatTab() {
    return `
      <div class="tab-pane">
        <div class="chat-layout">
          <div class="chat-main">
            <div class="card">
              <div class="card-header">
                <h2>💬 RAG Chat Interface</h2>
              </div>
              <div class="card-body">
                <div class="chat-messages">
                  <div class="empty-state">
                    <div class="empty-icon">💬</div>
                    <p>Chat interface will be implemented here</p>
                    <small>This will include message history, input field, and RAG-powered responses</small>
                  </div>
                </div>
                <div class="message-input">
                  <input type="text" placeholder="Type your message..." disabled />
                  <button disabled>Send</button>
                </div>
              </div>
            </div>
          </div>
          <div class="chat-sidebar">
            <div class="card">
              <div class="card-header">
                <h3>⚙️ Chat Settings</h3>
              </div>
              <div class="card-body">
                <div class="form-group">
                  <label>Knowledge Base</label>
                  <select disabled>
                    <option>Select knowledge base...</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Temperature: 0.7</label>
                  <input type="range" min="0" max="1" step="0.1" value="0.7" disabled />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderDocumentsTab() {
    return `
      <div class="tab-pane">
        <div class="documents-header">
          <h2>📄 Document Manager</h2>
          <div class="header-actions">
            <button class="btn-primary" onclick="app.openCategoryModal()" title="Add Category">➕ New Category</button>
            <button class="btn-secondary" onclick="app.exportData()" title="Export Data">📥 Export</button>
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

  renderCategoriesList() {
    console.log('renderCategoriesList called - loadingCategories:', this.loadingCategories, 'categories count:', this.categories.length);

    if (this.loadingCategories) {
      return '<div class="loading">Loading categories...</div>';
    }

    if (this.categories.length === 0) {
      return `
        <div class="empty-state">
          <p>No categories yet</p>
          <button class="btn-link" onclick="app.openCategoryModal()">Create first category</button>
        </div>
      `;
    }

    const categoriesHTML = this.categories.map(category => {
      const isSelected = this.selectedCategory && this.selectedCategory.id === category.id;
      const categoryJSON = JSON.stringify(category).replace(/"/g, '&quot;');
      const hasCollections = category.collectionsCount > 0;

      return `
        <div class="category-item ${isSelected ? 'selected' : ''} ${!category.isActive ? 'inactive' : ''}"
             onclick="app.selectCategory(${categoryJSON})">
          <div class="category-info">
            <div class="category-color" style="background-color: ${category.color}"></div>
            <div class="category-details">
              <span class="category-name">${category.name}</span>
              <small class="category-stats">${category.collectionsCount || 0} collections</small>
            </div>
          </div>
          <div class="category-actions">
            <button class="toggle-switch ${category.isActive ? 'active' : 'inactive'}"
                    onclick="event.stopPropagation(); app.toggleCategoryActive('${category.id}', ${category.isActive})"
                    title="${category.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
            <button class="delete-btn ${hasCollections ? 'disabled' : ''}"
                    onclick="event.stopPropagation(); app.deleteCategoryWithConfirm('${category.id}', '${category.name}', ${hasCollections})"
                    ${hasCollections ? 'disabled title="Cannot delete category with collections"' : 'title="Delete category"'}>
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="category-list">${categoriesHTML}</div>`;
  }

  renderCollectionsList() {
    if (!this.selectedCategory) {
      return '<div class="empty-state"><p>Select a category to view collections</p></div>';
    }

    if (this.loadingCollections) {
      return '<div class="loading">Loading collections...</div>';
    }

    if (this.collections.length === 0) {
      return '<div class="empty-state"><p>No collections in this category</p></div>';
    }

    const collectionsHTML = this.collections.map(collection => {
      const isSelected = this.selectedCollection && this.selectedCollection.id === collection.id;
      const collectionJSON = JSON.stringify(collection).replace(/"/g, '&quot;');
      const hasDocuments = collection.documentsCount > 0;

      return `
        <div class="collection-item ${isSelected ? 'selected' : ''} ${!collection.isActive ? 'inactive' : ''}"
             onclick="app.selectCollection(${collectionJSON})">
          <div class="collection-info">
            <div class="collection-details">
              <span class="collection-name">${collection.name}</span>
              <small class="collection-description">${collection.description || ''}</small>
              <small class="collection-stats">${collection.documentsCount || 0} files</small>
            </div>
          </div>
          <div class="collection-actions">
            <button class="toggle-switch ${collection.isActive ? 'active' : 'inactive'}"
                    onclick="event.stopPropagation(); app.toggleCollectionActive('${collection.id}', ${collection.isActive})"
                    title="${collection.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
            <button class="delete-btn ${hasDocuments ? 'disabled' : ''}"
                    onclick="event.stopPropagation(); app.deleteCollectionWithConfirm('${collection.id}', '${collection.name}', ${hasDocuments})"
                    ${hasDocuments ? 'disabled title="Cannot delete collection with files"' : 'title="Delete collection"'}>
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    return `<div class="collections-list">${collectionsHTML}</div>`;
  }

  renderFilesList() {
    if (!this.selectedCollection) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h4>No Collection Selected</h4>
          <p>Select a collection to view files</p>
        </div>
      `;
    }

    if (this.files.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h4>No Files in This Collection</h4>
          <p>Upload files to create knowledge base</p>
        </div>
      `;
    }

    const filesHTML = this.files.map(file => `
      <div class="file-item">
        <div class="file-icon">
          ${file.type && file.type.startsWith('image/') ? '🖼️' : '📄'}
        </div>
        <div class="file-details">
          <span class="file-name">${file.title}</span>
          <small class="file-meta">${file.type} • ${Math.round(file.size / 1024)}KB</small>
        </div>
        <div class="file-actions">
          <button class="btn-icon">👁️</button>
          <button class="btn-icon">🗑️</button>
        </div>
      </div>
    `).join('');

    return `<div class="files-list">${filesHTML}</div>`;
  }

  renderCategoriesTableRows() {
    if (this.loadingCategories) {
      return '<tr><td colspan="7" class="loading-row">Loading categories...</td></tr>';
    }

    if (this.categories.length === 0) {
      return '<tr><td colspan="7" class="empty-row">No categories. <button class="btn-link" onclick="app.openCategoryModal()">Create first category</button></td></tr>';
    }

    return this.categories.map(category => {
      const isExpanded = this.expandedCategories && this.expandedCategories.has(category.id);
      const collectionsCount = category.collectionsCount || 0;

      // Calculate total files from all collections in this category
      let totalFiles = 0;
      if (category.collections) {
        totalFiles = category.collections.reduce((sum, collection) => {
          return sum + (collection.documentsCount || collection.documents?.length || 0);
        }, 0);
      }

      // Fallback to totalDocumentsCount if provided
      totalFiles = totalFiles || category.totalDocumentsCount || 0;

      let rows = `
        <tr class="category-row" data-category-id="${category.id}">
          <td>
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" onclick="app.toggleCategoryExpand('${category.id}')" ${collectionsCount === 0 ? 'disabled' : ''}>
              ${collectionsCount > 0 ? (isExpanded ? '▼' : '▶') : ''}
            </button>
          </td>
          <td>
            <div class="category-name-cell">
              <div class="category-color" style="background-color: ${category.color}"></div>
              <span class="category-name" ondblclick="app.editCategoryName('${category.id}')" title="Double click to edit">${category.name}</span>
            </div>
          </td>
          <td class="count-cell">${collectionsCount}</td>
          <td class="count-cell">${totalFiles}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(category).class}">${this.getProcessingStatus(category).text}</span>
          </td>
          <td class="toggle-cell">
            <button class="toggle-switch ${category.isActive ? 'active' : 'inactive'}" onclick="app.toggleCategoryActive('${category.id}', ${category.isActive})" title="${category.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
          </td>
          <td class="actions-cell">
            <button class="btn-icon add-collection-btn" onclick="app.openCollectionModal('${category.id}')" title="Add Collection">➕</button>
            <button class="btn-icon edit-btn" onclick="app.editCategoryName('${category.id}')" title="Edit">✏️</button>
            <button class="btn-icon delete-btn ${collectionsCount > 0 ? 'disabled' : ''}" onclick="app.deleteCategoryWithConfirm('${category.id}', '${category.name}', ${collectionsCount > 0})" ${collectionsCount > 0 ? 'disabled' : ''} title="${collectionsCount > 0 ? 'Cannot delete category with collections' : 'Delete category'}">🗑️</button>
          </td>
        </tr>
      `;

      // Add full-width collections table if expanded
      if (isExpanded && this.categoryCollections[category.id]) {
        rows += `
          <tr class="expanded-row">
            <td colspan="7" class="expanded-cell">
              <div class="nested-table-container">
                <h4 class="nested-title">📁 Collections in Category "${category.name}"</h4>
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
    const collections = this.categoryCollections[categoryId] || [];

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
      const isExpanded = this.expandedCollections && this.expandedCollections.has(collection.id);
      const documentsCount = collection.documentsCount || collection.documents?.length || 0;

      tableHTML += `
        <tr class="collection-row" data-collection-id="${collection.id}">
          <td>
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" onclick="app.toggleCollectionExpand('${collection.id}')" ${documentsCount === 0 ? 'disabled' : ''}>
              ${documentsCount > 0 ? (isExpanded ? '▼' : '▶') : ''}
            </button>
          </td>
          <td>
            <span class="collection-name" ondblclick="app.editCollectionName('${collection.id}')" title="Double click to edit">📁 ${collection.name}</span>
          </td>
          <td class="count-cell">${documentsCount}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(collection).class}">${this.getProcessingStatus(collection).text}</span>
          </td>
          <td class="toggle-cell">
            <button class="toggle-switch ${collection.isActive ? 'active' : 'inactive'}" onclick="app.toggleCollectionActive('${collection.id}', ${collection.isActive})" title="${collection.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
          </td>
          <td class="actions-cell">
            <button class="btn-icon upload-btn" onclick="app.openFileUpload('${collection.id}')" title="Upload Files">📤</button>
            <button class="btn-icon edit-btn" onclick="app.editCollectionName('${collection.id}')" title="Edit">✏️</button>
            <button class="btn-icon delete-btn ${documentsCount > 0 ? 'disabled' : ''}" onclick="app.deleteCollectionWithConfirm('${collection.id}', '${collection.name}', ${documentsCount > 0})" ${documentsCount > 0 ? 'disabled' : ''} title="${documentsCount > 0 ? 'Cannot delete collection with files' : 'Delete collection'}">🗑️</button>
          </td>
        </tr>
      `;

      // Add full-width files table if expanded
      if (isExpanded && this.collectionFiles[collection.id]) {
        tableHTML += `
          <tr class="expanded-row">
            <td colspan="6" class="expanded-cell">
              <div class="nested-table-container files-container">
                <h5 class="nested-title">📄 Files in Collection "${collection.name}"</h5>
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
    const files = this.collectionFiles[collectionId] || [];

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
            <th width="120">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    files.forEach(file => {
      tableHTML += `
        <tr class="file-row" data-file-id="${file.id}">
          <td>
            <span class="file-name" onclick="app.previewFile('${file.id}')" title="Click to preview">
              ${this.getFileIcon(file.fileType || file.mimeType)} ${file.originalFilename || file.filename || file.title}
            </span>
          </td>
          <td class="size-cell">${this.formatFileSize(file.fileSize || file.size)}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(file).class}">${this.getProcessingStatus(file).text}</span>
          </td>
          <td class="toggle-cell">
            <button class="toggle-switch ${file.isActive ? 'active' : 'inactive'}" onclick="app.toggleFileActive('${file.id}', ${file.isActive})" title="${file.isActive ? 'Deactivate' : 'Activate'}">
              <span class="switch-slider"></span>
            </button>
          </td>
          <td class="actions-cell">
            <button class="btn-icon preview-btn" onclick="app.previewFile('${file.id}')" title="Preview Content">👁️</button>
            <button class="btn-icon delete-btn" onclick="app.deleteFileWithConfirm('${file.id}', '${file.originalFilename || file.filename || file.title}')" title="Delete File">🗑️</button>
          </td>
        </tr>
      `;
    });

    tableHTML += '</tbody></table>';
    return tableHTML;
  }

  getProcessingStatus(item) {
    // Mock processing status - to be replaced with real data
    const statuses = [
      { class: 'status-pending', text: 'Pending' },
      { class: 'status-processing', text: 'Processing' },
      { class: 'status-completed', text: 'Completed' },
      { class: 'status-error', text: 'Error' }
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  getFileIcon(type) {
    if (type && type.startsWith('image/')) return '🖼️';
    if (type && type.includes('pdf')) return '📄';
    if (type && type.includes('text')) return '📝';
    if (type && type.includes('word')) return '📘';
    if (type && type.includes('excel')) return '📊';
    return '📄';
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    if (bytes < 1073741824) return Math.round(bytes / 1048576) + ' MB';
    return Math.round(bytes / 1073741824) + ' GB';
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderAuditTab() {
    return `
      <div class="tab-pane">
        <div class="audit-header">
          <h2>📊 Audit Log</h2>
          <div class="audit-actions">
            <button disabled>📅 Date Range</button>
            <button disabled>🔍 Filters</button>
            <button disabled>📥 Export</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">0</div>
            <div class="stat-label">Total Events</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">0</div>
            <div class="stat-label">User Actions</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">0</div>
            <div class="stat-label">API Calls</div>
          </div>
          <div class="stat-card error">
            <div class="stat-value">0</div>
            <div class="stat-label">Errors</div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div class="card-body">
            <div class="empty-state">
              <div class="empty-icon">📊</div>
              <h4>No audit logs available</h4>
              <p>Audit logs will appear here once system activity begins</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderModals() {
    // Generate category options for the dropdown
    const categoryOptions = this.categories.map(category => {
      const selected = this.selectedCategory && this.selectedCategory.id === category.id ? 'selected' : '';
      return `<option value="${category.id}" ${selected}>${category.name}</option>`;
    }).join('');

    return `
      <!-- Category Modal -->
      <div id="category-modal" class="modal-overlay" style="display: none;" onclick="if(event.target === this) app.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Create New Category</h3>
            <button class="btn-close" onclick="app.closeModal()">×</button>
          </div>
          <form onsubmit="app.handleCategorySubmit(event)">
            <div class="modal-body">
              <div class="form-group">
                <label>Category Name</label>
                <input type="text" name="name" placeholder="Enter category name" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Enter category description" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label>Color</label>
                <input type="color" name="color" value="#007bff" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary">Create Category</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Collection Modal -->
      <div id="collection-modal" class="modal-overlay" style="display: none;" onclick="if(event.target === this) app.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Create New Collection</h3>
            <button class="btn-close" onclick="app.closeModal()">×</button>
          </div>
          <form onsubmit="app.handleCollectionSubmit(event)">
            <div class="modal-body">
              <div class="form-group">
                <label>Category</label>
                <select name="categoryId" required>
                  <option value="">Select category...</option>
                  ${categoryOptions}
                </select>
              </div>
              <div class="form-group">
                <label>Collection Name</label>
                <input type="text" name="name" placeholder="Enter collection name" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Enter collection description" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary">Create Collection</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Category Modal -->
      <div id="edit-category-modal" class="modal-overlay" style="display: none;" onclick="if(event.target === this) app.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Category</h3>
            <button class="btn-close" onclick="app.closeModal()">×</button>
          </div>
          <form onsubmit="app.handleEditCategorySubmit(event)">
            <input type="hidden" name="id" />
            <div class="modal-body">
              <div class="form-group">
                <label>Category Name</label>
                <input type="text" name="name" placeholder="Enter category name" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Enter category description" rows="3"></textarea>
              </div>
              <div class="form-group">
                <label>Color</label>
                <input type="color" name="color" value="#007bff" />
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Collection Modal -->
      <div id="edit-collection-modal" class="modal-overlay" style="display: none;" onclick="if(event.target === this) app.closeModal()">
        <div class="modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Edit Collection</h3>
            <button class="btn-close" onclick="app.closeModal()">×</button>
          </div>
          <form onsubmit="app.handleEditCollectionSubmit(event)">
            <input type="hidden" name="id" />
            <div class="modal-body">
              <div class="form-group">
                <label>Category</label>
                <select name="categoryId" required>
                  <option value="">Select category...</option>
                  ${categoryOptions}
                </select>
              </div>
              <div class="form-group">
                <label>Collection Name</label>
                <input type="text" name="name" placeholder="Enter collection name" required />
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea name="description" placeholder="Enter collection description" rows="3"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary">Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      <!-- File Preview Modal -->
      <div id="file-preview-modal" class="modal-overlay" style="display: none;" onclick="if(event.target === this) app.closeModal()">
        <div class="modal file-preview-modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>File Preview</h3>
            <button class="btn-close" onclick="app.closeModal()">×</button>
          </div>
          <div class="modal-body file-preview-body">
            <!-- File Info Section -->
            <div class="file-info-section">
              <div class="file-info-grid">
                <div class="file-info-item">
                  <label>Name:</label>
                  <span id="file-preview-title">Loading...</span>
                </div>
                <div class="file-info-item">
                  <label>Type:</label>
                  <span id="file-preview-type">Loading...</span>
                </div>
                <div class="file-info-item">
                  <label>Size:</label>
                  <span id="file-preview-size">Loading...</span>
                </div>
                <div class="file-info-item">
                  <label>Status:</label>
                  <span id="file-preview-status">Loading...</span>
                </div>
                <div class="file-info-item">
                  <label>Created:</label>
                  <span id="file-preview-created">Loading...</span>
                </div>
              </div>
            </div>

            <!-- Content Preview Section -->
            <div class="file-content-section">
              <h4>Content Preview</h4>
              <div id="file-content-preview" class="file-content-preview">
                <div class="file-preview-placeholder">
                  <div class="preview-icon">📄</div>
                  <p>Loading content...</p>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" onclick="app.closeModal()">Close</button>
          </div>
        </div>
      </div>

      <!-- File Upload Modal -->
      <div id="file-upload-modal" class="modal-overlay" style="display: none;" onclick="if(event.target === this) app.closeModal()">
        <div class="modal file-upload-modal" onclick="event.stopPropagation()">
          <div class="modal-header">
            <h3>Upload Files</h3>
            <button class="btn-close" onclick="app.closeModal()">×</button>
          </div>
          <form onsubmit="app.handleFileUpload(event)">
            <input type="hidden" name="collectionId" />
            <div class="modal-body file-upload-body">
              <!-- Collection Info -->
              <div class="upload-collection-info">
                <label>Collection:</label>
                <span id="upload-collection-name">Loading...</span>
              </div>

              <!-- File Drop Zone -->
              <div class="file-drop-zone"
                   ondragover="app.handleDragOver(event)"
                   ondragleave="app.handleDragLeave(event)"
                   ondrop="app.handleFileDrop(event)">
                <div class="drop-zone-content">
                  <div class="drop-zone-icon">📁</div>
                  <p class="drop-zone-text">
                    <strong>Drag & drop files here</strong> or
                    <button type="button" class="btn-link" onclick="document.getElementById('file-input').click()">browse files</button>
                  </p>
                  <p class="drop-zone-hint">Supports: PDF, DOCX, TXT, MD, Images</p>
                </div>
                <input type="file"
                       id="file-input"
                       multiple
                       accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.gif"
                       onchange="app.handleFileSelect(event)"
                       style="display: none;" />
              </div>

              <!-- Selected Files List -->
              <div id="selected-files-container" class="selected-files" style="display: none;">
                <h4>Selected Files:</h4>
                <div id="selected-files-list" class="files-list"></div>
                <div class="upload-options">
                  <div class="form-group">
                    <label>Tags (optional):</label>
                    <input type="text" name="tags" placeholder="finance, reports, quarterly (comma separated)" />
                  </div>
                  <div class="form-group">
                    <label>Notes (optional):</label>
                    <textarea name="notes" placeholder="Additional notes or description" rows="3"></textarea>
                  </div>
                </div>
              </div>

              <!-- Upload Progress -->
              <div id="upload-progress-container" class="upload-progress" style="display: none;">
                <h4>Upload Progress:</h4>
                <div id="upload-progress-list" class="progress-list"></div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" onclick="app.closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" id="upload-submit-btn" disabled>Upload Files</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // Event Handlers
  attachEventListeners() {
    // Modal close on overlay click is handled in template
  }

  handleCategorySubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const categoryData = {
      name: formData.get('name'),
      description: formData.get('description'),
      color: formData.get('color')
    };
    this.createCategory(categoryData);
  }

  handleCollectionSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const collectionData = {
      name: formData.get('name'),
      description: formData.get('description'),
      categoryId: formData.get('categoryId')
    };
    this.createCollection(collectionData);
  }

  handleEditCategorySubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const categoryId = formData.get('id');
    const categoryData = {
      name: formData.get('name'),
      description: formData.get('description'),
      color: formData.get('color')
    };
    this.updateCategory(categoryId, categoryData);
  }

  handleEditCollectionSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const collectionId = formData.get('id');
    const collectionData = {
      name: formData.get('name'),
      description: formData.get('description'),
      categoryId: formData.get('categoryId')
    };
    this.updateCollection(collectionId, collectionData);
  }

  // Update Methods
  updateCategoriesList() {
    const container = document.getElementById('categories-list');
    if (container) {
      console.log('Updating categories list with', this.categories.length, 'categories'); // Debug log
      container.innerHTML = this.renderCategoriesList();
    } else {
      console.log('Categories container not found - user might not be on documents tab'); // Debug log
    }
  }

  updateCollectionsList() {
    const container = document.getElementById('collections-list');
    if (container) {
      container.innerHTML = this.renderCollectionsList();
    }
  }

  updateFilesList() {
    const container = document.getElementById('files-list');
    if (container) {
      container.innerHTML = this.renderFilesList();
    }
  }

  updateAddCollectionButton() {
    // Find all Add Collection buttons and update their disabled state
    const addCollectionButtons = document.querySelectorAll('.add-btn[onclick*="openCollectionModal"]');
    addCollectionButtons.forEach(button => {
      if (this.selectedCategory) {
        button.removeAttribute('disabled');
        button.title = 'Add Collection';
      } else {
        button.setAttribute('disabled', 'true');
        button.title = 'Please select a category first';
      }
    });
  }

  updateCollectionModal() {
    // Update the category dropdown in the collection modal
    const categorySelect = document.querySelector('#collection-modal select[name="categoryId"]');
    if (categorySelect && this.selectedCategory) {
      categorySelect.value = this.selectedCategory.id;
    }
  }

  // New table-based methods
  async toggleCategoryExpand(categoryId) {
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
      // Load collections for this category if not loaded
      if (!this.categoryCollections[categoryId]) {
        await this.loadCategoryCollections(categoryId);
      }
    }
    this.updateDocumentsTable();
  }

  async toggleCollectionExpand(collectionId) {
    if (this.expandedCollections.has(collectionId)) {
      this.expandedCollections.delete(collectionId);
    } else {
      this.expandedCollections.add(collectionId);
      // Load files for this collection if not loaded
      if (!this.collectionFiles[collectionId]) {
        await this.loadCollectionFiles(collectionId);
      }
    }
    this.updateDocumentsTable();
  }

  async loadCategoryCollections(categoryId) {
    try {
      const response = await fetch(config.getCategoryCollectionsUrl(categoryId));
      if (response.ok) {
        const result = await response.json();
        this.categoryCollections[categoryId] = result.data || result;
      }
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  }

  async loadCollectionFiles(collectionId) {
    try {
      const response = await fetch(config.getCollectionDocumentsUrl(collectionId));
      if (response.ok) {
        const result = await response.json();
        this.collectionFiles[collectionId] = result.data || result;
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  }

  updateDocumentsTable() {
    const tbody = document.getElementById('documents-table-body');
    if (tbody) {
      tbody.innerHTML = this.renderCategoriesTableRows();
    }
  }

  editCategoryName(categoryId) {
    const category = this.categories.find(cat => cat.id === categoryId);
    if (!category) return;

    // Populate the edit form with current category data
    const modal = document.getElementById('edit-category-modal');
    const form = modal.querySelector('form');
    form.id.value = category.id;
    form.name.value = category.name;
    form.description.value = category.description || '';
    form.color.value = category.color || '#007bff';

    // Show the edit modal
    this.showModal('edit-category');
  }

  editCollectionName(collectionId) {
    // Find collection in categoryCollections
    let collection = null;
    for (const categoryId in this.categoryCollections) {
      collection = this.categoryCollections[categoryId].find(col => col.id === collectionId);
      if (collection) break;
    }
    if (!collection) return;

    // Populate the edit form with current collection data
    const modal = document.getElementById('edit-collection-modal');
    const form = modal.querySelector('form');
    form.id.value = collection.id;
    form.name.value = collection.name;
    form.description.value = collection.description || '';
    form.categoryId.value = collection.categoryId;

    // Show the edit modal
    this.showModal('edit-collection');
  }

  async updateCategory(categoryId, categoryData) {
    try {
      const response = await fetch(config.getCategoryUrl(categoryId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });
      if (response.ok) {
        // Update the category in local state
        const category = this.categories.find(cat => cat.id === categoryId);
        if (category) {
          Object.assign(category, categoryData);
        }

        // Update the table display
        this.updateDocumentsTable();
        this.closeModal();
      }
    } catch (error) {
      console.error('Error updating category:', error);
    }
  }

  async updateCollection(collectionId, collectionData) {
    try {
      const response = await fetch(config.getCollectionUrl(collectionId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collectionData)
      });

      if (response.ok) {
        // Find the collection and its old category
        let oldCategoryId = null;
        let foundCollection = null;

        for (const categoryId in this.categoryCollections) {
          const collection = this.categoryCollections[categoryId].find(col => col.id === collectionId);
          if (collection) {
            oldCategoryId = categoryId;
            foundCollection = collection;
            break;
          }
        }

        // If category was changed, we need to do a complete refresh
        if (collectionData.categoryId && oldCategoryId && collectionData.categoryId !== oldCategoryId) {
          // Clear collections cache for both old and new categories
          delete this.categoryCollections[oldCategoryId];
          delete this.categoryCollections[collectionData.categoryId];

          // Refresh all data
          await this.fetchCategories();

          // Update the selected category if the current collection was selected
          if (this.selectedCollection && this.selectedCollection.id === collectionId) {
            this.selectedCollection = null;
          }
        } else {
          // Just update the collection data in place
          if (foundCollection) {
            Object.assign(foundCollection, collectionData);
          }

          // Refresh categories to update any counts
          await this.fetchCategories();
        }

        // Update all UI elements
        this.updateCollectionsList();
        this.updateDocumentsTable();
        this.closeModal();
      } else {
        console.error('Failed to update collection:', response.statusText);
        alert('Failed to update collection. Please try again.');
      }
    } catch (error) {
      console.error('Error updating collection:', error);
      alert('Error updating collection. Please try again.');
    }
  }

  async previewFile(fileId) {
    try {
      // Find file in current files list
      let file = null;

      // First look in the main files list
      if (this.files) {
        file = this.files.find(f => f.id === fileId);
      }

      // If not found, look in collectionFiles
      if (!file) {
        for (const collectionId in this.collectionFiles) {
          const collectionFiles = this.collectionFiles[collectionId];
          file = collectionFiles.find(f => f.id === fileId);
          if (file) break;
        }
      }

      if (!file) {
        // Try to fetch file details from API
        const response = await fetch(config.getDocumentUrl(fileId));
        if (response.ok) {
          file = await response.json();
        } else {
          alert('File not found');
          return;
        }
      }

      this.showFilePreviewModal(file);
    } catch (error) {
      console.error('Error loading file preview:', error);
      alert('Error loading file preview');
    }
  }

  showFilePreviewModal(file) {
    const modal = document.getElementById('file-preview-modal');
    if (!modal) {
      console.error('File preview modal not found');
      return;
    }

    // Update modal content
    document.getElementById('file-preview-title').textContent = file.originalFilename || file.filename || file.title || 'Unknown File';
    document.getElementById('file-preview-type').textContent = file.fileType || file.mimeType || file.type || 'Unknown';
    document.getElementById('file-preview-size').textContent = this.formatFileSize(file.fileSize || file.size || 0);
    document.getElementById('file-preview-status').innerHTML = `<span class="status-badge ${this.getProcessingStatus(file).class}">${this.getProcessingStatus(file).text}</span>`;
    document.getElementById('file-preview-created').textContent = file.createdAt ? new Date(file.createdAt).toLocaleString() : 'Unknown';

    // Update content preview based on file type
    this.updateFileContentPreview(file);

    // Show modal
    modal.style.display = 'block';
  }

  async updateFileContentPreview(file) {
    const contentDiv = document.getElementById('file-content-preview');
    const fileType = file.fileType || file.mimeType || file.type || '';
    const fileName = file.originalFilename || file.filename || file.title || '';

    // Show loading state
    contentDiv.innerHTML = `
      <div class="file-preview-placeholder">
        <div class="preview-icon">⏳</div>
        <p>Loading content...</p>
      </div>
    `;

    try {
      // Fetch actual file content
      const response = await fetch(config.getDocumentContentUrl(file.id));

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const { content, mimeType } = await response.json();
      let contentHTML = '';

      // Handle different file types
      if (mimeType?.startsWith('text/') || mimeType === 'application/json') {
        // Display text content
        contentHTML = `
          <div class="text-content">
            <pre class="file-text-preview">${this.escapeHtml(content)}</pre>
          </div>
        `;
      } else if (mimeType?.startsWith('image/')) {
        // Display image content
        contentHTML = `
          <div class="image-content">
            <img src="${content}" alt="${fileName}" class="file-image-preview" style="max-width: 100%; max-height: 400px;" />
          </div>
        `;
      } else {
        // For binary files or unsupported types
        contentHTML = `
          <div class="file-preview-placeholder">
            <div class="preview-icon">📄</div>
            <p>Binary file</p>
            <p class="preview-note">${content}</p>
          </div>
        `;
      }

      contentDiv.innerHTML = contentHTML;

    } catch (error) {
      console.error('Error loading file content:', error);

      // Fallback to placeholder
      let contentHTML = '';
      switch (fileType.toLowerCase()) {
        case 'pdf':
          if (content && content.startsWith('data:application/pdf;base64,')) {
            contentHTML = `
              <div class="pdf-content">
                <embed src="${content}" type="application/pdf" width="100%" height="600px" />
              </div>
            `;
          } else {
            contentHTML = `
              <div class="file-preview-placeholder">
                <div class="preview-icon">📄</div>
                <p>PDF document preview</p>
                <p class="preview-note">${content || 'Content will be available when document processing is complete.'}</p>
              </div>
            `;
          }
          break;

        case 'txt':
        case 'md':
        case 'markdown':
          contentHTML = `
            <div class="file-preview-placeholder">
              <div class="preview-icon">📝</div>
              <p>Text document preview</p>
              <p class="preview-note">Content will be displayed here when processing is complete.</p>
            </div>
          `;
          break;

      case 'docx':
      case 'doc':
        contentHTML = `
          <div class="file-preview-placeholder">
            <div class="preview-icon">📄</div>
            <p>Word document preview</p>
            <p class="preview-note">Extracted text content will be shown after processing.</p>
          </div>
        `;
        break;

      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        contentHTML = `
          <div class="file-preview-placeholder">
            <div class="preview-icon">🖼️</div>
            <p>Image preview</p>
            <p class="preview-note">OCR text extraction will be available after processing.</p>
          </div>
        `;
        break;

      default:
        contentHTML = `
          <div class="file-preview-placeholder">
            <div class="preview-icon">📋</div>
            <p>File preview</p>
            <p class="preview-note">Content preview not available for ${fileType} files.</p>
          </div>
        `;
      }

      contentDiv.innerHTML = contentHTML;
    }
  }

  openFileUpload(collectionId) {
    this.selectedFiles = [];
    this.uploadCollectionId = collectionId;

    // Find collection name
    const collection = this.findCollectionById(collectionId);
    const collectionName = collection ? collection.name : 'Unknown Collection';

    // Set collection info in modal
    document.getElementById('upload-collection-name').textContent = collectionName;
    document.querySelector('#file-upload-modal [name="collectionId"]').value = collectionId;

    // Reset modal state
    this.resetUploadModal();

    // Show modal
    document.getElementById('file-upload-modal').style.display = 'block';
  }

  findCollectionById(collectionId) {
    // Search in categoryCollections
    for (const categoryId in this.categoryCollections) {
      const collection = this.categoryCollections[categoryId].find(col => col.id === collectionId);
      if (collection) return collection;
    }
    return null;
  }

  resetUploadModal() {
    // Reset file input
    document.getElementById('file-input').value = '';

    // Hide selected files and progress sections
    document.getElementById('selected-files-container').style.display = 'none';
    document.getElementById('upload-progress-container').style.display = 'none';

    // Clear selected files list
    document.getElementById('selected-files-list').innerHTML = '';
    document.getElementById('upload-progress-list').innerHTML = '';

    // Disable submit button
    document.getElementById('upload-submit-btn').disabled = true;

    // Reset form fields
    document.querySelector('#file-upload-modal [name="tags"]').value = '';
    document.querySelector('#file-upload-modal [name="notes"]').value = '';

    // Reset drop zone state
    const dropZone = document.querySelector('.file-drop-zone');
    dropZone.classList.remove('drag-over');
  }

  toggleFileActive(fileId, isActive) {
    // TODO: Implement file toggle
    console.log(`Toggle file ${fileId} active status from ${isActive}`);
  }

  deleteFileWithConfirm(fileId, fileName) {
    if (confirm(`Are you sure you want to delete file "${fileName}"? This action cannot be undone.`)) {
      this.deleteFile(fileId);
    }
  }

  async deleteFile(fileId) {
    try {
      const response = await fetch(config.getDocumentUrl(fileId), {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove file from local cache
        for (const collectionId in this.collectionFiles) {
          const files = this.collectionFiles[collectionId];
          const fileIndex = files.findIndex(f => f.id === fileId);
          if (fileIndex > -1) {
            files.splice(fileIndex, 1);
            break;
          }
        }

        // Also update the collections data to reflect the change
        if (this.collections) {
          this.collections.forEach(collection => {
            if (collection.documents) {
              const fileIndex = collection.documents.findIndex(f => f.id === fileId);
              if (fileIndex > -1) {
                collection.documents.splice(fileIndex, 1);
              }
            }
          });
        }

        // Refresh the categories to update document counts
        await this.fetchCategories();

        // Refresh the display
        this.updateDocumentsTable();
        console.log(`File ${fileId} deleted successfully`);
      } else {
        const errorData = await response.text();
        console.error('Failed to delete file:', errorData);
        alert('Failed to delete file. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please check your connection.');
    }
  }

  // File Upload Handlers
  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add('drag-over');
  }

  handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
  }

  handleFileDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');

    const files = Array.from(event.dataTransfer.files);
    this.processSelectedFiles(files);
  }

  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.processSelectedFiles(files);
  }

  processSelectedFiles(files) {
    // Filter valid files
    const validFiles = files.filter(file => this.isValidFileType(file));

    if (validFiles.length !== files.length) {
      const invalidCount = files.length - validFiles.length;
      alert(`${invalidCount} file(s) skipped. Only PDF, DOCX, TXT, MD, and image files are supported.`);
    }

    if (validFiles.length === 0) {
      return;
    }

    // Add to selected files (avoid duplicates)
    validFiles.forEach(file => {
      const isDuplicate = this.selectedFiles.some(f =>
        f.name === file.name && f.size === file.size
      );
      if (!isDuplicate) {
        this.selectedFiles.push(file);
      }
    });

    this.updateSelectedFilesList();
    this.updateUploadButton();
  }

  isValidFileType(file) {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif'
    ];

    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif'];

    return validTypes.includes(file.type) ||
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  updateSelectedFilesList() {
    const container = document.getElementById('selected-files-container');
    const filesList = document.getElementById('selected-files-list');

    if (this.selectedFiles.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';

    filesList.innerHTML = this.selectedFiles.map((file, index) => `
      <div class="selected-file" data-file-index="${index}">
        <div class="file-info">
          <span class="file-icon">${this.getFileIcon(this.getFileTypeFromName(file.name))}</span>
          <div class="file-details">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${this.formatFileSize(file.size)}</div>
          </div>
        </div>
        <button type="button" class="btn-remove" onclick="app.removeSelectedFile(${index})" title="Remove file">×</button>
      </div>
    `).join('');
  }

  removeSelectedFile(index) {
    this.selectedFiles.splice(index, 1);
    this.updateSelectedFilesList();
    this.updateUploadButton();
  }

  updateUploadButton() {
    const submitBtn = document.getElementById('upload-submit-btn');
    submitBtn.disabled = this.selectedFiles.length === 0;
    submitBtn.textContent = this.selectedFiles.length > 0 ?
      `Upload ${this.selectedFiles.length} File(s)` : 'Upload Files';
  }

  getFileTypeFromName(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const typeMap = {
      'pdf': 'pdf',
      'docx': 'docx',
      'doc': 'doc',
      'txt': 'txt',
      'md': 'md',
      'markdown': 'md',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'gif': 'image'
    };
    return typeMap[ext] || 'unknown';
  }

  async handleFileUpload(event) {
    event.preventDefault();

    if (this.selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    const formData = new FormData(event.target);
    const collectionId = formData.get('collectionId');
    const tags = formData.get('tags');
    const notes = formData.get('notes');

    // Parse tags
    const tagArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Prepare metadata
    const metadata = {
      uploadDate: new Date().toISOString(),
    };
    if (notes) {
      metadata.notes = notes;
    }

    // Show progress container
    const progressContainer = document.getElementById('upload-progress-container');
    const progressList = document.getElementById('upload-progress-list');
    progressContainer.style.display = 'block';
    progressList.innerHTML = '';

    // Disable upload button during upload
    const submitBtn = document.getElementById('upload-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
      // Upload files one by one
      const results = [];
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        const result = await this.uploadSingleFile(file, collectionId, tagArray, metadata, i);
        results.push(result);
      }

      // Check results
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      let message = `Upload completed: ${successful} successful`;
      if (failed > 0) {
        message += `, ${failed} failed`;
      }

      alert(message);

      // Refresh files list if any uploads were successful
      if (successful > 0) {
        this.refreshCollectionFiles(collectionId);
      }

      // Close modal
      this.closeModal();

    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = `Upload ${this.selectedFiles.length} File(s)`;
    }
  }

  async uploadSingleFile(file, collectionId, tags, metadata, index) {
    const progressItem = document.createElement('div');
    progressItem.className = 'progress-item';
    progressItem.innerHTML = `
      <div class="progress-file-info">
        <span class="file-icon">${this.getFileIcon(this.getFileTypeFromName(file.name))}</span>
        <span class="file-name">${file.name}</span>
      </div>
      <div class="progress-status">
        <div class="progress-bar">
          <div class="progress-fill" style="width: 0%"></div>
        </div>
        <span class="status-text">Uploading...</span>
      </div>
    `;

    document.getElementById('upload-progress-list').appendChild(progressItem);

    const progressBar = progressItem.querySelector('.progress-fill');
    const statusText = progressItem.querySelector('.status-text');

    try {
      // Prepare form data for API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('collectionId', collectionId);
      formData.append('metadata', JSON.stringify(metadata));

      // Add tags as JSON string - NestJS will parse it
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      // Upload with progress tracking
      const response = await fetch(config.getDocumentUploadUrl(), {
        method: 'POST',
        body: formData
      });

      progressBar.style.width = '100%';

      if (response.ok) {
        statusText.textContent = 'Success';
        progressItem.classList.add('success');
        return { success: true, file: file.name };
      } else {
        const errorText = await response.text();
        statusText.textContent = `Failed: ${response.status}`;
        progressItem.classList.add('error');
        console.error(`Upload failed for ${file.name}:`, errorText);
        return { success: false, file: file.name, error: errorText };
      }

    } catch (error) {
      statusText.textContent = 'Network error';
      progressItem.classList.add('error');
      console.error(`Upload error for ${file.name}:`, error);
      return { success: false, file: file.name, error: error.message };
    }
  }

  async refreshCollectionFiles(collectionId) {
    // Find and refresh files for the collection
    try {
      const response = await fetch(config.getCollectionDocumentsUrl(collectionId));
      if (response.ok) {
        const result = await response.json();
        this.collectionFiles[collectionId] = result.data || result;
        this.updateDocumentsTable();
        // Also refresh the categories to update file counts in sidebar
        await this.fetchCategories();
      }
    } catch (error) {
      console.error('Error refreshing collection files:', error);
    }
  }

  exportData() {
    // TODO: Implement data export
    alert('Data export - will be implemented later');
  }
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new RAGApp();
  window.app = app; // Make app globally available for onclick handlers
});