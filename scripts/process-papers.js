#!/usr/bin/env node

/**
 * Paper Processing Script
 * Processes PDF files and extracts metadata for portfolio
 */

const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');

class PaperProcessor {
  constructor() {
    this.contentDir = path.join(process.cwd(), 'content', 'papers');
    this.metadataDir = path.join(this.contentDir, 'metadata');
    this.dataDir = path.join(process.cwd(), 'data');
    this.outputFile = path.join(this.dataDir, 'papers.json');
  }

  async process() {
    console.log('📚 Processing paper files...');

    try {
      // Ensure output directory exists
      await fs.mkdir(this.dataDir, { recursive: true });

      // Check if content directory exists
      try {
        await fs.access(this.contentDir);
      } catch {
        console.log('📁 No papers directory found, creating empty data file');
        await this.writeOutput([]);
        return;
      }

      const papers = await this.loadPapers();
      const processedPapers = await this.processPapers(papers);

      // Sort papers by date (newest first)
      const sortedPapers = this.sortPapers(processedPapers);

      await this.writeOutput(sortedPapers);
      await this.generateStatistics(sortedPapers);

      console.log(`✅ Processed ${sortedPapers.length} papers successfully`);

    } catch (error) {
      console.error('❌ Error processing papers:', error.message);
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

    // Get file stats
    const stats = await fs.stat(filePath);

    // Load metadata override if exists
    const metadataOverride = await this.loadMetadataOverride(filename);

    // Read PDF buffer
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

  async processPapers(papers) {
    const processed = [];

    for (const paper of papers) {
      try {
        const processedPaper = await this.processPaper(paper);
        processed.push(processedPaper);
      } catch (error) {
        console.error(`⚠️  Error processing ${paper.filename}: ${error.message}`);
        // Create minimal entry even if PDF parsing fails
        const minimalPaper = this.createMinimalEntry(paper, error);
        processed.push(minimalPaper);
      }
    }

    return processed;
  }

  async processPaper(paper) {
    const { filename, buffer, stats, metadataOverride } = paper;

    // Generate slug from filename
    const slug = path.basename(filename, '.pdf');

    console.log(`📖 Processing: ${filename}`);

    // Parse PDF content
    let pdfData;
    try {
      pdfData = await pdfParse(buffer, {
        max: 1, // Only parse first page for title extraction
        version: 'v1.10.100'
      });
    } catch (error) {
      console.warn(`⚠️  PDF parse warning for ${filename}: ${error.message}`);
      pdfData = { text: '', numpages: 0, info: {} };
    }

    // Extract title from PDF or use override
    const title = this.extractTitle(pdfData, filename, metadataOverride);

    // Extract date from PDF metadata or file stats
    const date = this.extractDate(pdfData, stats, metadataOverride);

    // Process tags and category
    const tags = this.processTags(metadataOverride?.tags || []);
    const category = metadataOverride?.category || this.inferCategory(filename, tags);

    // Extract abstract or description
    const abstract = this.extractAbstract(pdfData, metadataOverride);

    // Generate download URL
    const downloadUrl = this.generateDownloadUrl(filename);

    return {
      id: slug,
      slug,
      title,
      filename,
      date: date.toISOString(),
      category,
      tags,
      abstract,
      downloadUrl,
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
      metadata: {
        fileSize: stats.size,
        fileSizeHuman: this.formatFileSize(stats.size),
        pageCount: 0,
        lastModified: stats.mtime.toISOString(),
        created: stats.birthtime?.toISOString() || stats.mtime.toISOString(),
        pdfInfo: {},
        hasMetadataOverride: Boolean(paper.metadataOverride),
        processingStatus: 'error',
        processingError: error.message
      }
    };
  }

  extractTitle(pdfData, filename, metadataOverride) {
    // Use metadata override if available
    if (metadataOverride?.title) {
      return metadataOverride.title.trim();
    }

    // Try to extract from PDF info
    if (pdfData.info?.Title) {
      return pdfData.info.Title.trim();
    }

    // Try to extract from PDF text (first line that looks like a title)
    if (pdfData.text) {
      const lines = pdfData.text.split('\n').map(line => line.trim()).filter(Boolean);

      for (const line of lines.slice(0, 10)) { // Check first 10 lines
        // Skip very short or very long lines
        if (line.length > 10 && line.length < 200) {
          // Check if it looks like a title (doesn't end with period, not all caps unless reasonable)
          if (!line.endsWith('.') && (line.length < 50 || !/^[A-Z\s]+$/.test(line))) {
            return line;
          }
        }
      }
    }

    // Fallback to filename
    return this.filenameToTitle(filename);
  }

  filenameToTitle(filename) {
    return path.basename(filename, '.pdf')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  extractDate(pdfData, stats, metadataOverride) {
    // Use metadata override if available
    if (metadataOverride?.date) {
      const parsed = new Date(metadataOverride.date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Try PDF creation date
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

    // Try PDF modification date
    if (pdfData.info?.ModDate) {
      try {
        const parsed = new Date(pdfData.info.ModDate);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch {
        // Continue to next option
      }
    }

    // Fallback to file stats
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

    // Check for common academic categories
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
    // Use metadata override if available
    if (metadataOverride?.abstract) {
      return metadataOverride.abstract.trim();
    }

    if (!pdfData.text) return 'Abstract not available';

    // Try to find abstract section
    const text = pdfData.text.toLowerCase();
    const abstractStart = text.indexOf('abstract');

    if (abstractStart !== -1) {
      // Find the end of abstract (usually next section or double newline)
      const afterAbstract = text.substring(abstractStart + 8); // Skip "abstract"
      const possibleEnds = [
        afterAbstract.indexOf('\nintroduction'),
        afterAbstract.indexOf('\n1.'),
        afterAbstract.indexOf('\nkeywords'),
        afterAbstract.indexOf('\n\n'),
        500 // Max length fallback
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

    // Fallback: use first paragraph that's substantial
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
    // For GitHub Pages, this will be relative to the site root
    return `/content/papers/${encodeURIComponent(filename)}`;
  }

  sanitizePdfInfo(info) {
    // Remove potentially sensitive or irrelevant PDF metadata
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

  sortPapers(papers) {
    return papers.sort((a, b) => {
      // Sort by date (newest first)
      return new Date(b.date) - new Date(a.date);
    });
  }

  async writeOutput(papers) {
    const output = {
      papers,
      metadata: {
        total: papers.length,
        categories: this.extractCategories(papers),
        tags: this.extractAllTags(papers),
        totalSize: papers.reduce((sum, p) => sum + p.metadata.fileSize, 0),
        totalSizeHuman: this.formatFileSize(papers.reduce((sum, p) => sum + p.metadata.fileSize, 0)),
        totalPages: papers.reduce((sum, p) => sum + p.metadata.pageCount, 0),
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

  extractCategories(papers) {
    const categoryCount = {};
    papers.forEach(paper => {
      const category = paper.category;
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    return Object.entries(categoryCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  extractAllTags(papers) {
    const tagCount = {};
    papers.forEach(paper => {
      paper.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    });

    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  async generateStatistics(papers) {
    const successfulPapers = papers.filter(p => p.metadata.processingStatus === 'success');
    const failedPapers = papers.filter(p => p.metadata.processingStatus === 'error');

    const stats = {
      totalPapers: papers.length,
      successfullyProcessed: successfulPapers.length,
      processingErrors: failedPapers.length,
      totalSize: this.formatFileSize(papers.reduce((sum, p) => sum + p.metadata.fileSize, 0)),
      totalPages: papers.reduce((sum, p) => sum + p.metadata.pageCount, 0),
      averagePages: Math.round(papers.reduce((sum, p) => sum + p.metadata.pageCount, 0) / papers.length || 0),
      topCategories: this.extractCategories(papers).slice(0, 5),
      dateRange: this.getDateRange(papers)
    };

    console.log('📊 Paper Statistics:');
    console.log(`  - Total: ${stats.totalPapers}`);
    console.log(`  - Successfully processed: ${stats.successfullyProcessed}`);
    console.log(`  - Processing errors: ${stats.processingErrors}`);
    console.log(`  - Total size: ${stats.totalSize}`);
    console.log(`  - Total pages: ${stats.totalPages}`);
    console.log(`  - Average pages: ${stats.averagePages}`);

    if (failedPapers.length > 0) {
      console.log('❌ Papers with processing errors:');
      failedPapers.forEach(paper => {
        console.log(`  - ${paper.filename}: ${paper.metadata.processingError}`);
      });
    }
  }

  getDateRange(papers) {
    if (papers.length === 0) return null;

    const dates = papers.map(p => new Date(p.date));
    return {
      earliest: new Date(Math.min(...dates)).toISOString(),
      latest: new Date(Math.max(...dates)).toISOString()
    };
  }
}

// Run if called directly
if (require.main === module) {
  const processor = new PaperProcessor();
  processor.process();
}

module.exports = PaperProcessor;