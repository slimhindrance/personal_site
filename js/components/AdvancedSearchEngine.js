/**
 * AdvancedSearchEngine - Real-time search with fuzzy matching and suggestions
 * Features: Instant results, highlighted matches, search history, autocomplete
 */

import ComponentBase from '../core/ComponentBase.js';
import { globalState } from '../core/StateManager.js';

class AdvancedSearchEngine extends ComponentBase {
  get defaults() {
    return {
      placeholder: 'Search projects, papers, technologies...',
      minQueryLength: 2,
      maxSuggestions: 8,
      maxRecentSearches: 5,
      enableFuzzySearch: true,
      enableSearchHistory: true,
      enableAutoComplete: true,
      searchWeights: {
        title: 3,
        description: 2,
        technologies: 2,
        tags: 1.5,
        category: 1
      },
      className: 'advanced-search'
    };
  }

  init() {
    this.searchIndex = new Map();
    this.searchHistory = this.loadSearchHistory();
    this.suggestions = [];
    this.isOpen = false;
    this.selectedIndex = -1;
    this.currentQuery = '';
    this.searchResults = [];
    this.debounceTimer = null;

    // Subscribe to data changes
    this.unsubscribers = [
      globalState.subscribe('projects', this.updateSearchIndex.bind(this)),
      globalState.subscribe('papers', this.updateSearchIndex.bind(this)),
    ];

    this.buildSearchIndex();
    super.init();
  }

  template() {
    const fragment = this.createFragment();

    // Main search container
    const searchContainer = this.createElement('div', {
      className: 'relative w-full max-w-2xl mx-auto'
    });

    // Search input group
    const inputGroup = this.createElement('div', {
      className: 'relative'
    });

    // Search icon
    const searchIcon = this.createElement('div', {
      className: 'absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10'
    });
    searchIcon.innerHTML = `
      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    `;

    // Search input
    const searchInput = this.createElement('input', {
      type: 'text',
      placeholder: this.options.placeholder,
      className: 'w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white shadow-lg',
      'aria-label': 'Search content',
      'aria-expanded': 'false',
      'aria-haspopup': 'listbox',
      autocomplete: 'off',
      'data-testid': 'search-input'
    });

    // Clear button
    const clearButton = this.createElement('button', {
      className: 'absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors z-10 opacity-0 pointer-events-none',
      'aria-label': 'Clear search',
      'data-testid': 'clear-search'
    });
    clearButton.innerHTML = `
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;

    // Dropdown container
    const dropdown = this.createElement('div', {
      className: 'absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-96 overflow-hidden z-50 opacity-0 invisible transition-all duration-200',
      'data-testid': 'search-dropdown',
      role: 'listbox',
      'aria-label': 'Search suggestions and results'
    });

    // Assemble components
    inputGroup.appendChild(searchIcon);
    inputGroup.appendChild(searchInput);
    inputGroup.appendChild(clearButton);
    
    searchContainer.appendChild(inputGroup);
    searchContainer.appendChild(dropdown);
    
    fragment.appendChild(searchContainer);

    // Bind events
    this.bindSearchEvents(searchInput, clearButton, dropdown);

    return fragment;
  }

  bindSearchEvents(input, clearButton, dropdown) {
    // Input events
    this.addEventListener(input, 'input', this.handleInput.bind(this));
    this.addEventListener(input, 'focus', this.handleFocus.bind(this));
    this.addEventListener(input, 'blur', this.handleBlur.bind(this));
    this.addEventListener(input, 'keydown', this.handleKeydown.bind(this));

    // Clear button
    this.addEventListener(clearButton, 'click', this.clearSearch.bind(this));

    // Global click to close
    this.addEventListener(document, 'click', (e) => {
      if (!this.element.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }

  handleInput(e) {
    const query = e.target.value;
    this.currentQuery = query;
    this.selectedIndex = -1;

    // Show/hide clear button
    const clearButton = this.$('[data-testid="clear-search"]');
    if (query.length > 0) {
      clearButton.classList.remove('opacity-0', 'pointer-events-none');
    } else {
      clearButton.classList.add('opacity-0', 'pointer-events-none');
    }

    // Debounce search
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.performSearch(query);
    }, 150);
  }

  handleFocus(e) {
    if (this.currentQuery.length >= this.options.minQueryLength || this.searchHistory.length > 0) {
      this.openDropdown();
    }
  }

  handleBlur(e) {
    // Delay to allow click events on dropdown items
    setTimeout(() => {
      this.closeDropdown();
    }, 200);
  }

  handleKeydown(e) {
    const dropdown = this.$('[data-testid="search-dropdown"]');
    const items = dropdown.querySelectorAll('[role="option"]');

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
        this.updateSelection(items);
        break;

      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection(items);
        break;

      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
          this.selectItem(items[this.selectedIndex]);
        } else if (this.currentQuery.length >= this.options.minQueryLength) {
          this.executeSearch(this.currentQuery);
        }
        break;

      case 'Escape':
        this.closeDropdown();
        e.target.blur();
        break;

      case 'Tab':
        if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
          e.preventDefault();
          this.selectItem(items[this.selectedIndex]);
        }
        break;
    }
  }

  performSearch(query) {
    if (query.length < this.options.minQueryLength) {
      if (this.searchHistory.length > 0) {
        this.showSearchHistory();
      } else {
        this.closeDropdown();
      }
      return;
    }

    // Perform search across all indexed content
    const results = this.searchContent(query);
    const suggestions = this.generateSuggestions(query);

    this.searchResults = results;
    this.suggestions = suggestions;

    this.updateDropdown(query, results, suggestions);
    this.openDropdown();

    // Emit search event
    this.element.dispatchEvent(new CustomEvent('search:query', {
      detail: { query, results, suggestions },
      bubbles: true
    }));
  }

  searchContent(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    // Search through indexed content
    for (const [id, item] of this.searchIndex) {
      const score = this.calculateRelevanceScore(item, lowerQuery);
      if (score > 0) {
        results.push({
          ...item,
          score,
          highlights: this.generateHighlights(item, lowerQuery)
        });
      }
    }

    // Sort by relevance score
    return results.sort((a, b) => b.score - a.score).slice(0, 20);
  }

  calculateRelevanceScore(item, query) {
    let score = 0;
    const weights = this.options.searchWeights;

    // Exact title match gets highest score
    if (item.title.toLowerCase().includes(query)) {
      score += weights.title * (query.length / item.title.length);
    }

    // Description match
    if (item.description && item.description.toLowerCase().includes(query)) {
      score += weights.description * (query.length / item.description.length);
    }

    // Technology/tags match
    if (item.technologies) {
      item.technologies.forEach(tech => {
        if (tech.toLowerCase().includes(query)) {
          score += weights.technologies;
        }
      });
    }

    if (item.tags) {
      item.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          score += weights.tags;
        }
      });
    }

    // Category match
    if (item.category && item.category.toLowerCase().includes(query)) {
      score += weights.category;
    }

    // Fuzzy matching for partial queries
    if (this.options.enableFuzzySearch && score === 0) {
      score += this.fuzzyMatch(item.title.toLowerCase(), query) * 0.5;
    }

    return score;
  }

  fuzzyMatch(text, query) {
    // Simple fuzzy matching algorithm
    let score = 0;
    let queryIndex = 0;
    
    for (let i = 0; i < text.length && queryIndex < query.length; i++) {
      if (text[i] === query[queryIndex]) {
        score++;
        queryIndex++;
      }
    }
    
    return queryIndex === query.length ? score / text.length : 0;
  }

  generateHighlights(item, query) {
    const highlights = {};
    
    // Highlight matches in title
    highlights.title = this.highlightText(item.title, query);
    
    // Highlight matches in description
    if (item.description) {
      highlights.description = this.highlightText(item.description, query);
    }

    return highlights;
  }

  highlightText(text, query) {
    if (!text || !query) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 rounded px-1">$1</mark>');
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  generateSuggestions(query) {
    const suggestions = new Set();
    const lowerQuery = query.toLowerCase();

    // Extract suggestions from indexed content
    for (const [id, item] of this.searchIndex) {
      // Add matching technologies
      if (item.technologies) {
        item.technologies.forEach(tech => {
          if (tech.toLowerCase().includes(lowerQuery) && !suggestions.has(tech)) {
            suggestions.add(tech);
          }
        });
      }

      // Add matching tags
      if (item.tags) {
        item.tags.forEach(tag => {
          if (tag.toLowerCase().includes(lowerQuery) && !suggestions.has(tag)) {
            suggestions.add(tag);
          }
        });
      }

      // Add matching categories
      if (item.category && item.category.toLowerCase().includes(lowerQuery)) {
        suggestions.add(item.category);
      }
    }

    return Array.from(suggestions).slice(0, this.options.maxSuggestions);
  }

  updateDropdown(query, results, suggestions) {
    const dropdown = this.$('[data-testid="search-dropdown"]');
    dropdown.innerHTML = '';

    if (results.length === 0 && suggestions.length === 0) {
      dropdown.appendChild(this.createNoResultsMessage(query));
      return;
    }

    // Add suggestions section
    if (suggestions.length > 0) {
      dropdown.appendChild(this.createSuggestionsSection(suggestions));
    }

    // Add results section
    if (results.length > 0) {
      dropdown.appendChild(this.createResultsSection(results));
    }
  }

  createSuggestionsSection(suggestions) {
    const section = this.createElement('div', {
      className: 'border-b border-gray-100 last:border-b-0'
    });

    const header = this.createElement('div', {
      className: 'px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50'
    }, 'Suggestions');

    section.appendChild(header);

    suggestions.forEach((suggestion, index) => {
      const item = this.createElement('div', {
        className: 'px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0',
        role: 'option',
        'data-suggestion': suggestion,
        'data-testid': `suggestion-${index}`
      });

      item.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <span class="text-gray-700">${suggestion}</span>
        </div>
      `;

      this.addEventListener(item, 'click', () => this.selectSuggestion(suggestion));
      section.appendChild(item);
    });

    return section;
  }

  createResultsSection(results) {
    const section = this.createElement('div', {
      className: 'border-b border-gray-100 last:border-b-0'
    });

    const header = this.createElement('div', {
      className: 'px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50 flex items-center justify-between'
    });
    header.innerHTML = `
      <span>Results</span>
      <span class="text-primary-600">${results.length} found</span>
    `;

    section.appendChild(header);

    results.slice(0, 8).forEach((result, index) => {
      const item = this.createElement('div', {
        className: 'px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0',
        role: 'option',
        'data-result-id': result.id,
        'data-result-type': result.type,
        'data-testid': `result-${index}`
      });

      const typeIcon = this.getTypeIcon(result.type);
      const typeColor = this.getTypeColor(result.type);

      item.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-1">
            <div class="w-8 h-8 rounded-lg ${typeColor} flex items-center justify-center">
              ${typeIcon}
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 mb-1">
              ${result.highlights?.title || result.title}
            </div>
            <div class="text-xs text-gray-600 line-clamp-2">
              ${result.highlights?.description || result.description}
            </div>
            <div class="flex items-center gap-2 mt-2">
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColor} bg-opacity-20">
                ${result.type}
              </span>
              ${result.technologies ? result.technologies.slice(0, 2).map(tech => 
                `<span class="text-xs text-gray-500">${tech}</span>`
              ).join('') : ''}
            </div>
          </div>
        </div>
      `;

      this.addEventListener(item, 'click', () => this.selectResult(result));
      section.appendChild(item);
    });

    return section;
  }

  createNoResultsMessage(query) {
    const message = this.createElement('div', {
      className: 'px-4 py-8 text-center'
    });

    message.innerHTML = `
      <svg class="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-3-3v3m0 0v3m-3-9h6a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"></path>
      </svg>
      <h3 class="text-sm font-medium text-gray-900 mb-1">No results found</h3>
      <p class="text-xs text-gray-500">Try adjusting your search terms or browse all content</p>
    `;

    return message;
  }

  showSearchHistory() {
    if (this.searchHistory.length === 0) return;

    const dropdown = this.$('[data-testid="search-dropdown"]');
    dropdown.innerHTML = '';

    const section = this.createElement('div');
    const header = this.createElement('div', {
      className: 'px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide bg-gray-50 flex items-center justify-between'
    });
    header.innerHTML = `
      <span>Recent Searches</span>
      <button class="text-primary-600 hover:text-primary-700 transition-colors normal-case font-normal" data-action="clear-history">
        Clear
      </button>
    `;

    section.appendChild(header);

    this.searchHistory.forEach((search, index) => {
      const item = this.createElement('div', {
        className: 'px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0',
        role: 'option',
        'data-testid': `history-${index}`
      });

      item.innerHTML = `
        <div class="flex items-center gap-3">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-gray-700">${search}</span>
        </div>
      `;

      this.addEventListener(item, 'click', () => this.selectHistoryItem(search));
      section.appendChild(item);
    });

    // Bind clear history
    const clearButton = header.querySelector('[data-action="clear-history"]');
    this.addEventListener(clearButton, 'click', this.clearSearchHistory.bind(this));

    dropdown.appendChild(section);
    this.openDropdown();
  }

  selectSuggestion(suggestion) {
    const input = this.$('[data-testid="search-input"]');
    input.value = suggestion;
    this.currentQuery = suggestion;
    this.performSearch(suggestion);
    this.addToSearchHistory(suggestion);
  }

  selectResult(result) {
    this.addToSearchHistory(this.currentQuery);
    this.closeDropdown();

    // Emit selection event
    this.element.dispatchEvent(new CustomEvent('search:select', {
      detail: { result, query: this.currentQuery },
      bubbles: true
    }));
  }

  selectHistoryItem(search) {
    const input = this.$('[data-testid="search-input"]');
    input.value = search;
    this.currentQuery = search;
    this.performSearch(search);
  }

  selectItem(item) {
    if (item.dataset.suggestion) {
      this.selectSuggestion(item.dataset.suggestion);
    } else if (item.dataset.resultId) {
      const result = this.searchResults.find(r => r.id === item.dataset.resultId);
      if (result) this.selectResult(result);
    } else if (item.textContent) {
      this.selectHistoryItem(item.textContent.trim());
    }
  }

  updateSelection(items) {
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add('bg-primary-50');
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-primary-50');
        item.setAttribute('aria-selected', 'false');
      }
    });
  }

  executeSearch(query) {
    this.addToSearchHistory(query);
    this.closeDropdown();

    // Emit execute search event
    this.element.dispatchEvent(new CustomEvent('search:execute', {
      detail: { query, results: this.searchResults },
      bubbles: true
    }));
  }

  clearSearch() {
    const input = this.$('[data-testid="search-input"]');
    const clearButton = this.$('[data-testid="clear-search"]');
    
    input.value = '';
    this.currentQuery = '';
    this.selectedIndex = -1;
    
    clearButton.classList.add('opacity-0', 'pointer-events-none');
    this.closeDropdown();
    
    input.focus();

    // Emit clear event
    this.element.dispatchEvent(new CustomEvent('search:clear', {
      bubbles: true
    }));
  }

  openDropdown() {
    const dropdown = this.$('[data-testid="search-dropdown"]');
    const input = this.$('[data-testid="search-input"]');
    
    dropdown.classList.remove('opacity-0', 'invisible');
    dropdown.classList.add('opacity-100', 'visible');
    input.setAttribute('aria-expanded', 'true');
    
    this.isOpen = true;
  }

  closeDropdown() {
    const dropdown = this.$('[data-testid="search-dropdown"]');
    const input = this.$('[data-testid="search-input"]');
    
    dropdown.classList.add('opacity-0', 'invisible');
    dropdown.classList.remove('opacity-100', 'visible');
    input.setAttribute('aria-expanded', 'false');
    
    this.isOpen = false;
    this.selectedIndex = -1;
  }

  addToSearchHistory(query) {
    if (!this.options.enableSearchHistory || !query.trim()) return;

    // Remove existing instance
    const index = this.searchHistory.indexOf(query);
    if (index > -1) {
      this.searchHistory.splice(index, 1);
    }

    // Add to beginning
    this.searchHistory.unshift(query);

    // Limit size
    if (this.searchHistory.length > this.options.maxRecentSearches) {
      this.searchHistory.pop();
    }

    this.saveSearchHistory();
  }

  clearSearchHistory() {
    this.searchHistory = [];
    this.saveSearchHistory();
    this.closeDropdown();
  }

  loadSearchHistory() {
    try {
      const stored = localStorage.getItem('search-history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load search history:', error);
      return [];
    }
  }

  saveSearchHistory() {
    try {
      localStorage.setItem('search-history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  buildSearchIndex() {
    // Clear existing index
    this.searchIndex.clear();

    // Index projects
    const projects = globalState.get('projects') || [];
    projects.forEach(project => {
      this.searchIndex.set(project.id, {
        ...project,
        type: 'project',
        searchText: this.buildSearchText(project)
      });
    });

    // Index papers
    const papers = globalState.get('papers') || [];
    papers.forEach(paper => {
      this.searchIndex.set(paper.id, {
        ...paper,
        type: 'paper',
        searchText: this.buildSearchText(paper)
      });
    });
  }

  buildSearchText(item) {
    const parts = [item.title, item.description || item.abstract];
    
    if (item.technologies) parts.push(...item.technologies);
    if (item.tags) parts.push(...item.tags);
    if (item.category) parts.push(item.category);
    if (item.authors) parts.push(...item.authors);
    
    return parts.filter(Boolean).join(' ').toLowerCase();
  }

  updateSearchIndex() {
    this.buildSearchIndex();
  }

  getTypeIcon(type) {
    const icons = {
      project: '<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path></svg>',
      paper: '<svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>'
    };
    return icons[type] || icons.project;
  }

  getTypeColor(type) {
    const colors = {
      project: 'bg-primary-500 text-primary-500',
      paper: 'bg-green-500 text-green-500'
    };
    return colors[type] || colors.project;
  }

  // Public API
  focus() {
    const input = this.$('[data-testid="search-input"]');
    if (input) input.focus();
  }

  setQuery(query) {
    const input = this.$('[data-testid="search-input"]');
    if (input) {
      input.value = query;
      this.currentQuery = query;
      this.performSearch(query);
    }
  }

  getQuery() {
    return this.currentQuery;
  }

  getResults() {
    return this.searchResults;
  }

  destroy() {
    clearTimeout(this.debounceTimer);
    
    if (this.unsubscribers) {
      this.unsubscribers.forEach(unsubscribe => unsubscribe());
    }

    super.destroy();
  }
}

export default AdvancedSearchEngine;