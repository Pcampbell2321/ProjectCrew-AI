const ProjectUnderstandingAgent = require('./projectUnderstandingAgent');
const CodeGenerationAgent = require('./codeGenerationAgent');
const CodeReviewAgent = require('./codeReviewAgent');
const DocumentationAgent = require('./documentationAgent');
const MeetingActionItemAgent = require('./meetingActionItemAgent');
const PlanningAgent = require('./planningAgent');
const CodeSearchAgent = require('./codeSearchAgent');

class OrchestratorAgent {
  constructor(apiKeys) {
    this.apiKeys = apiKeys;
    this.agents = {
      projectUnderstanding: new ProjectUnderstandingAgent(apiKeys.google),
      codeGeneration: new CodeGenerationAgent(apiKeys.anthropic),
      codeReview: new CodeReviewAgent(apiKeys.anthropic),
      documentation: new DocumentationAgent(apiKeys.anthropic),
      meetingActions: new MeetingActionItemAgent(apiKeys.anthropic),
      planning: new PlanningAgent(apiKeys.anthropic),
      codeSearch: new CodeSearchAgent(apiKeys.anthropic)
    };
    
    this.agentCapabilities = {
      projectUnderstanding: ['analyze', 'process-document', 'extract-requirements'],
      codeGeneration: ['generate-code', 'improve-code'],
      codeReview: ['review-code', 'suggest-improvements'],
      documentation: ['update-docs', 'generate-docs'],
      meetingActions: ['extract-action-items', 'summarize-meeting'],
      planning: ['generate-tasks', 'create-plan'],
      codeSearch: ['search-code', 'explain-code']
    };
    
    this.performanceMetrics = new Map();
  }

  async routeRequest(userInput, context = {}) {
    console.log('Orchestrator routing request:', userInput.substring(0, 100) + '...');
    const startTime = Date.now();
    
    try {
      // First determine the request type using a classifier
      const requestType = await this.classifyRequest(userInput);
      console.log('Request classified as:', requestType);
      
      // Get the appropriate agent and method
      const { agent, method } = this.selectAgent(requestType);
      console.log('Selected agent:', agent.constructor.name, 'with method:', method);
      
      // Process with the selected agent
      const result = await this.executeAgentMethod(agent, method, userInput, context);
      
      // Track performance
      this.trackAgentPerformance(agent.constructor.name, method, startTime);
      
      // Format and return the response
      return this.formatResponse(result, agent.constructor.name, method);
    } catch (error) {
      console.error('Orchestration error:', error);
      return this.handleError(error);
    }
  }

  async classifyRequest(input) {
    // Use a simple rule-based classifier - could be enhanced with ML model
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('generate code') || lowerInput.includes('write code') || 
        lowerInput.includes('create function') || lowerInput.includes('implement')) {
      return 'code-generation';
    } else if (lowerInput.includes('review code') || lowerInput.includes('check code') || 
               lowerInput.includes('improve code') || lowerInput.includes('fix code')) {
      return 'code-review'; 
    } else if (lowerInput.includes('meeting') || lowerInput.includes('action items') || 
               lowerInput.includes('minutes') || lowerInput.includes('summary')) {
      return 'meeting-actions';
    } else if (lowerInput.includes('document') || lowerInput.includes('documentation') || 
               lowerInput.includes('wiki') || lowerInput.includes('guide')) {
      return 'documentation';
    } else if (lowerInput.includes('plan') || lowerInput.includes('sprint') || 
               lowerInput.includes('task') || lowerInput.includes('schedule')) {
      return 'planning';
    } else if (lowerInput.includes('search code') || lowerInput.includes('find code') || 
               lowerInput.includes('explain code') || lowerInput.includes('how does code')) {
      return 'code-search';
    }
    
    // Default to project understanding
    return 'project-understanding';
  }

  selectAgent(requestType) {
    const agentMap = {
      'code-generation': { agent: this.agents.codeGeneration, method: 'generateCode' },
      'code-improvement': { agent: this.agents.codeGeneration, method: 'improveCode' },
      'code-review': { agent: this.agents.codeReview, method: 'reviewCode' },
      'code-suggestions': { agent: this.agents.codeReview, method: 'suggestImprovements' },
      'meeting-actions': { agent: this.agents.meetingActions, method: 'extractActionItems' },
      'meeting-summary': { agent: this.agents.meetingActions, method: 'summarizeMeeting' },
      'documentation-update': { agent: this.agents.documentation, method: 'updateDocument' },
      'documentation-generate': { agent: this.agents.documentation, method: 'generateDocumentation' },
      'planning': { agent: this.agents.planning, method: 'generateTasks' },
      'code-search': { agent: this.agents.codeSearch, method: 'searchCode' },
      'code-explain': { agent: this.agents.codeSearch, method: 'explainCode' },
      'project-understanding': { agent: this.agents.projectUnderstanding, method: 'processDocument' }
    };

    return agentMap[requestType] || { 
      agent: this.agents.projectUnderstanding,
      method: 'processDocument'
    };
  }

  async executeAgentMethod(agent, method, input, context) {
    // Extract code if needed for code-related operations
    if (method.includes('Code') || method.includes('code')) {
      const codeMatch = input.match(/```[\w]*\n([\s\S]*?)\n```/);
      if (codeMatch) {
        // If code block is found, use it as the primary input
        const code = codeMatch[1];
        const language = this.detectLanguage(input) || 'javascript';
        
        // For code review or explanation, we need both the code and requirements
        if (method === 'reviewCode') {
          const requirements = input.replace(codeMatch[0], '').trim();
          return await agent[method](code, language, requirements);
        } else if (method === 'explainCode') {
          return await agent[method](code, language, context);
        } else if (method === 'improveCode') {
          const requirements = input.replace(codeMatch[0], '').trim();
          return await agent[method](code, requirements);
        }
      }
    }
    
    // For meeting-related operations
    if (method.includes('Meeting') || method.includes('meeting')) {
      return await agent[method](input, context);
    }
    
    // For documentation operations
    if (method === 'updateDocument') {
      // Extract the document and changes from the input
      // This is a simplified approach - in production you'd need more robust parsing
      const parts = input.split(/(?:update|change|modify)\s+with\s+/i);
      if (parts.length > 1) {
        const document = parts[0].trim();
        const changes = parts[1].trim();
        return await agent[method](document, changes, context);
      }
    }
    
    // For documentation generation
    if (method === 'generateDocumentation') {
      const format = context.format || 'markdown';
      return await agent[method](input, context, format);
    }
    
    // Default handling for other methods
    return await agent[method](input, context);
  }

  detectLanguage(input) {
    // Simple language detection from code blocks
    const languageMatch = input.match(/```(\w+)/);
    if (languageMatch && languageMatch[1]) {
      const lang = languageMatch[1].toLowerCase();
      if (lang !== 'json' && lang !== 'xml') {
        return lang;
      }
    }
    
    // Try to detect from content
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('javascript') || lowerInput.includes('js')) {
      return 'javascript';
    } else if (lowerInput.includes('python') || lowerInput.includes('py')) {
      return 'python';
    } else if (lowerInput.includes('java')) {
      return 'java';
    } else if (lowerInput.includes('deluge')) {
      return 'deluge';
    }
    
    return null;
  }

  trackAgentPerformance(agentName, operation, startTime) {
    const duration = Date.now() - startTime;
    const key = `${agentName}-${operation}`;
    
    if (!this.performanceMetrics.has(key)) {
      this.performanceMetrics.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        lastUsed: new Date()
      });
    }
    
    const metrics = this.performanceMetrics.get(key);
    metrics.count += 1;
    metrics.totalDuration += duration;
    metrics.avgDuration = metrics.totalDuration / metrics.count;
    metrics.lastUsed = new Date();
    
    console.log(`Agent performance - ${key}: ${duration}ms (avg: ${metrics.avgDuration.toFixed(2)}ms)`);
  }

  formatResponse(result, agentName, method) {
    return {
      success: true,
      agent: agentName,
      operation: method,
      timestamp: new Date().toISOString(),
      result: result,
      formattedResponse: this.formatForChat(result, agentName, method)
    };
  }

  formatForChat(result, agentName, method) {
    // Format the result based on the agent type
    const formatters = {
      'ProjectUnderstandingAgent': (result) => {
        return `## Project Analysis\n\n` +
               `**Goals:** ${this.formatList(result.goals)}\n\n` +
               `**Requirements:** ${this.formatList(result.requirements)}\n\n` +
               `**Milestones:** ${this.formatList(result.milestones)}\n\n` +
               `**Stakeholders:** ${this.formatList(result.stakeholders)}\n\n` +
               `**Risks:** ${this.formatList(result.risks)}`;
      },
      'CodeGenerationAgent': (result, method) => {
        if (method === 'generateCode') {
          return `## Generated Code\n\n` +
                 `\`\`\`${result.code ? 'deluge' : ''}\n${result.code || ''}\n\`\`\`\n\n` +
                 `**Explanation:** ${result.explanation}\n\n` +
                 `**Usage Instructions:** ${result.usage_instructions}\n\n` +
                 `**Assumptions:** ${this.formatList(result.assumptions)}\n\n` +
                 `**Potential Improvements:** ${this.formatList(result.potential_improvements)}`;
        } else {
          return `## Improved Code\n\n` +
                 `\`\`\`${result.improved_code ? 'deluge' : ''}\n${result.improved_code || ''}\n\`\`\`\n\n` +
                 `**Changes Made:** ${this.formatList(result.changes_made)}\n\n` +
                 `**Explanation:** ${result.explanation}\n\n` +
                 `**Additional Recommendations:** ${this.formatList(result.additional_recommendations)}`;
        }
      },
      'CodeReviewAgent': (result, method) => {
        if (method === 'reviewCode') {
          return `## Code Review\n\n` +
                 `**Overall Assessment:** ${result.overall_assessment}\n` +
                 `**Quality Score:** ${result.quality_score}/10\n\n` +
                 `### Issues\n${this.formatIssues(result.issues)}\n\n` +
                 `### Strengths\n${this.formatList(result.strengths)}\n\n` +
                 `### Improvement Suggestions\n${this.formatList(result.improvement_suggestions)}`;
        } else {
          return `## Code Improvement Suggestions\n\n` +
                 `### Refactoring Opportunities\n${this.formatRefactoring(result.refactoring)}\n\n` +
                 `### Optimizations\n${this.formatList(result.optimizations)}\n\n` +
                 `### Design Patterns\n${this.formatList(result.design_patterns)}\n\n` +
                 `### Modern Features\n${this.formatList(result.modern_features)}\n\n` +
                 `### Error Handling\n${this.formatList(result.error_handling)}`;
        }
      },
      'DocumentationAgent': (result, method) => {
        if (method === 'updateDocument') {
          return `## Updated Documentation\n\n` +
                 `${result.updated_document}\n\n` +
                 `### Changes Made\n${this.formatList(result.change_summary)}\n\n` +
                 `### Sections Modified\n${this.formatList(result.sections_modified)}`;
        } else {
          return `## ${result.title}\n\n${result.content}`;
        }
      },
      'MeetingActionItemAgent': (result, method) => {
        if (method === 'extractActionItems') {
          return `## Meeting Action Items\n\n` +
                 `### Assigned Action Items\n${this.formatActionItems(result.action_items)}\n\n` +
                 `### Unassigned Items\n${this.formatUnassignedItems(result.unassigned_items)}\n\n` +
                 `### Follow-up Questions\n${this.formatList(result.follow_up_questions)}`;
        } else {
          return `## Meeting Summary\n\n` +
                 `${result.summary}\n\n` +
                 `### Key Points\n${this.formatList(result.key_points)}\n\n` +
                 `### Decisions\n${this.formatList(result.decisions)}\n\n` +
                 `### Discussion Topics\n${this.formatDiscussionTopics(result.discussion_topics)}\n\n` +
                 `### Next Steps\n${this.formatList(result.next_steps)}`;
        }
      },
      'PlanningAgent': (result) => {
        return `## Project Plan\n\n` +
               `### Epics\n${this.formatEpics(result.epics)}\n\n` +
               `### Sprint Plan\n${this.formatSprints(result.sprint_plan)}`;
      },
      'CodeSearchAgent': (result, method) => {
        if (method === 'searchCode') {
          return `## Code Search Results\n\n` +
                 `${result.summary}\n\n` +
                 `### Relevant Snippets\n${this.formatCodeSnippets(result.relevant_snippets)}\n\n` +
                 `### Suggestions\n${this.formatList(result.suggestions)}`;
        } else {
          return `## Code Explanation\n\n` +
                 `**Summary:** ${result.summary}\n\n` +
                 `**Detailed Explanation:** ${result.detailed_explanation}\n\n` +
                 `### Key Components\n${this.formatKeyComponents(result.key_components)}\n\n` +
                 `### Potential Issues\n${this.formatList(result.potential_issues)}\n\n` +
                 `### Improvement Suggestions\n${this.formatList(result.improvement_suggestions)}`;
        }
      }
    };

    const formatter = formatters[agentName];
    if (formatter) {
      return formatter(result, method);
    }
    
    // Default formatting if no specific formatter is found
    return `## Result from ${agentName}\n\n${JSON.stringify(result, null, 2)}`;
  }

  formatList(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return "None";
    }
    return items.map(item => `- ${item}`).join('\n');
  }

  formatIssues(issues) {
    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return "No issues found";
    }
    
    return issues.map(issue => {
      return `- **${issue.type.toUpperCase()} (${issue.severity})**: ${issue.description}\n` +
             `  - Lines: ${issue.line_numbers ? issue.line_numbers.join(', ') : 'N/A'}\n` +
             `  - Suggestion: ${issue.suggestion}`;
    }).join('\n\n');
  }

  formatRefactoring(refactoring) {
    if (!refactoring || !Array.isArray(refactoring) || refactoring.length === 0) {
      return "No refactoring opportunities identified";
    }
    
    return refactoring.map(item => {
      return `- **${item.description}**\n` +
             `  - Current: \`${item.current_code}\`\n` +
             `  - Improved: \`${item.improved_code}\`\n` +
             `  - Benefits: ${item.benefits.map(b => `${b}`).join(', ')}`;
    }).join('\n\n');
  }

  formatActionItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return "No action items identified";
    }
    
    return items.map(item => {
      return `- **${item.description}**\n` +
             `  - Owner: ${item.owner}\n` +
             `  - Deadline: ${item.deadline}\n` +
             `  - Priority: ${item.priority}\n` +
             `  - Context: ${item.context}`;
    }).join('\n\n');
  }

  formatUnassignedItems(items) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      return "No unassigned items";
    }
    
    return items.map(item => {
      return `- **${item.description}**\n` +
             `  - Suggested Owner: ${item.suggested_owner}\n` +
             `  - Priority: ${item.priority}`;
    }).join('\n\n');
  }

  formatDiscussionTopics(topics) {
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return "No discussion topics recorded";
    }
    
    return topics.map(topic => {
      return `- **${topic.topic}**: ${topic.summary}`;
    }).join('\n\n');
  }

  formatEpics(epics) {
    if (!epics || !Array.isArray(epics) || epics.length === 0) {
      return "No epics defined";
    }
    
    return epics.map(epic => {
      const userStories = epic.user_stories.map(story => {
        return `  - **${story.id}: ${story.title}** (${story.story_points} points)\n` +
               `    - ${story.description}\n` +
               `    - Acceptance Criteria: ${story.acceptance_criteria.join(', ')}\n` +
               `    - Assignee: ${story.suggested_assignee}`;
      }).join('\n\n');
      
      return `- **${epic.name}**: ${epic.description}\n\n${userStories}`;
    }).join('\n\n');
  }

  formatSprints(sprints) {
    if (!sprints || !Array.isArray(sprints) || sprints.length === 0) {
      return "No sprints planned";
    }
    
    return sprints.map(sprint => {
      return `- **Sprint ${sprint.sprint_number}** (${sprint.duration})\n` +
             `  - Goals: ${sprint.goals.join(', ')}\n` +
             `  - User Stories: ${sprint.user_stories.join(', ')}`;
    }).join('\n\n');
  }

  formatCodeSnippets(snippets) {
    if (!snippets || !Array.isArray(snippets) || snippets.length === 0) {
      return "No relevant code snippets found";
    }
    
    return snippets.map(snippet => {
      return `- **${snippet.filename}** (Relevance: ${snippet.relevance})\n` +
             `\`\`\`\n${snippet.code}\n\`\`\`\n` +
             `  - ${snippet.explanation}`;
    }).join('\n\n');
  }

  formatKeyComponents(components) {
    if (!components || !Array.isArray(components) || components.length === 0) {
      return "No key components identified";
    }
    
    return components.map(component => {
      return `- **${component.component}**: ${component.purpose}`;
    }).join('\n\n');
  }

  handleError(error) {
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString(),
      formattedResponse: `## Error\n\nI encountered an error while processing your request:\n\n\`\`\`\n${error.message || 'Unknown error occurred'}\n\`\`\`\n\nPlease try again or rephrase your request.`
    };
  }
}

module.exports = OrchestratorAgent;
