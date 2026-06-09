import { BaseComponent } from '../common/BaseComponent.js';
import { documentsService } from '../../api/services.js';
import { stringUtils, dateUtils, fileUtils } from '../../utils/helpers.js';

export class FileTable extends BaseComponent {
  constructor(options = {}) {
    super();

    this.files = options.files || [];
    this.onToggle = options.onToggle || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onRefresh = options.onRefresh || (() => {});
  }

  template() {
    return `
      <div class="files-table">
        <table class="data-table files-nested-table">
          <thead>
            <tr>
              <th>Files</th>
              <th width="60">Active</th>
              <th width="160">Actions</th>
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
    if (this.files.length === 0) {
      return `
        <tr>
          <td colspan="3" class="empty-cell">
            <div class="empty-state small">
              <div class="empty-icon">📄</div>
              <p>No files found</p>
            </div>
          </td>
        </tr>
      `;
    }

    return this.files.map(file => this.renderFileRow(file)).join('');
  }

  renderFileRow(file) {
    const fileIcon = fileUtils.getFileIcon(file.mimeType);
    const fileName = file.originalFilename || file.filename || file.title || 'Unknown';
    const fileSize = fileUtils.formatFileSize(file.fileSize);
    const uploadDate = dateUtils.formatRelativeTime(file.createdAt);
    const processingStatus = this.getProcessingStatus(file);

    return `
      <tr class="file-row ${!file.isActive ? 'inactive' : ''}">
        <td class="file-cell">
          <div class="file-content">
            <span class="file-icon">${fileIcon}</span>
            <div class="file-info">
              <div class="file-details">
                <span class="file-name" onclick="window.app.previewFile('${file.id}')" title="Click to preview">${stringUtils.escapeHtml(fileName)}</span>
                <div class="file-meta">
                  ${fileSize} • ${uploadDate} • ${processingStatus.text}
                </div>
              </div>
            </div>
          </div>
        </td>
        <td class="toggle-cell">
          <button class="toggle-switch ${file.isActive ? 'active' : 'inactive'}" onclick="this.handleToggle('${file.id}', ${file.isActive})" title="${file.isActive ? 'Deactivate' : 'Activate'}">
            <div class="switch-slider"></div>
          </button>
        </td>
        <td class="actions-cell">
          <div class="file-actions">
            <button class="btn-icon preview-btn" onclick="window.app.previewFile('${file.id}')" title="Preview Content">👁️</button>
            <button class="btn-icon reprocess-btn ${processingStatus.canReprocess ? '' : 'disabled'}" onclick="this.handleReprocess('${file.id}')" ${processingStatus.canReprocess ? '' : 'disabled'} title="${processingStatus.canReprocess ? 'Reprocess Document' : 'Cannot reprocess at this time'}">🔄</button>
            <button class="btn-icon delete-btn" onclick="this.handleDelete('${file.id}', '${stringUtils.escapeHtml(fileName)}')" title="Delete File">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }

  getProcessingStatus(file) {
    const metadata = file.metadata || {};
    const status = metadata.status || 'unknown';
    const isProcessed = file.isProcessed;

    switch (status) {
      case 'processing':
        return { text: 'Processing...', canReprocess: false, class: 'status-processing' };
      case 'completed':
        return { text: 'Processed', canReprocess: true, class: 'status-completed' };
      case 'failed':
        return { text: 'Failed', canReprocess: true, class: 'status-failed' };
      case 'pending':
        return { text: 'Pending', canReprocess: false, class: 'status-pending' };
      default:
        if (isProcessed) {
          return { text: 'Processed', canReprocess: true, class: 'status-completed' };
        } else {
          return { text: 'Not processed', canReprocess: true, class: 'status-pending' };
        }
    }
  }

  mount(container) {
    super.mount(container);
    this.bindEvents();
    return this;
  }

  bindEvents() {
    // Bind toggle buttons
    this.$$('.toggle-switch').forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/'([^']+)', (true|false)/);
        const fileId = match[1];
        const isActive = match[2] === 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleToggle(fileId, isActive);
        });
        btn.removeAttribute('onclick');
      }
    });

    // Bind reprocess buttons
    this.$$('.reprocess-btn').forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const fileId = onclick.match(/'([^']+)'/)[1];
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleReprocess(fileId);
        });
        btn.removeAttribute('onclick');
      }
    });

    // Bind delete buttons
    this.$$('.delete-btn').forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/'([^']+)', '([^']+)'/);
        if (match) {
          const fileId = match[1];
          const fileName = match[2];
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDelete(fileId, fileName);
          });
          btn.removeAttribute('onclick');
        }
      }
    });
  }

  async handleToggle(fileId, isCurrentlyActive) {
    try {
      await documentsService.toggleDocument(fileId, isCurrentlyActive);

      // Update local state
      const file = this.files.find(f => f.id === fileId);
      if (file) {
        file.isActive = !isCurrentlyActive;
      }

      this.onToggle();
    } catch (error) {
      console.error('Error toggling file:', error);
      alert('Failed to update file status');
    }
  }

  async handleReprocess(fileId) {
    if (!confirm('Are you sure you want to reprocess this document? This will regenerate all embeddings and may take some time.')) {
      return;
    }

    try {
      await documentsService.reprocessDocument(fileId);

      // Update local state
      const file = this.files.find(f => f.id === fileId);
      if (file && file.metadata) {
        file.metadata.status = 'processing';
      }

      console.log('222 Document reprocessing started');

      this.onRefresh();
    } catch (error) {
      console.error('Error reprocessing document:', error);
      alert('Failed to start document reprocessing. Please try again.');
    }
  }

  async handleDelete(fileId, fileName) {
    if (confirm(`Are you sure you want to delete file "${fileName}"?`)) {
      try {
        await documentsService.deleteDocument(fileId);
        this.onDelete();
      } catch (error) {
        console.error('Error deleting file:', error);
        alert('Failed to delete file');
      }
    }
  }

  updateData(files) {
    this.files = files;
    this.render();
  }
}