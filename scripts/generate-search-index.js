#!/usr/bin/env node

/**
 * Search Index Generation Script - Phase 2 Enhanced
 * Generates comprehensive search indices with NLP processing
 */

const fs = require('fs').promises;
const path = require('path');

class SearchIndexGenerator {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.outputPath = path.join(this.dataDir, 'search-index.json');
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);

    this.index = {
      documents: [],
      terms: {},
      metadata: {
        generated: new Date().toISOString(),
        documentCount: 0,
        termCount: 0,
        averageDocumentLength: 0,
        version: '2.0'
      },
      searchConfig: {
        minTermLength: 2,
        maxTermLength: 50,
        stemming: false,
        fuzzyMatching: true,
        boost: {
          title: 3.0,
          keywords: 2.5,
          category: 2.0,
          content: 1.0
        }
      }
    };
  }

  async generate() {
    console.log('🔍 Generating enhanced search index...');

    try {
      await this.ensureDataDirectory();

      const contentTypes = ['projects', 'papers', 'testimonials'];
      let totalDocumentLength = 0;

      for (const type of contentTypes) {
        const items = await this.loadContentType(type);

        for (const item of items) {
          const document = await this.processDocument(item, type);
          this.index.documents.push(document);
          totalDocumentLength += document.contentLength;
        }
      }

      // Calculate metadata
      this.index.metadata.documentCount = this.index.documents.length;
      this.index.metadata.termCount = Object.keys(this.index.terms).length;
      this.index.metadata.averageDocumentLength =
        this.index.metadata.documentCount > 0
          ? totalDocumentLength / this.index.metadata.documentCount
          : 0;

      // Calculate term frequencies and weights
      this.calculateTermWeights();

      // Save index
      await this.saveIndex();

      console.log(`✅ Search index generated successfully`);
      console.log(`📊 Statistics:`);
      console.log(`   - Documents: ${this.index.metadata.documentCount}`);
      console.log(`   - Terms: ${this.index.metadata.termCount}`);
      console.log(`   - Average document length: ${Math.round(this.index.metadata.averageDocumentLength)} words`);

    } catch (error) {
      console.error('❌ Error generating search index:', error.message);
      throw error;
    }
  }

  async ensureDataDirectory() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async loadContentType(type) {
    try {
      const filePath = path.join(this.dataDir, `${type}.json`);
      const content = await fs.readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️ Could not load ${type}.json:`, error.message);
      return [];
    }
  }

  async processDocument(item, type) {
    const id = `${type}_${item.id || item.slug || this.generateId(item)}`;

    // Extract all searchable content
    const searchableContent = this.extractSearchableContent(item);
    const keywords = this.extractKeywords(item);
    const technologies = this.extractTechnologies(item);

    // Tokenize content
    const tokens = this.tokenizeContent(searchableContent);
    const titleTokens = this.tokenizeContent(item.title || '');
    const keywordTokens = this.tokenizeContent(keywords.join(' '));

    // Create document
    const document = {
      id,
      type,
      title: item.title || 'Untitled',
      content: searchableContent.substring(0, 500), // Preview
      keywords: keywords,
      technologies: technologies,
      category: item.category || 'uncategorized',
      date: item.date || item.year || null,
      url: this.generateDocumentURL(type, item),
      contentLength: tokens.length,
      fields: {
        title: titleTokens,
        content: tokens,
        keywords: keywordTokens,
        category: this.tokenizeContent(item.category || ''),
        technologies: this.tokenizeContent(technologies.join(' '))
      },
      boost: this.calculateDocumentBoost(item, type),
      metadata: this.extractMetadata(item, type)
    };

    // Add terms to global index
    this.addTermsToIndex(document);

    return document;
  }

  extractSearchableContent(item) {
    const textFields = [
      item.title,
      item.description,
      item.content,
      item.abstract,
      item.summary,
      item.fullText
    ].filter(Boolean);

    // Add structured data
    if (item.technologies) textFields.push(item.technologies.join(' '));
    if (item.keywords) textFields.push(item.keywords.join(' '));
    if (item.tags) textFields.push(item.tags.join(' '));
    if (item.authors) textFields.push(item.authors.join(' '));

    return textFields.join(' ');
  }

  extractKeywords(item) {
    const keywords = new Set();

    // Direct keyword fields
    if (item.keywords) {
      item.keywords.forEach(k => keywords.add(k.toLowerCase()));
    }
    if (item.tags) {
      item.tags.forEach(t => keywords.add(t.toLowerCase()));
    }

    // Extract from title and description
    const text = [item.title, item.description].filter(Boolean).join(' ');
    const importantWords = this.extractImportantWords(text);
    importantWords.forEach(word => keywords.add(word));

    return Array.from(keywords);
  }

  extractTechnologies(item) {
    const technologies = new Set();

    if (item.technologies) {
      item.technologies.forEach(tech => technologies.add(tech.toLowerCase()));
    }
    if (item.skills) {
      item.skills.forEach(skill => technologies.add(skill.toLowerCase()));
    }

    // Common technology patterns
    const content = this.extractSearchableContent(item).toLowerCase();
    const techPatterns = [
      'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
      'node.js', 'express', 'mongodb', 'postgresql', 'mysql', 'docker',
      'kubernetes', 'aws', 'azure', 'gcp', 'tensorflow', 'pytorch',
      'machine learning', 'ai', 'deep learning', 'neural networks',
      'html', 'css', 'sass', 'tailwind', 'bootstrap', 'webpack', 'vite'
    ];

    techPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        technologies.add(pattern);
      }
    });

    return Array.from(technologies);
  }

  tokenizeContent(text) {
    if (!text) return [];

    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Keep hyphens for compound words
      .split(/\s+/)
      .filter(word =>
        word.length >= this.index.searchConfig.minTermLength &&
        word.length <= this.index.searchConfig.maxTermLength &&
        !this.stopWords.has(word)
      )
      .map(word => this.stemWord(word));
  }

  stemWord(word) {
    // Simple stemming - remove common suffixes
    const suffixes = ['ing', 'ed', 'er', 'est', 'ly', 's'];

    for (const suffix of suffixes) {
      if (word.endsWith(suffix) && word.length > suffix.length + 2) {
        return word.slice(0, -suffix.length);
      }
    }

    return word;
  }

  extractImportantWords(text) {
    if (!text) return [];

    return this.tokenizeContent(text)
      .filter(word => word.length > 3)
      .slice(0, 10); // Top 10 important words
  }

  addTermsToIndex(document) {
    const allFields = Object.entries(document.fields);

    allFields.forEach(([fieldName, tokens]) => {
      tokens.forEach(term => {
        if (!this.index.terms[term]) {
          this.index.terms[term] = {
            df: 0, // document frequency
            postings: {}
          };
        }

        if (!this.index.terms[term].postings[document.id]) {
          this.index.terms[term].df++;
          this.index.terms[term].postings[document.id] = {
            tf: 0, // term frequency
            fields: {}
          };
        }

        // Count term frequency
        this.index.terms[term].postings[document.id].tf++;

        // Track field-specific occurrences
        if (!this.index.terms[term].postings[document.id].fields[fieldName]) {
          this.index.terms[term].postings[document.id].fields[fieldName] = 0;
        }
        this.index.terms[term].postings[document.id].fields[fieldName]++;
      });
    });
  }

  calculateTermWeights() {
    const totalDocs = this.index.metadata.documentCount;

    Object.entries(this.index.terms).forEach(([term, termData]) => {
      // Calculate IDF (Inverse Document Frequency)
      termData.idf = Math.log(totalDocs / termData.df);

      // Calculate TF-IDF for each document
      Object.entries(termData.postings).forEach(([docId, posting]) => {
        const tf = 1 + Math.log(posting.tf); // Log-normalized TF
        posting.tfidf = tf * termData.idf;

        // Calculate field-boosted scores
        posting.boostedScore = 0;
        Object.entries(posting.fields).forEach(([fieldName, fieldTf]) => {
          const boost = this.index.searchConfig.boost[fieldName] || 1.0;
          posting.boostedScore += (1 + Math.log(fieldTf)) * termData.idf * boost;
        });
      });
    });
  }

  calculateDocumentBoost(item, type) {
    let boost = 1.0;

    // Boost by content type
    const typeBoosts = {
      projects: 1.2,
      papers: 1.1,
      testimonials: 1.0
    };
    boost *= typeBoosts[type] || 1.0;

    // Boost recent content
    const date = new Date(item.date || item.year || '2020');
    const now = new Date();
    const monthsOld = (now - date) / (1000 * 60 * 60 * 24 * 30);
    if (monthsOld < 12) boost *= 1.3;
    else if (monthsOld < 24) boost *= 1.1;

    // Boost high-quality content
    if (item.featured) boost *= 1.5;
    if (item.rating && item.rating > 4.5) boost *= 1.2;

    return boost;
  }

  extractMetadata(item, type) {
    const metadata = {
      type,
      hasImage: !!(item.image || item.featured_image || item.thumbnail),
      wordCount: this.extractSearchableContent(item).split(/\s+/).length,
      complexity: this.calculateComplexity(item)
    };

    // Type-specific metadata
    switch (type) {
      case 'projects':
        metadata.techCount = (item.technologies || []).length;
        metadata.hasDemo = !!(item.links?.demo);
        metadata.hasCode = !!(item.links?.github);
        metadata.difficulty = item.difficulty || 'unknown';
        break;

      case 'papers':
        metadata.authorCount = (item.authors || []).length;
        metadata.hasAbstract = !!item.abstract;
        metadata.hasFullText = !!item.fullText;
        metadata.citationCount = (item.citations || []).length;
        metadata.journal = item.journal || 'unknown';
        break;

      case 'testimonials':
        metadata.hasRating = !!item.rating;
        metadata.clientType = item.client_title || 'unknown';
        metadata.hasProject = !!item.project;
        break;
    }

    return metadata;
  }

  calculateComplexity(item) {
    let score = 0;
    const content = this.extractSearchableContent(item);

    // Content length factor
    score += Math.min(content.length / 1000, 5);

    // Technical terms factor
    const techTerms = (item.technologies || []).length;
    score += Math.min(techTerms / 5, 3);

    // Keyword richness
    const keywords = (item.keywords || []).length;
    score += Math.min(keywords / 10, 2);

    return Math.round(Math.min(score, 10));
  }

  generateDocumentURL(type, item) {
    const baseURL = process.env.SITE_URL || '';
    const itemId = item.id || item.slug ||
                   item.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${baseURL}#${type}/${itemId}`;
  }

  generateId(item) {
    return item.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ||
           Date.now().toString();
  }

  async saveIndex() {
    const indexData = JSON.stringify(this.index, null, 2);
    await fs.writeFile(this.outputPath, indexData, 'utf8');

    // Also save a compressed version for production
    const compressedPath = path.join(this.dataDir, 'search-index.min.json');
    const compressedData = JSON.stringify(this.index);
    await fs.writeFile(compressedPath, compressedData, 'utf8');

    console.log(`💾 Search index saved to ${this.outputPath}`);
    console.log(`💾 Compressed index saved to ${compressedPath}`);

    // Generate size report
    const stats = await fs.stat(this.outputPath);
    const compressedStats = await fs.stat(compressedPath);
    console.log(`📏 Index size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📏 Compressed size: ${(compressedStats.size / 1024).toFixed(2)} KB`);
  }

  // Utility method to get search suggestions
  generateSearchSuggestions() {
    const suggestions = {
      popular: [],
      recent: [],
      categories: [],
      technologies: []
    };

    // Extract popular terms (high document frequency)
    const popularTerms = Object.entries(this.index.terms)
      .filter(([term, data]) => data.df >= 2 && term.length > 3)
      .sort((a, b) => b[1].df - a[1].df)
      .slice(0, 20)
      .map(([term]) => term);

    suggestions.popular = popularTerms;

    // Extract categories
    const categories = new Set();
    this.index.documents.forEach(doc => {
      if (doc.category && doc.category !== 'uncategorized') {
        categories.add(doc.category);
      }
    });
    suggestions.categories = Array.from(categories);

    // Extract technologies
    const technologies = new Set();
    this.index.documents.forEach(doc => {
      doc.technologies.forEach(tech => technologies.add(tech));
    });
    suggestions.technologies = Array.from(technologies).slice(0, 30);

    return suggestions;
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new SearchIndexGenerator();
  generator.generate().catch(console.error);
}

module.exports = SearchIndexGenerator;