/**
 * Social Manager - Social Sharing and Integration Features
 * Handles social media sharing, integration, and engagement features
 */

export class SocialManager {
  constructor() {
    this.shareAPI = 'navigator' in window && 'share' in navigator;
    this.currentPage = {
      title: document.title,
      description: '',
      url: window.location.href,
      image: ''
    };

    this.socialPlatforms = {
      facebook: {
        name: 'Facebook',
        icon: '📘',
        color: '#1877f2',
        shareUrl: 'https://www.facebook.com/sharer/sharer.php'
      },
      twitter: {
        name: 'Twitter',
        icon: '🐦',
        color: '#1da1f2',
        shareUrl: 'https://twitter.com/intent/tweet'
      },
      linkedin: {
        name: 'LinkedIn',
        icon: '💼',
        color: '#0077b5',
        shareUrl: 'https://www.linkedin.com/sharing/share-offsite/'
      },
      email: {
        name: 'Email',
        icon: '📧',
        color: '#34495e',
        shareUrl: 'mailto:'
      },
      copy: {
        name: 'Copy Link',
        icon: '🔗',
        color: '#6c757d',
        shareUrl: null
      },
      whatsapp: {
        name: 'WhatsApp',
        icon: '💬',
        color: '#25d366',
        shareUrl: 'https://wa.me/'
      },
      telegram: {
        name: 'Telegram',
        icon: '✈️',
        color: '#0088cc',
        shareUrl: 'https://t.me/share/url'
      }
    };

    this.setupEventListeners();
  }

  init() {
    console.log('📱 Social Manager: Initializing...');

    // Create share buttons for existing content
    this.enhanceExistingContent();

    // Setup dynamic share button creation
    this.setupDynamicSharing();

    // Setup social media meta tags monitoring
    this.setupSocialMetaTracking();

    // Initialize share analytics
    this.setupShareAnalytics();

    console.log('✅ Social Manager: Initialized');
  }

  setupEventListeners() {
    // Listen for content updates
    document.addEventListener('contentUpdated', (event) => {
      this.updateShareContent(event.detail);
    });

    // Listen for modal opens (to add share buttons)
    document.addEventListener('openContent', (event) => {
      setTimeout(() => {
        this.addModalShareButtons(event.detail);
      }, 100);
    });

    // Handle share button clicks
    document.addEventListener('click', (event) => {
      if (event.target.matches('.social-share-btn, .social-share-btn *')) {
        const button = event.target.closest('.social-share-btn');
        if (button) {
          event.preventDefault();
          this.handleShareClick(button);
        }
      }
    });

    // Handle keyboard shortcuts for sharing
    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.showQuickShareModal();
      }
    });
  }

  enhanceExistingContent() {
    // Add share buttons to project cards
    document.querySelectorAll('.project-card, .paper-card, .testimonial-card').forEach(card => {
      this.addShareButton(card);
    });

    // Add floating share button to main content
    this.addFloatingShareButton();
  }

  addShareButton(element) {
    const shareBtn = document.createElement('button');
    shareBtn.className = 'social-share-btn inline-share';
    shareBtn.innerHTML = `
      <span class="share-icon">📤</span>
      <span class="share-text">Share</span>
    `;

    // Get content data
    const contentData = this.extractContentData(element);
    shareBtn.dataset.shareData = JSON.stringify(contentData);

    // Style the button
    this.styleInlineShareButton(shareBtn);

    // Add to element
    const header = element.querySelector('.card-header, .project-header, h3, h2');
    if (header) {
      header.appendChild(shareBtn);
    } else {
      element.appendChild(shareBtn);
    }
  }

  addFloatingShareButton() {
    // Create floating share button
    const floatingBtn = document.createElement('button');
    floatingBtn.id = 'floating-share-btn';
    floatingBtn.className = 'floating-share-button';
    floatingBtn.innerHTML = `
      <span class="floating-share-icon">📤</span>
    `;

    // Style the floating button
    this.styleFloatingShareButton(floatingBtn);

    // Add to page
    document.body.appendChild(floatingBtn);

    // Handle click
    floatingBtn.addEventListener('click', () => {
      this.showQuickShareModal();
    });

    // Show/hide based on scroll
    this.setupFloatingButtonVisibility(floatingBtn);
  }

  setupFloatingButtonVisibility(button) {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateVisibility = () => {
      const scrollY = window.scrollY;
      const shouldShow = scrollY > 300; // Show after scrolling 300px

      if (shouldShow && scrollY > lastScrollY) {
        // Scrolling down - hide
        button.style.transform = 'translateY(100px)';
      } else if (shouldShow) {
        // Scrolling up or stationary - show
        button.style.transform = 'translateY(0)';
      } else {
        // Top of page - hide
        button.style.transform = 'translateY(100px)';
      }

      lastScrollY = scrollY;
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateVisibility);
        ticking = true;
      }
    });
  }

  addModalShareButtons(contentData) {
    const modal = document.querySelector('.modal-content, .content-modal');
    if (!modal) return;

    // Check if share buttons already exist
    if (modal.querySelector('.modal-share-buttons')) return;

    // Create share buttons container
    const shareContainer = document.createElement('div');
    shareContainer.className = 'modal-share-buttons';
    shareContainer.innerHTML = `
      <div class="share-header">
        <span class="share-title">Share this content</span>
      </div>
      <div class="share-buttons-grid">
        ${this.generateShareButtonsHTML(contentData)}
      </div>
    `;

    // Style the container
    this.styleModalShareButtons(shareContainer);

    // Add to modal
    const modalContent = modal.querySelector('.modal-content, .paper-content, .project-content');
    if (modalContent) {
      modalContent.appendChild(shareContainer);
    }
  }

  generateShareButtonsHTML(shareData) {
    const platforms = ['facebook', 'twitter', 'linkedin', 'email', 'copy'];

    return platforms.map(platform => {
      const config = this.socialPlatforms[platform];
      return `
        <button class="social-share-btn platform-${platform}"
                data-platform="${platform}"
                data-share-data='${JSON.stringify(shareData)}'>
          <span class="platform-icon">${config.icon}</span>
          <span class="platform-name">${config.name}</span>
        </button>
      `;
    }).join('');
  }

  showQuickShareModal() {
    // Create or show quick share modal
    let modal = document.getElementById('quick-share-modal');

    if (!modal) {
      modal = this.createQuickShareModal();
    }

    // Update share data for current page
    const currentData = {
      title: document.title,
      description: this.getCurrentPageDescription(),
      url: window.location.href,
      image: this.getCurrentPageImage()
    };

    // Update modal content
    const shareButtons = modal.querySelector('.share-buttons-grid');
    shareButtons.innerHTML = this.generateShareButtonsHTML(currentData);

    // Show modal
    modal.style.display = 'flex';
    modal.querySelector('.quick-share-content').focus();

    // Track modal open
    this.trackShareEvent('quick_share_modal_opened');
  }

  createQuickShareModal() {
    const modal = document.createElement('div');
    modal.id = 'quick-share-modal';
    modal.className = 'quick-share-modal';
    modal.innerHTML = `
      <div class="quick-share-overlay"></div>
      <div class="quick-share-content" tabindex="-1">
        <div class="quick-share-header">
          <h3>Share This Page</h3>
          <button class="close-share-modal" aria-label="Close share modal">
            <span>×</span>
          </button>
        </div>
        <div class="share-buttons-grid">
          <!-- Buttons will be populated dynamically -->
        </div>
        <div class="share-footer">
          <p class="share-tip">
            💡 <strong>Tip:</strong> Use <kbd>Ctrl+Shift+S</kbd> for quick sharing
          </p>
        </div>
      </div>
    `;

    // Style the modal
    this.styleQuickShareModal(modal);

    // Add event listeners
    modal.querySelector('.close-share-modal').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.querySelector('.quick-share-overlay').addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // ESC key to close
    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        modal.style.display = 'none';
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  handleShareClick(button) {
    const platform = button.dataset.platform;
    const shareData = JSON.parse(button.dataset.shareData || '{}');

    this.shareContent(platform, shareData);
  }

  async shareContent(platform, data) {
    const shareData = {
      title: data.title || this.currentPage.title,
      description: data.description || this.getCurrentPageDescription(),
      url: data.url || window.location.href,
      image: data.image || this.getCurrentPageImage()
    };

    // Track share attempt
    this.trackShareEvent('share_attempted', { platform, content_type: data.type });

    try {
      switch (platform) {
        case 'native':
          await this.shareNative(shareData);
          break;
        case 'facebook':
          this.shareFacebook(shareData);
          break;
        case 'twitter':
          this.shareTwitter(shareData);
          break;
        case 'linkedin':
          this.shareLinkedIn(shareData);
          break;
        case 'email':
          this.shareEmail(shareData);
          break;
        case 'whatsapp':
          this.shareWhatsApp(shareData);
          break;
        case 'telegram':
          this.shareTelegram(shareData);
          break;
        case 'copy':
          await this.copyToClipboard(shareData.url);
          break;
        default:
          console.warn('Unknown share platform:', platform);
      }

      // Track successful share
      this.trackShareEvent('share_completed', { platform, content_type: data.type });

    } catch (error) {
      console.error('Share failed:', error);
      this.trackShareEvent('share_failed', { platform, error: error.message });
      this.showShareError(error.message);
    }
  }

  async shareNative(data) {
    if (!this.shareAPI) {
      throw new Error('Native sharing not supported');
    }

    await navigator.share({
      title: data.title,
      text: data.description,
      url: data.url
    });
  }

  shareFacebook(data) {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}`;
    this.openShareWindow(url, 'Facebook Share');
  }

  shareTwitter(data) {
    const text = `${data.title}\n\n${data.description}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(data.url)}`;
    this.openShareWindow(url, 'Twitter Share');
  }

  shareLinkedIn(data) {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}`;
    this.openShareWindow(url, 'LinkedIn Share');
  }

  shareEmail(data) {
    const subject = encodeURIComponent(data.title);
    const body = encodeURIComponent(`${data.description}\n\n${data.url}`);
    const url = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = url;
  }

  shareWhatsApp(data) {
    const text = `${data.title}\n\n${data.description}\n\n${data.url}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    this.openShareWindow(url, 'WhatsApp Share');
  }

  shareTelegram(data) {
    const text = `${data.title}\n\n${data.description}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(text)}`;
    this.openShareWindow(url, 'Telegram Share');
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showCopySuccess();
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showCopySuccess();
    }
  }

  openShareWindow(url, title) {
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;

    window.open(
      url,
      title,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }

  showCopySuccess() {
    // Create success toast
    const toast = document.createElement('div');
    toast.className = 'copy-success-toast';
    toast.innerHTML = `
      <span class="success-icon">✅</span>
      <span class="success-text">Link copied to clipboard!</span>
    `;

    this.styleSuccessToast(toast);
    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  showShareError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'share-error-toast';
    toast.innerHTML = `
      <span class="error-icon">❌</span>
      <span class="error-text">Share failed: ${message}</span>
    `;

    this.styleErrorToast(toast);
    document.body.appendChild(toast);

    // Remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 5000);
  }

  setupDynamicSharing() {
    // Watch for new content being added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const cards = node.querySelectorAll('.project-card, .paper-card, .testimonial-card');
            cards.forEach(card => {
              if (!card.querySelector('.social-share-btn')) {
                this.addShareButton(card);
              }
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  setupSocialMetaTracking() {
    // Monitor when social meta tags are updated
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target.tagName === 'HEAD' && mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE &&
                node.tagName === 'META' &&
                (node.getAttribute('property')?.startsWith('og:') ||
                 node.getAttribute('name')?.startsWith('twitter:'))) {
              console.log('📱 Social meta tag updated:', node.outerHTML);
            }
          });
        }
      });
    });

    observer.observe(document.head, { childList: true });
  }

  setupShareAnalytics() {
    // Track share button visibility
    const shareObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.trackShareEvent('share_button_viewed', {
            platform: entry.target.dataset.platform,
            visibility_ratio: entry.intersectionRatio
          });
        }
      });
    }, { threshold: 0.5 });

    // Observe all share buttons
    document.querySelectorAll('.social-share-btn').forEach(btn => {
      shareObserver.observe(btn);
    });
  }

  // Utility methods
  extractContentData(element) {
    return {
      title: element.querySelector('h1, h2, h3, .title')?.textContent || document.title,
      description: element.querySelector('.description, .summary, p')?.textContent || '',
      url: window.location.href,
      image: element.querySelector('img')?.src || '',
      type: element.className.includes('project') ? 'project' :
            element.className.includes('paper') ? 'paper' :
            element.className.includes('testimonial') ? 'testimonial' : 'content'
    };
  }

  getCurrentPageDescription() {
    return document.querySelector('meta[name="description"]')?.content ||
           document.querySelector('meta[property="og:description"]')?.content ||
           'Check out this content from Chris Lindeman\'s portfolio';
  }

  getCurrentPageImage() {
    return document.querySelector('meta[property="og:image"]')?.content ||
           document.querySelector('meta[name="twitter:image"]')?.content ||
           '/assets/images/og-default.jpg';
  }

  updateShareContent(contentData) {
    this.currentPage = {
      title: contentData.title || document.title,
      description: contentData.description || this.getCurrentPageDescription(),
      url: contentData.url || window.location.href,
      image: contentData.image || this.getCurrentPageImage()
    };
  }

  trackShareEvent(eventName, data = {}) {
    // Track share-related events
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'Social',
        ...data
      });
    }

    console.log(`📊 Social Event: ${eventName}`, data);
  }

  // Styling methods
  styleInlineShareButton(button) {
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: none;
      border: 1px solid #e5e7eb;
      padding: 0.375rem 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: auto;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.borderColor = '#3b82f6';
      button.style.color = '#3b82f6';
    });

    button.addEventListener('mouseleave', () => {
      button.style.borderColor = '#e5e7eb';
      button.style.color = '#6b7280';
    });
  }

  styleFloatingShareButton(button) {
    button.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 56px;
      height: 56px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 50%;
      font-size: 1.25rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 1000;
      transition: all 0.3s ease;
      transform: translateY(100px);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform += ' scale(1.1)';
      button.style.background = '#2563eb';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = button.style.transform.replace(' scale(1.1)', '');
      button.style.background = '#3b82f6';
    });
  }

  styleModalShareButtons(container) {
    container.style.cssText = `
      margin-top: 2rem;
      padding: 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .share-header {
        margin-bottom: 1rem;
      }
      .share-title {
        font-weight: 600;
        color: #374151;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .share-buttons-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 0.75rem;
      }
      .social-share-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        color: #374151;
      }
      .social-share-btn:hover {
        border-color: #3b82f6;
        background: #f0f9ff;
        transform: translateY(-2px);
      }
      .platform-icon {
        font-size: 1.5rem;
      }
      .platform-name {
        font-size: 0.875rem;
        font-weight: 500;
      }
    `;

    if (!document.head.querySelector('style[data-social-modal]')) {
      style.setAttribute('data-social-modal', 'true');
      document.head.appendChild(style);
    }
  }

  styleQuickShareModal(modal) {
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;

    const style = document.createElement('style');
    style.textContent = `
      .quick-share-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
      }
      .quick-share-content {
        position: relative;
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 480px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0,0,0,0.25);
      }
      .quick-share-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .quick-share-header h3 {
        margin: 0;
        color: #374151;
      }
      .close-share-modal {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0.25rem;
        border-radius: 4px;
      }
      .close-share-modal:hover {
        background: #f3f4f6;
      }
      .share-footer {
        margin-top: 1.5rem;
        text-align: center;
      }
      .share-tip {
        margin: 0;
        font-size: 0.875rem;
        color: #6b7280;
      }
      .share-tip kbd {
        background: #f3f4f6;
        padding: 0.125rem 0.25rem;
        border-radius: 3px;
        font-family: monospace;
        font-size: 0.75rem;
      }
    `;

    if (!document.head.querySelector('style[data-quick-share]')) {
      style.setAttribute('data-quick-share', 'true');
      document.head.appendChild(style);
    }
  }

  styleSuccessToast(toast) {
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #10b981;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      z-index: 9999;
      animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.7s;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;

    if (!document.head.querySelector('style[data-toast-animations]')) {
      style.setAttribute('data-toast-animations', 'true');
      document.head.appendChild(style);
    }
  }

  styleErrorToast(toast) {
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #ef4444;
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      z-index: 9999;
      animation: slideUp 0.3s ease, fadeOut 0.3s ease 4.7s;
    `;
  }

  // Public API methods
  getSocialShareUrls(data) {
    const shareData = { ...this.currentPage, ...data };

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.title)}&url=${encodeURIComponent(shareData.url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`,
      email: `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.description + '\n\n' + shareData.url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(shareData.title + '\n\n' + shareData.description + '\n\n' + shareData.url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.title)}`
    };
  }

  getShareAnalytics() {
    // Return share analytics data
    return {
      nativeShareSupported: this.shareAPI,
      platformsAvailable: Object.keys(this.socialPlatforms),
      currentPage: this.currentPage
    };
  }

  updateCurrentPage(data) {
    this.currentPage = { ...this.currentPage, ...data };
  }
}