const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.ANTHROPIC_API_KEY;
console.log('Using API key (first few chars):', apiKey.substring(0, 10) + '...');

async function testClaudeAPI() {
  try {
    const url = 'https://api.anthropic.com/v1/messages';
    
    const data = {
      model: "claude-3-5-haiku-20241022", // Using the Claude 3.5 Haiku from the list
      max_tokens: 1000,
      temperature: 1,
      system: "You are a helpful assistant.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Hello, can you introduce yourself?"
            }
          ]
        }
      ]
    };

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    };

    console.log('Making test API request to Claude with model:', data.model);
    const response = await axios.post(url, data, { headers });
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Test API Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testClaudeAPI();