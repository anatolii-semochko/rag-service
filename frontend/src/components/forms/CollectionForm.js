import { Modal } from '../common/Modal.js';
import { Form } from '../common/Form.js';
import { collectionsService, categoriesService } from '../../api/services.js';

export class CollectionForm extends Modal {
  constructor(options = {}) {
    super({
      title: options.collectionId ? 'Edit Collection' : 'Add Collection',
      maxWidth: '500px',
      ...options
    });

    this.collectionId = options.collectionId;
    this.collectionData = options.collectionData || {};
    this.categoryId = options.categoryId;
    this.onSuccess = options.onSuccess || (() => {});
    this.categories = [];
  }

  renderBody() {
    return `<div class="modal-body" id="collection-form-container"></div>`;
  }

  async mount(container = document.body) {
    super.mount(container);
    await this.loadCategories();
    this.initForm();
    return this;
  }

  async loadCategories() {
    try {
      const response = await categoriesService.getCategories();
      this.categories = response.data || [];
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categories = [];
    }
  }

  initForm() {
    const formContainer = this.$('#collection-form-container');

    if (this.categories.length === 0) {
      formContainer.innerHTML = `
        <div class="alert alert-warning">
          <p>No categories available. Please create a category first.</p>
          <button type="button" class="btn btn-primary btn-sm" onclick="this.close()">Close</button>
        </div>
      `;
      return;
    }

    const categoryOptions = this.categories.map(cat => ({
      value: cat.id,
      label: cat.name
    }));

    this.form = new Form({
      fields: [
        {
          name: 'categoryId',
          label: 'Category',
          type: 'select',
          required: true,
          options: categoryOptions,
          defaultValue: this.categoryId || this.collectionData.categoryId,
          help: 'Select the category this collection belongs to'
        },
        {
          name: 'name',
          label: 'Collection Name',
          type: 'text',
          required: true,
          placeholder: 'Enter collection name',
          maxLength: 100,
          validator: (value) => {
            if (!value.trim()) {
              return 'Collection name is required';
            }
            if (value.trim().length < 2) {
              return 'Collection name must be at least 2 characters';
            }
          }
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          placeholder: 'Enter collection description (optional)',
          rows: 3,
          maxLength: 500
        },
        {
          name: 'isActive',
          label: 'Active Status',
          type: 'checkbox',
          checkboxLabel: 'Collection is active',
          defaultValue: this.collectionData.isActive !== undefined ? this.collectionData.isActive : true
        }
      ],
      data: this.collectionData,
      submitText: this.collectionId ? 'Update Collection' : 'Create Collection',
      onSubmit: (data) => this.handleSubmit(data),
      onCancel: () => this.close()
    });

    this.form.mount(formContainer);
  }

  async handleSubmit(data) {
    try {
      let result;

      if (this.collectionId) {
        result = await collectionsService.updateCollection(this.collectionId, {
          name: data.name.trim(),
          description: data.description.trim() || null,
          categoryId: data.categoryId,
          isActive: data.isActive
        });
      } else {
        result = await collectionsService.createCollection({
          name: data.name.trim(),
          description: data.description.trim() || null,
          categoryId: data.categoryId,
          isActive: data.isActive
        });
      }

      this.onSuccess(result, this.collectionId ? 'updated' : 'created');
      this.close();

    } catch (error) {
      console.error('Error submitting collection:', error);

      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message?.includes('already exists')) {
          this.form.setFieldError('name', 'A collection with this name already exists in this category');
        } else {
          this.form.showError('Please check your input and try again');
        }
      } else if (error.response?.status === 404) {
        const errorData = error.response.data;
        if (errorData?.message?.includes('Category')) {
          this.form.setFieldError('categoryId', 'Selected category not found');
        } else {
          this.form.showError('Collection not found');
        }
      } else {
        this.form.showError('An error occurred while saving the collection');
      }

      // Don't re-throw the error after showing it to user
      return false;
    }
  }

  static async show(options = {}) {
    const form = new CollectionForm(options);
    await form.mount();
    form.open();
    return form;
  }

  static async showAdd(categoryId, onSuccess) {
    return CollectionForm.show({
      categoryId: categoryId,
      onSuccess: onSuccess
    });
  }

  static async showEdit(collectionId, collectionData, onSuccess) {
    return CollectionForm.show({
      collectionId: collectionId,
      collectionData: collectionData,
      onSuccess: onSuccess
    });
  }
}