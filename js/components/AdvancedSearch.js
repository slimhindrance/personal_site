/**
 * Advanced Search Component - Phase 2
 * Real-time search with faceted filtering and intelligent suggestions
 */

import { ComponentBase } from '../core/ComponentBase.js';
import { globalState } from '../core/StateManager.js';

class AdvancedSearch extends ComponentBase {
  constructor(container, options = {}) {
    super(container, 'advanced-search');

    this.options = {
      searchTypes: ['all', 'projects', 'papers', 'testimonials'],
      enableFacets: true,
      enableSuggestions: true,
      debounceDelay: 300,
      maxSuggestions: 8,
      fuzzyThreshold: 0.6,
      ...options
    };

    // Search state
    this.searchState = {
      query: '',
      type: 'all',
      filters: {},
      suggestions: [],
      results: [],
      isSearching: false,
      facets: {}
    };

    // Search index
    this.searchIndex = null;
    this.loadSearchIndex();

    this.initializeComponent();
  }

  async loadSearchIndex() {
    try {
      // Load search indices for all content types
      const [projectsIndex, papersIndex, testimonialsIndex] = await Promise.all([
        this.fetchSearchIndex('/data/projects.json'),
        this.fetchSearchIndex('/data/papers-search-index.json'),
        this.fetchSearchIndex('/data/testimonials.json')
      ]);

      this.searchIndex = {
        projects: projectsIndex,
        papers: papersIndex,
        testimonials: testimonialsIndex
      };

      this.updateFacets();
      console.log('🔍 Search index loaded successfully');
    } catch (error) {
      console.warn('Search index loading failed, using fallback:', error);
      this.searchIndex = { projects: [], papers: [], testimonials: [] };
    }
  }

  async fetchSearchIndex(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Handle different data structures
      if (data.index) return data.index; // Enhanced search index
      if (data.projects) return data.projects; // Projects data
      if (data.papers) return data.papers; // Papers data
      if (data.testimonials) return data.testimonials; // Testimonials data

      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn(`Failed to load search index from ${url}:`, error);
      return [];
    }
  }

  initializeComponent() {
    this.render();
    this.bindEvents();
    this.setupKeyboardNavigation();

    // Subscribe to global state changes
    globalState.subscribe('search', this.handleGlobalSearchChange.bind(this));
  }

  render() {
    this.container.innerHTML = `
      <div class="advanced-search-container bg-white rounded-xl shadow-lg p-6 mb-8">
        <!-- Search Header -->
        <div class="search-header mb-6">
          <h3 class="text-xl font-bold text-gray-900 mb-2">Advanced Search</h3>
          <p class="text-gray-600">Search across projects, papers, and testimonials</p>
        </div>

        <!-- Main Search Input -->
        <div class="search-input-container relative mb-6">
          <div class="relative">
            <input
              type="text"
              id="search-input"
              class="w-full px-4 py-3 pl-12 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
              placeholder="Search projects, papers, testimonials..."
              autocomplete="off"
              aria-label="Search content"
            >
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <div class="absolute inset-y-0 right-0 flex items-center">
              <button
                id="clear-search"
                class="px-3 py-1 mr-2 text-sm text-gray-500 hover:text-gray-700 focus:outline-none hidden"
                aria-label="Clear search"
              >
                Clear
              </button>
            </div>
          </div>

          <!-- Search Suggestions -->
          <div id="search-suggestions" class="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 z-50 hidden">
            <div class="py-2 max-h-64 overflow-y-auto">
              <!-- Suggestions will be populated here -->
            </div>
          </div>
        </div>

        <!-- Search Type Selector -->
        <div class="search-type-container mb-6">
          <div class="flex flex-wrap gap-2">
            <span class="text-sm font-medium text-gray-700 py-2">Search in:</span>
            ${this.options.searchTypes.map(type => `
              <button
                class="search-type-btn px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  type === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }"
                data-type="${type}"
              >
                ${this.formatSearchType(type)}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Advanced Filters -->
        ${this.options.enableFacets ? this.renderFacets() : ''}

        <!-- Search Results Summary -->
        <div id="search-results-summary" class="hidden">
          <div class="border-t pt-4">
            <div class="flex items-center justify-between mb-4">
              <div class="search-summary text-sm text-gray-600">
                <!-- Results summary will be populated here -->
              </div>
              <div class="search-controls flex items-center gap-4">
                <select id="sort-select" class="px-3 py-1 border border-gray-300 rounded text-sm">
                  <option value="relevance">Sort by Relevance</option>
                  <option value="date">Sort by Date</option>
                  <option value="title">Sort by Title</option>
                  <option value="popularity">Sort by Popularity</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div id="search-loading" class="hidden">
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span class="ml-3 text-gray-600">Searching...</span>
          </div>
        </div>

        <!-- Search Results Container -->
        <div id="search-results" class="hidden">
          <!-- Results will be populated here -->
        </div>

        <!-- No Results -->
        <div id="no-results" class="hidden">
          <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"></path>
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900">No results found</h3>
            <p class="mt-2 text-gray-600">Try adjusting your search terms or filters</p>
            <button id="clear-all-filters" class="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
              Clear All Filters
            </button>
          </div>
        </div>
      </div>
    `;
  }

  renderFacets() {
    return `
      <div class="facets-container mb-6">
        <button
          id="toggle-filters"
          class="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 mb-4"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
          </svg>
          Advanced Filters
          <svg class="w-4 h-4 ml-2 transform transition-transform" id="filter-chevron">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <div id="filters-panel" class="hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <!-- Category Filter -->
            <div class="filter-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select id="category-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Categories</option>
                <!-- Options will be populated dynamically -->
              </select>
            </div>

            <!-- Technology Filter -->
            <div class="filter-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">Technology</label>
              <select id="technology-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Technologies</option>
                <!-- Options will be populated dynamically -->
              </select>
            </div>

            <!-- Date Range Filter -->
            <div class="filter-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select id="year-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Years</option>
                <!-- Options will be populated dynamically -->
              </select>
            </div>

            <!-- Status Filter (for projects) -->
            <div class="filter-group">
              <label class="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select id="status-filter" class="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="development">In Development</option>
                <option value="planning">Planning</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <!-- Active Filters Display -->
          <div id="active-filters" class="mt-4 hidden">
            <div class="flex flex-wrap gap-2">
              <span class="text-sm text-gray-600">Active filters:</span>
              <!-- Active filter chips will be populated here -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const searchInput = this.container.querySelector('#search-input');
    const clearButton = this.container.querySelector('#clear-search');
    const typeButtons = this.container.querySelectorAll('.search-type-btn');
    const sortSelect = this.container.querySelector('#sort-select');

    // Search input events
    searchInput?.addEventListener('input', this.debounce(this.handleSearchInput.bind(this), this.options.debounceDelay));
    searchInput?.addEventListener('focus', this.showSuggestions.bind(this));
    searchInput?.addEventListener('blur', () => {
      // Delay hiding suggestions to allow clicks
      setTimeout(() => this.hideSuggestions(), 150);
    });

    // Clear search
    clearButton?.addEventListener('click', this.clearSearch.bind(this));

    // Search type selection
    typeButtons.forEach(btn => {
      btn.addEventListener('click', this.handleTypeChange.bind(this));
    });

    // Sort selection
    sortSelect?.addEventListener('change', this.handleSortChange.bind(this));

    // Filter events
    if (this.options.enableFacets) {
      this.bindFilterEvents();
    }

    // Global click handler for closing suggestions
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.hideSuggestions();
      }
    });
  }

  bindFilterEvents() {
    const toggleFilters = this.container.querySelector('#toggle-filters');
    const filtersPanel = this.container.querySelector('#filters-panel');
    const clearAllFilters = this.container.querySelector('#clear-all-filters');

    // Toggle filters panel
    toggleFilters?.addEventListener('click', () => {
      const isHidden = filtersPanel.classList.contains('hidden');
      filtersPanel.classList.toggle('hidden');

      const chevron = this.container.querySelector('#filter-chevron');
      chevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    // Filter change events
    ['category', 'technology', 'year', 'status'].forEach(filterType => {
      const filterElement = this.container.querySelector(`#${filterType}-filter`);
      filterElement?.addEventListener('change', () => {
        this.handleFilterChange(filterType, filterElement.value);
      });
    });

    // Clear all filters
    clearAllFilters?.addEventListener('click', this.clearAllFilters.bind(this));
  }

  setupKeyboardNavigation() {
    const searchInput = this.container.querySelector('#search-input');

    searchInput?.addEventListener('keydown', (e) => {
      const suggestionsContainer = this.container.querySelector('#search-suggestions');
      const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this.navigateSuggestions(1, suggestions);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.navigateSuggestions(-1, suggestions);
          break;
        case 'Enter':
          e.preventDefault();
          this.selectActiveSuggestion(suggestions);
          break;
        case 'Escape':
          this.hideSuggestions();
          searchInput.blur();
          break;
      }
    });
  }

  async handleSearchInput(e) {
    const query = e.target.value.trim();
    this.searchState.query = query;

    const clearButton = this.container.querySelector('#clear-search');
    clearButton.classList.toggle('hidden', !query);

    if (query.length >= 2) {
      this.showLoading();

      try {
        // Generate suggestions
        await this.generateSuggestions(query);

        // Perform search
        await this.performSearch(query);

        this.showSuggestions();
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        this.hideLoading();
      }
    } else {
      this.hideSuggestions();
      this.hideResults();
    }

    // Update global state
    globalState.set('search.query', query);
  }

  async generateSuggestions(query) {
    if (!this.options.enableSuggestions || !this.searchIndex) return;

    const suggestions = new Set();
    const queryLower = query.toLowerCase();

    // Search through all content types
    Object.values(this.searchIndex).forEach(items => {
      items.forEach(item => {
        // Title suggestions
        if (item.title?.toLowerCase().includes(queryLower)) {
          suggestions.add(item.title);
        }

        // Technology suggestions
        if (item.tech) {
          item.tech.forEach(tech => {
            if (tech.toLowerCase().includes(queryLower)) {
              suggestions.add(tech);
            }
          });
        }

        // Topic suggestions (for papers)
        if (item.topics) {
          item.topics.forEach(topic => {
            if (topic.toLowerCase().includes(queryLower)) {
              suggestions.add(topic);
            }
          });
        }

        // Author suggestions
        if (item.authors) {
          item.authors.forEach(author => {
            const authorName = typeof author === 'string' ? author : author.name;
            if (authorName?.toLowerCase().includes(queryLower)) {
              suggestions.add(authorName);
            }
          });
        }
      });
    });

    this.searchState.suggestions = Array.from(suggestions)
      .slice(0, this.options.maxSuggestions)
      .sort((a, b) => {
        // Prioritize exact matches and shorter strings
        const aStarts = a.toLowerCase().startsWith(queryLower);
        const bStarts = b.toLowerCase().startsWith(queryLower);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.length - b.length;
      });
  }

  async performSearch(query) {
    if (!this.searchIndex) return;

    const results = [];
    const queryLower = query.toLowerCase();
    const searchType = this.searchState.type;

    // Determine which indices to search
    const indicesToSearch = searchType === 'all'
      ? Object.entries(this.searchIndex)
      : [[searchType, this.searchIndex[searchType] || []]];

    indicesToSearch.forEach(([type, items]) => {
      items.forEach(item => {
        const score = this.calculateRelevanceScore(item, queryLower);
        if (score > 0 && this.passesFilters(item, type)) {
          results.push({
            ...item,
            type,
            relevanceScore: score
          });
        }
      });
    });

    // Sort by relevance score
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    this.searchState.results = results;
    this.displayResults(results);
  }

  calculateRelevanceScore(item, query) {
    let score = 0;

    // Title match (highest weight)
    if (item.title?.toLowerCase().includes(query)) {
      score += item.title.toLowerCase().startsWith(query) ? 10 : 5;
    }

    // Description/abstract match
    const description = item.description || item.abstract || item.content || '';
    if (description.toLowerCase().includes(query)) {
      score += 3;
    }

    // Technology/topic match
    const tech = item.tech || item.topics || [];
    tech.forEach(t => {
      if (t.toLowerCase().includes(query)) {
        score += 2;
      }
    });

    // Author match
    if (item.authors) {
      item.authors.forEach(author => {
        const authorName = typeof author === 'string' ? author : author.name;
        if (authorName?.toLowerCase().includes(query)) {
          score += 2;
        }
      });
    }

    // Fuzzy matching for typos
    if (score === 0) {
      const fuzzyScore = this.calculateFuzzyScore(item, query);
      if (fuzzyScore > this.options.fuzzyThreshold) {
        score = fuzzyScore;
      }
    }

    return score;
  }

  calculateFuzzyScore(item, query) {
    // Simple fuzzy matching implementation
    const text = `${item.title || ''} ${item.description || ''} ${(item.tech || []).join(' ')}`.toLowerCase();

    // Use Levenshtein distance for fuzzy matching
    const words = text.split(/\s+/);
    let bestScore = 0;

    words.forEach(word => {
      if (word.length >= 3) {
        const distance = this.levenshteinDistance(query, word);
        const similarity = 1 - (distance / Math.max(query.length, word.length));
        bestScore = Math.max(bestScore, similarity);
      }
    });

    return bestScore;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  passesFilters(item, type) {
    const filters = this.searchState.filters;

    // Category filter
    if (filters.category && item.category !== filters.category) {
      return false;
    }

    // Technology filter
    if (filters.technology) {
      const tech = item.tech || item.topics || [];
      if (!tech.includes(filters.technology)) {
        return false;
      }
    }

    // Year filter
    if (filters.year) {
      const itemYear = new Date(item.date).getFullYear();
      if (itemYear.toString() !== filters.year) {
        return false;
      }
    }

    // Status filter (for projects)
    if (filters.status && type === 'projects' && item.status !== filters.status) {
      return false;
    }

    return true;
  }

  displayResults(results) {
    const resultsContainer = this.container.querySelector('#search-results');
    const summaryContainer = this.container.querySelector('#search-results-summary');
    const noResultsContainer = this.container.querySelector('#no-results');

    if (results.length === 0) {
      resultsContainer.classList.add('hidden');
      summaryContainer.classList.add('hidden');
      noResultsContainer.classList.remove('hidden');
      return;
    }

    noResultsContainer.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
    summaryContainer.classList.remove('hidden');

    // Update summary
    const summaryElement = summaryContainer.querySelector('.search-summary');
    summaryElement.textContent = `Found ${results.length} result${results.length !== 1 ? 's' : ''} for "${this.searchState.query}"`;

    // Render results
    resultsContainer.innerHTML = `
      <div class="search-results-grid">
        ${results.map(result => this.renderSearchResult(result)).join('')}
      </div>
    `;

    // Add click handlers for results
    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleResultClick(item.dataset.id, item.dataset.type);
      });
    });
  }

  renderSearchResult(result) {
    const typeIcon = this.getTypeIcon(result.type);
    const date = new Date(result.date).toLocaleDateString();

    return `
      <div class="search-result-item bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
           data-id="${result.id}" data-type="${result.type}">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center">
            ${typeIcon}
            <span class="ml-2 text-sm font-medium text-gray-600 capitalize">${result.type}</span>
          </div>
          <div class="text-sm text-gray-500">${date}</div>
        </div>

        <h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          ${this.highlightSearchTerms(result.title, this.searchState.query)}
        </h3>

        <p class="text-gray-600 text-sm mb-4 line-clamp-3">
          ${this.highlightSearchTerms(result.description || result.abstract || result.content || '', this.searchState.query)}
        </p>

        ${this.renderResultMetadata(result)}

        <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div class="flex items-center text-sm text-gray-500">
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            Relevance: ${Math.round(result.relevanceScore * 10)}%
          </div>
          <button class="text-primary-500 hover:text-primary-600 text-sm font-medium">
            View Details →
          </button>
        </div>
      </div>
    `;
  }

  renderResultMetadata(result) {
    const tech = result.tech || result.topics || [];
    const authors = result.authors || [];

    return `
      <div class="flex flex-wrap gap-2 mb-2">
        ${tech.slice(0, 4).map(item => `
          <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">${item}</span>
        `).join('')}
        ${tech.length > 4 ? `<span class="text-xs text-gray-500">+${tech.length - 4} more</span>` : ''}
      </div>

      ${authors.length > 0 ? `
        <div class="text-sm text-gray-600">
          By: ${authors.slice(0, 2).map(author => typeof author === 'string' ? author : author.name).join(', ')}
          ${authors.length > 2 ? ` and ${authors.length - 2} more` : ''}
        </div>
      ` : ''}
    `;
  }

  getTypeIcon(type) {
    const icons = {
      projects: `<svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
      </svg>`,
      papers: `<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"></path>
      </svg>`,
      testimonials: `<svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>`
    };

    return icons[type] || icons.projects;
  }

  highlightSearchTerms(text, query) {
    if (!text || !query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  }

  // Event handlers continued...
  handleTypeChange(e) {
    const newType = e.target.dataset.type;
    this.searchState.type = newType;

    // Update button states
    this.container.querySelectorAll('.search-type-btn').forEach(btn => {
      btn.classList.remove('bg-primary-500', 'text-white');
      btn.classList.add('bg-gray-100', 'text-gray-700');
    });

    e.target.classList.remove('bg-gray-100', 'text-gray-700');
    e.target.classList.add('bg-primary-500', 'text-white');

    // Re-perform search if there's a query
    if (this.searchState.query) {
      this.performSearch(this.searchState.query);
    }

    // Update global state
    globalState.set('search.type', newType);
  }

  handleFilterChange(filterType, value) {
    if (value) {
      this.searchState.filters[filterType] = value;
    } else {
      delete this.searchState.filters[filterType];
    }

    this.updateActiveFilters();

    // Re-perform search if there's a query
    if (this.searchState.query) {
      this.performSearch(this.searchState.query);
    }

    // Update global state
    globalState.set('search.filters', this.searchState.filters);
  }

  handleSortChange(e) {
    const sortType = e.target.value;
    this.sortResults(sortType);
  }

  handleResultClick(id, type) {
    // Emit custom event for result selection
    this.container.dispatchEvent(new CustomEvent('search:resultSelected', {
      detail: { id, type },
      bubbles: true
    }));

    // Update global state
    globalState.set('search.selectedResult', { id, type });
  }

  handleGlobalSearchChange(searchData) {
    if (searchData.query !== this.searchState.query) {
      const searchInput = this.container.querySelector('#search-input');
      searchInput.value = searchData.query || '';
      this.searchState.query = searchData.query || '';
    }
  }

  // Utility methods
  clearSearch() {
    const searchInput = this.container.querySelector('#search-input');
    const clearButton = this.container.querySelector('#clear-search');

    searchInput.value = '';
    clearButton.classList.add('hidden');

    this.searchState.query = '';
    this.searchState.results = [];

    this.hideSuggestions();
    this.hideResults();

    globalState.set('search.query', '');
  }

  clearAllFilters() {
    this.searchState.filters = {};

    // Reset all filter selects
    ['category', 'technology', 'year', 'status'].forEach(filterType => {
      const filterElement = this.container.querySelector(`#${filterType}-filter`);
      if (filterElement) filterElement.value = '';
    });

    this.updateActiveFilters();

    // Re-perform search if there's a query
    if (this.searchState.query) {
      this.performSearch(this.searchState.query);
    }

    globalState.set('search.filters', {});
  }

  updateActiveFilters() {
    const activeFiltersContainer = this.container.querySelector('#active-filters');
    const filters = this.searchState.filters;
    const hasFilters = Object.keys(filters).length > 0;

    activeFiltersContainer.classList.toggle('hidden', !hasFilters);

    if (hasFilters) {
      const filterChips = Object.entries(filters).map(([type, value]) => `
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800">
          ${this.formatFilterType(type)}: ${value}
          <button class="ml-2 text-primary-600 hover:text-primary-800" onclick="this.closest('.advanced-search-container').__component.removeFilter('${type}')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </span>
      `).join('');

      activeFiltersContainer.innerHTML = `
        <div class="flex flex-wrap gap-2">
          <span class="text-sm text-gray-600">Active filters:</span>
          ${filterChips}
        </div>
      `;
    }
  }

  removeFilter(filterType) {
    delete this.searchState.filters[filterType];

    const filterElement = this.container.querySelector(`#${filterType}-filter`);
    if (filterElement) filterElement.value = '';

    this.updateActiveFilters();

    // Re-perform search
    if (this.searchState.query) {
      this.performSearch(this.searchState.query);
    }

    globalState.set('search.filters', this.searchState.filters);
  }

  updateFacets() {
    if (!this.searchIndex) return;

    const categories = new Set();
    const technologies = new Set();
    const years = new Set();

    // Collect all unique values for filters
    Object.values(this.searchIndex).forEach(items => {
      items.forEach(item => {
        if (item.category) categories.add(item.category);

        if (item.tech) {
          item.tech.forEach(tech => technologies.add(tech));
        }
        if (item.topics) {
          item.topics.forEach(topic => technologies.add(topic));
        }

        if (item.date) {
          const year = new Date(item.date).getFullYear();
          years.add(year);
        }
      });
    });

    // Update filter options
    this.updateFilterOptions('category-filter', Array.from(categories).sort());
    this.updateFilterOptions('technology-filter', Array.from(technologies).sort());
    this.updateFilterOptions('year-filter', Array.from(years).sort((a, b) => b - a));
  }

  updateFilterOptions(selectId, options) {
    const selectElement = this.container.querySelector(`#${selectId}`);
    if (!selectElement) return;

    // Keep the first option (All ...)
    const firstOption = selectElement.querySelector('option');
    selectElement.innerHTML = '';
    selectElement.appendChild(firstOption);

    // Add new options
    options.forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      selectElement.appendChild(optionElement);
    });
  }

  sortResults(sortType) {
    const results = [...this.searchState.results];

    switch (sortType) {
      case 'date':
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'title':
        results.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'popularity':
        results.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
        break;
      default: // relevance
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    this.searchState.results = results;
    this.displayResults(results);
  }

  showSuggestions() {
    if (this.searchState.suggestions.length === 0) return;

    const suggestionsContainer = this.container.querySelector('#search-suggestions');
    const suggestionsHtml = this.searchState.suggestions.map((suggestion, index) => `
      <div class="suggestion-item px-4 py-2 hover:bg-gray-100 cursor-pointer ${index === 0 ? 'bg-gray-50' : ''}"
           data-suggestion="${suggestion}">
        <div class="flex items-center">
          <svg class="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          ${this.highlightSearchTerms(suggestion, this.searchState.query)}
        </div>
      </div>
    `).join('');

    suggestionsContainer.innerHTML = `<div class="py-2 max-h-64 overflow-y-auto">${suggestionsHtml}</div>`;
    suggestionsContainer.classList.remove('hidden');

    // Add click handlers for suggestions
    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectSuggestion(item.dataset.suggestion);
      });
    });
  }

  hideSuggestions() {
    const suggestionsContainer = this.container.querySelector('#search-suggestions');
    suggestionsContainer.classList.add('hidden');
  }

  selectSuggestion(suggestion) {
    const searchInput = this.container.querySelector('#search-input');
    searchInput.value = suggestion;
    this.searchState.query = suggestion;
    this.hideSuggestions();
    this.performSearch(suggestion);
    globalState.set('search.query', suggestion);
  }

  navigateSuggestions(direction, suggestions) {
    if (suggestions.length === 0) return;

    const current = Array.from(suggestions).findIndex(item =>
      item.classList.contains('bg-gray-50')
    );

    // Remove current highlight
    suggestions.forEach(item => {
      item.classList.remove('bg-gray-50');
      item.classList.add('hover:bg-gray-100');
    });

    // Calculate new index
    let newIndex = current + direction;
    if (newIndex < 0) newIndex = suggestions.length - 1;
    if (newIndex >= suggestions.length) newIndex = 0;

    // Highlight new item
    const newItem = suggestions[newIndex];
    newItem.classList.add('bg-gray-50');
    newItem.classList.remove('hover:bg-gray-100');

    // Scroll into view if needed
    newItem.scrollIntoView({ block: 'nearest' });
  }

  selectActiveSuggestion(suggestions) {
    const active = Array.from(suggestions).find(item =>
      item.classList.contains('bg-gray-50')
    );

    if (active) {
      this.selectSuggestion(active.dataset.suggestion);
    } else {
      // No suggestion selected, perform search with current input
      this.performSearch(this.searchState.query);
    }
  }

  showLoading() {
    this.container.querySelector('#search-loading')?.classList.remove('hidden');
    this.hideResults();
  }

  hideLoading() {
    this.container.querySelector('#search-loading')?.classList.add('hidden');
  }

  hideResults() {
    this.container.querySelector('#search-results')?.classList.add('hidden');
    this.container.querySelector('#search-results-summary')?.classList.add('hidden');
    this.container.querySelector('#no-results')?.classList.add('hidden');
  }

  // Utility functions
  formatSearchType(type) {
    const labels = {
      all: 'All Content',
      projects: 'Projects',
      papers: 'Papers',
      testimonials: 'Testimonials'
    };
    return labels[type] || type;
  }

  formatFilterType(type) {
    const labels = {
      category: 'Category',
      technology: 'Technology',
      year: 'Year',
      status: 'Status'
    };
    return labels[type] || type;
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Public API
  getSearchState() {
    return { ...this.searchState };
  }

  setSearchQuery(query) {
    const searchInput = this.container.querySelector('#search-input');
    searchInput.value = query;
    this.searchState.query = query;

    if (query) {
      this.performSearch(query);
    } else {
      this.hideResults();
    }
  }

  setSearchType(type) {
    if (this.options.searchTypes.includes(type)) {
      this.handleTypeChange({ target: { dataset: { type } } });
    }
  }

  addFilter(filterType, value) {
    this.handleFilterChange(filterType, value);
  }

  // Component lifecycle
  destroy() {
    super.destroy();

    // Clean up global state subscriptions
    globalState.unsubscribe('search', this.handleGlobalSearchChange);
  }
}

// Store reference for filter removal
Object.defineProperty(HTMLElement.prototype, '__component', {
  value: null,
  writable: true
});

export default AdvancedSearch;