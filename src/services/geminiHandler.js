const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Gemini AI Handler Service
 * Handles interactions with Google's Gemini API
 */
class GeminiHandler {
  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY;
    this.genAI = new GoogleGenerativeAI(this.apiKey);
    
    // Model configurations
    this.models = {
      flash: {
        id: 'gemini-1.5-flash',
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      },
      pro: {
        id: 'gemini-1.5-pro',
        temperature: 0.7,
        topK: 40,
        topP: 0.95
      }
    };
  }

  /**
   * Process a task using Gemini Pro
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @returns {Promise<Object>} - The processed result
   */
  async processTask(task, context = {}) {
    return await this.callGeminiAPI(task, context, this.models.pro);
  }

  /**
   * Process a simple task using Gemini Flash
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @returns {Promise<Object>} - The processed result
   */
  async processSimpleTask(task, context = {}) {
    return await this.callGeminiAPI(task, context, this.models.flash);
  }

  /**
   * Call the Gemini API
   * @param {Object} task - The task to process
   * @param {Object} context - Additional context for the task
   * @param {Object} model - Model configuration to use
   * @returns {Promise<Object>} - The API response
   */
  async callGeminiAPI(task, context, model) {
    try {
      const geminiModel = this.genAI.getGenerativeModel({
        model: model.id,
        generationConfig: {
          temperature: model.temperature,
          topK: model.topK,
          topP: model.topP
        }
      });

      const prompt = this.buildPrompt(task, context);
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;

      return this.parseResponse(response, model.id);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  /**
   * Build prompt for Gemini API
   * @param {Object} task - Task to process
   * @param {Object} context - Additional context
   * @returns {String} - Formatted prompt
   */
  buildPrompt(task, context) {
    let prompt = '';
    
    // Add context if available
    if (context.role) {
      prompt += `You are an AI assistant specialized in ${context.role}.\n\n`;
    }
    
    if (context.guidelines) {
      prompt += `${context.guidelines}\n\n`;
    }
    
    // Add task content
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
   * Parse the Gemini API response
   * @param {Object} response - API response
   * @param {String} modelId - Model ID used
   * @returns {Object} - Parsed response
   */
  parseResponse(response, modelId) {
    return {
      content: response.text(),
      model: modelId,
      type: 'gemini'
    };
  }
}

module.exports = GeminiHandler;
