/**
 * AI Model Configuration
 * Central configuration for all AI models used in the application
 */

module.exports = {
  // Google Gemini models
  gemini: {
    flash: {
      id: 'gemini-1.5-flash',
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxTokens: 2048,
      costPer1KTokens: 0.0001,
      capabilities: ['code-generation', 'summarization', 'classification']
    },
    pro: {
      id: 'gemini-1.5-pro',
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxTokens: 8192,
      costPer1KTokens: 0.0005,
      capabilities: ['code-generation', 'summarization', 'classification', 'analysis']
    }
  },
  
  // Anthropic Claude models
  claude: {
    haiku: {
      id: 'claude-3-5-haiku-20241022',
      temperature: 0.7,
      maxTokens: 4096,
      costPer1KTokens: 0.00025,
      capabilities: ['code-generation', 'summarization', 'classification', 'analysis']
    },
    sonnet: {
      id: 'claude-3-sonnet-20240229',
      temperature: 0.7,
      maxTokens: 16384,
      costPer1KTokens: 0.003,
      capabilities: ['code-generation', 'summarization', 'classification', 'analysis', 'reasoning']
    },
    opus: {
      id: 'claude-3-opus-20240229',
      temperature: 0.7,
      maxTokens: 32768,
      costPer1KTokens: 0.015,
      capabilities: ['code-generation', 'summarization', 'classification', 'analysis', 'reasoning', 'complex-tasks']
    }
  },
  
  // DeepSeek models
  deepseek: {
    r1: {
      id: 'deepseek-coder-v2',
      temperature: 0.5,
      maxTokens: 16384,
      costPer1KTokens: 0.002,
      capabilities: ['code-generation', 'reasoning', 'analysis']
    }
  },
  
  // Model selection thresholds
  thresholds: {
    default: {
      simple: 30,    // 0-30: Use Gemini Flash
      medium: 60,    // 31-60: Use Gemini Pro
      complex: 85    // 61-85: Use Claude Sonnet, 86+: Use Claude Opus
    },
    highPriority: {
      simple: 20,    // More aggressive use of powerful models
      medium: 50,
      complex: 75
    },
    lowCost: {
      simple: 40,    // More conservative use of powerful models
      medium: 70,
      complex: 90
    }
  }
};
