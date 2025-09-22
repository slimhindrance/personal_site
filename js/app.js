/**
 * Main Application Entry Point
 * Initializes the dynamic portfolio system with modern component architecture
 */

import { globalState } from './core/StateManager.js';
import { imageOptimizer } from './utils/ImageOptimizer.js';
import ProjectGallery from './components/ProjectGallery.js';

class PortfolioApp {
  constructor() {
    this.components = new Map();
    this.isInitialized = false;

    // Bind methods
    this.init = this.init.bind(this);
    this.loadData = this.loadData.bind(this);
    this.initializeComponents = this.initializeComponents.bind(this);
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // Set loading state
      globalState.set('app.loading', true);

      // Initialize performance monitoring
      this.startPerformanceMonitoring();

      // Load application data
      await this.loadData();

      // Initialize image optimization
      this.initializeImageOptimization();

      // Initialize components
      this.initializeComponents();

      // Set up global event listeners
      this.setupGlobalEvents();

      // Mark as initialized
      this.isInitialized = true;
      globalState.set('app.loading', false);
      globalState.set('app.initialized', true);

      console.log('Portfolio app initialized successfully');
    } catch (error) {
      console.error('Failed to initialize portfolio app:', error);
      globalState.set('app.error', error.message);
      globalState.set('app.loading', false);
    }
  }

  async loadData() {
    try {
      // Load data in parallel for better performance
      const [projectsData, papersData, testimonialsData, personalData] = await Promise.all([
        this.fetchData('/data/projects.json'),
        this.fetchData('/data/papers.json'),
        this.fetchData('/data/testimonials.json'),
        this.fetchData('/data/personal.json')
      ]);

      // Update global state with loaded data
      globalState.batch(() => {
        globalState.set('projects', projectsData);
        globalState.set('papers', papersData);
        globalState.set('testimonials', testimonialsData);
        globalState.set('personal', personalData);
      });

      console.log('Application data loaded successfully');
    } catch (error) {
      console.warn('Failed to load some data files, using fallback data:', error);
      this.loadFallbackData();
    }
  }

  async fetchData(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch ${url}:`, error);
      return null;
    }
  }

  loadFallbackData() {
    // Fallback data in case JSON files aren't available yet
    const fallbackProjects = [
      {
        id: 'emotion-detector',
        title: 'Linguistic Emotion Detector',
        description: 'Advanced NLP system for detecting emotional content in text using machine learning algorithms.',
        image: 'emotion_detector.tiff',
        category: 'machine-learning',
        technologies: ['Python', 'NLTK', 'TensorFlow', 'scikit-learn'],
        status: 'completed',
        featured: true,
        date: '2024-03-15',
        links: {
          github: 'https://github.com/slimhindrance',
          demo: '#'
        }
      },
      {
        id: 'sentiment-analyzer',
        title: 'Sentiment Analyzer',
        description: 'Real-time sentiment analysis tool for social media monitoring and brand analysis.',
        image: 'sentiment_analyzer.tiff',
        category: 'data-analysis',
        technologies: ['Python', 'Pandas', 'Matplotlib', 'Twitter API'],
        status: 'completed',
        featured: false,
        date: '2024-02-10',
        links: {
          github: 'https://github.com/slimhindrance',
          demo: '#'
        }
      },
      {
        id: 'gap-analyzer',
        title: 'Gap Analysis System',
        description: 'Comprehensive business process analysis tool for identifying operational inefficiencies.',
        image: 'gap_analyzer.tiff',
        category: 'business-intelligence',
        technologies: ['R', 'Shiny', 'ggplot2', 'SQL'],
        status: 'completed',
        featured: false,
        date: '2024-01-20',
        links: {
          github: 'https://github.com/slimhindrance',
          demo: '#'
        }
      },
      {
        id: 'heatmap-visualization',
        title: 'Web & App Development',
        description: 'Interactive 311 service request heatmap visualization for municipal data analysis.',
        image: '311_heatmap.tiff',
        category: 'web-development',
        technologies: ['Python', 'Flask', 'Folium', 'JavaScript'],
        status: 'completed',
        featured: true,
        date: '2023-12-05',
        links: {
          github: 'https://github.com/slimhindrance',
          demo: 'http://slimhindrance.pythonanywhere.com'
        }
      }
    ];

    const fallbackTestimonials = [
      {
        id: 'testimonial-1',
        name: 'Project Manager',
        title: 'Senior Project Manager',
        company: 'Tech Solutions Inc.',
        content: 'The results that came from Chris taking it upon himself to reimagine our business processes led us to cut costs of remedial staff work significantly and improve the speed of customer issue resolution by 3000%. This guy does wonders!',
        image: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?ixid=MXwyMDkyMnwwfDF8c2VhcmNofDE5fHxkb2d8ZW58MHx8fA&ixlib=rb-1.2.1q=85&fm=jpg&crop=faces&cs=srgb&w=400&h=400&fit=crop',
        rating: 5,
        featured: true
      },
      {
        id: 'testimonial-2',
        name: 'Chief Technology Officer',
        title: 'CTO',
        company: 'Innovation Labs',
        content: 'Our flagship product is the result of Chris\' ability to get to the root of the problems and design a comprehensive solution. The foundation he laid allowed us to easily update and improve our process and models.',
        image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?ixid=MXwyMDkyMnwwfDF8c2VhcmNofDd8fGNhdHxlbnwwfHx8&ixlib=rb-1.2.1q=85&fm=jpg&crop=faces&cs=srgb&w=400&h=400&fit=crop',
        rating: 5,
        featured: false
      },
      {
        id: 'testimonial-3',
        name: 'Ayanna Nahmias',
        title: 'Executive Director',
        company: 'ZimFarm Project',
        content: 'We are so excited that we will be able to leverage AI to manage our water usage, measurement, and distribution on the ZimFarm Project | For Women\'s Empowerment Project. Thank you Chris Lindeman!',
        image: 'https://images.unsplash.com/photo-1517101724602-c257fe568157?ixid=MXwyMDkyMnwwfDF8c2VhcmNofDZ8fHBhcnJvdHxlbnwwfHx8&ixlib=rb-1.2.1q=85&fm=jpg&crop=faces&cs=srgb&w=400&h=400&fit=crop',
        rating: 5,
        featured: true
      }
    ];

    const fallbackPersonal = {
      name: 'Chris Lindeman',
      title: 'Technical Solutions Expert',
      subtitle: 'Data Scientist & AI Strategist',
      bio: 'For years, Chris has been building bespoke solutions to everyday and uncommon problems locally and in the cloud, through simple process redesign to complex AI systems integration.',
      experience: 4,
      projectsCompleted: 10,
      degreesEarned: 3,
      email: 'chris@clindeman.com',
      social: {
        github: 'https://github.com/slimhindrance',
        linkedin: '#',
        twitter: '#'
      }
    };

    // Set fallback data
    globalState.batch(() => {
      globalState.set('projects', fallbackProjects);
      globalState.set('testimonials', fallbackTestimonials);
      globalState.set('personal', fallbackPersonal);
      globalState.set('papers', []);
    });

    console.log('Fallback data loaded');
  }

  initializeImageOptimization() {
    // Convert existing TIFF images to optimized versions
    imageOptimizer.optimizeExistingImages();

    // Set up progressive loading for hero image
    const heroImage = document.querySelector('img[src*="landing_image"]');
    if (heroImage) {
      heroImage.setAttribute('data-critical', 'true');
    }
  }

  initializeComponents() {
    // Initialize Project Gallery
    const projectGalleryElement = document.getElementById('projects-gallery');
    if (projectGalleryElement) {
      const projectGallery = new ProjectGallery(projectGalleryElement, {
        layout: 'masonry',
        itemsPerPage: 6,
        enableSearch: true,
        enableFilters: true
      });
      this.components.set('projectGallery', projectGallery);
    }

    // Initialize other components as they're developed
    this.initializeStatsCounters();
    this.initializeTestimonials();
  }

  initializeStatsCounters() {
    // Animate stats counters when they come into view
    const statCounters = document.querySelectorAll('[data-counter]');

    if (statCounters.length > 0 && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      });

      statCounters.forEach(counter => observer.observe(counter));
    }
  }

  animateCounter(element) {
    const target = parseInt(element.textContent.replace(/\D/g, ''));
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }

      element.innerHTML = element.innerHTML.replace(/\d+/, Math.floor(current));
    }, duration / steps);
  }

  initializeTestimonials() {
    // Basic testimonials functionality
    const testimonialsSection = document.getElementById('testimonials');
    if (testimonialsSection) {
      // Add hover effects and accessibility
      const testimonialCards = testimonialsSection.querySelectorAll('.testimonial-card');
      testimonialCards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'article');
      });
    }
  }

  setupGlobalEvents() {
    // Handle component communication
    document.addEventListener('project:open', this.handleProjectOpen.bind(this));

    // Handle keyboard navigation
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));

    // Handle resize events for responsive components
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleResize();
      }, 250);
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAnimations();
      } else {
        this.resumeAnimations();
      }
    });
  }

  handleProjectOpen(event) {
    const { project } = event.detail;
    console.log('Opening project:', project);
    // TODO: Implement project modal
  }

  handleGlobalKeydown(event) {
    // Handle escape key globally
    if (event.key === 'Escape') {
      // Close any open modals or overlays
      const openModals = document.querySelectorAll('.modal.open');
      openModals.forEach(modal => {
        modal.classList.remove('open');
      });
    }
  }

  handleResize() {
    // Notify components of resize
    this.components.forEach(component => {
      if (component.handleResize) {
        component.handleResize();
      }
    });
  }

  pauseAnimations() {
    document.body.classList.add('animations-paused');
  }

  resumeAnimations() {
    document.body.classList.remove('animations-paused');
  }

  startPerformanceMonitoring() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lcp = entries[entries.length - 1];
        globalState.set('performance.lcp', lcp.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          globalState.set('performance.fid', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        globalState.set('performance.cls', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }
  }

  // Public API
  getComponent(name) {
    return this.components.get(name);
  }

  getPerformanceMetrics() {
    return {
      lcp: globalState.get('performance.lcp'),
      fid: globalState.get('performance.fid'),
      cls: globalState.get('performance.cls'),
      images: imageOptimizer.getPerformanceMetrics()
    };
  }

  destroy() {
    // Clean up components
    this.components.forEach(component => {
      if (component.destroy) {
        component.destroy();
      }
    });
    this.components.clear();

    // Clean up global state
    globalState.destroy();

    // Clean up image optimizer
    imageOptimizer.destroy();

    this.isInitialized = false;
  }
}

// Initialize application when DOM is ready
const app = new PortfolioApp();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', app.init);
} else {
  app.init();
}

// Export for global access
window.PortfolioApp = app;
export default PortfolioApp;