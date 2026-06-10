import { BaseComponent } from '../common/BaseComponent.js';
import { collectionsService } from '../../api/services.js';
import { stringUtils, dateUtils } from '../../utils/helpers.js';

export class CollectionTable extends BaseComponent {
  constructor(options = {}) {
    super();

    this.collections = options.collections || [];
    this.expandedCollections = options.expandedCollections || new Set();
    this.collectionFiles = options.collectionFiles || {};
    this.onExpand = options.onExpand || (() => {});
    this.onToggle = options.onToggle || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onRefresh = options.onRefresh || (() => {});
  }

  template() {
    return `
      <div class="collections-table">
        <table class="data-table nested-table">
          <thead>
            <tr>
              <th>Collections</th>
              <th width="60">Active</th>
              <th width="120">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${this.renderTableRows()}
          </tbody>
        </table>
      </div>
    `;
  }

  renderTableRows() {
    if (this.collections.length === 0) {
      return `
        <tr>
          <td colspan="3" class="empty-cell">
            <div class="empty-state small">
              <div class="empty-icon">📚</div>
              <p>No collections found</p>
            </div>
          </td>
        </tr>
      `;
    }

    return this.collections.map(collection => this.renderCollectionRow(collection)).join('');
  }

  renderCollectionRow(collection) {
    const isExpanded = this.expandedCollections.has(collection.id);
    const files = this.collectionFiles[collection.id] || [];
    const documentsCount = files.length;

    return `
      <tr class="collection-row ${!collection.isActive ? 'inactive' : ''}">
        <td class="collection-cell">
          <div class="collection-content">
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" onclick="this.handleExpand('${collection.id}')" ${documentsCount === 0 ? 'disabled' : ''}>
              ${documentsCount > 0 ? (isExpanded ? '▼' : '▶') : '○'}
            </button>
            <div class="collection-info">
              <div class="collection-name">${stringUtils.escapeHtml(collection.name)}</div>
              <div class="collection-description">${stringUtils.escapeHtml(collection.description || '')}</div>
              <div class="collection-stats">
                ${documentsCount} documents • Created ${dateUtils.formatRelativeTime(collection.createdAt)}
              </div>
            </div>
          </div>
        </td>
        <td class="toggle-cell">
          <button class="toggle-switch ${collection.isActive ? 'active' : 'inactive'}" onclick="this.handleToggle('${collection.id}', ${collection.isActive})" title="${collection.isActive ? 'Deactivate' : 'Activate'}">
            <div class="switch-slider"></div>
          </button>
        </td>
        <td class="actions-cell">
          <div class="collection-actions">
            <button class="btn-icon edit-btn" onclick="window.app.editCollectionName('${collection.id}')" title="Edit Collection">✏️</button>
            <button class="btn-icon upload-btn" onclick="window.app.openFileUpload('${collection.id}')" title="Upload Files">📤</button>
            <button class="btn-icon delete-btn ${documentsCount > 0 ? 'disabled' : ''}" onclick="this.handleDelete('${collection.id}', '${stringUtils.escapeHtml(collection.name)}', ${documentsCount > 0})" ${documentsCount > 0 ? 'disabled' : ''} title="${documentsCount > 0 ? 'Cannot delete collection with files' : 'Delete collection'}">🗑️</button>
          </div>
        </td>
      </tr>
      ${isExpanded && files.length > 0 ? this.renderFilesRow(collection.id) : ''}
    `;
  }

  renderFilesRow(collectionId) {
    return `
      <tr class="files-row">
        <td colspan="3" class="files-cell">
          <div class="files-container" id="files-${collectionId}">
            <!-- Files will be rendered here by FileTable -->
          </div>
        </td>
      </tr>
    `;
  }

  mount(container) {
    super.mount(container);
    this.bindEvents();
    return this;
  }

  bindEvents() {
    // Bind expand buttons
    this.$$('.expand-btn').forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const collectionId = onclick.match(/'([^']+)'/)[1];
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleExpand(collectionId);
        });
        btn.removeAttribute('onclick');
      }
    });

    // Bind toggle buttons
    this.$$('.toggle-switch').forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/'([^']+)', (true|false)/);
        const collectionId = match[1];
        const isActive = match[2] === 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleToggle(collectionId, isActive);
        });
        btn.removeAttribute('onclick');
      }
    });

    // Bind delete buttons
    this.$$('.delete-btn').forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/'([^']+)', '([^']+)', (true|false)/);
        if (match) {
          const collectionId = match[1];
          const collectionName = match[2];
          const hasFiles = match[3] === 'true';
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDelete(collectionId, collectionName, hasFiles);
          });
          btn.removeAttribute('onclick');
        }
      }
    });
  }

  handleExpand(collectionId) {
    this.onExpand(collectionId);
  }

  async handleToggle(collectionId, isCurrentlyActive) {
    try {
      await collectionsService.toggleCollection(collectionId, isCurrentlyActive);

      // Update local state
      const collection = this.collections.find(c => c.id === collectionId);
      if (collection) {
        collection.isActive = !isCurrentlyActive;
      }

      this.onToggle();
    } catch (error) {
      console.error('Error toggling collection:', error);
      alert('Failed to update collection status');
    }
  }

  async handleDelete(collectionId, collectionName, hasFiles) {
    if (hasFiles) {
      alert('Cannot delete collection with files');
      return;
    }

    if (confirm(`Are you sure you want to delete collection "${collectionName}"?`)) {
      try {
        await collectionsService.deleteCollection(collectionId);
        this.onDelete();
      } catch (error) {
        console.error('Error deleting collection:', error);
        alert('Failed to delete collection');
      }
    }
  }

  updateData(collections, expandedCollections, collectionFiles) {
    this.collections = collections;
    this.expandedCollections = expandedCollections;
    this.collectionFiles = collectionFiles;
    this.render();
  }
}