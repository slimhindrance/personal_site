# GitHub Actions Automation Setup Guide

## Quick Start

### 1. Initialize the Content Structure

```bash
# Create content directories
mkdir -p content/{projects,papers,testimonials}
mkdir -p content/projects/images
mkdir -p content/papers/metadata
mkdir -p content/testimonials/images

# Create data output directory
mkdir -p data

# Install dependencies
npm install
```

### 2. Add Example Content

#### Example Project (`content/projects/ai-chatbot.md`)
```yaml
---
title: "AI-Powered Customer Service Chatbot"
date: "2024-09-15"
tech: ["Python", "TensorFlow", "React", "FastAPI", "Redis"]
links:
  demo: "https://chatbot-demo.clindeman.com"
  github: "https://github.com/slimhindrance/ai-chatbot"
  documentation: "https://docs.ai-chatbot.com"
image: "chatbot-dashboard.png"
featured: true
status: "completed"
category: "AI/ML"
description: "Enterprise-grade conversational AI system with natural language processing"
---

Developed an intelligent customer service chatbot that handles 85% of customer inquiries automatically, reducing response time from hours to seconds.

## Key Features

- **Natural Language Understanding**: Advanced NLP with contextual awareness
- **Multi-channel Support**: Web, mobile, and social media integration
- **Analytics Dashboard**: Real-time conversation analytics and insights
- **Seamless Handoff**: Intelligent escalation to human agents when needed

## Technical Implementation

Built using a microservices architecture with Python backend leveraging TensorFlow for ML models and React frontend for the admin dashboard. Redis handles session management and conversation state.

### Architecture Highlights

- **Scalable Design**: Handles 1000+ concurrent conversations
- **Real-time Processing**: Sub-second response times
- **Multi-language Support**: English, Spanish, French
- **Integration Ready**: REST API and webhooks for third-party systems

## Results

- 85% query resolution without human intervention
- 60% reduction in customer service costs
- 95% customer satisfaction rating
- 24/7 availability with 99.9% uptime
```

#### Example Paper (`content/papers/ml-healthcare-analysis.pdf`)
Place your PDF file here, then optionally create metadata override:

#### Metadata Override (`content/papers/metadata/ml-healthcare-analysis.yml`)
```yaml
title: "Machine Learning Applications in Healthcare Data Analysis"
category: "Healthcare AI"
tags: ["machine-learning", "healthcare", "data-analysis", "predictive-modeling"]
abstract: "This paper explores novel applications of machine learning in healthcare data analysis, focusing on predictive modeling for patient outcomes and treatment optimization."
keywords: ["ML", "healthcare", "predictive analytics", "patient outcomes"]
date: "2024-08-10"
```

#### Example Testimonial (`content/testimonials/sarah-johnson.md`)
```yaml
---
author: "Sarah Johnson"
title: "CTO"
company: "TechCorp Solutions"
date: "2024-08-20"
image: "sarah-johnson.jpg"
project: "AI Analytics Platform"
rating: 5
featured: true
verified: true
linkedin: "https://linkedin.com/in/sarahjohnson"
---

Chris delivered an exceptional AI analytics platform that transformed our data processing capabilities. His technical expertise and attention to detail resulted in a 40% improvement in our analysis speed.

The project was completed on time and under budget, with comprehensive documentation and training for our team. Chris's ability to translate complex technical concepts into business value was particularly impressive.

I would highly recommend Chris for any AI or machine learning project. His combination of technical skill and business acumen is rare in the industry.
```

### 3. Test the Pipeline Locally

```bash
# Validate content structure
npm run validate

# Process individual content types
npm run process:projects
npm run process:papers
npm run process:testimonials

# Optimize images
npm run optimize:images

# Generate metadata and search index
npm run generate:metadata
npm run generate:search

# Run complete build
npm run build:all
```

### 4. Commit and Deploy

```bash
# Add all files
git add .

# Commit with descriptive message
git commit -m "feat: Add GitHub Actions automation pipeline

- Complete content processing workflow
- PDF metadata extraction and cataloging
- Image optimization with responsive variants
- Search index generation
- Error handling and recovery system

🤖 Generated with Claude Code"

# Push to trigger GitHub Actions
git push origin main
```

---

## Content Management Workflow

### Adding New Projects

1. **Create Project File**
   ```bash
   # Create project markdown file
   touch content/projects/my-new-project.md
   ```

2. **Add Project Images**
   ```bash
   # Copy project images
   cp project-screenshot.png content/projects/images/
   ```

3. **Write Project Content**
   - Use frontmatter for metadata
   - Include comprehensive description
   - Add technology stack
   - Provide relevant links

4. **Commit and Push**
   ```bash
   git add content/projects/
   git commit -m "feat: Add new project - My New Project"
   git push
   ```

**Result**: Automatic processing, optimization, and deployment within 5 minutes.

### Adding Research Papers

1. **Upload PDF**
   ```bash
   cp research-paper.pdf content/papers/
   ```

2. **Optional: Add Metadata Override**
   ```bash
   # Create metadata file if needed
   touch content/papers/metadata/research-paper.yml
   ```

3. **Commit and Push**
   ```bash
   git add content/papers/
   git commit -m "docs: Add research paper - Advanced ML Techniques"
   git push
   ```

**Result**: Automatic PDF parsing, metadata extraction, and catalog generation.

### Adding Testimonials

1. **Create Testimonial File**
   ```bash
   touch content/testimonials/client-name.md
   ```

2. **Optional: Add Client Photo**
   ```bash
   cp client-photo.jpg content/testimonials/images/
   ```

3. **Write Testimonial Content**
   - Include client information in frontmatter
   - Add testimonial content in markdown
   - Include project context and ratings

4. **Commit and Push**
   ```bash
   git add content/testimonials/
   git commit -m "feat: Add testimonial from Client Name"
   git push
   ```

**Result**: Automatic processing with sentiment analysis and integration.

---

## Advanced Configuration

### Environment Variables

Set these in GitHub repository settings under Secrets and Variables:

```bash
# Optional: Custom configuration
MAX_WIDTH=1920          # Maximum image width
QUALITY=85              # JPEG quality (0-100)
WEBP_QUALITY=80         # WebP quality (0-100)
BREAKPOINTS=320,640,768,1024,1280,1920  # Responsive breakpoints
```

### Customizing Processing Scripts

#### Modify Project Schema
Edit `scripts/process-projects.js` to add custom fields:

```javascript
// Add custom field processing
const customField = frontmatter.customField || null;

// Include in output
return {
  // ... existing fields
  customField,
  // ... rest of output
};
```

#### Add New Content Types
1. Create new processing script
2. Add to GitHub Actions workflow matrix
3. Update metadata generation
4. Add to search index

#### Custom Image Optimization
Modify `scripts/optimize-images.js`:

```javascript
// Custom optimization settings
const customConfig = {
  maxWidth: 2048,
  quality: 90,
  customFormats: ['avif', 'webp', 'jpg']
};
```

---

## Troubleshooting

### Common Issues

#### 1. PDF Processing Fails
**Symptoms**: Papers not appearing in generated JSON
**Solutions**:
- Check PDF file integrity
- Verify file is actually a PDF (not renamed image)
- Add metadata override file
- Check file size (large files may timeout)

#### 2. Image Optimization Errors
**Symptoms**: Original images not optimized
**Solutions**:
- Verify image format is supported
- Check file permissions
- Ensure images aren't corrupted
- Check available disk space

#### 3. Build Timeout
**Symptoms**: GitHub Actions workflow times out
**Solutions**:
- Process fewer files at once
- Optimize large images before upload
- Use incremental processing
- Check for infinite loops in content

#### 4. Memory Issues
**Symptoms**: "Out of memory" errors
**Solutions**:
- Process files in smaller batches
- Reduce image sizes before processing
- Use streaming operations
- Limit concurrent processing

### Debug Mode

Enable debug output:

```bash
# Run with debug information
DEBUG=true npm run build:all

# Test individual components
npm run validate
npm run process:projects -- --debug
npm run optimize:images -- --verbose
```

### Manual Recovery

If automation fails completely:

```bash
# Create minimal data files
mkdir -p data

# Generate basic project data
echo '{"projects":[],"metadata":{"total":0}}' > data/projects.json
echo '{"papers":[],"metadata":{"total":0}}' > data/papers.json
echo '{"testimonials":[],"metadata":{"total":0}}' > data/testimonials.json

# Commit fallback data
git add data/
git commit -m "fix: Add fallback data for failed automation"
git push
```

---

## Performance Optimization

### Content Optimization Tips

1. **Image Sizes**
   - Keep source images under 5MB
   - Use appropriate formats (JPG for photos, PNG for graphics)
   - Pre-crop to reasonable dimensions

2. **PDF Optimization**
   - Compress PDFs before upload
   - Use text-based PDFs (not scanned images)
   - Keep file sizes reasonable (<10MB)

3. **Content Length**
   - Keep project descriptions focused (200-500 words)
   - Use excerpts for long content
   - Optimize for search index size

### Build Performance

1. **Incremental Builds**
   - Only modified content is reprocessed
   - Cached dependencies speed up builds
   - Parallel processing reduces total time

2. **Resource Management**
   - Monitor build time trends
   - Optimize scripts for efficiency
   - Use appropriate resource limits

---

## Monitoring and Maintenance

### Regular Checks

- **Weekly**: Review build success rates
- **Monthly**: Update dependencies
- **Quarterly**: Performance optimization review
- **Annually**: Architecture review and updates

### GitHub Actions Insights

Monitor these metrics:
- Build success rate (target: >99%)
- Average build time (target: <5 minutes)
- Error patterns and recovery rates
- Resource usage trends

### Content Quality

- Use validation reports to maintain quality
- Monitor search index size and performance
- Review image optimization effectiveness
- Check for content gaps or inconsistencies

This setup provides a robust foundation for automated content management while maintaining flexibility for customization and expansion.