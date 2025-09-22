/**
 * ContentFilters Component - Dynamic filtering system
 * Real-time filtering with URL state management
 */
import { ComponentBase } from '../core/ComponentBase.js';

export class ContentFilters extends ComponentBase {
  constructor(targetContentType = 'all') {
    super();
    this.contentType = targetContentType;
    this.activeFilters = new Map();
    this.availableFilters = new Map();
    this.filterContainer = null;
    this.onFilterChange = null;
  }

  async init(container) {
    this.filterContainer = container;
    await this.loadFilterData();
    this.render();
    this.attachEventListeners();
    this.loadFiltersFromURL();
  }

  async loadFilterData() {
    const contentTypes = this.contentType === 'all'
      ? ['projects', 'papers', 'testimonials']
      : [this.contentType];

    for (const type of contentTypes) {
      try {
        const response = await fetch(`/data/${type}.json`);
        const content = await response.json();
        this.processContentForFilters(content, type);
      } catch (error) {
        console.error(`Error loading ${type} for filters:`, error);
      }
    }
  }

  processContentForFilters(content, type) {
    content.forEach(item => {
      // Technology/Skills filters
      if (item.technologies || item.skills) {
        const techs = item.technologies || item.skills || [];
        this.addFilterOptions('technology', techs);
      }

      // Category filters
      if (item.category) {
        this.addFilterOption('category', item.category);
      }

      // Year filters
      if (item.date || item.year) {
        const year = item.year || new Date(item.date).getFullYear();
        this.addFilterOption('year', year.toString());
      }

      // Content type
      this.addFilterOption('type', type);

      // Keywords for papers
      if (item.keywords) {
        this.addFilterOptions('keyword', item.keywords);
      }

      // Rating for testimonials
      if (item.rating) {
        const ratingRange = this.getRatingRange(item.rating);
        this.addFilterOption('rating', ratingRange);
      }

      // Difficulty level for projects
      if (item.difficulty) {
        this.addFilterOption('difficulty', item.difficulty);
      }

      // Status for projects
      if (item.status) {
        this.addFilterOption('status', item.status);
      }
    });
  }

  addFilterOption(filterType, value) {
    if (!this.availableFilters.has(filterType)) {
      this.availableFilters.set(filterType, new Set());
    }
    this.availableFilters.get(filterType).add(value);
  }

  addFilterOptions(filterType, values) {
    values.forEach(value => this.addFilterOption(filterType, value));
  }

  getRatingRange(rating) {
    if (rating >= 4.5) return '4.5-5.0';
    if (rating >= 4.0) return '4.0-4.4';
    if (rating >= 3.5) return '3.5-3.9';
    if (rating >= 3.0) return '3.0-3.4';
    return '2.0-2.9';
  }

  render() {
    const filterGroups = this.generateFilterGroups();

    this.filterContainer.innerHTML = `
      <div class="content-filters">
        <div class="filters-header">
          <h3>Filter Content</h3>
          <button class="clear-filters" ${this.activeFilters.size === 0 ? 'disabled' : ''}>
            Clear All
          </button>
        </div>

        <div class="filters-container">
          ${filterGroups}
        </div>

        <div class="active-filters">
          ${this.renderActiveFilters()}
        </div>
      </div>
    `;

    this.applyStyles();
  }

  generateFilterGroups() {
    const filterConfig = {
      type: { label: 'Content Type', icon: '📁' },
      category: { label: 'Category', icon: '🏷️' },
      technology: { label: 'Technology', icon: '⚙️' },
      year: { label: 'Year', icon: '📅' },
      difficulty: { label: 'Difficulty', icon: '📊' },
      status: { label: 'Status', icon: '🔄' },
      rating: { label: 'Rating', icon: '⭐' },
      keyword: { label: 'Keywords', icon: '🔍' }
    };

    return Array.from(this.availableFilters.entries())
      .filter(([type, options]) => options.size > 1)
      .map(([type, options]) => {
        const config = filterConfig[type] || { label: type, icon: '📌' };
        return this.renderFilterGroup(type, config, Array.from(options).sort());
      })
      .join('');
  }

  renderFilterGroup(type, config, options) {
    const isMultiSelect = ['technology', 'keyword'].includes(type);

    return `
      <div class="filter-group" data-filter-type="${type}">
        <div class="filter-group-header">
          <span class="filter-icon">${config.icon}</span>
          <span class="filter-label">${config.label}</span>
          <button class="filter-toggle" aria-expanded="true">
            <svg class="chevron" width="16" height="16" viewBox="0 0 16 16">
              <path d="M4 6l4 4 4-4" stroke="currentColor" fill="none" stroke-width="2"/>
            </svg>
          </button>
        </div>

        <div class="filter-options">
          ${isMultiSelect ? this.renderCheckboxOptions(type, options) : this.renderRadioOptions(type, options)}
        </div>
      </div>
    `;
  }

  renderCheckboxOptions(type, options) {
    return options.map(option => {
      const isActive = this.activeFilters.has(type) &&
                      this.activeFilters.get(type).has(option);
      return `
        <label class="filter-option checkbox-option">
          <input type="checkbox"
                 data-filter-type="${type}"
                 data-filter-value="${this.escapeHtml(option)}"
                 ${isActive ? 'checked' : ''}>
          <span class="checkmark"></span>
          <span class="option-text">${this.escapeHtml(option)}</span>
        </label>
      `;
    }).join('');
  }

  renderRadioOptions(type, options) {
    const currentValue = this.activeFilters.get(type);
    return `
      <label class="filter-option radio-option">
        <input type="radio"
               name="filter-${type}"
               data-filter-type="${type}"
               data-filter-value=""
               ${!currentValue ? 'checked' : ''}>
        <span class="radiomark"></span>
        <span class="option-text">All</span>
      </label>
      ${options.map(option => `
        <label class="filter-option radio-option">
          <input type="radio"
                 name="filter-${type}"
                 data-filter-type="${type}"
                 data-filter-value="${this.escapeHtml(option)}"
                 ${currentValue === option ? 'checked' : ''}>
          <span class="radiomark"></span>
          <span class="option-text">${this.escapeHtml(option)}</span>
        </label>
      `).join('')}
    `;
  }

  renderActiveFilters() {
    if (this.activeFilters.size === 0) {
      return '<p class="no-active-filters">No filters active</p>';
    }

    const filterTags = [];
    this.activeFilters.forEach((values, type) => {
      if (values instanceof Set) {
        values.forEach(value => {
          filterTags.push(this.createFilterTag(type, value));
        });
      } else {
        filterTags.push(this.createFilterTag(type, values));
      }
    });

    return `
      <div class="active-filters-list">
        <span class="active-filters-label">Active filters:</span>
        ${filterTags.join('')}
      </div>
    `;
  }

  createFilterTag(type, value) {
    return `
      <span class="filter-tag" data-filter-type="${type}" data-filter-value="${this.escapeHtml(value)}">
        ${this.escapeHtml(value)}
        <button class="remove-filter" aria-label="Remove ${type} filter">×</button>
      </span>
    `;
  }

  attachEventListeners() {
    // Filter option changes
    this.filterContainer.addEventListener('change', (e) => {
      if (e.target.matches('input[data-filter-type]')) {
        this.handleFilterChange(e.target);
      }
    });

    // Clear all filters
    this.filterContainer.addEventListener('click', (e) => {
      if (e.target.matches('.clear-filters')) {
        this.clearAllFilters();
      }

      if (e.target.matches('.remove-filter')) {
        this.removeFilter(e.target);
      }

      if (e.target.matches('.filter-toggle, .filter-toggle *')) {
        this.toggleFilterGroup(e.target.closest('.filter-group'));
      }
    });
  }

  handleFilterChange(input) {
    const type = input.dataset.filterType;
    const value = input.dataset.filterValue;
    const isCheckbox = input.type === 'checkbox';

    if (isCheckbox) {
      this.handleCheckboxFilter(type, value, input.checked);
    } else {
      this.handleRadioFilter(type, value);
    }

    this.updateActiveFiltersDisplay();
    this.updateURL();
    this.notifyFilterChange();
  }

  handleCheckboxFilter(type, value, checked) {
    if (!this.activeFilters.has(type)) {
      this.activeFilters.set(type, new Set());
    }

    const filterSet = this.activeFilters.get(type);
    if (checked) {
      filterSet.add(value);
    } else {
      filterSet.delete(value);
      if (filterSet.size === 0) {
        this.activeFilters.delete(type);
      }
    }
  }

  handleRadioFilter(type, value) {
    if (value === '') {
      this.activeFilters.delete(type);
    } else {
      this.activeFilters.set(type, value);
    }
  }

  removeFilter(removeButton) {
    const filterTag = removeButton.closest('.filter-tag');
    const type = filterTag.dataset.filterType;
    const value = filterTag.dataset.filterValue;

    const activeFilter = this.activeFilters.get(type);
    if (activeFilter instanceof Set) {
      activeFilter.delete(value);
      if (activeFilter.size === 0) {
        this.activeFilters.delete(type);
      }
    } else {
      this.activeFilters.delete(type);
    }

    // Update corresponding input
    const input = this.filterContainer.querySelector(
      `input[data-filter-type="${type}"][data-filter-value="${value}"]`
    );
    if (input) {
      input.checked = false;
    }

    // For radio buttons, select "All" option
    if (!activeFilter instanceof Set) {
      const allOption = this.filterContainer.querySelector(
        `input[data-filter-type="${type}"][data-filter-value=""]`
      );
      if (allOption) {
        allOption.checked = true;
      }
    }

    this.updateActiveFiltersDisplay();
    this.updateURL();
    this.notifyFilterChange();
  }

  clearAllFilters() {
    this.activeFilters.clear();

    // Reset all inputs
    this.filterContainer.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });

    this.filterContainer.querySelectorAll('input[type="radio"][data-filter-value=""]').forEach(input => {
      input.checked = true;
    });

    this.updateActiveFiltersDisplay();
    this.updateURL();
    this.notifyFilterChange();
  }

  toggleFilterGroup(group) {
    const options = group.querySelector('.filter-options');
    const toggle = group.querySelector('.filter-toggle');
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

    toggle.setAttribute('aria-expanded', !isExpanded);
    options.style.display = isExpanded ? 'none' : 'block';

    const chevron = toggle.querySelector('.chevron');
    chevron.style.transform = isExpanded ? 'rotate(-90deg)' : 'rotate(0deg)';
  }

  updateActiveFiltersDisplay() {
    const activeFiltersContainer = this.filterContainer.querySelector('.active-filters');
    activeFiltersContainer.innerHTML = this.renderActiveFilters();

    const clearButton = this.filterContainer.querySelector('.clear-filters');
    clearButton.disabled = this.activeFilters.size === 0;
  }

  loadFiltersFromURL() {
    const params = new URLSearchParams(window.location.search);

    this.availableFilters.forEach((_, type) => {
      const value = params.get(`filter_${type}`);
      if (value) {
        if (['technology', 'keyword'].includes(type)) {
          const values = value.split(',');
          this.activeFilters.set(type, new Set(values));
        } else {
          this.activeFilters.set(type, value);
        }
      }
    });

    this.updateInputsFromFilters();
    this.updateActiveFiltersDisplay();
  }

  updateURL() {
    const params = new URLSearchParams(window.location.search);

    // Clear existing filter params
    this.availableFilters.forEach((_, type) => {
      params.delete(`filter_${type}`);
    });

    // Add active filters
    this.activeFilters.forEach((values, type) => {
      if (values instanceof Set) {
        if (values.size > 0) {
          params.set(`filter_${type}`, Array.from(values).join(','));
        }
      } else {
        params.set(`filter_${type}`, values);
      }
    });

    const newURL = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.history.replaceState({}, '', newURL);
  }

  updateInputsFromFilters() {
    this.activeFilters.forEach((values, type) => {
      if (values instanceof Set) {
        values.forEach(value => {
          const input = this.filterContainer.querySelector(
            `input[data-filter-type="${type}"][data-filter-value="${value}"]`
          );
          if (input) input.checked = true;
        });
      } else {
        const input = this.filterContainer.querySelector(
          `input[data-filter-type="${type}"][data-filter-value="${values}"]`
        );
        if (input) input.checked = true;
      }
    });
  }

  notifyFilterChange() {
    if (this.onFilterChange) {
      this.onFilterChange(this.getActiveFilters());
    }
  }

  getActiveFilters() {
    const filters = {};
    this.activeFilters.forEach((values, type) => {
      if (values instanceof Set) {
        filters[type] = Array.from(values);
      } else {
        filters[type] = values;
      }
    });
    return filters;
  }

  setFilterChangeCallback(callback) {
    this.onFilterChange = callback;
  }

  applyStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .content-filters {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 2rem;
      }

      .filters-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e9ecef;
      }

      .filters-header h3 {
        margin: 0;
        color: #343a40;
      }

      .clear-filters {
        background: #dc3545;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
      }

      .clear-filters:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }

      .filters-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .filter-group {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        overflow: hidden;
      }

      .filter-group-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: #f1f3f4;
        cursor: pointer;
        user-select: none;
      }

      .filter-icon {
        font-size: 1rem;
      }

      .filter-label {
        flex: 1;
        font-weight: 500;
        color: #495057;
      }

      .filter-toggle {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem;
      }

      .chevron {
        transition: transform 0.2s ease;
      }

      .filter-options {
        padding: 0.5rem;
        max-height: 200px;
        overflow-y: auto;
      }

      .filter-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        cursor: pointer;
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .filter-option:hover {
        background: #f8f9fa;
      }

      .filter-option input {
        margin: 0;
      }

      .checkmark, .radiomark {
        width: 16px;
        height: 16px;
        border: 2px solid #6c757d;
        border-radius: 3px;
        position: relative;
      }

      .radiomark {
        border-radius: 50%;
      }

      .option-text {
        flex: 1;
        font-size: 0.875rem;
        color: #495057;
      }

      .active-filters {
        padding-top: 1rem;
        border-top: 1px solid #e9ecef;
      }

      .no-active-filters {
        color: #6c757d;
        font-style: italic;
        margin: 0;
      }

      .active-filters-label {
        font-weight: 500;
        color: #495057;
        margin-right: 0.5rem;
      }

      .filter-tag {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        background: #007bff;
        color: white;
        padding: 0.25rem 0.5rem;
        border-radius: 16px;
        font-size: 0.75rem;
        margin: 0.125rem;
      }

      .remove-filter {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .remove-filter:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      @media (max-width: 768px) {
        .filters-container {
          grid-template-columns: 1fr;
        }

        .filters-header {
          flex-direction: column;
          gap: 0.5rem;
          align-items: stretch;
        }
      }
    `;

    if (!document.head.querySelector('style[data-component="ContentFilters"]')) {
      style.setAttribute('data-component', 'ContentFilters');
      document.head.appendChild(style);
    }
  }
}