/**
 * Analytics Manager - Advanced Analytics and Performance Monitoring
 * Handles user behavior tracking, performance metrics, and business intelligence
 */

export class AnalyticsManager {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userId = this.getUserId();
    this.startTime = Date.now();
    this.eventQueue = [];
    this.performanceMetrics = new Map();
    this.userBehavior = {
      pageViews: 0,
      interactions: 0,
      searchQueries: [],
      contentViews: new Map(),
      timeOnPage: 0,
      scrollDepth: 0
    };

    // Configuration
    this.config = {
      enableGoogleAnalytics: true,
      enableCustomAnalytics: true,
      enablePerformanceMonitoring: true,
      enableErrorTracking: true,
      enableHeatmaps: false, // Can be enabled for detailed UX analysis
      batchSize: 10,
      batchTimeout: 30000, // 30 seconds
      enableDebugLogging: true
    };

    this.setupEventListeners();
  }

  async init() {
    console.log('📊 Analytics Manager: Initializing...');

    try {
      // Initialize Google Analytics
      if (this.config.enableGoogleAnalytics) {
        await this.initializeGoogleAnalytics();
      }

      // Setup performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Setup error tracking
      if (this.config.enableErrorTracking) {
        this.setupErrorTracking();
      }

      // Setup user behavior tracking
      this.setupUserBehaviorTracking();

      // Setup batch processing
      this.setupBatchProcessing();

      // Track initial page load
      this.trackPageView();

      console.log('✅ Analytics Manager: Initialized successfully');

    } catch (error) {
      console.error('❌ Analytics Manager: Initialization failed:', error);
    }
  }

  async initializeGoogleAnalytics() {
    // Google Analytics 4 implementation
    const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'; // Replace with actual GA4 ID

    try {
      // Load gtag script
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      script.async = true;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        dataLayer.push(arguments);
      };

      gtag('js', new Date());
      gtag('config', GA_MEASUREMENT_ID, {
        page_title: document.title,
        page_location: window.location.href,
        custom_map: {
          custom_parameter_1: 'session_id',
          custom_parameter_2: 'user_type'
        }
      });

      // Set user properties
      gtag('config', GA_MEASUREMENT_ID, {
        user_id: this.userId,
        session_id: this.sessionId
      });

      console.log('✅ Google Analytics initialized');

    } catch (error) {
      console.error('❌ Google Analytics initialization failed:', error);
    }
  }

  setupEventListeners() {
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', {
          time_on_page: Date.now() - this.startTime
        });
      } else {
        this.trackEvent('page_visible');
        this.startTime = Date.now();
      }
    });

    // Before unload - track session end
    window.addEventListener('beforeunload', () => {
      this.trackSessionEnd();
      this.flushEventQueue();
    });

    // Scroll tracking
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.trackScrollDepth();
      }, 250);
    });

    // Click tracking
    document.addEventListener('click', (event) => {
      this.trackClick(event);
    });

    // Form interactions
    document.addEventListener('submit', (event) => {
      this.trackFormSubmission(event);
    });

    // Search interactions
    document.addEventListener('searchQuery', (event) => {
      this.trackSearch(event.detail);
    });

    // Content view tracking
    document.addEventListener('openContent', (event) => {
      this.trackContentView(event.detail);
    });
  }

  setupPerformanceMonitoring() {
    // Core Web Vitals monitoring
    this.measureCoreWebVitals();

    // Custom performance metrics
    this.measureCustomMetrics();

    // Resource timing
    this.analyzeResourceTiming();

    // Long tasks monitoring
    this.monitorLongTasks();
  }

  measureCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];

      this.performanceMetrics.set('LCP', lastEntry.startTime);
      this.trackPerformanceMetric('largest_contentful_paint', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        this.performanceMetrics.set('FID', entry.processingStart - entry.startTime);
        this.trackPerformanceMetric('first_input_delay', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    let clsEntries = [];

    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsEntries.push(entry);
          clsValue += entry.value;
        }
      }

      this.performanceMetrics.set('CLS', clsValue);
      this.trackPerformanceMetric('cumulative_layout_shift', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });

    // First Contentful Paint (FCP)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.performanceMetrics.set('FCP', entry.startTime);
          this.trackPerformanceMetric('first_contentful_paint', entry.startTime);
        }
      }
    }).observe({ entryTypes: ['paint'] });
  }

  measureCustomMetrics() {
    // App initialization time
    performance.mark('app-init-start');

    // Component load times
    const componentObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name.includes('component')) {
          this.trackPerformanceMetric('component_load_time', entry.duration, {
            component: entry.name
          });
        }
      }
    });

    componentObserver.observe({ entryTypes: ['measure'] });

    // Search performance
    document.addEventListener('searchCompleted', (event) => {
      this.trackPerformanceMetric('search_duration', event.detail.duration, {
        query_length: event.detail.query.length,
        result_count: event.detail.resultCount
      });
    });
  }

  analyzeResourceTiming() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const resources = performance.getEntriesByType('resource');

        const resourceAnalysis = {
          totalResources: resources.length,
          totalSize: 0,
          totalDuration: 0,
          byType: {}
        };

        resources.forEach(resource => {
          const type = this.getResourceType(resource.name);
          const duration = resource.responseEnd - resource.startTime;
          const size = resource.transferSize || 0;

          resourceAnalysis.totalDuration += duration;
          resourceAnalysis.totalSize += size;

          if (!resourceAnalysis.byType[type]) {
            resourceAnalysis.byType[type] = {
              count: 0,
              totalSize: 0,
              totalDuration: 0,
              averageDuration: 0
            };
          }

          resourceAnalysis.byType[type].count++;
          resourceAnalysis.byType[type].totalSize += size;
          resourceAnalysis.byType[type].totalDuration += duration;
          resourceAnalysis.byType[type].averageDuration =
            resourceAnalysis.byType[type].totalDuration / resourceAnalysis.byType[type].count;
        });

        this.trackEvent('resource_timing_analysis', resourceAnalysis);
      }, 1000);
    });
  }

  monitorLongTasks() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          this.trackPerformanceMetric('long_task', entry.duration, {
            start_time: entry.startTime,
            attribution: entry.attribution ? entry.attribution.map(attr => attr.name) : []
          });
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  setupErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('unhandled_promise_rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.trackError('resource_load_error', {
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          message: 'Failed to load resource'
        });
      }
    }, true);
  }

  setupUserBehaviorTracking() {
    // Track user engagement patterns
    let interactionCount = 0;
    const interactionEvents = ['click', 'scroll', 'keydown', 'mousemove'];

    interactionEvents.forEach(event => {
      document.addEventListener(event, () => {
        interactionCount++;
        this.userBehavior.interactions = interactionCount;
      }, { passive: true });
    });

    // Track time spent on page
    setInterval(() => {
      if (!document.hidden) {
        this.userBehavior.timeOnPage += 5000; // 5 seconds
      }
    }, 5000);

    // Track content engagement
    this.setupContentEngagementTracking();
  }

  setupContentEngagementTracking() {
    // Intersection Observer for content visibility
    const contentObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const contentId = entry.target.dataset.contentId;
          const contentType = entry.target.dataset.contentType;

          if (contentId && contentType) {
            this.trackContentEngagement(contentType, contentId, 'viewed');
          }
        }
      });
    }, { threshold: 0.5 });

    // Observe content elements
    document.querySelectorAll('[data-content-id]').forEach(element => {
      contentObserver.observe(element);
    });
  }

  setupBatchProcessing() {
    // Process event queue in batches
    setInterval(() => {
      this.processBatch();
    }, this.config.batchTimeout);

    // Process on page unload
    window.addEventListener('beforeunload', () => {
      this.processBatch(true);
    });
  }

  // Event tracking methods
  trackEvent(eventName, parameters = {}) {
    const eventData = {
      event_name: eventName,
      timestamp: Date.now(),
      session_id: this.sessionId,
      user_id: this.userId,
      page_url: window.location.href,
      page_title: document.title,
      user_agent: navigator.userAgent,
      ...parameters
    };

    // Add to queue
    this.eventQueue.push(eventData);

    // Send to Google Analytics
    if (this.config.enableGoogleAnalytics && typeof gtag !== 'undefined') {
      gtag('event', eventName, parameters);
    }

    // Debug logging
    if (this.config.enableDebugLogging) {
      console.log(`📊 Analytics Event: ${eventName}`, parameters);
    }

    // Process batch if queue is full
    if (this.eventQueue.length >= this.config.batchSize) {
      this.processBatch();
    }
  }

  trackPageView(page = window.location.pathname) {
    this.userBehavior.pageViews++;

    this.trackEvent('page_view', {
      page_location: window.location.href,
      page_path: page,
      page_title: document.title,
      referrer: document.referrer,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      connection_type: navigator.connection?.effectiveType || 'unknown',
      is_mobile: /Mobi|Android/i.test(navigator.userAgent)
    });
  }

  trackClick(event) {
    const element = event.target;
    const elementInfo = this.getElementInfo(element);

    this.trackEvent('click', {
      element_type: elementInfo.type,
      element_text: elementInfo.text,
      element_class: elementInfo.className,
      element_id: elementInfo.id,
      page_x: event.pageX,
      page_y: event.pageY,
      target_url: elementInfo.href
    });
  }

  trackSearch(searchData) {
    this.userBehavior.searchQueries.push({
      query: searchData.query,
      timestamp: Date.now(),
      results_count: searchData.resultCount || 0
    });

    this.trackEvent('search', {
      search_term: searchData.query,
      results_count: searchData.resultCount || 0,
      filters_applied: Object.keys(searchData.filters || {}).length,
      search_duration: searchData.duration || 0
    });
  }

  trackContentView(contentData) {
    const contentKey = `${contentData.type}_${contentData.id}`;

    if (!this.userBehavior.contentViews.has(contentKey)) {
      this.userBehavior.contentViews.set(contentKey, {
        type: contentData.type,
        id: contentData.id,
        viewCount: 0,
        totalTime: 0,
        firstView: Date.now()
      });
    }

    const content = this.userBehavior.contentViews.get(contentKey);
    content.viewCount++;
    content.lastView = Date.now();

    this.trackEvent('content_view', {
      content_type: contentData.type,
      content_id: contentData.id,
      view_count: content.viewCount,
      time_since_first_view: content.lastView - content.firstView
    });
  }

  trackContentEngagement(contentType, contentId, action) {
    this.trackEvent('content_engagement', {
      content_type: contentType,
      content_id: contentId,
      engagement_action: action,
      time_on_page: this.userBehavior.timeOnPage
    });
  }

  trackFormSubmission(event) {
    const form = event.target;

    this.trackEvent('form_submission', {
      form_id: form.id,
      form_name: form.name,
      form_action: form.action,
      field_count: form.elements.length
    });
  }

  trackScrollDepth() {
    const scrollTop = window.pageYOffset;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / documentHeight) * 100);

    if (scrollPercent > this.userBehavior.scrollDepth) {
      this.userBehavior.scrollDepth = scrollPercent;

      // Track milestone scroll depths
      const milestones = [25, 50, 75, 90, 100];
      const milestone = milestones.find(m => m <= scrollPercent && m > (this.userBehavior.scrollDepth - 25));

      if (milestone) {
        this.trackEvent('scroll_depth', {
          scroll_depth: milestone,
          page_url: window.location.href
        });
      }
    }
  }

  trackPerformanceMetric(metricName, value, additionalData = {}) {
    this.trackEvent('performance_metric', {
      metric_name: metricName,
      metric_value: value,
      ...additionalData
    });
  }

  trackError(errorType, errorData) {
    this.trackEvent('error', {
      error_type: errorType,
      ...errorData,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      timestamp: Date.now()
    });
  }

  trackSessionEnd() {
    const sessionDuration = Date.now() - this.startTime;

    this.trackEvent('session_end', {
      session_duration: sessionDuration,
      page_views: this.userBehavior.pageViews,
      interactions: this.userBehavior.interactions,
      search_count: this.userBehavior.searchQueries.length,
      content_views: this.userBehavior.contentViews.size,
      max_scroll_depth: this.userBehavior.scrollDepth
    });
  }

  // Batch processing
  processBatch(immediate = false) {
    if (this.eventQueue.length === 0) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    if (this.config.enableCustomAnalytics) {
      this.sendCustomAnalytics(batch, immediate);
    }
  }

  async sendCustomAnalytics(events, immediate = false) {
    const payload = {
      session_id: this.sessionId,
      user_id: this.userId,
      events,
      metadata: {
        user_agent: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink
        } : null
      }
    };

    try {
      if (immediate && navigator.sendBeacon) {
        // Use sendBeacon for immediate sending (e.g., page unload)
        navigator.sendBeacon('/api/analytics', JSON.stringify(payload));
      } else {
        // Regular fetch for normal batching
        await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }

      console.log('📊 Analytics batch sent successfully', events.length, 'events');

    } catch (error) {
      console.error('❌ Analytics batch failed:', error);
      // Re-queue events for retry
      this.eventQueue.unshift(...events);
    }
  }

  flushEventQueue() {
    if (this.eventQueue.length > 0) {
      this.processBatch(true);
    }
  }

  // Utility methods
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getUserId() {
    let userId = localStorage.getItem('portfolio_user_id');

    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('portfolio_user_id', userId);
    }

    return userId;
  }

  getElementInfo(element) {
    return {
      type: element.tagName.toLowerCase(),
      text: element.textContent?.trim().substring(0, 100) || '',
      className: element.className || '',
      id: element.id || '',
      href: element.href || element.closest('a')?.href || ''
    };
  }

  getResourceType(url) {
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(js)$/)) return 'script';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'font';
    if (url.match(/\.(json)$/)) return 'fetch';
    return 'other';
  }

  // Public API methods
  getAnalyticsData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      userBehavior: this.userBehavior,
      performanceMetrics: Object.fromEntries(this.performanceMetrics),
      queueSize: this.eventQueue.length
    };
  }

  getPerformanceReport() {
    const metrics = Object.fromEntries(this.performanceMetrics);

    return {
      coreWebVitals: {
        LCP: metrics.LCP,
        FID: metrics.FID,
        CLS: metrics.CLS,
        FCP: metrics.FCP
      },
      customMetrics: {
        sessionDuration: Date.now() - this.startTime,
        pageViews: this.userBehavior.pageViews,
        interactions: this.userBehavior.interactions,
        scrollDepth: this.userBehavior.scrollDepth
      },
      recommendations: this.generatePerformanceRecommendations(metrics)
    };
  }

  generatePerformanceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.LCP > 2500) {
      recommendations.push('Large Contentful Paint is slow. Consider optimizing images and critical resources.');
    }

    if (metrics.FID > 100) {
      recommendations.push('First Input Delay is high. Consider reducing JavaScript execution time.');
    }

    if (metrics.CLS > 0.1) {
      recommendations.push('Cumulative Layout Shift is too high. Check for layout shifts caused by images or ads.');
    }

    return recommendations;
  }

  enableDebugMode() {
    this.config.enableDebugLogging = true;
    console.log('🔍 Analytics debug mode enabled');
  }

  disableDebugMode() {
    this.config.enableDebugLogging = false;
    console.log('🔍 Analytics debug mode disabled');
  }
}