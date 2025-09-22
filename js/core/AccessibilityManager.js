/**
 * Accessibility Manager - Enhanced Accessibility Features and Testing
 * Provides comprehensive accessibility support and WCAG compliance
 */

export class AccessibilityManager {
  constructor() {
    this.features = {
      skipLinks: true,
      focusManagement: true,
      keyboardNavigation: true,
      screenReaderSupport: true,
      colorContrastCheck: true,
      motionReduction: true,
      textScaling: true,
      announcements: true
    };

    this.announcer = null;
    this.focusHistory = [];
    this.lastActiveElement = null;
    this.keyboardTrapStack = [];

    // Accessibility preferences
    this.preferences = {
      highContrast: false,
      reducedMotion: false,
      largeText: false,
      screenReader: false
    };

    this.setupEventListeners();
  }

  async init() {
    console.log('♿ Accessibility Manager: Initializing...');

    try {
      // Create live region announcer
      this.createLiveRegionAnnouncer();

      // Setup skip links
      this.setupSkipLinks();

      // Enhance focus management
      this.setupFocusManagement();

      // Setup keyboard navigation
      this.setupKeyboardNavigation();

      // Check and improve color contrast
      this.checkColorContrast();

      // Setup motion reduction
      this.setupMotionReduction();

      // Setup text scaling
      this.setupTextScaling();

      // Add ARIA enhancements
      this.addAriaEnhancements();

      // Setup accessibility toolbar
      this.createAccessibilityToolbar();

      // Detect screen readers
      this.detectScreenReader();

      // Run accessibility audit
      await this.runAccessibilityAudit();

      console.log('✅ Accessibility Manager: Initialized successfully');

    } catch (error) {
      console.error('❌ Accessibility Manager: Initialization failed:', error);
    }
  }

  setupEventListeners() {
    // Focus events for focus management
    document.addEventListener('focusin', (event) => {
      this.handleFocusIn(event);
    });

    document.addEventListener('focusout', (event) => {
      this.handleFocusOut(event);
    });

    // Key events for keyboard navigation
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    // Mouse events for focus management
    document.addEventListener('mousedown', (event) => {
      this.handleMouseDown(event);
    });

    // Preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.preferences.reducedMotion = e.matches;
      this.applyMotionPreferences();
    });

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.preferences.highContrast = e.matches;
      this.applyContrastPreferences();
    });

    // Route changes for announcements
    window.addEventListener('popstate', () => {
      this.announceRouteChange();
    });

    // Content updates
    document.addEventListener('contentUpdated', (event) => {
      this.announceContentUpdate(event.detail);
    });
  }

  createLiveRegionAnnouncer() {
    // Create polite announcer
    this.announcer = {
      polite: document.createElement('div'),
      assertive: document.createElement('div')
    };

    // Configure polite announcer
    this.announcer.polite.setAttribute('aria-live', 'polite');
    this.announcer.polite.setAttribute('aria-atomic', 'true');
    this.announcer.polite.className = 'sr-only';
    this.announcer.polite.id = 'announcer-polite';

    // Configure assertive announcer
    this.announcer.assertive.setAttribute('aria-live', 'assertive');
    this.announcer.assertive.setAttribute('aria-atomic', 'true');
    this.announcer.assertive.className = 'sr-only';
    this.announcer.assertive.id = 'announcer-assertive';

    // Add to document
    document.body.appendChild(this.announcer.polite);
    document.body.appendChild(this.announcer.assertive);

    // Ensure sr-only class exists
    this.ensureSROnlyStyles();
  }

  ensureSROnlyStyles() {
    if (!document.querySelector('style[data-accessibility]')) {
      const style = document.createElement('style');
      style.setAttribute('data-accessibility', 'true');
      style.textContent = `
        .sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        .sr-only-focusable:focus {
          position: static !important;
          width: auto !important;
          height: auto !important;
          padding: inherit !important;
          margin: inherit !important;
          overflow: visible !important;
          clip: auto !important;
          white-space: inherit !important;
        }

        .focus-visible {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }

        .high-contrast {
          filter: contrast(150%) !important;
        }

        .reduced-motion * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        .large-text {
          font-size: 1.2em !important;
          line-height: 1.6 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }

  setupSkipLinks() {
    // Create skip links container
    const skipLinks = document.createElement('nav');
    skipLinks.className = 'skip-links';
    skipLinks.setAttribute('aria-label', 'Skip navigation');

    const skipLinksHtml = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
      <a href="#search" class="skip-link">Skip to search</a>
      <a href="#footer" class="skip-link">Skip to footer</a>
    `;

    skipLinks.innerHTML = skipLinksHtml;

    // Style skip links
    this.styleSkipLinks(skipLinks);

    // Insert at beginning of body
    document.body.insertBefore(skipLinks, document.body.firstChild);

    // Ensure targets exist or create them
    this.ensureSkipLinkTargets();
  }

  ensureSkipLinkTargets() {
    const targets = [
      { id: 'main-content', fallback: 'main, [role="main"], .main-content' },
      { id: 'navigation', fallback: 'nav, [role="navigation"], .navigation' },
      { id: 'search', fallback: '[role="search"], .search, #search-container' },
      { id: 'footer', fallback: 'footer, [role="contentinfo"], .footer' }
    ];

    targets.forEach(target => {
      let element = document.getElementById(target.id);

      if (!element) {
        element = document.querySelector(target.fallback);
        if (element && !element.id) {
          element.id = target.id;
        }
      }

      if (element) {
        element.setAttribute('tabindex', '-1');
      }
    });
  }

  setupFocusManagement() {
    // Enhanced focus management for modals and dynamic content
    document.addEventListener('focusin', (event) => {
      this.lastActiveElement = event.target;
    });

    // Focus trap management
    this.setupFocusTraps();
  }

  setupFocusTraps() {
    // Focus trap for modals
    const modals = document.querySelectorAll('.modal, [role="dialog"]');

    modals.forEach(modal => {
      this.makeFocusTrap(modal);
    });

    // Watch for new modals
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const newModals = node.querySelectorAll('.modal, [role="dialog"]');
            newModals.forEach(modal => this.makeFocusTrap(modal));
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  makeFocusTrap(container) {
    const focusableElements = this.getFocusableElements(container);

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    container.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  getFocusableElements(container) {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => {
        return element.offsetWidth > 0 || element.offsetHeight > 0 || element === document.activeElement;
      });
  }

  setupKeyboardNavigation() {
    // Enhanced keyboard navigation
    document.addEventListener('keydown', (event) => {
      // Escape key handling
      if (event.key === 'Escape') {
        this.handleEscapeKey(event);
      }

      // Enter and Space for button-like elements
      if (event.key === 'Enter' || event.key === ' ') {
        this.handleActivationKeys(event);
      }

      // Arrow key navigation for custom components
      if (event.key.startsWith('Arrow')) {
        this.handleArrowNavigation(event);
      }
    });
  }

  handleEscapeKey(event) {
    // Close open modals
    const openModal = document.querySelector('.modal[style*="display: flex"], .modal[style*="display: block"]');
    if (openModal) {
      const closeButton = openModal.querySelector('.close, [aria-label*="close"], [data-dismiss]');
      if (closeButton) {
        closeButton.click();
      }
      return;
    }

    // Close dropdowns
    const openDropdown = document.querySelector('.dropdown.open, .dropdown-menu[style*="block"]');
    if (openDropdown) {
      openDropdown.classList.remove('open');
      openDropdown.style.display = 'none';
    }
  }

  handleActivationKeys(event) {
    const target = event.target;

    // Handle elements with click handlers that aren't buttons
    if ((target.hasAttribute('onclick') || target.hasAttribute('data-action')) &&
        !['button', 'a', 'input'].includes(target.tagName.toLowerCase())) {

      if (event.key === 'Enter' || (event.key === ' ' && target.tagName.toLowerCase() !== 'input')) {
        event.preventDefault();
        target.click();
      }
    }
  }

  handleArrowNavigation(event) {
    const target = event.target;
    const parent = target.closest('[role="menu"], [role="menubar"], [role="tablist"], .nav-tabs');

    if (parent) {
      event.preventDefault();
      this.navigateWithArrows(parent, event.key, target);
    }
  }

  navigateWithArrows(container, key, currentElement) {
    const items = Array.from(container.querySelectorAll('[role="menuitem"], [role="tab"], .nav-link, a, button'))
      .filter(item => !item.disabled && item.offsetWidth > 0);

    const currentIndex = items.indexOf(currentElement);
    let nextIndex;

    switch (key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    if (items[nextIndex]) {
      items[nextIndex].focus();
    }
  }

  checkColorContrast() {
    // Check color contrast ratios
    const elementsToCheck = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, span');

    elementsToCheck.forEach(element => {
      const contrastRatio = this.getContrastRatio(element);

      if (contrastRatio < 4.5) {
        console.warn('Low contrast ratio detected:', element, 'Contrast:', contrastRatio);
        element.setAttribute('data-contrast-warning', 'true');
      }
    });
  }

  getContrastRatio(element) {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;

    // If background is transparent, check parent
    let bgColor = backgroundColor;
    let parent = element.parentElement;

    while (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
      if (!parent) break;
      bgColor = window.getComputedStyle(parent).backgroundColor;
      parent = parent.parentElement;
    }

    return this.calculateContrastRatio(color, bgColor);
  }

  calculateContrastRatio(color1, color2) {
    // Simplified contrast calculation
    // In a real implementation, you'd use a proper color library
    const rgb1 = this.parseRgb(color1);
    const rgb2 = this.parseRgb(color2);

    if (!rgb1 || !rgb2) return 7; // Assume good contrast if can't parse

    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  parseRgb(color) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : null;
  }

  getLuminance(rgb) {
    const [r, g, b] = rgb.map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  setupMotionReduction() {
    // Check for motion preference
    this.preferences.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.applyMotionPreferences();
  }

  applyMotionPreferences() {
    if (this.preferences.reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }

  setupTextScaling() {
    // Respect user's font size preferences
    const baseSize = parseFloat(getComputedStyle(document.documentElement).fontSize);

    if (baseSize > 16) {
      this.preferences.largeText = true;
      document.body.classList.add('large-text');
    }
  }

  addAriaEnhancements() {
    // Add missing ARIA labels and descriptions
    this.enhanceButtons();
    this.enhanceLinks();
    this.enhanceFormElements();
    this.enhanceImages();
    this.enhanceLandmarks();
  }

  enhanceButtons() {
    const buttons = document.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');

    buttons.forEach(button => {
      const text = button.textContent.trim();
      const icon = button.querySelector('svg, .icon');

      if (!text && icon) {
        // Button with only icon
        button.setAttribute('aria-label', this.guessButtonLabel(button));
      } else if (text.length < 3) {
        // Very short text
        button.setAttribute('aria-label', this.expandButtonLabel(text, button));
      }
    });
  }

  enhanceLinks() {
    const links = document.querySelectorAll('a:not([aria-label]):not([aria-labelledby])');

    links.forEach(link => {
      const text = link.textContent.trim();

      if (!text) {
        const img = link.querySelector('img');
        if (img) {
          link.setAttribute('aria-label', img.alt || 'Link');
        }
      } else if (text === 'Read more' || text === 'Learn more' || text === 'Click here') {
        // Generic link text - enhance with context
        const context = this.findLinkContext(link);
        if (context) {
          link.setAttribute('aria-label', `${text}: ${context}`);
        }
      }

      // External links
      if (link.hostname && link.hostname !== window.location.hostname) {
        const currentLabel = link.getAttribute('aria-label') || link.textContent;
        link.setAttribute('aria-label', `${currentLabel} (opens in new window)`);
      }
    });
  }

  enhanceFormElements() {
    // Add labels to form elements without them
    const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])');

    inputs.forEach(input => {
      const placeholder = input.placeholder;
      const type = input.type;

      if (placeholder) {
        input.setAttribute('aria-label', placeholder);
      } else {
        input.setAttribute('aria-label', this.getInputLabel(type));
      }
    });

    // Enhance search inputs
    const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i]');
    searchInputs.forEach(input => {
      if (!input.getAttribute('role')) {
        input.setAttribute('role', 'searchbox');
      }
    });
  }

  enhanceImages() {
    const images = document.querySelectorAll('img:not([alt])');

    images.forEach(img => {
      // Check if image is decorative
      if (this.isDecorativeImage(img)) {
        img.setAttribute('alt', '');
        img.setAttribute('role', 'presentation');
      } else {
        // Try to determine alt text from context
        const altText = this.generateAltText(img);
        img.setAttribute('alt', altText);
      }
    });
  }

  enhanceLandmarks() {
    // Add landmark roles where missing
    const header = document.querySelector('header:not([role])');
    if (header) header.setAttribute('role', 'banner');

    const nav = document.querySelector('nav:not([role])');
    if (nav) nav.setAttribute('role', 'navigation');

    const main = document.querySelector('main:not([role])');
    if (main) main.setAttribute('role', 'main');

    const footer = document.querySelector('footer:not([role])');
    if (footer) footer.setAttribute('role', 'contentinfo');

    // Add section headings where missing
    const sections = document.querySelectorAll('section:not(:has(h1,h2,h3,h4,h5,h6))');
    sections.forEach((section, index) => {
      section.setAttribute('aria-label', `Section ${index + 1}`);
    });
  }

  createAccessibilityToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'accessibility-toolbar';
    toolbar.className = 'accessibility-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'Accessibility options');

    toolbar.innerHTML = `
      <button class="a11y-toggle" data-feature="toolbar" aria-label="Toggle accessibility toolbar">
        <span class="a11y-icon">♿</span>
      </button>
      <div class="a11y-panel" style="display: none;">
        <div class="a11y-panel-header">
          <h3>Accessibility Options</h3>
          <button class="a11y-close" aria-label="Close accessibility panel">×</button>
        </div>
        <div class="a11y-controls">
          <button class="a11y-control" data-feature="contrast">
            <span class="control-icon">🎨</span>
            <span class="control-label">High Contrast</span>
          </button>
          <button class="a11y-control" data-feature="motion">
            <span class="control-icon">🎬</span>
            <span class="control-label">Reduce Motion</span>
          </button>
          <button class="a11y-control" data-feature="text-size">
            <span class="control-icon">🔍</span>
            <span class="control-label">Large Text</span>
          </button>
          <button class="a11y-control" data-feature="focus-indicators">
            <span class="control-icon">🎯</span>
            <span class="control-label">Focus Indicators</span>
          </button>
        </div>
      </div>
    `;

    this.styleAccessibilityToolbar(toolbar);
    document.body.appendChild(toolbar);

    // Add event listeners
    this.setupToolbarEvents(toolbar);
  }

  setupToolbarEvents(toolbar) {
    const toggle = toolbar.querySelector('.a11y-toggle');
    const panel = toolbar.querySelector('.a11y-panel');
    const close = toolbar.querySelector('.a11y-close');
    const controls = toolbar.querySelectorAll('.a11y-control');

    toggle.addEventListener('click', () => {
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : 'block';
      toggle.setAttribute('aria-expanded', !isVisible);

      if (!isVisible) {
        panel.querySelector('.a11y-control').focus();
      }
    });

    close.addEventListener('click', () => {
      panel.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    });

    controls.forEach(control => {
      control.addEventListener('click', () => {
        const feature = control.dataset.feature;
        this.toggleAccessibilityFeature(feature, control);
      });
    });
  }

  toggleAccessibilityFeature(feature, button) {
    switch (feature) {
      case 'contrast':
        this.preferences.highContrast = !this.preferences.highContrast;
        this.applyContrastPreferences();
        button.classList.toggle('active', this.preferences.highContrast);
        this.announce(`High contrast ${this.preferences.highContrast ? 'enabled' : 'disabled'}`);
        break;

      case 'motion':
        this.preferences.reducedMotion = !this.preferences.reducedMotion;
        this.applyMotionPreferences();
        button.classList.toggle('active', this.preferences.reducedMotion);
        this.announce(`Motion reduction ${this.preferences.reducedMotion ? 'enabled' : 'disabled'}`);
        break;

      case 'text-size':
        this.preferences.largeText = !this.preferences.largeText;
        document.body.classList.toggle('large-text', this.preferences.largeText);
        button.classList.toggle('active', this.preferences.largeText);
        this.announce(`Large text ${this.preferences.largeText ? 'enabled' : 'disabled'}`);
        break;

      case 'focus-indicators':
        document.body.classList.toggle('enhanced-focus');
        button.classList.toggle('active');
        const enhanced = document.body.classList.contains('enhanced-focus');
        this.announce(`Enhanced focus indicators ${enhanced ? 'enabled' : 'disabled'}`);
        break;
    }

    // Save preferences
    this.savePreferences();
  }

  applyContrastPreferences() {
    if (this.preferences.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }

  detectScreenReader() {
    // Detect if screen reader is likely active
    const testElement = document.createElement('div');
    testElement.setAttribute('aria-hidden', 'true');
    testElement.style.position = 'absolute';
    testElement.style.left = '-9999px';
    testElement.textContent = 'test';

    document.body.appendChild(testElement);

    setTimeout(() => {
      const rect = testElement.getBoundingClientRect();
      this.preferences.screenReader = rect.width === 0 && rect.height === 0;
      document.body.removeChild(testElement);

      if (this.preferences.screenReader) {
        console.log('♿ Screen reader detected');
        document.body.classList.add('screen-reader-active');
      }
    }, 100);
  }

  async runAccessibilityAudit() {
    const issues = [];

    // Check for missing alt text
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} images missing alt text`);
    }

    // Check for missing form labels
    const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])');
    if (inputsWithoutLabels.length > 0) {
      issues.push(`${inputsWithoutLabels.length} form inputs missing labels`);
    }

    // Check for missing headings
    const hasH1 = document.querySelector('h1');
    if (!hasH1) {
      issues.push('Page missing h1 heading');
    }

    // Check for proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    let hierarchyIssues = 0;

    headings.forEach(heading => {
      const level = parseInt(heading.tagName.slice(1));
      if (level > lastLevel + 1) {
        hierarchyIssues++;
      }
      lastLevel = level;
    });

    if (hierarchyIssues > 0) {
      issues.push(`${hierarchyIssues} heading hierarchy issues`);
    }

    // Log audit results
    if (issues.length > 0) {
      console.warn('♿ Accessibility issues found:', issues);
    } else {
      console.log('✅ No major accessibility issues detected');
    }

    return issues;
  }

  // Announcement methods
  announce(message, priority = 'polite') {
    const announcer = this.announcer[priority] || this.announcer.polite;

    // Clear previous announcement
    announcer.textContent = '';

    // Use timeout to ensure screen readers pick up the change
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = '';
    }, 5000);
  }

  announceRouteChange() {
    const pageTitle = document.title;
    this.announce(`Navigated to ${pageTitle}`);
  }

  announceContentUpdate(detail) {
    if (detail.type === 'search') {
      this.announce(`Search results updated. ${detail.count} items found.`);
    } else if (detail.type === 'filter') {
      this.announce(`Content filtered. ${detail.count} items shown.`);
    } else {
      this.announce('Content updated');
    }
  }

  // Utility methods
  guessButtonLabel(button) {
    const classes = button.className.toLowerCase();

    if (classes.includes('close')) return 'Close';
    if (classes.includes('menu')) return 'Menu';
    if (classes.includes('search')) return 'Search';
    if (classes.includes('submit')) return 'Submit';
    if (classes.includes('play')) return 'Play';
    if (classes.includes('pause')) return 'Pause';

    return 'Button';
  }

  expandButtonLabel(text, button) {
    const context = button.closest('.card, .project, .paper, .testimonial');

    if (context) {
      const title = context.querySelector('h1, h2, h3, h4, h5, h6')?.textContent;
      if (title) {
        return `${text} - ${title}`;
      }
    }

    return text;
  }

  findLinkContext(link) {
    const card = link.closest('.card, .project-card, .paper-card');
    if (card) {
      const title = card.querySelector('h1, h2, h3, h4, h5, h6')?.textContent;
      if (title) return title;
    }

    const section = link.closest('section, article');
    if (section) {
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6')?.textContent;
      if (heading) return heading;
    }

    return null;
  }

  getInputLabel(type) {
    const labels = {
      text: 'Text input',
      email: 'Email address',
      password: 'Password',
      search: 'Search',
      tel: 'Phone number',
      url: 'Website URL',
      number: 'Number',
      date: 'Date',
      time: 'Time'
    };

    return labels[type] || 'Input field';
  }

  isDecorativeImage(img) {
    const decorativeClasses = ['decoration', 'decorative', 'background', 'spacer'];
    return decorativeClasses.some(cls => img.className.toLowerCase().includes(cls));
  }

  generateAltText(img) {
    const src = img.src;
    const filename = src.split('/').pop().split('.')[0];

    // Try to generate meaningful alt text from filename
    return filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  savePreferences() {
    localStorage.setItem('accessibility-preferences', JSON.stringify(this.preferences));
  }

  loadPreferences() {
    const saved = localStorage.getItem('accessibility-preferences');
    if (saved) {
      this.preferences = { ...this.preferences, ...JSON.parse(saved) };
      this.applyAllPreferences();
    }
  }

  applyAllPreferences() {
    this.applyContrastPreferences();
    this.applyMotionPreferences();

    if (this.preferences.largeText) {
      document.body.classList.add('large-text');
    }
  }

  // Styling methods
  styleSkipLinks(container) {
    container.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      z-index: 999999;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .skip-link {
        position: absolute;
        top: -9999px;
        left: -9999px;
        background: #000;
        color: #fff;
        padding: 8px 16px;
        text-decoration: none;
        border-radius: 0 0 4px 4px;
        font-weight: bold;
        z-index: 999999;
      }

      .skip-link:focus {
        position: fixed;
        top: 0;
        left: 0;
        clip: auto;
        width: auto;
        height: auto;
      }
    `;

    if (!document.head.querySelector('style[data-skip-links]')) {
      style.setAttribute('data-skip-links', 'true');
      document.head.appendChild(style);
    }
  }

  styleAccessibilityToolbar(toolbar) {
    toolbar.style.cssText = `
      position: fixed;
      top: 50%;
      right: 0;
      transform: translateY(-50%);
      z-index: 999999;
      font-family: system-ui, sans-serif;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .accessibility-toolbar .a11y-toggle {
        background: #1f2937;
        color: white;
        border: none;
        padding: 12px;
        border-radius: 8px 0 0 8px;
        cursor: pointer;
        font-size: 18px;
        transition: background 0.2s;
      }

      .accessibility-toolbar .a11y-toggle:hover {
        background: #374151;
      }

      .accessibility-toolbar .a11y-panel {
        position: absolute;
        right: 100%;
        top: 0;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: -4px 0 12px rgba(0,0,0,0.15);
        width: 280px;
        max-height: 400px;
        overflow-y: auto;
      }

      .accessibility-toolbar .a11y-panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .accessibility-toolbar .a11y-panel-header h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
      }

      .accessibility-toolbar .a11y-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0;
        width: 24px;
        height: 24px;
      }

      .accessibility-toolbar .a11y-controls {
        padding: 1rem;
      }

      .accessibility-toolbar .a11y-control {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem;
        margin-bottom: 0.5rem;
        background: none;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
      }

      .accessibility-toolbar .a11y-control:hover {
        background: #f3f4f6;
        border-color: #3b82f6;
      }

      .accessibility-toolbar .a11y-control.active {
        background: #dbeafe;
        border-color: #3b82f6;
        color: #1e40af;
      }

      .accessibility-toolbar .control-icon {
        font-size: 1.25rem;
      }

      .accessibility-toolbar .control-label {
        font-weight: 500;
        color: #374151;
      }

      .accessibility-toolbar .a11y-control.active .control-label {
        color: #1e40af;
      }
    `;

    if (!document.head.querySelector('style[data-accessibility-toolbar]')) {
      style.setAttribute('data-accessibility-toolbar', 'true');
      document.head.appendChild(style);
    }
  }

  // Public API methods
  getAccessibilityReport() {
    return {
      preferences: this.preferences,
      features: this.features,
      screenReaderDetected: this.preferences.screenReader,
      contrastIssues: document.querySelectorAll('[data-contrast-warning]').length,
      missingAltText: document.querySelectorAll('img:not([alt])').length,
      missingLabels: document.querySelectorAll('input:not([aria-label]):not([aria-labelledby]):not([id])').length
    };
  }

  updatePreference(preference, value) {
    this.preferences[preference] = value;
    this.savePreferences();
    this.applyAllPreferences();
  }

  handleFocusIn(event) {
    // Add focus indicator class
    event.target.classList.add('focus-visible');

    // Track focus for analytics
    this.trackFocusEvent('focus_in', event.target);
  }

  handleFocusOut(event) {
    // Remove focus indicator class
    event.target.classList.remove('focus-visible');
  }

  handleKeyDown(event) {
    // Track keyboard usage for analytics
    this.trackKeyboardEvent(event.key, event.target);
  }

  handleMouseDown(event) {
    // Remove focus indicators on mouse interaction
    event.target.classList.remove('focus-visible');
  }

  trackFocusEvent(type, element) {
    if (typeof gtag !== 'undefined') {
      gtag('event', type, {
        event_category: 'Accessibility',
        element_type: element.tagName,
        element_role: element.getAttribute('role')
      });
    }
  }

  trackKeyboardEvent(key, element) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'keyboard_navigation', {
        event_category: 'Accessibility',
        key_pressed: key,
        element_type: element.tagName
      });
    }
  }
}