#!/usr/bin/env node

/**
 * Enhanced Paper Processing Script - Phase 2
 * Advanced PDF processing with full-text search, NLP, and intelligent categorization
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const natural = require('natural');
const stopword = require('stopword');
const compromise = require('compromise');
const stemmer = require('stemmer');

class EnhancedPaperProcessor {
  constructor() {
    this.contentDir = path.join(process.cwd(), 'content', 'papers');
    this.metadataDir = path.join(this.contentDir, 'metadata');
    this.dataDir = path.join(process.cwd(), 'data');
    this.outputFile = path.join(this.dataDir, 'papers.json');
    this.searchIndexFile = path.join(this.dataDir, 'papers-search-index.json');
    this.fullTextFile = path.join(this.dataDir, 'papers-fulltext.json');

    // Initialize NLP components
    this.initializeNLP();

    // Processing configuration
    this.config = {
      maxFullTextLength: 100000, // 100KB max full text per paper
      chunkSize: 5000, // Process text in chunks for large PDFs
      enableOCR: false, // OCR disabled by default (resource intensive)
      stemming: true,
      entityExtraction: true,
      sentimentAnalysis: false, // Not typically needed for academic papers
      topicModeling: true,
      citationExtraction: true,
      sectionDetection: true
    };

    // Academic section patterns
    this.sectionPatterns = {
      abstract: /(?:^|\n)\s*(?:abstract|summary)\s*:?\s*\n/i,
      introduction: /(?:^|\n)\s*(?:introduction|1\.\s*introduction)\s*\n/i,
      methodology: /(?:^|\n)\s*(?:methodology|methods?|approach|2\.\s*method)/i,
      results: /(?:^|\n)\s*(?:results?|findings?|3\.\s*results?)/i,
      discussion: /(?:^|\n)\s*(?:discussion|analysis|4\.\s*discussion)/i,
      conclusion: /(?:^|\n)\s*(?:conclusion|summary|5\.\s*conclusion)/i,
      references: /(?:^|\n)\s*(?:references?|bibliography|citations?)/i
    };

    // Citation patterns
    this.citationPatterns = {
      ieee: /\[(\d+)\]/g,
      harvard: /\([A-Za-z]+(?:\s+et\s+al\.?)?,?\s+\d{4}\)/g,
      apa: /\([A-Za-z]+(?:\s*&\s*[A-Za-z]+)?,?\s+\d{4}\)/g,
      doi: /(?:doi:|DOI:)\s*(10\.\d+\/[^\s]+)/gi,
      url: /https?:\/\/[^\s]+/g
    };

    // Academic keywords for classification
    this.academicKeywords = {
      'machine-learning': ['machine learning', 'neural network', 'deep learning', 'ai', 'artificial intelligence'],
      'data-science': ['data science', 'analytics', 'visualization', 'big data', 'statistics'],
      'software-engineering': ['software', 'programming', 'development', 'engineering', 'system'],
      'research': ['study', 'analysis', 'research', 'investigation', 'experiment'],
      'iot': ['iot', 'internet of things', 'sensor', 'embedded', 'wireless'],
      'security': ['security', 'cryptography', 'privacy', 'authentication', 'encryption'],
      'web': ['web', 'browser', 'http', 'html', 'javascript', 'frontend', 'backend']
    };
  }

  initializeNLP() {
    // Initialize TF-IDF
    this.tfidf = new natural.TfIdf();

    // Sentiment analyzer (if needed)
    this.sentimentAnalyzer = new natural.SentimentAnalyzer('English',
      natural.PorterStemmer, 'afinn');

    console.log('🧠 NLP components initialized');
  }

  async process() {
    console.log('📚 Processing papers with enhanced NLP capabilities...');

    try {
      // Ensure output directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // Check if content directory exists
      try {
        await fs.access(this.contentDir);
      } catch {
        console.log('📁 No papers directory found, creating empty data files');
        await this.writeOutput([], {}, {});
        return;
      }

      const papers = await this.loadPapers();
      const processedPapers = await this.processPapersWithNLP(papers);

      // Generate advanced analytics
      const analytics = await this.generateAnalytics(processedPapers);

      // Create search index with full-text capabilities
      const searchIndex = await this.createAdvancedSearchIndex(processedPapers);

      // Sort papers by relevance and date
      const sortedPapers = this.sortPapers(processedPapers);

      // Write all outputs
      await this.writeOutput(sortedPapers, analytics, searchIndex);
      await this.generateReports(sortedPapers, analytics);

      console.log(`✅ Enhanced processing completed: ${sortedPapers.length} papers`);

    } catch (error) {
      console.error('❌ Error in enhanced processing:', error.message);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }

  async loadPapers() {
    const files = await fs.readdir(this.contentDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

    if (pdfFiles.length === 0) {
      console.log('📄 No PDF files found');
      return [];
    }

    const papers = [];
    for (const file of pdfFiles) {
      try {
        const paper = await this.loadPaper(file);
        if (paper) {
          papers.push(paper);
        }
      } catch (error) {
        console.error(`⚠️  Skipping ${file}: ${error.message}`);
      }
    }

    return papers;
  }

  async loadPaper(filename) {
    const filePath = path.join(this.contentDir, filename);
    const stats = await fs.stat(filePath);
    const metadataOverride = await this.loadMetadataOverride(filename);
    const buffer = await fs.readFile(filePath);

    return {
      filename,
      filePath,
      buffer,
      stats,
      metadataOverride
    };
  }

  async loadMetadataOverride(filename) {
    const baseName = path.basename(filename, '.pdf');
    const metadataFiles = [
      path.join(this.metadataDir, `${baseName}.yml`),
      path.join(this.metadataDir, `${baseName}.yaml`)
    ];

    for (const metadataPath of metadataFiles) {
      try {
        const content = await fs.readFile(metadataPath, 'utf-8');
        const yaml = require('js-yaml');
        return yaml.load(content);
      } catch {
        // Continue to next file
      }
    }

    return null;
  }

  async processPapersWithNLP(papers) {
    const processed = [];
    let processedCount = 0;

    console.log(`🔄 Processing ${papers.length} papers with NLP analysis...`);

    for (const paper of papers) {
      try {
        console.log(`📖 Processing ${++processedCount}/${papers.length}: ${paper.filename}`);
        const processedPaper = await this.processEnhancedPaper(paper);
        processed.push(processedPaper);

        // Log progress every 5 papers
        if (processedCount % 5 === 0) {
          console.log(`✅ Completed ${processedCount}/${papers.length} papers`);
        }
      } catch (error) {
        console.error(`⚠️  Error processing ${paper.filename}: ${error.message}`);
        const minimalPaper = this.createMinimalEntry(paper, error);
        processed.push(minimalPaper);
      }
    }

    return processed;
  }

  async processEnhancedPaper(paper) {
    const { filename, buffer, stats, metadataOverride } = paper;
    const slug = path.basename(filename, '.pdf');

    // Enhanced PDF parsing with full content extraction
    const pdfData = await this.extractFullPDFContent(buffer, filename);

    // Basic metadata extraction (from Phase 1)
    const basicMetadata = this.extractBasicMetadata(pdfData, filename, stats, metadataOverride);

    // Enhanced content analysis
    const contentAnalysis = await this.analyzeContent(pdfData.fullText);

    // Section extraction
    const sections = this.extractSections(pdfData.fullText);

    // Citation analysis
    const citations = this.extractCitations(pdfData.fullText);

    // Generate semantic tags and topics
    const semanticTags = this.generateSemanticTags(pdfData.fullText, contentAnalysis);

    // Author analysis
    const authorAnalysis = this.analyzeAuthors(pdfData, metadataOverride);

    // Create comprehensive paper object
    return {
      ...basicMetadata,
      id: slug,
      slug,

      // Enhanced content
      fullText: this.truncateText(pdfData.fullText, this.config.maxFullTextLength),
      sections,
      citations,

      // NLP Analysis
      contentAnalysis,
      semanticTags,
      authorAnalysis,

      // Enhanced metadata
      metadata: {
        ...basicMetadata.metadata,

        // Processing metadata
        processingVersion: '2.0.0',
        nlpProcessed: true,

        // Content metrics
        wordCount: contentAnalysis.wordCount,
        readingTime: Math.ceil(contentAnalysis.wordCount / 200), // minutes
        complexityScore: contentAnalysis.complexityScore,

        // Citation metrics
        citationCount: citations.totalCitations,
        referenceCount: citations.references.length,

        // Quality indicators
        hasAbstract: Boolean(sections.abstract),
        hasIntroduction: Boolean(sections.introduction),
        hasConclusion: Boolean(sections.conclusion),
        sectionCount: Object.keys(sections).length,

        // Processing timestamp
        nlpProcessedAt: new Date().toISOString()
      }
    };
  }

  async extractFullPDFContent(buffer, filename) {
    try {
      // Parse entire PDF for full content
      const pdfData = await pdfParse(buffer, {
        max: 0, // Parse all pages
        version: 'v1.10.100'
      });

      return {
        text: pdfData.text || '',
        fullText: this.cleanText(pdfData.text || ''),
        numpages: pdfData.numpages || 0,
        info: pdfData.info || {}
      };
    } catch (error) {
      console.warn(`⚠️  PDF parse warning for ${filename}: ${error.message}`);
      return {
        text: '',
        fullText: '',
        numpages: 0,
        info: {}
      };
    }
  }

  extractBasicMetadata(pdfData, filename, stats, metadataOverride) {
    // Use existing Phase 1 logic for basic metadata
    const title = this.extractTitle(pdfData, filename, metadataOverride);
    const date = this.extractDate(pdfData, stats, metadataOverride);
    const tags = this.processTags(metadataOverride?.tags || []);
    const category = metadataOverride?.category || this.inferCategory(filename, tags);
    const abstract = this.extractAbstract(pdfData, metadataOverride);

    return {
      title,
      filename,
      date: date.toISOString(),
      category,
      tags,
      abstract,
      downloadUrl: this.generateDownloadUrl(filename),
      metadata: {
        fileSize: stats.size,
        fileSizeHuman: this.formatFileSize(stats.size),
        pageCount: pdfData.numpages || 0,
        lastModified: stats.mtime.toISOString(),
        created: stats.birthtime?.toISOString() || stats.mtime.toISOString(),
        pdfInfo: this.sanitizePdfInfo(pdfData.info || {}),
        hasMetadataOverride: Boolean(metadataOverride),
        processingStatus: 'success'
      }
    };
  }

  async analyzeContent(text) {
    if (!text || text.length === 0) {
      return this.getEmptyContentAnalysis();
    }

    const words = this.tokenizeText(text);
    const sentences = this.extractSentences(text);

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      averageWordsPerSentence: words.length / Math.max(sentences.length, 1),

      // Vocabulary analysis
      uniqueWords: new Set(words.map(w => w.toLowerCase())).size,
      vocabularyRichness: new Set(words.map(w => w.toLowerCase())).size / Math.max(words.length, 1),

      // Complexity metrics
      complexityScore: this.calculateComplexityScore(words, sentences),
      readabilityScore: this.calculateReadabilityScore(words, sentences),

      // Keyword extraction
      topKeywords: this.extractKeywords(text, 20),

      // Named entities
      entities: this.extractEntities(text),

      // Language detection
      language: this.detectLanguage(text),

      // Topic indicators
      topicScores: this.calculateTopicScores(text)
    };
  }

  extractSections(text) {
    const sections = {};

    Object.entries(this.sectionPatterns).forEach(([section, pattern]) => {
      const match = text.match(pattern);
      if (match) {
        const startIndex = match.index + match[0].length;
        const nextSectionMatches = Object.values(this.sectionPatterns)
          .map(p => text.substring(startIndex).match(p))
          .filter(m => m)
          .map(m => startIndex + m.index);

        const endIndex = nextSectionMatches.length > 0
          ? Math.min(...nextSectionMatches)
          : startIndex + 2000; // Default section length

        const sectionContent = text.substring(startIndex, endIndex).trim();

        if (sectionContent.length > 50) { // Only include substantial sections
          sections[section] = this.cleanSectionText(sectionContent);
        }
      }
    });

    return sections;
  }

  extractCitations(text) {
    const citations = {
      totalCitations: 0,
      citationStyle: 'unknown',
      references: [],
      inTextCitations: [],
      dois: [],
      urls: []
    };

    // Extract DOIs
    const doiMatches = text.match(this.citationPatterns.doi) || [];
    citations.dois = doiMatches.map(doi => doi.replace(/^doi:|DOI:/i, '').trim());

    // Extract URLs
    const urlMatches = text.match(this.citationPatterns.url) || [];
    citations.urls = urlMatches.slice(0, 50); // Limit to first 50 URLs

    // Detect citation style and extract in-text citations
    Object.entries(this.citationPatterns).forEach(([style, pattern]) => {
      if (style === 'doi' || style === 'url') return;

      const matches = text.match(pattern) || [];
      if (matches.length > citations.inTextCitations.length) {
        citations.citationStyle = style;
        citations.inTextCitations = matches.slice(0, 100); // Limit to first 100
      }
    });

    citations.totalCitations = citations.inTextCitations.length;

    // Extract reference list
    const referencesMatch = text.match(this.sectionPatterns.references);
    if (referencesMatch) {
      const referencesSection = text.substring(referencesMatch.index);
      citations.references = this.parseReferences(referencesSection).slice(0, 200); // Limit references
    }

    return citations;
  }

  generateSemanticTags(text, contentAnalysis) {
    const semanticTags = [];

    // Add topic-based tags
    Object.entries(contentAnalysis.topicScores).forEach(([topic, score]) => {
      if (score > 0.3) { // Threshold for topic relevance
        semanticTags.push(`topic:${topic}`);
      }
    });

    // Add entity-based tags
    contentAnalysis.entities.forEach(entity => {
      if (entity.confidence > 0.7) {
        semanticTags.push(`entity:${entity.text.toLowerCase()}`);
      }
    });

    // Add keyword-based tags
    contentAnalysis.topKeywords.slice(0, 10).forEach(keyword => {
      semanticTags.push(`keyword:${keyword.term}`);
    });

    return semanticTags;
  }

  analyzeAuthors(pdfData, metadataOverride) {
    const authorAnalysis = {
      extractedAuthors: [],
      institutions: [],
      emails: [],
      confidence: 0
    };

    // Extract from metadata override first
    if (metadataOverride?.authors) {
      authorAnalysis.extractedAuthors = metadataOverride.authors;
      authorAnalysis.confidence = 1.0;
      return authorAnalysis;
    }

    // Extract from PDF metadata
    if (pdfData.info?.Author) {
      const authors = this.parseAuthorString(pdfData.info.Author);
      authorAnalysis.extractedAuthors = authors;
      authorAnalysis.confidence = 0.8;
    }

    // Extract from text content (first page typically)
    const firstPageText = pdfData.text.substring(0, 2000);
    const textAuthors = this.extractAuthorsFromText(firstPageText);

    if (textAuthors.length > 0 && authorAnalysis.extractedAuthors.length === 0) {
      authorAnalysis.extractedAuthors = textAuthors;
      authorAnalysis.confidence = 0.6;
    }

    // Extract institutions and emails
    authorAnalysis.institutions = this.extractInstitutions(firstPageText);
    authorAnalysis.emails = this.extractEmails(firstPageText);

    return authorAnalysis;
  }

  // Utility methods for content analysis

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,;:!?-]/g, ' ')
      .trim();
  }

  tokenizeText(text) {
    return natural.WordTokenizer().tokenize(text.toLowerCase()) || [];
  }

  extractSentences(text) {
    return natural.SentenceTokenizer().tokenize(text) || [];
  }

  calculateComplexityScore(words, sentences) {
    if (words.length === 0 || sentences.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const longWords = words.filter(word => word.length > 6).length;
    const longWordRatio = longWords / words.length;

    // Normalized complexity score (0-1)
    return Math.min(1, (avgWordsPerSentence / 20 + longWordRatio) / 2);
  }

  calculateReadabilityScore(words, sentences) {
    if (words.length === 0 || sentences.length === 0) return 0;

    // Simplified Flesch Reading Ease approximation
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = 1.5; // Approximation for academic text

    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, score));
  }

  extractKeywords(text, limit = 20) {
    this.tfidf.addDocument(text);
    const keywords = [];

    this.tfidf.listTerms(0).slice(0, limit).forEach(item => {
      if (item.term.length > 2 && !stopword.en.includes(item.term)) {
        keywords.push({
          term: item.term,
          score: item.tfidf,
          stemmed: stemmer(item.term)
        });
      }
    });

    return keywords;
  }

  extractEntities(text) {
    // Use compromise.js for named entity recognition
    const doc = compromise(text.substring(0, 5000)); // Limit text for performance
    const entities = [];

    // Extract people
    doc.people().forEach(person => {
      entities.push({
        text: person.text(),
        type: 'person',
        confidence: 0.8
      });
    });

    // Extract places
    doc.places().forEach(place => {
      entities.push({
        text: place.text(),
        type: 'place',
        confidence: 0.7
      });
    });

    // Extract organizations
    doc.organizations().forEach(org => {
      entities.push({
        text: org.text(),
        type: 'organization',
        confidence: 0.7
      });
    });

    return entities.slice(0, 50); // Limit entities
  }

  detectLanguage(text) {
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'of', 'to', 'a', 'in', 'for', 'is', 'on', 'that'];
    const sampleWords = text.toLowerCase().split(/\s+/).slice(0, 100);
    const englishCount = sampleWords.filter(word => englishWords.includes(word)).length;

    return englishCount > 5 ? 'en' : 'unknown';
  }

  calculateTopicScores(text) {
    const scores = {};
    const normalizedText = text.toLowerCase();

    Object.entries(this.academicKeywords).forEach(([topic, keywords]) => {
      let score = 0;
      keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword.replace(/\s+/g, '\\s+')}\\b`, 'gi');
        const matches = normalizedText.match(regex) || [];
        score += matches.length;
      });

      // Normalize score by text length
      scores[topic] = Math.min(1, score / (text.length / 1000));
    });

    return scores;
  }

  cleanSectionText(text) {
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{3,}/g, ' ')
      .trim()
      .substring(0, 2000); // Limit section length
  }

  parseReferences(referencesText) {
    // Simple reference parsing - split by numbered items or line breaks
    const lines = referencesText.split('\n').filter(line => line.trim().length > 20);
    return lines.slice(0, 100).map((line, index) => ({
      id: index + 1,
      text: line.trim().substring(0, 500)
    }));
  }

  parseAuthorString(authorString) {
    // Simple author string parsing
    return authorString
      .split(/[,;]/)
      .map(author => author.trim())
      .filter(author => author.length > 0)
      .slice(0, 10); // Limit authors
  }

  extractAuthorsFromText(text) {
    // Extract potential author names from first page
    const doc = compromise(text);
    const people = doc.people().out('array');
    return people.slice(0, 10); // Limit authors
  }

  extractInstitutions(text) {
    // Extract university/institution names
    const institutionPatterns = [
      /\b\w+\s+university\b/gi,
      /\b\w+\s+institute\b/gi,
      /\b\w+\s+college\b/gi,
      /\bdepartment\s+of\s+\w+/gi
    ];

    const institutions = new Set();
    institutionPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(match => institutions.add(match.trim()));
    });

    return Array.from(institutions).slice(0, 10);
  }

  extractEmails(text) {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return (text.match(emailPattern) || []).slice(0, 10);
  }

  getEmptyContentAnalysis() {
    return {
      wordCount: 0,
      sentenceCount: 0,
      averageWordsPerSentence: 0,
      uniqueWords: 0,
      vocabularyRichness: 0,
      complexityScore: 0,
      readabilityScore: 0,
      topKeywords: [],
      entities: [],
      language: 'unknown',
      topicScores: {}
    };
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Methods from Phase 1 (keeping for compatibility)
  extractTitle(pdfData, filename, metadataOverride) {
    if (metadataOverride?.title) {
      return metadataOverride.title.trim();
    }

    if (pdfData.info?.Title) {
      return pdfData.info.Title.trim();
    }

    if (pdfData.text) {
      const lines = pdfData.text.split('\n').map(line => line.trim()).filter(Boolean);
      for (const line of lines.slice(0, 10)) {
        if (line.length > 10 && line.length < 200) {
          if (!line.endsWith('.') && (line.length < 50 || !/^[A-Z\s]+$/.test(line))) {
            return line;
          }
        }
      }
    }

    return this.filenameToTitle(filename);
  }

  filenameToTitle(filename) {
    return path.basename(filename, '.pdf')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  extractDate(pdfData, stats, metadataOverride) {
    if (metadataOverride?.date) {
      const parsed = new Date(metadataOverride.date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    if (pdfData.info?.CreationDate) {
      try {
        const parsed = new Date(pdfData.info.CreationDate);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        // Continue to next option
      }
    }

    return new Date(stats.birthtime || stats.mtime);
  }

  processTags(tags) {
    if (!Array.isArray(tags)) return [];

    return tags
      .filter(tag => typeof tag === 'string' && tag.trim())
      .map(tag => tag.trim().toLowerCase())
      .sort();
  }

  inferCategory(filename, tags) {
    const name = filename.toLowerCase();
    const tagString = tags.join(' ');

    if (name.includes('research') || tagString.includes('research')) return 'research';
    if (name.includes('paper') || tagString.includes('paper')) return 'academic';
    if (name.includes('thesis') || tagString.includes('thesis')) return 'thesis';
    if (name.includes('report') || tagString.includes('report')) return 'report';
    if (name.includes('white') && name.includes('paper')) return 'whitepaper';
    if (name.includes('analysis') || tagString.includes('analysis')) return 'analysis';
    if (name.includes('case') && name.includes('study')) return 'case-study';

    return 'document';
  }

  extractAbstract(pdfData, metadataOverride) {
    if (metadataOverride?.abstract) {
      return metadataOverride.abstract.trim();
    }

    if (!pdfData.text) return 'Abstract not available';

    const text = pdfData.text.toLowerCase();
    const abstractStart = text.indexOf('abstract');

    if (abstractStart !== -1) {
      const afterAbstract = text.substring(abstractStart + 8);
      const possibleEnds = [
        afterAbstract.indexOf('\nintroduction'),
        afterAbstract.indexOf('\n1.'),
        afterAbstract.indexOf('\nkeywords'),
        afterAbstract.indexOf('\n\n'),
        500
      ].filter(pos => pos > 0);

      if (possibleEnds.length > 0) {
        const endPos = Math.min(...possibleEnds);
        const abstractText = afterAbstract.substring(0, endPos).trim();

        if (abstractText.length > 50) {
          return abstractText.length > 500
            ? abstractText.substring(0, 500) + '...'
            : abstractText;
        }
      }
    }

    const paragraphs = pdfData.text.split('\n\n');
    for (const para of paragraphs) {
      const cleaned = para.trim();
      if (cleaned.length > 100 && cleaned.length < 500) {
        return cleaned;
      }
    }

    return 'Abstract not available';
  }

  generateDownloadUrl(filename) {
    return `/content/papers/${encodeURIComponent(filename)}`;
  }

  sanitizePdfInfo(info) {
    const {
      Title,
      Author,
      Subject,
      Creator,
      Producer,
      CreationDate,
      ModDate,
      ...other
    } = info;

    return {
      Title,
      Author,
      Subject,
      Creator,
      Producer,
      CreationDate,
      ModDate
    };
  }

  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  createMinimalEntry(paper, error) {
    const { filename, stats } = paper;
    const slug = path.basename(filename, '.pdf');

    return {
      id: slug,
      slug,
      title: this.filenameToTitle(filename),
      filename,
      date: stats.mtime.toISOString(),
      category: 'document',
      tags: [],
      abstract: 'Abstract not available - PDF processing error',
      downloadUrl: this.generateDownloadUrl(filename),
      fullText: '',
      sections: {},
      citations: { totalCitations: 0, references: [], inTextCitations: [], dois: [], urls: [] },
      contentAnalysis: this.getEmptyContentAnalysis(),
      semanticTags: [],
      authorAnalysis: { extractedAuthors: [], institutions: [], emails: [], confidence: 0 },
      metadata: {
        fileSize: stats.size,
        fileSizeHuman: this.formatFileSize(stats.size),
        pageCount: 0,
        lastModified: stats.mtime.toISOString(),
        created: stats.birthtime?.toISOString() || stats.mtime.toISOString(),
        pdfInfo: {},
        hasMetadataOverride: Boolean(paper.metadataOverride),
        processingStatus: 'error',
        processingError: error.message,
        processingVersion: '2.0.0',
        nlpProcessed: false
      }
    };
  }

  async generateAnalytics(papers) {
    console.log('📊 Generating advanced analytics...');

    const analytics = {
      overview: this.generateOverviewAnalytics(papers),
      content: this.generateContentAnalytics(papers),
      citations: this.generateCitationAnalytics(papers),
      topics: this.generateTopicAnalytics(papers),
      authors: this.generateAuthorAnalytics(papers),
      temporal: this.generateTemporalAnalytics(papers),
      quality: this.generateQualityAnalytics(papers)
    };

    return analytics;
  }

  generateOverviewAnalytics(papers) {
    const successful = papers.filter(p => p.metadata.processingStatus === 'success');
    const withNLP = papers.filter(p => p.metadata.nlpProcessed);

    return {
      totalPapers: papers.length,
      successfullyProcessed: successful.length,
      nlpProcessed: withNLP.length,
      processingSuccessRate: papers.length > 0 ? successful.length / papers.length : 0,
      totalSize: papers.reduce((sum, p) => sum + p.metadata.fileSize, 0),
      totalPages: papers.reduce((sum, p) => sum + p.metadata.pageCount, 0),
      averagePages: papers.length > 0 ? papers.reduce((sum, p) => sum + p.metadata.pageCount, 0) / papers.length : 0
    };
  }

  generateContentAnalytics(papers) {
    const nlpPapers = papers.filter(p => p.metadata.nlpProcessed && p.contentAnalysis);

    if (nlpPapers.length === 0) {
      return {
        averageWordCount: 0,
        averageComplexity: 0,
        averageReadability: 0,
        topLanguages: [],
        vocabularyStats: {}
      };
    }

    const totalWords = nlpPapers.reduce((sum, p) => sum + p.contentAnalysis.wordCount, 0);
    const avgComplexity = nlpPapers.reduce((sum, p) => sum + p.contentAnalysis.complexityScore, 0) / nlpPapers.length;
    const avgReadability = nlpPapers.reduce((sum, p) => sum + p.contentAnalysis.readabilityScore, 0) / nlpPapers.length;

    const languageCounts = {};
    nlpPapers.forEach(paper => {
      const lang = paper.contentAnalysis.language || 'unknown';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    return {
      averageWordCount: totalWords / nlpPapers.length,
      averageComplexity: avgComplexity,
      averageReadability: avgReadability,
      topLanguages: Object.entries(languageCounts)
        .map(([lang, count]) => ({ language: lang, count }))
        .sort((a, b) => b.count - a.count),
      vocabularyStats: {
        totalUniqueWords: new Set(nlpPapers.flatMap(p => p.contentAnalysis.topKeywords.map(k => k.term))).size,
        averageVocabularyRichness: nlpPapers.reduce((sum, p) => sum + p.contentAnalysis.vocabularyRichness, 0) / nlpPapers.length
      }
    };
  }

  generateCitationAnalytics(papers) {
    const papersWithCitations = papers.filter(p => p.citations && p.citations.totalCitations > 0);

    if (papersWithCitations.length === 0) {
      return {
        totalCitations: 0,
        averageCitations: 0,
        citationStyles: {},
        topDois: []
      };
    }

    const totalCitations = papersWithCitations.reduce((sum, p) => sum + p.citations.totalCitations, 0);

    const styleCounts = {};
    papersWithCitations.forEach(paper => {
      const style = paper.citations.citationStyle || 'unknown';
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    });

    const allDois = papersWithCitations.flatMap(p => p.citations.dois || []);
    const doiCounts = {};
    allDois.forEach(doi => {
      doiCounts[doi] = (doiCounts[doi] || 0) + 1;
    });

    return {
      totalCitations,
      averageCitations: totalCitations / papersWithCitations.length,
      citationStyles: styleCounts,
      topDois: Object.entries(doiCounts)
        .map(([doi, count]) => ({ doi, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
    };
  }

  generateTopicAnalytics(papers) {
    const nlpPapers = papers.filter(p => p.contentAnalysis && p.contentAnalysis.topicScores);

    if (nlpPapers.length === 0) {
      return { topicDistribution: {}, dominantTopics: [] };
    }

    const topicTotals = {};
    nlpPapers.forEach(paper => {
      Object.entries(paper.contentAnalysis.topicScores).forEach(([topic, score]) => {
        topicTotals[topic] = (topicTotals[topic] || 0) + score;
      });
    });

    const topicDistribution = {};
    Object.entries(topicTotals).forEach(([topic, total]) => {
      topicDistribution[topic] = total / nlpPapers.length;
    });

    const dominantTopics = Object.entries(topicDistribution)
      .map(([topic, score]) => ({ topic, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      topicDistribution,
      dominantTopics
    };
  }

  generateAuthorAnalytics(papers) {
    const authorsMap = {};
    const institutionsMap = {};

    papers.forEach(paper => {
      if (paper.authorAnalysis && paper.authorAnalysis.extractedAuthors) {
        paper.authorAnalysis.extractedAuthors.forEach(author => {
          const authorKey = typeof author === 'string' ? author : author.name || author;
          authorsMap[authorKey] = (authorsMap[authorKey] || 0) + 1;
        });
      }

      if (paper.authorAnalysis && paper.authorAnalysis.institutions) {
        paper.authorAnalysis.institutions.forEach(institution => {
          institutionsMap[institution] = (institutionsMap[institution] || 0) + 1;
        });
      }
    });

    return {
      totalUniqueAuthors: Object.keys(authorsMap).length,
      topAuthors: Object.entries(authorsMap)
        .map(([author, count]) => ({ author, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      topInstitutions: Object.entries(institutionsMap)
        .map(([institution, count]) => ({ institution, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    };
  }

  generateTemporalAnalytics(papers) {
    const yearCounts = {};
    const monthCounts = {};

    papers.forEach(paper => {
      if (paper.date) {
        const date = new Date(paper.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        yearCounts[year] = (yearCounts[year] || 0) + 1;
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      }
    });

    const dateRange = this.getDateRange(papers);

    return {
      publicationsByYear: Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => a.year - b.year),
      publicationsByMonth: Object.entries(monthCounts)
        .map(([month, count]) => ({ month: parseInt(month), count }))
        .sort((a, b) => a.month - b.month),
      dateRange
    };
  }

  generateQualityAnalytics(papers) {
    const nlpPapers = papers.filter(p => p.metadata.nlpProcessed);

    if (nlpPapers.length === 0) {
      return {
        averageQualityScore: 0,
        structureStats: {},
        completenessStats: {}
      };
    }

    const qualityScores = nlpPapers.map(paper => {
      let score = 0;

      // Structure indicators (40% weight)
      if (paper.metadata.hasAbstract) score += 0.1;
      if (paper.metadata.hasIntroduction) score += 0.1;
      if (paper.metadata.hasConclusion) score += 0.1;
      if (paper.metadata.sectionCount >= 4) score += 0.1;

      // Content indicators (30% weight)
      if (paper.contentAnalysis.wordCount > 1000) score += 0.1;
      if (paper.contentAnalysis.complexityScore > 0.3) score += 0.1;
      if (paper.contentAnalysis.vocabularyRichness > 0.3) score += 0.1;

      // Citation indicators (20% weight)
      if (paper.citations.totalCitations > 0) score += 0.1;
      if (paper.citations.references.length > 5) score += 0.1;

      // Metadata indicators (10% weight)
      if (paper.metadata.pageCount > 5) score += 0.05;
      if (paper.authorAnalysis.confidence > 0.7) score += 0.05;

      return score;
    });

    const avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    const structureStats = {
      withAbstract: nlpPapers.filter(p => p.metadata.hasAbstract).length,
      withIntroduction: nlpPapers.filter(p => p.metadata.hasIntroduction).length,
      withConclusion: nlpPapers.filter(p => p.metadata.hasConclusion).length,
      averageSections: nlpPapers.reduce((sum, p) => sum + p.metadata.sectionCount, 0) / nlpPapers.length
    };

    return {
      averageQualityScore: avgQualityScore,
      structureStats,
      qualityDistribution: this.categorizeQuality(qualityScores)
    };
  }

  categorizeQuality(scores) {
    const categories = { high: 0, medium: 0, low: 0 };

    scores.forEach(score => {
      if (score >= 0.7) categories.high++;
      else if (score >= 0.4) categories.medium++;
      else categories.low++;
    });

    return categories;
  }

  getDateRange(papers) {
    if (papers.length === 0) return null;

    const dates = papers.map(p => new Date(p.date));
    return {
      earliest: new Date(Math.min(...dates)).toISOString(),
      latest: new Date(Math.max(...dates)).toISOString()
    };
  }

  async createAdvancedSearchIndex(papers) {
    console.log('🔍 Creating advanced search index...');

    const searchDocuments = papers.map(paper => ({
      id: paper.id,
      type: 'paper',
      title: paper.title,
      abstract: paper.abstract,
      fullText: paper.fullText,
      sections: paper.sections,
      url: `/research.html#${paper.slug}`,

      // Enhanced search fields
      authors: paper.authorAnalysis.extractedAuthors,
      keywords: paper.contentAnalysis.topKeywords,
      entities: paper.contentAnalysis.entities,
      semanticTags: paper.semanticTags,
      topics: Object.keys(paper.contentAnalysis.topicScores),

      // Metadata for filtering
      category: paper.category,
      tags: paper.tags,
      date: paper.date,
      wordCount: paper.contentAnalysis.wordCount,
      complexity: paper.contentAnalysis.complexityScore,
      citationCount: paper.citations.totalCitations,

      // Search boosts
      boost: this.calculateSearchBoost(paper)
    }));

    const searchIndex = {
      documents: searchDocuments,

      // Enhanced search capabilities
      termIndex: this.buildTermIndex(searchDocuments),
      semanticIndex: this.buildSemanticIndex(searchDocuments),
      authorIndex: this.buildAuthorIndex(searchDocuments),
      topicIndex: this.buildTopicIndex(searchDocuments),

      // Search filters
      filters: {
        categories: [...new Set(papers.map(p => p.category))],
        topics: [...new Set(papers.flatMap(p => Object.keys(p.contentAnalysis.topicScores)))],
        authors: [...new Set(papers.flatMap(p => p.authorAnalysis.extractedAuthors))],
        dateRange: this.getDateRange(papers),
        complexityRange: this.getComplexityRange(papers),
        citationRange: this.getCitationRange(papers)
      },

      metadata: {
        totalDocuments: papers.length,
        lastGenerated: new Date().toISOString(),
        version: '2.0.0',
        features: [
          'full-text-search',
          'semantic-search',
          'author-search',
          'topic-modeling',
          'citation-analysis',
          'complexity-filtering'
        ]
      }
    };

    return searchIndex;
  }

  calculateSearchBoost(paper) {
    let boost = 1.0;

    // Quality-based boost
    if (paper.metadata.hasAbstract) boost += 0.2;
    if (paper.metadata.sectionCount >= 4) boost += 0.1;

    // Content-based boost
    if (paper.contentAnalysis.wordCount > 5000) boost += 0.2;
    if (paper.contentAnalysis.complexityScore > 0.5) boost += 0.1;

    // Citation-based boost
    if (paper.citations.totalCitations > 10) boost += 0.3;
    if (paper.citations.dois.length > 0) boost += 0.1;

    return Math.min(2.0, boost); // Cap at 2.0
  }

  buildTermIndex(documents) {
    const termIndex = {};

    documents.forEach((doc, docIndex) => {
      // Index title terms (high weight)
      this.indexTerms(doc.title, docIndex, 3.0, termIndex);

      // Index abstract terms (medium weight)
      this.indexTerms(doc.abstract, docIndex, 2.0, termIndex);

      // Index full text terms (base weight)
      if (doc.fullText) {
        this.indexTerms(doc.fullText.substring(0, 10000), docIndex, 1.0, termIndex);
      }

      // Index keywords (high weight)
      doc.keywords.forEach(keyword => {
        this.indexTerm(keyword.term, docIndex, 2.5, termIndex);
      });
    });

    return termIndex;
  }

  indexTerms(text, docIndex, weight, termIndex) {
    if (!text) return;

    const terms = this.tokenizeText(text);
    const termCounts = {};

    terms.forEach(term => {
      if (term.length > 2 && !stopword.en.includes(term)) {
        termCounts[term] = (termCounts[term] || 0) + 1;
      }
    });

    Object.entries(termCounts).forEach(([term, count]) => {
      this.indexTerm(term, docIndex, weight * Math.log(count + 1), termIndex);
    });
  }

  indexTerm(term, docIndex, weight, termIndex) {
    if (!termIndex[term]) {
      termIndex[term] = [];
    }

    termIndex[term].push({
      docIndex,
      weight: Math.round(weight * 100) / 100
    });
  }

  buildSemanticIndex(documents) {
    const semanticIndex = {};

    documents.forEach((doc, docIndex) => {
      doc.entities.forEach(entity => {
        const key = `entity:${entity.type}:${entity.text.toLowerCase()}`;
        if (!semanticIndex[key]) semanticIndex[key] = [];
        semanticIndex[key].push({
          docIndex,
          confidence: entity.confidence
        });
      });

      doc.semanticTags.forEach(tag => {
        if (!semanticIndex[tag]) semanticIndex[tag] = [];
        semanticIndex[tag].push({ docIndex, weight: 1.0 });
      });
    });

    return semanticIndex;
  }

  buildAuthorIndex(documents) {
    const authorIndex = {};

    documents.forEach((doc, docIndex) => {
      doc.authors.forEach(author => {
        const authorKey = typeof author === 'string' ? author : author.name || author;
        if (!authorIndex[authorKey]) authorIndex[authorKey] = [];
        authorIndex[authorKey].push(docIndex);
      });
    });

    return authorIndex;
  }

  buildTopicIndex(documents) {
    const topicIndex = {};

    documents.forEach((doc, docIndex) => {
      doc.topics.forEach(topic => {
        if (!topicIndex[topic]) topicIndex[topic] = [];
        topicIndex[topic].push(docIndex);
      });
    });

    return topicIndex;
  }

  getComplexityRange(papers) {
    const complexities = papers
      .filter(p => p.contentAnalysis && p.contentAnalysis.complexityScore)
      .map(p => p.contentAnalysis.complexityScore);

    if (complexities.length === 0) return { min: 0, max: 1 };

    return {
      min: Math.min(...complexities),
      max: Math.max(...complexities)
    };
  }

  getCitationRange(papers) {
    const citations = papers
      .filter(p => p.citations && p.citations.totalCitations)
      .map(p => p.citations.totalCitations);

    if (citations.length === 0) return { min: 0, max: 0 };

    return {
      min: Math.min(...citations),
      max: Math.max(...citations)
    };
  }

  sortPapers(papers) {
    return papers.sort((a, b) => {
      // Primary sort: processing status (successful first)
      if (a.metadata.processingStatus !== b.metadata.processingStatus) {
        return a.metadata.processingStatus === 'success' ? -1 : 1;
      }

      // Secondary sort: date (newest first)
      return new Date(b.date) - new Date(a.date);
    });
  }

  async writeOutput(papers, analytics, searchIndex) {
    // Main papers data
    const papersOutput = {
      papers,
      analytics,
      metadata: {
        total: papers.length,
        successful: papers.filter(p => p.metadata.processingStatus === 'success').length,
        withNLP: papers.filter(p => p.metadata.nlpProcessed).length,
        lastUpdated: new Date().toISOString(),
        processingVersion: '2.0.0',
        features: [
          'full-text-extraction',
          'nlp-analysis',
          'topic-modeling',
          'citation-extraction',
          'semantic-tagging',
          'advanced-search'
        ]
      }
    };

    await fs.writeFile(this.outputFile, JSON.stringify(papersOutput, null, 2));
    console.log(`📄 Generated: ${this.outputFile}`);

    // Enhanced search index
    await fs.writeFile(this.searchIndexFile, JSON.stringify(searchIndex, null, 2));
    console.log(`🔍 Generated: ${this.searchIndexFile}`);

    // Full-text index (for detailed search)
    const fullTextIndex = {
      documents: papers.map(paper => ({
        id: paper.id,
        title: paper.title,
        fullText: paper.fullText,
        sections: paper.sections,
        keywords: paper.contentAnalysis.topKeywords,
        entities: paper.contentAnalysis.entities,
        lastUpdated: new Date().toISOString()
      })),
      metadata: {
        purpose: 'Full-text search with complete content',
        totalDocuments: papers.length,
        lastGenerated: new Date().toISOString()
      }
    };

    await fs.writeFile(this.fullTextFile, JSON.stringify(fullTextIndex, null, 2));
    console.log(`📖 Generated: ${this.fullTextFile}`);
  }

  async generateReports(papers, analytics) {
    console.log('📊 Generating processing reports...');

    const reportDir = path.join(this.dataDir, 'reports');
    await fs.mkdir(reportDir, { recursive: true });

    // Processing summary report
    const summaryReport = {
      timestamp: new Date().toISOString(),
      processing: {
        totalFiles: papers.length,
        successful: papers.filter(p => p.metadata.processingStatus === 'success').length,
        failed: papers.filter(p => p.metadata.processingStatus === 'error').length,
        nlpProcessed: papers.filter(p => p.metadata.nlpProcessed).length
      },
      content: analytics.content,
      topics: analytics.topics,
      quality: analytics.quality,
      performance: {
        averageProcessingTime: 'Not tracked', // Could be added in future
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    await fs.writeFile(
      path.join(reportDir, 'processing-summary.json'),
      JSON.stringify(summaryReport, null, 2)
    );

    // Error report (if there are any errors)
    const errorPapers = papers.filter(p => p.metadata.processingStatus === 'error');
    if (errorPapers.length > 0) {
      const errorReport = {
        timestamp: new Date().toISOString(),
        totalErrors: errorPapers.length,
        errors: errorPapers.map(paper => ({
          filename: paper.filename,
          error: paper.metadata.processingError,
          fileSize: paper.metadata.fileSize,
          lastModified: paper.metadata.lastModified
        }))
      };

      await fs.writeFile(
        path.join(reportDir, 'processing-errors.json'),
        JSON.stringify(errorReport, null, 2)
      );
    }

    console.log(`📋 Reports generated in: ${reportDir}`);
  }
}

// Run if called directly
if (require.main === module) {
  const processor = new EnhancedPaperProcessor();
  processor.process();
}

module.exports = EnhancedPaperProcessor;