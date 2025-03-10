const axios = require('axios');
const aiModels = require('../config/aiModels');

/**
 * DeepSeek AI Handler Service
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
    try {
      // Include chat history in context if available
      if (context.chatHistory) {
        console.log('Including chat history in reasoning task');
      }
      
      const prompt = this.buildReasoningPrompt(task, context);
      const response = await this.callDeepseekAPI(prompt, context);
      
      return {
        content: response.content,
        model: this.model.id,
        type: 'deepseek',
        reasoning: response.reasoning || null,
        taskContext: context.chatHistory ? 'chat_integrated' : 'standalone'
      };
    } catch (error) {
      console.error('Error in DeepSeek reasoning task:', error);
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
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
      console.error('Error calling DeepSeek API:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }
}

module.exports = DeepseekHandler;
