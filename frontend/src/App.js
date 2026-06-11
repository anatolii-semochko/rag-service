// Main Application Class
import { BaseComponent } from './components/common/BaseComponent.js';
import { ChatTab } from './components/tabs/ChatTab.js';
import { DocumentsTab } from './components/tabs/DocumentsTab.js';
import { storage } from './utils/helpers.js';
import { SessionManager, AppStorage } from './utils/cookies.js';

export class App extends BaseComponent {
  constructor() {
    super();

    // Migrate existing localStorage data to cookies
    AppStorage.migrateFromLocalStorage();

    this.state = {
      activeTab: SessionManager.getActiveTab() || 'documents', // Load from cookies
      loading: false
    };

    // Tab components
    this.tabs = {
      chat: null,
      documents: null,
      audit: null
    };

    // Bind methods to global scope for HTML onclick handlers
    this.bindGlobalMethods();

    this.init();
  }

  bindGlobalMethods() {
    // Make methods available globally for HTML onclick handlers
    window.app = {
      // App methods
      switchTab: this.switchTab.bind(this),

      // Chat methods
      toggleChatSettings: () => this.tabs.chat?.toggleChatSettings(),
      sendMessage: (event) => this.tabs.chat?.sendMessage(event),
      toggleCollection: (id, checked) => this.tabs.chat?.toggleCollection(id, checked),
      updateTemperature: (value) => this.tabs.chat?.updateTemperature(value),
      updateContext: (value) => this.tabs.chat?.updateContext(value),
      toggleRAG: (newValue) => this.tabs.chat?.toggleRAG(newValue),
      updateUseRAG: (mode) => this.tabs.chat?.updateUseRAG(mode),
      toggleCategory: (categoryId, checked) => this.tabs.chat?.toggleCategory(categoryId, checked),
      toggleStrategy: (strategy, checked) => this.tabs.chat?.toggleStrategy(strategy, checked),
      toggleTrace: (newValue) => this.tabs.chat?.toggleTrace(newValue),
      toggleDryRun: (newValue) => this.tabs.chat?.toggleDryRun(newValue),
      toggleSources: (element) => this.tabs.chat?.toggleSources(element),
      toggleTraceDisplay: (element) => this.tabs.chat?.toggleTraceDisplay(element),
      clearChat: () => this.tabs.chat?.clearChat(),
      startNewChat: () => this.tabs.chat?.startNewChat(),

      // Documents methods
      toggleCategoryExpand: (categoryId) => this.tabs.documents?.toggleCategoryExpand(categoryId),
      toggleCollectionExpand: (collectionId) => this.tabs.documents?.toggleCollectionExpand(collectionId),
      toggleCategoryActive: (id, active) => this.tabs.documents?.toggleCategoryActive(id, active),
      toggleCollectionActive: (id, active) => this.tabs.documents?.toggleCollectionActive(id, active),
      toggleFileActive: (id, active) => this.tabs.documents?.toggleFileActive(id, active),
      deleteCategoryWithConfirm: (id, name, hasCollections) => this.tabs.documents?.deleteCategory(id, name, hasCollections),
      deleteCollectionWithConfirm: (id, name, hasFiles) => this.tabs.documents?.deleteCollection(id, name, hasFiles),
      deleteFileWithConfirm: (id, filename) => this.tabs.documents?.deleteFile(id, filename),

      // Modal and form methods
      openCategoryModal: () => this.openCategoryModal(),
      exportData: () => alert('Export data functionality not yet implemented'),
      reloadDocuments: () => this.reloadDocuments(),
      editCategoryName: (id) => this.editCategoryName(id),
      openCollectionModal: (categoryId) => this.openCollectionModal(categoryId),
      editCollectionName: (id) => this.editCollectionName(id),
      openFileUpload: (collectionId) => this.openFileUpload(collectionId),
      previewFile: (fileId) => this.previewFile(fileId),
      reprocessDocument: (documentId) => this.reprocessDocument(documentId)
    };
  }

  async init() {
    this.render();
    await this.initializeTabs();
  }

  async reloadDocuments() {
    if (this.tabs.documents) {
      await this.tabs.documents.loadData();
    }
  }

  async initializeTabs() {
    // Initialize only the active tab for performance
    await this.loadActiveTab();
  }

  async loadActiveTab() {
    const tabElement = this.$(`#${this.state.activeTab}Tab`);
    if (!tabElement) return;

    // Clean up existing tab
    if (this.tabs[this.state.activeTab]) {
      this.tabs[this.state.activeTab].unmount();
      this.tabs[this.state.activeTab] = null;
    }

    // Create and mount new tab component
    switch (this.state.activeTab) {
      case 'chat':
        this.tabs.chat = new ChatTab().mount(tabElement);
        break;
      case 'documents':
        this.tabs.documents = new DocumentsTab().mount(tabElement);
        break;
      case 'audit':
        // AuditTab would be created here
        tabElement.innerHTML = this.renderAuditTab();
        break;
    }
  }

  template() {
    return `
      <div class="app">
        <header class="header">
          <div class="container">
            <div class="header-content">
              <div class="brand">
                <div class="logo">📚</div>
                <div class="brand-text">
                  <h1>RAG Service</h1>
                  <p>Knowledge Base Management</p>
                </div>
              </div>
              <div class="status-indicator">
                Online
              </div>
            </div>
          </div>
        </header>

        <main class="main">
          <div class="container">
            <nav class="tab-navigation">
              <div class="tabs">
                ${this.renderTabs()}
              </div>
            </nav>

            <div class="tab-content">
              <div id="chatTab" class="tab-pane ${this.state.activeTab === 'chat' ? 'active' : ''}">
                ${this.state.activeTab === 'chat' ? '' : ''}
              </div>

              <div id="documentsTab" class="tab-pane ${this.state.activeTab === 'documents' ? 'active' : ''}">
                ${this.state.activeTab === 'documents' ? this.renderDocumentsTab() : ''}
              </div>

              <div id="auditTab" class="tab-pane ${this.state.activeTab === 'audit' ? 'active' : ''}">
                ${this.state.activeTab === 'audit' ? this.renderAuditTab() : ''}
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
  }

  renderTabs() {
    const tabs = [
      { id: 'chat', icon: '💬', label: 'Chat' },
      { id: 'documents', icon: '📄', label: 'Documents' },
      { id: 'audit', icon: '📊', label: 'Audit' }
    ];

    return tabs.map(tab => `
      <button
        class="tab ${this.state.activeTab === tab.id ? 'active' : ''}"
        onclick="app.switchTab('${tab.id}')"
      >
        <span class="tab-icon">${tab.icon}</span>
        ${tab.label}
      </button>
    `).join('');
  }

  renderDocumentsTab() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <h4>Documents Management</h4>
        <p>Document management functionality will be implemented here.</p>
      </div>
    `;
  }

  renderAuditTab() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h4>Audit & Analytics</h4>
        <p>Audit and analytics functionality will be implemented here.</p>
      </div>
    `;
  }

  async switchTab(tabId) {
    if (tabId === this.state.activeTab) return;

    // Clean up current tab
    if (this.tabs[this.state.activeTab]) {
      if (typeof this.tabs[this.state.activeTab].unmount === 'function') {
        this.tabs[this.state.activeTab].unmount();
      }
      this.tabs[this.state.activeTab] = null;
    }

    // Update state
    this.setState({ activeTab: tabId });

    // Save to cookies
    SessionManager.setActiveTab(tabId);

    // Load new tab
    await this.loadActiveTab();
  }

  onRender() {
    // Re-initialize active tab after render
    if (this.state.activeTab) {
      this.loadActiveTab();
    }
  }

  // Modal and form methods
  async openCategoryModal() {
    const { CategoryForm } = await import('./components/forms/CategoryForm.js');
    CategoryForm.showAdd((result, action) => {
      console.log('Category', action, ':', result);
      // Refresh documents tab if active
      if (this.tabs.documents) {
        this.tabs.documents.loadData();
      }
    });
  }

  async editCategoryName(categoryId) {
    try {
      const { categoriesService } = await import('./api/services.js');
      const { CategoryForm } = await import('./components/forms/CategoryForm.js');

      const category = await categoriesService.getCategory(categoryId);
      CategoryForm.showEdit(categoryId, category, (result, action) => {
        console.log('Category', action, ':', result);
        // Refresh documents tab if active
        if (this.tabs.documents) {
          this.tabs.documents.loadData();
        }
      });
    } catch (error) {
      console.error('Error loading category:', error);
      alert('Failed to load category data');
    }
  }

  async openCollectionModal(categoryId) {
    const { CollectionForm } = await import('./components/forms/CollectionForm.js');
    await CollectionForm.showAdd(categoryId, (result, action) => {
      console.log('Collection', action, ':', result);
      // Refresh documents tab if active
      if (this.tabs.documents) {
        this.tabs.documents.loadData();
      }
    });
  }

  async editCollectionName(collectionId) {
    try {
      const { collectionsService } = await import('./api/services.js');
      const { CollectionForm } = await import('./components/forms/CollectionForm.js');

      const collection = await collectionsService.getCollection(collectionId);
      await CollectionForm.showEdit(collectionId, collection, (result, action) => {
        console.log('Collection', action, ':', result);
        // Refresh documents tab if active
        if (this.tabs.documents) {
          this.tabs.documents.loadData();
        }
      });
    } catch (error) {
      console.error('Error loading collection:', error);
      alert('Failed to load collection data');
    }
  }

  async openFileUpload(collectionId) {
    const { FileUploadForm } = await import('./components/forms/FileUploadForm.js');
    FileUploadForm.show(collectionId, (result, filesCount) => {
      console.log('Files uploaded:', result);
      // Refresh documents tab if active
      if (this.tabs.documents) {
        this.tabs.documents.loadData();
      }
    });
  }

  async previewFile(fileId) {
    try {
      const { FilePreview } = await import('./components/common/FilePreview.js');
      FilePreview.show(fileId);
    } catch (error) {
      console.error('Error opening file preview:', error);
      alert('Failed to open file preview. Please try again.');
    }
  }

  async reprocessDocument(documentId) {
    if (!confirm('Are you sure you want to reprocess this document? This will regenerate all embeddings and may take some time.')) {
      return;
    }

    try {
      const { documentsService } = await import('./api/services.js');
      const result = await documentsService.reprocessDocument(documentId);

      console.log('111 Document reprocessing started:', result);

      // Refresh documents tab if active
      if (this.tabs.documents) {
        this.tabs.documents.loadData();
      }
    } catch (error) {
      console.error('Error reprocessing document:', error);
      alert('Failed to start document reprocessing. Please try again.');
    }
  }

  onUnmount() {
    // Clean up all tab components
    Object.values(this.tabs).forEach(tab => {
      if (tab) tab.unmount();
    });

    // Clean up global references
    delete window.app;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const appElement = document.getElementById('app');
  if (appElement) {
    new App().mount(appElement);
  }
});