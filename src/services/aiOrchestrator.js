const ClaudeHandler = require('./claudeHandler');
const GeminiHandler = require('./geminiHandler');
const ComplexityScorer = require('./complexityScorer');

/**
 * AI Orchestrator Service
 * Responsible for routing requests to the appropriate AI model based on task complexity
 */
class AiOrchestrator {
  constructor() {
    this.claudeHandler = new ClaudeHandler();
    this.geminiHandler = new GeminiHandler();
    this.complexityScorer = new ComplexityScorer();
    
    // Default thresholds for model selection
    this.thresholds = {
      simple: 30,    // 0-30: Use Gemini Flash
      medium: 60,    // 31-60: Use Claude Haiku or Gemini Pro
      complex: 85    // 61-85: Use Claude Sonnet, 86+: Use Claude Opus
    };
  }

  /**
   * Process a task using the appropriate AI model
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @returns {Promise<Object>} - The processed result
   */
  async processTask(task, context = {}) {
    try {
      // Score the complexity of the task
      const complexityScore = await this.complexityScorer.scoreTask(task);
      console.log(`Task complexity score: ${complexityScore}`);
      
      // Add complexity to task object for downstream handlers
      task.complexity = complexityScore;
      
      // Route to appropriate model based on complexity
      if (complexityScore <= this.thresholds.simple) {
        console.log('Routing to Gemini Flash');
        return await this.geminiHandler.processSimpleTask(task, context);
      } else if (complexityScore <= this.thresholds.medium) {
        console.log('Routing to Gemini Pro');
        return await this.geminiHandler.processTask(task, context);
      } else if (complexityScore <= this.thresholds.complex) {
        console.log('Routing to Claude Haiku/Sonnet');
        return await this.claudeHandler.processTask(task, context);
      } else {
        console.log('Routing to Claude Opus');
        return await this.claudeHandler.processComplexTask(task, context);
      }
    } catch (error) {
      console.error('Error in AI orchestration:', error);
      throw new Error(`AI orchestration failed: ${error.message}`);
    }
  }

  /**
   * Update the thresholds for model selection
   * @param {Object} newThresholds - The new thresholds
   */
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('Updated AI model thresholds:', this.thresholds);
  }
}

module.exports = new AiOrchestrator();
