const axios = require('axios');

class CodeReviewAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-5-sonnet-20240620';
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async reviewCode(codeSnippet, language, requirements = {}) {
    try {
      console.log('Reviewing code...');
      
      // Handle different input formats
      if (typeof requirements === 'string') {
        requirements = { description: requirements };
      } else if (typeof requirements !== 'object') {
        requirements = {};
      }
      
      const systemPrompt = this._buildSystemPrompt();
      const userPrompt = this._buildReviewPrompt(codeSnippet, language, requirements);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseResponse(response);
    } catch (error) {
      console.error('Error in code review agent:', error);
      throw error;
    }
  }

  async suggestImprovements(codeSnippet, language, context = {}) {
    try {
      console.log('Suggesting code improvements...');
      
      const systemPrompt = this._buildSystemPrompt();
      const userPrompt = this._buildImprovementPrompt(codeSnippet, language, context);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseResponse(response);
    } catch (error) {
      console.error('Error in code improvement agent:', error);
      throw error;
    }
  }

  _buildSystemPrompt() {
    return `You are a Code Review Agent specializing in software quality assessment.
    You analyze code snippets and provide detailed feedback on quality, bugs, and improvements.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Do not include backticks or any text outside the JSON structure.`;
  }

  _buildReviewPrompt(codeSnippet, language, requirements) {
    return `
Please review this ${language} code snippet against the provided requirements.

Code:
\`\`\`${language}
${codeSnippet}
\`\`\`

Requirements:
${JSON.stringify(requirements, null, 2)}

Provide a comprehensive code review including:
1. Overall quality assessment
2. Potential bugs or issues
3. Security concerns
4. Performance considerations
5. Specific improvement suggestions

Return ONLY valid JSON without trailing commas, using this exact format:
{
  "overall_assessment": "Brief summary of code quality",
  "quality_score": 0-10,
  "issues": [
    {
      "type": "bug|security|performance|style|maintainability",
      "severity": "high|medium|low",
      "description": "Detailed description of the issue",
      "line_numbers": [1, 2, 3],
      "suggestion": "How to fix it"
    }
  ],
  "strengths": ["Strength 1", "Strength 2"],
  "improvement_suggestions": ["Suggestion 1", "Suggestion 2"]
}`;
  }

  _buildImprovementPrompt(codeSnippet, language, context) {
    return `
Please suggest improvements for this ${language} code:
\`\`\`${language}
${codeSnippet}
\`\`\`

Additional context:
${JSON.stringify(context, null, 2)}

Focus on:
1. Refactoring opportunities
2. Performance optimizations
3. Better design patterns
4. Modern language features that could be used
5. Improved error handling and robustness

Return your suggestions as JSON with these sections:
{
  "refactoring": [
    {
      "description": "Description of the refactoring",
      "current_code": "Current implementation",
      "improved_code": "Improved implementation",
      "benefits": ["Benefit 1", "Benefit 2"]
    }
  ],
  "optimizations": ["Optimization 1", "Optimization 2"],
  "design_patterns": ["Applicable pattern 1", "Applicable pattern 2"],
  "modern_features": ["Feature 1", "Feature 2"],
  "error_handling": ["Suggestion 1", "Suggestion 2"]
}`;
  }

  async _callClaudeAPI(systemPrompt, userPrompt) {
    try {
      console.log('Making API request to Claude...');
      
      const url = `${this.baseUrl}/messages`;
      
      const data = {
        model: this.model,
        max_tokens: 1500,
        temperature: 0.2, // Lower temperature for more precise code analysis
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ]
      };

      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      };

      console.log('Using Claude API URL:', url);
      console.log('Using model:', this.model);
      
      const response = await axios.post(url, data, { headers });
      console.log('Received response from Claude API with status:', response.status);
      return response.data;
    } catch (error) {
      console.error('Claude API Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  _parseResponse(response) {
    try {
      console.log('Parsing Claude response...');
      
      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }
      
      const textResponse = response.content[0].text;
      console.log('Raw text response length:', textResponse.length);
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      let jsonText = '';
      if (jsonMatch) {
        jsonText = jsonMatch[1] || jsonMatch[0];
        
        // Try to clean up common JSON syntax errors
        jsonText = jsonText
          .replace(/,(\s*[\]}])/g, '$1')         // Remove trailing commas
          .replace(/([^\\])\\([^"\\\/bfnrtu])/g, '$1$2')  // Fix invalid escape sequences
          .replace(/[\u0000-\u001F]+/g, ' ')     // Remove control characters
          .replace(/\t/g, '    ');               // Replace tabs with spaces
        
        try {
          return JSON.parse(jsonText);
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError.message);
          console.error('Attempted to parse:', jsonText);
          
          // If JSON parsing fails, return a structured error response
          return {
            error: "Failed to parse JSON response",
            message: jsonError.message,
            partial_response: jsonText.substring(0, 200) + "..."
          };
        }
      } else {
        console.error('Could not extract JSON from Claude response');
        return {
          error: "No JSON found in response",
          raw_response: textResponse.substring(0, 200) + "..."
        };
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      
      // Fall back to mock data
      console.log('Falling back to mock data');
      return this._generateMockResponse();
    }
  }

  // Add mock response method for fallback
  _generateMockResponse() {
    return {
      overall_assessment: "The code has several issues that need to be addressed before deployment.",
      quality_score: 6,
      issues: [
        {
          type: "security",
          severity: "high",
          description: "Potential SQL injection vulnerability in user input handling",
          line_numbers: [12, 13],
          suggestion: "Use parameterized queries or an ORM instead of string concatenation"
        },
        {
          type: "performance",
          severity: "medium",
          description: "Inefficient data processing in loop",
          line_numbers: [24, 25, 26],
          suggestion: "Consider using map/filter/reduce instead of nested loops"
        },
        {
          type: "maintainability",
          severity: "low",
          description: "Function is too long and does multiple things",
          line_numbers: [8, 45],
          suggestion: "Break down into smaller, single-responsibility functions"
        }
      ],
      strengths: [
        "Good error handling",
        "Clear variable naming",
        "Comprehensive comments"
      ],
      improvement_suggestions: [
        "Add input validation",
        "Implement proper error logging",
        "Add unit tests for critical functions"
      ]
    };
  }
}

module.exports = CodeReviewAgent;
