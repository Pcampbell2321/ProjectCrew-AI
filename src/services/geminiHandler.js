const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

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
    // Check if we have chat history in context
    if (context.history && Array.isArray(context.history)) {
      context.chatHistory = context.history;
    }
    
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
    const MAX_RETRIES = 3;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        const geminiModel = this.genAI.getGenerativeModel({
          model: model.id,
          safetySettings: this.getSafetySettings(context),
          generationConfig: {
            temperature: model.temperature,
            topK: model.topK,
            topP: model.topP,
            maxOutputTokens: this.calculateTokenBudget(task)
          }
        });

        const prompt = this.buildPrompt(task, context);
        const result = await geminiModel.generateContent(prompt);
        const response = result.response;

        return this.parseResponse(response, model.id);
      } catch (error) {
        if (this.isRetryableError(error) && attempt < MAX_RETRIES - 1) {
          attempt++;
          console.log(`Retrying Gemini API call (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        console.error('Error calling Gemini API:', error);
        throw new Error(`Gemini API error: ${error.message}`);
      }
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
    
    // Add chat history if available
    if (context.chatHistory && Array.isArray(context.chatHistory)) {
      prompt += "Previous conversation:\n";
      context.chatHistory.forEach(message => {
        prompt += `${message.role}: ${message.content}\n`;
      });
      prompt += "\n";
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

  /**
   * Calculate token budget based on task complexity
   * @param {Object} task - The task to process
   * @returns {Number} - Token budget
   */
  calculateTokenBudget(task) {
    const baseTokens = 2048;
    const complexityBonus = task.complexity ? Math.floor(task.complexity / 100 * 1024) : 0;
    return baseTokens + complexityBonus;
  }

  /**
   * Get safety settings based on context
   * @param {Object} context - Additional context
   * @returns {Object} - Safety settings
   */
  getSafetySettings(context) {
    return [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: context.sensitive ? HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE 
                   : HarmBlockThreshold.BLOCK_ONLY_HIGH
      }
    ];
  }

  /**
   * Check if error is retryable
   * @param {Error} error - The error to check
   * @returns {Boolean} - Whether the error is retryable
   */
  isRetryableError(error) {
    return error.code === 503 || 
      (error.message && error.message.includes('quota')) ||
      error.code === 429;
  }
}

module.exports = GeminiHandler;
