const ClaudeHandler = require('./claudeHandler');
const GeminiHandler = require('./geminiHandler');
const ComplexityScorer = require('./complexityScorer');
const ReasoningAnalyzer = require('./reasoningAnalyzer');

/**
 * Task Analyzer
 * Responsible for analyzing task complexity and reasoning requirements
 */
class TaskAnalyzer {
  constructor() {
    this.scorer = new ComplexityScorer();
    this.reasoningAnalyzer = new ReasoningAnalyzer();
  }

  async analyzeTask(task) {
    const [complexity, reasoning] = await Promise.all([
      this.scorer.scoreTask(task),
      this.reasoningAnalyzer.determineReasoningRequirements(task)
    ]);
    
    return {
      complexity: complexity.score,
      complexityBreakdown: complexity.breakdown,
      reasoningType: reasoning.type,
      requiresStepwise: reasoning.stepwise,
      modelRequirements: this._deriveModelRequirements(complexity, reasoning)
    };
  }

  _deriveModelRequirements(complexity, reasoning) {
    const requirements = [];
    if (complexity.score > 75) requirements.push('high-capacity');
    if (reasoning.contextDependency > 0.6) requirements.push('context-aware');
    if (reasoning.temporalAspect) requirements.push('temporal-reasoning');
    return requirements;
  }
}

/**
 * Task Router
 * Responsible for routing tasks to appropriate handlers
 */
class TaskRouter {
  constructor(handlers, thresholds) {
    this.handlers = handlers;
    this.thresholds = thresholds;
    this.fallbackOrder = ['claude', 'gemini', 'deepseek'];
  }

  async routeTask(task, analysis, context) {
    if (analysis.requiresStepwise) {
      console.log('Routing to DeepSeek for reasoning task');
      return {
        result: await this.handlers.deepseek.processReasoningTask(task, context),
        model: 'deepseek-r1'
      };
    }
    
    return this.routeByComplexity(task, analysis.complexity, context);
  }
  
  async routeByComplexity(task, complexity, context) {
    if (complexity <= this.thresholds.simple) {
      console.log('Routing to Gemini Flash');
      return {
        result: await this.handlers.gemini.processSimpleTask(task, context),
        model: 'gemini-flash'
      };
    } else if (complexity <= this.thresholds.medium) {
      console.log('Routing to Gemini Pro');
      return {
        result: await this.handlers.gemini.processTask(task, context),
        model: 'gemini-pro'
      };
    } else if (complexity <= this.thresholds.complex) {
      console.log('Routing to Claude Haiku/Sonnet');
      return {
        result: await this.handlers.claude.processTask(task, context),
        model: 'claude-sonnet'
      };
    } else {
      console.log('Routing to Claude Opus');
      return {
        result: await this.handlers.claude.processComplexTask(task, context),
        model: 'claude-opus'
      };
    }
  }
  
  async routeWithFallback(task, analysis, context) {
    try {
      return await this.routeTask(task, analysis, context);
    } catch (error) {
      console.warn(`Primary model failed, falling back: ${error.message}`);
      return {
        result: await this.handlers.gemini.processSimpleTask(task, context),
        model: 'gemini-flash-fallback'
      };
    }
  }
}

/**
 * AI Orchestration Service
 * Responsible for routing requests to the appropriate AI model based on task complexity
 */
class AIOrchestrationService {
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
    
    // Initialize analyzer and router
    this.analyzer = new TaskAnalyzer();
    this.router = new TaskRouter(this._getHandlers(), this.thresholds);
  }
  
  _getHandlers() {
    return {
      claude: this.claudeHandler,
      gemini: this.geminiHandler,
      deepseek: this.deepseekHandler
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
    let analysis = null;
    
    try {
      // Check for special document creation task
      if (task.action === 'create_document') {
        return await this._handleDocumentCreation(task, context);
      }
      
      // Get comprehensive task analysis
      analysis = await this.analyzer.analyzeTask(task);
      task.complexity = analysis.complexity;
      console.log(`Task analysis complete: complexity=${analysis.complexity}, reasoning=${analysis.reasoningType}`);
      
      // Dynamic threshold application
      const thresholds = this.getDynamicThresholds(context);
      this.router.thresholds = thresholds;
      
      // Model selection with fallback
      const result = await this.router.routeWithFallback(task, analysis, context);
      modelUsed = result.model;
      
      return result.result;
    } catch (error) {
      console.error('Error in AI orchestration:', error);
      throw this._handleOrchestrationError(error, analysis);
    } finally {
      // Log performance metrics
      this.logTaskMetrics({
        taskId: task.id || 'unknown',
        duration: Date.now() - startTime,
        model: modelUsed,
        complexity: task.complexity,
        reasoningType: analysis?.reasoningType || 'unknown'
      });
    }
  }
  
  _handleOrchestrationError(error, analysis) {
    const enhancedError = new Error(`AI orchestration failed: ${error.message}`);
    enhancedError.metadata = {
      timestamp: new Date().toISOString(),
      analysis,
      stack: error.stack
    };
    return enhancedError;
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
   * Log task metrics for monitoring
   * @param {Object} metrics - Metrics data
   */
  logTaskMetrics(metrics) {
    console.log('AI Task Metrics:', JSON.stringify(metrics));
    // In a production environment, this would send to a monitoring service
  }
  
  /**
   * Handle document creation tasks
   * @param {Object} task - Document creation task
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Created document info
   */
  async _handleDocumentCreation(task, context = {}) {
    console.log('Handling document creation task');
    
    // Validate required fields
    if (!task.title || !task.content) {
      throw new Error('Document creation requires title and content');
    }
    
    // Get Google Drive service
    const driveService = require('../utils/googleDriveService');
    
    // Create the document
    const document = await driveService.createDocument(
      task.title,
      task.content,
      context.folder || null
    );
    
    return {
      success: true,
      document,
      model: 'document-creation-service'
    };
  }
}

module.exports = new AIOrchestrationService();
