/**
 * ContentModal Component - Dynamic modal system for content viewing
 * Supports projects, papers, testimonials with rich interactions
 */
import { ComponentBase } from '../core/ComponentBase.js';

export class ContentModal extends ComponentBase {
  constructor() {
    super();
    this.isOpen = false;
    this.currentContent = null;
    this.overlay = null;
    this.modal = null;
    this.setupKeyboardHandlers();
  }

  async init() {
    await this.createModalStructure();
    this.attachEventListeners();
  }

  async createModalStructure() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal-container" role="dialog" aria-modal="true" tabindex="-1">
        <button class="modal-close" aria-label="Close modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="modal-content">
          <!-- Content will be dynamically populated -->
        </div>
      </div>
    `;

    // Apply styles
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      z-index: 1000;
      backdrop-filter: blur(4px);
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const container = this.overlay.querySelector('.modal-container');
    container.style.cssText = `
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      margin: 2rem auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      transform: scale(0.9) translateY(20px);
      transition: transform 0.3s ease;
    `;

    const closeBtn = this.overlay.querySelector('.modal-close');
    closeBtn.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: rgba(0, 0, 0, 0.1);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      transition: background 0.2s ease;
    `;

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(0, 0, 0, 0.2)';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(0, 0, 0, 0.1)';
    });

    document.body.appendChild(this.overlay);
    this.modal = this.overlay.querySelector('.modal-content');
  }

  async openContent(contentType, contentId) {
    try {
      const content = await this.fetchContent(contentType, contentId);
      if (!content) {
        console.error(`Content not found: ${contentType}/${contentId}`);
        return;
      }

      this.currentContent = { type: contentType, id: contentId, data: content };
      await this.renderContent(content, contentType);
      this.showModal();

      // Track analytics
      this.trackEvent('modal_open', { type: contentType, id: contentId });
    } catch (error) {
      console.error('Error opening content:', error);
      this.showError('Failed to load content');
    }
  }

  async fetchContent(type, id) {
    const cacheKey = `content_${type}_${id}`;

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`/data/${type}.json`);
      const allContent = await response.json();
      const content = allContent.find(item => item.id === id || item.slug === id);

      if (content) {
        this.cache.set(cacheKey, content);
      }

      return content;
    } catch (error) {
      console.error(`Error fetching ${type} content:`, error);
      return null;
    }
  }

  async renderContent(content, type) {
    const templates = {
      project: this.renderProject.bind(this),
      paper: this.renderPaper.bind(this),
      testimonial: this.renderTestimonial.bind(this)
    };

    const renderer = templates[type];
    if (!renderer) {
      this.showError(`Unknown content type: ${type}`);
      return;
    }

    this.modal.innerHTML = await renderer(content);
    this.enhanceInteractivity();
  }

  async renderProject(project) {
    const techTags = project.technologies?.map(tech =>
      `<span class="tech-tag">${this.escapeHtml(tech)}</span>`
    ).join('') || '';

    const projectImages = project.images?.map((img, index) => `
      <div class="project-image">
        <img src="${this.escapeHtml(img.url)}"
             alt="${this.escapeHtml(img.alt || project.title)}"
             loading="lazy"
             data-image-index="${index}">
      </div>
    `).join('') || '';

    return `
      <div class="modal-project">
        <div class="project-header">
          <h1>${this.escapeHtml(project.title)}</h1>
          <div class="project-meta">
            <span class="category">${this.escapeHtml(project.category)}</span>
            <span class="date">${this.formatDate(project.date)}</span>
          </div>
        </div>

        ${project.featured_image ? `
          <div class="project-hero">
            <img src="${this.escapeHtml(project.featured_image)}"
                 alt="${this.escapeHtml(project.title)}"
                 loading="lazy">
          </div>
        ` : ''}

        <div class="project-content">
          <div class="project-description">
            ${this.parseMarkdown(project.description || project.content)}
          </div>

          ${techTags ? `
            <div class="technologies">
              <h3>Technologies Used</h3>
              <div class="tech-tags">${techTags}</div>
            </div>
          ` : ''}

          ${projectImages ? `
            <div class="project-gallery">
              <h3>Project Images</h3>
              <div class="gallery-grid">${projectImages}</div>
            </div>
          ` : ''}

          ${project.links ? `
            <div class="project-links">
              ${project.links.demo ? `
                <a href="${this.escapeHtml(project.links.demo)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="btn-primary">View Demo</a>
              ` : ''}
              ${project.links.github ? `
                <a href="${this.escapeHtml(project.links.github)}"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="btn-secondary">View Code</a>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  async renderPaper(paper) {
    const authors = paper.authors?.map(author =>
      `<span class="author">${this.escapeHtml(author)}</span>`
    ).join(', ') || '';

    const keywords = paper.keywords?.map(keyword =>
      `<span class="keyword-tag">${this.escapeHtml(keyword)}</span>`
    ).join('') || '';

    const citations = paper.citations?.map(citation => `
      <div class="citation">
        <span class="citation-text">${this.escapeHtml(citation.text)}</span>
        ${citation.url ? `
          <a href="${this.escapeHtml(citation.url)}"
             target="_blank"
             rel="noopener noreferrer"
             class="citation-link">View Source</a>
        ` : ''}
      </div>
    `).join('') || '';

    return `
      <div class="modal-paper">
        <div class="paper-header">
          <h1>${this.escapeHtml(paper.title)}</h1>
          ${authors ? `<div class="authors">${authors}</div>` : ''}
          <div class="paper-meta">
            ${paper.journal ? `<span class="journal">${this.escapeHtml(paper.journal)}</span>` : ''}
            ${paper.year ? `<span class="year">${paper.year}</span>` : ''}
            ${paper.doi ? `<span class="doi">DOI: ${this.escapeHtml(paper.doi)}</span>` : ''}
          </div>
        </div>

        <div class="paper-content">
          ${paper.abstract ? `
            <div class="abstract">
              <h3>Abstract</h3>
              <p>${this.escapeHtml(paper.abstract)}</p>
            </div>
          ` : ''}

          ${keywords ? `
            <div class="keywords">
              <h3>Keywords</h3>
              <div class="keyword-tags">${keywords}</div>
            </div>
          ` : ''}

          ${paper.fullText ? `
            <div class="full-text">
              <h3>Full Text</h3>
              <div class="text-content">${this.parseMarkdown(paper.fullText)}</div>
            </div>
          ` : ''}

          ${citations ? `
            <div class="citations">
              <h3>Citations</h3>
              <div class="citation-list">${citations}</div>
            </div>
          ` : ''}

          <div class="paper-actions">
            ${paper.pdfUrl ? `
              <a href="${this.escapeHtml(paper.pdfUrl)}"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="btn-primary">Download PDF</a>
            ` : ''}
            ${paper.url ? `
              <a href="${this.escapeHtml(paper.url)}"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="btn-secondary">View Original</a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  async renderTestimonial(testimonial) {
    return `
      <div class="modal-testimonial">
        <div class="testimonial-header">
          <h1>Client Testimonial</h1>
          <div class="client-info">
            <h2>${this.escapeHtml(testimonial.client_name)}</h2>
            ${testimonial.client_title ? `
              <p class="client-title">${this.escapeHtml(testimonial.client_title)}</p>
            ` : ''}
            ${testimonial.company ? `
              <p class="company">${this.escapeHtml(testimonial.company)}</p>
            ` : ''}
          </div>
        </div>

        <div class="testimonial-content">
          <blockquote class="testimonial-quote">
            "${this.escapeHtml(testimonial.content)}"
          </blockquote>

          ${testimonial.project ? `
            <div class="related-project">
              <h3>Related Project</h3>
              <p>${this.escapeHtml(testimonial.project)}</p>
            </div>
          ` : ''}

          ${testimonial.rating ? `
            <div class="rating">
              <span class="rating-label">Rating:</span>
              <div class="stars">${this.renderStars(testimonial.rating)}</div>
            </div>
          ` : ''}

          <div class="testimonial-date">
            ${this.formatDate(testimonial.date)}
          </div>
        </div>
      </div>
    `;
  }

  enhanceInteractivity() {
    // Image gallery interactions
    const images = this.modal.querySelectorAll('[data-image-index]');
    images.forEach(img => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', (e) => {
        this.openImageViewer(e.target, parseInt(e.target.dataset.imageIndex));
      });
    });

    // Copy to clipboard for citations
    const citations = this.modal.querySelectorAll('.citation');
    citations.forEach(citation => {
      const copyBtn = document.createElement('button');
      copyBtn.className = 'copy-citation';
      copyBtn.innerHTML = 'Copy';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(citation.textContent.trim());
        copyBtn.innerHTML = 'Copied!';
        setTimeout(() => copyBtn.innerHTML = 'Copy', 2000);
      });
      citation.appendChild(copyBtn);
    });

    // Smooth scrolling for long content
    this.modal.style.cssText += `
      max-height: 80vh;
      overflow-y: auto;
      padding: 2rem;
      scroll-behavior: smooth;
    `;
  }

  showModal() {
    this.overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      this.overlay.style.opacity = '1';
      const container = this.overlay.querySelector('.modal-container');
      container.style.transform = 'scale(1) translateY(0)';
    });

    this.isOpen = true;
    this.overlay.focus();
  }

  closeModal() {
    this.overlay.style.opacity = '0';
    const container = this.overlay.querySelector('.modal-container');
    container.style.transform = 'scale(0.9) translateY(20px)';

    setTimeout(() => {
      this.overlay.style.display = 'none';
      document.body.style.overflow = '';
      this.isOpen = false;
      this.currentContent = null;
    }, 300);
  }

  setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      switch (e.key) {
        case 'Escape':
          this.closeModal();
          break;
        case 'ArrowLeft':
          this.navigateContent(-1);
          break;
        case 'ArrowRight':
          this.navigateContent(1);
          break;
      }
    });
  }

  attachEventListeners() {
    // Close button
    this.overlay.querySelector('.modal-close').addEventListener('click', () => {
      this.closeModal();
    });

    // Overlay click to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.closeModal();
      }
    });
  }

  async navigateContent(direction) {
    if (!this.currentContent) return;

    // Implementation for previous/next content navigation
    // This would require additional logic to track content order
  }

  renderStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let stars = '';
    for (let i = 0; i < fullStars; i++) {
      stars += '<span class="star filled">★</span>';
    }
    if (hasHalfStar) {
      stars += '<span class="star half">☆</span>';
    }
    for (let i = 0; i < emptyStars; i++) {
      stars += '<span class="star">☆</span>';
    }
    return stars;
  }

  showError(message) {
    this.modal.innerHTML = `
      <div class="modal-error">
        <div class="error-icon">⚠️</div>
        <h2>Error</h2>
        <p>${this.escapeHtml(message)}</p>
        <button onclick="this.closest('.modal-overlay').style.display='none'" class="btn-primary">
          Close
        </button>
      </div>
    `;
    this.showModal();
  }
}