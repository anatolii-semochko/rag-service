// DOM utilities
export const dom = {
  // Element creation and manipulation
  createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else {
        element.setAttribute(key, value);
      }
    });

    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else if (child instanceof Element) {
        element.appendChild(child);
      }
    });

    return element;
  },

  // Query selectors
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  },

  // Element manipulation
  show(element) {
    if (element) element.style.display = '';
  },

  hide(element) {
    if (element) element.style.display = 'none';
  },

  toggle(element) {
    if (element) {
      element.style.display = element.style.display === 'none' ? '' : 'none';
    }
  },

  addClass(element, className) {
    if (element) element.classList.add(className);
  },

  removeClass(element, className) {
    if (element) element.classList.remove(className);
  },

  toggleClass(element, className) {
    if (element) element.classList.toggle(className);
  },

  hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
  },

  // Event handling
  on(element, event, handler) {
    if (element) element.addEventListener(event, handler);
  },

  off(element, event, handler) {
    if (element && typeof element.removeEventListener === 'function') {
      element.removeEventListener(event, handler);
    }
  },

  // Scroll utilities
  scrollToBottom(element) {
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  },

  scrollToTop(element) {
    if (element) {
      element.scrollTop = 0;
    }
  },

  // Focus utilities
  focus(element) {
    if (element) {
      element.focus();
    }
  },

  blur(element) {
    if (element) {
      element.blur();
    }
  },

  // Value utilities
  getValue(element) {
    return element ? element.value || element.textContent : '';
  },

  setValue(element, value) {
    if (element) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.value = value;
      } else {
        element.textContent = value;
      }
    }
  },

  clearValue(element) {
    this.setValue(element, '');
  }
};