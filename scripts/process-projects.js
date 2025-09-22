#!/usr/bin/env node

/**
 * Project Processing Script
 * Processes markdown project files and generates JSON data
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');

class ProjectProcessor {
  constructor() {
    this.contentDir = path.join(process.cwd(), 'content', 'projects');
    this.dataDir = path.join(process.cwd(), 'data');
    this.outputFile = path.join(this.dataDir, 'projects.json');
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });
  }

  async process() {
    console.log('🚀 Processing project files...');

    try {
      // Ensure output directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // Check if content directory exists
      try {
        await fs.access(this.contentDir);
      } catch {
        console.log('📁 No projects directory found, creating empty data file');
        await this.writeOutput([]);
        return;
      }

      const projects = await this.loadProjects();
      const processedProjects = await this.processProjects(projects);

      // Sort projects by date (newest first) and featured status
      const sortedProjects = this.sortProjects(processedProjects);

      await this.writeOutput(sortedProjects);
      await this.generateStatistics(sortedProjects);

      console.log(`✅ Processed ${sortedProjects.length} projects successfully`);

    } catch (error) {
      console.error('❌ Error processing projects:', error.message);
      process.exit(1);
    }
  }

  async loadProjects() {
    const files = await fs.readdir(this.contentDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    if (mdFiles.length === 0) {
      console.log('📝 No project markdown files found');
      return [];
    }

    const projects = [];
    for (const file of mdFiles) {
      try {
        const project = await this.loadProject(file);
        if (project) {
          projects.push(project);
        }
      } catch (error) {
        console.error(`⚠️  Skipping ${file}: ${error.message}`);
      }
    }

    return projects;
  }

  async loadProject(filename) {
    const filePath = path.join(this.contentDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    // Validate required fields
    if (!frontmatter.title || frontmatter.title.trim() === '') {
      throw new Error('Missing required title field');
    }

    // Get file stats for metadata
    const stats = await fs.stat(filePath);

    return {
      filename,
      frontmatter,
      body: body.trim(),
      stats
    };
  }

  async processProjects(projects) {
    const processed = [];

    for (const project of projects) {
      try {
        const processedProject = await this.processProject(project);
        processed.push(processedProject);
      } catch (error) {
        console.error(`⚠️  Error processing ${project.filename}: ${error.message}`);
      }
    }

    return processed;
  }

  async processProject(project) {
    const { frontmatter, body, filename, stats } = project;

    // Generate slug from filename
    const slug = path.basename(filename, '.md');

    // Process markdown content
    const htmlContent = this.md.render(body);
    const excerpt = this.generateExcerpt(body);

    // Validate and process technology stack
    const tech = Array.isArray(frontmatter.tech) ? frontmatter.tech : [];

    // Process links
    const links = this.processLinks(frontmatter.links || {});

    // Process image reference
    const image = await this.processImage(frontmatter.image, slug);

    // Parse and validate date
    const date = this.parseDate(frontmatter.date, stats.mtime);

    // Extract additional metadata
    const status = frontmatter.status || 'completed';
    const featured = Boolean(frontmatter.featured);
    const category = frontmatter.category || 'project';

    return {
      id: slug,
      slug,
      title: frontmatter.title.trim(),
      description: frontmatter.description || excerpt,
      content: htmlContent,
      excerpt,
      tech,
      links,
      image,
      date: date.toISOString(),
      status,
      featured,
      category,
      metadata: {
        filename,
        wordCount: this.countWords(body),
        lastModified: stats.mtime.toISOString(),
        created: date.toISOString()
      }
    };
  }

  processLinks(links) {
    const processedLinks = {};
    const validLinkTypes = ['demo', 'github', 'live', 'documentation', 'source', 'download'];

    for (const [type, url] of Object.entries(links)) {
      if (typeof url === 'string' && url.trim()) {
        processedLinks[type] = {
          url: url.trim(),
          type,
          valid: validLinkTypes.includes(type)
        };
      }
    }

    return processedLinks;
  }

  async processImage(imageName, slug) {
    if (!imageName) return null;

    // Possible image locations
    const possiblePaths = [
      path.join(this.contentDir, 'images', imageName),
      path.join(this.contentDir, imageName),
      path.join(process.cwd(), 'assets', 'images', 'projects', imageName)
    ];

    for (const imagePath of possiblePaths) {
      try {
        const stats = await fs.stat(imagePath);
        if (stats.isFile()) {
          return {
            src: imageName,
            alt: `${slug} project image`,
            path: path.relative(process.cwd(), imagePath),
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          };
        }
      } catch {
        // Continue searching
      }
    }

    console.warn(`⚠️  Image not found: ${imageName} for project ${slug}`);
    return null;
  }

  parseDate(dateString, fallback) {
    if (dateString) {
      const parsed = new Date(dateString);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date(fallback);
  }

  generateExcerpt(content, maxLength = 200) {
    // Remove markdown formatting for excerpt
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .trim();

    if (plainText.length <= maxLength) {
      return plainText;
    }

    return plainText.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  countWords(content) {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  sortProjects(projects) {
    return projects.sort((a, b) => {
      // Featured projects first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      // Then by date (newest first)
      return new Date(b.date) - new Date(a.date);
    });
  }

  async writeOutput(projects) {
    const output = {
      projects,
      metadata: {
        total: projects.length,
        featured: projects.filter(p => p.featured).length,
        technologies: this.extractTechnologies(projects),
        categories: this.extractCategories(projects),
        lastUpdated: new Date().toISOString(),
        buildInfo: {
          nodeVersion: process.version,
          platform: process.platform,
          buildId: process.env.GITHUB_RUN_ID || 'local'
        }
      }
    };

    await fs.writeFile(this.outputFile, JSON.stringify(output, null, 2));
    console.log(`📄 Generated: ${this.outputFile}`);
  }

  extractTechnologies(projects) {
    const techCount = {};
    projects.forEach(project => {
      project.tech.forEach(tech => {
        techCount[tech] = (techCount[tech] || 0) + 1;
      });
    });

    return Object.entries(techCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  extractCategories(projects) {
    const categoryCount = {};
    projects.forEach(project => {
      const category = project.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async generateStatistics(projects) {
    const stats = {
      totalProjects: projects.length,
      featuredProjects: projects.filter(p => p.featured).length,
      averageWordCount: Math.round(
        projects.reduce((sum, p) => sum + p.metadata.wordCount, 0) / projects.length || 0
      ),
      topTechnologies: this.extractTechnologies(projects).slice(0, 10),
      statusBreakdown: this.getStatusBreakdown(projects),
      dateRange: this.getDateRange(projects)
    };

    console.log('📊 Project Statistics:');
    console.log(`  - Total: ${stats.totalProjects}`);
    console.log(`  - Featured: ${stats.featuredProjects}`);
    console.log(`  - Average words: ${stats.averageWordCount}`);
    console.log(`  - Top tech: ${stats.topTechnologies.slice(0, 3).map(t => t.name).join(', ')}`);
  }

  getStatusBreakdown(projects) {
    const breakdown = {};
    projects.forEach(project => {
      breakdown[project.status] = (breakdown[project.status] || 0) + 1;
    });
    return breakdown;
  }

  getDateRange(projects) {
    if (projects.length === 0) return null;

    const dates = projects.map(p => new Date(p.date));
    return {
      earliest: new Date(Math.min(...dates)).toISOString(),
      latest: new Date(Math.max(...dates)).toISOString()
    };
  }
}

// Run if called directly
if (require.main === module) {
  const processor = new ProjectProcessor();
  processor.process();
}

module.exports = ProjectProcessor;