import { BaseComponent } from './BaseComponent.js';

export class Modal extends BaseComponent {
  constructor(options = {}) {
    super();

    this.options = {
      title: options.title || 'Modal',
      maxWidth: options.maxWidth || '500px',
      closable: options.closable !== false,
      backdrop: options.backdrop !== false,
      keyboard: options.keyboard !== false,
      ...options
    };

    this.isOpen = false;
    this.onClose = options.onClose || (() => {});
    this.onOpen = options.onOpen || (() => {});
  }

  render() {
    return `
      <div class="modal-overlay" style="display: none;">
        <div class="modal" style="max-width: ${this.options.maxWidth};">
          ${this.renderHeader()}
          ${this.renderBody()}
          ${this.renderFooter()}
        </div>
      </div>
    `;
  }

  renderHeader() {
    return `
      <div class="modal-header">
        <h3>${this.options.title}</h3>
        ${this.options.closable ? '<button class="btn-close" type="button">&times;</button>' : ''}
      </div>
    `;
  }

  renderBody() {
    return `<div class="modal-body"></div>`;
  }

  renderFooter() {
    return `<div class="modal-footer"></div>`;
  }

  mount(container = document.body) {
    const modalHTML = this.render();
    container.insertAdjacentHTML('beforeend', modalHTML);

    this.element = container.lastElementChild;
    this.overlay = this.element;
    this.modal = this.$('.modal');
    this.header = this.$('.modal-header');
    this.body = this.$('.modal-body');
    this.footer = this.$('.modal-footer');

    this.bindEvents();
    return this;
  }

  bindEvents() {
    if (this.options.closable) {
      const closeBtn = this.$('.btn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.close());
      }
    }

    if (this.options.backdrop) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }

    if (this.options.keyboard) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });
    }
  }

  setTitle(title) {
    const titleEl = this.$('.modal-header h3');
    if (titleEl) {
      titleEl.textContent = title;
    }
    return this;
  }

  setBody(content) {
    if (this.body) {
      if (typeof content === 'string') {
        this.body.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.body.innerHTML = '';
        this.body.appendChild(content);
      }
    }
    return this;
  }

  setFooter(content) {
    if (this.footer) {
      if (typeof content === 'string') {
        this.footer.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        this.footer.innerHTML = '';
        this.footer.appendChild(content);
      }
    }
    return this;
  }

  addFooterButton(text, className = 'btn-secondary', onClick = () => {}) {
    if (!this.footer) return this;

    const button = document.createElement('button');
    button.className = `btn ${className}`;
    button.textContent = text;
    button.addEventListener('click', onClick);

    this.footer.appendChild(button);
    return this;
  }

  open() {
    if (this.isOpen) return this;

    this.isOpen = true;
    this.overlay.style.display = 'flex';

    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      this.modal.style.transform = 'scale(1) translateY(0)';
      this.modal.style.opacity = '1';
    });

    this.onOpen(this);
    return this;
  }

  close() {
    if (!this.isOpen) return this;

    this.isOpen = false;

    this.modal.style.transform = 'scale(0.9) translateY(-20px)';
    this.modal.style.opacity = '0';

    setTimeout(() => {
      this.overlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 300);

    this.onClose(this);
    return this;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.isOpen = false;
    document.body.style.overflow = '';
  }

  static create(options) {
    const modal = new Modal(options);
    modal.mount();
    return modal;
  }
}