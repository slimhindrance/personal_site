#!/usr/bin/env node

/**
 * Site Metadata Generation Script
 * Generates comprehensive site metadata and navigation data
 */

const fs = require('fs').promises;
const path = require('path');

class MetadataGenerator {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.outputFile = path.join(this.dataDir, 'site-metadata.json');
    this.searchIndexFile = path.join(this.dataDir, 'search-index.json');

    this.siteUrl = process.env.SITE_URL || 'https://your-site.github.io';
    this.buildTimestamp = process.env.BUILD_TIMESTAMP || Date.now().toString();
  }

  async generate() {
    console.log('🔧 Generating site metadata...');

    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // Load all content data
      const contentData = await this.loadContentData();

      // Generate metadata
      const metadata = await this.generateSiteMetadata(contentData);

      // Generate search index
      const searchIndex = this.generateSearchIndex(contentData);

      // Write outputs
      await this.writeMetadata(metadata);
      await this.writeSearchIndex(searchIndex);

      console.log('✅ Site metadata generated successfully');

    } catch (error) {
      console.error('❌ Error generating metadata:', error.message);
      process.exit(1);
    }
  }

  async loadContentData() {
    const contentFiles = ['projects.json', 'papers.json', 'testimonials.json'];
    const data = {};

    for (const file of contentFiles) {
      const filePath = path.join(this.dataDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const type = path.basename(file, '.json');
        data[type] = JSON.parse(content);
      } catch (error) {
        console.warn(`⚠️  Could not load ${file}: ${error.message}`);
        data[path.basename(file, '.json')] = { [path.basename(file, '.json')]: [], metadata: {} };
      }
    }

    return data;
  }

  async generateSiteMetadata(contentData) {
    const now = new Date();

    // Calculate content statistics
    const stats = this.calculateContentStatistics(contentData);

    // Generate navigation data
    const navigation = this.generateNavigation(contentData);

    // Generate SEO data
    const seo = this.generateSEOData(contentData, stats);

    // Generate sitemap data
    const sitemap = this.generateSitemapData(contentData);

    // Generate RSS feed data
    const rss = this.generateRSSData(contentData);

    // Generate performance metrics
    const performance = await this.generatePerformanceMetrics();

    return {
      site: {
        url: this.siteUrl,
        name: 'Christopher Lindeman Portfolio',
        description: 'Software Engineer & AI Researcher Portfolio',
        author: 'Christopher Lindeman',
        buildId: this.buildTimestamp,
        buildDate: now.toISOString(),
        version: '2.0.0',
        generator: 'Custom GitHub Actions Pipeline'
      },
      content: {
        statistics: stats,
        lastUpdated: this.getLatestUpdateDate(contentData),
        totalItems: stats.projects.total + stats.papers.total + stats.testimonials.total
      },
      navigation,
      seo,
      sitemap,
      rss,
      performance,
      build: {
        timestamp: now.toISOString(),
        buildId: this.buildTimestamp,
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'production',
        commit: process.env.GITHUB_SHA || 'unknown',
        workflow: process.env.GITHUB_WORKFLOW || 'local'
      }
    };
  }

  calculateContentStatistics(contentData) {
    const projects = contentData.projects?.projects || [];
    const papers = contentData.papers?.papers || [];
    const testimonials = contentData.testimonials?.testimonials || [];

    return {
      projects: {
        total: projects.length,
        featured: projects.filter(p => p.featured).length,
        technologies: this.extractUniqueTechnologies(projects),
        averageWordsPerProject: this.calculateAverageWords(projects)
      },
      papers: {
        total: papers.length,
        totalPages: papers.reduce((sum, p) => sum + (p.metadata.pageCount || 0), 0),
        categories: this.extractUniqueCategories(papers),
        totalSizeBytes: papers.reduce((sum, p) => sum + (p.metadata.fileSize || 0), 0)
      },
      testimonials: {
        total: testimonials.length,
        featured: testimonials.filter(t => t.featured).length,
        verified: testimonials.filter(t => t.verified).length,
        averageRating: this.calculateAverageRating(testimonials),
        averageWordsPerTestimonial: this.calculateAverageWords(testimonials)
      },
      overall: {
        totalContent: projects.length + papers.length + testimonials.length,
        lastUpdated: this.getLatestUpdateDate(contentData),
        contentTypes: 3
      }
    };
  }

  generateNavigation(contentData) {
    const projects = contentData.projects?.projects || [];
    const papers = contentData.papers?.papers || [];
    const testimonials = contentData.testimonials?.testimonials || [];

    return {
      primary: [
        {
          label: 'Home',
          url: '/',
          type: 'page'
        },
        {
          label: 'Projects',
          url: '/projects.html',
          type: 'page',
          count: projects.length,
          featured: projects.filter(p => p.featured).length
        },
        {
          label: 'Research',
          url: '/research.html',
          type: 'page',
          count: papers.length,
          categories: this.extractUniqueCategories(papers).length
        },
        {
          label: 'Testimonials',
          url: '/testimonials.html',
          type: 'page',
          count: testimonials.length,
          averageRating: this.calculateAverageRating(testimonials)
        },
        {
          label: 'Resume',
          url: '/resume.html',
          type: 'page'
        },
        {
          label: 'Contact',
          url: '/contact.html',
          type: 'page'
        }
      ],
      breadcrumbs: {
        home: [{ label: 'Home', url: '/' }],
        projects: [
          { label: 'Home', url: '/' },
          { label: 'Projects', url: '/projects.html' }
        ],
        research: [
          { label: 'Home', url: '/' },
          { label: 'Research', url: '/research.html' }
        ],
        testimonials: [
          { label: 'Home', url: '/' },
          { label: 'Testimonials', url: '/testimonials.html' }
        ]
      },
      categories: {
        projects: this.extractProjectCategories(projects),
        papers: this.extractPaperCategories(papers),
        technologies: this.extractTechnologies(projects)
      }
    };
  }

  generateSEOData(contentData, stats) {
    const projects = contentData.projects?.projects || [];
    const papers = contentData.papers?.papers || [];
    const testimonials = contentData.testimonials?.testimonials || [];

    return {
      meta: {
        title: 'Christopher Lindeman - Software Engineer & AI Researcher',
        description: `Portfolio showcasing ${stats.projects.total} projects, ${stats.papers.total} research papers, and ${stats.testimonials.total} client testimonials. Specializing in AI, machine learning, and software development.`,
        keywords: [
          'software engineer',
          'AI researcher',
          'machine learning',
          'portfolio',
          'projects',
          'research papers',
          ...this.extractUniqueTechnologies(projects).slice(0, 10)
        ],
        author: 'Christopher Lindeman',
        robots: 'index, follow',
        canonical: this.siteUrl
      },
      openGraph: {
        type: 'website',
        url: this.siteUrl,
        title: 'Christopher Lindeman Portfolio',
        description: `Software Engineer & AI Researcher with ${stats.projects.total} projects and ${stats.papers.total} publications`,
        siteName: 'Christopher Lindeman Portfolio',
        locale: 'en_US'
      },
      twitterCard: {
        card: 'summary_large_image',
        site: '@your_twitter_handle', // Update with actual handle
        creator: '@your_twitter_handle',
        title: 'Christopher Lindeman Portfolio',
        description: 'Software Engineer & AI Researcher Portfolio'
      },
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Christopher Lindeman',
        jobTitle: 'Software Engineer & AI Researcher',
        url: this.siteUrl,
        sameAs: [
          // Add social media profiles
        ],
        knowsAbout: this.extractUniqueTechnologies(projects).slice(0, 15),
        numberOfProjects: stats.projects.total,
        numberOfPublications: stats.papers.total
      }
    };
  }

  generateSitemapData(contentData) {
    const projects = contentData.projects?.projects || [];
    const papers = contentData.papers?.papers || [];
    const testimonials = contentData.testimonials?.testimonials || [];

    const urls = [
      {
        url: this.siteUrl + '/',
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: '1.0'
      },
      {
        url: this.siteUrl + '/projects.html',
        lastmod: this.getLatestUpdateDate({ projects: contentData.projects }),
        changefreq: 'weekly',
        priority: '0.9'
      },
      {
        url: this.siteUrl + '/research.html',
        lastmod: this.getLatestUpdateDate({ papers: contentData.papers }),
        changefreq: 'monthly',
        priority: '0.8'
      },
      {
        url: this.siteUrl + '/testimonials.html',
        lastmod: this.getLatestUpdateDate({ testimonials: contentData.testimonials }),
        changefreq: 'monthly',
        priority: '0.7'
      },
      {
        url: this.siteUrl + '/resume.html',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.8'
      },
      {
        url: this.siteUrl + '/contact.html',
        lastmod: new Date().toISOString(),
        changefreq: 'yearly',
        priority: '0.6'
      }
    ];

    return {
      urls,
      totalUrls: urls.length,
      lastGenerated: new Date().toISOString()
    };
  }

  generateRSSData(contentData) {
    const allContent = [];

    // Add projects
    const projects = contentData.projects?.projects || [];
    projects.forEach(project => {
      allContent.push({
        title: project.title,
        description: project.description || project.excerpt,
        url: `${this.siteUrl}/projects.html#${project.slug}`,
        date: project.date,
        category: 'Project',
        type: 'project'
      });
    });

    // Add papers
    const papers = contentData.papers?.papers || [];
    papers.forEach(paper => {
      allContent.push({
        title: paper.title,
        description: paper.abstract,
        url: `${this.siteUrl}/research.html#${paper.slug}`,
        date: paper.date,
        category: paper.category,
        type: 'paper'
      });
    });

    // Sort by date (newest first)
    allContent.sort((a, b) => new Date(b.date) - new Date(a.date));

    return {
      title: 'Christopher Lindeman Portfolio - Latest Updates',
      description: 'Latest projects and research from Christopher Lindeman',
      url: this.siteUrl,
      items: allContent.slice(0, 20), // Latest 20 items
      lastBuildDate: new Date().toISOString(),
      totalItems: allContent.length
    };
  }

  async generatePerformanceMetrics() {
    // Calculate data file sizes
    const dataFiles = ['projects.json', 'papers.json', 'testimonials.json'];
    let totalDataSize = 0;

    for (const file of dataFiles) {
      try {
        const filePath = path.join(this.dataDir, file);
        const stats = await fs.stat(filePath);
        totalDataSize += stats.size;
      } catch {
        // File doesn't exist
      }
    }

    return {
      dataSize: {
        total: totalDataSize,
        totalHuman: this.formatBytes(totalDataSize),
        breakdown: await this.getDataFileSizes()
      },
      buildTime: new Date().toISOString(),
      compressionRecommended: totalDataSize > 100000, // > 100KB
      estimatedLoadTime: this.estimateLoadTime(totalDataSize)
    };
  }

  async getDataFileSizes() {
    const files = ['projects.json', 'papers.json', 'testimonials.json', 'site-metadata.json'];
    const sizes = {};

    for (const file of files) {
      try {
        const filePath = path.join(this.dataDir, file);
        const stats = await fs.stat(filePath);
        sizes[file] = {
          bytes: stats.size,
          human: this.formatBytes(stats.size)
        };
      } catch {
        sizes[file] = { bytes: 0, human: '0 B' };
      }
    }

    return sizes;
  }

  generateSearchIndex(contentData) {
    const searchItems = [];

    // Index projects
    const projects = contentData.projects?.projects || [];
    projects.forEach(project => {
      searchItems.push({
        id: `project-${project.id}`,
        type: 'project',
        title: project.title,
        content: `${project.description || project.excerpt} ${project.tech.join(' ')}`,
        url: `/projects.html#${project.slug}`,
        tags: project.tech,
        category: project.category || 'project',
        date: project.date,
        featured: project.featured
      });
    });

    // Index papers
    const papers = contentData.papers?.papers || [];
    papers.forEach(paper => {
      searchItems.push({
        id: `paper-${paper.id}`,
        type: 'paper',
        title: paper.title,
        content: paper.abstract,
        url: `/research.html#${paper.slug}`,
        tags: paper.tags,
        category: paper.category,
        date: paper.date,
        featured: false
      });
    });

    // Index testimonials
    const testimonials = contentData.testimonials?.testimonials || [];
    testimonials.forEach(testimonial => {
      searchItems.push({
        id: `testimonial-${testimonial.id}`,
        type: 'testimonial',
        title: `Testimonial from ${testimonial.author.name}`,
        content: testimonial.content,
        url: `/testimonials.html#${testimonial.slug}`,
        tags: [testimonial.author.company, testimonial.project].filter(Boolean),
        category: 'testimonial',
        date: testimonial.date,
        featured: testimonial.featured
      });
    });

    return {
      items: searchItems,
      metadata: {
        totalItems: searchItems.length,
        types: {
          projects: searchItems.filter(item => item.type === 'project').length,
          papers: searchItems.filter(item => item.type === 'paper').length,
          testimonials: searchItems.filter(item => item.type === 'testimonial').length
        },
        lastGenerated: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  // Utility methods
  extractUniqueTechnologies(projects) {
    const technologies = new Set();
    projects.forEach(project => {
      if (Array.isArray(project.tech)) {
        project.tech.forEach(tech => technologies.add(tech));
      }
    });
    return Array.from(technologies).sort();
  }

  extractUniqueCategories(items) {
    const categories = new Set();
    items.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    return Array.from(categories).sort();
  }

  extractProjectCategories(projects) {
    const categories = {};
    projects.forEach(project => {
      const category = project.category || 'Other';
      categories[category] = (categories[category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, count]) => ({ name, count }));
  }

  extractPaperCategories(papers) {
    const categories = {};
    papers.forEach(paper => {
      const category = paper.category || 'Other';
      categories[category] = (categories[category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, count]) => ({ name, count }));
  }

  extractTechnologies(projects) {
    const technologies = {};
    projects.forEach(project => {
      if (Array.isArray(project.tech)) {
        project.tech.forEach(tech => {
          technologies[tech] = (technologies[tech] || 0) + 1;
        });
      }
    });
    return Object.entries(technologies)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  calculateAverageWords(items) {
    if (items.length === 0) return 0;
    const totalWords = items.reduce((sum, item) => {
      return sum + (item.metadata?.wordCount || 0);
    }, 0);
    return Math.round(totalWords / items.length);
  }

  calculateAverageRating(testimonials) {
    const ratedTestimonials = testimonials.filter(t => t.rating !== null);
    if (ratedTestimonials.length === 0) return null;
    const sum = ratedTestimonials.reduce((acc, t) => acc + t.rating, 0);
    return Math.round((sum / ratedTestimonials.length) * 10) / 10;
  }

  getLatestUpdateDate(contentData) {
    const dates = [];

    Object.values(contentData).forEach(typeData => {
      if (typeData.metadata?.lastUpdated) {
        dates.push(new Date(typeData.metadata.lastUpdated));
      }
    });

    if (dates.length === 0) return new Date().toISOString();

    return new Date(Math.max(...dates)).toISOString();
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  estimateLoadTime(bytes) {
    // Estimate load time for 3G connection (1.6 Mbps)
    const bitsPerSecond = 1600000;
    const bytesPerSecond = bitsPerSecond / 8;
    const seconds = bytes / bytesPerSecond;

    if (seconds < 1) return 'Under 1 second';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    return `${Math.round(seconds / 60)} minutes`;
  }

  async writeMetadata(metadata) {
    await fs.writeFile(this.outputFile, JSON.stringify(metadata, null, 2));
    console.log(`📄 Generated: ${this.outputFile}`);
  }

  async writeSearchIndex(searchIndex) {
    await fs.writeFile(this.searchIndexFile, JSON.stringify(searchIndex, null, 2));
    console.log(`🔍 Generated: ${this.searchIndexFile}`);
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new MetadataGenerator();
  generator.generate();
}

module.exports = MetadataGenerator;