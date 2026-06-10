import { Modal } from '../common/Modal.js';
import { Form } from '../common/Form.js';
import { categoriesService } from '../../api/services.js';

export class CategoryForm extends Modal {
  constructor(options = {}) {
    super({
      title: options.categoryId ? 'Edit Category' : 'Add Category',
      maxWidth: '400px',
      ...options
    });

    this.categoryId = options.categoryId;
    this.categoryData = options.categoryData || {};
    this.onSuccess = options.onSuccess || (() => {});
  }

  renderBody() {
    return `<div class="modal-body" id="category-form-container"></div>`;
  }

  mount(container = document.body) {
    super.mount(container);
    this.initForm();
    return this;
  }

  initForm() {
    const formContainer = this.$('#category-form-container');

    this.form = new Form({
      fields: [
        {
          name: 'name',
          label: 'Category Name',
          type: 'text',
          required: true,
          placeholder: 'Enter category name',
          maxLength: 100,
          validator: (value) => {
            if (!value.trim()) {
              return 'Category name is required';
            }
            if (value.trim().length < 2) {
              return 'Category name must be at least 2 characters';
            }
          }
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Enter category description (optional)',
          rows: 3,
          maxLength: 500
        },
        {
          name: 'color',
          label: 'Color',
          type: 'color',
          defaultValue: '#007bff',
          help: 'Choose a color for this category'
        },
        {
          name: 'isActive',
          label: 'Active Status',
          type: 'checkbox',
          checkboxLabel: 'Category is active',
          defaultValue: true
        }
      ],
      data: this.categoryData,
      submitText: this.categoryId ? 'Update Category' : 'Create Category',
      onSubmit: (data) => this.handleSubmit(data),
      onCancel: () => this.close()
    });

    this.form.mount(formContainer);
  }

  async handleSubmit(data) {
    try {
      let result;

      if (this.categoryId) {
        result = await categoriesService.updateCategory(this.categoryId, {
          name: data.name.trim(),
          description: data.description.trim() || null,
          color: data.color,
          isActive: data.isActive
        });
      } else {
        result = await categoriesService.createCategory({
          name: data.name.trim(),
          description: data.description.trim() || null,
          color: data.color,
          isActive: data.isActive
        });
      }

      this.onSuccess(result, this.categoryId ? 'updated' : 'created');
      this.close();

    } catch (error) {
      console.error('Error submitting category:', error);

      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message?.includes('already exists')) {
          this.form.setFieldError('name', 'A category with this name already exists');
        } else {
          this.form.showError('Please check your input and try again');
        }
      } else if (error.response?.status === 404) {
        this.form.showError('Category not found');
      } else {
        this.form.showError('An error occurred while saving the category');
      }

      // Don't re-throw the error after showing it to user
      return false;
    }
  }

  static show(options = {}) {
    const form = new CategoryForm(options);
    form.mount();
    form.open();
    return form;
  }

  static showAdd(onSuccess) {
    return CategoryForm.show({
      onSuccess: onSuccess
    });
  }

  static showEdit(categoryId, categoryData, onSuccess) {
    return CategoryForm.show({
      categoryId: categoryId,
      categoryData: categoryData,
      onSuccess: onSuccess
    });
  }
}