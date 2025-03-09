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
    this.deepseekHandler = new (require('./deepseekHandler'))();
    
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
    // Add model metadata tracking
    const startTime = Date.now();
    let modelUsed = null;
    
    try {
      // Enhanced complexity analysis
      const { score, breakdown } = await this.complexityScorer.scoreTask(task);
      task.complexity = score;
      console.log(`Task complexity score: ${score}`);
      
      // Check for reasoning requirement first
      if (context.requiresReasoning || (breakdown && breakdown.components && breakdown.components.context > 70)) {
        console.log('Routing to DeepSeek for reasoning task');
        modelUsed = 'deepseek-r1';
        return await this.deepseekHandler.processReasoningTask(task, context);
      }

      // Dynamic threshold application
      const thresholds = this.getDynamicThresholds(context);
      
      // Model selection with fallback
      const result = await this.routeWithFallback(task, context, thresholds);
      modelUsed = result.model;
      
      return result;
    } catch (error) {
      console.error('Error in AI orchestration:', error);
      throw new Error(`AI orchestration failed: ${error.message}`);
    } finally {
      // Log performance metrics
      this.logTaskMetrics({
        taskId: task.id || 'unknown',
        duration: Date.now() - startTime,
        model: modelUsed,
        complexity: task.complexity
      });
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

  /**
   * Get dynamic thresholds based on context
   * @param {Object} context - The context object
   * @returns {Object} - Adjusted thresholds
   */
  getDynamicThresholds(context) {
    return {
      simple: context.priority === 'high' ? 
        this.thresholds.simple - 10 : 
        this.thresholds.simple,
      medium: context.priority === 'low' ?
        this.thresholds.medium + 15 :
        this.thresholds.medium,
      complex: this.thresholds.complex
    };
  }

  /**
   * Route task with fallback mechanism
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context
   * @param {Object} thresholds - Complexity thresholds
   * @returns {Promise<Object>} - The processed result
   */
  async routeWithFallback(task, context, thresholds) {
    try {
      return await this.routeByComplexity(task, context, thresholds);
    } catch (error) {
      console.warn(`Primary model failed, falling back: ${error.message}`);
      return this.geminiHandler.processSimpleTask(task, context);
    }
  }

  /**
   * Route task based on complexity
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context
   * @param {Object} thresholds - Complexity thresholds
   * @returns {Promise<Object>} - The processed result
   */
  async routeByComplexity(task, context, thresholds) {
    if (task.complexity <= thresholds.simple) {
      console.log('Routing to Gemini Flash');
      return await this.geminiHandler.processSimpleTask(task, context);
    } else if (task.complexity <= thresholds.medium) {
      console.log('Routing to Gemini Pro');
      return await this.geminiHandler.processTask(task, context);
    } else if (task.complexity <= thresholds.complex) {
      console.log('Routing to Claude Haiku/Sonnet');
      return await this.claudeHandler.processTask(task, context);
    } else {
      console.log('Routing to Claude Opus');
      return await this.claudeHandler.processComplexTask(task, context);
    }
  }

  /**
   * Log task metrics for monitoring
   * @param {Object} metrics - Metrics data
   */
  logTaskMetrics(metrics) {
    console.log('AI Task Metrics:', JSON.stringify(metrics));
    // In a production environment, this would send to a monitoring service
  }
}

module.exports = new AiOrchestrator();
