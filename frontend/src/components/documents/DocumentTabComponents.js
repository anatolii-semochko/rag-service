import {fileUtils, stringUtils} from '../../utils/helpers.js';

export class DocumentTabComponents {
    constructor(documentsTab) {
        this.tab = documentsTab;
    }

    getProcessingStatus(item) {
        if (item.isActive) {
            return {class: 'ready', text: 'Ready'};
        } else {
            return {class: 'inactive', text: 'Inactive'};
        }
    }

    renderCategoriesTableRows() {
        if (this.tab.state.processedData.length === 0) {
            return '<tr><td colspan="7" class="empty-row">No categories. <button class="btn-link" onclick="window.app.openCategoryModal()">Create first category</button></td></tr>';
        }

        return this.tab.state.processedData.map(category => {
            const isExpanded = this.tab.state.expandedCategories.has(category.id);
            const collectionsCount = category.collectionsCount || 0;
            const totalFiles = category.documentsCount || 0;

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
          <td class="count-cell">${category.activeCollections} / ${category.activeDocuments}</td>
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
            if (isExpanded && category.collections && category.collections.length > 0) {
                rows += `
          <tr class="expanded-row">
            <td colspan="6" class="expanded-cell">
              <div class="nested-table-container">
                ${this.renderCollectionsTable(category.collections)}
              </div>
            </td>
          </tr>
        `;
            }

            return rows;
        }).join('');
    }

    renderCollectionsTable(collections) {
        if (collections.length === 0) {
            return '<p class="empty-nested">No collections in this category</p>';
        }

        let tableHTML = `
      <table class="nested-table collections-table">
        <tbody>
    `;

        collections.forEach(collection => {
            const isExpanded = this.tab.state.expandedCollections.has(collection.id);
            const documentsCount = collection.documentsCount || 0;

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
          <td class="actions-cell">
            <button class="toggle-switch ${collection.isActive ? 'active' : 'inactive'} ${collection.isDisabled ? 'disabled-by-parent' : ''}" style="margin-right: 40px" onclick="window.app.toggleCollectionActive('${collection.id}', ${collection.isActive})" title="${collection.isDisabled ? 'Disabled (category inactive)' : (collection.isActive ? 'Deactivate' : 'Activate')}">
              <span class="switch-slider"></span>
            </button>
            <button class="btn-icon upload-btn" onclick="window.app.openFileUpload('${collection.id}')" title="Upload Files">📤</button>
            <button class="btn-icon edit-btn" onclick="window.app.editCollectionName('${collection.id}')" title="Edit">✏️</button>
            <button class="btn-icon delete-btn ${documentsCount > 0 ? 'disabled' : ''}" onclick="window.app.deleteCollectionWithConfirm('${collection.id}', '${stringUtils.escapeHtml(collection.name)}', ${documentsCount > 0})" ${documentsCount > 0 ? 'disabled' : ''} title="${documentsCount > 0 ? 'Cannot delete collection with files' : 'Delete collection'}">🗑️</button>
          </td>
        </tr>
      `;

            // Add files table if expanded
            if (isExpanded && collection.documents && collection.documents.length > 0) {
                tableHTML += `
          <tr class="expanded-row">
            <td colspan="5" class="expanded-cell">
              <div class="nested-table-container files-container">
                ${this.renderFilesTable(collection.documents)}
              </div>
            </td>
          </tr>
        `;
            }
        });

        tableHTML += '</tbody></table>';
        return tableHTML;
    }

    renderFilesTable(documents) {
        if (documents.length === 0) {
            return '<p class="empty-nested">No files in this collection</p>';
        }

        let tableHTML = `
      <table class="nested-table files-table">
        <tbody>
    `;

        documents.forEach(file => {
            const sizeFormatted = file.fileSize ? fileUtils.formatFileSize(file.fileSize) : '-';
            const fileName = file.filename;
            const fileIcon = fileUtils.getFileIcon(file.mimeType);

            tableHTML += `
        <tr class="file-row">
          <td width="90"></td>
          <td>
            <span class="file-name" onclick="window.app.previewFile('${file.id}', '${stringUtils.escapeHtml(fileName)}')" title="Click to preview file">${fileIcon} ${stringUtils.escapeHtml(fileName)}</span>
          </td>
          <td class="count-cell">${sizeFormatted}</td>
          <td class="status-cell">
            <span class="status-badge ${this.getProcessingStatus(file).class}">${this.getProcessingStatus(file).text}</span>
          </td>
          <td class="actions-cell">
            <button class="toggle-switch ${file.isActive ? 'active' : 'inactive'} ${file.isDisabled ? 'disabled-by-parent' : ''}" style="margin-right: 40px" onclick="window.app.toggleFileActive('${file.id}', ${file.isActive})" title="${file.isDisabled ? 'Disabled (parent inactive)' : (file.isActive ? 'Deactivate' : 'Activate')}">
              <span class="switch-slider"></span>
            </button>
            <button class="btn-icon download-btn" onclick="window.app.downloadFile('${file.id}')" title="Download">📥</button>
            <button class="btn-icon reprocess-btn" onclick="window.app.reprocessDocument('${file.id}')" title="Reprocess Document">🔄</button>
            <button class="btn-icon delete-btn" onclick="window.app.deleteFileWithConfirm('${file.id}', '${stringUtils.escapeHtml(fileName)}')" title="Delete">🗑️</button>
          </td>
        </tr>
      `;
        });

        tableHTML += `
        </tbody>
      </table>
    `;

        return tableHTML;
    }
}