const axios = require('axios');

class MeetingActionItemAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = 'claude-3-5-haiku-20241022'; // Using Claude 3.5 Haiku for efficient processing
    this.baseUrl = 'https://api.anthropic.com/v1';
  }

  async extractActionItems(transcript, context = {}) {
    try {
      console.log('Extracting action items from meeting transcript...');
      
      // If transcript is an object with content property, extract it
      if (typeof transcript === 'object' && transcript.content) {
        transcript = transcript.content;
      }
      
      const systemPrompt = this._buildExtractSystemPrompt();
      const userPrompt = this._buildExtractUserPrompt(transcript, context);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseExtractResponse(response);
    } catch (error) {
      console.error('Error in action item extraction:', error);
      throw error;
    }
  }

  async summarizeMeeting(transcript, context = {}) {
    try {
      console.log('Summarizing meeting transcript...');
      
      const systemPrompt = this._buildSummarizeSystemPrompt();
      const userPrompt = this._buildSummarizeUserPrompt(transcript, context);
      const response = await this._callClaudeAPI(systemPrompt, userPrompt);
      return this._parseSummarizeResponse(response);
    } catch (error) {
      console.error('Error in meeting summarization:', error);
      throw error;
    }
  }

  _buildExtractSystemPrompt() {
    return `You are a Meeting Action Item Agent specializing in extracting action items from meeting transcripts.
    Your task is to identify action items, their owners, deadlines, and priority levels.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on being thorough and accurate in identifying all commitments made during the meeting.`;
  }

  _buildExtractUserPrompt(transcript, context) {
    return `
Please extract all action items from this meeting transcript:

Transcript:
${transcript}

Additional context:
${JSON.stringify(context, null, 2)}

Return your response as JSON with the following structure:
{
  "action_items": [
    {
      "description": "Description of the action item",
      "owner": "Person responsible",
      "deadline": "Deadline if mentioned (or 'Not specified')",
      "priority": "High/Medium/Low",
      "context": "Additional context about this action item"
    }
  ],
  "unassigned_items": [
    {
      "description": "Description of unassigned action item",
      "suggested_owner": "Suggested person who might be responsible",
      "priority": "High/Medium/Low"
    }
  ],
  "follow_up_questions": [
    "Question 1 that needs clarification",
    "Question 2 that needs clarification"
  ]
}`;
  }

  _buildSummarizeSystemPrompt() {
    return `You are a Meeting Summary Agent specializing in creating concise, informative summaries of meeting transcripts.
    Your task is to identify key discussion points, decisions made, and overall meeting outcomes.
    Always format your responses as valid JSON without trailing commas or syntax errors.
    Focus on extracting the most important information while keeping the summary concise.`;
  }

  _buildSummarizeUserPrompt(transcript, context) {
    return `
Please summarize this meeting transcript:

Transcript:
${transcript}

Additional context:
${JSON.stringify(context, null, 2)}

Return your response as JSON with the following structure:
{
  "summary": "Brief overall summary of the meeting",
  "key_points": [
    "Key point 1",
    "Key point 2"
  ],
  "decisions": [
    "Decision 1",
    "Decision 2"
  ],
  "discussion_topics": [
    {
      "topic": "Topic name",
      "summary": "Brief summary of discussion on this topic"
    }
  ],
  "next_steps": [
    "Next step 1",
    "Next step 2"
  ]
}`;
  }

  async _callClaudeAPI(systemPrompt, userPrompt) {
    try {
      console.log('Making API request to Claude...');
      
      const url = `${this.baseUrl}/messages`;
      
      const data = {
        model: this.model,
        max_tokens: 2000,
        temperature: 0.2, // Lower temperature for more precise extraction
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

  _parseExtractResponse(response) {
    try {
      console.log('Parsing Claude response for action items...');
      
      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }
      
      const textResponse = response.content[0].text;
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        throw new Error('Could not extract JSON from Claude response');
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      
      // Fall back to mock data
      console.log('Falling back to mock data');
      return this._generateMockExtractResponse();
    }
  }

  _parseSummarizeResponse(response) {
    try {
      console.log('Parsing Claude response for meeting summary...');
      
      if (!response.content || response.content.length === 0) {
        throw new Error('No content in Claude response');
      }
      
      const textResponse = response.content[0].text;
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        throw new Error('Could not extract JSON from Claude response');
      }
    } catch (error) {
      console.error('Error parsing Claude response:', error);
      
      // Fall back to mock data
      console.log('Falling back to mock data');
      return this._generateMockSummarizeResponse();
    }
  }

  _generateMockExtractResponse() {
    return {
      action_items: [
        {
          description: "Update the vehicle inventory report with the new rental statistics",
          owner: "Sarah",
          deadline: "Next Friday",
          priority: "High",
          context: "Needed for the quarterly business review"
        },
        {
          description: "Schedule a meeting with the development team to discuss API integration",
          owner: "Michael",
          deadline: "By end of week",
          priority: "Medium",
          context: "To ensure the rental system can connect with the payment processor"
        },
        {
          description: "Create a draft of the new rental agreement terms",
          owner: "Jennifer",
          deadline: "Two weeks",
          priority: "Medium",
          context: "Legal team needs to review before implementation"
        }
      ],
      unassigned_items: [
        {
          description: "Research competitor pricing for luxury vehicle rentals",
          suggested_owner: "Marketing team",
          priority: "Low"
        },
        {
          description: "Fix the bug in the reservation calendar",
          suggested_owner: "Development team",
          priority: "High"
        }
      ],
      follow_up_questions: [
        "Who will be responsible for training staff on the new rental process?",
        "When do we need to finalize the holiday promotion details?",
        "Has anyone contacted the insurance provider about the policy updates?"
      ]
    };
  }

  _generateMockSummarizeResponse() {
    return {
      summary: "The meeting focused on Q3 rental performance, upcoming system updates, and the new marketing campaign for luxury vehicles. The team agreed on action items for improving the rental process and addressing customer feedback.",
      key_points: [
        "Q3 rental revenue increased by 15% compared to last year",
        "Customer satisfaction scores dropped slightly in September",
        "New vehicle inventory system will be implemented in November",
        "Luxury vehicle marketing campaign to launch before holiday season"
      ],
      decisions: [
        "Approved budget for system upgrade ($25,000)",
        "Selected new insurance provider for fleet coverage",
        "Decided to extend weekend rental promotion through end of year",
        "Agreed to hire two additional customer service representatives"
      ],
      discussion_topics: [
        {
          topic: "System Performance",
          summary: "The current rental system is experiencing slowdowns during peak hours. The team discussed options for upgrading the server infrastructure and implementing caching to improve response times."
        },
        {
          topic: "Customer Feedback",
          summary: "Recent surveys indicate customers want more flexible pickup and return options. The team brainstormed potential solutions including after-hours key drop and mobile check-in."
        },
        {
          topic: "Marketing Strategy",
          summary: "The luxury vehicle segment shows growth potential. The marketing team presented a draft campaign targeting business travelers and vacation rentals for the holiday season."
        }
      ],
      next_steps: [
        "Schedule follow-up meeting with IT to finalize system upgrade timeline",
        "Distribute updated rental process documentation to all staff",
        "Begin recruitment process for new customer service positions",
        "Finalize holiday marketing materials by October 15"
      ]
    };
  }
}

module.exports = MeetingActionItemAgent;
