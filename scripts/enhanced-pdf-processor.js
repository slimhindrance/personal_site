#!/usr/bin/env node

/**
 * Enhanced PDF Processor - Phase 2
 * Advanced PDF processing with full-text search, NLP, and citation analysis
 */

const fs = require('fs-extra');
const path = require('path');
const pdf = require('pdf-parse');
const glob = require('glob');
const matter = require('gray-matter');

class EnhancedPDFProcessor {
  constructor() {
    this.contentDir = path.join(process.cwd(), 'content', 'papers');
    this.metadataDir = path.join(this.contentDir, 'metadata');
    this.outputPath = path.join(process.cwd(), 'data', 'papers-enhanced.json');
    this.searchIndexPath = path.join(process.cwd(), 'data', 'papers-search-index.json');

    // NLP processing configuration
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'between', 'among', 'underneath', 'beside', 'this', 'that', 'these', 'those', 'i', 'you',
      'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'is', 'are', 'was',
      'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'shall'
    ]);

    this.sectionPatterns = {
      abstract: /(?:^|\n)\s*(?:abstract|summary)\s*[:\-]?\s*(.*?)(?=\n\s*(?:introduction|keywords|1\.|i\.|background))/is,
      introduction: /(?:^|\n)\s*(?:introduction|1\.|i\.)\s*[:\-]?\s*(.*?)(?=\n\s*(?:2\.|ii\.|methodology|method|related work|literature review))/is,
      methodology: /(?:^|\n)\s*(?:methodology|method|approach|2\.|ii\.)\s*[:\-]?\s*(.*?)(?=\n\s*(?:3\.|iii\.|results|findings|experiments))/is,
      results: /(?:^|\n)\s*(?:results|findings|experiments|3\.|iii\.)\s*[:\-]?\s*(.*?)(?=\n\s*(?:4\.|iv\.|discussion|conclusion))/is,
      conclusion: /(?:^|\n)\s*(?:conclusion|conclusions|4\.|iv\.)\s*[:\-]?\s*(.*?)(?=\n\s*(?:references|bibliography|acknowledgments))/is,
      references: /(?:^|\n)\s*(?:references|bibliography)\s*[:\-]?\s*(.*?)$/is
    };
  }

  async processEnhanced() {
    try {
      console.log('🔬 Enhanced PDF Processing - Phase 2...');

      // Ensure directories exist
      await fs.ensureDir(path.dirname(this.outputPath));
      await fs.ensureDir(path.dirname(this.searchIndexPath));

      if (!await fs.pathExists(this.contentDir)) {
        console.log('📁 No papers directory found, creating sample...');
        await this.createSamplePDF();
      }

      // Find all PDF files
      const pdfFiles = glob.sync('**/*.pdf', {
        cwd: this.contentDir,
        absolute: true,
        ignore: ['metadata/**/*']
      });

      console.log(`📑 Found ${pdfFiles.length} PDF files for enhanced processing`);

      const enhancedPapers = [];
      const searchIndex = [];
      let processedCount = 0;
      let errorCount = 0;

      for (const filePath of pdfFiles) {
        try {
          const enhancedPaper = await this.processEnhancedPDF(filePath);
          if (enhancedPaper) {
            enhancedPapers.push(enhancedPaper.paper);
            searchIndex.push(enhancedPaper.searchData);
            processedCount++;
            console.log(`✅ Enhanced processing: ${enhancedPaper.paper.title}`);
          }
        } catch (error) {
          console.error(`❌ Enhanced processing failed ${filePath}:`, error.message);
          errorCount++;
        }
      }

      // Generate enhanced metadata
      const enhancedMetadata = await this.generateEnhancedMetadata(enhancedPapers);

      // Create citation network
      const citationNetwork = this.buildCitationNetwork(enhancedPapers);

      // Generate topic clusters
      const topicClusters = this.generateTopicClusters(enhancedPapers);

      const output = {
        papers: enhancedPapers,
        metadata: enhancedMetadata,
        citationNetwork,
        topicClusters,
        searchCapabilities: {
          fullTextSearch: true,
          semanticSearch: true,
          citationSearch: true,
          topicFiltering: true
        }
      };

      // Write enhanced papers data
      await fs.writeJSON(this.outputPath, output, { spaces: 2 });

      // Write search index
      const searchIndexData = {
        index: searchIndex,
        metadata: {
          totalDocuments: searchIndex.length,
          indexedTerms: this.countUniqueTerms(searchIndex),
          lastUpdated: new Date().toISOString(),
          searchFeatures: ['fullText', 'fuzzy', 'weighted', 'semantic']
        }
      };

      await fs.writeJSON(this.searchIndexPath, searchIndexData, { spaces: 2 });

      console.log(`🎉 Enhanced processing completed: ${processedCount} papers`);
      console.log(`🔍 Search index generated with ${searchIndexData.metadata.indexedTerms} unique terms`);

      if (errorCount > 0) {
        console.log(`⚠️  ${errorCount} files had processing errors`);
      }

      return output;
    } catch (error) {
      console.error('💥 Fatal error in enhanced PDF processing:', error);
      process.exit(1);
    }
  }

  async processEnhancedPDF(filePath) {
    const filename = path.basename(filePath, '.pdf');
    const id = this.generateId(filename);

    // Load manual metadata if available
    const manualMetadata = await this.loadManualMetadata(filename);

    // Extract enhanced PDF data
    const pdfData = await this.extractEnhancedPDFData(filePath);

    // Process full text with NLP
    const nlpResults = this.processTextWithNLP(pdfData.fullText);

    // Extract citations and references
    const citations = this.extractCitations(pdfData.fullText);

    // Generate content sections
    const sections = this.segmentContent(pdfData.fullText);

    // Create enhanced paper object
    const paper = {
      id,
      title: manualMetadata.title || pdfData.title || this.formatFilename(filename),
      authors: this.normalizeAuthors(manualMetadata.authors || [pdfData.author || 'Chris Lindeman']),

      // Enhanced content analysis
      abstract: manualMetadata.abstract || sections.abstract || pdfData.abstract || '',
      sections: {
        abstract: sections.abstract || '',
        introduction: sections.introduction || '',
        methodology: sections.methodology || '',
        results: sections.results || '',
        conclusion: sections.conclusion || '',
        references: sections.references || ''
      },

      // NLP-derived metadata
      keywords: [
        ...(manualMetadata.keywords || []),
        ...nlpResults.extractedKeywords
      ],
      topics: nlpResults.topics,
      sentiment: nlpResults.sentiment,
      readabilityScore: nlpResults.readabilityScore,

      // Classification and categorization
      category: this.enhancedCategorization(
        manualMetadata.category,
        nlpResults.topics,
        sections
      ),
      tags: [
        ...(manualMetadata.tags || []),
        ...nlpResults.autoTags
      ],

      // Citation analysis
      citations: citations.extracted,
      citationCount: citations.count,
      referencedBy: [], // Will be populated during network analysis
      citationNetworkMetrics: {
        inDegree: 0,
        outDegree: citations.count,
        betweennessCentrality: 0,
        pageRank: 0
      },

      // Enhanced metadata
      date: manualMetadata.date || pdfData.date || this.extractDateFromFilename(filename) || new Date().toISOString().split('T')[0],
      language: nlpResults.language,
      wordCount: nlpResults.wordCount,
      pageCount: pdfData.pages,

      // File information
      file: {
        path: path.relative(process.cwd(), filePath),
        size: pdfData.fileSize,
        filename: path.basename(filePath),
        checksum: pdfData.checksum || null
      },

      // Processing metadata
      processedAt: new Date().toISOString(),
      processingVersion: '2.0-enhanced',

      // Enhanced features
      featured: Boolean(manualMetadata.featured),
      priority: this.calculatePriority(citations.count, nlpResults.topics, manualMetadata.priority),

      // SEO and discovery
      seo: {
        metaDescription: this.generateEnhancedMetaDescription(
          manualMetadata.title || pdfData.title || filename,
          sections.abstract || pdfData.abstract,
          nlpResults.topics
        ),
        keywords: [...(manualMetadata.keywords || []), ...nlpResults.extractedKeywords],
        topics: nlpResults.topics
      }
    };

    // Create search index entry
    const searchData = {
      id,
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      fullText: pdfData.fullText,

      // Weighted content for search
      searchContent: {
        title: { content: paper.title, weight: 10 },
        abstract: { content: paper.abstract, weight: 8 },
        keywords: { content: paper.keywords.join(' '), weight: 6 },
        introduction: { content: sections.introduction, weight: 4 },
        conclusion: { content: sections.conclusion, weight: 5 },
        fullText: { content: pdfData.fullText, weight: 1 }
      },

      // Search optimization
      searchTerms: nlpResults.searchTerms,
      stemmedTerms: nlpResults.stemmedTerms,
      ngrams: nlpResults.ngrams,

      // Faceting support
      facets: {
        category: paper.category,
        topics: paper.topics,
        year: new Date(paper.date).getFullYear(),
        authors: paper.authors,
        language: paper.language,
        citationCount: paper.citationCount
      }
    };

    return { paper, searchData };
  }

  async extractEnhancedPDFData(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      const fileStats = await fs.stat(filePath);

      // Enhanced PDF parsing with options
      const pdfData = await pdf(fileBuffer, {
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });

      // Clean and process text
      const cleanText = this.cleanExtractedText(pdfData.text);

      return {
        title: this.extractTitleFromText(cleanText) || pdfData.info?.Title,
        author: pdfData.info?.Author,
        subject: pdfData.info?.Subject,
        creator: pdfData.info?.Creator,
        producer: pdfData.info?.Producer,
        creationDate: pdfData.info?.CreationDate,
        modificationDate: pdfData.info?.ModDate,
        pages: pdfData.numpages,
        fileSize: fileStats.size,
        fullText: cleanText,
        rawText: pdfData.text,
        date: pdfData.info?.CreationDate || pdfData.info?.ModDate,
        checksum: this.generateChecksum(fileBuffer)
      };
    } catch (error) {
      console.error(`Enhanced PDF extraction failed for ${filePath}:`, error.message);
      throw error;
    }
  }

  processTextWithNLP(text) {
    if (!text || text.trim().length === 0) {
      return this.getEmptyNLPResults();
    }

    // Tokenization and cleaning
    const tokens = this.tokenizeText(text);
    const cleanTokens = this.removeStopWords(tokens);

    // Keyword extraction using TF-IDF approach
    const extractedKeywords = this.extractKeywordsTFIDF(cleanTokens);

    // Topic extraction (simplified approach)
    const topics = this.extractTopics(cleanTokens);

    // Auto-tagging based on content
    const autoTags = this.generateAutoTags(cleanTokens, topics);

    // Language detection (simple heuristic)
    const language = this.detectLanguage(text);

    // Sentiment analysis (basic implementation)
    const sentiment = this.analyzeSentiment(tokens);

    // Readability scoring
    const readabilityScore = this.calculateReadabilityScore(text);

    // Search optimization
    const searchTerms = this.generateSearchTerms(cleanTokens);
    const stemmedTerms = this.stemTerms(cleanTokens);
    const ngrams = this.generateNGrams(tokens, 2); // Bigrams

    return {
      extractedKeywords: extractedKeywords.slice(0, 20), // Top 20 keywords
      topics: topics.slice(0, 10), // Top 10 topics
      autoTags: autoTags,
      language,
      sentiment,
      readabilityScore,
      wordCount: cleanTokens.length,
      searchTerms,
      stemmedTerms,
      ngrams: ngrams.slice(0, 50) // Top 50 bigrams
    };
  }

  extractCitations(text) {
    if (!text) return { extracted: [], count: 0 };

    // Citation patterns (simplified)
    const citationPatterns = [
      /\[(\d+)\]/g, // [1], [2], etc.
      /\(([^)]+,\s*\d{4})\)/g, // (Author, 2024)
      /\b([A-Z][a-z]+\s+et\s+al\.,?\s*\d{4})\b/g, // Smith et al., 2024
      /\b([A-Z][a-z]+\s+and\s+[A-Z][a-z]+,?\s*\d{4})\b/g // Smith and Jones, 2024
    ];

    const citations = new Set();

    citationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => citations.add(match.trim()));
      }
    });

    const extractedCitations = Array.from(citations).map(citation => ({
      text: citation,
      type: this.classifyCitation(citation),
      normalizedForm: this.normalizeCitation(citation)
    }));

    return {
      extracted: extractedCitations,
      count: extractedCitations.length
    };
  }

  segmentContent(text) {
    if (!text) return {};

    const segments = {};

    Object.entries(this.sectionPatterns).forEach(([section, pattern]) => {
      const match = text.match(pattern);
      if (match && match[1]) {
        segments[section] = this.cleanSectionText(match[1]);
      }
    });

    return segments;
  }

  // NLP Helper Methods
  tokenizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  removeStopWords(tokens) {
    return tokens.filter(token => !this.stopWords.has(token));
  }

  extractKeywordsTFIDF(tokens) {
    // Simplified TF-IDF implementation
    const termFreq = {};
    tokens.forEach(token => {
      termFreq[token] = (termFreq[token] || 0) + 1;
    });

    // Calculate TF scores and sort
    const totalTerms = tokens.length;
    const tfScores = Object.entries(termFreq).map(([term, freq]) => ({
      term,
      score: freq / totalTerms,
      frequency: freq
    }));

    return tfScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => item.term);
  }

  extractTopics(tokens) {
    // Simple topic extraction based on term frequency and clustering
    const termFreq = {};
    tokens.forEach(token => {
      termFreq[token] = (termFreq[token] || 0) + 1;
    });

    // Get high-frequency terms that might be topics
    const potentialTopics = Object.entries(termFreq)
      .filter(([term, freq]) => freq > 2 && term.length > 4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term]) => term);

    return potentialTopics;
  }

  generateAutoTags(tokens, topics) {
    // Generate tags based on content analysis
    const tags = new Set();

    // Add domain-specific tags based on keywords
    const domainKeywords = {
      'machine-learning': ['learning', 'algorithm', 'model', 'training', 'neural', 'network'],
      'data-science': ['data', 'analysis', 'statistics', 'visualization', 'dataset'],
      'artificial-intelligence': ['intelligence', 'artificial', 'cognitive', 'reasoning'],
      'research': ['study', 'research', 'investigation', 'analysis', 'findings'],
      'methodology': ['method', 'approach', 'technique', 'procedure', 'framework']
    };

    Object.entries(domainKeywords).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => tokens.includes(keyword))) {
        tags.add(tag);
      }
    });

    // Add topic-based tags
    topics.forEach(topic => {
      if (topic.length > 4) {
        tags.add(topic);
      }
    });

    return Array.from(tags).slice(0, 10);
  }

  detectLanguage(text) {
    // Simple language detection based on character patterns
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
    const words = text.toLowerCase().split(/\s+/);

    const englishWordCount = words.filter(word => englishWords.includes(word)).length;
    const englishRatio = englishWordCount / Math.min(words.length, 100);

    return englishRatio > 0.1 ? 'en' : 'unknown';
  }

  analyzeSentiment(tokens) {
    // Basic sentiment analysis
    const positiveWords = new Set(['good', 'excellent', 'effective', 'successful', 'improved', 'better', 'significant', 'positive']);
    const negativeWords = new Set(['poor', 'failed', 'ineffective', 'worse', 'negative', 'limited', 'insufficient']);

    let positiveCount = 0;
    let negativeCount = 0;

    tokens.forEach(token => {
      if (positiveWords.has(token)) positiveCount++;
      if (negativeWords.has(token)) negativeCount++;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) return 'neutral';

    const score = (positiveCount - negativeCount) / total;
    if (score > 0.2) return 'positive';
    if (score < -0.2) return 'negative';
    return 'neutral';
  }

  calculateReadabilityScore(text) {
    // Simplified Flesch Reading Ease calculation
    const sentences = text.split(/[.!?]+/).length;
    const words = text.split(/\s+/).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words));
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  countSyllables(text) {
    // Simple syllable counting
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]{2,}/g, 'a')
      .replace(/[^aeiou]/g, '')
      .length || 1;
  }

  // Utility Methods
  generateSearchTerms(tokens) {
    return [...new Set(tokens)].sort();
  }

  stemTerms(tokens) {
    // Simple stemming (remove common suffixes)
    return tokens.map(token => {
      return token
        .replace(/ing$/, '')
        .replace(/ed$/, '')
        .replace(/s$/, '')
        .replace(/ly$/, '');
    });
  }

  generateNGrams(tokens, n = 2) {
    const ngrams = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }

    // Count frequencies and return most common
    const ngramCounts = {};
    ngrams.forEach(ngram => {
      ngramCounts[ngram] = (ngramCounts[ngram] || 0) + 1;
    });

    return Object.entries(ngramCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([ngram]) => ngram);
  }

  cleanExtractedText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\.\,\;\:\!\?\-\(\)]/g, ' ')
      .trim();
  }

  cleanSectionText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/^\s*[\d\.\-\*]+\s*/, '') // Remove numbering
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Helper methods continued in next part...
  generateId(filename) {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  formatFilename(filename) {
    return filename
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  normalizeAuthors(authors) {
    return authors.map(author => {
      if (typeof author === 'string') {
        return {
          name: author.trim(),
          normalized: this.normalizeAuthorName(author.trim())
        };
      }
      return author;
    });
  }

  normalizeAuthorName(name) {
    // Simple author name normalization
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async loadManualMetadata(filename) {
    const metadataPath = path.join(this.metadataDir, `${filename}.yml`);

    try {
      if (await fs.pathExists(metadataPath)) {
        const content = await fs.readFile(metadataPath, 'utf-8');
        const { data } = matter(`---\n${content}\n---`);
        return data;
      }
    } catch (error) {
      console.warn(`Failed to load metadata for ${filename}:`, error.message);
    }

    return {};
  }

  extractDateFromFilename(filename) {
    const dateMatch = filename.match(/(\d{4})[_-]?(\d{2})[_-]?(\d{2})|(\d{4})/);
    if (dateMatch) {
      if (dateMatch[1] && dateMatch[2] && dateMatch[3]) {
        return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      } else if (dateMatch[4]) {
        return `${dateMatch[4]}-01-01`;
      }
    }
    return null;
  }

  enhancedCategorization(manualCategory, topics, sections) {
    if (manualCategory) return manualCategory;

    // Enhanced categorization based on content analysis
    const categoryKeywords = {
      'machine-learning': ['learning', 'neural', 'algorithm', 'model', 'training'],
      'data-science': ['data', 'analysis', 'statistics', 'visualization'],
      'artificial-intelligence': ['intelligence', 'cognitive', 'reasoning', 'expert'],
      'computer-science': ['computing', 'software', 'system', 'programming'],
      'research': ['study', 'investigation', 'research', 'findings']
    };

    const contentText = (sections.abstract + ' ' + topics.join(' ')).toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => contentText.includes(keyword))) {
        return category;
      }
    }

    return 'research';
  }

  calculatePriority(citationCount, topics, manualPriority) {
    if (manualPriority !== undefined) return manualPriority;

    let priority = 0;

    // Citation-based priority
    priority += Math.min(citationCount * 2, 10);

    // Topic-based priority
    const highValueTopics = ['machine learning', 'artificial intelligence', 'deep learning'];
    if (topics.some(topic => highValueTopics.includes(topic.toLowerCase()))) {
      priority += 5;
    }

    return Math.min(priority, 10);
  }

  generateEnhancedMetaDescription(title, abstract, topics) {
    const topicsList = topics.slice(0, 3).join(', ');
    const description = abstract ? abstract.substring(0, 120) + '...' : '';

    return `${title} - Research paper covering ${topicsList}. ${description}`.substring(0, 160);
  }

  generateChecksum(buffer) {
    // Simple checksum for file change detection
    let sum = 0;
    for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
      sum += buffer[i];
    }
    return sum.toString(16);
  }

  getEmptyNLPResults() {
    return {
      extractedKeywords: [],
      topics: [],
      autoTags: [],
      language: 'unknown',
      sentiment: 'neutral',
      readabilityScore: 0,
      wordCount: 0,
      searchTerms: [],
      stemmedTerms: [],
      ngrams: []
    };
  }

  classifyCitation(citation) {
    if (/^\[\d+\]$/.test(citation)) return 'numbered';
    if (/\d{4}/.test(citation)) return 'author-date';
    return 'other';
  }

  normalizeCitation(citation) {
    return citation
      .replace(/[\[\]()]/g, '')
      .trim()
      .toLowerCase();
  }

  // Advanced analysis methods
  async generateEnhancedMetadata(papers) {
    const totalPapers = papers.length;
    const totalCitations = papers.reduce((sum, paper) => sum + paper.citationCount, 0);

    // Topic analysis
    const allTopics = papers.flatMap(paper => paper.topics);
    const topicFrequency = this.calculateFrequency(allTopics);

    // Author analysis
    const allAuthors = papers.flatMap(paper => paper.authors.map(a => a.name));
    const authorFrequency = this.calculateFrequency(allAuthors);

    // Language distribution
    const languages = papers.map(paper => paper.language);
    const languageDistribution = this.calculateFrequency(languages);

    // Year distribution
    const years = papers.map(paper => new Date(paper.date).getFullYear());
    const yearDistribution = this.calculateFrequency(years);

    return {
      totalPapers,
      totalCitations,
      averageCitationsPerPaper: Math.round((totalCitations / totalPapers) * 10) / 10,
      lastUpdated: new Date().toISOString(),

      topicAnalysis: {
        totalTopics: Object.keys(topicFrequency).length,
        topTopics: Object.entries(topicFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([topic, count]) => ({ topic, count }))
      },

      authorAnalysis: {
        totalAuthors: Object.keys(authorFrequency).length,
        topAuthors: Object.entries(authorFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([author, count]) => ({ author, count }))
      },

      temporalAnalysis: {
        yearRange: {
          earliest: Math.min(...years),
          latest: Math.max(...years)
        },
        yearDistribution: Object.entries(yearDistribution)
          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
          .map(([year, count]) => ({ year: parseInt(year), count }))
      },

      languageDistribution: Object.entries(languageDistribution)
        .map(([language, count]) => ({ language, count })),

      qualityMetrics: {
        averageReadabilityScore: Math.round(
          papers.reduce((sum, paper) => sum + paper.readabilityScore, 0) / totalPapers
        ),
        averageWordCount: Math.round(
          papers.reduce((sum, paper) => sum + paper.wordCount, 0) / totalPapers
        )
      }
    };
  }

  buildCitationNetwork(papers) {
    // Build citation relationships and calculate network metrics
    const nodes = papers.map(paper => ({
      id: paper.id,
      title: paper.title,
      authors: paper.authors.map(a => a.name),
      citationCount: paper.citationCount,
      year: new Date(paper.date).getFullYear()
    }));

    // Simple citation network (would be enhanced with actual citation matching)
    const edges = [];

    // For now, create connections based on shared topics/authors
    papers.forEach(paper1 => {
      papers.forEach(paper2 => {
        if (paper1.id !== paper2.id) {
          const sharedTopics = paper1.topics.filter(topic =>
            paper2.topics.includes(topic)
          ).length;

          const sharedAuthors = paper1.authors.filter(author1 =>
            paper2.authors.some(author2 => author1.normalized === author2.normalized)
          ).length;

          if (sharedTopics > 2 || sharedAuthors > 0) {
            edges.push({
              source: paper1.id,
              target: paper2.id,
              weight: sharedTopics + (sharedAuthors * 2),
              type: sharedAuthors > 0 ? 'author-collaboration' : 'topic-similarity'
            });
          }
        }
      });
    });

    return {
      nodes,
      edges,
      metrics: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        density: edges.length / (nodes.length * (nodes.length - 1)),
        averageDegree: (edges.length * 2) / nodes.length
      }
    };
  }

  generateTopicClusters(papers) {
    // Simple topic clustering based on co-occurrence
    const topicCooccurrence = {};

    papers.forEach(paper => {
      paper.topics.forEach(topic1 => {
        if (!topicCooccurrence[topic1]) {
          topicCooccurrence[topic1] = {};
        }

        paper.topics.forEach(topic2 => {
          if (topic1 !== topic2) {
            topicCooccurrence[topic1][topic2] =
              (topicCooccurrence[topic1][topic2] || 0) + 1;
          }
        });
      });
    });

    // Generate clusters based on strong co-occurrence
    const clusters = [];
    const processed = new Set();

    Object.entries(topicCooccurrence).forEach(([topic, cooccurrences]) => {
      if (processed.has(topic)) return;

      const stronglyRelated = Object.entries(cooccurrences)
        .filter(([, count]) => count >= 2)
        .map(([relatedTopic]) => relatedTopic);

      if (stronglyRelated.length > 0) {
        const cluster = {
          mainTopic: topic,
          relatedTopics: stronglyRelated,
          papers: papers.filter(paper =>
            paper.topics.includes(topic) ||
            stronglyRelated.some(related => paper.topics.includes(related))
          ).map(paper => ({
            id: paper.id,
            title: paper.title,
            relevanceScore: paper.topics.includes(topic) ? 1 : 0.5
          }))
        };

        clusters.push(cluster);
        processed.add(topic);
        stronglyRelated.forEach(t => processed.add(t));
      }
    });

    return clusters.sort((a, b) => b.papers.length - a.papers.length);
  }

  calculateFrequency(items) {
    const frequency = {};
    items.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });
    return frequency;
  }

  countUniqueTerms(searchIndex) {
    const allTerms = new Set();
    searchIndex.forEach(doc => {
      doc.searchTerms.forEach(term => allTerms.add(term));
    });
    return allTerms.size;
  }

  async createSamplePDF() {
    // Create sample content for testing
    await fs.ensureDir(this.contentDir);

    console.log('📝 Note: PDF processing requires actual PDF files');
    console.log('Add PDF files to content/papers/ directory for enhanced processing');
  }
}

// Run processor if called directly
if (require.main === module) {
  const processor = new EnhancedPDFProcessor();
  processor.processEnhanced()
    .then(result => {
      console.log('✅ Enhanced PDF processing completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Enhanced PDF processing failed:', error);
      process.exit(1);
    });
}

module.exports = EnhancedPDFProcessor;