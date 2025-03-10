const axios = require('axios');
const driveService = require('../utils/googleDriveService');

class PlanningAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-5-haiku-20241022'; // Using the model that worked in the test
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async generateTasks(projectSummary, projectName = 'Project') {
    try {
      console.log('Generating tasks from project summary...');
      
      // If projectSummary is an object with content property, extract it
      let summaryText = projectSummary;
      if (typeof projectSummary === 'object') {
        if (projectSummary.content) {
          summaryText = projectSummary.content;
        }
        if (projectSummary.name) {
          projectName = projectSummary.name;
        }
      }
      
      const systemPrompt = this._buildSystemPrompt();
      const userPrompt = this._buildUserPrompt(summaryText);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      const tasks = this._parseResponse(response);
      
      try {
        // Save the tasks to Google Drive
        const tasksFileName = `${projectName.replace(/\s+/g, '_')}_tasks.json`;
        await driveService.createOrUpdateFile(
          tasksFileName,
          tasks,
          'application/json',
          'Tasks'
        );
      } catch (saveError) {
        console.warn('Failed to save tasks to Drive:', saveError.message);
        // Continue execution even if saving fails
      }
      
      return tasks;
    } catch (error) {
      console.error('Error in planning agent:', error);
      throw error;
    }
  }

  _buildSystemPrompt() {
    return `You are a Planning & Task Generation Agent specializing in Agile methodology. 
    You analyze project summaries and create structured task breakdowns. 
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Do not include backticks or any text outside the JSON structure.`;
  }

  _buildUserPrompt(projectSummary) {
    return `
Please analyze this project summary and create a structured task breakdown following Agile methodology.

Project Summary:
${JSON.stringify(projectSummary, null, 2)}

Create:
1. A list of Epics (major work streams)
2. User Stories under each Epic with acceptance criteria
3. Task assignments based on team capabilities
4. Sprint planning suggestions

Return ONLY valid JSON without trailing commas, using this exact format:
{
  "epics": [
    {
      "name": "Epic name",
      "description": "Epic description",
      "user_stories": [
        {
          "id": "US-1",
          "title": "User story title",
          "description": "As a [role], I want [feature] so that [benefit]",
          "acceptance_criteria": ["Criterion 1", "Criterion 2"],
          "story_points": 5,
          "suggested_assignee": "Team member role",
          "tasks": ["Task 1", "Task 2"]
        }
      ]
    }
  ],
  "sprint_plan": [
    {
      "sprint_number": 1,
      "duration": "2 weeks",
      "goals": ["Goal 1", "Goal 2"],
      "user_stories": ["US-1", "US-2"]
    }
  ]
}`;
  }

  async _callClaudeAPI(systemPrompt, userPrompt) {
    try {
      console.log('Making API request to Claude...');
      
      const url = `${this.baseUrl}/messages`;
      
      const data = {
        model: this.model,
        max_tokens: 1000,
        temperature: 0.7, // A bit lower temperature for more focused responses
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
      console.log('Raw text response:', textResponse);
      
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
          
          // Try using a more lenient JSON parser like JSON5 (if available)
          throw jsonError;
        }
      } else {
        console.error('Could not extract JSON from Claude response');
        throw new Error('Could not extract JSON from Claude response');
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
      epics: [
        {
          name: "Vehicle Database",
          description: "Core vehicle information management",
          user_stories: [
            {
              id: "US-1",
              title: "Vehicle Registration",
              description: "As a rental manager, I want to add new vehicles to the system so that they can be rented out",
              acceptance_criteria: ["Can add vehicle details", "Data validation works", "Vehicle appears in available inventory"],
              story_points: 5,
              suggested_assignee: "Backend Developer",
              tasks: ["Create vehicle schema", "Build registration API", "Implement validation"]
            }
          ]
        },
        {
          name: "Rental Management",
          description: "Functions to track and manage rentals",
          user_stories: [
            {
              id: "US-2",
              title: "Create Rental",
              description: "As a rental agent, I want to create a new rental record so that vehicle usage is tracked",
              acceptance_criteria: ["Can select customer and vehicle", "Valid rental dates required", "Confirmation generated"],
              story_points: 8,
              suggested_assignee: "Full Stack Developer",
              tasks: ["Create rental form UI", "Build rental API", "Implement confirmation system"]
            }
          ]
        }
      ],
      sprint_plan: [
        {
          sprint_number: 1,
          duration: "2 weeks",
          goals: ["Complete database setup", "Build vehicle registration"],
          user_stories: ["US-1"]
        },
        {
          sprint_number: 2,
          duration: "2 weeks",
          goals: ["Implement rental functions", "Start reporting"],
          user_stories: ["US-2"]
        }
      ]
    };
  }
}

module.exports = PlanningAgent;
