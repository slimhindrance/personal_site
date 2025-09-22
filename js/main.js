/**
 * Main Application Entry Point - Phase 3 Production Version
 * Integrates PWA, SEO, analytics, social, and accessibility features
 */

// Import all components
import { AdvancedSearch } from './components/AdvancedSearch.js';
import { ContentModal } from './components/ContentModal.js';
import { ContentFilters } from './components/ContentFilters.js';
import { ContentRelationships } from './components/ContentRelationships.js';
import { ProjectGrid } from './components/ProjectGrid.js';
import { PapersList } from './components/PapersList.js';
import { TestimonialCarousel } from './components/TestimonialCarousel.js';

// Import Phase 3 core managers
import { PWAManager } from './core/PWAManager.js';
import { SEOManager } from './core/SEOManager.js';
import { AnalyticsManager } from './core/AnalyticsManager.js';
import { SocialManager } from './core/SocialManager.js';
import { AccessibilityManager } from './core/AccessibilityManager.js';

class PortfolioApp {
  constructor() {
    this.components = new Map();
    this.managers = new Map();
    this.searchIndex = null;
    this.allContent = {
      projects: [],
      papers: [],
      testimonials: []
    };
    this.isInitialized = false;
    this.startTime = performance.now();
  }

  async init() {
    try {
      console.log('🚀 Initializing Portfolio App - Phase 2');

      // Initialize core systems
      await this.loadAllContent();
      await this.initializeComponents();
      await this.setupGlobalEventListeners();
      await this.initializeSearch();

      this.isInitialized = true;
      console.log('✅ Portfolio App initialized successfully');

      // Track initialization
      this.trackEvent('app_initialized', {
        componentsLoaded: this.components.size,
        contentLoaded: this.getTotalContentCount()
      });

    } catch (error) {
      console.error('❌ Failed to initialize Portfolio App:', error);
      this.showErrorFallback(error);
    }
  }

  async loadAllContent() {
    const loadPromises = Object.keys(this.allContent).map(async (type) => {
      try {
        const response = await fetch(`/data/${type}.json`);
        if (response.ok) {
          this.allContent[type] = await response.json();
          console.log(`📄 Loaded ${this.allContent[type].length} ${type}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load ${type}:`, error);
        this.allContent[type] = [];
      }
    });

    await Promise.all(loadPromises);
  }

  async initializeComponents() {
    // Initialize ContentRelationships first (needed by others)
    const relationships = new ContentRelationships();
    await relationships.init();
    this.components.set('relationships', relationships);

    // Initialize Modal System
    const modal = new ContentModal();
    await modal.init();
    this.components.set('modal', modal);

    // Initialize Search
    const searchContainer = document.querySelector('#search-container');
    if (searchContainer) {
      const search = new AdvancedSearch();
      await search.init(searchContainer);
      this.components.set('search', search);
    }

    // Initialize Filters
    const filtersContainer = document.querySelector('#filters-container');
    if (filtersContainer) {
      const filters = new ContentFilters('all');
      await filters.init(filtersContainer);
      filters.setFilterChangeCallback(this.handleFilterChange.bind(this));
      this.components.set('filters', filters);
    }

    // Initialize Content Grids
    await this.initializeContentGrids();

    console.log(`🧩 Initialized ${this.components.size} components`);
  }

  async initializeContentGrids() {
    // Projects Grid
    const projectsContainer = document.querySelector('#projects-grid');
    if (projectsContainer) {
      const projectGrid = new ProjectGrid();
      await projectGrid.init(projectsContainer, this.allContent.projects);
      this.components.set('projectGrid', projectGrid);
    }

    // Papers List
    const papersContainer = document.querySelector('#papers-list');
    if (papersContainer) {
      const papersList = new PapersList();
      await papersList.init(papersContainer, this.allContent.papers);
      this.components.set('papersList', papersList);
    }

    // Testimonials Carousel
    const testimonialsContainer = document.querySelector('#testimonials-carousel');
    if (testimonialsContainer) {
      const testimonialCarousel = new TestimonialCarousel();
      await testimonialCarousel.init(testimonialsContainer, this.allContent.testimonials);
      this.components.set('testimonialCarousel', testimonialCarousel);
    }
  }

  async initializeSearch() {
    try {
      // Load or generate search index
      const searchIndex = await this.loadSearchIndex();

      const search = this.components.get('search');
      if (search && searchIndex) {
        await search.setSearchIndex(searchIndex);
        console.log('🔍 Search index loaded and configured');
      }
    } catch (error) {
      console.warn('⚠️ Search initialization failed:', error);
    }
  }

  async loadSearchIndex() {
    try {
      const response = await fetch('/data/search-index.json');
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Search index not found, generating client-side');
    }

    // Fallback: generate search index client-side
    return this.generateSearchIndex();
  }

  generateSearchIndex() {
    const index = {
      documents: [],
      terms: new Map(),
      metadata: {
        generated: new Date().toISOString(),
        documentCount: 0,
        termCount: 0
      }
    };

    // Process all content types
    Object.entries(this.allContent).forEach(([type, items]) => {
      items.forEach((item, idx) => {
        const doc = {
          id: `${type}_${item.id || item.slug || idx}`,
          type,
          title: item.title || '',
          content: this.extractSearchableContent(item),
          keywords: item.keywords || item.tags || [],
          category: item.category || '',
          date: item.date || item.year || null,
          url: this.generateItemURL(type, item)
        };

        index.documents.push(doc);
      });
    });

    index.metadata.documentCount = index.documents.length;
    console.log(`🔍 Generated search index with ${index.metadata.documentCount} documents`);

    return index;
  }

  extractSearchableContent(item) {
    const textFields = [
      item.title,
      item.description,
      item.content,
      item.abstract,
      item.summary,
      ...(item.technologies || []),
      ...(item.keywords || []),
      ...(item.tags || [])
    ].filter(Boolean);

    return textFields.join(' ');
  }

  generateItemURL(type, item) {
    const baseURL = window.location.origin + window.location.pathname;
    const itemId = item.id || item.slug || item.title?.toLowerCase().replace(/\s+/g, '-');
    return `${baseURL}#${type}/${itemId}`;
  }

  async setupGlobalEventListeners() {
    // Content modal events
    document.addEventListener('openContent', async (event) => {
      const { type, id } = event.detail;
      const modal = this.components.get('modal');
      if (modal) {
        await modal.openContent(type, id);
      }
    });

    // URL hash navigation
    window.addEventListener('hashchange', this.handleHashChange.bind(this));

    // Handle initial hash
    if (window.location.hash) {
      this.handleHashChange();
    }

    // Search integration
    document.addEventListener('searchQuery', this.handleSearchQuery.bind(this));

    // Filter integration
    document.addEventListener('filtersChanged', this.handleFilterChange.bind(this));

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

    // Performance monitoring
    this.setupPerformanceMonitoring();
  }

  handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const [type, id] = hash.split('/');
    if (type && id && ['projects', 'papers', 'testimonials'].includes(type)) {
      // Trigger content modal
      document.dispatchEvent(new CustomEvent('openContent', {
        detail: { type, id }
      }));
    }
  }

  async handleSearchQuery(event) {
    const { query, filters } = event.detail;

    // Update all content components with search results
    const searchResults = await this.performGlobalSearch(query, filters);
    this.updateContentDisplays(searchResults);

    // Track search
    this.trackEvent('search_performed', {
      query: query.substring(0, 50), // Truncate for privacy
      resultCount: searchResults.length,
      hasFilters: Object.keys(filters).length > 0
    });
  }

  async performGlobalSearch(query, filters = {}) {
    const search = this.components.get('search');
    if (!search) return [];

    return await search.search(query, filters);
  }

  updateContentDisplays(searchResults) {
    // Group results by type
    const resultsByType = searchResults.reduce((acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    }, {});

    // Update each content component
    const projectGrid = this.components.get('projectGrid');
    if (projectGrid) {
      projectGrid.updateDisplay(resultsByType.projects || []);
    }

    const papersList = this.components.get('papersList');
    if (papersList) {
      papersList.updateDisplay(resultsByType.papers || []);
    }

    const testimonialCarousel = this.components.get('testimonialCarousel');
    if (testimonialCarousel) {
      testimonialCarousel.updateDisplay(resultsByType.testimonials || []);
    }
  }

  handleFilterChange(activeFilters) {
    // Apply filters to all content displays
    this.filterAllContent(activeFilters);

    // Track filter usage
    this.trackEvent('filters_applied', {
      filterCount: Object.keys(activeFilters).length,
      filterTypes: Object.keys(activeFilters)
    });
  }

  filterAllContent(filters) {
    // Get current search query if any
    const search = this.components.get('search');
    const currentQuery = search ? search.getCurrentQuery() : '';

    // Perform filtered search
    this.handleSearchQuery({
      detail: {
        query: currentQuery,
        filters
      }
    });
  }

  handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + K: Focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      const search = this.components.get('search');
      if (search) {
        search.focusSearchInput();
      }
    }

    // Escape: Close modal
    if (event.key === 'Escape') {
      const modal = this.components.get('modal');
      if (modal && modal.isOpen) {
        modal.closeModal();
      }
    }
  }

  setupPerformanceMonitoring() {
    // Monitor component load times
    if ('performance' in window && 'observe' in PerformanceObserver.prototype) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('component')) {
            console.log(`⚡ ${entry.name}: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
    }

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = performance.memory;
        if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
          console.warn('⚠️ High memory usage detected');
          this.optimizeMemoryUsage();
        }
      }, 30000);
    }
  }

  optimizeMemoryUsage() {
    // Clear component caches
    this.components.forEach(component => {
      if (component.clearCache) {
        component.clearCache();
      }
    });

    // Trigger garbage collection hint
    if ('gc' in window) {
      window.gc();
    }
  }

  getTotalContentCount() {
    return Object.values(this.allContent).reduce((total, items) => total + items.length, 0);
  }

  trackEvent(eventName, properties = {}) {
    // Analytics tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }

    // Console logging for development
    console.log(`📊 Event: ${eventName}`, properties);
  }

  showErrorFallback(error) {
    const errorHTML = `
      <div class="app-error-fallback">
        <div class="error-content">
          <h2>⚠️ Application Error</h2>
          <p>The portfolio application failed to initialize properly.</p>
          <details>
            <summary>Error Details</summary>
            <pre>${error.message}\n${error.stack}</pre>
          </details>
          <button onclick="window.location.reload()" class="retry-button">
            Retry Loading
          </button>
        </div>
      </div>
    `;

    document.body.innerHTML = errorHTML;

    // Apply basic error styles
    const style = document.createElement('style');
    style.textContent = `
      .app-error-fallback {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      }
      .error-content {
        max-width: 500px;
        padding: 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        text-align: center;
      }
      .retry-button {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
      }
      details {
        text-align: left;
        margin: 1rem 0;
      }
      pre {
        background: #f1f3f4;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 0.875rem;
      }
    `;
    document.head.appendChild(style);
  }

  // Public API methods
  getComponent(name) {
    return this.components.get(name);
  }

  getAllContent() {
    return this.allContent;
  }

  async refreshContent() {
    await this.loadAllContent();
    this.components.forEach(component => {
      if (component.refresh) {
        component.refresh();
      }
    });
  }
}

// Initialize app when DOM is ready
let app;

function initializeApp() {
  app = new PortfolioApp();
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for global access
window.PortfolioApp = app;

export default PortfolioApp;