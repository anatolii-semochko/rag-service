import { BaseComponent } from '../common/BaseComponent.js';
import { categoriesService } from '../../api/services.js';
import { stringUtils } from '../../utils/helpers.js';

export class CategoryTable extends BaseComponent {
  constructor(options = {}) {
    super();

    this.categories = options.categories || [];
    this.expandedCategories = options.expandedCategories || new Set();
    this.categoryCollections = options.categoryCollections || {};
    this.onExpand = options.onExpand || (() => {});
    this.onToggle = options.onToggle || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onRefresh = options.onRefresh || (() => {});
  }

  template() {
    return `
      <div class="categories-table">
        <table class="data-table">
          <thead>
            <tr>
              <th>Categories</th>
              <th width="60">Active</th>
              <th width="100">Actions</th>
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
    if (this.categories.length === 0) {
      return `
        <tr>
          <td colspan="3" class="empty-cell">
            <div class="empty-state">
              <div class="empty-icon">📁</div>
              <p>No categories found</p>
            </div>
          </td>
        </tr>
      `;
    }

    return this.categories.map(category => this.renderCategoryRow(category)).join('');
  }

  renderCategoryRow(category) {
    const isExpanded = this.expandedCategories.has(category.id);
    const collections = this.categoryCollections[category.id] || category.collections || [];
    const collectionsCount = collections.length;

    return `
      <tr class="category-row ${!category.isActive ? 'inactive' : ''}">
        <td class="category-cell">
          <div class="category-content">
            <button class="expand-btn ${isExpanded ? 'expanded' : ''}" onclick="this.handleExpand('${category.id}')" ${collectionsCount === 0 ? 'disabled' : ''}>
              ${collectionsCount > 0 ? (isExpanded ? '▼' : '▶') : '○'}
            </button>
            <span class="category-color" style="background-color: ${category.color || '#007bff'}"></span>
            <div class="category-info">
              <div class="category-name">${stringUtils.escapeHtml(category.name)}</div>
              <div class="category-description">${stringUtils.escapeHtml(category.description || '')}</div>
              <div class="category-stats">${collectionsCount} collections</div>
            </div>
          </div>
        </td>
        <td class="toggle-cell">
          <button class="toggle-switch ${category.isActive ? 'active' : 'inactive'}" onclick="this.handleToggle('${category.id}', ${category.isActive})" title="${category.isActive ? 'Deactivate' : 'Activate'}">
            <div class="switch-slider"></div>
          </button>
        </td>
        <td class="actions-cell">
          <div class="category-actions">
            <button class="btn-icon edit-btn" onclick="window.app.editCategoryName('${category.id}')" title="Edit Category">✏️</button>
            <button class="btn-icon add-btn" onclick="window.app.openCollectionModal('${category.id}')" title="Add Collection">➕</button>
            <button class="btn-icon delete-btn ${collectionsCount > 0 ? 'disabled' : ''}" onclick="this.handleDelete('${category.id}', '${stringUtils.escapeHtml(category.name)}', ${collectionsCount > 0})" ${collectionsCount > 0 ? 'disabled' : ''} title="${collectionsCount > 0 ? 'Cannot delete category with collections' : 'Delete category'}">🗑️</button>
          </div>
        </td>
      </tr>
      ${isExpanded && collections.length > 0 ? this.renderCollectionsRow(category.id) : ''}
    `;
  }

  renderCollectionsRow(categoryId) {
    return `
      <tr class="collections-row">
        <td colspan="3" class="collections-cell">
          <div class="collections-container" id="collections-${categoryId}">
            <!-- Collections will be rendered here by CollectionTable -->
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
        const categoryId = onclick.match(/'([^']+)'/)[1];
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleExpand(categoryId);
        });
        btn.removeAttribute('onclick');
      }
    });

    // Bind toggle buttons
    this.$$('.toggle-switch').forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (onclick) {
        const match = onclick.match(/'([^']+)', (true|false)/);
        const categoryId = match[1];
        const isActive = match[2] === 'true';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleToggle(categoryId, isActive);
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
          const categoryId = match[1];
          const categoryName = match[2];
          const hasCollections = match[3] === 'true';
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleDelete(categoryId, categoryName, hasCollections);
          });
          btn.removeAttribute('onclick');
        }
      }
    });
  }

  handleExpand(categoryId) {
    this.onExpand(categoryId);
  }

  async handleToggle(categoryId, isCurrentlyActive) {
    try {
      await categoriesService.toggleCategory(categoryId, isCurrentlyActive);

      // Update local state
      const category = this.categories.find(c => c.id === categoryId);
      if (category) {
        category.isActive = !isCurrentlyActive;
      }

      this.onToggle();
    } catch (error) {
      console.error('Error toggling category:', error);
      alert('Failed to update category status');
    }
  }

  async handleDelete(categoryId, categoryName, hasCollections) {
    if (hasCollections) {
      alert('Cannot delete category with collections');
      return;
    }

    if (confirm(`Are you sure you want to delete category "${categoryName}"?`)) {
      try {
        await categoriesService.deleteCategory(categoryId);
        this.onDelete();
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  }

  updateData(categories, expandedCategories, categoryCollections) {
    this.categories = categories;
    this.expandedCategories = expandedCategories;
    this.categoryCollections = categoryCollections;
    this.render();
    this.bindEvents();
  }
}