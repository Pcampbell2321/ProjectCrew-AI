/**
 * Complexity Scorer Service
 * Analyzes tasks to determine their complexity for appropriate model routing
 */
class ComplexityScorer {
  constructor() {
    // Weights for different complexity factors
    this.weights = {
      length: 0.3,
      codeContent: 0.25,
      technicalTerms: 0.2,
      structuralComplexity: 0.15,
      contextDependency: 0.1
    };
    
    // Technical terms that indicate complexity
    this.technicalTerms = [
      'algorithm', 'architecture', 'asynchronous', 'authentication', 'authorization',
      'concurrency', 'database', 'encryption', 'framework', 'infrastructure',
      'integration', 'microservice', 'optimization', 'parallelism', 'performance',
      'refactoring', 'scalability', 'security', 'synchronization', 'transaction'
    ];
  }

  /**
   * Score a task's complexity
   * @param {Object} task - The task to score
   * @returns {Object} - Complexity score and breakdown
   */
  async scoreTask(task) {
    // Extract text content from task
    const text = this.extractTextContent(task);
    
    // Calculate individual complexity factors
    const lengthScore = this.scoreLengthComplexity(text);
    const codeScore = this.scoreCodeContent(text);
    const termsScore = this.scoreTechnicalTerms(text);
    const structuralScore = this.scoreStructuralComplexity(text);
    const contextScore = this.scoreContextDependency(task);
    
    // Calculate weighted score
    const weightedScore = 
      (lengthScore * this.weights.length) +
      (codeScore * this.weights.codeContent) +
      (termsScore * this.weights.technicalTerms) +
      (structuralScore * this.weights.structuralComplexity) +
      (contextScore * this.weights.contextDependency);
    
    // Normalize to 0-100 scale
    const score = Math.min(Math.round(weightedScore), 100);
    
    // Return score with breakdown
    return {
      score,
      breakdown: {
        components: {
          length: lengthScore,
          code: codeScore,
          terms: termsScore,
          structure: structuralScore,
          context: contextScore
        },
        weights: this.weights
      }
    };
  }

  /**
   * Extract text content from task object
   */
  extractTextContent(task) {
    if (typeof task === 'string') return task;
    
    if (task.content) {
      if (typeof task.content === 'string') return task.content;
      if (Array.isArray(task.content)) {
        return task.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n');
      }
    }
    
    return JSON.stringify(task);
  }

  /**
   * Score complexity based on text length
   */
  scoreLengthComplexity(text) {
    const length = text.length;
    if (length < 100) return 10;
    if (length < 500) return 30;
    if (length < 1000) return 50;
    if (length < 3000) return 70;
    return 90;
  }

  /**
   * Score complexity based on code content
   */
  scoreCodeContent(text) {
    // Check for code blocks
    const codeBlockMatches = text.match(/```[\s\S]*?```/g) || [];
    const codeBlockLength = codeBlockMatches.reduce((total, block) => total + block.length, 0);
    
    // Check for inline code
    const inlineCodeMatches = text.match(/`[^`]+`/g) || [];
    const inlineCodeLength = inlineCodeMatches.reduce((total, code) => total + code.length, 0);
    
    // Calculate code ratio
    const codeRatio = (codeBlockLength + inlineCodeLength) / text.length;
    
    if (codeRatio < 0.1) return 20;
    if (codeRatio < 0.3) return 40;
    if (codeRatio < 0.5) return 60;
    if (codeRatio < 0.7) return 80;
    return 95;
  }

  /**
   * Score complexity based on technical terms
   */
  scoreTechnicalTerms(text) {
    const lowerText = text.toLowerCase();
    let termCount = 0;
    
    this.technicalTerms.forEach(term => {
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      const matches = lowerText.match(regex) || [];
      termCount += matches.length;
    });
    
    if (termCount === 0) return 10;
    if (termCount < 3) return 30;
    if (termCount < 6) return 50;
    if (termCount < 10) return 70;
    return 90;
  }

  /**
   * Score complexity based on structural elements
   */
  scoreStructuralComplexity(text) {
    // Count structural elements like lists, tables, headings
    const listItems = (text.match(/^[\s]*[-*+][\s]/gm) || []).length;
    const headings = (text.match(/^#{1,6}\s/gm) || []).length;
    const tables = (text.match(/\|[^|]+\|/g) || []).length / 3; // Approximate table rows
    
    const structuralElements = listItems + headings + tables;
    
    if (structuralElements < 3) return 20;
    if (structuralElements < 10) return 40;
    if (structuralElements < 20) return 60;
    if (structuralElements < 30) return 80;
    return 95;
  }

  /**
   * Score complexity based on context dependency
   */
  scoreContextDependency(task) {
    // Check if task has context references
    const hasContext = task.context || task.references || task.history;
    if (!hasContext) return 20;
    
    // If we have context object, analyze its complexity
    if (typeof task.context === 'object') {
      const contextKeys = Object.keys(task.context).length;
      if (contextKeys < 2) return 30;
      if (contextKeys < 5) return 50;
      if (contextKeys < 10) return 70;
      return 90;
    }
    
    return 50; // Default medium score if context exists but can't be analyzed
  }
}

module.exports = ComplexityScorer;
