/**
 * ContentRelationships Component - Smart content discovery and connections
 * Analyzes relationships between projects, papers, and testimonials
 */
import { ComponentBase } from '../core/ComponentBase.js';

export class ContentRelationships extends ComponentBase {
  constructor() {
    super();
    this.allContent = new Map();
    this.relationships = new Map();
    this.similarityThreshold = 0.3;
    this.maxRelatedItems = 5;
  }

  async init() {
    await this.loadAllContent();
    this.analyzeRelationships();
    this.cacheRelationships();
  }

  async loadAllContent() {
    const contentTypes = ['projects', 'papers', 'testimonials'];

    for (const type of contentTypes) {
      try {
        const response = await fetch(`/data/${type}.json`);
        const content = await response.json();

        content.forEach(item => {
          const id = `${type}_${item.id || item.slug}`;
          this.allContent.set(id, {
            ...item,
            type,
            id,
            originalId: item.id || item.slug
          });
        });
      } catch (error) {
        console.error(`Error loading ${type} for relationships:`, error);
      }
    }
  }

  analyzeRelationships() {
    const items = Array.from(this.allContent.values());

    items.forEach(item => {
      const related = this.findRelatedContent(item, items);
      this.relationships.set(item.id, related);
    });
  }

  findRelatedContent(targetItem, allItems) {
    const relationships = allItems
      .filter(item => item.id !== targetItem.id)
      .map(item => ({
        item,
        score: this.calculateSimilarityScore(targetItem, item),
        reasons: this.getRelationshipReasons(targetItem, item)
      }))
      .filter(rel => rel.score >= this.similarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxRelatedItems);

    return relationships;
  }

  calculateSimilarityScore(item1, item2) {
    let score = 0;
    const weights = {
      technology: 0.3,
      keyword: 0.25,
      category: 0.2,
      temporal: 0.15,
      semantic: 0.1
    };

    // Technology/Skills similarity
    score += weights.technology * this.getTechnologySimilarity(item1, item2);

    // Keyword similarity
    score += weights.keyword * this.getKeywordSimilarity(item1, item2);

    // Category similarity
    score += weights.category * this.getCategorySimilarity(item1, item2);

    // Temporal proximity
    score += weights.temporal * this.getTemporalSimilarity(item1, item2);

    // Semantic content similarity
    score += weights.semantic * this.getSemanticSimilarity(item1, item2);

    return Math.min(score, 1.0);
  }

  getTechnologySimilarity(item1, item2) {
    const tech1 = this.extractTechnologies(item1);
    const tech2 = this.extractTechnologies(item2);

    if (tech1.size === 0 && tech2.size === 0) return 0;
    if (tech1.size === 0 || tech2.size === 0) return 0;

    const intersection = new Set([...tech1].filter(x => tech2.has(x)));
    const union = new Set([...tech1, ...tech2]);

    return intersection.size / union.size;
  }

  getKeywordSimilarity(item1, item2) {
    const keywords1 = this.extractKeywords(item1);
    const keywords2 = this.extractKeywords(item2);

    if (keywords1.size === 0 && keywords2.size === 0) return 0;
    if (keywords1.size === 0 || keywords2.size === 0) return 0;

    const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
    const union = new Set([...keywords1, ...keywords2]);

    return intersection.size / union.size;
  }

  getCategorySimilarity(item1, item2) {
    const cat1 = item1.category?.toLowerCase();
    const cat2 = item2.category?.toLowerCase();

    if (!cat1 || !cat2) return 0;
    if (cat1 === cat2) return 1;

    // Check category relationships
    const categoryMap = {
      'machine-learning': ['ai', 'artificial-intelligence', 'data-science'],
      'web-development': ['frontend', 'backend', 'full-stack'],
      'mobile': ['ios', 'android', 'react-native'],
      'data-science': ['analytics', 'visualization', 'machine-learning']
    };

    for (const [parent, children] of Object.entries(categoryMap)) {
      if ((cat1 === parent && children.includes(cat2)) ||
          (cat2 === parent && children.includes(cat1)) ||
          (children.includes(cat1) && children.includes(cat2))) {
        return 0.7;
      }
    }

    return 0;
  }

  getTemporalSimilarity(item1, item2) {
    const date1 = this.extractDate(item1);
    const date2 = this.extractDate(item2);

    if (!date1 || !date2) return 0;

    const diffMonths = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24 * 30);

    // Stronger relationship for items within 6 months, declining after
    if (diffMonths <= 6) return 1;
    if (diffMonths <= 12) return 0.8;
    if (diffMonths <= 24) return 0.5;
    return 0.2;
  }

  getSemanticSimilarity(item1, item2) {
    const text1 = this.extractTextContent(item1);
    const text2 = this.extractTextContent(item2);

    if (!text1 || !text2) return 0;

    // Simple word overlap for semantic similarity
    const words1 = this.tokenizeText(text1);
    const words2 = this.tokenizeText(text2);

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / Math.max(union.size, 1);
  }

  getRelationshipReasons(item1, item2) {
    const reasons = [];

    // Technology overlap
    const tech1 = this.extractTechnologies(item1);
    const tech2 = this.extractTechnologies(item2);
    const sharedTech = [...tech1].filter(x => tech2.has(x));
    if (sharedTech.length > 0) {
      reasons.push({
        type: 'technology',
        description: `Shared technologies: ${sharedTech.join(', ')}`,
        strength: 'high'
      });
    }

    // Category similarity
    if (item1.category && item2.category &&
        item1.category.toLowerCase() === item2.category.toLowerCase()) {
      reasons.push({
        type: 'category',
        description: `Same category: ${item1.category}`,
        strength: 'medium'
      });
    }

    // Keyword overlap
    const keywords1 = this.extractKeywords(item1);
    const keywords2 = this.extractKeywords(item2);
    const sharedKeywords = [...keywords1].filter(x => keywords2.has(x));
    if (sharedKeywords.length > 0) {
      reasons.push({
        type: 'keywords',
        description: `Related keywords: ${sharedKeywords.slice(0, 3).join(', ')}`,
        strength: 'medium'
      });
    }

    // Temporal proximity
    const date1 = this.extractDate(item1);
    const date2 = this.extractDate(item2);
    if (date1 && date2) {
      const diffMonths = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (diffMonths <= 6) {
        reasons.push({
          type: 'temporal',
          description: 'Created around the same time',
          strength: 'low'
        });
      }
    }

    return reasons;
  }

  extractTechnologies(item) {
    const technologies = new Set();

    // Direct technology fields
    if (item.technologies) {
      item.technologies.forEach(tech => technologies.add(tech.toLowerCase()));
    }
    if (item.skills) {
      item.skills.forEach(skill => technologies.add(skill.toLowerCase()));
    }

    // Extract from content
    const text = this.extractTextContent(item);
    if (text) {
      const techKeywords = [
        'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
        'node.js', 'express', 'mongodb', 'postgresql', 'mysql', 'docker',
        'kubernetes', 'aws', 'azure', 'gcp', 'tensorflow', 'pytorch',
        'machine learning', 'ai', 'deep learning', 'neural networks'
      ];

      techKeywords.forEach(keyword => {
        if (text.toLowerCase().includes(keyword)) {
          technologies.add(keyword);
        }
      });
    }

    return technologies;
  }

  extractKeywords(item) {
    const keywords = new Set();

    // Direct keyword fields
    if (item.keywords) {
      item.keywords.forEach(keyword => keywords.add(keyword.toLowerCase()));
    }
    if (item.tags) {
      item.tags.forEach(tag => keywords.add(tag.toLowerCase()));
    }

    // Extract important words from title and description
    const text = [item.title, item.description, item.abstract].filter(Boolean).join(' ');
    if (text) {
      const importantWords = this.extractImportantWords(text);
      importantWords.forEach(word => keywords.add(word));
    }

    return keywords;
  }

  extractImportantWords(text) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);

    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 10);
  }

  extractDate(item) {
    if (item.date) {
      return new Date(item.date);
    }
    if (item.year) {
      return new Date(item.year, 0, 1);
    }
    return null;
  }

  extractTextContent(item) {
    const textFields = [
      item.title,
      item.description,
      item.content,
      item.abstract,
      item.summary
    ].filter(Boolean);

    return textFields.join(' ').toLowerCase();
  }

  tokenizeText(text) {
    return new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2)
    );
  }

  cacheRelationships() {
    const relationshipData = {};
    this.relationships.forEach((related, itemId) => {
      relationshipData[itemId] = related.map(rel => ({
        id: rel.item.id,
        type: rel.item.type,
        title: rel.item.title,
        category: rel.item.category,
        score: rel.score,
        reasons: rel.reasons
      }));
    });

    this.cache.set('content_relationships', relationshipData);
  }

  getRelatedContent(itemId, maxResults = 5) {
    const cached = this.cache.get('content_relationships');
    if (cached && cached[itemId]) {
      return cached[itemId].slice(0, maxResults);
    }

    const relationships = this.relationships.get(itemId);
    return relationships ? relationships.slice(0, maxResults) : [];
  }

  async renderRelatedContent(containerElement, currentItemId, currentItemType) {
    const related = this.getRelatedContent(currentItemId);

    if (related.length === 0) {
      containerElement.innerHTML = `
        <div class="no-related-content">
          <p>No related content found.</p>
        </div>
      `;
      return;
    }

    const relatedHTML = await Promise.all(
      related.map(rel => this.renderRelatedItem(rel))
    );

    containerElement.innerHTML = `
      <div class="related-content">
        <h3 class="related-heading">
          <span class="related-icon">🔗</span>
          Related Content
        </h3>
        <div class="related-grid">
          ${relatedHTML.join('')}
        </div>
      </div>
    `;

    this.attachRelatedContentListeners(containerElement);
    this.applyRelatedContentStyles();
  }

  async renderRelatedItem(relatedInfo) {
    const item = relatedInfo.item || await this.getItemById(relatedInfo.id);
    if (!item) return '';

    const typeIcon = {
      projects: '💻',
      papers: '📄',
      testimonials: '💬'
    };

    const strengthClass = this.getStrengthClass(relatedInfo.score);
    const primaryReason = relatedInfo.reasons?.[0];

    return `
      <div class="related-item ${strengthClass}"
           data-item-id="${relatedInfo.id}"
           data-item-type="${relatedInfo.type}">
        <div class="related-item-header">
          <span class="type-icon">${typeIcon[relatedInfo.type] || '📌'}</span>
          <span class="type-label">${relatedInfo.type}</span>
          <span class="similarity-score">${Math.round(relatedInfo.score * 100)}%</span>
        </div>

        <h4 class="related-title">${this.escapeHtml(item.title)}</h4>

        ${item.category ? `
          <div class="related-category">${this.escapeHtml(item.category)}</div>
        ` : ''}

        ${primaryReason ? `
          <div class="relationship-reason">
            <span class="reason-type">${primaryReason.type}:</span>
            <span class="reason-text">${primaryReason.description}</span>
          </div>
        ` : ''}

        <div class="related-actions">
          <button class="view-related" data-action="view">View</button>
          ${relatedInfo.reasons && relatedInfo.reasons.length > 1 ? `
            <button class="show-reasons" data-action="reasons">Why Related?</button>
          ` : ''}
        </div>
      </div>
    `;
  }

  async getItemById(itemId) {
    const cached = this.allContent.get(itemId);
    if (cached) return cached;

    // Fallback: try to fetch from API
    const [type, id] = itemId.split('_');
    try {
      const response = await fetch(`/data/${type}.json`);
      const content = await response.json();
      return content.find(item => (item.id || item.slug) === id);
    } catch (error) {
      console.error('Error fetching related item:', error);
      return null;
    }
  }

  getStrengthClass(score) {
    if (score >= 0.7) return 'strength-high';
    if (score >= 0.5) return 'strength-medium';
    return 'strength-low';
  }

  attachRelatedContentListeners(container) {
    container.addEventListener('click', async (e) => {
      const relatedItem = e.target.closest('.related-item');
      if (!relatedItem) return;

      const action = e.target.dataset.action;
      const itemId = relatedItem.dataset.itemId;
      const itemType = relatedItem.dataset.itemType;

      switch (action) {
        case 'view':
          await this.openRelatedContent(itemType, itemId);
          break;
        case 'reasons':
          this.showRelationshipReasons(relatedItem, itemId);
          break;
      }
    });
  }

  async openRelatedContent(type, id) {
    // Emit event for modal system to handle
    const event = new CustomEvent('openContent', {
      detail: { type, id }
    });
    document.dispatchEvent(event);
  }

  showRelationshipReasons(itemElement, itemId) {
    const related = this.getRelatedContent(itemId);
    const relatedInfo = related.find(r => r.id === itemId);

    if (!relatedInfo || !relatedInfo.reasons) return;

    const reasonsHTML = relatedInfo.reasons.map(reason => `
      <div class="reason-item reason-${reason.strength}">
        <span class="reason-type-badge">${reason.type}</span>
        <span class="reason-description">${reason.description}</span>
      </div>
    `).join('');

    const tooltip = document.createElement('div');
    tooltip.className = 'relationship-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-header">
        <h4>Why These Are Related</h4>
        <button class="close-tooltip">×</button>
      </div>
      <div class="reasons-list">
        ${reasonsHTML}
      </div>
    `;

    document.body.appendChild(tooltip);

    // Position tooltip
    const rect = itemElement.getBoundingClientRect();
    tooltip.style.cssText = `
      position: fixed;
      top: ${rect.top + window.scrollY - tooltip.offsetHeight - 10}px;
      left: ${rect.left + window.scrollX}px;
      z-index: 1000;
    `;

    // Close tooltip handlers
    tooltip.querySelector('.close-tooltip').addEventListener('click', () => {
      tooltip.remove();
    });

    document.addEventListener('click', (e) => {
      if (!tooltip.contains(e.target) && !itemElement.contains(e.target)) {
        tooltip.remove();
      }
    }, { once: true });
  }

  applyRelatedContentStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .related-content {
        margin: 2rem 0;
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 8px;
      }

      .related-heading {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: #495057;
        font-size: 1.25rem;
      }

      .related-icon {
        font-size: 1.5rem;
      }

      .related-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }

      .related-item {
        background: white;
        border-radius: 6px;
        padding: 1rem;
        border-left: 4px solid #e9ecef;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        cursor: pointer;
      }

      .related-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .related-item.strength-high {
        border-left-color: #28a745;
      }

      .related-item.strength-medium {
        border-left-color: #ffc107;
      }

      .related-item.strength-low {
        border-left-color: #6c757d;
      }

      .related-item-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
      }

      .type-icon {
        font-size: 1rem;
      }

      .type-label {
        flex: 1;
        color: #6c757d;
        text-transform: capitalize;
      }

      .similarity-score {
        background: #e9ecef;
        padding: 0.125rem 0.5rem;
        border-radius: 12px;
        font-weight: 500;
        color: #495057;
      }

      .related-title {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        color: #343a40;
        line-height: 1.3;
      }

      .related-category {
        font-size: 0.75rem;
        color: #6c757d;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .relationship-reason {
        font-size: 0.875rem;
        color: #495057;
        margin-bottom: 1rem;
        padding: 0.5rem;
        background: #f1f3f4;
        border-radius: 4px;
      }

      .reason-type {
        font-weight: 500;
        color: #007bff;
      }

      .related-actions {
        display: flex;
        gap: 0.5rem;
      }

      .view-related, .show-reasons {
        background: #007bff;
        color: white;
        border: none;
        padding: 0.375rem 0.75rem;
        border-radius: 4px;
        font-size: 0.875rem;
        cursor: pointer;
        transition: background 0.2s ease;
      }

      .show-reasons {
        background: #6c757d;
      }

      .view-related:hover {
        background: #0056b3;
      }

      .show-reasons:hover {
        background: #545b62;
      }

      .relationship-tooltip {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        font-size: 0.875rem;
      }

      .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        border-bottom: 1px solid #e9ecef;
        background: #f8f9fa;
        border-radius: 6px 6px 0 0;
      }

      .tooltip-header h4 {
        margin: 0;
        font-size: 0.875rem;
        color: #495057;
      }

      .close-tooltip {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: #6c757d;
        padding: 0;
        width: 20px;
        height: 20px;
      }

      .reasons-list {
        padding: 0.75rem;
      }

      .reason-item {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }

      .reason-item:last-child {
        margin-bottom: 0;
      }

      .reason-type-badge {
        background: #e9ecef;
        color: #495057;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        text-transform: capitalize;
        white-space: nowrap;
      }

      .reason-item.reason-high .reason-type-badge {
        background: #d4edda;
        color: #155724;
      }

      .reason-item.reason-medium .reason-type-badge {
        background: #fff3cd;
        color: #856404;
      }

      .reason-description {
        flex: 1;
        color: #495057;
        line-height: 1.4;
      }

      .no-related-content {
        text-align: center;
        color: #6c757d;
        font-style: italic;
        padding: 2rem;
      }

      @media (max-width: 768px) {
        .related-grid {
          grid-template-columns: 1fr;
        }

        .related-actions {
          flex-direction: column;
        }
      }
    `;

    if (!document.head.querySelector('style[data-component="ContentRelationships"]')) {
      style.setAttribute('data-component', 'ContentRelationships');
      document.head.appendChild(style);
    }
  }
}