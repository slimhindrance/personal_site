/**
 * PapersExplorer - Interactive papers and publications browser
 * Features: PDF preview, citation network, full-text search, related papers
 */

import ComponentBase from '../core/ComponentBase.js';
import { globalState } from '../core/StateManager.js';

class PapersExplorer extends ComponentBase {
  get defaults() {
    return {
      enablePDFPreview: true,
      enableCitationNetwork: true,
      enableFullTextSearch: false,
      enableRelatedPapers: true,
      itemsPerPage: 8,
      sortBy: 'year',
      sortOrder: 'desc',
      className: 'papers-explorer'
    };
  }

  init() {
    this.papers = [];
    this.filteredPapers = [];
    this.currentPage = 1;
    this.searchTerm = '';
    this.activeFilters = {};
    this.selectedPaper = null;
    this.citationNetwork = new Map();
    this.relatedPapers = new Map();

    // Subscribe to global state changes
    this.unsubscribers = [
      globalState.subscribe('papers', this.handlePapersUpdate.bind(this)),
      globalState.subscribe('search.query', this.handleSearchUpdate.bind(this))
    ];

    super.init();
  }

  template() {
    const fragment = this.createFragment();

    // Explorer header
    fragment.appendChild(this.createExplorerHeader());

    // Search and filter controls
    fragment.appendChild(this.createSearchControls());

    // Main content area
    const mainContent = this.createElement('div', {
      className: 'grid grid-cols-1 lg:grid-cols-4 gap-8'
    });

    // Papers list (left side)
    const papersSection = this.createElement('div', {
      className: 'lg:col-span-3'
    });
    papersSection.appendChild(this.createPapersList());

    // Sidebar (right side)
    const sidebar = this.createElement('div', {
      className: 'lg:col-span-1'
    });
    sidebar.appendChild(this.createSidebar());

    mainContent.appendChild(papersSection);
    mainContent.appendChild(sidebar);
    fragment.appendChild(mainContent);

    return fragment;
  }

  createExplorerHeader() {
    const header = this.createElement('div', {
      className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8'
    });

    // Title section
    const titleSection = this.createElement('div');
    const title = this.createElement('h2', {
      className: 'text-3xl font-bold text-gray-900 mb-2'
    }, 'Research Papers & Publications');
    
    const subtitle = this.createElement('p', {
      className: 'text-gray-600'
    }, 'Explore my published research and academic contributions');

    titleSection.appendChild(title);
    titleSection.appendChild(subtitle);

    // Stats section
    const stats = this.createElement('div', {
      className: 'flex items-center gap-6 text-sm text-gray-600'
    });

    const papersCount = this.createElement('div', {
      className: 'flex items-center gap-2'
    });
    papersCount.innerHTML = `
      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"></path>
      </svg>
      <span data-papers-count>0 papers</span>
    `;

    const citationsCount = this.createElement('div', {
      className: 'flex items-center gap-2'
    });
    citationsCount.innerHTML = `
      <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span data-citations-count>0 citations</span>
    `;

    stats.appendChild(papersCount);
    stats.appendChild(citationsCount);

    header.appendChild(titleSection);
    header.appendChild(stats);

    return header;
  }

  createSearchControls() {
    const controls = this.createElement('div', {
      className: 'mb-8 p-6 bg-gray-50 rounded-xl'
    });

    // Search input
    const searchContainer = this.createElement('div', {
      className: 'relative mb-6'
    });

    const searchInput = this.createElement('input', {
      type: 'text',
      placeholder: 'Search papers by title, abstract, keywords, or authors...',
      className: 'w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
      'data-search-input': 'true'
    });

    const searchIcon = this.createElement('div', {
      className: 'absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'
    });
    searchIcon.innerHTML = `
      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    `;

    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchInput);

    // Filters row
    const filtersRow = this.createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-4 gap-4'
    });

    // Year filter
    filtersRow.appendChild(this.createYearFilter());

    // Category filter
    filtersRow.appendChild(this.createCategoryFilter());

    // Status filter
    filtersRow.appendChild(this.createStatusFilter());

    // Sort options
    filtersRow.appendChild(this.createSortSelector());

    controls.appendChild(searchContainer);
    controls.appendChild(filtersRow);

    // Bind search events
    this.addEventListener(searchInput, 'input', this.handleSearchInput.bind(this));

    return controls;
  }

  createYearFilter() {
    const container = this.createElement('div');
    
    const label = this.createElement('label', {
      className: 'block text-sm font-medium text-gray-700 mb-1'
    }, 'Year');

    const select = this.createElement('select', {
      className: 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      'data-filter': 'year'
    });

    const defaultOption = this.createElement('option', { value: '' }, 'All Years');
    select.appendChild(defaultOption);

    // Add year options dynamically
    this.getYearOptions().forEach(year => {
      const option = this.createElement('option', { value: year }, year);
      select.appendChild(option);
    });

    this.addEventListener(select, 'change', (e) => {
      this.handleFilterChange('year', e.target.value);
    });

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }

  createCategoryFilter() {
    const container = this.createElement('div');
    
    const label = this.createElement('label', {
      className: 'block text-sm font-medium text-gray-700 mb-1'
    }, 'Category');

    const select = this.createElement('select', {
      className: 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      'data-filter': 'category'
    });

    const categories = [
      { value: '', label: 'All Categories' },
      { value: 'research', label: 'Research Papers' },
      { value: 'case-study', label: 'Case Studies' },
      { value: 'conference', label: 'Conference Papers' },
      { value: 'journal', label: 'Journal Articles' }
    ];

    categories.forEach(cat => {
      const option = this.createElement('option', { value: cat.value }, cat.label);
      select.appendChild(option);
    });

    this.addEventListener(select, 'change', (e) => {
      this.handleFilterChange('category', e.target.value);
    });

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }

  createStatusFilter() {
    const container = this.createElement('div');
    
    const label = this.createElement('label', {
      className: 'block text-sm font-medium text-gray-700 mb-1'
    }, 'Status');

    const select = this.createElement('select', {
      className: 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      'data-filter': 'status'
    });

    const statuses = [
      { value: '', label: 'All Status' },
      { value: 'published', label: 'Published' },
      { value: 'under-review', label: 'Under Review' },
      { value: 'in-preparation', label: 'In Preparation' }
    ];

    statuses.forEach(status => {
      const option = this.createElement('option', { value: status.value }, status.label);
      select.appendChild(option);
    });

    this.addEventListener(select, 'change', (e) => {
      this.handleFilterChange('status', e.target.value);
    });

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }

  createSortSelector() {
    const container = this.createElement('div');
    
    const label = this.createElement('label', {
      className: 'block text-sm font-medium text-gray-700 mb-1'
    }, 'Sort By');

    const select = this.createElement('select', {
      className: 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      'data-sort': 'true'
    });

    const sortOptions = [
      { value: 'year-desc', label: 'Newest First' },
      { value: 'year-asc', label: 'Oldest First' },
      { value: 'title-asc', label: 'Title A-Z' },
      { value: 'citations-desc', label: 'Most Cited' },
      { value: 'featured', label: 'Featured First' }
    ];

    sortOptions.forEach(option => {
      const optionElement = this.createElement('option', {
        value: option.value,
        selected: option.value === `${this.options.sortBy}-${this.options.sortOrder}`
      }, option.label);
      select.appendChild(optionElement);
    });

    this.addEventListener(select, 'change', this.handleSortChange.bind(this));

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }

  createPapersList() {
    const container = this.createElement('div', {
      className: 'space-y-6',
      'data-papers-list': 'true'
    });

    this.renderPapersList(container);
    return container;
  }

  createSidebar() {
    const sidebar = this.createElement('div', {
      className: 'space-y-6'
    });

    // Statistics card
    sidebar.appendChild(this.createStatisticsCard());

    // Keywords cloud
    sidebar.appendChild(this.createKeywordsCloud());

    // Recent papers
    sidebar.appendChild(this.createRecentPapers());

    return sidebar;
  }

  createStatisticsCard() {
    const card = this.createElement('div', {
      className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
    });

    const title = this.createElement('h3', {
      className: 'text-lg font-bold text-gray-900 mb-4'
    }, 'Research Metrics');

    const metrics = this.createElement('div', {
      className: 'space-y-4'
    });

    // Total papers
    const totalPapers = this.createElement('div', {
      className: 'flex items-center justify-between'
    });
    totalPapers.innerHTML = `
      <span class="text-sm text-gray-600">Total Papers</span>
      <span class="text-lg font-bold text-primary-600" data-metric="total">0</span>
    `;

    // Total citations
    const totalCitations = this.createElement('div', {
      className: 'flex items-center justify-between'
    });
    totalCitations.innerHTML = `
      <span class="text-sm text-gray-600">Total Citations</span>
      <span class="text-lg font-bold text-green-600" data-metric="citations">0</span>
    `;

    // Published this year
    const thisYear = new Date().getFullYear();
    const thisYearPapers = this.createElement('div', {
      className: 'flex items-center justify-between'
    });
    thisYearPapers.innerHTML = `
      <span class="text-sm text-gray-600">${thisYear} Publications</span>
      <span class="text-lg font-bold text-blue-600" data-metric="thisYear">0</span>
    `;

    // H-index (simplified calculation)
    const hIndex = this.createElement('div', {
      className: 'flex items-center justify-between'
    });
    hIndex.innerHTML = `
      <span class="text-sm text-gray-600">H-Index</span>
      <span class="text-lg font-bold text-purple-600" data-metric="hindex">0</span>
    `;

    metrics.appendChild(totalPapers);
    metrics.appendChild(totalCitations);
    metrics.appendChild(thisYearPapers);
    metrics.appendChild(hIndex);

    card.appendChild(title);
    card.appendChild(metrics);

    return card;
  }

  createKeywordsCloud() {
    const card = this.createElement('div', {
      className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
    });

    const title = this.createElement('h3', {
      className: 'text-lg font-bold text-gray-900 mb-4'
    }, 'Research Keywords');

    const cloud = this.createElement('div', {
      className: 'flex flex-wrap gap-2',
      'data-keywords-cloud': 'true'
    });

    card.appendChild(title);
    card.appendChild(cloud);

    this.updateKeywordsCloud();

    return card;
  }

  createRecentPapers() {
    const card = this.createElement('div', {
      className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200'
    });

    const title = this.createElement('h3', {
      className: 'text-lg font-bold text-gray-900 mb-4'
    }, 'Recent Publications');

    const list = this.createElement('div', {
      className: 'space-y-3',
      'data-recent-papers': 'true'
    });

    card.appendChild(title);
    card.appendChild(list);

    return card;
  }

  renderPapersList(container) {
    container.innerHTML = '';

    const papersToShow = this.getPapersToShow();

    if (papersToShow.length === 0) {
      container.appendChild(this.createEmptyState());
      return;
    }

    papersToShow.forEach(paper => {
      container.appendChild(this.createPaperCard(paper));
    });

    // Update pagination if needed
    if (this.shouldShowPagination()) {
      container.appendChild(this.createPagination());
    }
  }

  createPaperCard(paper) {
    const card = this.createElement('div', {
      className: 'bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 cursor-pointer group',
      'data-paper-id': paper.id
    });

    // Header with title and status
    const header = this.createElement('div', {
      className: 'flex items-start justify-between gap-4 mb-4'
    });

    const titleSection = this.createElement('div', {
      className: 'flex-1 min-w-0'
    });

    const title = this.createElement('h3', {
      className: 'text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2'
    }, paper.title);

    // Authors
    if (paper.authors && paper.authors.length > 0) {
      const authors = this.createElement('p', {
        className: 'text-sm text-gray-600 mb-2'
      }, `By ${paper.authors.join(', ')}`);
      titleSection.appendChild(authors);
    }

    titleSection.appendChild(title);

    // Status and year
    const statusSection = this.createElement('div', {
      className: 'flex flex-col items-end gap-2'
    });

    if (paper.status) {
      const statusBadge = this.createElement('span', {
        className: `px-3 py-1 text-xs font-medium rounded-full ${this.getStatusClasses(paper.status)}`
      }, this.formatStatus(paper.status));
      statusSection.appendChild(statusBadge);
    }

    const year = this.createElement('span', {
      className: 'text-sm text-gray-500'
    }, paper.year);
    statusSection.appendChild(year);

    header.appendChild(titleSection);
    header.appendChild(statusSection);

    // Publication info
    const pubInfo = this.createElement('div', {
      className: 'mb-4 p-3 bg-gray-50 rounded-lg'
    });

    const pubDetails = [];
    if (paper.journal) pubDetails.push(paper.journal);
    if (paper.conference) pubDetails.push(paper.conference);
    if (paper.volume) pubDetails.push(`Vol. ${paper.volume}`);
    if (paper.pages) pubDetails.push(`pp. ${paper.pages}`);

    const pubText = this.createElement('p', {
      className: 'text-sm text-gray-700 font-medium'
    }, pubDetails.join(' • '));

    pubInfo.appendChild(pubText);

    // Abstract
    if (paper.abstract) {
      const abstract = this.createElement('p', {
        className: 'text-gray-700 mb-4 line-clamp-3'
      }, paper.abstract);
      card.appendChild(abstract);
    }

    // Tags
    if (paper.tags && paper.tags.length > 0) {
      const tagsContainer = this.createElement('div', {
        className: 'flex flex-wrap gap-2 mb-4'
      });

      paper.tags.slice(0, 5).forEach(tag => {
        const tagBadge = this.createElement('span', {
          className: 'px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full'
        }, tag);
        tagsContainer.appendChild(tagBadge);
      });

      if (paper.tags.length > 5) {
        const moreBadge = this.createElement('span', {
          className: 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full'
        }, `+${paper.tags.length - 5} more`);
        tagsContainer.appendChild(moreBadge);
      }

      card.appendChild(tagsContainer);
    }

    // Footer with metrics and actions
    const footer = this.createElement('div', {
      className: 'flex items-center justify-between pt-4 border-t border-gray-200'
    });

    // Metrics
    const metrics = this.createElement('div', {
      className: 'flex items-center gap-4 text-sm text-gray-600'
    });

    if (paper.citations !== undefined) {
      const citations = this.createElement('div', {
        className: 'flex items-center gap-1'
      });
      citations.innerHTML = `
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>${paper.citations} citations</span>
      `;
      metrics.appendChild(citations);
    }

    if (paper.doi) {
      const doi = this.createElement('div', {
        className: 'flex items-center gap-1'
      });
      doi.innerHTML = `
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"></path>
        </svg>
        <span>DOI</span>
      `;
      metrics.appendChild(doi);
    }

    // Actions
    const actions = this.createElement('div', {
      className: 'flex items-center gap-2'
    });

    if (paper.pdf) {
      const pdfButton = this.createElement('a', {
        href: paper.pdf,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors',
        'aria-label': 'Download PDF'
      });
      pdfButton.innerHTML = `
        <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
        PDF
      `;
      actions.appendChild(pdfButton);
    }

    const viewButton = this.createElement('button', {
      className: 'inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors',
      'data-action': 'view-details'
    });
    viewButton.innerHTML = `
      <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
      </svg>
      Details
    `;
    actions.appendChild(viewButton);

    footer.appendChild(metrics);
    footer.appendChild(actions);

    card.appendChild(header);
    card.appendChild(pubInfo);
    card.appendChild(footer);

    // Bind events
    this.addEventListener(card, 'click', (e) => {
      if (!e.target.closest('a, button')) {
        this.openPaperModal(paper);
      }
    });

    this.addEventListener(viewButton, 'click', (e) => {
      e.stopPropagation();
      this.openPaperModal(paper);
    });

    // Keyboard navigation
    card.setAttribute('tabindex', '0');
    this.addEventListener(card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openPaperModal(paper);
      }
    });

    return card;
  }

  createEmptyState() {
    const emptyState = this.createElement('div', {
      className: 'text-center py-12'
    });

    emptyState.innerHTML = `
      <div class="mx-auto w-16 h-16 mb-4 text-gray-400">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No papers found</h3>
      <p class="text-gray-600 mb-4">Try adjusting your search terms or filters.</p>
      <button class="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-action="clear-filters">
        Clear All Filters
      </button>
    `;

    const clearButton = emptyState.querySelector('[data-action="clear-filters"]');
    this.addEventListener(clearButton, 'click', this.clearAllFilters.bind(this));

    return emptyState;
  }

  createPagination() {
    const totalPages = Math.ceil(this.filteredPapers.length / this.options.itemsPerPage);
    if (totalPages <= 1) return null;

    const pagination = this.createElement('div', {
      className: 'flex items-center justify-center gap-2 mt-8'
    });

    // Previous button
    const prevButton = this.createElement('button', {
      className: `px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
        this.currentPage <= 1
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`,
      disabled: this.currentPage <= 1
    }, 'Previous');

    if (this.currentPage > 1) {
      this.addEventListener(prevButton, 'click', () => {
        this.currentPage--;
        this.render();
      });
    }

    // Page numbers
    const startPage = Math.max(1, this.currentPage - 2);
    const endPage = Math.min(totalPages, this.currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      const pageButton = this.createElement('button', {
        className: `px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
          i === this.currentPage
            ? 'bg-primary-600 text-white border-primary-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`
      }, i.toString());

      if (i !== this.currentPage) {
        this.addEventListener(pageButton, 'click', () => {
          this.currentPage = i;
          this.render();
        });
      }

      pagination.appendChild(pageButton);
    }

    // Next button
    const nextButton = this.createElement('button', {
      className: `px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
        this.currentPage >= totalPages
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`,
      disabled: this.currentPage >= totalPages
    }, 'Next');

    if (this.currentPage < totalPages) {
      this.addEventListener(nextButton, 'click', () => {
        this.currentPage++;
        this.render();
      });
    }

    pagination.insertBefore(prevButton, pagination.firstChild);
    pagination.appendChild(nextButton);

    return pagination;
  }

  // Event Handlers
  handlePapersUpdate(papers) {
    this.papers = papers || [];
    this.updateStatistics();
    this.updateKeywordsCloud();
    this.updateRecentPapers();
    this.applyFiltersAndSort();
  }

  handleSearchUpdate(searchData) {
    if (searchData?.query !== undefined) {
      this.searchTerm = searchData.query;
      const searchInput = this.$('[data-search-input]');
      if (searchInput && searchInput.value !== this.searchTerm) {
        searchInput.value = this.searchTerm;
      }
      this.applyFiltersAndSort();
    }
  }

  handleSearchInput(e) {
    this.searchTerm = e.target.value;
    this.currentPage = 1;
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applyFiltersAndSort();
    }, 300);
  }

  handleFilterChange(filterType, value) {
    if (value) {
      this.activeFilters[filterType] = value;
    } else {
      delete this.activeFilters[filterType];
    }
    
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  handleSortChange(e) {
    const [sortBy, sortOrder] = e.target.value.split('-');
    this.options.sortBy = sortBy;
    this.options.sortOrder = sortOrder;
    this.applyFiltersAndSort();
  }

  // Core Methods
  applyFiltersAndSort() {
    let filtered = [...this.papers];

    // Apply search term
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(paper =>
        paper.title.toLowerCase().includes(searchLower) ||
        (paper.abstract && paper.abstract.toLowerCase().includes(searchLower)) ||
        (paper.authors && paper.authors.some(author => 
          author.toLowerCase().includes(searchLower)
        )) ||
        (paper.tags && paper.tags.some(tag => 
          tag.toLowerCase().includes(searchLower)
        ))
      );
    }

    // Apply filters
    Object.entries(this.activeFilters).forEach(([filterType, value]) => {
      if (!value) return;
      
      switch (filterType) {
        case 'year':
          filtered = filtered.filter(paper => paper.year.toString() === value);
          break;
        case 'category':
          filtered = filtered.filter(paper => paper.category === value);
          break;
        case 'status':
          filtered = filtered.filter(paper => paper.status === value);
          break;
      }
    });

    // Apply sorting
    this.sortPapers(filtered);
    
    this.filteredPapers = filtered;
    this.render();
  }

  sortPapers(papers) {
    papers.sort((a, b) => {
      let aValue, bValue;
      
      switch (this.options.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'year':
          aValue = a.year;
          bValue = b.year;
          break;
        case 'citations':
          aValue = a.citations || 0;
          bValue = b.citations || 0;
          break;
        case 'featured':
          aValue = a.featured ? 1 : 0;
          bValue = b.featured ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return this.options.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.options.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  clearAllFilters() {
    this.activeFilters = {};
    this.searchTerm = '';
    
    // Reset filter controls
    this.$$('[data-filter]').forEach(select => {
      select.selectedIndex = 0;
    });
    
    const searchInput = this.$('[data-search-input]');
    if (searchInput) {
      searchInput.value = '';
    }
    
    this.applyFiltersAndSort();
  }

  updateStatistics() {
    const totalPapers = this.papers.length;
    const totalCitations = this.papers.reduce((sum, paper) => sum + (paper.citations || 0), 0);
    const currentYear = new Date().getFullYear();
    const thisYearPapers = this.papers.filter(paper => paper.year === currentYear).length;
    const hIndex = this.calculateHIndex();

    // Update metrics in the UI
    const totalMetric = this.$('[data-metric="total"]');
    if (totalMetric) totalMetric.textContent = totalPapers;

    const citationsMetric = this.$('[data-metric="citations"]');
    if (citationsMetric) citationsMetric.textContent = totalCitations;

    const thisYearMetric = this.$('[data-metric="thisYear"]');
    if (thisYearMetric) thisYearMetric.textContent = thisYearPapers;

    const hIndexMetric = this.$('[data-metric="hindex"]');
    if (hIndexMetric) hIndexMetric.textContent = hIndex;

    // Update header stats
    const papersCount = this.$('[data-papers-count]');
    if (papersCount) papersCount.textContent = `${totalPapers} paper${totalPapers !== 1 ? 's' : ''}`;

    const citationsCount = this.$('[data-citations-count]');
    if (citationsCount) citationsCount.textContent = `${totalCitations} citation${totalCitations !== 1 ? 's' : ''}`;
  }

  calculateHIndex() {
    const citations = this.papers
      .map(paper => paper.citations || 0)
      .sort((a, b) => b - a);
    
    let hIndex = 0;
    for (let i = 0; i < citations.length; i++) {
      if (citations[i] >= i + 1) {
        hIndex = i + 1;
      } else {
        break;
      }
    }
    
    return hIndex;
  }

  updateKeywordsCloud() {
    const cloud = this.$('[data-keywords-cloud]');
    if (!cloud) return;

    // Collect all tags/keywords
    const keywordCounts = new Map();
    this.papers.forEach(paper => {
      if (paper.tags) {
        paper.tags.forEach(tag => {
          keywordCounts.set(tag, (keywordCounts.get(tag) || 0) + 1);
        });
      }
    });

    // Sort by frequency and take top keywords
    const topKeywords = Array.from(keywordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    cloud.innerHTML = '';
    
    topKeywords.forEach(([keyword, count]) => {
      const size = Math.min(Math.max(count / 3, 1), 3); // Scale size based on frequency
      const sizeClass = size > 2 ? 'text-lg' : size > 1 ? 'text-base' : 'text-sm';
      
      const keywordBadge = this.createElement('button', {
        className: `px-3 py-1 ${sizeClass} font-medium bg-gray-100 hover:bg-primary-100 hover:text-primary-800 text-gray-700 rounded-full transition-colors cursor-pointer`,
        title: `${count} paper${count !== 1 ? 's' : ''}`
      }, keyword);

      this.addEventListener(keywordBadge, 'click', () => {
        this.searchTerm = keyword;
        const searchInput = this.$('[data-search-input]');
        if (searchInput) searchInput.value = keyword;
        this.applyFiltersAndSort();
      });

      cloud.appendChild(keywordBadge);
    });
  }

  updateRecentPapers() {
    const list = this.$('[data-recent-papers]');
    if (!list) return;

    const recentPapers = [...this.papers]
      .sort((a, b) => b.year - a.year)
      .slice(0, 5);

    list.innerHTML = '';

    recentPapers.forEach(paper => {
      const item = this.createElement('div', {
        className: 'p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors'
      });

      item.innerHTML = `
        <h4 class="text-sm font-medium text-gray-900 mb-1 line-clamp-2">${paper.title}</h4>
        <p class="text-xs text-gray-600">${paper.year} • ${paper.citations || 0} citations</p>
      `;

      this.addEventListener(item, 'click', () => {
        this.openPaperModal(paper);
      });

      list.appendChild(item);
    });
  }

  openPaperModal(paper) {
    // Emit event for modal system to handle
    this.element.dispatchEvent(new CustomEvent('paper:open', {
      detail: { paper },
      bubbles: true
    }));
  }

  // Utility Methods
  getPapersToShow() {
    const startIndex = (this.currentPage - 1) * this.options.itemsPerPage;
    const endIndex = startIndex + this.options.itemsPerPage;
    return this.filteredPapers.slice(startIndex, endIndex);
  }

  shouldShowPagination() {
    return this.filteredPapers.length > this.options.itemsPerPage;
  }

  getYearOptions() {
    const years = new Set(this.papers.map(paper => paper.year));
    return Array.from(years).sort((a, b) => b - a);
  }

  getStatusClasses(status) {
    const classes = {
      'published': 'bg-green-100 text-green-800',
      'under-review': 'bg-yellow-100 text-yellow-800',
      'in-preparation': 'bg-blue-100 text-blue-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatStatus(status) {
    const formats = {
      'published': 'Published',
      'under-review': 'Under Review',
      'in-preparation': 'In Preparation'
    };
    return formats[status] || status;
  }

  destroy() {
    clearTimeout(this.searchTimeout);
    
    if (this.unsubscribers) {
      this.unsubscribers.forEach(unsubscribe => unsubscribe());
    }
    
    super.destroy();
  }
}

export default PapersExplorer;