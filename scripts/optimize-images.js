#!/usr/bin/env node

/**
 * Image Optimization Script
 * Optimizes images and generates responsive variants
 */

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const { glob } = require('glob');

class ImageOptimizer {
  constructor() {
    this.contentDir = path.join(process.cwd(), 'content');
    this.assetsDir = path.join(process.cwd(), 'assets');
    this.outputDir = path.join(this.assetsDir, 'images');
    this.optimizedDir = path.join(this.assetsDir, 'optimized');
    this.thumbnailsDir = path.join(this.assetsDir, 'thumbnails');

    // Configuration
    this.config = {
      maxWidth: parseInt(process.env.MAX_WIDTH) || 1920,
      quality: parseInt(process.env.QUALITY) || 85,
      webpQuality: parseInt(process.env.WEBP_QUALITY) || 80,
      breakpoints: (process.env.BREAKPOINTS || '320,640,768,1024,1280,1920')
        .split(',')
        .map(Number),
      thumbnailSizes: [150, 300, 600],
      supportedFormats: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tiff', '.bmp']
    };
  }

  async optimize() {
    console.log('🖼️  Optimizing images...');

    try {
      // Ensure output directories exist
      await this.createDirectories();

      // Find all images in content directories
      const images = await this.findImages();

      if (images.length === 0) {
        console.log('📸 No images found to optimize');
        return;
      }

      // Process images by type
      const results = {
        projects: await this.processImagesByType(images.projects, 'projects'),
        papers: await this.processImagesByType(images.papers, 'papers'),
        testimonials: await this.processImagesByType(images.testimonials, 'testimonials'),
        general: await this.processImagesByType(images.general, 'general')
      };

      // Generate optimization report
      await this.generateReport(results);

      const totalProcessed = Object.values(results).reduce((sum, result) => sum + result.processed, 0);
      console.log(`✅ Optimized ${totalProcessed} images successfully`);

    } catch (error) {
      console.error('❌ Error optimizing images:', error.message);
      process.exit(1);
    }
  }

  async createDirectories() {
    const dirs = [
      this.outputDir,
      this.optimizedDir,
      this.thumbnailsDir,
      path.join(this.outputDir, 'projects'),
      path.join(this.outputDir, 'papers'),
      path.join(this.outputDir, 'testimonials'),
      path.join(this.optimizedDir, 'projects'),
      path.join(this.optimizedDir, 'papers'),
      path.join(this.optimizedDir, 'testimonials'),
      path.join(this.thumbnailsDir, 'projects'),
      path.join(this.thumbnailsDir, 'papers'),
      path.join(this.thumbnailsDir, 'testimonials')
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async findImages() {
    const imagePatterns = this.config.supportedFormats.map(ext => `**/*${ext}`);

    const results = {
      projects: [],
      papers: [],
      testimonials: [],
      general: []
    };

    // Find images in content directories
    for (const [type, _] of Object.entries(results)) {
      const contentPath = path.join(this.contentDir, type);
      try {
        await fs.access(contentPath);

        const typeImages = [];
        for (const pattern of imagePatterns) {
          const found = await glob(pattern, {
            cwd: contentPath,
            absolute: true,
            nodir: true
          });
          typeImages.push(...found);
        }

        results[type] = typeImages;
      } catch {
        // Directory doesn't exist, skip
      }
    }

    // Find general images in assets
    try {
      const existingAssets = path.join(this.assetsDir, 'images');
      await fs.access(existingAssets);

      for (const pattern of imagePatterns) {
        const found = await glob(pattern, {
          cwd: existingAssets,
          absolute: true,
          nodir: true
        });
        results.general.push(...found);
      }
    } catch {
      // No existing assets directory
    }

    return results;
  }

  async processImagesByType(images, type) {
    if (images.length === 0) {
      return { processed: 0, skipped: 0, errors: 0, files: [] };
    }

    console.log(`📷 Processing ${images.length} ${type} images...`);

    const results = {
      processed: 0,
      skipped: 0,
      errors: 0,
      files: []
    };

    for (const imagePath of images) {
      try {
        const result = await this.processImage(imagePath, type);
        results.files.push(result);

        if (result.status === 'processed') {
          results.processed++;
        } else if (result.status === 'skipped') {
          results.skipped++;
        }

      } catch (error) {
        console.error(`⚠️  Error processing ${path.basename(imagePath)}: ${error.message}`);
        results.errors++;
        results.files.push({
          original: imagePath,
          status: 'error',
          error: error.message
        });
      }
    }

    return results;
  }

  async processImage(imagePath, type) {
    const filename = path.basename(imagePath);
    const nameWithoutExt = path.parse(filename).name;
    const originalExt = path.parse(filename).ext.toLowerCase();

    // Check if we need to process this image
    const outputPath = path.join(this.outputDir, type, filename);
    const shouldProcess = await this.shouldProcessImage(imagePath, outputPath);

    if (!shouldProcess) {
      return {
        original: imagePath,
        status: 'skipped',
        reason: 'up-to-date'
      };
    }

    // Load image with sharp
    const image = sharp(imagePath);
    const metadata = await image.metadata();

    // Validate image
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image metadata');
    }

    const results = {
      original: imagePath,
      status: 'processed',
      metadata,
      outputs: {}
    };

    // 1. Copy/optimize original to output directory
    await this.optimizeToOutput(image, outputPath, metadata, originalExt);
    results.outputs.original = outputPath;

    // 2. Generate WebP version
    const webpPath = path.join(this.optimizedDir, type, `${nameWithoutExt}.webp`);
    await this.generateWebP(image, webpPath, metadata);
    results.outputs.webp = webpPath;

    // 3. Generate responsive sizes
    const responsiveOutputs = await this.generateResponsiveSizes(image, nameWithoutExt, type, metadata);
    results.outputs.responsive = responsiveOutputs;

    // 4. Generate thumbnails
    const thumbnailOutputs = await this.generateThumbnails(image, nameWithoutExt, type);
    results.outputs.thumbnails = thumbnailOutputs;

    return results;
  }

  async shouldProcessImage(inputPath, outputPath) {
    try {
      const [inputStat, outputStat] = await Promise.all([
        fs.stat(inputPath),
        fs.stat(outputPath).catch(() => null)
      ]);

      // If output doesn't exist, process
      if (!outputStat) return true;

      // If input is newer than output, process
      return inputStat.mtime > outputStat.mtime;

    } catch {
      return true; // Process if we can't determine
    }
  }

  async optimizeToOutput(image, outputPath, metadata, originalExt) {
    let pipeline = image.clone();

    // Resize if too large
    if (metadata.width > this.config.maxWidth) {
      pipeline = pipeline.resize(this.config.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Apply format-specific optimizations
    switch (originalExt) {
      case '.jpg':
      case '.jpeg':
        pipeline = pipeline.jpeg({
          quality: this.config.quality,
          progressive: true,
          mozjpeg: true
        });
        break;

      case '.png':
        pipeline = pipeline.png({
          quality: this.config.quality,
          compressionLevel: 9,
          progressive: true
        });
        break;

      case '.webp':
        pipeline = pipeline.webp({
          quality: this.config.webpQuality,
          effort: 6
        });
        break;

      default:
        // Keep original format
        break;
    }

    await pipeline.toFile(outputPath);
  }

  async generateWebP(image, outputPath, metadata) {
    let pipeline = image.clone();

    // Resize if too large
    if (metadata.width > this.config.maxWidth) {
      pipeline = pipeline.resize(this.config.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    await pipeline
      .webp({
        quality: this.config.webpQuality,
        effort: 6
      })
      .toFile(outputPath);
  }

  async generateResponsiveSizes(image, nameWithoutExt, type, metadata) {
    const responsiveDir = path.join(this.optimizedDir, type, 'responsive');
    await fs.mkdir(responsiveDir, { recursive: true });

    const outputs = {};

    for (const width of this.config.breakpoints) {
      // Skip if image is smaller than breakpoint
      if (metadata.width <= width) continue;

      const filename = `${nameWithoutExt}-${width}w.webp`;
      const outputPath = path.join(responsiveDir, filename);

      await image
        .clone()
        .resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({
          quality: this.config.webpQuality,
          effort: 6
        })
        .toFile(outputPath);

      outputs[`${width}w`] = outputPath;
    }

    return outputs;
  }

  async generateThumbnails(image, nameWithoutExt, type) {
    const thumbnailTypeDir = path.join(this.thumbnailsDir, type);
    await fs.mkdir(thumbnailTypeDir, { recursive: true });

    const outputs = {};

    for (const size of this.config.thumbnailSizes) {
      const filename = `${nameWithoutExt}-${size}.webp`;
      const outputPath = path.join(thumbnailTypeDir, filename);

      await image
        .clone()
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .webp({
          quality: this.config.webpQuality,
          effort: 6
        })
        .toFile(outputPath);

      outputs[size] = outputPath;
    }

    return outputs;
  }

  async generateReport(results) {
    const reportPath = path.join(this.assetsDir, 'optimization-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        totalProcessed: Object.values(results).reduce((sum, r) => sum + r.processed, 0),
        totalSkipped: Object.values(results).reduce((sum, r) => sum + r.skipped, 0),
        totalErrors: Object.values(results).reduce((sum, r) => sum + r.errors, 0)
      },
      details: results,
      buildInfo: {
        nodeVersion: process.version,
        sharpVersion: sharp.versions.sharp,
        platform: process.platform,
        buildId: process.env.GITHUB_RUN_ID || 'local'
      }
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Generated optimization report: ${reportPath}`);

    // Log summary
    console.log('📈 Optimization Summary:');
    console.log(`  - Processed: ${report.summary.totalProcessed}`);
    console.log(`  - Skipped: ${report.summary.totalSkipped}`);
    console.log(`  - Errors: ${report.summary.totalErrors}`);

    for (const [type, result] of Object.entries(results)) {
      if (result.processed > 0) {
        console.log(`  - ${type}: ${result.processed} images optimized`);
      }
    }
  }

  // Utility method to get optimized image info for JSON generation
  static async getImageInfo(originalPath, type, nameWithoutExt) {
    const assetsDir = path.join(process.cwd(), 'assets');

    const info = {
      original: path.join(assetsDir, 'images', type, path.basename(originalPath)),
      webp: path.join(assetsDir, 'optimized', type, `${nameWithoutExt}.webp`),
      thumbnails: {},
      responsive: {}
    };

    // Check for thumbnails
    const thumbnailSizes = [150, 300, 600];
    for (const size of thumbnailSizes) {
      const thumbnailPath = path.join(assetsDir, 'thumbnails', type, `${nameWithoutExt}-${size}.webp`);
      try {
        await fs.access(thumbnailPath);
        info.thumbnails[size] = thumbnailPath;
      } catch {
        // Thumbnail doesn't exist
      }
    }

    // Check for responsive sizes
    const breakpoints = [320, 640, 768, 1024, 1280, 1920];
    for (const width of breakpoints) {
      const responsivePath = path.join(assetsDir, 'optimized', type, 'responsive', `${nameWithoutExt}-${width}w.webp`);
      try {
        await fs.access(responsivePath);
        info.responsive[`${width}w`] = responsivePath;
      } catch {
        // Responsive size doesn't exist
      }
    }

    return info;
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new ImageOptimizer();
  optimizer.optimize();
}

module.exports = ImageOptimizer;