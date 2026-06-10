import { BaseComponent } from './BaseComponent.js';
import { validation } from '../../utils/helpers.js';

export class Form extends BaseComponent {
  constructor(options = {}) {
    super();

    this.options = {
      fields: options.fields || [],
      submitText: options.submitText || 'Submit',
      cancelText: options.cancelText || 'Cancel',
      showCancel: options.showCancel !== false,
      validateOnInput: options.validateOnInput !== false,
      ...options
    };

    this.data = options.data || {};
    this.errors = {};
    this.isSubmitting = false;

    this.onSubmit = options.onSubmit || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.onValidate = options.onValidate || (() => true);
  }

  render() {
    return `
      <form class="form" novalidate>
        ${this.renderFields()}
        ${this.renderButtons()}
      </form>
    `;
  }

  renderFields() {
    return this.options.fields.map(field => this.renderField(field)).join('');
  }

  renderField(field) {
    const value = this.data[field.name] || field.defaultValue || '';
    const error = this.errors[field.name];
    const errorClass = error ? 'has-error' : '';

    return `
      <div class="form-group ${errorClass}">
        ${this.renderLabel(field)}
        ${this.renderInput(field, value)}
        ${error ? `<div class="form-error">${error}</div>` : ''}
        ${field.help ? `<div class="form-help">${field.help}</div>` : ''}
      </div>
    `;
  }

  renderLabel(field) {
    if (field.type === 'hidden' || !field.label) return '';

    const required = field.required ? '*' : '';
    return `
      <label class="form-label" for="${field.name}">
        ${field.label}${required}
      </label>
    `;
  }

  renderInput(field, value) {
    const commonAttrs = `
      name="${field.name}"
      id="${field.name}"
      ${field.required ? 'required' : ''}
      ${field.disabled ? 'disabled' : ''}
      ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
    `;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'url':
      case 'tel':
        return `
          <input type="${field.type}"
                 class="form-control"
                 value="${this.escapeHtml(value)}"
                 ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                 ${commonAttrs}>
        `;

      case 'textarea':
        return `
          <textarea class="form-control"
                    ${field.rows ? `rows="${field.rows}"` : 'rows="3"'}
                    ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
                    ${commonAttrs}>${this.escapeHtml(value)}</textarea>
        `;

      case 'select':
        const options = field.options || [];
        return `
          <select class="form-control" ${commonAttrs}>
            ${field.placeholder ? `<option value="">${field.placeholder}</option>` : ''}
            ${options.map(option => `
              <option value="${this.escapeHtml(option.value)}"
                      ${option.value === value ? 'selected' : ''}>
                ${this.escapeHtml(option.label)}
              </option>
            `).join('')}
          </select>
        `;

      case 'color':
        return `
          <div class="form-color-input">
            <input type="color"
                   class="form-control form-control-color"
                   value="${value || '#007bff'}"
                   ${commonAttrs}>
          </div>
        `;

      case 'checkbox':
        return `
          <div class="form-check">
            <input type="checkbox"
                   class="form-check-input"
                   ${value ? 'checked' : ''}
                   ${commonAttrs}>
            <label class="form-check-label" for="${field.name}">
              ${field.checkboxLabel || field.label}
            </label>
          </div>
        `;

      case 'hidden':
        return `<input type="hidden" value="${this.escapeHtml(value)}" ${commonAttrs}>`;

      default:
        return `<input type="text" class="form-control" value="${this.escapeHtml(value)}" ${commonAttrs}>`;
    }
  }

  renderButtons() {
    return `
      <div class="form-buttons">
        ${this.options.showCancel ? `
          <button type="button" class="btn btn-secondary" data-action="cancel">
            ${this.options.cancelText}
          </button>
        ` : ''}
        <button type="submit" class="btn btn-primary" data-action="submit">
          ${this.options.submitText}
        </button>
      </div>
    `;
  }

  mount(container) {
    container.innerHTML = this.render();
    this.element = container.querySelector('.form');
    this.bindEvents();
    return this;
  }

  bindEvents() {
    if (!this.element) return;

    this.element.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    const cancelBtn = this.$('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    if (this.options.validateOnInput) {
      const inputs = this.$$('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('input', () => this.validateField(input.name));
        input.addEventListener('blur', () => this.validateField(input.name));
      });
    }
  }

  async handleSubmit() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.setSubmitButtonState(true);

    try {
      this.clearErrors();

      const formData = this.getFormData();

      if (!this.validate(formData)) {
        this.showErrors();
        return;
      }

      const result = await this.onSubmit(formData, this);

      if (result !== false) {
        this.data = formData;
      }
    } catch (error) {
      console.error('Form submission error:', error);
      this.showError('An error occurred while submitting the form');
    } finally {
      this.isSubmitting = false;
      this.setSubmitButtonState(false);
    }
  }

  handleCancel() {
    this.onCancel(this);
  }

  getFormData() {
    const formData = {};
    const inputs = this.$$('input, textarea, select');

    inputs.forEach(input => {
      const value = input.type === 'checkbox' ? input.checked : input.value;
      formData[input.name] = value;
    });

    return formData;
  }

  validate(data) {
    this.errors = {};
    let isValid = true;

    this.options.fields.forEach(field => {
      const value = data[field.name];
      const fieldErrors = this.validateField(field.name, value, field);

      if (fieldErrors.length > 0) {
        this.errors[field.name] = fieldErrors[0];
        isValid = false;
      }
    });

    const customValid = this.onValidate(data, this.errors, this);
    return isValid && customValid;
  }

  validateField(fieldName, value, field) {
    if (!field) {
      field = this.options.fields.find(f => f.name === fieldName);
    }
    if (!field) return [];

    if (value === undefined) {
      value = this.getFieldValue(fieldName);
    }

    const errors = [];

    if (field.required && validation.isEmpty(value)) {
      errors.push(`${field.label} is required`);
      return errors;
    }

    if (value && field.type === 'email' && !validation.isEmail(value)) {
      errors.push('Please enter a valid email address');
    }

    if (value && field.minLength && value.length < field.minLength) {
      errors.push(`${field.label} must be at least ${field.minLength} characters`);
    }

    if (value && field.maxLength && value.length > field.maxLength) {
      errors.push(`${field.label} cannot exceed ${field.maxLength} characters`);
    }

    if (field.validator && typeof field.validator === 'function') {
      const customError = field.validator(value, this.getFormData());
      if (customError) {
        errors.push(customError);
      }
    }

    return errors;
  }

  getFieldValue(fieldName) {
    const input = this.$(`[name="${fieldName}"]`);
    if (!input) return null;

    return input.type === 'checkbox' ? input.checked : input.value;
  }

  setFieldValue(fieldName, value) {
    const input = this.$(`[name="${fieldName}"]`);
    if (!input) return;

    if (input.type === 'checkbox') {
      input.checked = Boolean(value);
    } else {
      input.value = value;
    }
  }

  setFieldError(fieldName, error) {
    this.errors[fieldName] = error;
    this.showFieldError(fieldName);
  }

  clearFieldError(fieldName) {
    delete this.errors[fieldName];
    this.clearFieldErrorDisplay(fieldName);
  }

  clearErrors() {
    this.errors = {};
    this.$$('.form-error').forEach(el => el.remove());
    this.$$('.form-group.has-error').forEach(el => el.classList.remove('has-error'));
  }

  showErrors() {
    Object.keys(this.errors).forEach(fieldName => {
      this.showFieldError(fieldName);
    });
  }

  showFieldError(fieldName) {
    const formGroup = this.$(`[name="${fieldName}"]`)?.closest('.form-group');
    if (!formGroup) return;

    formGroup.classList.add('has-error');

    let errorEl = formGroup.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'form-error';
      const input = formGroup.querySelector('input, textarea, select');
      input.after(errorEl);
    }

    errorEl.textContent = this.errors[fieldName];
  }

  clearFieldErrorDisplay(fieldName) {
    const formGroup = this.$(`[name="${fieldName}"]`)?.closest('.form-group');
    if (!formGroup) return;

    formGroup.classList.remove('has-error');
    const errorEl = formGroup.querySelector('.form-error');
    if (errorEl) {
      errorEl.remove();
    }
  }

  setSubmitButtonState(loading) {
    const submitBtn = this.$('[data-action="submit"]');
    if (!submitBtn) return;

    if (loading) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = this.options.submitText;
    }
  }

  showError(message) {
    const existingAlert = this.$('.form-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alert = document.createElement('div');
    alert.className = 'form-alert alert alert-danger';
    alert.textContent = message;

    this.element.insertBefore(alert, this.element.firstChild);
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
}