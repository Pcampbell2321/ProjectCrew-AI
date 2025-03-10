/**
 * Task detection and processing utilities
 */

/**
 * Detect if a message contains a task intent
 * @param {String} message - User message to analyze
 * @returns {Object} - Detection result with isTask flag and metadata
 */
async function detectTaskIntent(message) {
  // Check for explicit command syntax
  if (message.startsWith('/')) {
    const commandMatch = message.match(/^\/([a-z-]+)(?:\s+(.*))?$/i);
    if (commandMatch) {
      const [, command, args] = commandMatch;
      return {
        isTask: true,
        type: command.toLowerCase(),
        parameters: parseTaskParameters(args || '', command)
      };
    }
  }
  
  // Check for task markup
  if (message.includes('<<TASK>>') || message.includes('[[TASK]]')) {
    const taskMatch = message.match(/<<TASK:([a-z_]+)>>|<<TASK>>|[[TASK:([a-z_]+)]]|[[TASK]]/i);
    const taskType = taskMatch?.[1] || taskMatch?.[2] || 'general';
    return {
      isTask: true,
      type: taskType.toLowerCase(),
      parameters: { content: message.replace(/<<TASK:[a-z_]+>>|<<TASK>>|[[TASK:[a-z_]+]]|[[TASK]]/gi, '').trim() }
    };
  }
  
  // Check for common task patterns
  const taskPatterns = [
    { regex: /create\s+(?:a\s+)?document\s+(?:titled|called|named)\s+["'](.+?)["']/i, type: 'document_creation' },
    { regex: /analyze\s+(?:this\s+)?data/i, type: 'data_analysis' },
    { regex: /solve\s+(?:this\s+)?problem/i, type: 'reasoning' },
    { regex: /explain\s+step\s+by\s+step/i, type: 'reasoning' }
  ];
  
  for (const pattern of taskPatterns) {
    if (pattern.regex.test(message)) {
      return {
        isTask: true,
        type: pattern.type,
        parameters: { content: message }
      };
    }
  }
  
  // Not detected as a task
  return {
    isTask: false,
    type: null,
    parameters: null
  };
}

/**
 * Parse task parameters from command arguments
 * @param {String} args - Command arguments string
 * @param {String} command - The command type
 * @returns {Object} - Parsed parameters
 */
function parseTaskParameters(args, command) {
  // Default parameters
  const params = { content: args };
  
  // Handle specific command types
  switch (command) {
    case 'create-document':
    case 'document':
      // Parse title and content
      const titleMatch = args.match(/Title:\s*["'](.+?)["']/i);
      const contentMatch = args.match(/Content:\s*["'](.+?)["']/i);
      
      if (titleMatch) {
        params.title = titleMatch[1];
      }
      
      if (contentMatch) {
        params.content = contentMatch[1];
      } else if (titleMatch) {
        // If we have a title but no explicit content, use the rest as content
        params.content = args.replace(/Title:\s*["'].+?["']/i, '').trim();
      }
      break;
      
    case 'analyze':
    case 'data-analysis':
      // Check for dataset reference
      const datasetMatch = args.match(/dataset:\s*["'](.+?)["']/i);
      if (datasetMatch) {
        params.dataset = datasetMatch[1];
      }
      break;
      
    case 'reason':
    case 'reasoning':
      // Check for specific reasoning type
      const typeMatch = args.match(/type:\s*["'](.+?)["']/i);
      if (typeMatch) {
        params.reasoningType = typeMatch[1];
      }
      break;
  }
  
  return params;
}

module.exports = {
  detectTaskIntent,
  parseTaskParameters
};
