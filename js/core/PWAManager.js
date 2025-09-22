/**
 * PWA Manager - Progressive Web App capabilities
 * Handles service worker registration, app installation, and offline features
 */

export class PWAManager {
  constructor() {
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.swRegistration = null;
    this.installPrompt = null;
    this.updateAvailable = false;

    this.setupEventListeners();
  }

  async init() {
    console.log('🚀 PWA Manager: Initializing...');

    try {
      // Register service worker
      await this.registerServiceWorker();

      // Check installation status
      this.checkInstallationStatus();

      // Setup install prompt
      this.setupInstallPrompt();

      // Setup update checks
      this.setupUpdateChecks();

      // Setup offline/online detection
      this.setupConnectivityDetection();

      // Setup background sync
      this.setupBackgroundSync();

      console.log('✅ PWA Manager: Initialized successfully');

    } catch (error) {
      console.error('❌ PWA Manager: Initialization failed:', error);
    }
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.warn('⚠️ Service Worker not supported in this browser');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('✅ Service Worker registered:', this.swRegistration.scope);

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', this.handleSWMessage.bind(this));

      // Check for updates
      this.swRegistration.addEventListener('updatefound', () => {
        console.log('🔄 Service Worker: Update found');
        this.handleSWUpdate();
      });

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }

  handleSWMessage(event) {
    const { type, url, timestamp } = event.data;

    switch (type) {
      case 'CONTENT_UPDATED':
        this.handleContentUpdate(url);
        break;

      case 'CACHE_UPDATED':
        this.showCacheUpdateNotification();
        break;

      case 'SW_ERROR':
        console.error('Service Worker Error:', event.data.error);
        break;

      default:
        console.log('Service Worker Message:', event.data);
    }
  }

  handleSWUpdate() {
    const newWorker = this.swRegistration.installing;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        this.updateAvailable = true;
        this.showUpdateAvailablePrompt();
      }
    });
  }

  showUpdateAvailablePrompt() {
    // Create update notification
    const updateBanner = document.createElement('div');
    updateBanner.className = 'pwa-update-banner';
    updateBanner.innerHTML = `
      <div class="update-content">
        <span class="update-icon">🔄</span>
        <div class="update-text">
          <strong>Update Available</strong>
          <p>A new version of the app is ready!</p>
        </div>
        <div class="update-actions">
          <button class="update-btn" id="updateApp">Update Now</button>
          <button class="dismiss-btn" id="dismissUpdate">Later</button>
        </div>
      </div>
    `;

    // Style the banner
    this.applyUpdateBannerStyles(updateBanner);

    // Add to page
    document.body.appendChild(updateBanner);

    // Handle actions
    document.getElementById('updateApp').addEventListener('click', () => {
      this.applyUpdate();
      updateBanner.remove();
    });

    document.getElementById('dismissUpdate').addEventListener('click', () => {
      updateBanner.remove();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (updateBanner.parentNode) {
        updateBanner.remove();
      }
    }, 10000);
  }

  async applyUpdate() {
    if (!this.swRegistration?.waiting) return;

    // Tell the waiting service worker to skip waiting
    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for the new service worker to take control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  setupInstallPrompt() {
    // Listen for beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('💡 PWA: Install prompt available');
      event.preventDefault();
      this.installPrompt = event;
      this.showInstallOption();
    });

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA: App installed successfully');
      this.isInstalled = true;
      this.hideInstallOption();
      this.trackEvent('pwa_installed');
    });
  }

  showInstallOption() {
    // Create install button if it doesn't exist
    let installBtn = document.getElementById('pwa-install-btn');

    if (!installBtn) {
      installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'pwa-install-button';
      installBtn.innerHTML = `
        <span class="install-icon">📱</span>
        <span class="install-text">Install App</span>
      `;

      // Style the button
      this.applyInstallButtonStyles(installBtn);

      // Add to appropriate location (e.g., header or floating)
      const header = document.querySelector('header nav');
      if (header) {
        header.appendChild(installBtn);
      }
    }

    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', this.promptInstall.bind(this));
  }

  hideInstallOption() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
  }

  async promptInstall() {
    if (!this.installPrompt) return;

    try {
      const result = await this.installPrompt.prompt();
      console.log('PWA: Install prompt result:', result.outcome);

      if (result.outcome === 'accepted') {
        this.trackEvent('pwa_install_accepted');
      } else {
        this.trackEvent('pwa_install_dismissed');
      }

      this.installPrompt = null;
      this.hideInstallOption();

    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
    }
  }

  checkInstallationStatus() {
    // Check if app is running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      this.isInstalled = true;
      console.log('✅ PWA: App is installed and running standalone');
    }

    // Monitor display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isInstalled = e.matches;
      this.trackEvent('pwa_display_mode_changed', { standalone: e.matches });
    });
  }

  setupConnectivityDetection() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🌐 PWA: Back online');
      this.isOnline = true;
      this.hideOfflineIndicator();
      this.syncWhenOnline();
      this.trackEvent('connectivity_restored');
    });

    window.addEventListener('offline', () => {
      console.log('📡 PWA: Gone offline');
      this.isOnline = false;
      this.showOfflineIndicator();
      this.trackEvent('connectivity_lost');
    });

    // Initial state
    if (!this.isOnline) {
      this.showOfflineIndicator();
    }
  }

  showOfflineIndicator() {
    let indicator = document.getElementById('offline-indicator');

    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'offline-indicator';
      indicator.className = 'offline-indicator';
      indicator.innerHTML = `
        <span class="offline-icon">📡</span>
        <span class="offline-text">You're offline - browsing cached content</span>
      `;

      this.applyOfflineIndicatorStyles(indicator);
      document.body.appendChild(indicator);
    }

    indicator.style.display = 'flex';
  }

  hideOfflineIndicator() {
    const indicator = document.getElementById('offline-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  setupBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
      console.warn('⚠️ Background Sync not supported');
      return;
    }

    // Register for background sync when going offline
    window.addEventListener('offline', () => {
      this.registerBackgroundSync('content-sync');
    });
  }

  async registerBackgroundSync(tag) {
    try {
      if (this.swRegistration) {
        await this.swRegistration.sync.register(tag);
        console.log(`🔄 Background sync registered: ${tag}`);
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  async syncWhenOnline() {
    if (!this.isOnline || !this.swRegistration) return;

    try {
      // Trigger immediate sync
      await this.registerBackgroundSync('content-sync');
      await this.registerBackgroundSync('analytics-sync');

      console.log('✅ PWA: Sync completed');
    } catch (error) {
      console.error('PWA: Sync failed:', error);
    }
  }

  setupUpdateChecks() {
    // Check for updates periodically
    setInterval(() => {
      if (this.swRegistration) {
        this.swRegistration.update();
      }
    }, 60000); // Check every minute

    // Check for updates on focus
    window.addEventListener('focus', () => {
      if (this.swRegistration) {
        this.swRegistration.update();
      }
    });
  }

  handleContentUpdate(url) {
    console.log('📄 Content updated:', url);

    // Refresh content components if they exist
    if (window.PortfolioApp) {
      window.PortfolioApp.refreshContent();
    }

    // Show subtle notification
    this.showContentUpdateNotification();
  }

  showContentUpdateNotification() {
    // Create subtle toast notification
    const toast = document.createElement('div');
    toast.className = 'content-update-toast';
    toast.innerHTML = `
      <span class="toast-icon">✨</span>
      <span class="toast-text">Content updated</span>
    `;

    this.applyToastStyles(toast);
    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 3000);
  }

  showCacheUpdateNotification() {
    console.log('💾 Cache updated - content available offline');
  }

  // Styling methods
  applyInstallButtonStyles(button) {
    button.style.cssText = `
      display: none;
      align-items: center;
      gap: 0.5rem;
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.2s ease;
      margin-left: 1rem;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#2563eb';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#3b82f6';
    });
  }

  applyUpdateBannerStyles(banner) {
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1f2937;
      color: white;
      padding: 1rem;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      animation: slideDown 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from { transform: translateY(-100%); }
        to { transform: translateY(0); }
      }
      .update-content {
        display: flex;
        align-items: center;
        gap: 1rem;
        max-width: 1200px;
        margin: 0 auto;
      }
      .update-icon { font-size: 1.5rem; }
      .update-text { flex: 1; }
      .update-text strong { display: block; font-size: 1rem; }
      .update-text p { margin: 0; opacity: 0.8; font-size: 0.875rem; }
      .update-actions { display: flex; gap: 0.5rem; }
      .update-btn, .dismiss-btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
      }
      .update-btn {
        background: #3b82f6;
        color: white;
      }
      .dismiss-btn {
        background: transparent;
        color: white;
        border: 1px solid rgba(255,255,255,0.3);
      }
    `;

    if (!document.head.querySelector('style[data-pwa-styles]')) {
      style.setAttribute('data-pwa-styles', 'true');
      document.head.appendChild(style);
    }
  }

  applyOfflineIndicatorStyles(indicator) {
    indicator.style.cssText = `
      position: fixed;
      bottom: 1rem;
      left: 1rem;
      background: #f59e0b;
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
  }

  applyToastStyles(toast) {
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: #10b981;
      color: white;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideUp 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;

    if (!document.head.querySelector('style[data-toast-styles]')) {
      style.setAttribute('data-toast-styles', 'true');
      document.head.appendChild(style);
    }
  }

  // Utility methods
  trackEvent(eventName, properties = {}) {
    // Track PWA-related events
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, {
        event_category: 'PWA',
        ...properties
      });
    }

    console.log(`📊 PWA Event: ${eventName}`, properties);
  }

  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      connectionType: navigator.connection?.effectiveType || 'unknown',
      downlink: navigator.connection?.downlink || 'unknown'
    };
  }

  getInstallationStatus() {
    return {
      isInstalled: this.isInstalled,
      canInstall: !!this.installPrompt,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches
    };
  }

  async clearAllCaches() {
    if (!this.swRegistration) return;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      this.swRegistration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }

  async getServiceWorkerVersion() {
    if (!this.swRegistration) return null;

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version);
      };

      this.swRegistration.active.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }
}