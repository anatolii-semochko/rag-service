// Base Component Class
import { dom } from '../../utils/dom.js';
import { timing } from '../../utils/helpers.js';

export class BaseComponent {
  constructor(element = null) {
    this.element = element;
    this.listeners = new Map();
    this.state = {};

    // Bind methods to preserve 'this' context
    this.render = this.render.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  // State management
  setState(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.onStateChange(prevState, this.state);
    this.render();
  }

  getState() {
    return { ...this.state };
  }

  onStateChange(prevState, newState) {
    // Override in subclasses to handle state changes
  }

  // DOM manipulation helpers
  $(selector) {
    return this.element ? dom.$(selector, this.element) : dom.$(selector);
  }

  $$(selector) {
    return this.element ? dom.$$(selector, this.element) : dom.$$(selector);
  }

  createElement(tag, attributes, children) {
    return dom.createElement(tag, attributes, children);
  }

  // Event handling
  on(element, event, handler, options = {}) {
    const wrappedHandler = options.debounce
      ? timing.debounce(handler, options.debounce)
      : options.throttle
        ? timing.throttle(handler, options.throttle)
        : handler;

    dom.on(element, event, wrappedHandler);

    // Store for cleanup
    const key = `${element}_${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push({ original: handler, wrapped: wrappedHandler });
  }

  off(element, event, handler) {
    const key = `${element}_${event}`;
    const eventListeners = this.listeners.get(key);

    if (eventListeners) {
      const listener = eventListeners.find(l => l.original === handler);
      if (listener) {
        dom.off(element, event, listener.wrapped);
        const index = eventListeners.indexOf(listener);
        eventListeners.splice(index, 1);
      }
    }
  }

  // Component lifecycle
  mount(element) {
    this.element = element;
    this.onMount();
    this.render();
    return this;
  }

  unmount() {
    this.onUnmount();
    this.cleanup();
    this.element = null;
  }

  onMount() {
    // Override in subclasses
  }

  onUnmount() {
    // Override in subclasses
  }

  // Template rendering
  render() {
    if (!this.element) return;

    const content = this.template();
    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else if (content instanceof Element) {
      this.element.innerHTML = '';
      this.element.appendChild(content);
    }

    this.onRender();
  }

  template() {
    // Override in subclasses to return HTML string or Element
    return '';
  }

  onRender() {
    // Override in subclasses to handle post-render logic
  }

  // Cleanup
  cleanup() {
    // Remove all event listeners
    for (const [key, listeners] of this.listeners) {
      const [element, event] = key.split('_');
      listeners.forEach(({ wrapped }) => {
        dom.off(element, event, wrapped);
      });
    }
    this.listeners.clear();
  }

  destroy() {
    this.cleanup();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }

  // Helper methods
  show() {
    if (this.element) dom.show(this.element);
  }

  hide() {
    if (this.element) dom.hide(this.element);
  }

  toggle() {
    if (this.element) dom.toggle(this.element);
  }

  addClass(className) {
    if (this.element) dom.addClass(this.element, className);
  }

  removeClass(className) {
    if (this.element) dom.removeClass(this.element, className);
  }

  toggleClass(className) {
    if (this.element) dom.toggleClass(this.element, className);
  }

  hasClass(className) {
    return this.element ? dom.hasClass(this.element, className) : false;
  }

  // Loading state
  setLoading(isLoading) {
    if (isLoading) {
      this.addClass('loading');
    } else {
      this.removeClass('loading');
    }
  }

  // Error handling
  showError(message) {
    console.error(message);
    // Can be extended to show error UI
  }

  // Data binding helpers
  bindValue(element, stateKey) {
    if (!element) return;

    element.value = this.state[stateKey] || '';
    this.on(element, 'input', (e) => {
      this.setState({ [stateKey]: e.target.value });
    });
  }

  bindChecked(element, stateKey) {
    if (!element) return;

    element.checked = !!this.state[stateKey];
    this.on(element, 'change', (e) => {
      this.setState({ [stateKey]: e.target.checked });
    });
  }
}