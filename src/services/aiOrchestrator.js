const ClaudeHandler = require('./claudeHandler');
const GeminiHandler = require('./geminiHandler');
const ComplexityScorer = require('./complexityScorer');
const ReasoningAnalyzer = require('./reasoningAnalyzer');
const ChatSession = require('./chatSession');
const TaskDetector = require('./taskDetector');

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
    this.taskDetector = new TaskDetector();
    
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
   * Process chat message with history
   * @param {String} userId - User identifier
   * @param {String} sessionId - Chat session identifier (optional)
   * @param {String} message - User message
   * @param {Array} attachments - Optional file attachments
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Response and session ID
   */
  async processChatMessage(userId, sessionId, message, attachments = [], options = {}) {
    try {
      const session = new ChatSession(userId, sessionId);
      await session.initialize();
      
      // Add user message to history
      await session.addMessage('user', message);
      
      // Get contextual prompt with attachment info if present
      let contextualPrompt = message;
      if (attachments && attachments.length > 0) {
        contextualPrompt += `\n\n[User has attached ${attachments.length} file(s): ${
          attachments.map(a => a.name).join(', ')
        }]`;
      }
      
      // Detect if this is a task-oriented message
      const taskDetection = await this.taskDetector.detectTaskIntent(message);
      
      let response;
      
      // Handle as task if detected or explicitly specified
      if (taskDetection.isTask || options.taskMode) {
        console.log('Task detected in chat message, processing as task');
        
        // Create task object with context from chat history
        const taskContext = {
          chatHistory: await session.getCompactHistory(),
          attachments,
          ...options
        };
        
        const taskParameters = taskDetection.parameters || { content: message };
        
        try {
          // Process as a task with chat context
          const taskResult = await this.processTask(taskParameters, taskContext);
          
          // Format the task result for chat display
          response = this.formatTaskResponse(taskResult, taskDetection.type);
          
          // Add system message about task execution (optional)
          await session.addMessage('system', `Task executed: ${taskDetection.type || 'general'}`);
        } catch (error) {
          console.error('Task processing error:', error);
          response = `I encountered an error while processing your task: ${error.message}`;
        }
      } else {
        // Process as normal conversational message
        const fullPrompt = await session.getContextualPrompt(contextualPrompt);
        
        try {
          response = await this.processTask(fullPrompt);
        } catch (error) {
          console.error('AI processing error:', error);
          response = "I'm sorry, I encountered an error processing your request. Please try again or rephrase your question.";
        }
      }
      
      // Add AI response to history
      await session.addMessage('assistant', response);
      
      return { 
        response, 
        sessionId: session.sessionId,
        wasTask: taskDetection.isTask || options.taskMode
      };
    } catch (error) {
      console.error('Chat message processing error:', error);
      throw new Error(`Failed to process chat message: ${error.message}`);
    }
  }
  
  /**
   * Format task response for chat display
   * @param {Object} taskResult - The result from processTask
   * @param {String} taskType - The type of task that was executed
   * @returns {String} - Formatted response for chat
   */
  formatTaskResponse(taskResult, taskType = 'general') {
    // If result is already a string, return it
    if (typeof taskResult === 'string') {
      return taskResult;
    }
    
    // Format based on task type
    if (taskType === 'document_creation' && taskResult.document) {
      return `✅ Document created successfully: "${taskResult.document.title}"\n\nYou can access it here: ${taskResult.document.url}`;
    }
    
    if (taskResult.content) {
      return taskResult.content;
    }
    
    // Default formatting for other task types
    return `Task completed successfully.\n\nResult: ${JSON.stringify(taskResult, null, 2)}`;
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
