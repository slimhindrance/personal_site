#!/usr/bin/env node

/**
 * Testimonial Processing Script
 * Processes markdown testimonial files and generates JSON data
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');

class TestimonialProcessor {
  constructor() {
    this.contentDir = path.join(process.cwd(), 'content', 'testimonials');
    this.dataDir = path.join(process.cwd(), 'data');
    this.outputFile = path.join(this.dataDir, 'testimonials.json');
    this.md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true
    });
  }

  async process() {
    console.log('💬 Processing testimonial files...');

    try {
      // Ensure output directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // Check if content directory exists
      try {
        await fs.access(this.contentDir);
      } catch {
        console.log('📁 No testimonials directory found, creating empty data file');
        await this.writeOutput([]);
        return;
      }

      const testimonials = await this.loadTestimonials();
      const processedTestimonials = await this.processTestimonials(testimonials);

      // Sort testimonials by date (newest first) and rating
      const sortedTestimonials = this.sortTestimonials(processedTestimonials);

      await this.writeOutput(sortedTestimonials);
      await this.generateStatistics(sortedTestimonials);

      console.log(`✅ Processed ${sortedTestimonials.length} testimonials successfully`);

    } catch (error) {
      console.error('❌ Error processing testimonials:', error.message);
      process.exit(1);
    }
  }

  async loadTestimonials() {
    const files = await fs.readdir(this.contentDir);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    if (mdFiles.length === 0) {
      console.log('📝 No testimonial markdown files found');
      return [];
    }

    const testimonials = [];
    for (const file of mdFiles) {
      try {
        const testimonial = await this.loadTestimonial(file);
        if (testimonial) {
          testimonials.push(testimonial);
        }
      } catch (error) {
        console.error(`⚠️  Skipping ${file}: ${error.message}`);
      }
    }

    return testimonials;
  }

  async loadTestimonial(filename) {
    const filePath = path.join(this.contentDir, filename);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);

    // Validate required fields
    if (!frontmatter.author || frontmatter.author.trim() === '') {
      throw new Error('Missing required author field');
    }

    if (!body || body.trim() === '') {
      throw new Error('Missing testimonial content');
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

  async processTestimonials(testimonials) {
    const processed = [];

    for (const testimonial of testimonials) {
      try {
        const processedTestimonial = await this.processTestimonial(testimonial);
        processed.push(processedTestimonial);
      } catch (error) {
        console.error(`⚠️  Error processing ${testimonial.filename}: ${error.message}`);
      }
    }

    return processed;
  }

  async processTestimonial(testimonial) {
    const { frontmatter, body, filename, stats } = testimonial;

    // Generate slug from filename
    const slug = path.basename(filename, '.md');

    // Process markdown content
    const htmlContent = this.md.render(body);

    // Clean and process the testimonial text
    const cleanText = this.cleanTestimonialText(body);

    // Parse and validate date
    const date = this.parseDate(frontmatter.date, stats.mtime);

    // Process author information
    const author = this.processAuthor(frontmatter);

    // Process image reference
    const image = await this.processImage(frontmatter.image, slug);

    // Validate and process rating
    const rating = this.processRating(frontmatter.rating);

    // Extract project information
    const project = frontmatter.project || null;

    // Process additional metadata
    const featured = Boolean(frontmatter.featured);
    const verified = Boolean(frontmatter.verified);

    return {
      id: slug,
      slug,
      content: cleanText,
      htmlContent,
      author,
      date: date.toISOString(),
      rating,
      project,
      image,
      featured,
      verified,
      metadata: {
        filename,
        wordCount: this.countWords(body),
        characterCount: cleanText.length,
        lastModified: stats.mtime.toISOString(),
        created: date.toISOString(),
        sentiment: this.analyzeSentiment(cleanText)
      }
    };
  }

  processAuthor(frontmatter) {
    return {
      name: frontmatter.author.trim(),
      title: frontmatter.title || null,
      company: frontmatter.company || null,
      email: frontmatter.email || null,
      linkedin: frontmatter.linkedin || null,
      website: frontmatter.website || null
    };
  }

  async processImage(imageName, slug) {
    if (!imageName) return null;

    // Possible image locations
    const possiblePaths = [
      path.join(this.contentDir, 'images', imageName),
      path.join(this.contentDir, imageName),
      path.join(process.cwd(), 'assets', 'images', 'testimonials', imageName)
    ];

    for (const imagePath of possiblePaths) {
      try {
        const stats = await fs.stat(imagePath);
        if (stats.isFile()) {
          return {
            src: imageName,
            alt: `${slug} testimonial author`,
            path: path.relative(process.cwd(), imagePath),
            size: stats.size,
            lastModified: stats.mtime.toISOString()
          };
        }
      } catch {
        // Continue searching
      }
    }

    console.warn(`⚠️  Image not found: ${imageName} for testimonial ${slug}`);
    return null;
  }

  processRating(rating) {
    if (rating === undefined || rating === null) return null;

    const numRating = Number(rating);

    // Validate rating is between 1 and 5
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      console.warn(`⚠️  Invalid rating: ${rating}, defaulting to null`);
      return null;
    }

    return Math.round(numRating * 10) / 10; // Round to 1 decimal place
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

  cleanTestimonialText(content) {
    // Remove markdown formatting for clean text
    return content
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  countWords(content) {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }

  analyzeSentiment(text) {
    // Simple sentiment analysis based on keyword counting
    const positiveWords = [
      'excellent', 'amazing', 'outstanding', 'exceptional', 'great', 'fantastic',
      'wonderful', 'brilliant', 'perfect', 'impressed', 'recommend', 'professional',
      'quality', 'satisfied', 'pleased', 'happy', 'delighted', 'exceeded'
    ];

    const negativeWords = [
      'terrible', 'awful', 'bad', 'poor', 'disappointing', 'frustrated',
      'problem', 'issue', 'difficult', 'slow', 'late', 'wrong'
    ];

    const words = text.toLowerCase().split(/\s+/);

    const positiveCount = words.filter(word =>
      positiveWords.some(pos => word.includes(pos))
    ).length;

    const negativeCount = words.filter(word =>
      negativeWords.some(neg => word.includes(neg))
    ).length;

    const totalWords = words.length;

    // Calculate sentiment score (-1 to 1)
    const score = (positiveCount - negativeCount) / Math.max(totalWords, 1);

    // Categorize sentiment
    let category;
    if (score > 0.05) category = 'positive';
    else if (score < -0.05) category = 'negative';
    else category = 'neutral';

    return {
      score: Math.round(score * 1000) / 1000, // Round to 3 decimal places
      category,
      positiveWords: positiveCount,
      negativeWords: negativeCount,
      totalWords
    };
  }

  sortTestimonials(testimonials) {
    return testimonials.sort((a, b) => {
      // Featured testimonials first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      // Then by rating (highest first) if available
      if (a.rating && b.rating) {
        if (a.rating !== b.rating) return b.rating - a.rating;
      }

      // Then by date (newest first)
      return new Date(b.date) - new Date(a.date);
    });
  }

  async writeOutput(testimonials) {
    const output = {
      testimonials,
      metadata: {
        total: testimonials.length,
        featured: testimonials.filter(t => t.featured).length,
        verified: testimonials.filter(t => t.verified).length,
        withRating: testimonials.filter(t => t.rating !== null).length,
        averageRating: this.calculateAverageRating(testimonials),
        ratingDistribution: this.getRatingDistribution(testimonials),
        projects: this.extractProjects(testimonials),
        companies: this.extractCompanies(testimonials),
        sentimentAnalysis: this.getSentimentSummary(testimonials),
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

  calculateAverageRating(testimonials) {
    const ratedTestimonials = testimonials.filter(t => t.rating !== null);
    if (ratedTestimonials.length === 0) return null;

    const sum = ratedTestimonials.reduce((acc, t) => acc + t.rating, 0);
    return Math.round((sum / ratedTestimonials.length) * 10) / 10;
  }

  getRatingDistribution(testimonials) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    testimonials
      .filter(t => t.rating !== null)
      .forEach(t => {
        const rounded = Math.round(t.rating);
        if (rounded >= 1 && rounded <= 5) {
          distribution[rounded]++;
        }
      });

    return distribution;
  }

  extractProjects(testimonials) {
    const projectCount = {};
    testimonials
      .filter(t => t.project)
      .forEach(t => {
        projectCount[t.project] = (projectCount[t.project] || 0) + 1;
      });

    return Object.entries(projectCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  extractCompanies(testimonials) {
    const companyCount = {};
    testimonials
      .filter(t => t.author.company)
      .forEach(t => {
        const company = t.author.company;
        companyCount[company] = (companyCount[company] || 0) + 1;
      });

    return Object.entries(companyCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  getSentimentSummary(testimonials) {
    const sentiments = { positive: 0, neutral: 0, negative: 0 };

    testimonials.forEach(t => {
      sentiments[t.metadata.sentiment.category]++;
    });

    const totalSentimentScore = testimonials.reduce(
      (sum, t) => sum + t.metadata.sentiment.score, 0
    );

    return {
      distribution: sentiments,
      averageScore: Math.round((totalSentimentScore / testimonials.length) * 1000) / 1000,
      percentage: {
        positive: Math.round((sentiments.positive / testimonials.length) * 100),
        neutral: Math.round((sentiments.neutral / testimonials.length) * 100),
        negative: Math.round((sentiments.negative / testimonials.length) * 100)
      }
    };
  }

  async generateStatistics(testimonials) {
    const stats = {
      totalTestimonials: testimonials.length,
      featuredTestimonials: testimonials.filter(t => t.featured).length,
      verifiedTestimonials: testimonials.filter(t => t.verified).length,
      averageRating: this.calculateAverageRating(testimonials),
      averageWordCount: Math.round(
        testimonials.reduce((sum, t) => sum + t.metadata.wordCount, 0) / testimonials.length || 0
      ),
      topProjects: this.extractProjects(testimonials).slice(0, 5),
      topCompanies: this.extractCompanies(testimonials).slice(0, 5),
      sentimentBreakdown: this.getSentimentSummary(testimonials),
      dateRange: this.getDateRange(testimonials)
    };

    console.log('📊 Testimonial Statistics:');
    console.log(`  - Total: ${stats.totalTestimonials}`);
    console.log(`  - Featured: ${stats.featuredTestimonials}`);
    console.log(`  - Verified: ${stats.verifiedTestimonials}`);
    console.log(`  - Average rating: ${stats.averageRating || 'N/A'}`);
    console.log(`  - Average words: ${stats.averageWordCount}`);
    console.log(`  - Sentiment: ${stats.sentimentBreakdown.percentage.positive}% positive`);

    if (stats.topProjects.length > 0) {
      console.log(`  - Top projects: ${stats.topProjects.slice(0, 3).map(p => p.name).join(', ')}`);
    }
  }

  getDateRange(testimonials) {
    if (testimonials.length === 0) return null;

    const dates = testimonials.map(t => new Date(t.date));
    return {
      earliest: new Date(Math.min(...dates)).toISOString(),
      latest: new Date(Math.max(...dates)).toISOString()
    };
  }
}

// Run if called directly
if (require.main === module) {
  const processor = new TestimonialProcessor();
  processor.process();
}

module.exports = TestimonialProcessor;