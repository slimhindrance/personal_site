/**
 * SEO Manager - Search Engine Optimization and Meta Tag Management
 * Handles dynamic meta tags, structured data, and social sharing optimization
 */

export class SEOManager {
  constructor() {
    this.baseTitle = 'Chris Lindeman - Technical Solutions Expert';
    this.baseDescription = 'Professional portfolio showcasing data science, AI solutions, and technical expertise. Explore projects, research papers, and client testimonials.';
    this.baseKeywords = 'data science, AI, machine learning, technical solutions, portfolio, projects, research';
    this.siteUrl = window.location.origin;
    this.defaultImage = '/assets/images/og-default.jpg';

    this.currentPage = {
      title: this.baseTitle,
      description: this.baseDescription,
      keywords: this.baseKeywords,
      image: this.defaultImage,
      url: window.location.href,
      type: 'website'
    };
  }

  init() {
    console.log('🔍 SEO Manager: Initializing...');

    // Set initial meta tags
    this.setBasicMetaTags();
    this.setOpenGraphTags();
    this.setTwitterCardTags();
    this.setStructuredData();

    // Setup dynamic updates
    this.setupDynamicUpdates();

    // Setup canonical URLs
    this.setupCanonicalUrls();

    console.log('✅ SEO Manager: Initialized');
  }

  setBasicMetaTags() {
    // Basic HTML meta tags
    this.setMetaTag('description', this.currentPage.description);
    this.setMetaTag('keywords', this.currentPage.keywords);
    this.setMetaTag('author', 'Chris Lindeman');
    this.setMetaTag('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    this.setMetaTag('googlebot', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

    // Viewport and mobile optimization
    this.setMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no');
    this.setMetaTag('theme-color', '#3b82f6');
    this.setMetaTag('msapplication-TileColor', '#3b82f6');

    // Language and locale
    this.setMetaTag('language', 'en-US');
    this.setMetaTag('geo.region', 'US');
    this.setMetaTag('geo.placename', 'United States');

    // Content classification
    this.setMetaTag('rating', 'general');
    this.setMetaTag('distribution', 'global');
    this.setMetaTag('revisit-after', '7 days');
  }

  setOpenGraphTags() {
    // Open Graph Protocol for social sharing
    this.setMetaProperty('og:title', this.currentPage.title);
    this.setMetaProperty('og:description', this.currentPage.description);
    this.setMetaProperty('og:image', this.currentPage.image);
    this.setMetaProperty('og:url', this.currentPage.url);
    this.setMetaProperty('og:type', this.currentPage.type);
    this.setMetaProperty('og:site_name', 'Chris Lindeman Portfolio');
    this.setMetaProperty('og:locale', 'en_US');

    // Additional OG tags
    this.setMetaProperty('og:image:width', '1200');
    this.setMetaProperty('og:image:height', '630');
    this.setMetaProperty('og:image:type', 'image/jpeg');
    this.setMetaProperty('og:updated_time', new Date().toISOString());
  }

  setTwitterCardTags() {
    // Twitter Card meta tags
    this.setMetaName('twitter:card', 'summary_large_image');
    this.setMetaName('twitter:title', this.currentPage.title);
    this.setMetaName('twitter:description', this.currentPage.description);
    this.setMetaName('twitter:image', this.currentPage.image);
    this.setMetaName('twitter:url', this.currentPage.url);
    this.setMetaName('twitter:site', '@chrislindeman'); // Add your Twitter handle
    this.setMetaName('twitter:creator', '@chrislindeman');

    // Additional Twitter tags
    this.setMetaName('twitter:image:alt', 'Chris Lindeman - Technical Solutions Expert');
    this.setMetaName('twitter:domain', new URL(this.siteUrl).hostname);
  }

  setStructuredData() {
    // JSON-LD structured data for rich snippets
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Person',
          '@id': `${this.siteUrl}#person`,
          'name': 'Chris Lindeman',
          'url': this.siteUrl,
          'image': {
            '@type': 'ImageObject',
            'url': `${this.siteUrl}/assets/images/landing_image.tiff`,
            'width': 800,
            'height': 800
          },
          'jobTitle': 'Technical Solutions Expert',
          'worksFor': {
            '@type': 'Organization',
            'name': 'Independent Consultant'
          },
          'description': 'Data scientist and AI strategist specializing in technical solutions, machine learning, and business process optimization.',
          'knowsAbout': [
            'Data Science',
            'Artificial Intelligence',
            'Machine Learning',
            'Business Intelligence',
            'Technical Solutions',
            'Process Optimization'
          ],
          'sameAs': [
            'https://github.com/slimhindrance',
            'https://linkedin.com/in/chrislindeman',
            'mailto:chris@clindeman.com'
          ]
        },
        {
          '@type': 'WebSite',
          '@id': `${this.siteUrl}#website`,
          'url': this.siteUrl,
          'name': 'Chris Lindeman Portfolio',
          'description': this.baseDescription,
          'author': {
            '@id': `${this.siteUrl}#person`
          },
          'inLanguage': 'en-US',
          'potentialAction': {
            '@type': 'SearchAction',
            'target': {
              '@type': 'EntryPoint',
              'urlTemplate': `${this.siteUrl}/?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
          }
        },
        {
          '@type': 'WebPage',
          '@id': `${this.currentPage.url}#webpage`,
          'url': this.currentPage.url,
          'name': this.currentPage.title,
          'description': this.currentPage.description,
          'isPartOf': {
            '@id': `${this.siteUrl}#website`
          },
          'about': {
            '@id': `${this.siteUrl}#person`
          },
          'dateModified': new Date().toISOString(),
          'breadcrumb': {
            '@type': 'BreadcrumbList',
            'itemListElement': this.generateBreadcrumbs()
          }
        }
      ]
    };

    this.setStructuredDataScript(structuredData);
  }

  updatePageSEO(pageData) {
    console.log('🔍 SEO Manager: Updating page SEO', pageData);

    // Update current page data
    this.currentPage = {
      title: pageData.title || this.baseTitle,
      description: pageData.description || this.baseDescription,
      keywords: pageData.keywords || this.baseKeywords,
      image: pageData.image || this.defaultImage,
      url: pageData.url || window.location.href,
      type: pageData.type || 'website'
    };

    // Update document title
    document.title = this.currentPage.title;

    // Update meta tags
    this.setBasicMetaTags();
    this.setOpenGraphTags();
    this.setTwitterCardTags();
    this.setStructuredData();

    // Update canonical URL
    this.updateCanonicalUrl(this.currentPage.url);
  }

  updateContentSEO(contentType, contentData) {
    console.log(`🔍 SEO Manager: Updating ${contentType} SEO`, contentData);

    let seoData = {};

    switch (contentType) {
      case 'project':
        seoData = this.generateProjectSEO(contentData);
        break;
      case 'paper':
        seoData = this.generatePaperSEO(contentData);
        break;
      case 'testimonial':
        seoData = this.generateTestimonialSEO(contentData);
        break;
      default:
        return;
    }

    this.updatePageSEO(seoData);
    this.setContentStructuredData(contentType, contentData);
  }

  generateProjectSEO(project) {
    const title = `${project.title} - ${this.baseTitle}`;
    const description = project.description ||
      `Explore ${project.title}, a ${project.category || 'technical'} project showcasing ${(project.technologies || []).join(', ')}.`;

    const keywords = [
      this.baseKeywords,
      project.category,
      ...(project.technologies || []),
      ...(project.keywords || [])
    ].filter(Boolean).join(', ');

    return {
      title,
      description: this.truncateDescription(description),
      keywords,
      image: project.featured_image || project.image || this.defaultImage,
      type: 'article',
      url: `${this.siteUrl}#projects/${project.id || project.slug}`
    };
  }

  generatePaperSEO(paper) {
    const title = `${paper.title} - Research Paper - ${this.baseTitle}`;
    const description = paper.abstract || paper.description ||
      `Research paper: ${paper.title}${paper.authors ? ` by ${paper.authors.join(', ')}` : ''}`;

    const keywords = [
      this.baseKeywords,
      'research',
      'academic paper',
      ...(paper.keywords || []),
      ...(paper.authors || [])
    ].filter(Boolean).join(', ');

    return {
      title,
      description: this.truncateDescription(description),
      keywords,
      image: this.defaultImage,
      type: 'article',
      url: `${this.siteUrl}#papers/${paper.id || paper.slug}`
    };
  }

  generateTestimonialSEO(testimonial) {
    const title = `Client Testimonial from ${testimonial.client_name} - ${this.baseTitle}`;
    const description = `Client testimonial: "${this.truncateDescription(testimonial.content, 120)}" - ${testimonial.client_name}`;

    const keywords = [
      this.baseKeywords,
      'testimonial',
      'client feedback',
      'review'
    ].filter(Boolean).join(', ');

    return {
      title,
      description,
      keywords,
      image: this.defaultImage,
      type: 'article',
      url: `${this.siteUrl}#testimonials/${testimonial.id || testimonial.slug}`
    };
  }

  setContentStructuredData(contentType, contentData) {
    let structuredData = {};

    switch (contentType) {
      case 'project':
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          'name': contentData.title,
          'description': contentData.description,
          'author': {
            '@type': 'Person',
            'name': 'Chris Lindeman'
          },
          'dateCreated': contentData.date,
          'keywords': (contentData.technologies || []).concat(contentData.keywords || []),
          'url': `${this.siteUrl}#projects/${contentData.id || contentData.slug}`,
          'image': contentData.featured_image || contentData.image,
          'programmingLanguage': contentData.technologies
        };
        break;

      case 'paper':
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'ScholarlyArticle',
          'name': contentData.title,
          'abstract': contentData.abstract,
          'author': (contentData.authors || ['Chris Lindeman']).map(author => ({
            '@type': 'Person',
            'name': author
          })),
          'datePublished': contentData.year || contentData.date,
          'keywords': contentData.keywords,
          'url': `${this.siteUrl}#papers/${contentData.id || contentData.slug}`,
          'publisher': contentData.journal ? {
            '@type': 'Organization',
            'name': contentData.journal
          } : undefined
        };
        break;

      case 'testimonial':
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Review',
          'reviewBody': contentData.content,
          'author': {
            '@type': 'Person',
            'name': contentData.client_name,
            'jobTitle': contentData.client_title
          },
          'itemReviewed': {
            '@type': 'Service',
            'name': 'Technical Solutions Consulting',
            'provider': {
              '@type': 'Person',
              'name': 'Chris Lindeman'
            }
          },
          'reviewRating': contentData.rating ? {
            '@type': 'Rating',
            'ratingValue': contentData.rating,
            'bestRating': 5
          } : undefined,
          'datePublished': contentData.date
        };
        break;
    }

    if (Object.keys(structuredData).length > 0) {
      this.setStructuredDataScript(structuredData, `${contentType}-data`);
    }
  }

  setupDynamicUpdates() {
    // Listen for URL changes (for SPAs)
    let lastUrl = window.location.href;

    const observer = new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        this.handleUrlChange();
      }
    });

    observer.observe(document, { subtree: true, childList: true });

    // Listen for hash changes
    window.addEventListener('hashchange', this.handleUrlChange.bind(this));

    // Listen for custom content update events
    document.addEventListener('contentUpdated', (event) => {
      if (event.detail) {
        this.updateContentSEO(event.detail.type, event.detail.data);
      }
    });
  }

  handleUrlChange() {
    const hash = window.location.hash;

    if (hash) {
      const [type, id] = hash.slice(1).split('/');

      if (type && id && ['projects', 'papers', 'testimonials'].includes(type)) {
        // Load content data and update SEO
        this.loadContentForSEO(type, id);
      }
    } else {
      // Reset to homepage SEO
      this.updatePageSEO({
        title: this.baseTitle,
        description: this.baseDescription,
        url: this.siteUrl
      });
    }
  }

  async loadContentForSEO(type, id) {
    try {
      const response = await fetch(`/data/${type}.json`);
      const content = await response.json();
      const item = content.find(item =>
        (item.id && item.id === id) ||
        (item.slug && item.slug === id) ||
        (item.title && item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id)
      );

      if (item) {
        this.updateContentSEO(type.slice(0, -1), item); // Remove 's' from type
      }
    } catch (error) {
      console.warn('Failed to load content for SEO:', error);
    }
  }

  setupCanonicalUrls() {
    this.updateCanonicalUrl(window.location.href);
  }

  updateCanonicalUrl(url) {
    let canonical = document.querySelector('link[rel="canonical"]');

    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }

    // Clean URL (remove fragments for canonical)
    const cleanUrl = url.split('#')[0];
    canonical.href = cleanUrl;
  }

  generateBreadcrumbs() {
    const breadcrumbs = [{
      '@type': 'ListItem',
      'position': 1,
      'name': 'Home',
      'item': this.siteUrl
    }];

    const hash = window.location.hash;
    if (hash) {
      const [type, id] = hash.slice(1).split('/');

      if (type) {
        breadcrumbs.push({
          '@type': 'ListItem',
          'position': 2,
          'name': this.capitalize(type),
          'item': `${this.siteUrl}#${type}`
        });

        if (id) {
          breadcrumbs.push({
            '@type': 'ListItem',
            'position': 3,
            'name': this.currentPage.title.split(' - ')[0],
            'item': this.currentPage.url
          });
        }
      }
    }

    return breadcrumbs;
  }

  // Utility methods
  setMetaTag(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);

    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }

    meta.content = content;
  }

  setMetaProperty(property, content) {
    let meta = document.querySelector(`meta[property="${property}"]`);

    if (!meta) {
      meta = document.createElement('meta');
      meta.property = property;
      document.head.appendChild(meta);
    }

    meta.content = content;
  }

  setMetaName(name, content) {
    let meta = document.querySelector(`meta[name="${name}"]`);

    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }

    meta.content = content;
  }

  setStructuredDataScript(data, id = 'structured-data') {
    // Remove existing structured data script
    const existing = document.querySelector(`script[data-schema="${id}"]`);
    if (existing) {
      existing.remove();
    }

    // Add new structured data script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema', id);
    script.textContent = JSON.stringify(data, null, 2);
    document.head.appendChild(script);
  }

  truncateDescription(text, maxLength = 160) {
    if (!text) return '';

    if (text.length <= maxLength) return text;

    return text.substring(0, maxLength - 3).trim() + '...';
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Social sharing methods
  generateSocialShareUrls(title, description, url) {
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    const encodedUrl = encodeURIComponent(url);

    return {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
      copy: url
    };
  }

  // Analytics and tracking
  trackSEOEvent(event, data = {}) {
    if (typeof gtag !== 'undefined') {
      gtag('event', event, {
        event_category: 'SEO',
        ...data
      });
    }

    console.log(`📊 SEO Event: ${event}`, data);
  }

  // Performance monitoring
  measureSEOPerformance() {
    const metrics = {
      metaTagsCount: document.querySelectorAll('meta').length,
      structuredDataCount: document.querySelectorAll('script[type="application/ld+json"]').length,
      titleLength: document.title.length,
      descriptionLength: document.querySelector('meta[name="description"]')?.content?.length || 0,
      hasCanonical: !!document.querySelector('link[rel="canonical"]'),
      hasOpenGraph: !!document.querySelector('meta[property^="og:"]'),
      hasTwitterCard: !!document.querySelector('meta[name^="twitter:"]')
    };

    console.log('📊 SEO Performance Metrics:', metrics);
    return metrics;
  }
}