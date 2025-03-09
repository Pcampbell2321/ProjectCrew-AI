const axios = require('axios');

/**
 * Claude AI Handler Service
 * Handles interactions with Anthropic's Claude API
 */
class ClaudeHandler {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.apiVersion = '2023-06-01';
    this.baseURL = 'https://api.anthropic.com/v1';
    
    // Model configurations
    this.models = {
      haiku: {
        id: 'claude-3-haiku-20240307',
        maxTokens: 4000,
        temperature: 0.7
      },
      sonnet: {
        id: 'claude-3-sonnet-20240229',
        maxTokens: 12000,
        temperature: 0.7
      },
      opus: {
        id: 'claude-3-opus-20240229',
        maxTokens: 24000,
        temperature: 0.7
      }
    };
  }

  /**
   * Process a task using the appropriate Claude model based on complexity
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @returns {Promise<Object>} - The processed result
   */
  async processTask(task, context = {}) {
    // Select model based on complexity
    const complexity = task.complexity || 50;
    const model = this.selectModel(complexity);
    
    return await this.callClaudeAPI(task, context, model);
  }

  /**
   * Process a complex task using Claude Opus
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @returns {Promise<Object>} - The processed result
   */
  async processComplexTask(task, context = {}) {
    return await this.callClaudeAPI(task, context, this.models.opus);
  }

  /**
   * Select the appropriate Claude model based on task complexity
   * @param {Number} complexity - Task complexity score (0-100)
   * @returns {Object} - Selected model configuration
   */
  selectModel(complexity) {
    if (complexity > 75) {
      return this.models.opus;
    } else if (complexity > 50) {
      return this.models.sonnet;
    } else {
      return this.models.haiku;
    }
  }

  /**
   * Call the Claude API
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @param {Object} model - Model configuration to use
   * @returns {Promise<Object>} - The API response
   */
  async callClaudeAPI(task, context, model) {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const userContent = this.formatContent(task);
      
      const payload = {
        model: model.id,
        max_tokens: model.maxTokens,
        temperature: model.temperature,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: userContent
        }]
      };

      const response = await axios.post(`${this.baseURL}/messages`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion
        }
      });

      return this.parseResponse(response.data);
    } catch (error) {
      console.error('Error calling Claude API:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`Claude API error: ${error.message}`);
    }
  }

  /**
   * Build system prompt based on context
   * @param {Object} context - Context information
   * @returns {String} - System prompt
   */
  buildSystemPrompt(context) {
    let systemPrompt = "You are a helpful AI assistant.";
    
    if (context.role) {
      systemPrompt = `You are an AI assistant specialized in ${context.role}.`;
    }
    
    if (context.guidelines) {
      systemPrompt += ` ${context.guidelines}`;
    }
    
    return systemPrompt;
  }

  /**
   * Format content for Claude API
   * @param {Object|String} task - Task to format
   * @returns {Array} - Formatted content array
   */
  formatContent(task) {
    if (typeof task === 'string') {
      return [{ type: "text", text: task }];
    }
    
    if (task.content) {
      if (typeof task.content === 'string') {
        return [{ type: "text", text: task.content }];
      }
      if (Array.isArray(task.content)) {
        return task.content;
      }
    }
    
    return [{ type: "text", text: JSON.stringify(task) }];
  }

  /**
   * Parse the Claude API response
   * @param {Object} response - API response
   * @returns {Object} - Parsed response
   */
  parseResponse(response) {
    return {
      content: response.content,
      model: response.model,
      usage: response.usage,
      id: response.id,
      type: 'claude'
    };
  }
}

module.exports = ClaudeHandler;
