/**
 * ThemeSystem - Dark/light theme management with system preference detection
 * Features: System preference detection, smooth transitions, persistent storage
 */

import ComponentBase from '../core/ComponentBase.js';
import { globalState } from '../core/StateManager.js';

class ThemeSystem extends ComponentBase {
  get defaults() {
    return {
      enableSystemDetection: true,
      enableSmoothtransitions: true,
      storageKey: 'theme-preference',
      transitionDuration: 200,
      themes: {
        light: {
          name: 'Light',
          icon: 'sun',
          primary: '#3b82f6',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1f2937'
        },
        dark: {
          name: 'Dark',
          icon: 'moon',
          primary: '#60a5fa',
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9'
        },
        auto: {
          name: 'Auto',
          icon: 'computer',
          description: 'Follow system preference'
        }
      },
      className: 'theme-system'
    };
  }

  init() {
    this.currentTheme = 'auto';
    this.systemPreference = this.detectSystemPreference();
    this.effectiveTheme = this.getEffectiveTheme();
    this.mediaQueryList = null;

    // Load saved preference
    this.loadThemePreference();

    // Set up system preference monitoring
    if (this.options.enableSystemDetection) {
      this.setupSystemPreferenceMonitoring();
    }

    // Apply initial theme
    this.applyTheme(this.effectiveTheme, false);

    // Update global state
    globalState.set('theme.current', this.currentTheme);
    globalState.set('theme.effective', this.effectiveTheme);
    globalState.set('theme.system', this.systemPreference);

    super.init();
  }

  template() {
    const fragment = this.createFragment();

    // Theme toggle button
    const toggleButton = this.createThemeToggle();
    fragment.appendChild(toggleButton);

    return fragment;
  }

  createThemeToggle() {
    const toggle = this.createElement('div', {
      className: 'relative',
      'data-theme-toggle': 'true'
    });

    // Toggle button
    const button = this.createElement('button', {
      className: 'p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
      'aria-label': 'Toggle theme',
      'aria-expanded': 'false',
      'data-button': 'true'
    });

    // Current theme icon
    const icon = this.createElement('div', {
      className: 'w-5 h-5 text-gray-700 dark:text-gray-300',
      'data-icon': 'true'
    });
    icon.innerHTML = this.getThemeIcon(this.currentTheme);

    button.appendChild(icon);

    // Dropdown menu
    const dropdown = this.createElement('div', {
      className: 'absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible transform scale-95 transition-all duration-200 z-50',
      'data-dropdown': 'true',
      role: 'menu'
    });

    // Menu items
    Object.entries(this.options.themes).forEach(([themeKey, theme]) => {
      const item = this.createElement('button', {
        className: `w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
          themeKey === this.currentTheme ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
        }`,
        role: 'menuitem',
        'data-theme': themeKey
      });

      const itemIcon = this.createElement('div', {
        className: 'w-4 h-4 flex-shrink-0'
      });
      itemIcon.innerHTML = this.getThemeIcon(themeKey);

      const itemContent = this.createElement('div');
      
      const itemName = this.createElement('div', {
        className: 'font-medium'
      }, theme.name);

      itemContent.appendChild(itemName);

      if (theme.description) {
        const itemDesc = this.createElement('div', {
          className: 'text-xs text-gray-500 dark:text-gray-400'
        }, theme.description);
        itemContent.appendChild(itemDesc);
      }

      // Selected indicator
      if (themeKey === this.currentTheme) {
        const checkIcon = this.createElement('div', {
          className: 'w-4 h-4 ml-auto text-primary-600 dark:text-primary-400'
        });
        checkIcon.innerHTML = `
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        `;
        item.appendChild(checkIcon);
      }

      item.appendChild(itemIcon);
      item.appendChild(itemContent);

      this.addEventListener(item, 'click', () => {
        this.setTheme(themeKey);
        this.closeDropdown();
      });

      dropdown.appendChild(item);
    });

    toggle.appendChild(button);
    toggle.appendChild(dropdown);

    // Bind events
    this.addEventListener(button, 'click', this.toggleDropdown.bind(this));
    this.addEventListener(document, 'click', (e) => {
      if (!toggle.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Keyboard navigation
    this.addEventListener(button, 'keydown', this.handleKeydown.bind(this));
    this.addEventListener(dropdown, 'keydown', this.handleMenuKeydown.bind(this));

    return toggle;
  }

  handleKeydown(e) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.toggleDropdown();
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.openDropdown();
        this.focusFirstMenuItem();
        break;
      case 'Escape':
        this.closeDropdown();
        break;
    }
  }

  handleMenuKeydown(e) {
    const menuItems = this.$$('[role="menuitem"]');
    const currentIndex = Array.from(menuItems).indexOf(document.activeElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        menuItems[nextIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        menuItems[prevIndex].focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement) {
          document.activeElement.click();
        }
        break;
      case 'Escape':
        this.closeDropdown();
        this.$('[data-button]').focus();
        break;
    }
  }

  toggleDropdown() {
    const dropdown = this.$('[data-dropdown]');
    const isOpen = !dropdown.classList.contains('invisible');
    
    if (isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    const button = this.$('[data-button]');
    const dropdown = this.$('[data-dropdown]');
    
    dropdown.classList.remove('opacity-0', 'invisible', 'scale-95');
    dropdown.classList.add('opacity-100', 'visible', 'scale-100');
    button.setAttribute('aria-expanded', 'true');
  }

  closeDropdown() {
    const button = this.$('[data-button]');
    const dropdown = this.$('[data-dropdown]');
    
    dropdown.classList.add('opacity-0', 'invisible', 'scale-95');
    dropdown.classList.remove('opacity-100', 'visible', 'scale-100');
    button.setAttribute('aria-expanded', 'false');
  }

  focusFirstMenuItem() {
    const firstItem = this.$('[role="menuitem"]');
    if (firstItem) {
      firstItem.focus();
    }
  }

  setTheme(theme) {
    if (!this.options.themes[theme]) {
      console.warn(`Theme '${theme}' not found`);
      return;
    }

    const previousTheme = this.currentTheme;
    this.currentTheme = theme;
    this.effectiveTheme = this.getEffectiveTheme();

    // Apply theme
    this.applyTheme(this.effectiveTheme);

    // Save preference
    this.saveThemePreference();

    // Update UI
    this.updateToggleUI();

    // Update global state
    globalState.set('theme.current', this.currentTheme);
    globalState.set('theme.effective', this.effectiveTheme);

    // Emit theme change event
    this.element.dispatchEvent(new CustomEvent('theme:change', {
      detail: {
        previous: previousTheme,
        current: this.currentTheme,
        effective: this.effectiveTheme
      },
      bubbles: true
    }));
  }

  applyTheme(theme, withTransition = true) {
    const root = document.documentElement;
    const body = document.body;

    // Add transition class if enabled
    if (withTransition && this.options.enableSmoothtransitions) {
      this.addTransitionClasses();
    }

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    // Apply theme-specific styles
    if (this.options.themes[theme] && theme !== 'auto') {
      const themeConfig = this.options.themes[theme];
      
      // Update CSS custom properties
      root.style.setProperty('--theme-primary', themeConfig.primary);
      root.style.setProperty('--theme-background', themeConfig.background);
      root.style.setProperty('--theme-surface', themeConfig.surface);
      root.style.setProperty('--theme-text', themeConfig.text);
    }

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme);

    // Remove transition classes after transition completes
    if (withTransition && this.options.enableSmoothtransitions) {
      setTimeout(() => {
        this.removeTransitionClasses();
      }, this.options.transitionDuration);
    }
  }

  addTransitionClasses() {
    const transitionElements = document.querySelectorAll('*');
    transitionElements.forEach(el => {
      if (!el.style.transition) {
        el.style.transition = `background-color ${this.options.transitionDuration}ms ease, color ${this.options.transitionDuration}ms ease, border-color ${this.options.transitionDuration}ms ease`;
        el.dataset.themeTransition = 'true';
      }
    });
  }

  removeTransitionClasses() {
    const transitionElements = document.querySelectorAll('[data-theme-transition]');
    transitionElements.forEach(el => {
      el.style.transition = '';
      delete el.dataset.themeTransition;
    });
  }

  updateMetaThemeColor(theme) {
    let themeColor = '#ffffff'; // default light
    
    if (theme === 'dark') {
      themeColor = '#0f172a';
    }

    // Update existing meta tag or create new one
    let metaTag = document.querySelector('meta[name="theme-color"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'theme-color';
      document.head.appendChild(metaTag);
    }
    metaTag.content = themeColor;
  }

  updateToggleUI() {
    // Update button icon
    const icon = this.$('[data-icon]');
    if (icon) {
      icon.innerHTML = this.getThemeIcon(this.currentTheme);
    }

    // Update menu item states
    this.$$('[role="menuitem"]').forEach(item => {
      const themeKey = item.dataset.theme;
      const isSelected = themeKey === this.currentTheme;
      
      // Update styling
      if (isSelected) {
        item.classList.add('bg-primary-50', 'dark:bg-primary-900/20', 'text-primary-600', 'dark:text-primary-400');
        item.classList.remove('text-gray-700', 'dark:text-gray-300');
      } else {
        item.classList.remove('bg-primary-50', 'dark:bg-primary-900/20', 'text-primary-600', 'dark:text-primary-400');
        item.classList.add('text-gray-700', 'dark:text-gray-300');
      }

      // Update check icon
      const existingCheck = item.querySelector('.ml-auto');
      if (existingCheck) {
        existingCheck.remove();
      }

      if (isSelected) {
        const checkIcon = this.createElement('div', {
          className: 'w-4 h-4 ml-auto text-primary-600 dark:text-primary-400'
        });
        checkIcon.innerHTML = `
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
          </svg>
        `;
        item.appendChild(checkIcon);
      }
    });
  }

  getEffectiveTheme() {
    if (this.currentTheme === 'auto') {
      return this.systemPreference;
    }
    return this.currentTheme;
  }

  detectSystemPreference() {
    if (!window.matchMedia) {
      return 'light'; // fallback
    }
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  setupSystemPreferenceMonitoring() {
    if (!window.matchMedia) return;

    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      this.systemPreference = e.matches ? 'dark' : 'light';
      
      // Update global state
      globalState.set('theme.system', this.systemPreference);
      
      // If current theme is auto, apply the new system preference
      if (this.currentTheme === 'auto') {
        this.effectiveTheme = this.systemPreference;
        this.applyTheme(this.effectiveTheme);
        globalState.set('theme.effective', this.effectiveTheme);
        
        // Emit system preference change event
        this.element.dispatchEvent(new CustomEvent('theme:system-change', {
          detail: {
            systemPreference: this.systemPreference,
            effectiveTheme: this.effectiveTheme
          },
          bubbles: true
        }));
      }
    };

    // Modern browsers
    if (this.mediaQueryList.addEventListener) {
      this.mediaQueryList.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      this.mediaQueryList.addListener(handleChange);
    }
  }

  loadThemePreference() {
    try {
      const stored = localStorage.getItem(this.options.storageKey);
      if (stored && this.options.themes[stored]) {
        this.currentTheme = stored;
        this.effectiveTheme = this.getEffectiveTheme();
      }
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
    }
  }

  saveThemePreference() {
    try {
      localStorage.setItem(this.options.storageKey, this.currentTheme);
    } catch (error) {
      console.warn('Failed to save theme preference:', error);
    }
  }

  getThemeIcon(theme) {
    const icons = {
      light: `
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
        </svg>
      `,
      dark: `
        <svg fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
        </svg>
      `,
      auto: `
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
      `
    };
    
    return icons[theme] || icons.auto;
  }

  // Public API
  getCurrentTheme() {
    return this.currentTheme;
  }

  getEffectiveThemeValue() {
    return this.effectiveTheme;
  }

  getSystemPreference() {
    return this.systemPreference;
  }

  toggleTheme() {
    const themes = Object.keys(this.options.themes);
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  setLightTheme() {
    this.setTheme('light');
  }

  setDarkTheme() {
    this.setTheme('dark');
  }

  setAutoTheme() {
    this.setTheme('auto');
  }

  isDarkMode() {
    return this.effectiveTheme === 'dark';
  }

  isLightMode() {
    return this.effectiveTheme === 'light';
  }

  isAutoMode() {
    return this.currentTheme === 'auto';
  }

  destroy() {
    // Clean up system preference monitoring
    if (this.mediaQueryList) {
      if (this.mediaQueryList.removeEventListener) {
        this.mediaQueryList.removeEventListener('change', this.handleSystemChange);
      } else {
        this.mediaQueryList.removeListener(this.handleSystemChange);
      }
    }

    // Remove transition classes
    this.removeTransitionClasses();

    super.destroy();
  }
}

export default ThemeSystem;