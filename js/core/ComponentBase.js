/**
 * ComponentBase - Base class for all UI components
 * Provides safe DOM manipulation, state management, and lifecycle hooks
 */

class ComponentBase {
  constructor(element, options = {}) {
    if (!element) {
      throw new Error('Component requires a DOM element');
    }

    this.element = element;
    this.options = { ...this.defaults, ...options };
    this.state = {};
    this.eventListeners = new Map();
    this.childComponents = new Set();

    // Bind methods to maintain context
    this.render = this.render.bind(this);
    this.setState = this.setState.bind(this);
    this.destroy = this.destroy.bind(this);

    this.init();
  }

  // Default options - override in subclasses
  get defaults() {
    return {};
  }

  // Lifecycle Methods
  init() {
    this.beforeRender();
    this.bindEvents();
    this.render();
    this.afterRender();
  }

  beforeRender() {
    // Override in subclasses for pre-render logic
  }

  afterRender() {
    // Override in subclasses for post-render logic
  }

  // State Management
  setState(newState, shouldRender = true) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };

    if (shouldRender) {
      this.onStateChange(prevState, this.state);
      this.render();
    }
  }

  onStateChange(prevState, newState) {
    // Override in subclasses to handle state changes
  }

  // Safe DOM Manipulation
  render() {
    if (!this.element) return;

    // Clear existing content safely
    this.clearElement();

    // Create new content
    const content = this.template();
    if (content) {
      this.element.appendChild(content);
    }

    // Update attributes
    this.updateAttributes();
  }

  clearElement() {
    // Remove event listeners before clearing
    this.childComponents.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.childComponents.clear();

    // Clear content safely without innerHTML
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }
  }

  template() {
    // Override in subclasses to return DocumentFragment or Element
    const fragment = document.createDocumentFragment();
    const text = document.createTextNode('Component rendered');
    fragment.appendChild(text);
    return fragment;
  }

  updateAttributes() {
    // Override in subclasses to update element attributes
    if (this.options.className) {
      this.element.className = this.options.className;
    }

    if (this.options.ariaLabel) {
      this.element.setAttribute('aria-label', this.options.ariaLabel);
    }
  }

  // Event Management
  bindEvents() {
    // Override in subclasses to bind component-specific events
  }

  addEventListener(element, eventType, handler, options = {}) {
    if (!element || !eventType || !handler) return;

    const boundHandler = handler.bind(this);
    element.addEventListener(eventType, boundHandler, options);

    // Store reference for cleanup
    const key = `${eventType}_${Date.now()}`;
    this.eventListeners.set(key, {
      element,
      eventType,
      handler: boundHandler,
      options
    });

    return key;
  }

  removeEventListener(key) {
    if (!this.eventListeners.has(key)) return;

    const { element, eventType, handler, options } = this.eventListeners.get(key);
    element.removeEventListener(eventType, handler, options);
    this.eventListeners.delete(key);
  }

  removeAllEventListeners() {
    this.eventListeners.forEach((listener, key) => {
      this.removeEventListener(key);
    });
  }

  // Child Component Management
  addChildComponent(component) {
    this.childComponents.add(component);
  }

  removeChildComponent(component) {
    if (component.destroy) {
      component.destroy();
    }
    this.childComponents.delete(component);
  }

  // Utility Methods
  createElement(tagName, attributes = {}, textContent = '') {
    const element = document.createElement(tagName);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });

    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }

  createFragment() {
    return document.createDocumentFragment();
  }

  // Query helpers
  $(selector) {
    return this.element.querySelector(selector);
  }

  $$(selector) {
    return Array.from(this.element.querySelectorAll(selector));
  }

  // Animation helpers
  fadeIn(duration = 300) {
    return new Promise(resolve => {
      this.element.style.opacity = '0';
      this.element.style.transition = `opacity ${duration}ms ease`;

      // Force reflow
      this.element.offsetHeight;

      this.element.style.opacity = '1';

      setTimeout(resolve, duration);
    });
  }

  fadeOut(duration = 300) {
    return new Promise(resolve => {
      this.element.style.transition = `opacity ${duration}ms ease`;
      this.element.style.opacity = '0';

      setTimeout(resolve, duration);
    });
  }

  // Accessibility helpers
  setAriaLabel(label) {
    this.element.setAttribute('aria-label', label);
  }

  setAriaDescribedBy(id) {
    this.element.setAttribute('aria-describedby', id);
  }

  announceToScreenReader(message) {
    const announcement = this.createElement('div', {
      'aria-live': 'polite',
      'aria-atomic': 'true',
      className: 'sr-only'
    }, message);

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  // Cleanup
  destroy() {
    this.removeAllEventListeners();
    this.childComponents.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.childComponents.clear();

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this.element = null;
    this.state = null;
    this.options = null;
  }

  // Debug helpers
  log(...args) {
    if (this.options.debug) {
      console.log(`[${this.constructor.name}]`, ...args);
    }
  }

  warn(...args) {
    if (this.options.debug) {
      console.warn(`[${this.constructor.name}]`, ...args);
    }
  }

  error(...args) {
    console.error(`[${this.constructor.name}]`, ...args);
  }
}

export default ComponentBase;