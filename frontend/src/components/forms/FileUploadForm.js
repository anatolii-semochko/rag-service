import { Modal } from '../common/Modal.js';
import { documentsService } from '../../api/services.js';
import { fileUtils } from '../../utils/helpers.js';

export class FileUploadForm extends Modal {
  constructor(options = {}) {
    super({
      title: 'Upload Documents',
      maxWidth: '600px',
      ...options
    });

    this.collectionId = options.collectionId;
    this.onSuccess = options.onSuccess || (() => {});
    this.selectedFiles = [];
    this.uploading = false;

    this.allowedTypes = [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    this.maxFileSize = 10; // MB
  }

  renderBody() {
    return `
      <div class="modal-body">
        <div class="file-upload-container">
          <div class="file-upload-area" id="drop-zone">
            <div class="file-upload-icon">📁</div>
            <div class="file-upload-text">
              <strong>Click to select files</strong> or drag and drop
            </div>
            <div class="file-upload-hint">
              Supported: PDF, TXT, MD, DOCX, DOC, JPG, PNG, GIF (max ${this.maxFileSize}MB each)
            </div>
            <input type="file"
                   id="file-input"
                   class="file-input-hidden"
                   multiple
                   accept=".pdf,.txt,.md,.docx,.doc,.jpg,.jpeg,.png,.gif">
          </div>

          <div id="file-list" class="file-list" style="display: none;"></div>

          <div class="form-group" style="margin-top: 1rem;">
            <label class="form-label" for="title">Title (optional)</label>
            <input type="text"
                   id="title"
                   class="form-control"
                   placeholder="Custom title for uploaded documents"
                   maxlength="255">
          </div>

          <div class="form-group">
            <label class="form-label" for="description">Description (optional)</label>
            <textarea id="description"
                     class="form-control"
                     rows="3"
                     placeholder="Additional description or notes"
                     maxlength="1000"></textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderFooter() {
    return `
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="upload" disabled>
          Upload Files
        </button>
      </div>
    `;
  }

  mount(container = document.body) {
    super.mount(container);
    this.initFileUpload();
    this.bindButtonEvents();
    return this;
  }

  initFileUpload() {
    this.dropZone = this.$('#drop-zone');
    this.fileInput = this.$('#file-input');
    this.fileList = this.$('#file-list');
    this.uploadBtn = this.$('[data-action="upload"]');

    this.bindFileEvents();
  }

  bindButtonEvents() {
    // Cancel button
    const cancelBtn = this.$('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Upload button
    const uploadBtn = this.$('[data-action="upload"]');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.uploadFiles());
    }
  }

  bindFileEvents() {
    // File input change
    this.fileInput.addEventListener('change', (e) => {
      this.handleFileSelect(e.target.files);
    });

    // Drop zone click
    this.dropZone.addEventListener('click', () => {
      if (!this.uploading) {
        this.fileInput.click();
      }
    });

    // Drag and drop
    this.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.uploading) {
        this.dropZone.classList.add('drag-over');
      }
    });

    this.dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');
    });

    this.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropZone.classList.remove('drag-over');

      if (!this.uploading) {
        this.handleFileSelect(e.dataTransfer.files);
      }
    });

    // Upload button
    this.uploadBtn.addEventListener('click', () => this.handleUpload());

    // Cancel button
    const cancelBtn = this.$('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }
  }

  handleFileSelect(files) {
    const fileArray = Array.from(files);
    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      // Check file type
      if (!fileUtils.validateFileType(file, this.allowedTypes)) {
        errors.push(`${file.name}: Unsupported file type`);
        return;
      }

      // Check file size
      if (!fileUtils.validateFileSize(file, this.maxFileSize)) {
        errors.push(`${file.name}: File too large (max ${this.maxFileSize}MB)`);
        return;
      }

      // Check for duplicates
      const isDuplicate = this.selectedFiles.some(existing =>
        existing.name === file.name && existing.size === file.size
      );

      if (isDuplicate) {
        errors.push(`${file.name}: File already selected`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      this.showErrors(errors);
    }

    if (validFiles.length > 0) {
      this.selectedFiles.push(...validFiles);
      this.updateFileList();
      this.updateUploadButton();
    }
  }

  updateFileList() {
    if (this.selectedFiles.length === 0) {
      this.fileList.style.display = 'none';
      return;
    }

    this.fileList.style.display = 'block';
    this.fileList.innerHTML = this.selectedFiles.map((file, index) => `
      <div class="file-item" data-index="${index}">
        <div class="file-item-info">
          <div class="file-item-icon">${this.getFileIcon(file.type)}</div>
          <div class="file-item-details">
            <div class="file-item-name">${this.escapeHtml(file.name)}</div>
            <div class="file-item-size">${fileUtils.formatFileSize(file.size)}</div>
          </div>
        </div>
        <button type="button" class="file-item-remove" data-index="${index}">×</button>
      </div>
    `).join('');

    // Bind remove buttons
    this.fileList.querySelectorAll('.file-item-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.removeFile(index);
      });
    });
  }

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.updateFileList();
    this.updateUploadButton();
  }

  updateUploadButton() {
    this.uploadBtn.disabled = this.selectedFiles.length === 0 || this.uploading;
    this.uploadBtn.textContent = this.uploading ? 'Uploading...' : `Upload ${this.selectedFiles.length} File(s)`;
  }

  async handleUpload() {
    if (this.selectedFiles.length === 0 || this.uploading) return;

    this.uploading = true;
    this.updateUploadButton();

    try {
      const title = this.$('#title').value.trim() || null;
      const description = this.$('#description').value.trim() || null;

      const metadata = {};
      if (title) metadata.title = title;
      if (description) metadata.description = description;

      const result = await documentsService.uploadDocuments(
        this.collectionId,
        this.selectedFiles,
        metadata
      );

      this.onSuccess(result, result.uploadedCount || this.selectedFiles.length);
      this.close();

    } catch (error) {
      console.error('Error uploading files:', error);

      if (error.response?.status === 400) {
        this.showError('Invalid files or upload data. Please check your files and try again.');
      } else if (error.response?.status === 404) {
        this.showError('Collection not found. Please refresh and try again.');
      } else if (error.response?.status === 413) {
        this.showError('Files too large. Please reduce file sizes and try again.');
      } else {
        this.showError('An error occurred while uploading files. Please try again.');
      }
    } finally {
      this.uploading = false;
      this.updateUploadButton();
    }
  }

  getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType === 'text/plain') return '📄';
    if (mimeType === 'text/markdown') return '📝';
    return '📄';
  }

  showErrors(errors) {
    const errorContainer = this.$('.upload-errors');
    if (errorContainer) {
      errorContainer.remove();
    }

    const errorEl = document.createElement('div');
    errorEl.className = 'upload-errors alert alert-danger';
    errorEl.innerHTML = `
      <strong>File Upload Errors:</strong>
      <ul style="margin: 0.5rem 0 0 0; padding-left: 1.5rem;">
        ${errors.map(error => `<li>${this.escapeHtml(error)}</li>`).join('')}
      </ul>
    `;

    this.dropZone.before(errorEl);

    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.remove();
      }
    }, 5000);
  }

  showError(message) {
    const existingAlert = this.$('.form-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = 'form-alert alert alert-danger';
    alert.textContent = message;

    const container = this.$('.file-upload-container');
    container.insertBefore(alert, container.firstChild);
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

  static show(collectionId, onSuccess) {
    const form = new FileUploadForm({
      collectionId: collectionId,
      onSuccess: onSuccess
    });
    form.mount();
    form.open();
    return form;
  }
}