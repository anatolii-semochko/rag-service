import { Modal } from './Modal.js';
import { documentsService } from '../../api/services.js';

export class FilePreview extends Modal {
  constructor(options = {}) {
    super({
      title: options.title || 'File Preview',
      maxWidth: '800px',
      ...options
    });

    this.documentId = options.documentId;
    this.document = null;
    this.content = null;
    this.loading = false;
  }

  renderBody() {
    return `
      <div class="modal-body">
        <div class="file-preview-container">
          ${this.loading ? this.renderLoading() : this.renderContent()}
        </div>
      </div>
    `;
  }

  renderLoading() {
    return `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading file content...</p>
      </div>
    `;
  }

  renderContent() {
    if (!this.document || !this.content) {
      return `
        <div class="empty-state">
          <div class="empty-icon">📄</div>
          <h4>No content available</h4>
          <p>Unable to load file content.</p>
        </div>
      `;
    }

    return `
      <div class="file-info">
        <h4>${this.escapeHtml(this.document.originalFilename || this.document.filename)}</h4>
        <p class="file-meta">
          <span>Size: ${this.formatFileSize(this.document.fileSize)}</span>
          <span>Type: ${this.document.mimeType || 'Unknown'}</span>
          <span>Created: ${new Date(this.document.createdAt).toLocaleDateString()}</span>
        </p>
      </div>
      <div class="file-content">
        <div class="content-text">${this.escapeHtml(this.content)}</div>
      </div>
    `;
  }

  renderFooter() {
    return `
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary">Close</button>
      </div>
    `;
  }

  async mount(container = document.body) {
    super.mount(container);

    // Bind close button manually
    const closeBtn = this.$('.modal-footer .btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    await this.loadFileContent();
    return this;
  }

  async loadFileContent() {
    if (!this.documentId) return;

    try {
      this.loading = true;
      this.updateBody();

      // Load document metadata and content in parallel
      const [docResponse, contentResponse] = await Promise.all([
        documentsService.getDocument(this.documentId),
        documentsService.getDocumentContent(this.documentId)
      ]);

      this.document = docResponse.data || docResponse;
      this.content = contentResponse.content || contentResponse.data?.content || contentResponse.data || 'No content available';

      // Update modal title with document name
      const titleEl = this.$('.modal-title');
      if (titleEl && this.document) {
        titleEl.textContent = this.document.originalFilename || this.document.filename || 'File Preview';
      }

    } catch (error) {
      console.error('Error loading file content:', error);
      this.content = 'Error loading file content: ' + error.message;
    } finally {
      this.loading = false;
      this.updateBody();
    }
  }

  updateBody() {
    const bodyEl = this.$('.file-preview-container');
    if (bodyEl) {
      bodyEl.innerHTML = this.loading ? this.renderLoading() : this.renderContent();
    }
  }

  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const bytesNum = parseInt(bytes);
    if (isNaN(bytesNum)) return bytes + ' B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytesNum) / Math.log(1024));
    return Math.round(bytesNum / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return (text || '').replace(/[&<>"']/g, m => map[m]);
  }

  static show(documentId, options = {}) {
    const preview = new FilePreview({
      documentId: documentId,
      ...options
    });
    preview.mount();
    preview.open();
    return preview;
  }
}