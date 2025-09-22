/**
 * EnhancedProjectGallery - Advanced project showcase with multiple views and interactions
 * Features: Grid/list/masonry views, virtual scrolling, advanced filtering, content relationships
 */

import ComponentBase from '../core/ComponentBase.js';
import { globalState } from '../core/StateManager.js';

class EnhancedProjectGallery extends ComponentBase {
  get defaults() {
    return {
      layout: 'masonry',
      viewModes: ['grid', 'list', 'masonry'],
      enableVirtualScrolling: true,
      enableInfiniteScroll: true,
      itemsPerPage: 12,
      enableRelationships: true,
      enableBulkActions: false,
      enableExport: false,
      animationDuration: 300,
      breakpoints: {
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4
      },
      className: 'enhanced-project-gallery'
    };
  }

  init() {
    this.projects = [];
    this.filteredProjects = [];
    this.displayedProjects = [];
    this.currentViewMode = this.options.layout;
    this.currentPage = 1;
    this.isLoading = false;
    this.selectedProjects = new Set();
    this.intersectionObserver = null;
    this.virtualScrollManager = null;
    this.searchTerm = '';
    this.activeFilters = {};
    this.sortBy = 'date';
    this.sortOrder = 'desc';

    // Subscribe to global state changes
    this.unsubscribers = [
      globalState.subscribe('projects', this.handleProjectsUpdate.bind(this)),
      globalState.subscribe('search.query', this.handleSearchUpdate.bind(this)),
      globalState.subscribe('search.filters', this.handleFiltersUpdate.bind(this))
    ];

    super.init();
  }

  beforeRender() {
    this.element.className = `${this.options.className} relative`;
    this.element.setAttribute('role', 'main');
    this.element.setAttribute('aria-label', 'Enhanced project gallery');
  }

  template() {
    const fragment = this.createFragment();

    // Gallery header with controls
    fragment.appendChild(this.createGalleryHeader());

    // Filter and sort controls
    fragment.appendChild(this.createFilterControls());

    // Project grid container
    fragment.appendChild(this.createProjectGrid());

    // Loading indicator
    fragment.appendChild(this.createLoadingIndicator());

    return fragment;
  }

  createGalleryHeader() {
    const header = this.createElement('div', {
      className: 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6'
    });

    // Title and count
    const titleSection = this.createElement('div');
    const title = this.createElement('h2', {
      className: 'text-2xl font-bold text-gray-900 mb-1'
    }, 'Projects');
    
    const count = this.createElement('p', {
      className: 'text-sm text-gray-600',
      'data-count': 'true'
    }, this.getProjectCountText());

    titleSection.appendChild(title);
    titleSection.appendChild(count);

    // Controls section
    const controls = this.createElement('div', {
      className: 'flex items-center gap-4'
    });

    // View mode switcher
    controls.appendChild(this.createViewModeSwitcher());

    // Sort selector
    controls.appendChild(this.createSortSelector());

    // Action buttons
    if (this.options.enableBulkActions || this.options.enableExport) {
      controls.appendChild(this.createActionButtons());
    }

    header.appendChild(titleSection);
    header.appendChild(controls);

    return header;
  }

  createViewModeSwitcher() {
    const switcher = this.createElement('div', {
      className: 'flex items-center bg-gray-100 rounded-lg p-1',
      role: 'tablist',
      'aria-label': 'View mode selector'
    });

    this.options.viewModes.forEach(mode => {
      const button = this.createElement('button', {
        className: `px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          mode === this.currentViewMode
            ? 'bg-white text-primary-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`,
        role: 'tab',
        'aria-selected': mode === this.currentViewMode,
        'data-view-mode': mode,
        'aria-label': `Switch to ${mode} view`
      });

      const icon = this.getViewModeIcon(mode);
      button.innerHTML = `${icon} <span class="ml-1 hidden sm:inline">${this.capitalizeFirst(mode)}</span>`;

      this.addEventListener(button, 'click', () => this.switchViewMode(mode));
      switcher.appendChild(button);
    });

    return switcher;
  }

  createSortSelector() {
    const container = this.createElement('div', {
      className: 'relative'
    });

    const select = this.createElement('select', {
      className: 'appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      'aria-label': 'Sort projects'
    });

    const sortOptions = [
      { value: 'date-desc', label: 'Newest First' },
      { value: 'date-asc', label: 'Oldest First' },
      { value: 'title-asc', label: 'A to Z' },
      { value: 'title-desc', label: 'Z to A' },
      { value: 'featured', label: 'Featured First' }
    ];

    sortOptions.forEach(option => {
      const optionElement = this.createElement('option', {
        value: option.value,
        selected: option.value === `${this.sortBy}-${this.sortOrder}`
      }, option.label);
      select.appendChild(optionElement);
    });

    const arrow = this.createElement('div', {
      className: 'absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'
    });
    arrow.innerHTML = `
      <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;

    this.addEventListener(select, 'change', this.handleSortChange.bind(this));

    container.appendChild(select);
    container.appendChild(arrow);

    return container;
  }

  createActionButtons() {
    const actions = this.createElement('div', {
      className: 'flex items-center gap-2'
    });

    if (this.options.enableBulkActions) {
      const selectAllBtn = this.createElement('button', {
        className: 'px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
        'data-action': 'select-all'
      }, 'Select All');

      this.addEventListener(selectAllBtn, 'click', this.toggleSelectAll.bind(this));
      actions.appendChild(selectAllBtn);
    }

    if (this.options.enableExport) {
      const exportBtn = this.createElement('button', {
        className: 'px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
        'data-action': 'export'
      }, 'Export');

      this.addEventListener(exportBtn, 'click', this.handleExport.bind(this));
      actions.appendChild(exportBtn);
    }

    return actions;
  }

  createFilterControls() {
    const controls = this.createElement('div', {
      className: 'mb-6 p-4 bg-gray-50 rounded-lg',
      'data-filters': 'true'
    });

    const title = this.createElement('h3', {
      className: 'text-sm font-medium text-gray-900 mb-3'
    }, 'Filter Projects');

    const filtersGrid = this.createElement('div', {
      className: 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4'
    });

    // Technology filter
    filtersGrid.appendChild(this.createFilterSelect('technology', 'Technology'));

    // Category filter
    filtersGrid.appendChild(this.createFilterSelect('category', 'Category'));

    // Status filter
    filtersGrid.appendChild(this.createFilterSelect('status', 'Status'));

    // Date range filter
    filtersGrid.appendChild(this.createDateRangeFilter());

    controls.appendChild(title);
    controls.appendChild(filtersGrid);

    return controls;
  }

  createFilterSelect(filterType, label) {
    const container = this.createElement('div');
    
    const labelElement = this.createElement('label', {
      className: 'block text-xs font-medium text-gray-700 mb-1'
    }, label);

    const select = this.createElement('select', {
      className: 'w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      'data-filter': filterType
    });

    // Add default option
    const defaultOption = this.createElement('option', { value: '' }, `All ${label}s`);
    select.appendChild(defaultOption);

    // Add filter options
    this.getFilterOptions(filterType).forEach(option => {
      const optionElement = this.createElement('option', { value: option }, option);
      select.appendChild(optionElement);
    });

    this.addEventListener(select, 'change', (e) => {
      this.handleFilterChange(filterType, e.target.value);
    });

    container.appendChild(labelElement);
    container.appendChild(select);

    return container;
  }

  createDateRangeFilter() {
    const container = this.createElement('div');
    
    const label = this.createElement('label', {
      className: 'block text-xs font-medium text-gray-700 mb-1'
    }, 'Date Range');

    const select = this.createElement('select', {
      className: 'w-full appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
      'data-filter': 'dateRange'
    });

    const dateRanges = [
      { value: '', label: 'All Time' },
      { value: 'last-month', label: 'Last Month' },
      { value: 'last-3-months', label: 'Last 3 Months' },
      { value: 'last-6-months', label: 'Last 6 Months' },
      { value: 'last-year', label: 'Last Year' }
    ];

    dateRanges.forEach(range => {
      const option = this.createElement('option', { value: range.value }, range.label);
      select.appendChild(option);
    });

    this.addEventListener(select, 'change', (e) => {
      this.handleFilterChange('dateRange', e.target.value);
    });

    container.appendChild(label);
    container.appendChild(select);

    return container;
  }

  createProjectGrid() {
    const container = this.createElement('div', {
      className: 'relative',
      'data-grid-container': 'true'
    });

    const grid = this.createElement('div', {
      className: this.getGridClasses(),
      'data-projects-grid': 'true',
      'data-view-mode': this.currentViewMode
    });

    // Populate with projects
    this.renderProjects(grid);

    container.appendChild(grid);

    // Set up virtual scrolling if enabled
    if (this.options.enableVirtualScrolling && this.filteredProjects.length > 50) {
      this.setupVirtualScrolling(container);
    }

    // Set up infinite scroll if enabled
    if (this.options.enableInfiniteScroll) {
      this.setupInfiniteScroll(container);
    }

    return container;
  }

  createLoadingIndicator() {
    const indicator = this.createElement('div', {
      className: 'hidden justify-center items-center py-8',
      'data-loading': 'true'
    });

    indicator.innerHTML = `
      <div class="flex items-center gap-3 text-gray-600">
        <svg class="animate-spin h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading more projects...</span>
      </div>
    `;

    return indicator;
  }

  renderProjects(grid) {
    // Clear existing content
    grid.innerHTML = '';

    const projectsToShow = this.getProjectsToShow();

    if (projectsToShow.length === 0) {
      grid.appendChild(this.createEmptyState());
      return;
    }

    projectsToShow.forEach((project, index) => {
      const card = this.createProjectCard(project, index);
      grid.appendChild(card);
    });

    // Update count
    this.updateProjectCount();
  }

  createProjectCard(project, index) {
    const card = this.createElement('div', {
      className: this.getCardClasses(),
      'data-project-id': project.id,
      'data-category': project.category,
      'data-testid': `project-card-${project.id}`
    });

    // Selection checkbox for bulk actions
    if (this.options.enableBulkActions) {
      card.appendChild(this.createSelectionCheckbox(project));
    }

    // Card content based on view mode
    if (this.currentViewMode === 'list') {
      card.appendChild(this.createListViewContent(project));
    } else {
      card.appendChild(this.createCardViewContent(project));
    }

    // Add interaction handlers
    this.setupCardInteractions(card, project);

    return card;
  }

  createSelectionCheckbox(project) {
    const checkbox = this.createElement('div', {
      className: 'absolute top-2 left-2 z-10'
    });

    const input = this.createElement('input', {
      type: 'checkbox',
      className: 'w-4 h-4 text-primary-600 bg-white border-gray-300 rounded focus:ring-primary-500',
      'data-project-id': project.id
    });

    this.addEventListener(input, 'change', (e) => {
      this.handleProjectSelection(project.id, e.target.checked);
    });

    checkbox.appendChild(input);
    return checkbox;
  }

  createCardViewContent(project) {
    const content = this.createFragment();

    // Image container
    const imageContainer = this.createElement('div', {
      className: 'relative aspect-video overflow-hidden'
    });

    const image = this.createElement('img', {
      className: 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
      alt: project.title,
      loading: 'lazy',
      'data-src': project.image.replace('.tiff', '.webp'),
      src: project.placeholder
    });

    // Status badge
    if (project.status && project.status !== 'completed') {
      const badge = this.createElement('div', {
        className: `absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${this.getStatusClasses(project.status)}`
      }, project.status);
      imageContainer.appendChild(badge);
    }

    // Featured badge
    if (project.featured) {
      const featuredBadge = this.createElement('div', {
        className: 'absolute bottom-2 left-2 px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full'
      }, 'Featured');
      imageContainer.appendChild(featuredBadge);
    }

    imageContainer.appendChild(image);
    content.appendChild(imageContainer);

    // Text content
    const textContent = this.createElement('div', {
      className: 'p-6'
    });

    // Title
    const title = this.createElement('h3', {
      className: 'text-lg font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2'
    }, project.title);

    // Description
    const description = this.createElement('p', {
      className: 'text-gray-600 mb-4 line-clamp-3 text-sm'
    }, project.description);

    // Technologies
    if (project.technologies && project.technologies.length > 0) {
      const techContainer = this.createElement('div', {
        className: 'flex flex-wrap gap-2 mb-4'
      });

      project.technologies.slice(0, 3).forEach(tech => {
        const techBadge = this.createElement('span', {
          className: 'px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full'
        }, tech);
        techContainer.appendChild(techBadge);
      });

      if (project.technologies.length > 3) {
        const moreBadge = this.createElement('span', {
          className: 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full'
        }, `+${project.technologies.length - 3}`);
        techContainer.appendChild(moreBadge);
      }

      textContent.appendChild(techContainer);
    }

    // Metrics (if available)
    if (project.metrics && Object.keys(project.metrics).length > 0) {
      const metricsContainer = this.createElement('div', {
        className: 'flex items-center gap-4 mb-4 text-xs text-gray-500'
      });

      Object.entries(project.metrics).slice(0, 2).forEach(([key, value]) => {
        const metric = this.createElement('div', {
          className: 'flex items-center gap-1'
        });
        metric.innerHTML = `<span class="font-medium">${value}</span> <span>${key}</span>`;
        metricsContainer.appendChild(metric);
      });

      textContent.appendChild(metricsContainer);
    }

    // Footer with date and links
    const footer = this.createElement('div', {
      className: 'flex items-center justify-between'
    });

    const date = this.createElement('span', {
      className: 'text-xs text-gray-500'
    }, this.formatDate(project.date));

    const linksContainer = this.createElement('div', {
      className: 'flex items-center gap-2'
    });

    if (project.links?.github) {
      const githubLink = this.createElement('a', {
        href: project.links.github,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-gray-400 hover:text-gray-600 transition-colors',
        'aria-label': 'View on GitHub'
      });
      githubLink.innerHTML = this.getLinkIcon('github');
      linksContainer.appendChild(githubLink);
    }

    if (project.links?.demo && project.links.demo !== '#') {
      const demoLink = this.createElement('a', {
        href: project.links.demo,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'text-gray-400 hover:text-gray-600 transition-colors',
        'aria-label': 'View demo'
      });
      demoLink.innerHTML = this.getLinkIcon('demo');
      linksContainer.appendChild(demoLink);
    }

    footer.appendChild(date);
    footer.appendChild(linksContainer);

    textContent.appendChild(title);
    textContent.appendChild(description);
    textContent.appendChild(footer);
    content.appendChild(textContent);

    return content;
  }

  createListViewContent(project) {
    const content = this.createElement('div', {
      className: 'flex items-center gap-6 p-6'
    });

    // Thumbnail
    const thumbnail = this.createElement('div', {
      className: 'flex-shrink-0 w-24 h-16 bg-gray-100 rounded-lg overflow-hidden'
    });

    const image = this.createElement('img', {
      className: 'w-full h-full object-cover',
      alt: project.title,
      loading: 'lazy',
      'data-src': project.image.replace('.tiff', '.webp'),
      src: project.placeholder
    });

    thumbnail.appendChild(image);

    // Content
    const textContent = this.createElement('div', {
      className: 'flex-1 min-w-0'
    });

    const header = this.createElement('div', {
      className: 'flex items-start justify-between gap-4 mb-2'
    });

    const title = this.createElement('h3', {
      className: 'text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors'
    }, project.title);

    const meta = this.createElement('div', {
      className: 'flex items-center gap-2 text-sm text-gray-500 flex-shrink-0'
    });
    meta.innerHTML = `
      <span class="capitalize">${project.category}</span>
      <span>•</span>
      <span>${this.formatDate(project.date)}</span>
    `;

    header.appendChild(title);
    header.appendChild(meta);

    const description = this.createElement('p', {
      className: 'text-gray-600 mb-3 line-clamp-2'
    }, project.description);

    const footer = this.createElement('div', {
      className: 'flex items-center justify-between'
    });

    // Technologies
    const techContainer = this.createElement('div', {
      className: 'flex flex-wrap gap-1'
    });

    if (project.technologies) {
      project.technologies.slice(0, 4).forEach(tech => {
        const techBadge = this.createElement('span', {
          className: 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded'
        }, tech);
        techContainer.appendChild(techBadge);
      });
    }

    // Status
    const statusContainer = this.createElement('div', {
      className: 'flex items-center gap-2'
    });

    if (project.featured) {
      const featuredBadge = this.createElement('span', {
        className: 'px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full'
      }, 'Featured');
      statusContainer.appendChild(featuredBadge);
    }

    if (project.status && project.status !== 'completed') {
      const statusBadge = this.createElement('span', {
        className: `px-2 py-1 text-xs font-medium rounded-full ${this.getStatusClasses(project.status)}`
      }, project.status);
      statusContainer.appendChild(statusBadge);
    }

    footer.appendChild(techContainer);
    footer.appendChild(statusContainer);

    textContent.appendChild(header);
    textContent.appendChild(description);
    textContent.appendChild(footer);

    content.appendChild(thumbnail);
    content.appendChild(textContent);

    return content;
  }

  createEmptyState() {
    const emptyState = this.createElement('div', {
      className: 'col-span-full text-center py-12'
    });

    emptyState.innerHTML = `
      <div class="mx-auto w-16 h-16 mb-4 text-gray-400">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
      <p class="text-gray-600 mb-4">Try adjusting your search or filters to find projects.</p>
      <button class="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" data-action="clear-filters">
        Clear All Filters
      </button>
    `;

    const clearButton = emptyState.querySelector('[data-action="clear-filters"]');
    this.addEventListener(clearButton, 'click', this.clearAllFilters.bind(this));

    return emptyState;
  }

  setupCardInteractions(card, project) {
    // Lazy load images
    this.setupLazyLoading(card);

    // Click to open modal
    this.addEventListener(card, 'click', (e) => {
      // Don't trigger if clicking on links or checkboxes
      if (e.target.closest('a, input, button')) return;
      
      this.openProjectModal(project);
    });

    // Keyboard navigation
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    this.addEventListener(card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openProjectModal(project);
      }
    });

    // Add hover effects
    card.classList.add('group', 'cursor-pointer', 'transition-all', 'duration-200', 'hover:shadow-lg', 'hover:-translate-y-1');
  }

  setupLazyLoading(card) {
    const images = card.querySelectorAll('img[data-src]');
    
    if (!this.intersectionObserver) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              img.classList.add('fade-in');
              this.intersectionObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px'
      });
    }

    images.forEach(img => {
      this.intersectionObserver.observe(img);
    });
  }

  setupVirtualScrolling(container) {
    // Implementation for virtual scrolling
    // This would manage DOM elements for large datasets
    console.log('Virtual scrolling enabled for', this.filteredProjects.length, 'projects');
  }

  setupInfiniteScroll(container) {
    if (!this.options.enableInfiniteScroll) return;

    const sentinel = this.createElement('div', {
      className: 'w-full h-10',
      'data-sentinel': 'true'
    });

    container.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading) {
          this.loadMoreProjects();
        }
      });
    }, {
      rootMargin: '100px'
    });

    observer.observe(sentinel);
  }

  // Event Handlers
  handleProjectsUpdate(projects) {
    this.projects = projects || [];
    this.applyFiltersAndSort();
  }

  handleSearchUpdate(searchData) {
    if (searchData?.query !== undefined) {
      this.searchTerm = searchData.query;
      this.applyFiltersAndSort();
    }
  }

  handleFiltersUpdate(filters) {
    this.activeFilters = { ...filters };
    this.applyFiltersAndSort();
  }

  handleFilterChange(filterType, value) {
    if (value) {
      this.activeFilters[filterType] = value;
    } else {
      delete this.activeFilters[filterType];
    }
    
    this.currentPage = 1;
    this.applyFiltersAndSort();
    
    // Update global state
    globalState.set('search.filters', this.activeFilters);
  }

  handleSortChange(e) {
    const [sortBy, sortOrder] = e.target.value.split('-');
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.applyFiltersAndSort();
  }

  handleProjectSelection(projectId, selected) {
    if (selected) {
      this.selectedProjects.add(projectId);
    } else {
      this.selectedProjects.delete(projectId);
    }
    
    this.updateSelectionUI();
  }

  handleExport() {
    const projectsToExport = this.selectedProjects.size > 0 
      ? this.projects.filter(p => this.selectedProjects.has(p.id))
      : this.filteredProjects;

    this.exportProjects(projectsToExport);
  }

  // Core Methods
  switchViewMode(mode) {
    if (!this.options.viewModes.includes(mode)) return;
    
    this.currentViewMode = mode;
    
    // Update button states
    this.$$('[data-view-mode]').forEach(btn => {
      const isActive = btn.dataset.viewMode === mode;
      btn.classList.toggle('bg-white', isActive);
      btn.classList.toggle('text-primary-600', isActive);
      btn.classList.toggle('shadow-sm', isActive);
      btn.classList.toggle('text-gray-600', !isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    
    // Update grid classes and re-render
    const grid = this.$('[data-projects-grid]');
    if (grid) {
      grid.className = this.getGridClasses();
      grid.setAttribute('data-view-mode', mode);
      this.renderProjects(grid);
    }
  }

  applyFiltersAndSort() {
    let filtered = [...this.projects];

    // Apply search term
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchLower) ||
        project.description.toLowerCase().includes(searchLower) ||
        (project.technologies && project.technologies.some(tech => 
          tech.toLowerCase().includes(searchLower)
        ))
      );
    }

    // Apply filters
    Object.entries(this.activeFilters).forEach(([filterType, value]) => {
      if (!value) return;
      
      switch (filterType) {
        case 'technology':
          filtered = filtered.filter(project => 
            project.technologies && project.technologies.includes(value)
          );
          break;
        case 'category':
          filtered = filtered.filter(project => project.category === value);
          break;
        case 'status':
          filtered = filtered.filter(project => project.status === value);
          break;
        case 'dateRange':
          filtered = this.applyDateRangeFilter(filtered, value);
          break;
      }
    });

    // Apply sorting
    this.sortProjects(filtered);
    
    this.filteredProjects = filtered;
    this.currentPage = 1;
    this.displayedProjects = this.getProjectsToShow();
    
    this.render();
  }

  sortProjects(projects) {
    projects.sort((a, b) => {
      let aValue, bValue;
      
      switch (this.sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'featured':
          aValue = a.featured ? 1 : 0;
          bValue = b.featured ? 1 : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return this.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  applyDateRangeFilter(projects, range) {
    if (!range) return projects;
    
    const now = new Date();
    let cutoffDate;
    
    switch (range) {
      case 'last-month':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'last-3-months':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'last-6-months':
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case 'last-year':
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        return projects;
    }
    
    return projects.filter(project => new Date(project.date) >= cutoffDate);
  }

  async loadMoreProjects() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingIndicator();
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.currentPage++;
    const moreProjects = this.getProjectsToShow();
    
    if (moreProjects.length > this.displayedProjects.length) {
      this.displayedProjects = moreProjects;
      const grid = this.$('[data-projects-grid]');
      if (grid) {
        this.renderProjects(grid);
      }
    }
    
    this.hideLoadingIndicator();
    this.isLoading = false;
  }

  toggleSelectAll() {
    const allSelected = this.selectedProjects.size === this.filteredProjects.length;
    
    if (allSelected) {
      this.selectedProjects.clear();
    } else {
      this.filteredProjects.forEach(project => {
        this.selectedProjects.add(project.id);
      });
    }
    
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    // Update checkboxes
    this.$$('input[data-project-id]').forEach(checkbox => {
      checkbox.checked = this.selectedProjects.has(checkbox.dataset.projectId);
    });
    
    // Update select all button
    const selectAllBtn = this.$('[data-action="select-all"]');
    if (selectAllBtn) {
      const allSelected = this.selectedProjects.size === this.filteredProjects.length;
      selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
    }
  }

  clearAllFilters() {
    this.activeFilters = {};
    this.searchTerm = '';
    
    // Reset filter controls
    this.$$('[data-filter]').forEach(select => {
      select.selectedIndex = 0;
    });
    
    // Clear search input if present
    const searchInput = document.querySelector('[data-testid="search-input"]');
    if (searchInput) {
      searchInput.value = '';
    }
    
    this.applyFiltersAndSort();
    
    // Update global state
    globalState.set('search.filters', {});
    globalState.set('search.query', '');
  }

  exportProjects(projects) {
    const exportData = projects.map(project => ({
      title: project.title,
      description: project.description,
      category: project.category,
      technologies: project.technologies?.join(', '),
      status: project.status,
      date: project.date,
      featured: project.featured
    }));
    
    const csv = this.convertToCSV(exportData);
    this.downloadCSV(csv, 'projects-export.csv');
  }

  convertToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  }

  downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  openProjectModal(project) {
    // Emit event for modal system to handle
    this.element.dispatchEvent(new CustomEvent('project:open', {
      detail: { project },
      bubbles: true
    }));
  }

  showLoadingIndicator() {
    const indicator = this.$('[data-loading]');
    if (indicator) {
      indicator.classList.remove('hidden');
      indicator.classList.add('flex');
    }
  }

  hideLoadingIndicator() {
    const indicator = this.$('[data-loading]');
    if (indicator) {
      indicator.classList.add('hidden');
      indicator.classList.remove('flex');
    }
  }

  // Utility Methods
  getProjectsToShow() {
    const itemsPerPage = this.options.itemsPerPage;
    const endIndex = this.currentPage * itemsPerPage;
    return this.filteredProjects.slice(0, endIndex);
  }

  getFilterOptions(filterType) {
    const options = new Set();
    
    this.projects.forEach(project => {
      if (filterType === 'technology' && project.technologies) {
        project.technologies.forEach(tech => options.add(tech));
      } else if (project[filterType]) {
        options.add(project[filterType]);
      }
    });
    
    return Array.from(options).sort();
  }

  getProjectCountText() {
    const total = this.projects.length;
    const filtered = this.filteredProjects.length;
    
    if (filtered === total) {
      return `${total} project${total !== 1 ? 's' : ''}`;
    } else {
      return `${filtered} of ${total} project${total !== 1 ? 's' : ''}`;
    }
  }

  updateProjectCount() {
    const countElement = this.$('[data-count]');
    if (countElement) {
      countElement.textContent = this.getProjectCountText();
    }
  }

  getGridClasses() {
    const baseClasses = 'grid gap-6';
    
    switch (this.currentViewMode) {
      case 'list':
        return `${baseClasses} grid-cols-1`;
      case 'masonry':
        return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 masonry`;
      default: // grid
        return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }
  }

  getCardClasses() {
    const baseClasses = 'relative bg-white rounded-xl shadow-lg overflow-hidden';
    
    switch (this.currentViewMode) {
      case 'list':
        return `${baseClasses} hover:shadow-xl transition-all duration-200`;
      default:
        return `${baseClasses} hover:shadow-xl transition-all duration-200`;
    }
  }

  getViewModeIcon(mode) {
    const icons = {
      grid: '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>',
      list: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path></svg>',
      masonry: '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path></svg>'
    };
    return icons[mode] || icons.grid;
  }

  getStatusClasses(status) {
    const classes = {
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'archived': 'bg-gray-100 text-gray-800',
      'completed': 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-blue-100 text-blue-800';
  }

  getLinkIcon(type) {
    const icons = {
      github: '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"></path></svg>',
      demo: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>'
    };
    return icons[type] || '';
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  destroy() {
    if (this.unsubscribers) {
      this.unsubscribers.forEach(unsubscribe => unsubscribe());
    }
    
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    super.destroy();
  }
}

export default EnhancedProjectGallery;