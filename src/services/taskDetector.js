/**
 * Task Detector Service
 * Responsible for detecting task-oriented messages and extracting parameters
 */
class TaskDetector {
  constructor() {
    // Task patterns to detect
    this.taskPatterns = [
      {
        type: 'document_creation',
        regex: /^(?:create|make|generate)\s+(?:a|new)\s+document(?:\s+(?:titled|called|named)\s+["'](.+?)["'])?/i,
        extractParams: (message, matches) => ({
          action: 'create_document',
          title: matches[1] || 'Untitled Document',
          content: this._extractContentAfterTitle(message, matches[1])
        })
      },
      {
        type: 'data_analysis',
        regex: /^(?:analyze|examine|study)\s+(?:this|the|my|following)\s+data/i,
        extractParams: (message) => ({
          action: 'analyze_data',
          content: message
        })
      },
      {
        type: 'command',
        regex: /^\/(\w+)(?:\s+(.+))?$/,
        extractParams: (message, matches) => ({
          action: matches[1],
          parameters: matches[2] ? matches[2].split(' ') : []
        })
      }
    ];
  }

  /**
   * Detect if a message contains a task intent
   * @param {String} message - User message
   * @returns {Promise<Object>} - Detection result with parameters if found
   */
  async detectTaskIntent(message) {
    // Default result
    const result = {
      isTask: false,
      type: null,
      parameters: null
    };
    
    // Check for explicit task markers
    if (message.includes('<<TASK>>') || message.startsWith('/task')) {
      result.isTask = true;
      result.type = 'explicit';
      result.parameters = { content: message.replace('<<TASK>>', '').replace('/task', '').trim() };
      return result;
    }
    
    // Check against task patterns
    for (const pattern of this.taskPatterns) {
      const matches = message.match(pattern.regex);
      if (matches) {
        result.isTask = true;
        result.type = pattern.type;
        result.parameters = pattern.extractParams(message, matches);
        break;
      }
    }
    
    return result;
  }
  
  /**
   * Extract content after a title in a document creation message
   * @param {String} message - Full message
   * @param {String} title - Document title
   * @returns {String} - Content for the document
   */
  _extractContentAfterTitle(message, title) {
    if (!title) return message;
    
    // Find content after the title
    const titlePattern = new RegExp(`["']${title}["']\\s*(?:with|containing|that says)?\\s*(?:content|text)?\\s*:?\\s*(.+)`, 'is');
    const contentMatch = message.match(titlePattern);
    
    if (contentMatch && contentMatch[1]) {
      return contentMatch[1].trim();
    }
    
    // If no specific content found, use everything after the title mention
    const titleIndex = message.indexOf(title);
    if (titleIndex > -1) {
      return message.substring(titleIndex + title.length).replace(/^[^\w]+/, '').trim();
    }
    
    return 'No content specified';
  }
}

module.exports = TaskDetector;
