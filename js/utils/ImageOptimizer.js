/**
 * ImageOptimizer - Handles responsive images, lazy loading, and format optimization
 * Provides next-gen image formats with fallbacks and performance optimization
 */

class ImageOptimizer {
  constructor(options = {}) {
    this.options = {
      formats: ['webp', 'jpg'],
      sizes: [400, 800, 1200, 1600],
      quality: 85,
      placeholderQuality: 20,
      lazyLoadThreshold: '50px',
      enablePlaceholders: true,
      enableBlurUp: true,
      basePath: '/assets/images/',
      optimizedPath: '/assets/images/optimized/',
      ...options
    };

    this.intersectionObserver = null;
    this.loadedImages = new Set();
    this.pendingImages = new Map();

    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.preloadCriticalImages();
  }

  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) {
      // Fallback for older browsers
      this.loadAllImages();
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.intersectionObserver.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: this.options.lazyLoadThreshold,
        threshold: 0.1
      }
    );
  }

  // Generate optimized image URLs
  generateImageSet(imageName, extension = 'jpg') {
    const baseName = imageName.replace(/\.[^/.]+$/, '');
    const srcSet = [];
    const sources = [];

    this.options.formats.forEach(format => {
      const formatSrcSet = this.options.sizes.map(size =>
        `${this.options.optimizedPath}${baseName}-${size}w.${format} ${size}w`
      ).join(', ');

      if (format === 'webp') {
        sources.push({
          srcset: formatSrcSet,
          type: 'image/webp'
        });
      } else {
        srcSet.push(formatSrcSet);
      }
    });

    return {
      sources,
      srcSet: srcSet[0] || '',
      src: `${this.options.optimizedPath}${baseName}-800w.${extension}`,
      placeholder: this.generatePlaceholder(baseName)
    };
  }

  generatePlaceholder(baseName) {
    if (!this.options.enablePlaceholders) return null;

    // Generate a low-quality placeholder
    return `${this.options.optimizedPath}${baseName}-placeholder.jpg`;
  }

  // Create responsive picture element
  createResponsiveImage(imageName, options = {}) {
    const {
      alt = '',
      className = '',
      sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
      lazy = true,
      critical = false,
      aspectRatio = null
    } = options;

    const imageSet = this.generateImageSet(imageName);

    // Create picture element
    const picture = document.createElement('picture');
    picture.className = className;

    // Add source elements for modern formats
    imageSet.sources.forEach(source => {
      const sourceEl = document.createElement('source');
      sourceEl.srcset = source.srcset;
      sourceEl.type = source.type;
      sourceEl.sizes = sizes;
      picture.appendChild(sourceEl);
    });

    // Create img element
    const img = document.createElement('img');
    img.alt = alt;
    img.className = 'w-full h-full object-cover transition-opacity duration-300';

    if (aspectRatio) {
      img.style.aspectRatio = aspectRatio;
    }

    if (lazy && !critical) {
      // Set up lazy loading
      img.setAttribute('data-srcset', imageSet.srcSet);
      img.setAttribute('data-src', imageSet.src);
      img.sizes = sizes;

      // Set placeholder
      if (imageSet.placeholder) {
        img.src = imageSet.placeholder;
        img.classList.add('blur-sm');
        img.setAttribute('data-placeholder', 'true');
      } else {
        img.src = this.generateDataURL(300, 200);
      }

      // Mark for lazy loading
      img.classList.add('lazy-image');
      this.observeImage(img);
    } else {
      // Load immediately for critical images
      img.srcset = imageSet.srcSet;
      img.src = imageSet.src;
      img.sizes = sizes;
    }

    picture.appendChild(img);
    return picture;
  }

  // Simplified image element (no picture wrapper)
  createOptimizedImage(imageName, options = {}) {
    const {
      alt = '',
      className = '',
      sizes = '(max-width: 768px) 100vw, 50vw',
      lazy = true,
      critical = false
    } = options;

    const imageSet = this.generateImageSet(imageName);
    const img = document.createElement('img');

    img.alt = alt;
    img.className = `${className} transition-opacity duration-300`.trim();

    if (lazy && !critical) {
      img.setAttribute('data-srcset', imageSet.srcSet);
      img.setAttribute('data-src', imageSet.src);
      img.sizes = sizes;

      if (imageSet.placeholder) {
        img.src = imageSet.placeholder;
        img.classList.add('blur-sm');
      } else {
        img.src = this.generateDataURL(300, 200);
      }

      img.classList.add('lazy-image');
      this.observeImage(img);
    } else {
      img.srcset = imageSet.srcSet;
      img.src = imageSet.src;
      img.sizes = sizes;
    }

    return img;
  }

  // Observe image for lazy loading
  observeImage(img) {
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(img);
    } else {
      // Immediate load if no observer
      this.loadImage(img);
    }
  }

  // Load individual image
  loadImage(img) {
    if (this.loadedImages.has(img)) return;

    const dataSrc = img.getAttribute('data-src');
    const dataSrcset = img.getAttribute('data-srcset');

    if (!dataSrc && !dataSrcset) return;

    // Track loading state
    this.loadedImages.add(img);
    img.classList.add('loading');

    // Create a promise for loading
    const loadPromise = new Promise((resolve, reject) => {
      const tempImg = new Image();

      tempImg.onload = () => {
        // Update the actual image
        if (dataSrcset) {
          img.srcset = dataSrcset;
        }
        if (dataSrc) {
          img.src = dataSrc;
        }

        // Remove loading state and blur
        img.classList.remove('loading', 'blur-sm');
        img.classList.add('loaded');

        // Clean up data attributes
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
        img.removeAttribute('data-placeholder');

        // Fade in effect
        img.style.opacity = '0';
        requestAnimationFrame(() => {
          img.style.opacity = '1';
        });

        resolve(img);
      };

      tempImg.onerror = reject;

      // Start loading
      if (dataSrcset) {
        tempImg.srcset = dataSrcset;
      }
      tempImg.src = dataSrc;
    });

    this.pendingImages.set(img, loadPromise);
    return loadPromise;
  }

  // Generate data URL placeholder
  generateDataURL(width, height, color = '#f3f4f6') {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
        <rect width="${width}" height="${height}" fill="${color}"/>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  // Preload critical images
  preloadCriticalImages() {
    const criticalImages = document.querySelectorAll('img[data-critical="true"]');
    criticalImages.forEach(img => {
      this.loadImage(img);
    });
  }

  // Load all images (fallback)
  loadAllImages() {
    const lazyImages = document.querySelectorAll('.lazy-image');
    lazyImages.forEach(img => this.loadImage(img));
  }

  // Convert existing images to optimized versions
  optimizeExistingImages() {
    const images = document.querySelectorAll('img:not(.lazy-image):not(.optimized)');

    images.forEach(img => {
      const src = img.src;
      const filename = src.split('/').pop();

      if (filename && !src.includes('data:')) {
        const optimizedImg = this.createOptimizedImage(filename, {
          alt: img.alt,
          className: img.className,
          lazy: !img.hasAttribute('data-critical')
        });

        // Replace the original image
        img.parentNode.replaceChild(optimizedImg, img);
      }
    });
  }

  // Batch image loading
  loadImageBatch(images, concurrent = 3) {
    const batches = [];
    for (let i = 0; i < images.length; i += concurrent) {
      batches.push(images.slice(i, i + concurrent));
    }

    return batches.reduce((promise, batch) => {
      return promise.then(() => {
        return Promise.all(batch.map(img => this.loadImage(img)));
      });
    }, Promise.resolve());
  }

  // Performance monitoring
  getPerformanceMetrics() {
    const loadedCount = this.loadedImages.size;
    const pendingCount = this.pendingImages.size;
    const totalImages = document.querySelectorAll('img').length;

    return {
      totalImages,
      loadedCount,
      pendingCount,
      loadingPercentage: (loadedCount / totalImages) * 100
    };
  }

  // Image format support detection
  supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  supportsAVIF() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
  }

  // Utility methods
  waitForImage(img) {
    if (this.loadedImages.has(img)) {
      return Promise.resolve(img);
    }

    if (this.pendingImages.has(img)) {
      return this.pendingImages.get(img);
    }

    return this.loadImage(img);
  }

  // Clean up resources
  destroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    this.loadedImages.clear();
    this.pendingImages.clear();
  }

  // Static utility for quick image optimization
  static optimize(imageName, options = {}) {
    const optimizer = new ImageOptimizer();
    return optimizer.createOptimizedImage(imageName, options);
  }
}

// Global instance
export const imageOptimizer = new ImageOptimizer();

export default ImageOptimizer;