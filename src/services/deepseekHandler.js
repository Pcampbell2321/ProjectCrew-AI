const axios = require('axios');
const aiModels = require('../config/aiModels');

/**
 * DeepSeek AI Handler Service for Projectcrew AI
 * Handles interactions with DeepSeek API for reasoning-focused tasks
 */
class DeepseekHandler {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = aiModels.deepseek.r1;
  }

  /**
   * Process a reasoning-focused task
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @returns {Promise<Object>} - The processed result
   */
  async processReasoningTask(task, context = {}) {
    // Validate task input
    if (!task || typeof task !== 'object') {
      throw new Error('Invalid task format - expected object');
    }

    // Ensure context has required history format
    const safeContext = {
      chatHistory: Array.isArray(context.chatHistory) 
        ? context.chatHistory 
        : [],
      ...context
    };

    try {
      // Include chat history in context if available
      if (safeContext.chatHistory && safeContext.chatHistory.length > 0) {
        console.log('Including chat history in reasoning task');
      }
      
      const prompt = this.buildReasoningPrompt(task, safeContext);
      const response = await this.callDeepseekAPI(prompt, safeContext);
      
      return this._formatDeepseekResponse(response, safeContext);
    } catch (error) {
      console.error('[ProjectCrew AI] DeepSeek Failed:', {
        task: this._redactSensitive(task),
        context: this._redactSensitive(safeContext)
      });
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }

  /**
   * Format DeepSeek response for unified interface
   * @param {Object} response - The raw API response
   * @param {Object} context - The context used for the request
   * @returns {Object} - Formatted response
   * @private
   */
  _formatDeepseekResponse(response, context) {
    return {
      content: response.content || 'No response content',
      model: this.model.id,
      type: 'reasoning',
      reasoning: response.reasoning || null,
      taskContext: context.chatHistory.length > 0 ? 'chat_integrated' : 'standalone',
      displayFormat: 'reasoning',
      steps: response.reasoning ? this.formatReasoningSteps(response.reasoning) : null,
      metadata: {
        model: this.model.id,
        reasoningType: 'stepwise',
        displayType: 'enhanced',
        contextType: context.chatHistory.length > 0 ? 'chat' : 'direct',
        modelVersion: this.model.version || '1.0'
      }
    };
  }

  /**
   * Redact sensitive information from logs
   * @param {Object} data - The data to redact
   * @returns {Object} - Redacted data
   * @private
   */
  _redactSensitive(data) {
    const sensitiveKeys = ['apiKey', 'password', 'token'];
    return JSON.parse(JSON.stringify(data, (key, value) => {
      return sensitiveKeys.includes(key) ? '***REDACTED***' : value;
    }));
  }

  /**
   * Build a reasoning-focused prompt
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context
   * @returns {String} - Formatted prompt
   */
  buildReasoningPrompt(task, context) {
    let prompt = '';
    
    // Add system instructions for reasoning
    prompt += 'You are an AI assistant specialized in step-by-step reasoning. ';
    prompt += 'For each problem, explain your thought process clearly, ';
    prompt += 'considering multiple perspectives before arriving at a conclusion.\n\n';
    
    // Add context if available
    if (context.role) {
      prompt += `Role: ${context.role}\n\n`;
    }
    
    if (context.guidelines) {
      prompt += `Guidelines: ${context.guidelines}\n\n`;
    }
    
    // Include chat history context if available
    if (context.chatHistory && Array.isArray(context.chatHistory)) {
      prompt += 'Previous conversation context:\n';
      prompt += context.chatHistory
        .map(msg => `${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`)
        .join('\n');
      prompt += '\n\n';
    }
    
    // Add task content
    prompt += 'Problem to solve:\n';
    if (typeof task === 'string') {
      prompt += task;
    } else if (task.content) {
      if (typeof task.content === 'string') {
        prompt += task.content;
      } else if (Array.isArray(task.content)) {
        prompt += task.content
          .filter(item => item.type === 'text')
          .map(item => item.text)
          .join('\n');
      }
    } else {
      prompt += JSON.stringify(task);
    }
    
    return prompt;
  }

  /**
   * Call the DeepSeek API
   * @param {String} prompt - The prompt to send
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - The API response
   */
  async callDeepseekAPI(prompt, context) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model.id,
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant specialized in reasoning and problem-solving.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: context.temperature || this.model.temperature,
          max_tokens: context.maxTokens || this.model.maxTokens,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      // Parse the response
      const result = response.data.choices[0].message.content;
      let parsedResult;
      
      try {
        parsedResult = JSON.parse(result);
      } catch (e) {
        // If not valid JSON, return as plain text
        return { content: result };
      }
      
      return {
        content: parsedResult.answer || parsedResult.content || result,
        reasoning: parsedResult.reasoning || parsedResult.steps || null
      };
    } catch (error) {
      console.error('[ProjectCrew AI] Error calling DeepSeek API:', error);
      if (error.response) {
        console.error('[ProjectCrew AI] Response status:', error.response.status);
        console.error('[ProjectCrew AI] Response data:', error.response.data);
      }
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }
  /**
   * Format reasoning steps for display
   * @param {String|Array} reasoning - Reasoning steps from the model
   * @returns {Array} - Formatted steps for display
   */
  formatReasoningSteps(reasoning) {
    if (Array.isArray(reasoning)) {
      return reasoning.map((step, index) => ({
        step: index + 1,
        content: step
      }));
    }
    
    // If it's a string, try to split by numbered steps or paragraphs
    if (typeof reasoning === 'string') {
      // Check if it has numbered steps like "1.", "2.", etc.
      if (/\d+\.\s/.test(reasoning)) {
        return reasoning
          .split(/(?=\d+\.\s)/)
          .filter(step => step.trim())
          .map((step, index) => ({
            step: index + 1,
            content: step.trim()
          }));
      }
      
      // Otherwise split by paragraphs
      return reasoning
        .split(/\n\n+/)
        .filter(para => para.trim())
        .map((para, index) => ({
          step: index + 1,
          content: para.trim()
        }));
    }
    
    return [{ step: 1, content: reasoning.toString() }];
  }
}

module.exports = DeepseekHandler;
