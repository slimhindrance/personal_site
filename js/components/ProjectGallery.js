/**
 * ProjectGallery - Dynamic project showcase component
 * Features: Masonry layout, filtering, search, lazy loading
 */

import ComponentBase from '../core/ComponentBase.js';
import { globalState } from '../core/StateManager.js';

class ProjectGallery extends ComponentBase {
  get defaults() {
    return {
      layout: 'masonry',
      itemsPerPage: 6,
      enableSearch: true,
      enableFilters: true,
      enableInfiniteScroll: false,
      animationDuration: 300,
      breakpoints: {
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4
      },
      filters: {
        technology: [],
        category: [],
        status: []
      },
      className: 'project-gallery'
    };
  }

  init() {
    this.projects = [];
    this.filteredProjects = [];
    this.currentPage = 1;
    this.searchTerm = '';
    this.activeFilters = { ...this.options.filters };
    this.intersectionObserver = null;

    // Subscribe to global state changes
    this.unsubscribeProjects = globalState.subscribe('projects', (projects) => {
      this.projects = projects || [];
      this.applyFiltersAndSearch();
    }, { immediate: true });

    super.init();
  }

  beforeRender() {
    this.element.className = `${this.options.className} relative`;
    this.element.setAttribute('role', 'main');
    this.element.setAttribute('aria-label', 'Project portfolio gallery');
  }

  template() {
    const fragment = this.createFragment();

    // Create header with search and filters
    if (this.options.enableSearch || this.options.enableFilters) {
      fragment.appendChild(this.createHeader());
    }

    // Create project grid
    fragment.appendChild(this.createProjectGrid());

    // Create load more button if needed
    if (this.shouldShowLoadMore()) {
      fragment.appendChild(this.createLoadMoreButton());
    }

    return fragment;
  }

  createHeader() {
    const header = this.createElement('div', {
      className: 'mb-8 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between'
    });

    if (this.options.enableSearch) {
      header.appendChild(this.createSearchBox());
    }

    if (this.options.enableFilters) {
      header.appendChild(this.createFilters());
    }

    return header;
  }

  createSearchBox() {
    const searchContainer = this.createElement('div', {
      className: 'relative max-w-md'
    });

    const searchInput = this.createElement('input', {
      type: 'text',
      placeholder: 'Search projects...',
      className: 'w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
      'aria-label': 'Search projects',
      value: this.searchTerm
    });

    const searchIcon = this.createElement('div', {
      className: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'
    });
    searchIcon.innerHTML = `
      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    `;

    searchContainer.appendChild(searchIcon);
    searchContainer.appendChild(searchInput);

    // Bind search events
    this.addEventListener(searchInput, 'input', this.handleSearch);
    this.addEventListener(searchInput, 'keydown', (e) => {
      if (e.key === 'Escape') {
        e.target.value = '';
        this.handleSearch(e);
      }
    });

    return searchContainer;
  }

  createFilters() {
    const filtersContainer = this.createElement('div', {
      className: 'flex flex-wrap gap-4'
    });

    // Technology filter
    if (this.getAvailableOptions('technology').length > 0) {
      filtersContainer.appendChild(this.createFilterSelect('technology', 'Technology'));
    }

    // Category filter
    if (this.getAvailableOptions('category').length > 0) {
      filtersContainer.appendChild(this.createFilterSelect('category', 'Category'));
    }

    // Status filter
    if (this.getAvailableOptions('status').length > 0) {
      filtersContainer.appendChild(this.createFilterSelect('status', 'Status'));
    }

    // Clear filters button
    const clearButton = this.createElement('button', {
      className: 'px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500',
      'aria-label': 'Clear all filters'
    }, 'Clear Filters');

    this.addEventListener(clearButton, 'click', this.clearFilters);
    filtersContainer.appendChild(clearButton);

    return filtersContainer;
  }

  createFilterSelect(filterType, label) {
    const container = this.createElement('div', {
      className: 'relative'
    });

    const select = this.createElement('select', {
      className: 'appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
      'aria-label': `Filter by ${label}`
    });

    // Add default option
    const defaultOption = this.createElement('option', { value: '' }, `All ${label}s`);
    select.appendChild(defaultOption);

    // Add filter options
    this.getAvailableOptions(filterType).forEach(option => {
      const optionElement = this.createElement('option', { value: option }, option);
      select.appendChild(optionElement);
    });

    // Add dropdown arrow
    const arrow = this.createElement('div', {
      className: 'absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'
    });
    arrow.innerHTML = `
      <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    `;

    container.appendChild(select);
    container.appendChild(arrow);

    this.addEventListener(select, 'change', (e) => {
      this.handleFilterChange(filterType, e.target.value);
    });

    return container;
  }

  createProjectGrid() {
    const grid = this.createElement('div', {
      className: this.getGridClasses(),
      'data-testid': 'projects-grid'
    });

    const projectsToShow = this.getProjectsToShow();

    if (projectsToShow.length === 0) {
      grid.appendChild(this.createEmptyState());
    } else {
      projectsToShow.forEach((project, index) => {
        grid.appendChild(this.createProjectCard(project, index));
      });
    }

    return grid;
  }

  createProjectCard(project, index) {
    const card = this.createElement('div', {
      className: 'project-card bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group',
      'data-project-id': project.id,
      'data-aos': 'fade-up',
      'data-aos-delay': (index % 3) * 100
    });

    // Image container
    const imageContainer = this.createElement('div', {
      className: 'relative aspect-video overflow-hidden'
    });

    const image = this.createElement('img', {
      className: 'w-full h-full object-cover group-hover:scale-105 transition-transform duration-300',
      alt: project.title,
      loading: 'lazy',
      'data-src': project.image,
      src: project.placeholder || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"%3E%3Crect width="400" height="200" fill="%23f3f4f6"/%3E%3C/svg%3E'
    });

    // Set up lazy loading
    this.setupLazyLoading(image);

    imageContainer.appendChild(image);

    // Add status badge if present
    if (project.status && project.status !== 'completed') {
      const badge = this.createElement('div', {
        className: `absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-full ${this.getStatusClasses(project.status)}`
      }, project.status);
      imageContainer.appendChild(badge);
    }

    card.appendChild(imageContainer);

    // Content
    const content = this.createElement('div', {
      className: 'p-6'
    });

    // Title
    const title = this.createElement('h3', {
      className: 'text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors'
    }, project.title);

    // Description
    const description = this.createElement('p', {
      className: 'text-gray-600 mb-4 line-clamp-3'
    }, project.description);

    // Technologies
    if (project.technologies && project.technologies.length > 0) {
      const techContainer = this.createElement('div', {
        className: 'flex flex-wrap gap-2 mb-4'
      });

      project.technologies.slice(0, 4).forEach(tech => {
        const techBadge = this.createElement('span', {
          className: 'px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full'
        }, tech);
        techContainer.appendChild(techBadge);
      });

      if (project.technologies.length > 4) {
        const moreBadge = this.createElement('span', {
          className: 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full'
        }, `+${project.technologies.length - 4} more`);
        techContainer.appendChild(moreBadge);
      }

      content.appendChild(techContainer);
    }

    // Actions
    const actions = this.createElement('div', {
      className: 'flex gap-2'
    });

    if (project.links?.github) {
      const githubBtn = this.createElement('a', {
        href: project.links.github,
        className: 'flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors',
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `View ${project.title} on GitHub`
      }, 'GitHub');
      actions.appendChild(githubBtn);
    }

    if (project.links?.demo) {
      const demoBtn = this.createElement('a', {
        href: project.links.demo,
        className: 'flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors',
        target: '_blank',
        rel: 'noopener noreferrer',
        'aria-label': `View ${project.title} demo`
      }, 'Live Demo');
      actions.appendChild(demoBtn);
    }

    content.appendChild(title);
    content.appendChild(description);
    content.appendChild(actions);
    card.appendChild(content);

    // Add click handler for card
    this.addEventListener(card, 'click', (e) => {
      if (!e.target.closest('a, button')) {
        this.openProjectModal(project);
      }
    });

    // Add keyboard support
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    this.addEventListener(card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.openProjectModal(project);
      }
    });

    return card;
  }

  createEmptyState() {
    const emptyState = this.createElement('div', {
      className: 'col-span-full text-center py-12'
    });

    const icon = this.createElement('div', {
      className: 'mx-auto w-16 h-16 mb-4 text-gray-400'
    });
    icon.innerHTML = `
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
      </svg>
    `;

    const title = this.createElement('h3', {
      className: 'text-lg font-medium text-gray-900 mb-2'
    }, 'No projects found');

    const message = this.createElement('p', {
      className: 'text-gray-600 mb-4'
    }, 'Try adjusting your search or filters to find projects.');

    const clearButton = this.createElement('button', {
      className: 'px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500'
    }, 'Clear Filters');

    this.addEventListener(clearButton, 'click', this.clearFilters);

    emptyState.appendChild(icon);
    emptyState.appendChild(title);
    emptyState.appendChild(message);
    emptyState.appendChild(clearButton);

    return emptyState;
  }

  createLoadMoreButton() {
    const button = this.createElement('div', {
      className: 'text-center mt-8'
    });

    const loadMoreBtn = this.createElement('button', {
      className: 'px-6 py-3 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
      'data-testid': 'load-more-button'
    }, `Load More Projects (${this.getRemainingCount()} remaining)`);

    this.addEventListener(loadMoreBtn, 'click', this.loadMore);

    button.appendChild(loadMoreBtn);
    return button;
  }

  // Event Handlers
  handleSearch = (e) => {
    this.searchTerm = e.target.value.toLowerCase();
    this.currentPage = 1;
    this.applyFiltersAndSearch();
    this.announceToScreenReader(`${this.filteredProjects.length} projects found`);
  };

  handleFilterChange = (filterType, value) => {
    if (value) {
      this.activeFilters[filterType] = [value];
    } else {
      this.activeFilters[filterType] = [];
    }
    this.currentPage = 1;
    this.applyFiltersAndSearch();
    this.announceToScreenReader(`Filter applied. ${this.filteredProjects.length} projects found`);
  };

  clearFilters = () => {
    this.searchTerm = '';
    this.activeFilters = { ...this.options.filters };
    this.currentPage = 1;

    // Reset form elements
    const searchInput = this.$('input[type="text"]');
    if (searchInput) searchInput.value = '';

    this.$$('select').forEach(select => select.selectedIndex = 0);

    this.applyFiltersAndSearch();
    this.announceToScreenReader('All filters cleared');
  };

  loadMore = () => {
    this.currentPage++;
    this.render();
  };

  // Utility Methods
  applyFiltersAndSearch() {
    let filtered = [...this.projects];

    // Apply search
    if (this.searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(this.searchTerm) ||
        project.description.toLowerCase().includes(this.searchTerm) ||
        (project.technologies && project.technologies.some(tech =>
          tech.toLowerCase().includes(this.searchTerm)
        ))
      );
    }

    // Apply filters
    Object.entries(this.activeFilters).forEach(([filterType, values]) => {
      if (values.length > 0) {
        filtered = filtered.filter(project => {
          if (filterType === 'technology') {
            return project.technologies &&
              values.some(value => project.technologies.includes(value));
          }
          return values.includes(project[filterType]);
        });
      }
    });

    this.filteredProjects = filtered;
    this.render();
  }

  getAvailableOptions(filterType) {
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

  getProjectsToShow() {
    const startIndex = 0;
    const endIndex = this.currentPage * this.options.itemsPerPage;
    return this.filteredProjects.slice(startIndex, endIndex);
  }

  shouldShowLoadMore() {
    return !this.options.enableInfiniteScroll &&
      this.filteredProjects.length > this.currentPage * this.options.itemsPerPage;
  }

  getRemainingCount() {
    return this.filteredProjects.length - (this.currentPage * this.options.itemsPerPage);
  }

  getGridClasses() {
    const base = 'grid gap-6';
    const responsive = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3';
    return `${base} ${responsive}`;
  }

  getStatusClasses(status) {
    const classes = {
      'in-progress': 'bg-yellow-100 text-yellow-800',
      'archived': 'bg-gray-100 text-gray-800',
      'featured': 'bg-green-100 text-green-800'
    };
    return classes[status] || 'bg-blue-100 text-blue-800';
  }

  setupLazyLoading(img) {
    if ('IntersectionObserver' in window) {
      if (!this.intersectionObserver) {
        this.intersectionObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                this.intersectionObserver.unobserve(img);
              }
            }
          });
        });
      }
      this.intersectionObserver.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      img.src = img.dataset.src;
    }
  }

  openProjectModal(project) {
    // Emit event for modal component to handle
    this.element.dispatchEvent(new CustomEvent('project:open', {
      detail: { project },
      bubbles: true
    }));
  }

  destroy() {
    if (this.unsubscribeProjects) {
      this.unsubscribeProjects();
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    super.destroy();
  }
}

export default ProjectGallery;