const axios = require('axios');
const driveService = require('../utils/googleDriveService');

class ProjectUnderstandingAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // Updated to match the sample API code
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    this.model = 'gemini-2.0-flash'; // Using the model from the sample
  }

  async processDocument(documentNameOrId, isId = false) {
    try {
      let documentContent;
      let documentName;
      
      if (isId) {
        // Read document directly by ID
        documentContent = await driveService.readFile(documentNameOrId);
        const response = await driveService.drive.files.get({
          fileId: documentNameOrId,
          fields: 'name'
        });
        documentName = response.data.name;
      } else if (typeof documentNameOrId === 'object' && documentNameOrId.content) {
        // Direct content provided
        documentContent = documentNameOrId.content;
        documentName = documentNameOrId.name || 'document';
      } else {
        // Find document by name in the Work folder
        const file = await driveService.findFileByName(documentNameOrId);
        if (!file) {
          throw new Error(`Document "${documentNameOrId}" not found in Work folder`);
        }
        documentContent = await driveService.readFile(file.id);
        documentName = documentNameOrId;
      }
      
      const prompt = this._buildPrompt(documentContent);
      const response = await this._callGeminiAPI(prompt);
      const analysis = this._parseResponse(response);
      
      // Save the analysis to Google Drive
      const analysisFileName = `${documentName.replace(/\.[^/.]+$/, '')}_analysis.json`;
      await driveService.createOrUpdateFile(
        analysisFileName,
        analysis,
        'application/json',
        'ProjectAnalysis'
      );
      
      return analysis;
    } catch (error) {
      console.error('Error in project understanding agent:', error);
      throw error;
    }
  }

  _buildPrompt(document) {
    return `
      You are a Project Understanding Agent tasked with analyzing project documentation.
      Extract the following information from the document:
      - Project goals and objectives
      - Key requirements
      - Milestones and deadlines
      - Stakeholders
      - Potential risks

      Document to analyze:
      ${document}

      Return the information in JSON format with these keys:
      goals, requirements, milestones, stakeholders, risks
    `;
  }

  async _callGeminiAPI(prompt) {
    try {
      // Updated URL to match the sample
      const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
      
      console.log('Making API request to Gemini...');
      console.log(`Using model: ${this.model}`);
      
      // Updated request format to match the sample
      const data = {
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      };

      console.log('Request payload structure:', JSON.stringify(data).substring(0, 100) + '...');
      
      const response = await axios.post(url, data);
      console.log('Received response from Gemini API with status:', response.status);
      return response.data;
    } catch (error) {
      console.error('Gemini API Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  _parseResponse(response) {
    try {
      console.log('Parsing response...');
      console.log('Response structure:', JSON.stringify(Object.keys(response), null, 2));
      
      if (!response.candidates || response.candidates.length === 0) {
        console.error('No candidates in response');
        throw new Error('No candidates in response');
      }
      
      const textResponse = response.candidates[0].content.parts[0].text;
      console.log('Raw text response:', textResponse.substring(0, 100) + '...');
      
      // Try to find JSON in the response
      const jsonMatch = textResponse.match(/```json\n([\s\S]*?)\n```/) || 
                        textResponse.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        console.log('Extracted JSON:', jsonText.substring(0, 100) + '...');
        return JSON.parse(jsonText);
      } else {
        // If no JSON is found, attempt to extract structured information manually
        console.log('No JSON found, parsing text manually');
        
        // This is a simplistic approach - in production you might want a more robust parser
        const parsedData = {
          goals: [],
          requirements: [],
          milestones: [],
          stakeholders: [],
          risks: []
        };
        
        // Simple extraction using regex
        const goalsMatch = textResponse.match(/goals:?([\s\S]*?)(?=requirements:|$)/i);
        if (goalsMatch && goalsMatch[1]) {
          parsedData.goals = goalsMatch[1].split('\n')
            .filter(line => line.trim().startsWith('-'))
            .map(line => line.replace('-', '').trim());
        }
        
        // Similar extraction for other fields...
        
        return parsedData;
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      throw error;
    }
  }
}

module.exports = ProjectUnderstandingAgent;
