/**
 * ModalSystem - Advanced modal/overlay system with deep linking and accessibility
 * Features: Dynamic content loading, URL state management, keyboard navigation, mobile optimization
 */

import ComponentBase from '../core/ComponentBase.js';
import { globalState } from '../core/StateManager.js';

class ModalSystem extends ComponentBase {
  get defaults() {
    return {
      enableDeepLinking: true,
      enableKeyboardNavigation: true,
      enableMobileOptimization: true,
      closeOnOverlayClick: true,
      closeOnEscape: true,
      animationDuration: 300,
      maxWidth: '4xl',
      className: 'modal-system'
    };
  }

  init() {
    this.activeModal = null;
    this.modalStack = [];
    this.focusStack = [];
    this.scrollPosition = 0;
    this.isAnimating = false;
    
    // Create modal container if it doesn't exist
    this.createModalContainer();
    
    // Set up event listeners
    this.setupGlobalListeners();
    
    // Handle initial URL state
    if (this.options.enableDeepLinking) {
      this.handleInitialUrl();
    }

    super.init();
  }

  createModalContainer() {
    // Remove existing container
    const existing = document.getElementById('modal-container');
    if (existing) {
      existing.remove();
    }

    // Create new container
    this.modalContainer = this.createElement('div', {
      id: 'modal-container',
      className: 'fixed inset-0 z-50 pointer-events-none',
      'aria-hidden': 'true'
    });

    document.body.appendChild(this.modalContainer);
  }

  setupGlobalListeners() {
    // Listen for modal events
    this.addEventListener(document, 'project:open', this.handleProjectOpen.bind(this));
    this.addEventListener(document, 'paper:open', this.handlePaperOpen.bind(this));
    this.addEventListener(document, 'modal:close', this.handleModalClose.bind(this));

    // Keyboard navigation
    if (this.options.enableKeyboardNavigation) {
      this.addEventListener(document, 'keydown', this.handleGlobalKeydown.bind(this));
    }

    // URL state management
    if (this.options.enableDeepLinking) {
      this.addEventListener(window, 'popstate', this.handlePopState.bind(this));
    }

    // Prevent body scroll when modal is open
    this.addEventListener(document, 'modal:opened', this.preventBodyScroll.bind(this));
    this.addEventListener(document, 'modal:closed', this.restoreBodyScroll.bind(this));
  }

  handleProjectOpen(event) {
    const { project } = event.detail;
    this.openProjectModal(project);
  }

  handlePaperOpen(event) {
    const { paper } = event.detail;
    this.openPaperModal(paper);
  }

  handleModalClose(event) {
    this.closeModal();
  }

  handleGlobalKeydown(event) {
    if (!this.activeModal) return;

    switch (event.key) {
      case 'Escape':
        if (this.options.closeOnEscape) {
          event.preventDefault();
          this.closeModal();
        }
        break;

      case 'Tab':
        this.handleTabNavigation(event);
        break;

      case 'ArrowLeft':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.navigateModal('prev');
        }
        break;

      case 'ArrowRight':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          this.navigateModal('next');
        }
        break;
    }
  }

  handleTabNavigation(event) {
    const modal = this.activeModal;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  }

  handlePopState(event) {
    const state = event.state;
    if (state?.modal) {
      this.openModalFromState(state.modal);
    } else {
      this.closeModal();
    }
  }

  handleInitialUrl() {
    const params = new URLSearchParams(window.location.search);
    const modalType = params.get('modal');
    const modalId = params.get('id');

    if (modalType && modalId) {
      this.openModalFromUrl(modalType, modalId);
    }
  }

  async openProjectModal(project) {
    const modalContent = this.createProjectModalContent(project);
    const modalConfig = {
      type: 'project',
      id: project.id,
      title: project.title,
      content: modalContent,
      navigation: this.createProjectNavigation(project)
    };

    await this.openModal(modalConfig);
    
    // Update URL if deep linking is enabled
    if (this.options.enableDeepLinking) {
      this.updateUrl('project', project.id);
    }
  }

  async openPaperModal(paper) {
    const modalContent = this.createPaperModalContent(paper);
    const modalConfig = {
      type: 'paper',
      id: paper.id,
      title: paper.title,
      content: modalContent,
      navigation: this.createPaperNavigation(paper)
    };

    await this.openModal(modalConfig);
    
    // Update URL if deep linking is enabled
    if (this.options.enableDeepLinking) {
      this.updateUrl('paper', paper.id);
    }
  }

  async openModal(config) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    // Store current focus
    this.focusStack.push(document.activeElement);

    // Create modal element
    const modal = this.createModalElement(config);
    
    // Add to stack and container
    this.modalStack.push(modal);
    this.activeModal = modal;
    this.modalContainer.appendChild(modal);

    // Set up modal-specific events
    this.setupModalEvents(modal, config);

    // Animate in
    await this.animateModalIn(modal);
    
    // Focus management
    this.setInitialFocus(modal);
    
    this.isAnimating = false;
    
    // Emit opened event
    document.dispatchEvent(new CustomEvent('modal:opened', {
      detail: { modal, config }
    }));
  }

  async closeModal(force = false) {
    if (this.isAnimating && !force) return;
    if (!this.activeModal) return;

    this.isAnimating = true;
    const modal = this.activeModal;

    // Animate out
    await this.animateModalOut(modal);

    // Remove from DOM and stack
    modal.remove();
    this.modalStack.pop();
    
    // Update active modal
    this.activeModal = this.modalStack[this.modalStack.length - 1] || null;
    
    // Restore focus
    const previousFocus = this.focusStack.pop();
    if (previousFocus && typeof previousFocus.focus === 'function') {
      previousFocus.focus();
    }

    // Update URL
    if (this.options.enableDeepLinking && this.modalStack.length === 0) {
      this.clearUrl();
    }

    this.isAnimating = false;

    // Emit closed event
    document.dispatchEvent(new CustomEvent('modal:closed', {
      detail: { modal }
    }));
  }

  createModalElement(config) {
    const modal = this.createElement('div', {
      className: 'fixed inset-0 pointer-events-auto',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title',
      'data-modal-type': config.type,
      'data-modal-id': config.id
    });

    // Backdrop
    const backdrop = this.createElement('div', {
      className: 'absolute inset-0 bg-black bg-opacity-50 transition-opacity',
      'data-backdrop': 'true'
    });

    // Modal dialog
    const dialog = this.createElement('div', {
      className: `relative flex items-center justify-center min-h-screen p-4 text-center sm:p-0`
    });

    // Modal panel
    const panel = this.createElement('div', {
      className: `relative bg-white rounded-xl shadow-2xl transform transition-all max-w-${this.options.maxWidth} w-full mx-auto my-8 overflow-hidden`,
      'data-panel': 'true'
    });

    // Header
    const header = this.createModalHeader(config);
    
    // Content
    const content = this.createElement('div', {
      className: 'modal-content',
      'data-content': 'true'
    });
    content.appendChild(config.content);

    // Footer (if navigation exists)
    let footer = null;
    if (config.navigation) {
      footer = this.createModalFooter(config.navigation);
    }

    // Assemble modal
    panel.appendChild(header);
    panel.appendChild(content);
    if (footer) panel.appendChild(footer);
    
    dialog.appendChild(panel);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);

    return modal;
  }

  createModalHeader(config) {
    const header = this.createElement('div', {
      className: 'flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50'
    });

    // Title
    const title = this.createElement('h2', {
      id: 'modal-title',
      className: 'text-xl font-bold text-gray-900 pr-4 line-clamp-2'
    }, config.title);

    // Close button
    const closeButton = this.createElement('button', {
      className: 'flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
      'aria-label': 'Close modal',
      'data-action': 'close'
    });
    closeButton.innerHTML = `
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    `;

    header.appendChild(title);
    header.appendChild(closeButton);

    return header;
  }

  createModalFooter(navigation) {
    const footer = this.createElement('div', {
      className: 'flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50'
    });

    footer.appendChild(navigation);
    return footer;
  }

  setupModalEvents(modal, config) {
    // Close button
    const closeButton = modal.querySelector('[data-action="close"]');
    if (closeButton) {
      this.addEventListener(closeButton, 'click', () => this.closeModal());
    }

    // Backdrop click
    if (this.options.closeOnOverlayClick) {
      const backdrop = modal.querySelector('[data-backdrop]');
      if (backdrop) {
        this.addEventListener(backdrop, 'click', () => this.closeModal());
      }
    }

    // Prevent dialog clicks from closing modal
    const panel = modal.querySelector('[data-panel]');
    if (panel) {
      this.addEventListener(panel, 'click', (e) => e.stopPropagation());
    }
  }

  async animateModalIn(modal) {
    const backdrop = modal.querySelector('[data-backdrop]');
    const panel = modal.querySelector('[data-panel]');

    // Set initial states
    backdrop.style.opacity = '0';
    panel.style.opacity = '0';
    panel.style.transform = 'scale(0.95) translateY(-10px)';

    // Force reflow
    modal.offsetHeight;

    // Animate in
    backdrop.style.transition = `opacity ${this.options.animationDuration}ms ease-out`;
    panel.style.transition = `all ${this.options.animationDuration}ms ease-out`;
    
    backdrop.style.opacity = '1';
    panel.style.opacity = '1';
    panel.style.transform = 'scale(1) translateY(0)';

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, this.options.animationDuration));
  }

  async animateModalOut(modal) {
    const backdrop = modal.querySelector('[data-backdrop]');
    const panel = modal.querySelector('[data-panel]');

    // Animate out
    backdrop.style.opacity = '0';
    panel.style.opacity = '0';
    panel.style.transform = 'scale(0.95) translateY(-10px)';

    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, this.options.animationDuration));
  }

  setInitialFocus(modal) {
    // Try to focus the first interactive element
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  createProjectModalContent(project) {
    const content = this.createFragment();

    // Project image
    if (project.image) {
      const imageContainer = this.createElement('div', {
        className: 'relative aspect-video mb-6 bg-gray-100 rounded-lg overflow-hidden'
      });

      const image = this.createElement('img', {
        src: project.image.replace('.tiff', '.webp'),
        alt: project.title,
        className: 'w-full h-full object-cover',
        loading: 'lazy'
      });

      imageContainer.appendChild(image);
      content.appendChild(imageContainer);
    }

    // Project details
    const details = this.createElement('div', {
      className: 'px-6 pb-6'
    });

    // Description
    const description = this.createElement('div', {
      className: 'prose prose-gray max-w-none mb-6'
    });
    description.innerHTML = `<p class="text-gray-700 leading-relaxed">${project.description}</p>`;
    details.appendChild(description);

    // Technologies
    if (project.technologies && project.technologies.length > 0) {
      const techSection = this.createElement('div', {
        className: 'mb-6'
      });

      const techTitle = this.createElement('h3', {
        className: 'text-sm font-medium text-gray-900 mb-3'
      }, 'Technologies Used');

      const techGrid = this.createElement('div', {
        className: 'flex flex-wrap gap-2'
      });

      project.technologies.forEach(tech => {
        const techBadge = this.createElement('span', {
          className: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800'
        }, tech);
        techGrid.appendChild(techBadge);
      });

      techSection.appendChild(techTitle);
      techSection.appendChild(techGrid);
      details.appendChild(techSection);
    }

    // Metrics
    if (project.metrics) {
      const metricsSection = this.createElement('div', {
        className: 'mb-6'
      });

      const metricsTitle = this.createElement('h3', {
        className: 'text-sm font-medium text-gray-900 mb-3'
      }, 'Key Metrics');

      const metricsGrid = this.createElement('div', {
        className: 'grid grid-cols-2 gap-4'
      });

      Object.entries(project.metrics).forEach(([key, value]) => {
        const metric = this.createElement('div', {
          className: 'text-center p-3 bg-gray-50 rounded-lg'
        });

        const metricValue = this.createElement('div', {
          className: 'text-lg font-bold text-primary-600'
        }, value);

        const metricLabel = this.createElement('div', {
          className: 'text-xs text-gray-600 capitalize'
        }, key.replace(/([A-Z])/g, ' $1').trim());

        metric.appendChild(metricValue);
        metric.appendChild(metricLabel);
        metricsGrid.appendChild(metric);
      });

      metricsSection.appendChild(metricsTitle);
      metricsSection.appendChild(metricsGrid);
      details.appendChild(metricsSection);
    }

    // Links
    if (project.links) {
      const linksSection = this.createElement('div', {
        className: 'flex flex-wrap gap-3'
      });

      Object.entries(project.links).forEach(([type, url]) => {
        if (url && url !== '#') {
          const link = this.createElement('a', {
            href: url,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500'
          });

          const icon = this.getLinkIcon(type);
          link.innerHTML = `${icon} ${this.capitalizeFirst(type)}`;
          
          linksSection.appendChild(link);
        }
      });

      if (linksSection.children.length > 0) {
        details.appendChild(linksSection);
      }
    }

    content.appendChild(details);
    return content;
  }

  createPaperModalContent(paper) {
    const content = this.createFragment();

    // Paper details
    const details = this.createElement('div', {
      className: 'px-6 pb-6'
    });

    // Authors
    if (paper.authors && paper.authors.length > 0) {
      const authorsDiv = this.createElement('div', {
        className: 'mb-4'
      });
      
      const authorsText = this.createElement('p', {
        className: 'text-sm text-gray-600'
      }, `By ${paper.authors.join(', ')}`);
      
      authorsDiv.appendChild(authorsText);
      details.appendChild(authorsDiv);
    }

    // Publication info
    const pubInfo = this.createElement('div', {
      className: 'mb-6 p-4 bg-gray-50 rounded-lg'
    });

    const pubDetails = [];
    if (paper.journal) pubDetails.push(paper.journal);
    if (paper.conference) pubDetails.push(paper.conference);
    if (paper.year) pubDetails.push(paper.year);
    if (paper.volume) pubDetails.push(`Vol. ${paper.volume}`);
    if (paper.pages) pubDetails.push(`pp. ${paper.pages}`);

    const pubText = this.createElement('p', {
      className: 'text-sm text-gray-700 font-medium'
    }, pubDetails.join(' • '));

    pubInfo.appendChild(pubText);
    details.appendChild(pubInfo);

    // Abstract
    if (paper.abstract) {
      const abstractSection = this.createElement('div', {
        className: 'mb-6'
      });

      const abstractTitle = this.createElement('h3', {
        className: 'text-sm font-medium text-gray-900 mb-3'
      }, 'Abstract');

      const abstractText = this.createElement('div', {
        className: 'prose prose-gray max-w-none'
      });
      abstractText.innerHTML = `<p class="text-gray-700 leading-relaxed">${paper.abstract}</p>`;

      abstractSection.appendChild(abstractTitle);
      abstractSection.appendChild(abstractText);
      details.appendChild(abstractSection);
    }

    // Tags
    if (paper.tags && paper.tags.length > 0) {
      const tagsSection = this.createElement('div', {
        className: 'mb-6'
      });

      const tagsTitle = this.createElement('h3', {
        className: 'text-sm font-medium text-gray-900 mb-3'
      }, 'Keywords');

      const tagsGrid = this.createElement('div', {
        className: 'flex flex-wrap gap-2'
      });

      paper.tags.forEach(tag => {
        const tagBadge = this.createElement('span', {
          className: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800'
        }, tag);
        tagsGrid.appendChild(tagBadge);
      });

      tagsSection.appendChild(tagsTitle);
      tagsSection.appendChild(tagsGrid);
      details.appendChild(tagsSection);
    }

    // Citation info
    if (paper.citations !== undefined) {
      const citationSection = this.createElement('div', {
        className: 'mb-6 p-4 bg-blue-50 rounded-lg'
      });

      const citationText = this.createElement('p', {
        className: 'text-sm text-blue-700'
      }, `Cited by ${paper.citations} publications`);

      citationSection.appendChild(citationText);
      details.appendChild(citationSection);
    }

    // PDF link
    if (paper.pdf) {
      const pdfSection = this.createElement('div', {
        className: 'flex justify-center'
      });

      const pdfLink = this.createElement('a', {
        href: paper.pdf,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: 'inline-flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500'
      });

      pdfLink.innerHTML = `
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
        </svg>
        Read Full Paper
      `;

      pdfSection.appendChild(pdfLink);
      details.appendChild(pdfSection);
    }

    content.appendChild(details);
    return content;
  }

  createProjectNavigation(project) {
    const projects = globalState.get('projects') || [];
    const currentIndex = projects.findIndex(p => p.id === project.id);
    
    return this.createNavigationControls(projects, currentIndex, 'project');
  }

  createPaperNavigation(paper) {
    const papers = globalState.get('papers') || [];
    const currentIndex = papers.findIndex(p => p.id === paper.id);
    
    return this.createNavigationControls(papers, currentIndex, 'paper');
  }

  createNavigationControls(items, currentIndex, type) {
    const nav = this.createElement('div', {
      className: 'flex items-center justify-between w-full'
    });

    // Previous button
    const prevButton = this.createElement('button', {
      className: `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
        currentIndex <= 0 ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      disabled: currentIndex <= 0,
      'data-action': 'prev'
    });
    prevButton.innerHTML = `
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
      </svg>
      Previous
    `;

    // Counter
    const counter = this.createElement('span', {
      className: 'text-sm text-gray-500'
    }, `${currentIndex + 1} of ${items.length}`);

    // Next button
    const nextButton = this.createElement('button', {
      className: `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
        currentIndex >= items.length - 1 ? 'opacity-50 cursor-not-allowed' : ''
      }`,
      disabled: currentIndex >= items.length - 1,
      'data-action': 'next'
    });
    nextButton.innerHTML = `
      Next
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
      </svg>
    `;

    // Add navigation event listeners
    if (currentIndex > 0) {
      this.addEventListener(prevButton, 'click', () => {
        const prevItem = items[currentIndex - 1];
        if (type === 'project') {
          this.openProjectModal(prevItem);
        } else {
          this.openPaperModal(prevItem);
        }
      });
    }

    if (currentIndex < items.length - 1) {
      this.addEventListener(nextButton, 'click', () => {
        const nextItem = items[currentIndex + 1];
        if (type === 'project') {
          this.openProjectModal(nextItem);
        } else {
          this.openPaperModal(nextItem);
        }
      });
    }

    nav.appendChild(prevButton);
    nav.appendChild(counter);
    nav.appendChild(nextButton);

    return nav;
  }

  navigateModal(direction) {
    if (!this.activeModal) return;

    const navButton = this.activeModal.querySelector(`[data-action="${direction}"]:not([disabled])`);
    if (navButton) {
      navButton.click();
    }
  }

  getLinkIcon(type) {
    const icons = {
      github: '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clip-rule="evenodd"></path></svg>',
      demo: '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>',
      paper: '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path></svg>'
    };
    return icons[type] || icons.demo;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  updateUrl(type, id) {
    const url = new URL(window.location);
    url.searchParams.set('modal', type);
    url.searchParams.set('id', id);
    
    const state = { modal: { type, id } };
    window.history.pushState(state, '', url.toString());
  }

  clearUrl() {
    const url = new URL(window.location);
    url.searchParams.delete('modal');
    url.searchParams.delete('id');
    
    window.history.pushState({}, '', url.toString());
  }

  async openModalFromUrl(type, id) {
    if (type === 'project') {
      const projects = globalState.get('projects') || [];
      const project = projects.find(p => p.id === id);
      if (project) {
        await this.openProjectModal(project);
      }
    } else if (type === 'paper') {
      const papers = globalState.get('papers') || [];
      const paper = papers.find(p => p.id === id);
      if (paper) {
        await this.openPaperModal(paper);
      }
    }
  }

  async openModalFromState(modalState) {
    await this.openModalFromUrl(modalState.type, modalState.id);
  }

  preventBodyScroll() {
    this.scrollPosition = window.pageYOffset;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollPosition}px`;
    document.body.style.width = '100%';
  }

  restoreBodyScroll() {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    window.scrollTo(0, this.scrollPosition);
  }

  // Public API
  isModalOpen() {
    return this.activeModal !== null;
  }

  getCurrentModal() {
    return this.activeModal;
  }

  closeAllModals() {
    while (this.modalStack.length > 0) {
      this.closeModal(true);
    }
  }

  destroy() {
    this.closeAllModals();
    
    if (this.modalContainer) {
      this.modalContainer.remove();
    }

    super.destroy();
  }
}

export default ModalSystem;