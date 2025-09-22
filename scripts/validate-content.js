#!/usr/bin/env node

/**
 * Content Validation Script
 * Validates content structure and schema before processing
 */

const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

class ContentValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.contentDir = path.join(process.cwd(), 'content');
  }

  async validate() {
    console.log('🔍 Validating content structure...');

    try {
      await this.validateDirectoryStructure();
      await this.validateProjects();
      await this.validatePapers();
      await this.validateTestimonials();

      this.reportResults();

      if (this.errors.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }
  }

  async validateDirectoryStructure() {
    try {
      await fs.access(this.contentDir);
    } catch {
      this.addError('Content directory not found. Expected: content/');
      return;
    }

    const subdirs = ['projects', 'papers', 'testimonials'];
    for (const subdir of subdirs) {
      const subdirPath = path.join(this.contentDir, subdir);
      try {
        const stat = await fs.stat(subdirPath);
        if (!stat.isDirectory()) {
          this.addWarning(`${subdir} exists but is not a directory`);
        }
      } catch {
        this.addWarning(`Optional directory missing: content/${subdir}/`);
      }
    }
  }

  async validateProjects() {
    const projectsDir = path.join(this.contentDir, 'projects');

    try {
      const files = await fs.readdir(projectsDir);
      const mdFiles = files.filter(file => file.endsWith('.md'));

      if (mdFiles.length === 0) {
        this.addWarning('No project files found in content/projects/');
        return;
      }

      for (const file of mdFiles) {
        await this.validateProjectFile(path.join(projectsDir, file));
      }

      console.log(`✅ Validated ${mdFiles.length} project files`);
    } catch {
      this.addWarning('Projects directory not accessible');
    }
  }

  async validateProjectFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content: body } = matter(content);

      // Required fields
      if (!frontmatter.title || frontmatter.title.trim() === '') {
        this.addError(`Project ${path.basename(filePath)}: Missing required 'title' field`);
      }

      // Optional but validated fields
      if (frontmatter.tech && !Array.isArray(frontmatter.tech)) {
        this.addError(`Project ${path.basename(filePath)}: 'tech' must be an array`);
      }

      if (frontmatter.links && typeof frontmatter.links !== 'object') {
        this.addError(`Project ${path.basename(filePath)}: 'links' must be an object`);
      }

      if (frontmatter.date) {
        const date = new Date(frontmatter.date);
        if (isNaN(date.getTime())) {
          this.addError(`Project ${path.basename(filePath)}: Invalid date format`);
        }
      }

      // Validate image references
      if (frontmatter.image) {
        await this.validateImageReference(filePath, frontmatter.image, 'projects');
      }

      // Content validation
      if (body.trim().length < 50) {
        this.addWarning(`Project ${path.basename(filePath)}: Very short description (< 50 chars)`);
      }

    } catch (error) {
      this.addError(`Project ${path.basename(filePath)}: Failed to parse - ${error.message}`);
    }
  }

  async validatePapers() {
    const papersDir = path.join(this.contentDir, 'papers');

    try {
      const files = await fs.readdir(papersDir);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

      if (pdfFiles.length === 0) {
        this.addWarning('No PDF files found in content/papers/');
        return;
      }

      for (const file of pdfFiles) {
        await this.validatePaperFile(path.join(papersDir, file));
      }

      // Validate metadata overrides
      const metadataDir = path.join(papersDir, 'metadata');
      try {
        const metadataFiles = await fs.readdir(metadataDir);
        for (const file of metadataFiles.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))) {
          await this.validatePaperMetadata(path.join(metadataDir, file));
        }
      } catch {
        // Metadata directory is optional
      }

      console.log(`✅ Validated ${pdfFiles.length} paper files`);
    } catch {
      this.addWarning('Papers directory not accessible');
    }
  }

  async validatePaperFile(filePath) {
    try {
      const stats = await fs.stat(filePath);

      // Check file size (warn if > 10MB)
      if (stats.size > 10 * 1024 * 1024) {
        this.addWarning(`Paper ${path.basename(filePath)}: Large file size (${(stats.size / 1024 / 1024).toFixed(1)}MB)`);
      }

      // Check if file is actually a PDF (basic check)
      const buffer = await fs.readFile(filePath, { encoding: null, flag: 'r' });
      if (buffer.length < 4 || buffer.toString('ascii', 0, 4) !== '%PDF') {
        this.addError(`Paper ${path.basename(filePath)}: Not a valid PDF file`);
      }

    } catch (error) {
      this.addError(`Paper ${path.basename(filePath)}: Failed to validate - ${error.message}`);
    }
  }

  async validatePaperMetadata(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const yaml = require('js-yaml');
      const metadata = yaml.load(content);

      if (metadata.title && typeof metadata.title !== 'string') {
        this.addError(`Metadata ${path.basename(filePath)}: Title must be a string`);
      }

      if (metadata.tags && !Array.isArray(metadata.tags)) {
        this.addError(`Metadata ${path.basename(filePath)}: Tags must be an array`);
      }

      if (metadata.date) {
        const date = new Date(metadata.date);
        if (isNaN(date.getTime())) {
          this.addError(`Metadata ${path.basename(filePath)}: Invalid date format`);
        }
      }

    } catch (error) {
      this.addError(`Metadata ${path.basename(filePath)}: Failed to parse YAML - ${error.message}`);
    }
  }

  async validateTestimonials() {
    const testimonialsDir = path.join(this.contentDir, 'testimonials');

    try {
      const files = await fs.readdir(testimonialsDir);
      const mdFiles = files.filter(file => file.endsWith('.md'));

      if (mdFiles.length === 0) {
        this.addWarning('No testimonial files found in content/testimonials/');
        return;
      }

      for (const file of mdFiles) {
        await this.validateTestimonialFile(path.join(testimonialsDir, file));
      }

      console.log(`✅ Validated ${mdFiles.length} testimonial files`);
    } catch {
      this.addWarning('Testimonials directory not accessible');
    }
  }

  async validateTestimonialFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content: body } = matter(content);

      // Required fields
      if (!frontmatter.author || frontmatter.author.trim() === '') {
        this.addError(`Testimonial ${path.basename(filePath)}: Missing required 'author' field`);
      }

      if (!body || body.trim().length === 0) {
        this.addError(`Testimonial ${path.basename(filePath)}: Missing testimonial content`);
      }

      // Optional validation
      if (frontmatter.rating && (frontmatter.rating < 1 || frontmatter.rating > 5)) {
        this.addError(`Testimonial ${path.basename(filePath)}: Rating must be between 1 and 5`);
      }

      if (frontmatter.date) {
        const date = new Date(frontmatter.date);
        if (isNaN(date.getTime())) {
          this.addError(`Testimonial ${path.basename(filePath)}: Invalid date format`);
        }
      }

      // Validate image references
      if (frontmatter.image) {
        await this.validateImageReference(filePath, frontmatter.image, 'testimonials');
      }

    } catch (error) {
      this.addError(`Testimonial ${path.basename(filePath)}: Failed to parse - ${error.message}`);
    }
  }

  async validateImageReference(filePath, imageName, contentType) {
    const possiblePaths = [
      path.join(path.dirname(filePath), imageName),
      path.join(path.dirname(filePath), 'images', imageName),
      path.join(this.contentDir, contentType, 'images', imageName),
      path.join(process.cwd(), 'assets', 'images', imageName)
    ];

    let found = false;
    for (const imagePath of possiblePaths) {
      try {
        await fs.access(imagePath);
        found = true;
        break;
      } catch {
        // Continue searching
      }
    }

    if (!found) {
      this.addWarning(`${path.basename(filePath)}: Referenced image '${imageName}' not found`);
    }
  }

  addError(message) {
    this.errors.push(message);
    console.error(`❌ ERROR: ${message}`);
  }

  addWarning(message) {
    this.warnings.push(message);
    console.warn(`⚠️  WARNING: ${message}`);
  }

  reportResults() {
    console.log('\n📊 Validation Results:');
    console.log(`- Errors: ${this.errors.length}`);
    console.log(`- Warnings: ${this.warnings.length}`);

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All content validation passed!');
    } else if (this.errors.length === 0) {
      console.log('✅ Validation passed with warnings');
    } else {
      console.log('❌ Validation failed - fix errors before proceeding');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ContentValidator();
  validator.validate();
}

module.exports = ContentValidator;