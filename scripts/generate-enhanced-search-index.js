#!/usr/bin/env node

/**
 * Enhanced Search Index Generator - Phase 2
 * Creates advanced search capabilities with semantic search, topic filtering, and NLP-powered relevance
 */

const fs = require('fs').promises;
const path = require('path');
const natural = require('natural');
const stopword = require('stopword');
const stemmer = require('stemmer');

class EnhancedSearchIndexGenerator {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.outputFile = path.join(this.dataDir, 'enhanced-search-index.json');
    this.semanticIndexFile = path.join(this.dataDir, 'semantic-search-index.json');
    this.topicIndexFile = path.join(this.dataDir, 'topic-search-index.json');

    // Enhanced search configuration
    this.config = {
      minWordLength: 2,
      maxIndexSize: 2000000, // 2MB limit for enhanced index
      stopWords: new Set([
        ...stopword.en,
        'paper', 'study', 'research', 'analysis', 'approach', 'method',
        'result', 'conclusion', 'abstract', 'introduction', 'discussion'
      ]),
      stemming: true,
      fuzzySearch: true,
      semanticSearch: true,
      topicModeling: true,

      // Search weights
      weights: {
        title: 3.0,
        abstract: 2.5,
        keywords: 2.0,
        entities: 1.8,
        fullText: 1.0,
        tags: 1.5,
        authors: 1.2
      },

      // Relevance factors
      relevanceFactors: {
        exactMatch: 2.0,
        stemMatch: 1.5,
        partialMatch: 1.2,
        semanticMatch: 1.3,
        topicMatch: 1.4,
        authorMatch: 1.6,
        citationBoost: 1.3,
        qualityBoost: 1.2
      }
    };

    // Initialize NLP components
    this.initializeNLP();
  }

  initializeNLP() {
    // TF-IDF for relevance scoring
    this.tfidf = new natural.TfIdf();

    // Phonetic matching for fuzzy search
    this.metaphone = natural.Metaphone;
    this.doubleMetaphone = natural.DoubleMetaphone;

    // Distance metrics
    this.jaroWinkler = natural.JaroWinklerDistance;
    this.levenshtein = natural.LevenshteinDistance;

    console.log('🔬 Enhanced NLP components initialized');
  }

  async generate() {
    console.log('🔍 Generating enhanced search index with semantic capabilities...');

    try {
      // Load all content data including enhanced papers
      const contentData = await this.loadEnhancedContentData();

      // Create comprehensive search documents
      const documents = this.createEnhancedSearchDocuments(contentData);

      // Build multi-layered search indices
      const searchIndices = await this.buildSearchIndices(documents);

      // Generate semantic search capabilities
      const semanticIndex = await this.buildSemanticIndex(documents);

      // Create topic-based search index
      const topicIndex = await this.buildTopicIndex(documents);

      // Combine into master search index
      const masterIndex = this.createMasterIndex(documents, searchIndices, semanticIndex, topicIndex);

      // Write all index files
      await this.writeSearchIndices(masterIndex, semanticIndex, topicIndex);

      // Generate search statistics and performance metrics
      this.generateSearchStatistics(masterIndex, documents);

      console.log('✅ Enhanced search index generation completed');

    } catch (error) {
      console.error('❌ Error generating enhanced search index:', error.message);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }

  async loadEnhancedContentData() {
    const contentFiles = ['projects.json', 'papers.json', 'testimonials.json'];
    const data = {};

    for (const file of contentFiles) {
      const filePath = path.join(this.dataDir, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        const type = path.basename(file, '.json');

        // Handle both old and new data structures
        if (parsed.papers) {
          // New enhanced structure
          data[type] = parsed;
        } else if (Array.isArray(parsed)) {
          // Old structure compatibility
          data[type] = { [type]: parsed, metadata: {} };
        } else {
          data[type] = parsed;
        }

        console.log(`📄 Loaded ${type}: ${(data[type][type] || []).length} items`);
      } catch (error) {
        console.warn(`⚠️  Could not load ${file}: ${error.message}`);
        data[path.basename(file, '.json')] = { [path.basename(file, '.json')]: [], metadata: {} };
      }
    }

    return data;
  }

  createEnhancedSearchDocuments(contentData) {
    const documents = [];

    // Process enhanced papers with full NLP data
    const papers = contentData.papers?.papers || [];
    papers.forEach(paper => {
      const doc = {
        id: `paper-${paper.id}`,
        type: 'paper',
        title: paper.title,
        description: paper.abstract || '',
        content: this.extractPaperContent(paper),
        url: `/research.html#${paper.slug}`,

        // Basic metadata
        tags: paper.tags || [],
        category: paper.category || 'research',
        date: paper.date,
        featured: false,

        // Enhanced fields from NLP processing
        fullText: paper.fullText || '',
        sections: paper.sections || {},
        authors: paper.authorAnalysis?.extractedAuthors || [],
        institutions: paper.authorAnalysis?.institutions || [],

        // NLP analysis data
        keywords: paper.contentAnalysis?.topKeywords || [],
        entities: paper.contentAnalysis?.entities || [],
        semanticTags: paper.semanticTags || [],
        topicScores: paper.contentAnalysis?.topicScores || {},

        // Quality and citation metrics
        wordCount: paper.contentAnalysis?.wordCount || 0,
        complexityScore: paper.contentAnalysis?.complexityScore || 0,
        citationCount: paper.citations?.totalCitations || 0,
        qualityScore: this.calculateQualityScore(paper),

        // Search boost calculation
        boost: this.calculateSearchBoost(paper),

        // Processing metadata
        nlpProcessed: paper.metadata?.nlpProcessed || false,
        processingVersion: paper.metadata?.processingVersion || '1.0.0'
      };

      // Generate enhanced search terms
      doc.searchTerms = this.generateEnhancedSearchTerms(doc);
      doc.phonetics = this.generatePhoneticTerms(doc.searchTerms);

      documents.push(doc);
    });

    // Process projects (keeping existing logic but enhancing)
    const projects = contentData.projects?.projects || [];
    projects.forEach(project => {
      const doc = {
        id: `project-${project.id}`,
        type: 'project',
        title: project.title,
        description: project.description || project.excerpt || '',
        content: this.extractProjectContent(project),
        url: `/projects.html#${project.slug}`,
        tags: project.tech || [],
        category: project.category || 'project',
        date: project.date,
        featured: project.featured || false,

        // Enhanced fields
        fullText: project.description || project.excerpt || '',
        sections: {},
        authors: [],
        institutions: [],
        keywords: this.extractProjectKeywords(project),
        entities: [],
        semanticTags: [],
        topicScores: {},

        // Metrics
        wordCount: (project.description || '').split(/\s+/).length,
        complexityScore: 0.3, // Default for projects
        citationCount: 0,
        qualityScore: project.featured ? 0.8 : 0.6,

        boost: project.featured ? 1.5 : 1.0,
        nlpProcessed: false,
        processingVersion: '1.0.0'
      };

      doc.searchTerms = this.generateEnhancedSearchTerms(doc);
      doc.phonetics = this.generatePhoneticTerms(doc.searchTerms);

      documents.push(doc);
    });

    // Process testimonials
    const testimonials = contentData.testimonials?.testimonials || [];
    testimonials.forEach(testimonial => {
      const doc = {
        id: `testimonial-${testimonial.id}`,
        type: 'testimonial',
        title: `Testimonial from ${testimonial.author?.name || 'Anonymous'}`,
        description: this.truncate(testimonial.content, 200),
        content: this.extractTestimonialContent(testimonial),
        url: `/testimonials.html#${testimonial.slug}`,
        tags: this.extractTestimonialTags(testimonial),
        category: 'testimonial',
        date: testimonial.date,
        featured: testimonial.featured || false,

        // Enhanced fields
        fullText: testimonial.content || '',
        sections: {},
        authors: [testimonial.author?.name].filter(Boolean),
        institutions: [testimonial.author?.company].filter(Boolean),
        keywords: [],
        entities: [],
        semanticTags: [],
        topicScores: {},

        // Metrics
        wordCount: (testimonial.content || '').split(/\s+/).length,
        complexityScore: 0.2,
        citationCount: 0,
        qualityScore: testimonial.featured ? 0.7 : 0.5,

        boost: testimonial.featured ? 1.2 : 0.8,
        nlpProcessed: false,
        processingVersion: '1.0.0'
      };

      doc.searchTerms = this.generateEnhancedSearchTerms(doc);
      doc.phonetics = this.generatePhoneticTerms(doc.searchTerms);

      documents.push(doc);
    });

    console.log(`📚 Created ${documents.length} enhanced search documents`);
    return documents;
  }

  generateEnhancedSearchTerms(doc) {
    const terms = new Set();

    // Extract terms from various fields with different weights
    this.addTermsFromText(doc.title, terms, this.config.weights.title);
    this.addTermsFromText(doc.description, terms, this.config.weights.abstract);
    this.addTermsFromText(doc.content, terms, this.config.weights.fullText);

    // Add keyword terms
    doc.keywords.forEach(keyword => {
      if (typeof keyword === 'object' && keyword.term) {
        this.addTerm(keyword.term, terms, this.config.weights.keywords);
      } else if (typeof keyword === 'string') {
        this.addTerm(keyword, terms, this.config.weights.keywords);
      }
    });

    // Add entity terms
    doc.entities.forEach(entity => {
      if (entity.text) {
        this.addTerm(entity.text, terms, this.config.weights.entities);
      }
    });

    // Add tag terms
    doc.tags.forEach(tag => {
      this.addTerm(tag, terms, this.config.weights.tags);
    });

    // Add author terms
    doc.authors.forEach(author => {
      this.addTerm(author, terms, this.config.weights.authors);
    });

    // Add semantic tag terms
    doc.semanticTags.forEach(tag => {
      this.addTerm(tag, terms, 1.5);
    });

    // Convert to array with weights
    return Array.from(terms).map(termData => {
      const [term, weight] = termData.split(':weight:');
      return {
        term: term,
        weight: parseFloat(weight) || 1.0,
        stemmed: this.config.stemming ? stemmer(term) : term
      };
    });
  }

  addTermsFromText(text, terms, weight = 1.0) {
    if (!text) return;

    const words = this.tokenizeText(text);
    words.forEach(word => {
      this.addTerm(word, terms, weight);
    });
  }

  addTerm(term, terms, weight = 1.0) {
    if (!term || typeof term !== 'string') return;

    const normalized = this.normalizeText(term);
    if (normalized.length >= this.config.minWordLength && !this.config.stopWords.has(normalized)) {
      terms.add(`${normalized}:weight:${weight}`);
    }
  }

  generatePhoneticTerms(searchTerms) {
    const phonetics = {};

    searchTerms.forEach(termData => {
      const term = termData.term;
      if (term.length > 2) {
        phonetics[term] = {
          metaphone: this.metaphone.process(term),
          doubleMetaphone: this.doubleMetaphone.process(term),
          soundex: natural.SoundEx.process(term)
        };
      }
    });

    return phonetics;
  }

  async buildSearchIndices(documents) {
    console.log('🏗️  Building multi-layered search indices...');

    const indices = {
      term: await this.buildTermIndex(documents),
      phrase: await this.buildPhraseIndex(documents),
      exact: await this.buildExactMatchIndex(documents),
      fuzzy: await this.buildFuzzyIndex(documents),
      category: this.buildCategoryIndex(documents),
      temporal: this.buildTemporalIndex(documents)
    };

    return indices;
  }

  async buildTermIndex(documents) {
    const termIndex = new Map();

    documents.forEach((doc, docIndex) => {
      doc.searchTerms.forEach(termData => {
        const term = termData.term;
        const weight = termData.weight;

        if (!termIndex.has(term)) {
          termIndex.set(term, {
            term,
            documents: [],
            frequency: 0,
            idf: 0 // Will be calculated later
          });
        }

        const entry = termIndex.get(term);
        entry.documents.push({
          docIndex,
          weight,
          boost: doc.boost,
          type: doc.type,
          relevance: this.calculateTermRelevance(term, doc, weight)
        });
        entry.frequency++;
      });
    });

    // Calculate IDF (Inverse Document Frequency) scores
    const totalDocs = documents.length;
    termIndex.forEach(entry => {
      entry.idf = Math.log(totalDocs / entry.frequency);
    });

    return this.optimizeTermIndex(termIndex);
  }

  async buildPhraseIndex(documents) {
    const phraseIndex = new Map();

    documents.forEach((doc, docIndex) => {
      // Extract phrases from title and description
      const phrases = [
        ...this.extractPhrases(doc.title, 2, 4),
        ...this.extractPhrases(doc.description, 2, 3)
      ];

      phrases.forEach(phrase => {
        if (!phraseIndex.has(phrase)) {
          phraseIndex.set(phrase, []);
        }

        phraseIndex.get(phrase).push({
          docIndex,
          boost: doc.boost,
          type: doc.type
        });
      });
    });

    return this.convertMapToObject(phraseIndex);
  }

  async buildExactMatchIndex(documents) {
    const exactIndex = {};

    documents.forEach((doc, docIndex) => {
      // Index exact titles and key phrases
      const exactTerms = [
        doc.title.toLowerCase(),
        ...doc.authors,
        ...doc.tags,
        doc.category
      ].filter(Boolean);

      exactTerms.forEach(term => {
        const key = this.normalizeText(term);
        if (!exactIndex[key]) exactIndex[key] = [];
        exactIndex[key].push({
          docIndex,
          boost: doc.boost * this.config.relevanceFactors.exactMatch,
          type: doc.type
        });
      });
    });

    return exactIndex;
  }

  async buildFuzzyIndex(documents) {
    const fuzzyIndex = {};

    documents.forEach((doc, docIndex) => {
      Object.entries(doc.phonetics || {}).forEach(([term, phonetic]) => {
        // Index by metaphone for fuzzy matching
        const metaphoneKey = phonetic.metaphone;
        if (metaphoneKey) {
          if (!fuzzyIndex[metaphoneKey]) fuzzyIndex[metaphoneKey] = [];
          fuzzyIndex[metaphoneKey].push({
            originalTerm: term,
            docIndex,
            boost: doc.boost,
            type: doc.type
          });
        }
      });
    });

    return fuzzyIndex;
  }

  buildCategoryIndex(documents) {
    const categoryIndex = {};

    documents.forEach((doc, docIndex) => {
      const category = doc.category || 'uncategorized';
      if (!categoryIndex[category]) categoryIndex[category] = [];
      categoryIndex[category].push(docIndex);
    });

    return categoryIndex;
  }

  buildTemporalIndex(documents) {
    const temporalIndex = {
      byYear: {},
      byMonth: {},
      chronological: []
    };

    documents.forEach((doc, docIndex) => {
      if (doc.date) {
        const date = new Date(doc.date);
        const year = date.getFullYear();
        const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Index by year
        if (!temporalIndex.byYear[year]) temporalIndex.byYear[year] = [];
        temporalIndex.byYear[year].push(docIndex);

        // Index by month
        if (!temporalIndex.byMonth[month]) temporalIndex.byMonth[month] = [];
        temporalIndex.byMonth[month].push(docIndex);

        // Chronological list
        temporalIndex.chronological.push({
          docIndex,
          date: doc.date,
          timestamp: date.getTime()
        });
      }
    });

    // Sort chronological index
    temporalIndex.chronological.sort((a, b) => b.timestamp - a.timestamp);

    return temporalIndex;
  }

  async buildSemanticIndex(documents) {
    console.log('🧠 Building semantic search index...');

    const semanticIndex = {
      entities: {},
      topics: {},
      concepts: {},
      relations: {}
    };

    documents.forEach((doc, docIndex) => {
      // Index entities
      doc.entities.forEach(entity => {
        const key = `${entity.type}:${entity.text.toLowerCase()}`;
        if (!semanticIndex.entities[key]) semanticIndex.entities[key] = [];
        semanticIndex.entities[key].push({
          docIndex,
          confidence: entity.confidence || 0.5,
          boost: doc.boost
        });
      });

      // Index topics
      Object.entries(doc.topicScores).forEach(([topic, score]) => {
        if (score > 0.1) { // Only include meaningful topic associations
          if (!semanticIndex.topics[topic]) semanticIndex.topics[topic] = [];
          semanticIndex.topics[topic].push({
            docIndex,
            score,
            boost: doc.boost
          });
        }
      });

      // Index semantic tags
      doc.semanticTags.forEach(tag => {
        if (!semanticIndex.concepts[tag]) semanticIndex.concepts[tag] = [];
        semanticIndex.concepts[tag].push({
          docIndex,
          boost: doc.boost
        });
      });
    });

    return semanticIndex;
  }

  async buildTopicIndex(documents) {
    console.log('📊 Building topic-based search index...');

    const topicIndex = {
      byTopic: {},
      topicDistribution: {},
      topicRelations: {},
      documentTopics: {}
    };

    // Build topic associations
    documents.forEach((doc, docIndex) => {
      const docTopics = [];

      Object.entries(doc.topicScores).forEach(([topic, score]) => {
        if (score > 0.2) { // Threshold for topic relevance
          if (!topicIndex.byTopic[topic]) topicIndex.byTopic[topic] = [];
          topicIndex.byTopic[topic].push({
            docIndex,
            score,
            boost: doc.boost,
            type: doc.type
          });

          docTopics.push({ topic, score });

          // Update topic distribution
          if (!topicIndex.topicDistribution[topic]) {
            topicIndex.topicDistribution[topic] = { count: 0, totalScore: 0 };
          }
          topicIndex.topicDistribution[topic].count++;
          topicIndex.topicDistribution[topic].totalScore += score;
        }
      });

      if (docTopics.length > 0) {
        topicIndex.documentTopics[docIndex] = docTopics;
      }
    });

    // Calculate topic relations (topics that frequently appear together)
    this.calculateTopicRelations(topicIndex, documents);

    return topicIndex;
  }

  calculateTopicRelations(topicIndex, documents) {
    const relations = {};

    Object.keys(topicIndex.byTopic).forEach(topic1 => {
      relations[topic1] = {};

      Object.keys(topicIndex.byTopic).forEach(topic2 => {
        if (topic1 !== topic2) {
          let cooccurrence = 0;
          let total1 = topicIndex.byTopic[topic1].length;

          topicIndex.byTopic[topic1].forEach(doc1 => {
            if (topicIndex.byTopic[topic2].some(doc2 => doc2.docIndex === doc1.docIndex)) {
              cooccurrence++;
            }
          });

          const relatedness = total1 > 0 ? cooccurrence / total1 : 0;
          if (relatedness > 0.1) { // Only store meaningful relations
            relations[topic1][topic2] = relatedness;
          }
        }
      });
    });

    topicIndex.topicRelations = relations;
  }

  createMasterIndex(documents, searchIndices, semanticIndex, topicIndex) {
    console.log('🔗 Creating master search index...');

    return {
      // Core search data
      documents: documents.map(doc => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        description: this.truncate(doc.description, 200),
        url: doc.url,
        tags: doc.tags.slice(0, 15), // Limit for size
        category: doc.category,
        date: doc.date,
        featured: doc.featured,
        boost: doc.boost,

        // Enhanced metadata
        authors: doc.authors.slice(0, 10),
        wordCount: doc.wordCount,
        complexityScore: doc.complexityScore,
        citationCount: doc.citationCount,
        qualityScore: doc.qualityScore,
        nlpProcessed: doc.nlpProcessed
      })),

      // Search indices
      indices: {
        term: this.convertMapToObject(searchIndices.term),
        phrase: searchIndices.phrase,
        exact: searchIndices.exact,
        fuzzy: searchIndices.fuzzy,
        category: searchIndices.category,
        temporal: searchIndices.temporal
      },

      // Search filters
      filters: {
        types: this.extractUniqueValues(documents, 'type'),
        categories: this.extractUniqueValues(documents, 'category'),
        tags: this.extractTopTags(documents, 100),
        authors: this.extractTopAuthors(documents, 50),
        dateRange: this.getDateRange(documents),
        complexityRange: this.getComplexityRange(documents),
        citationRange: this.getCitationRange(documents),
        wordCountRange: this.getWordCountRange(documents),
        topics: Object.keys(topicIndex.byTopic)
      },

      // Search configuration
      config: {
        ...this.config,
        totalTerms: searchIndices.term.size,
        indexVersion: '2.0.0',
        capabilities: [
          'full-text-search',
          'semantic-search',
          'fuzzy-search',
          'phrase-search',
          'author-search',
          'topic-filtering',
          'temporal-filtering',
          'complexity-filtering',
          'citation-ranking'
        ]
      },

      // Metadata
      metadata: {
        totalDocuments: documents.length,
        nlpProcessed: documents.filter(d => d.nlpProcessed).length,
        lastGenerated: new Date().toISOString(),
        indexSize: this.calculateIndexSize(searchIndices),
        version: '2.0.0'
      }
    };
  }

  // Utility methods

  calculateQualityScore(paper) {
    let score = 0.5; // Base score

    // Content quality indicators
    if (paper.metadata?.hasAbstract) score += 0.1;
    if (paper.metadata?.hasIntroduction) score += 0.1;
    if (paper.metadata?.hasConclusion) score += 0.1;
    if (paper.metadata?.sectionCount >= 4) score += 0.1;

    // Processing quality
    if (paper.metadata?.nlpProcessed) score += 0.1;
    if (paper.contentAnalysis?.wordCount > 1000) score += 0.1;

    // Citation quality
    if (paper.citations?.totalCitations > 0) score += 0.1;
    if (paper.citations?.references?.length > 5) score += 0.1;

    return Math.min(1.0, score);
  }

  calculateSearchBoost(paper) {
    let boost = 1.0;

    // Quality-based boost
    if (paper.metadata?.hasAbstract) boost += 0.2;
    if (paper.metadata?.sectionCount >= 4) boost += 0.1;

    // Content-based boost
    if (paper.contentAnalysis?.wordCount > 5000) boost += 0.2;
    if (paper.contentAnalysis?.complexityScore > 0.5) boost += 0.1;

    // Citation-based boost
    if (paper.citations?.totalCitations > 10) boost += 0.3;
    if (paper.citations?.dois?.length > 0) boost += 0.1;

    // NLP processing boost
    if (paper.metadata?.nlpProcessed) boost += 0.1;

    return Math.min(2.5, boost); // Cap at 2.5
  }

  calculateTermRelevance(term, document, weight) {
    let relevance = weight;

    // Boost for exact matches in important fields
    if (this.normalizeText(document.title).includes(term)) {
      relevance *= this.config.relevanceFactors.exactMatch;
    }

    // Boost for tag matches
    if (document.tags.some(tag => this.normalizeText(tag).includes(term))) {
      relevance *= this.config.relevanceFactors.partialMatch;
    }

    // Boost for author matches
    if (document.authors.some(author => this.normalizeText(author).includes(term))) {
      relevance *= this.config.relevanceFactors.authorMatch;
    }

    // Apply document boost
    relevance *= document.boost;

    return Math.round(relevance * 100) / 100;
  }

  extractPhrases(text, minLength = 2, maxLength = 4) {
    if (!text) return [];

    const words = this.tokenizeText(text);
    const phrases = [];

    for (let length = minLength; length <= maxLength; length++) {
      for (let i = 0; i <= words.length - length; i++) {
        const phrase = words.slice(i, i + length).join(' ');
        if (phrase.length > 5 && !this.isStopPhrase(phrase)) {
          phrases.push(phrase);
        }
      }
    }

    return phrases;
  }

  isStopPhrase(phrase) {
    const words = phrase.split(' ');
    const stopWordCount = words.filter(word => this.config.stopWords.has(word)).length;
    return stopWordCount / words.length > 0.5; // More than half are stop words
  }

  extractProjectKeywords(project) {
    const keywords = [];

    // Extract from tech stack
    if (project.tech) {
      project.tech.forEach(tech => {
        keywords.push({ term: tech, score: 1.0 });
      });
    }

    // Extract from description
    if (project.description) {
      this.tfidf.addDocument(project.description);
      const terms = this.tfidf.listTerms(0).slice(0, 10);
      terms.forEach(term => {
        keywords.push({ term: term.term, score: term.tfidf });
      });
    }

    return keywords;
  }

  extractProjectContent(project) {
    const parts = [
      project.title,
      project.description || project.excerpt || '',
      (project.tech || []).join(' '),
      project.category || '',
      project.status || ''
    ];

    return parts.filter(Boolean).join(' ');
  }

  extractTestimonialContent(testimonial) {
    const parts = [
      testimonial.content || '',
      testimonial.author?.name || '',
      testimonial.author?.company || '',
      testimonial.author?.title || '',
      testimonial.project || ''
    ];

    return parts.filter(Boolean).join(' ');
  }

  extractTestimonialTags(testimonial) {
    const tags = [];

    if (testimonial.author?.company) tags.push(testimonial.author.company);
    if (testimonial.project) tags.push(testimonial.project);
    if (testimonial.author?.title) tags.push(testimonial.author.title);

    return tags;
  }

  extractTopAuthors(documents, limit = 50) {
    const authorCounts = {};

    documents.forEach(doc => {
      doc.authors.forEach(author => {
        authorCounts[author] = (authorCounts[author] || 0) + 1;
      });
    });

    return Object.entries(authorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([author, count]) => ({ author, count }));
  }

  getWordCountRange(documents) {
    const wordCounts = documents.map(d => d.wordCount).filter(wc => wc > 0);
    if (wordCounts.length === 0) return { min: 0, max: 0 };

    return {
      min: Math.min(...wordCounts),
      max: Math.max(...wordCounts)
    };
  }

  getCitationRange(documents) {
    const citations = documents.map(d => d.citationCount).filter(cc => cc > 0);
    if (citations.length === 0) return { min: 0, max: 0 };

    return {
      min: Math.min(...citations),
      max: Math.max(...citations)
    };
  }

  getComplexityRange(documents) {
    const complexities = documents.map(d => d.complexityScore).filter(cs => cs > 0);
    if (complexities.length === 0) return { min: 0, max: 1 };

    return {
      min: Math.min(...complexities),
      max: Math.max(...complexities)
    };
  }

  getDateRange(documents) {
    const dates = documents.map(d => d.date).filter(Boolean).map(d => new Date(d).getTime());
    if (dates.length === 0) return null;

    return {
      earliest: new Date(Math.min(...dates)).toISOString(),
      latest: new Date(Math.max(...dates)).toISOString()
    };
  }

  extractUniqueValues(documents, field) {
    const values = new Set();
    documents.forEach(doc => {
      if (doc[field]) {
        values.add(doc[field]);
      }
    });
    return Array.from(values).sort();
  }

  extractTopTags(documents, limit = 100) {
    const tagCounts = {};

    documents.forEach(doc => {
      doc.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }

  optimizeTermIndex(termIndex) {
    const optimized = {};

    // Convert Map to object and optimize for size
    termIndex.forEach((data, term) => {
      // Skip very rare terms to reduce index size
      if (data.frequency > 1 || data.documents[0]?.relevance > 2.0) {
        optimized[term] = {
          f: data.frequency,
          idf: Math.round(data.idf * 1000) / 1000, // Round for size
          d: data.documents.map(doc => ({
            i: doc.docIndex,
            w: Math.round(doc.weight * 100) / 100,
            r: Math.round(doc.relevance * 100) / 100,
            t: doc.type[0] // First letter only
          })).slice(0, 50) // Limit documents per term
        };
      }
    });

    return optimized;
  }

  convertMapToObject(map) {
    if (map instanceof Map) {
      const obj = {};
      map.forEach((value, key) => {
        obj[key] = value;
      });
      return obj;
    }
    return map;
  }

  calculateIndexSize(indices) {
    const size = JSON.stringify(indices).length;
    return this.formatBytes(size);
  }

  tokenizeText(text) {
    if (!text) return [];
    return natural.WordTokenizer().tokenize(text.toLowerCase()) || [];
  }

  normalizeText(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  truncate(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  }

  formatBytes(bytes) {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async writeSearchIndices(masterIndex, semanticIndex, topicIndex) {
    // Write master index
    const masterString = JSON.stringify(masterIndex);
    const masterSize = Buffer.byteLength(masterString, 'utf8');

    if (masterSize > this.config.maxIndexSize) {
      console.warn(`⚠️  Master index size (${this.formatBytes(masterSize)}) exceeds limit (${this.formatBytes(this.config.maxIndexSize)})`);
    }

    await fs.writeFile(this.outputFile, masterString);
    console.log(`🔍 Generated master search index: ${this.outputFile} (${this.formatBytes(masterSize)})`);

    // Write semantic index
    const semanticString = JSON.stringify(semanticIndex);
    const semanticSize = Buffer.byteLength(semanticString, 'utf8');

    await fs.writeFile(this.semanticIndexFile, semanticString);
    console.log(`🧠 Generated semantic index: ${this.semanticIndexFile} (${this.formatBytes(semanticSize)})`);

    // Write topic index
    const topicString = JSON.stringify(topicIndex);
    const topicSize = Buffer.byteLength(topicString, 'utf8');

    await fs.writeFile(this.topicIndexFile, topicString);
    console.log(`📊 Generated topic index: ${this.topicIndexFile} (${this.formatBytes(topicSize)})`);
  }

  generateSearchStatistics(masterIndex, documents) {
    const stats = {
      indices: {
        totalDocuments: documents.length,
        nlpProcessed: documents.filter(d => d.nlpProcessed).length,
        termIndexSize: Object.keys(masterIndex.indices.term).length,
        phraseIndexSize: Object.keys(masterIndex.indices.phrase).length,
        exactIndexSize: Object.keys(masterIndex.indices.exact).length,
        fuzzyIndexSize: Object.keys(masterIndex.indices.fuzzy).length
      },
      content: {
        byType: this.getDocumentsByType(documents),
        averageWordCount: documents.reduce((sum, d) => sum + d.wordCount, 0) / documents.length,
        averageComplexity: documents.reduce((sum, d) => sum + d.complexityScore, 0) / documents.length,
        totalCitations: documents.reduce((sum, d) => sum + d.citationCount, 0)
      },
      search: {
        totalTerms: masterIndex.config.totalTerms,
        indexSize: masterIndex.metadata.indexSize,
        capabilities: masterIndex.config.capabilities.length,
        filters: Object.keys(masterIndex.filters).length
      }
    };

    console.log('📊 Enhanced Search Index Statistics:');
    console.log(`  - Total documents: ${stats.indices.totalDocuments}`);
    console.log(`  - NLP processed: ${stats.indices.nlpProcessed}`);
    console.log(`  - Term index size: ${stats.indices.termIndexSize}`);
    console.log(`  - Total search terms: ${stats.search.totalTerms}`);
    console.log(`  - Index size: ${stats.search.indexSize}`);
    console.log(`  - Average word count: ${Math.round(stats.content.averageWordCount)}`);
    console.log(`  - Total citations: ${stats.content.totalCitations}`);
  }

  getDocumentsByType(documents) {
    const byType = {};
    documents.forEach(doc => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
    });
    return byType;
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new EnhancedSearchIndexGenerator();
  generator.generate();
}

module.exports = EnhancedSearchIndexGenerator;