#!/usr/bin/env node

/**
 * Citation Analysis Utility
 * Analyzes citation patterns, networks, and academic impact metrics
 */

const fs = require('fs').promises;
const path = require('path');

class CitationAnalyzer {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.papersFile = path.join(this.dataDir, 'papers.json');
    this.outputFile = path.join(this.dataDir, 'citation-analysis.json');
    this.networkFile = path.join(this.dataDir, 'citation-network.json');

    // Citation analysis configuration
    this.config = {
      minCitations: 1,
      maxNetworkNodes: 500,
      similarityThreshold: 0.3,
      temporalWindowYears: 5,
      impactMetrics: [
        'h-index',
        'citation-velocity',
        'collaboration-index',
        'interdisciplinary-score'
      ]
    };

    // Known journal impact factors (simplified mapping)
    this.journalImpactFactors = {
      'nature': 49.962,
      'science': 47.728,
      'cell': 41.582,
      'ieee': 5.165,
      'acm': 4.157,
      'springer': 2.987,
      'elsevier': 3.128
    };
  }

  async analyze() {
    console.log('📊 Starting citation analysis...');

    try {
      // Load papers data
      const papersData = await this.loadPapersData();

      if (!papersData || papersData.papers.length === 0) {
        console.log('📄 No papers found for citation analysis');
        await this.writeEmptyResults();
        return;
      }

      console.log(`📚 Analyzing ${papersData.papers.length} papers for citation patterns...`);

      // Extract citation data
      const citationData = this.extractCitationData(papersData.papers);

      // Generate citation network
      const citationNetwork = this.buildCitationNetwork(citationData);

      // Calculate impact metrics
      const impactMetrics = this.calculateImpactMetrics(citationData, papersData.papers);

      // Analyze collaboration patterns
      const collaborationAnalysis = this.analyzeCollaborationPatterns(papersData.papers);

      // Temporal citation analysis
      const temporalAnalysis = this.analyzeTemporalPatterns(citationData, papersData.papers);

      // Journal and venue analysis
      const venueAnalysis = this.analyzeVenues(papersData.papers);

      // Generate recommendations
      const recommendations = this.generateRecommendations(citationData, papersData.papers);

      // Compile final analysis
      const analysis = {
        overview: this.generateOverview(citationData, papersData.papers),
        impactMetrics,
        collaborationAnalysis,
        temporalAnalysis,
        venueAnalysis,
        recommendations,
        metadata: {
          totalPapers: papersData.papers.length,
          papersWithCitations: citationData.papers.length,
          totalCitations: citationData.totalCitations,
          uniqueReferences: citationData.uniqueReferences,
          analysisDate: new Date().toISOString(),
          version: '2.0.0'
        }
      };

      // Write outputs
      await this.writeAnalysis(analysis);
      await this.writeCitationNetwork(citationNetwork);

      // Generate summary report
      this.generateSummaryReport(analysis);

      console.log('✅ Citation analysis completed successfully');

    } catch (error) {
      console.error('❌ Error in citation analysis:', error.message);
      if (error.stack) console.error(error.stack);
      process.exit(1);
    }
  }

  async loadPapersData() {
    try {
      const content = await fs.readFile(this.papersFile, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠️  Could not load papers data: ${error.message}`);
      return null;
    }
  }

  extractCitationData(papers) {
    const citationData = {
      papers: [],
      totalCitations: 0,
      uniqueReferences: new Set(),
      citationGraph: new Map(),
      authorCitations: new Map(),
      venueCitations: new Map()
    };

    papers.forEach((paper, index) => {
      if (paper.citations && paper.citations.totalCitations > 0) {
        const paperCitations = {
          id: paper.id,
          title: paper.title,
          authors: paper.authorAnalysis?.extractedAuthors || [],
          date: paper.date,
          venue: this.extractVenue(paper),
          citationCount: paper.citations.totalCitations,
          references: paper.citations.references || [],
          inTextCitations: paper.citations.inTextCitations || [],
          dois: paper.citations.dois || [],
          citationStyle: paper.citations.citationStyle || 'unknown'
        };

        citationData.papers.push(paperCitations);
        citationData.totalCitations += paperCitations.citationCount;

        // Track unique references
        paperCitations.references.forEach(ref => {
          if (ref.text) {
            citationData.uniqueReferences.add(ref.text);
          }
        });

        // Build citation graph
        citationData.citationGraph.set(paper.id, {
          outbound: paperCitations.references.length,
          inbound: 0, // Will be calculated later
          references: paperCitations.references,
          citing: []
        });

        // Track author citations
        paperCitations.authors.forEach(author => {
          if (!citationData.authorCitations.has(author)) {
            citationData.authorCitations.set(author, {
              papers: [],
              totalCitations: 0,
              hIndex: 0
            });
          }

          const authorData = citationData.authorCitations.get(author);
          authorData.papers.push({
            id: paper.id,
            citations: paperCitations.citationCount,
            date: paper.date
          });
          authorData.totalCitations += paperCitations.citationCount;
        });

        // Track venue citations
        if (paperCitations.venue) {
          if (!citationData.venueCitations.has(paperCitations.venue)) {
            citationData.venueCitations.set(paperCitations.venue, {
              papers: [],
              totalCitations: 0
            });
          }

          const venueData = citationData.venueCitations.get(paperCitations.venue);
          venueData.papers.push(paper.id);
          venueData.totalCitations += paperCitations.citationCount;
        }
      }
    });

    citationData.uniqueReferences = citationData.uniqueReferences.size;

    // Calculate H-indices for authors
    citationData.authorCitations.forEach((authorData, author) => {
      const sortedCitations = authorData.papers
        .map(p => p.citations)
        .sort((a, b) => b - a);

      authorData.hIndex = this.calculateHIndex(sortedCitations);
    });

    return citationData;
  }

  buildCitationNetwork(citationData) {
    console.log('🕸️  Building citation network...');

    const network = {
      nodes: [],
      edges: [],
      clusters: [],
      metrics: {}
    };

    // Create nodes for papers
    citationData.papers.forEach(paper => {
      network.nodes.push({
        id: paper.id,
        label: paper.title,
        type: 'paper',
        size: Math.log(paper.citationCount + 1) * 10, // Size based on citation count
        color: this.getNodeColor(paper.venue),
        citations: paper.citationCount,
        authors: paper.authors,
        date: paper.date,
        venue: paper.venue
      });
    });

    // Create edges based on citation relationships
    this.findCitationRelationships(citationData, network);

    // Detect citation clusters
    network.clusters = this.detectCitationClusters(network);

    // Calculate network metrics
    network.metrics = this.calculateNetworkMetrics(network);

    return network;
  }

  findCitationRelationships(citationData, network) {
    // Simple similarity-based edge creation
    // In a real implementation, this would use DOI matching, title similarity, etc.

    const papers = citationData.papers;

    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        const similarity = this.calculatePaperSimilarity(papers[i], papers[j]);

        if (similarity > this.config.similarityThreshold) {
          network.edges.push({
            source: papers[i].id,
            target: papers[j].id,
            weight: similarity,
            type: 'similarity'
          });
        }

        // Check for potential citations based on temporal order and author overlap
        if (this.isPotentialCitation(papers[i], papers[j])) {
          network.edges.push({
            source: papers[j].id,
            target: papers[i].id,
            weight: 0.8,
            type: 'potential-citation'
          });
        }
      }
    }
  }

  calculateImpactMetrics(citationData, papers) {
    console.log('📈 Calculating impact metrics...');

    const metrics = {
      overallHIndex: 0,
      citationVelocity: {},
      topAuthors: [],
      topPapers: [],
      collaborationIndex: 0,
      interdisciplinaryScore: 0,
      temporalTrends: {}
    };

    // Calculate overall H-index
    const allCitations = citationData.papers
      .map(p => p.citationCount)
      .sort((a, b) => b - a);
    metrics.overallHIndex = this.calculateHIndex(allCitations);

    // Citation velocity (citations per year)
    const currentYear = new Date().getFullYear();
    citationData.papers.forEach(paper => {
      const paperYear = new Date(paper.date).getFullYear();
      const yearsActive = Math.max(1, currentYear - paperYear);
      const velocity = paper.citationCount / yearsActive;

      metrics.citationVelocity[paper.id] = {
        velocity,
        totalCitations: paper.citationCount,
        yearsActive
      };
    });

    // Top authors by impact
    const authorStats = [];
    citationData.authorCitations.forEach((data, author) => {
      authorStats.push({
        author,
        totalCitations: data.totalCitations,
        paperCount: data.papers.length,
        hIndex: data.hIndex,
        avgCitations: data.totalCitations / data.papers.length
      });
    });

    metrics.topAuthors = authorStats
      .sort((a, b) => b.hIndex - a.hIndex || b.totalCitations - a.totalCitations)
      .slice(0, 20);

    // Top papers by citations
    metrics.topPapers = citationData.papers
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, 15)
      .map(paper => ({
        id: paper.id,
        title: paper.title,
        citations: paper.citationCount,
        authors: paper.authors,
        venue: paper.venue,
        date: paper.date
      }));

    // Collaboration index (average authors per paper)
    const totalAuthors = papers.reduce((sum, paper) => {
      return sum + (paper.authorAnalysis?.extractedAuthors?.length || 1);
    }, 0);
    metrics.collaborationIndex = totalAuthors / papers.length;

    // Interdisciplinary score (based on venue diversity)
    const venues = new Set(papers.map(p => this.extractVenue(p)).filter(Boolean));
    metrics.interdisciplinaryScore = venues.size / Math.max(papers.length, 1);

    return metrics;
  }

  analyzeCollaborationPatterns(papers) {
    console.log('🤝 Analyzing collaboration patterns...');

    const collaborations = {
      authorNetwork: new Map(),
      institutionNetwork: new Map(),
      collaborationFrequency: {},
      topCollaborations: [],
      networkMetrics: {}
    };

    papers.forEach(paper => {
      const authors = paper.authorAnalysis?.extractedAuthors || [];
      const institutions = paper.authorAnalysis?.institutions || [];

      // Build author collaboration network
      for (let i = 0; i < authors.length; i++) {
        for (let j = i + 1; j < authors.length; j++) {
          const pair = [authors[i], authors[j]].sort().join(' | ');
          collaborations.collaborationFrequency[pair] =
            (collaborations.collaborationFrequency[pair] || 0) + 1;
        }
      }

      // Author network
      authors.forEach(author => {
        if (!collaborations.authorNetwork.has(author)) {
          collaborations.authorNetwork.set(author, {
            papers: [],
            collaborators: new Set(),
            institutions: new Set()
          });
        }

        const authorData = collaborations.authorNetwork.get(author);
        authorData.papers.push(paper.id);

        authors.forEach(coauthor => {
          if (coauthor !== author) {
            authorData.collaborators.add(coauthor);
          }
        });

        institutions.forEach(inst => {
          authorData.institutions.add(inst);
        });
      });
    });

    // Top collaborations
    collaborations.topCollaborations = Object.entries(collaborations.collaborationFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([pair, count]) => ({
        authors: pair.split(' | '),
        collaborations: count
      }));

    // Network metrics
    collaborations.networkMetrics = {
      totalAuthors: collaborations.authorNetwork.size,
      averageCollaborators: this.calculateAverageCollaborators(collaborations.authorNetwork),
      networkDensity: this.calculateNetworkDensity(collaborations.authorNetwork),
      largestComponent: this.findLargestComponent(collaborations.authorNetwork)
    };

    return collaborations;
  }

  analyzeTemporalPatterns(citationData, papers) {
    console.log('📅 Analyzing temporal citation patterns...');

    const temporal = {
      yearlyDistribution: {},
      citationTrends: {},
      productivityTrends: {},
      temporalClusters: []
    };

    // Yearly paper distribution
    papers.forEach(paper => {
      const year = new Date(paper.date).getFullYear();

      if (!temporal.yearlyDistribution[year]) {
        temporal.yearlyDistribution[year] = {
          paperCount: 0,
          totalCitations: 0,
          avgCitations: 0
        };
      }

      temporal.yearlyDistribution[year].paperCount++;

      const citations = paper.citations?.totalCitations || 0;
      temporal.yearlyDistribution[year].totalCitations += citations;
    });

    // Calculate averages
    Object.keys(temporal.yearlyDistribution).forEach(year => {
      const yearData = temporal.yearlyDistribution[year];
      yearData.avgCitations = yearData.totalCitations / yearData.paperCount;
    });

    // Citation trends over time
    const sortedYears = Object.keys(temporal.yearlyDistribution).sort();
    temporal.citationTrends = {
      trend: this.calculateTrend(sortedYears, year => temporal.yearlyDistribution[year].avgCitations),
      productivity: this.calculateTrend(sortedYears, year => temporal.yearlyDistribution[year].paperCount)
    };

    return temporal;
  }

  analyzeVenues(papers) {
    console.log('🏛️  Analyzing publication venues...');

    const venues = {
      venueStats: new Map(),
      impactAnalysis: {},
      venueNetwork: {},
      topVenues: []
    };

    papers.forEach(paper => {
      const venue = this.extractVenue(paper);
      if (!venue) return;

      if (!venues.venueStats.has(venue)) {
        venues.venueStats.set(venue, {
          papers: [],
          totalCitations: 0,
          authors: new Set(),
          impactFactor: this.getVenueImpactFactor(venue)
        });
      }

      const venueData = venues.venueStats.get(venue);
      venueData.papers.push(paper.id);
      venueData.totalCitations += paper.citations?.totalCitations || 0;

      if (paper.authorAnalysis?.extractedAuthors) {
        paper.authorAnalysis.extractedAuthors.forEach(author => {
          venueData.authors.add(author);
        });
      }
    });

    // Calculate venue metrics and create top venues list
    const venueMetrics = [];
    venues.venueStats.forEach((data, venue) => {
      const avgCitations = data.totalCitations / data.papers.length;
      const authorCount = data.authors.size;

      venueMetrics.push({
        venue,
        paperCount: data.papers.length,
        totalCitations: data.totalCitations,
        avgCitations,
        authorCount,
        impactFactor: data.impactFactor,
        qualityScore: this.calculateVenueQuality(avgCitations, data.impactFactor, authorCount)
      });
    });

    venues.topVenues = venueMetrics
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 15);

    return venues;
  }

  generateRecommendations(citationData, papers) {
    console.log('💡 Generating recommendations...');

    const recommendations = {
      citationImprovements: [],
      collaborationOpportunities: [],
      venueRecommendations: [],
      researchDirections: []
    };

    // Citation improvement recommendations
    const lowCitationPapers = citationData.papers
      .filter(p => p.citationCount < 5)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    recommendations.citationImprovements = lowCitationPapers.map(paper => ({
      paperId: paper.id,
      title: paper.title,
      currentCitations: paper.citationCount,
      suggestions: [
        'Consider submitting to higher-impact venues',
        'Improve keyword optimization for discoverability',
        'Engage in conference presentations and networking',
        'Collaborate with established researchers in the field'
      ]
    }));

    // Collaboration opportunities
    const soloAuthorPapers = papers.filter(p =>
      (p.authorAnalysis?.extractedAuthors?.length || 0) <= 1
    );

    if (soloAuthorPapers.length > 0) {
      recommendations.collaborationOpportunities.push({
        type: 'increase-collaboration',
        description: `${soloAuthorPapers.length} papers have single authors. Consider collaborative research.`,
        benefit: 'Collaborative papers typically receive 2-3x more citations',
        actions: [
          'Reach out to researchers in related fields',
          'Participate in research networks and consortiums',
          'Attend academic conferences and workshops'
        ]
      });
    }

    return recommendations;
  }

  // Utility methods

  extractVenue(paper) {
    // Extract venue from various sources
    if (paper.journal) return paper.journal;
    if (paper.conference) return paper.conference;
    if (paper.venue) return paper.venue;

    // Try to extract from filename or metadata
    if (paper.filename) {
      const filename = paper.filename.toLowerCase();
      if (filename.includes('ieee')) return 'IEEE';
      if (filename.includes('acm')) return 'ACM';
      if (filename.includes('springer')) return 'Springer';
    }

    return 'Unknown';
  }

  calculateHIndex(sortedCitations) {
    let hIndex = 0;
    for (let i = 0; i < sortedCitations.length; i++) {
      if (sortedCitations[i] >= i + 1) {
        hIndex = i + 1;
      } else {
        break;
      }
    }
    return hIndex;
  }

  calculatePaperSimilarity(paper1, paper2) {
    let similarity = 0;

    // Author overlap
    const authors1 = new Set(paper1.authors);
    const authors2 = new Set(paper2.authors);
    const authorOverlap = [...authors1].filter(a => authors2.has(a)).length;
    const maxAuthors = Math.max(authors1.size, authors2.size);
    if (maxAuthors > 0) {
      similarity += (authorOverlap / maxAuthors) * 0.4;
    }

    // Venue similarity
    if (paper1.venue && paper2.venue && paper1.venue === paper2.venue) {
      similarity += 0.3;
    }

    // Temporal proximity (papers published close in time are more likely related)
    const date1 = new Date(paper1.date);
    const date2 = new Date(paper2.date);
    const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
    const temporalSimilarity = Math.max(0, 1 - daysDiff / (365 * 2)); // 2-year window
    similarity += temporalSimilarity * 0.3;

    return Math.min(1, similarity);
  }

  isPotentialCitation(paper1, paper2) {
    // Check if paper2 might cite paper1 (paper1 is older)
    const date1 = new Date(paper1.date);
    const date2 = new Date(paper2.date);

    if (date2 <= date1) return false; // Paper2 must be newer

    // Check for author overlap or venue similarity
    const authors1 = new Set(paper1.authors);
    const authors2 = new Set(paper2.authors);
    const hasAuthorOverlap = [...authors1].some(a => authors2.has(a));
    const sameVenue = paper1.venue && paper2.venue && paper1.venue === paper2.venue;

    return hasAuthorOverlap || sameVenue;
  }

  getNodeColor(venue) {
    // Color coding for different venue types
    const colors = {
      'IEEE': '#1f77b4',
      'ACM': '#ff7f0e',
      'Springer': '#2ca02c',
      'Elsevier': '#d62728',
      'Nature': '#9467bd',
      'Science': '#8c564b',
      'Unknown': '#7f7f7f'
    };

    for (const [key, color] of Object.entries(colors)) {
      if (venue && venue.toLowerCase().includes(key.toLowerCase())) {
        return color;
      }
    }

    return colors.Unknown;
  }

  detectCitationClusters(network) {
    // Simple clustering based on edge density
    // In practice, would use more sophisticated algorithms like Louvain

    const clusters = [];
    const visited = new Set();

    network.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster = this.exploreCluster(node.id, network, visited);
        if (cluster.length > 1) {
          clusters.push({
            id: clusters.length,
            nodes: cluster,
            size: cluster.length,
            cohesion: this.calculateClusterCohesion(cluster, network)
          });
        }
      }
    });

    return clusters.sort((a, b) => b.size - a.size);
  }

  exploreCluster(startNodeId, network, visited) {
    const cluster = [];
    const queue = [startNodeId];

    while (queue.length > 0) {
      const nodeId = queue.shift();
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      cluster.push(nodeId);

      // Find connected nodes
      network.edges.forEach(edge => {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          queue.push(edge.target);
        } else if (edge.target === nodeId && !visited.has(edge.source)) {
          queue.push(edge.source);
        }
      });
    }

    return cluster;
  }

  calculateClusterCohesion(cluster, network) {
    if (cluster.length < 2) return 0;

    let internalEdges = 0;
    const maxPossibleEdges = cluster.length * (cluster.length - 1) / 2;

    network.edges.forEach(edge => {
      if (cluster.includes(edge.source) && cluster.includes(edge.target)) {
        internalEdges++;
      }
    });

    return internalEdges / maxPossibleEdges;
  }

  calculateNetworkMetrics(network) {
    return {
      nodeCount: network.nodes.length,
      edgeCount: network.edges.length,
      density: network.edges.length / (network.nodes.length * (network.nodes.length - 1) / 2),
      avgDegree: (2 * network.edges.length) / network.nodes.length,
      clusterCount: network.clusters.length
    };
  }

  calculateAverageCollaborators(authorNetwork) {
    let totalCollaborators = 0;
    authorNetwork.forEach(data => {
      totalCollaborators += data.collaborators.size;
    });
    return totalCollaborators / authorNetwork.size;
  }

  calculateNetworkDensity(authorNetwork) {
    const nodeCount = authorNetwork.size;
    let edgeCount = 0;

    authorNetwork.forEach(data => {
      edgeCount += data.collaborators.size;
    });

    const maxPossibleEdges = nodeCount * (nodeCount - 1);
    return maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;
  }

  findLargestComponent(authorNetwork) {
    // Simplified component analysis
    return Math.min(authorNetwork.size, 50); // Placeholder
  }

  calculateTrend(years, valueExtractor) {
    if (years.length < 2) return { slope: 0, direction: 'stable' };

    const values = years.map(valueExtractor);
    const n = years.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      const x = parseInt(years[i]);
      const y = values[i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return {
      slope,
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable'
    };
  }

  getVenueImpactFactor(venue) {
    if (!venue) return 1.0;

    const venueLower = venue.toLowerCase();
    for (const [key, factor] of Object.entries(this.journalImpactFactors)) {
      if (venueLower.includes(key)) {
        return factor;
      }
    }

    return 2.0; // Default impact factor
  }

  calculateVenueQuality(avgCitations, impactFactor, authorCount) {
    return (avgCitations * 0.4) + (impactFactor * 0.4) + (Math.log(authorCount + 1) * 0.2);
  }

  generateOverview(citationData, papers) {
    return {
      totalPapers: papers.length,
      papersWithCitations: citationData.papers.length,
      totalCitations: citationData.totalCitations,
      avgCitationsPerPaper: citationData.totalCitations / Math.max(citationData.papers.length, 1),
      uniqueReferences: citationData.uniqueReferences,
      citationRate: citationData.papers.length / papers.length,
      mostCitedPaper: citationData.papers.length > 0 ?
        citationData.papers.reduce((max, paper) =>
          paper.citationCount > max.citationCount ? paper : max
        ) : null
    };
  }

  async writeEmptyResults() {
    const emptyAnalysis = {
      overview: { totalPapers: 0, papersWithCitations: 0, totalCitations: 0 },
      impactMetrics: {},
      collaborationAnalysis: {},
      temporalAnalysis: {},
      venueAnalysis: {},
      recommendations: {},
      metadata: {
        totalPapers: 0,
        analysisDate: new Date().toISOString(),
        version: '2.0.0'
      }
    };

    const emptyNetwork = {
      nodes: [],
      edges: [],
      clusters: [],
      metrics: {}
    };

    await this.writeAnalysis(emptyAnalysis);
    await this.writeCitationNetwork(emptyNetwork);
  }

  async writeAnalysis(analysis) {
    await fs.writeFile(this.outputFile, JSON.stringify(analysis, null, 2));
    console.log(`📊 Generated citation analysis: ${this.outputFile}`);
  }

  async writeCitationNetwork(network) {
    await fs.writeFile(this.networkFile, JSON.stringify(network, null, 2));
    console.log(`🕸️  Generated citation network: ${this.networkFile}`);
  }

  generateSummaryReport(analysis) {
    console.log('\n📋 Citation Analysis Summary:');
    console.log(`  - Total papers analyzed: ${analysis.metadata.totalPapers}`);
    console.log(`  - Papers with citations: ${analysis.metadata.papersWithCitations}`);
    console.log(`  - Total citations: ${analysis.metadata.totalCitations}`);
    console.log(`  - Overall H-index: ${analysis.impactMetrics.overallHIndex || 0}`);
    console.log(`  - Average collaboration: ${analysis.collaborationAnalysis.networkMetrics?.averageCollaborators?.toFixed(2) || 0} co-authors`);

    if (analysis.impactMetrics.topAuthors && analysis.impactMetrics.topAuthors.length > 0) {
      console.log(`  - Top author: ${analysis.impactMetrics.topAuthors[0].author} (H-index: ${analysis.impactMetrics.topAuthors[0].hIndex})`);
    }

    if (analysis.venueAnalysis.topVenues && analysis.venueAnalysis.topVenues.length > 0) {
      console.log(`  - Top venue: ${analysis.venueAnalysis.topVenues[0].venue} (${analysis.venueAnalysis.topVenues[0].paperCount} papers)`);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new CitationAnalyzer();
  analyzer.analyze();
}

module.exports = CitationAnalyzer;